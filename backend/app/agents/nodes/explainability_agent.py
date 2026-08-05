"""Explainability Agent — synthesizes the full pipeline run into a structured XAI report.

Agent #14 in the pipeline. Runs after the Regression Agent, before Learning.

Collects all ``Explanation`` objects emitted by every agent throughout the run
(stored in ``AgentState.explanations``) and the audit trail (``agent_trace``),
then synthesizes them into a single machine-readable XAI report (``XAIReport``)
that constitutes the full audit log for the pipeline run.

The LLM is used to:
1. Identify key decisions that had the most impact on the final outcome
2. Surface risk factors (low-confidence decisions, hallucination flags, etc.)
3. Write a human-readable audit summary paragraph
"""

from __future__ import annotations

import json
from typing import Any

from langchain_core.runnables import RunnableConfig

from app.agents.base import BaseAgentNode
from app.agents.state import AgentState, PipelineStatus, XAIReport
from app.core.logging import get_logger

logger = get_logger(__name__)


class ExplainabilityAgent(BaseAgentNode):
    name = "explainability"
    description = (
        "Synthesizes all per-agent XAI explanations and audit trace into "
        "a structured, human-readable XAI report (JSON audit log)"
    )

    SYSTEM_PROMPT = """You are the Explainability Agent of AutoTestAI.

You receive a list of decisions made by all agents during a pipeline run.
Your role is to produce a clear, concise audit report that explains:
1. What key decisions were made and why
2. Which decisions had the highest/lowest confidence
3. What risk factors exist (low confidence, hallucination flags, etc.)
4. An overall audit summary paragraph

Respond with JSON:
{
    "key_decisions": ["<agent>: <decision> (confidence=X%)"],
    "risk_factors": ["<description of risk>"],
    "pipeline_confidence": <float 0.0-1.0 — weighted average>,
    "audit_summary": "<2-3 sentence human-readable summary of the pipeline run>"
}"""

    async def execute(
        self,
        state: AgentState,
        config: RunnableConfig | None = None,
    ) -> dict[str, Any]:
        explanations = state.get("explanations", [])
        agent_trace = state.get("agent_trace", [])
        session_id = state.get("session_id", "")
        project_ctx = state.get("project_context")

        # ── 1. Build structured per-agent decision list ───────────────────────
        agent_decisions: list[dict[str, Any]] = []
        for exp in explanations:
            agent_decisions.append({
                "agent": exp.agent,
                "decision": exp.decision,
                "reason": exp.reason,
                "confidence": exp.confidence,
                "supporting_evidence": exp.supporting_evidence,
                "alternatives_considered": exp.alternatives_considered,
                "retrieved_context_count": len(exp.retrieved_context),
            })

        # ── 2. Build audit trail summary ──────────────────────────────────────
        trace_summary = "\n".join(
            f"  [{t.timestamp}] {t.agent}: {t.action} — {t.status}"
            for t in agent_trace[-30:]  # last 30 trace entries
        )

        # ── 3. Compute pipeline confidence as weighted average ────────────────
        confidences = [exp.confidence for exp in explanations if exp.confidence > 0]
        pipeline_confidence = round(sum(confidences) / len(confidences), 4) if confidences else 0.0

        # ── 4. Detect risk factors from low-confidence decisions ──────────────
        auto_risk_factors: list[str] = []
        for exp in explanations:
            if exp.confidence < 0.6:
                auto_risk_factors.append(
                    f"Low confidence ({exp.confidence:.0%}) in {exp.agent}: {exp.decision[:80]}"
                )

        # Flag hallucination warnings from verification
        verification = state.get("verification_result")
        if verification and verification.hallucination_flags:
            for flag in verification.hallucination_flags[:3]:
                auto_risk_factors.append(f"Hallucination flag: {flag[:100]}")

        # ── 5. LLM synthesis for key decisions + audit summary ────────────────
        decisions_text = "\n".join(
            f"- [{d['agent']}] {d['decision']} (confidence={d['confidence']:.0%})"
            for d in agent_decisions[:20]
        )

        exec_result = state.get("execution_result")
        patch_validations = state.get("patch_validations", [])
        regression = state.get("regression_report")

        context = (
            f"Project: {project_ctx.name if project_ctx else 'Unknown'}\n"
            f"Session: {session_id}\n"
            f"Tests run: {exec_result.total if exec_result else 0}, "
            f"passed: {exec_result.passed if exec_result else 0}, "
            f"failed: {exec_result.failed if exec_result else 0}\n"
            f"Patches: {len(patch_validations)}, accepted: {sum(1 for v in patch_validations if v.verdict == 'accepted')}\n"
            f"Regression: {'OK' if regression and regression.ok else 'FAILED' if regression else 'N/A'}\n"
            f"Pipeline confidence: {pipeline_confidence:.1%}\n"
        )

        user_prompt = f"""Generate an XAI audit report for this AutoTestAI pipeline run.

{context}

Agent Decisions ({len(agent_decisions)} total):
{decisions_text}

Known Risk Factors:
{chr(10).join(f'- {r}' for r in auto_risk_factors) if auto_risk_factors else '- None detected'}

Audit Trail:
{trace_summary or '(no trace)'}

Synthesize key decisions, risk factors, and an audit summary. Respond with JSON."""

        try:
            response = await self.invoke_llm(self.SYSTEM_PROMPT, user_prompt)
            llm_data = json.loads(self.extract_json(response))
        except Exception as e:
            logger.warning("xai_llm_failed", error=str(e))
            llm_data = {}

        # Merge LLM-generated risk factors with auto-detected ones
        all_risk_factors = list(set(
            auto_risk_factors + llm_data.get("risk_factors", [])
        ))
        llm_confidence = llm_data.get("pipeline_confidence", pipeline_confidence)

        report = XAIReport(
            session_id=session_id,
            total_agents=len(set(d["agent"] for d in agent_decisions)),
            agent_decisions=agent_decisions,
            pipeline_confidence=float(llm_confidence),
            key_decisions=llm_data.get("key_decisions", [
                f"{d['agent']}: {d['decision']}"
                for d in sorted(agent_decisions, key=lambda x: -x["confidence"])[:5]
            ]),
            risk_factors=all_risk_factors[:10],
            audit_summary=llm_data.get(
                "audit_summary",
                f"Pipeline completed with {pipeline_confidence:.1%} average confidence across "
                f"{len(agent_decisions)} agent decisions. "
                f"{'No significant risks detected.' if not all_risk_factors else f'{len(all_risk_factors)} risk factor(s) identified.'}",
            ),
        )

        logger.info(
            "xai_report_generated",
            session_id=session_id,
            total_decisions=len(agent_decisions),
            pipeline_confidence=report.pipeline_confidence,
            risk_count=len(report.risk_factors),
        )

        explanation = self.build_explanation(
            decision=f"Generated XAI audit report for {report.total_agents} agents",
            reason=report.audit_summary,
            confidence=pipeline_confidence,
            evidence=[
                f"{len(agent_decisions)} agent decisions synthesized",
                f"Pipeline confidence: {pipeline_confidence:.1%}",
                f"{len(all_risk_factors)} risk factors identified",
            ],
        )

        return {
            "xai_report": report,
            "status": PipelineStatus.LEARNING,
            "explanations": [explanation],
        }
