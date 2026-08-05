"""Code Understanding Agent — builds AST symbol table and call graph.

Agent #3 in the pipeline. Parses Python source files from repo_summary using
the built-in ``ast`` module to extract:
  - Symbol table: all functions, classes, and their signatures/locations
  - Call graph: caller → callee edges within the project
  - CFG summary: per-function branch/loop counts for complexity estimation

LLM is used to annotate cross-module relationships and summarise complex
control-flow that can't be inferred purely from AST (e.g. dynamic dispatch).
"""

from __future__ import annotations

import ast
import json
from typing import Any

from langchain_core.runnables import RunnableConfig

from app.agents.base import BaseAgentNode
from app.agents.state import AgentState, CodeUnderstanding
from app.core.logging import get_logger

logger = get_logger(__name__)


# ── Pure-Python AST helpers ───────────────────────────────────────────────────

def _extract_symbols(path: str, source: str) -> dict[str, Any]:
    """Extract function/class symbols from a Python source string.

    Returns a dict keyed by qualified name with type, file, and line info.
    """
    symbols: dict[str, Any] = {}
    try:
        tree = ast.parse(source, filename=path)
    except SyntaxError:
        return symbols

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            qname = f"{path}::{node.name}"
            args = [a.arg for a in node.args.args]
            symbols[qname] = {
                "type": "function",
                "name": node.name,
                "file": path,
                "line": node.lineno,
                "args": args,
                "docstring": ast.get_docstring(node) or "",
            }
        elif isinstance(node, ast.ClassDef):
            qname = f"{path}::{node.name}"
            methods = [
                n.name for n in ast.walk(node)
                if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))
            ]
            symbols[qname] = {
                "type": "class",
                "name": node.name,
                "file": path,
                "line": node.lineno,
                "methods": methods,
                "docstring": ast.get_docstring(node) or "",
            }
    return symbols


def _extract_call_edges(path: str, source: str) -> list[dict[str, str]]:
    """Extract intra-file call graph edges from a Python source string.

    Each edge is {caller, callee, file}.
    """
    edges: list[dict[str, str]] = []
    try:
        tree = ast.parse(source, filename=path)
    except SyntaxError:
        return edges

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            caller = node.name
            for child in ast.walk(node):
                if isinstance(child, ast.Call):
                    callee = ""
                    if isinstance(child.func, ast.Name):
                        callee = child.func.id
                    elif isinstance(child.func, ast.Attribute):
                        callee = child.func.attr
                    if callee and callee != caller:
                        edges.append({"caller": caller, "callee": callee, "file": path})
    return edges


def _extract_cfg_summary(path: str, source: str) -> list[dict[str, Any]]:
    """Count branches and loops per function for cyclomatic complexity estimates."""
    summary: list[dict[str, Any]] = []
    try:
        tree = ast.parse(source, filename=path)
    except SyntaxError:
        return summary

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            branches = sum(
                1 for n in ast.walk(node)
                if isinstance(n, (ast.If, ast.IfExp))
            )
            loops = sum(
                1 for n in ast.walk(node)
                if isinstance(n, (ast.For, ast.While, ast.AsyncFor))
            )
            try_blocks = sum(
                1 for n in ast.walk(node)
                if isinstance(n, ast.Try)
            )
            summary.append({
                "function": node.name,
                "file": path,
                "line": node.lineno,
                "branches": branches,
                "loops": loops,
                "try_blocks": try_blocks,
                "complexity_estimate": 1 + branches + loops,
            })
    return summary


