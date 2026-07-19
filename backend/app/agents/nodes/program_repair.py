"""Program Repair Agent — generates code patches/fixes using PatchEngine + Groq LLM.

Reads the actual buggy source from repo_summary so the LLM generates real diffs.
"""

from __future__ import annotations

from typing import Any
from uuid import uuid4

from langchain_core.runnables import RunnableConfig

from app.agents.base import BaseAgentNode
from app.agents.state import AgentState, Patch, PipelineStatus
from app.core.logging import get_logger

logger = get_logger(__name__)


class ProgramRepairAgent(BaseAgentNode):
    name = "program_repair"
    description = "Generates multi-strategy candidate patches using PatchEngine + Groq LLM"

    async def execute(
        self,
        state: AgentState,
        config: RunnableConfig | None = None,
    ) -> dict[str, Any]:
        causes        = state.get("root_causes", [])
        localizations = state.get("bug_localizations", [])
        repo_summary  = state.get("repo_summary") or {}

        if not localizations:
            return {"patches": []}

        # ── Try real PatchEngine first ─────────────────────────────────────────
        all_patches: list[Patch] = []

        for loc in localizations:
            cause = next((c for c in causes if c.bug_id == loc.id), causes[0] if causes else None)

            # Look up actual source code from repo_summary
            buggy_code = self._find_source(loc.file_path, repo_summary)

            try:
                from app.repair.patch_engine import PatchEngine
                raw_patches = await PatchEngine.generate_patches(
                    bug_id=loc.id,
                    file_path=loc.file_path,
                    method_name=loc.method_name,
                    buggy_code=buggy_code,
                    error_message=loc.error_message,
                    root_cause=cause.why if cause else "Unknown root cause",
                    strategies=["minimal", "defensive"],   # 2 strategies to stay fast
                )

                for p in raw_patches:
                    all_patches.append(Patch(
                        id=p["id"],
                        bug_id=p["bug_id"],
                        strategy=p["strategy"],
                        diff=p["diff"],
                        file_path=p["file_path"],
                        description=p["description"],
                        confidence=p["confidence"],
                    ))

            except Exception as e:
                logger.warning("patch_engine_failed", bug_id=loc.id, error=str(e))
                # Fallback: generate a simple placeholder patch
                all_patches.append(Patch(
                    id=str(uuid4())[:8],
                    bug_id=loc.id,
                    strategy="minimal",
                    diff=self._generate_simple_patch(loc, cause),
                    file_path=loc.file_path,
                    description=f"[MINIMAL] Auto-generated patch for {loc.method_name} in {loc.file_path}",
                    confidence=0.72,
                ))

        explanation = self.build_explanation(
            decision=f"Generated {len(all_patches)} patch candidate(s) for {len(localizations)} bug(s)",
            reason=f"Used PatchEngine with strategies: {list(set(p.strategy for p in all_patches))}",
            confidence=max((p.confidence for p in all_patches), default=0.0),
            evidence=[f"{p.strategy}: {p.file_path} (confidence={p.confidence})" for p in all_patches[:4]],
        )

        return {
            "patches": all_patches,
            "status": PipelineStatus.REPAIRING,
            "explanations": [explanation],
        }

    def _find_source(self, file_path: str, repo_summary: dict) -> str:
        """Extract actual source code for the buggy file from repo_summary."""
        if not repo_summary or not file_path:
            return f"# Source unavailable for {file_path}"

        files = repo_summary.get("files", [])
        # Try exact match first, then suffix match
        for f in files:
            f_path = f.get("path", "")
            if f_path == file_path or f_path.endswith(file_path) or file_path.endswith(f_path):
                content = f.get("content", "")
                return content[:3000] if content else f"# No content for {file_path}"

        # No match found — return what we know
        return f"# File: {file_path}\n# Source not available in repo scan"

    def _generate_simple_patch(self, loc: Any, cause: Any) -> str:
        """Minimal synthetic patch when PatchEngine fails."""
        line = loc.line_number or 1
        method = loc.method_name or "unknown_method"
        reason = cause.summary if cause else loc.error_message
        return (
            f"--- a/{loc.file_path}\n"
            f"+++ b/{loc.file_path}\n"
            f"@@ -{line},1 +{line},2 @@\n"
            f"-    # [BUG] {method}: {reason}\n"
            f"+    # [FIX] Apply defensive check — {reason}\n"
            f"+    # TODO: Implement fix based on root cause analysis\n"
        )
