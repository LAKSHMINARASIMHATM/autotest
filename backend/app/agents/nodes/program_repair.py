"""Program Repair Agent — generates code patches/fixes for bugs using PatchEngine."""

from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from langchain_core.runnables import RunnableConfig

from app.agents.base import BaseAgentNode
from app.agents.state import AgentState, Patch, PipelineStatus
from app.repair.patch_engine import PatchEngine


class ProgramRepairAgent(BaseAgentNode):
    name = "program_repair"
    description = "Generates multi-strategy candidate patches using PatchEngine + Groq LLM"

    async def execute(
        self,
        state: AgentState,
        config: RunnableConfig | None = None,
    ) -> dict[str, Any]:
        causes = state.get("root_causes", [])
        localizations = state.get("bug_localizations", [])

        if not localizations:
            return {"patches": []}

        loc = localizations[0]
        cause = causes[0] if causes else None

        # Call the real PatchEngine (Groq-backed, multi-strategy)
        raw_patches = await PatchEngine.generate_patches(
            bug_id=loc.id,
            file_path=loc.file_path,
            method_name=loc.method_name,
            buggy_code=f"# line {loc.line_number} in {loc.file_path}",
            error_message=loc.error_message,
            root_cause=cause.why if cause else "Unknown root cause",
        )

        patches = [
            Patch(
                id=p["id"],
                bug_id=p["bug_id"],
                strategy=p["strategy"],
                diff=p["diff"],
                file_path=p["file_path"],
                description=p["description"],
                confidence=p["confidence"],
            )
            for p in raw_patches
        ]

        explanation = self.build_explanation(
            decision=f"Generated {len(patches)} patch candidates for bug {loc.id}",
            reason=f"Used PatchEngine with strategies: {[p.strategy for p in patches]}",
            confidence=max((p.confidence for p in patches), default=0.0),
            evidence=[f"{p.strategy}: confidence={p.confidence}" for p in patches],
        )

        return {
            "patches": patches,
            "status": PipelineStatus.REPAIRING,
            "explanations": [explanation],
        }