class CodeUnderstandingAgent(BaseAgentNode):
    name = "code_understanding"
    description = (
        "Parses Python source files to build AST symbol table, call graph, "
        "and CFG summary; uses LLM to annotate cross-module relationships"
    )

    SYSTEM_PROMPT = """You are the Code Understanding Agent of AutoTestAI.

You receive a structured AST analysis of a software project (symbol table and call graph extracted by static parsing).
Your job is to:
1. Identify important cross-module relationships not captured by intra-file analysis
2. Flag high-complexity functions (branches > 5 or loops > 3) as testing priorities
3. Identify any dynamic dispatch patterns (e.g. getattr, __call__) that static analysis may miss
4. Summarise the most important architectural patterns (service layer, repository pattern, etc.)

Respond with JSON:
{
    "cross_module_edges": [{"caller": "<module.func>", "callee": "<module.func>", "type": "import|call|inherit"}],
    "complexity_hotspots": ["<file>::<function> (complexity=N)"],
    "dynamic_patterns": ["<description>"],
    "architecture_summary": "<brief summary>"
}"""

    async def execute(
        self,
        state: AgentState,
        config: RunnableConfig | None = None,
    ) -> dict[str, Any]:
        repo_summary = state.get("repo_summary") or {}
        files = repo_summary.get("files", [])

        # ── 1. Static AST analysis (pure Python, no LLM) ─────────────────────
        all_symbols: dict[str, Any] = {}
        all_edges: list[dict[str, str]] = []
        all_cfg: list[dict[str, Any]] = []

        for f in files[:40]:  # limit to 40 files for performance
            path = f.get("path", "")
            content = f.get("content", "")
            if not content or not path.endswith(".py"):
                continue

            symbols = _extract_symbols(path, content)
            edges = _extract_call_edges(path, content)
            cfg = _extract_cfg_summary(path, content)

            all_symbols.update(symbols)
            all_edges.extend(edges)
            all_cfg.extend(cfg)

        logger.info(
            "ast_analysis_complete",
            symbols=len(all_symbols),
            edges=len(all_edges),
            cfg_entries=len(all_cfg),
        )

        # ── 2. LLM annotation for cross-module relationships ──────────────────
        hotspots = [
            f"{c['file']}::{c['function']} (complexity={c['complexity_estimate']})"
            for c in sorted(all_cfg, key=lambda x: -x.get("complexity_estimate", 0))[:10]
        ]
        symbol_sample = json.dumps(
            {k: v for k, v in list(all_symbols.items())[:20]}, indent=2
        )

        user_prompt = f"""Analyze this project's code structure.

Project: {state.get('repo_url', 'unknown')}
Language: {state.get('language', 'python')}

AST Symbol Table (sample of {len(all_symbols)} total):
{symbol_sample}

Call Graph: {len(all_edges)} edges found
Top Complexity Hotspots:
{chr(10).join(hotspots) if hotspots else 'None identified'}

Identify cross-module relationships and summarise key architecture patterns as JSON."""

        try:
            response = await self.invoke_llm(self.SYSTEM_PROMPT, user_prompt)
            llm_data = json.loads(self.extract_json(response))
        except Exception:
            llm_data = {}

        # Merge LLM cross-module edges with static intra-file edges
        cross_module = llm_data.get("cross_module_edges", [])
        all_edges.extend([
            {"caller": e.get("caller", ""), "callee": e.get("callee", ""), "file": "cross-module"}
            for e in cross_module
            if isinstance(e, dict)
        ])

        result = CodeUnderstanding(
            symbol_table=all_symbols,
            call_graph_edges=all_edges[:500],   # cap to keep state size reasonable
            cfg_summary=all_cfg,
            total_symbols=len(all_symbols),
            total_call_edges=len(all_edges),
        )

        explanation = self.build_explanation(
            decision=f"Built AST symbol table ({result.total_symbols} symbols) and call graph ({result.total_call_edges} edges)",
            reason=llm_data.get("architecture_summary", "Static AST analysis of Python source files"),
            confidence=0.92,
            evidence=[
                f"{result.total_symbols} symbols extracted",
                f"{result.total_call_edges} call edges",
                f"{len(all_cfg)} functions in CFG",
                f"Hotspots: {', '.join(hotspots[:3]) if hotspots else 'none'}",
            ],
        )

        return {
            "code_understanding": result,
            "explanations": [explanation],
        }
