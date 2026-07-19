"""Patch Engine — LLM-powered multi-strategy code patch generator.

Strategies:
  - minimal   : smallest possible change to fix the failing test
  - defensive : adds null checks / input guards around the bug site
  - refactor  : rewrites the method with cleaner logic
  - boundary  : inserts boundary / range validation

For each strategy the engine calls Groq (llama-3.3-70b-versatile) with the
buggy code, stack trace, root cause summary, and produces a unified diff patch.
"""

from __future__ import annotations

import re
from typing import Any
from uuid import uuid4

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

STRATEGIES = ["minimal", "defensive", "refactor", "boundary"]

SYSTEM_PROMPT = """You are an expert program repair engineer.

Given:
- A buggy Python source file (or relevant snippet)
- The stack trace of a failing test
- A root cause analysis

Generate a SINGLE, syntactically valid unified diff patch that fixes the bug
using the specified repair strategy.

Rules:
1. Output ONLY a valid unified diff (--- / +++ / @@ lines).
2. Do NOT include markdown fences.
3. The patch must compile and make the failing test pass.
4. Minimal diffs preferred — do not reformat unrelated code.
5. Add brief inline comments where the fix is non-obvious.

Strategy definitions:
  minimal   — Smallest possible code change.
  defensive — Add null/range checks, guard clauses.
  refactor  — Rewrite the method cleanly.
  boundary  — Add input boundary / sanitization validation.
"""


def _build_llm() -> ChatGroq:
    settings = get_settings()
    return ChatGroq(
        model=settings.DEFAULT_LLM_MODEL,
        temperature=0.1,
        api_key=settings.GROQ_API_KEY,
    )


class PatchEngine:
    """Generates multi-strategy repair patches using Groq LLM."""

    @classmethod
    async def generate_patches(
        cls,
        bug_id: str,
        file_path: str,
        method_name: str,
        buggy_code: str,
        error_message: str,
        root_cause: str,
        strategies: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        """Generate one patch candidate per strategy.

        Args:
            bug_id: Identifier of the localized bug.
            file_path: Relative path to the buggy file.
            method_name: Name of the faulty method/function.
            buggy_code: Source code of the faulty region.
            error_message: Traceback / assertion error.
            root_cause: Root cause analysis text.
            strategies: List of strategies to use (default: all four).

        Returns:
            List of patch candidate dicts compatible with the Patch schema.
        """
        strategies = strategies or STRATEGIES
        llm = _build_llm()
        patches = []

        for strategy in strategies:
            user_prompt = f"""File: {file_path}
Method: {method_name}
Strategy: {strategy}

=== BUGGY CODE ===
{buggy_code}

=== ERROR MESSAGE ===
{error_message}

=== ROOT CAUSE ===
{root_cause}

Generate a {strategy} unified diff patch to fix this bug."""

            try:
                response = await llm.ainvoke([
                    SystemMessage(content=SYSTEM_PROMPT),
                    HumanMessage(content=user_prompt),
                ])
                content = response.content
                if isinstance(content, list):
                    # Handle list case (usually message parts)
                    diff = "".join(str(part) for part in content).strip()
                else:
                    diff = content.strip()

                # Strip markdown fences if model wraps anyway
                diff = re.sub(r"```(?:diff|python)?\n?", "", diff).strip("`").strip()

                patch = {
                    "id": str(uuid4())[:8],
                    "bug_id": bug_id,
                    "strategy": strategy,
                    "file_path": file_path,
                    "diff": diff,
                    "description": f"[{strategy.upper()}] Auto-generated patch for {method_name} in {file_path}",
                    "confidence": cls._estimate_confidence(diff, strategy),
                }
                patches.append(patch)
                logger.info("patch_generated", strategy=strategy, bug_id=bug_id)

            except Exception as e:
                logger.warning("patch_generation_failed", strategy=strategy, error=str(e))

        return patches

    @classmethod
    def _estimate_confidence(cls, diff: str, strategy: str) -> float:
        """Heuristic confidence score based on diff length and strategy."""
        lines_changed = len([l for l in diff.splitlines() if l.startswith(("+", "-")) and not l.startswith(("---", "+++"))])
        base = {"minimal": 0.88, "defensive": 0.82, "refactor": 0.75, "boundary": 0.80}.get(strategy, 0.70)
        # Penalise very large diffs (higher risk of regression)
        penalty = min(0.15, lines_changed * 0.005)
        return round(max(0.5, base - penalty), 3)
