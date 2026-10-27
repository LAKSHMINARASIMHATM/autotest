"""LangGraph orchestrator — wires up the StateGraph with all 14 agent nodes.

Full pipeline flow:
1.  planner           → Project Analyst (parse repo layout & configs)
2.  requirement       → Requirements Analyst (extract code contracts)
3.  code_understanding→ Code Understanding (build AST & call graph)
4.  architecture      → Architecture Agent (dependency/API/service graphs)
5.  test_strategy     → Test Planner (formulate test scenarios)
6.  test_generation   → Unit Test Generator (synthesize PyTest code)
7.  verification      → Verification Agent (static AST syntax audit)
8.  execution         → Execution Agent (sandbox subprocess run)
9.  coverage_analyst  → Coverage Analyst (measure line/branch coverage)
10. [conditional]
    ├─ if failures → bug_localization → Root Cause → Program Repair → Patch Validation
    │               → regression_agent → explainability → learning → END
    └─ if clean    → regression_agent → explainability → learning → END
"""

from __future__ import annotations

from typing import Literal

from langchain_core.language_models import BaseChatModel
from langgraph.graph import END, StateGraph

from app.agents.nodes.architecture import ArchitectureAgent
from app.agents.nodes.bug_localization import BugLocalizationAgent
from app.agents.nodes.code_understanding import CodeUnderstandingAgent
from app.agents.nodes.coverage_analyst import CoverageAnalystAgent
from app.agents.nodes.execution import ExecutionAgent
from app.agents.nodes.explainability_agent import ExplainabilityAgent
from app.agents.nodes.learning import LearningAgent
from app.agents.nodes.patch_validation import PatchValidationAgent
from app.agents.nodes.planner import PlannerAgent
from app.agents.nodes.program_repair import ProgramRepairAgent
from app.agents.nodes.regression_agent import RegressionAgent
from app.agents.nodes.requirement import RequirementAgent
from app.agents.nodes.root_cause import RootCauseAgent
from app.agents.nodes.test_generation import TestGenerationAgent
from app.agents.nodes.test_strategy import TestStrategyAgent
from app.agents.nodes.verification import VerificationAgent
from app.agents.state import AgentState


def route_after_coverage(
    state: AgentState,
) -> Literal["bug_localization", "regression_agent"]:
    """Conditional router after coverage_analyst.

    Routes to bug_localization if there are test failures or if 0 tests were
    collected from a non-empty generated_tests list (simulated failure).
    Otherwise routes directly to regression_agent.
    """
    exec_result = state.get("execution_result")
    generated_tests = state.get("generated_tests", [])

    if exec_result and (
        exec_result.failed > 0
        or exec_result.errors > 0
        or len(exec_result.failures) > 0
    ):
        return "bug_localization"

    # If we generated tests but execution produced 0 collected → force debug path
    if exec_result and exec_result.total == 0 and len(generated_tests) > 0:
        return "bug_localization"

    return "regression_agent"


def route_after_patch_validation(
    state: AgentState,
) -> Literal["regression_agent", "program_repair"]:
    """Conditional router after patch_validation.

    If the last patch was rejected and we have remaining iteration budget,
    retry program_repair.  Otherwise proceed to regression_agent.

    Early-exit: if all patches in the last two validation rounds were rejected,
    stop retrying — the tests themselves are likely broken (bad imports, etc.)
    and more repair iterations won't help.
    """
    validations = state.get("patch_validations", [])
    iteration = state.get("iteration", 0)
    max_iterations = state.get("max_iterations", 2)  # default: max 2 repair loops

    # Nothing validated yet or best was accepted → proceed
    if not validations:
        return "regression_agent"
    if validations[-1].verdict == "accepted":
        return "regression_agent"

    # Budget exhausted
    if iteration >= max_iterations:
        return "regression_agent"

    # Early exit: if the last 6+ validations are all rejected, stop
    # (means we're stuck — the tests themselves are broken or target code is empty)
    if len(validations) >= 6 and all(v.verdict == "rejected" for v in validations[-6:]):
        return "regression_agent"

    return "program_repair"


