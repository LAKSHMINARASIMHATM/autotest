"""LangGraph orchestrator — wires up the StateGraph with all 13 agent nodes.

Defines the flow:
1. planner -> requirement -> architecture -> retriever -> test_strategy -> test_generation -> verification -> execution
2. If execution has failing tests -> bug_localization -> root_cause -> program_repair -> patch_validation
3. patch_validation -> learning
4. learning -> complete
"""

from __future__ import annotations

from typing import Literal

from langchain_core.language_models import BaseChatModel
from langgraph.graph import END, StateGraph

from app.agents.nodes.architecture import ArchitectureAgent
from app.agents.nodes.bug_localization import BugLocalizationAgent
from app.agents.nodes.execution import ExecutionAgent
from app.agents.nodes.learning import LearningAgent
from app.agents.nodes.patch_validation import PatchValidationAgent
from app.agents.nodes.planner import PlannerAgent
from app.agents.nodes.program_repair import ProgramRepairAgent
from app.agents.nodes.requirement import RequirementAgent
from app.agents.nodes.retriever import RetrieverAgent
from app.agents.nodes.root_cause import RootCauseAgent
from app.agents.nodes.test_generation import TestGenerationAgent
from app.agents.nodes.test_strategy import TestStrategyAgent
from app.agents.nodes.verification import VerificationAgent
from app.agents.state import AgentState


def route_after_execution(state: AgentState) -> Literal["bug_localization", "learning"]:
    """Conditional router: If there are test failures, route to bug localization; else route to learning."""
    exec_result = state.get("execution_result")
    if exec_result and (exec_result.failed > 0 or exec_result.errors > 0 or len(exec_result.failures) > 0):
        return "bug_localization"
    return "learning"


def route_after_patch_validation(state: AgentState) -> Literal["learning", "program_repair"]:
    """Conditional router: If patch validation fails, we can retry (up to iteration limit); else proceed to learning."""
    validation = state.get("patch_validations", [])
    iteration = state.get("iteration", 0)
    max_iterations = state.get("max_iterations", 3)

    if validation and validation[-1].verdict == "rejected" and iteration < max_iterations:
        return "program_repair"
    return "learning"


def build_agent_graph(llm: BaseChatModel | None = None) -> StateGraph:
    """Instantiates the LangGraph StateGraph with all 13 agents.

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

    # All 13 agents use Groq for consistent, reliable execution
    planner      = PlannerAgent(groq_llm)
    requirement  = RequirementAgent(groq_llm)
    architecture = ArchitectureAgent(groq_llm)
    retriever    = RetrieverAgent(groq_llm)
    test_strategy = TestStrategyAgent(groq_llm)
    test_gen     = TestGenerationAgent(groq_llm)
    verification = VerificationAgent(groq_llm)
    execution    = ExecutionAgent(groq_llm)
    bug_loc      = BugLocalizationAgent(groq_llm)
    root_cause   = RootCauseAgent(groq_llm)
    repair       = ProgramRepairAgent(groq_llm)
    patch_val    = PatchValidationAgent(groq_llm)
    learning     = LearningAgent(groq_llm)

    # Add nodes to graph
    workflow.add_node("planner", planner)
    workflow.add_node("requirement", requirement)
    workflow.add_node("architecture", architecture)
    workflow.add_node("retriever", retriever)
    workflow.add_node("test_strategy", test_strategy)
    workflow.add_node("test_generation", test_gen)
    workflow.add_node("verification", verification)
    workflow.add_node("execution", execution)
    workflow.add_node("bug_localization", bug_loc)
    workflow.add_node("root_cause", root_cause)
    workflow.add_node("program_repair", repair)
    workflow.add_node("patch_validation", patch_val)
    workflow.add_node("learning", learning)

    # Define standard workflow edges
    workflow.set_entry_point("planner")
    workflow.add_edge("planner", "requirement")
    workflow.add_edge("requirement", "architecture")
    workflow.add_edge("architecture", "retriever")
    workflow.add_edge("retriever", "test_strategy")
    workflow.add_edge("test_strategy", "test_generation")
    workflow.add_edge("test_generation", "verification")
    workflow.add_edge("verification", "execution")

    # Conditional routing after execution
    workflow.add_conditional_edges(
        "execution",
        route_after_execution,
        {
            "bug_localization": "bug_localization",
            "learning": "learning",
        },
    )

    # Post-execution debugging flow
    workflow.add_edge("bug_localization", "root_cause")
    workflow.add_edge("root_cause", "program_repair")
    workflow.add_edge("program_repair", "patch_validation")

    # Conditional routing after patch validation (retry repair vs finish)
    workflow.add_conditional_edges(
        "patch_validation",
        route_after_patch_validation,
        {
            "program_repair": "program_repair",
            "learning": "learning",
        },
    )

    # Terminal node
    workflow.add_edge("learning", END)

    return workflow