def build_agent_graph(llm: BaseChatModel | None = None) -> StateGraph:
    """Instantiates the LangGraph StateGraph with all 14 agents.

    All agents use Groq (llama-3.3-70b-versatile) for reliable execution.
    HuggingFace is not used — it caused silent failures due to chat template
    incompatibilities that bypassed the with_fallbacks() safety net.
    """
    from app.agents.llm_factory import get_best_llm, get_groq_llm

    # Use the provided LLM or fall back to Groq → best available
    try:
        groq_llm = llm or get_groq_llm()
    except Exception:
        groq_llm = get_best_llm()

    workflow = StateGraph(AgentState)

    # ── Instantiate all 14 agents ─────────────────────────────────────────────
    # Agent 1 — Project Analyst
    planner = PlannerAgent(groq_llm)
    # Agent 2 — Requirements Analyst
    requirement = RequirementAgent(groq_llm)
    # Agent 3 — Code Understanding
    code_understanding = CodeUnderstandingAgent(groq_llm)
    # Agent 4 — Architecture (note: numbered 4 in graph; user table has Architecture
    # as part of Code Understanding responsibility, but it is a separate existing node)
    architecture = ArchitectureAgent(groq_llm)
    # Agent 4 (Test Planner) — Test Planner
    test_strategy = TestStrategyAgent(groq_llm)
    # Agent 5 — Unit Test Generator
    test_gen = TestGenerationAgent(groq_llm)
    # Agent 6 — Verification Agent
    verification = VerificationAgent(groq_llm)
    # Agent 7 — Execution Agent
    execution = ExecutionAgent(groq_llm)
    # Agent 8 — Coverage Analyst
    coverage_analyst = CoverageAnalystAgent(groq_llm)
    # Agent 9 — Bug Localization
    bug_loc = BugLocalizationAgent(groq_llm)
    # Agent 10 — Root Cause Analyst
    root_cause = RootCauseAgent(groq_llm)
    # Agent 11 — Program Repair
    repair = ProgramRepairAgent(groq_llm)
    # Agent 12 — Patch Validation
    patch_val = PatchValidationAgent(groq_llm)
    # Agent 13 — Regression Agent
    regression = RegressionAgent(groq_llm)
    # Agent 14 — Explainability
    explainability = ExplainabilityAgent(groq_llm)
    # Learning/Memory (terminal enrichment node)
    learning = LearningAgent(groq_llm)

    # ── Register nodes ────────────────────────────────────────────────────────
    workflow.add_node("planner", planner)
    workflow.add_node("requirement", requirement)
    workflow.add_node("code_understanding", code_understanding)
    workflow.add_node("architecture", architecture)
    workflow.add_node("test_strategy", test_strategy)
    workflow.add_node("test_generation", test_gen)
    workflow.add_node("verification", verification)
    workflow.add_node("execution", execution)
    workflow.add_node("coverage_analyst", coverage_analyst)
    workflow.add_node("bug_localization", bug_loc)
    workflow.add_node("root_cause", root_cause)
    workflow.add_node("program_repair", repair)
    workflow.add_node("patch_validation", patch_val)
    workflow.add_node("regression_agent", regression)
    workflow.add_node("explainability", explainability)
    workflow.add_node("learning", learning)

    # ── Linear pipeline (Agents 1 → 9) ───────────────────────────────────────
    workflow.set_entry_point("planner")
    workflow.add_edge("planner", "requirement")
    workflow.add_edge("requirement", "code_understanding")
    workflow.add_edge("code_understanding", "architecture")
    workflow.add_edge("architecture", "test_strategy")
    workflow.add_edge("test_strategy", "test_generation")
    workflow.add_edge("test_generation", "verification")
    workflow.add_edge("verification", "execution")
    workflow.add_edge("execution", "coverage_analyst")

    # ── Conditional routing after coverage_analyst ────────────────────────────
    workflow.add_conditional_edges(
        "coverage_analyst",
        route_after_coverage,
        {
            "bug_localization": "bug_localization",
            "regression_agent": "regression_agent",
        },
    )

    # ── Debug/repair branch (Agents 9 → 12) ──────────────────────────────────
    workflow.add_edge("bug_localization", "root_cause")
    workflow.add_edge("root_cause", "program_repair")
    workflow.add_edge("program_repair", "patch_validation")

    # Conditional routing after patch_validation (retry repair vs finish)
    workflow.add_conditional_edges(
        "patch_validation",
        route_after_patch_validation,
        {
            "program_repair": "program_repair",
            "regression_agent": "regression_agent",
        },
    )

    # ── Final pipeline (Agents 13 → Learning) ────────────────────────────────
    workflow.add_edge("regression_agent", "explainability")
    workflow.add_edge("explainability", "learning")
    workflow.add_edge("learning", END)

    return workflow
