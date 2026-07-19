"""Agent state schema — the shared typed state flowing through the LangGraph pipeline.

Every agent reads from and writes to this state. Fields use Annotated types
with reducer functions for list-accumulating fields, ensuring parallel
agent writes merge correctly.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Annotated, Any

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from pydantic import BaseModel, Field

# ── Sub-Schemas ──────────────────────────────────────────────────


class ProjectContext(BaseModel):
    """Parsed metadata about the target project."""

    project_id: str = ""
    name: str = ""
    language: str = "python"
    framework: str = ""
    repo_path: str = ""
    total_files: int = 0
    total_functions: int = 0
    total_classes: int = 0
    total_endpoints: int = 0
    modules: list[str] = Field(default_factory=list)


class Requirement(BaseModel):
    """A functional or non-functional requirement extracted from the SRS."""

    id: str = ""
    req_type: str = "functional"
    title: str = ""
    description: str = ""
    priority: str = "medium"
    acceptance_criteria: list[str] = Field(default_factory=list)
    confidence: float = 0.0


class ArchitectureGraph(BaseModel):
    """Structural analysis of the project — dependency, API, and service graphs."""

    dependency_edges: list[dict[str, str]] = Field(default_factory=list)
    api_endpoints: list[dict[str, Any]] = Field(default_factory=list)
    service_map: dict[str, list[str]] = Field(default_factory=dict)
    database_tables: list[dict[str, Any]] = Field(default_factory=list)
    class_hierarchy: list[dict[str, str]] = Field(default_factory=list)


class RetrievedDoc(BaseModel):
    """A document chunk retrieved by the RAG pipeline."""

    source: str = ""
    content: str = ""
    score: float = 0.0
    chunk_type: str = "code"
    metadata: dict[str, Any] = Field(default_factory=dict)


class KGTriple(BaseModel):
    """A triple (subject, predicate, object) from the Knowledge Graph."""

    subject: str = ""
    predicate: str = ""
    obj: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)


class TestStrategy(BaseModel):
    """Determined test strategy — which types of tests to generate."""

    test_types: list[str] = Field(default_factory=list)
    priorities: dict[str, str] = Field(default_factory=dict)
    risk_areas: list[str] = Field(default_factory=list)
    estimated_count: int = 0
    rationale: str = ""


class GeneratedTest(BaseModel):
    """A single generated test case with full metadata."""

    id: str = ""
    name: str = ""
    test_type: str = "unit"
    framework: str = "pytest"
    code: str = ""
    target_entity: str = ""
    requirement_id: str = ""   # LLM often returns None; coerced to "" below
    description: str = ""
    confidence: float = 0.0

    @classmethod
    def from_llm(cls, data: dict, index: int) -> GeneratedTest:
        """Safely construct from LLM output, coercing None fields to defaults."""
        from uuid import uuid4
        return cls(
            id=str(uuid4())[:8],
            name=data.get("name") or f"test_{index}",
            test_type=data.get("test_type") or "unit",
            framework=data.get("framework") or "pytest",
            code=data.get("code") or "",
            target_entity=data.get("target_entity") or "",
            requirement_id=data.get("requirement_id") or "",  # None → ""
            description=data.get("description") or "",
            confidence=float(data.get("confidence") or 0.5),
        )


class VerificationResult(BaseModel):
    """Verification status for a batch of tests."""

    total_verified: int = 0
    passed: int = 0
    rejected: int = 0
    issues: list[dict[str, str]] = Field(default_factory=list)
    hallucination_flags: list[str] = Field(default_factory=list)


class ExecutionResult(BaseModel):
    """Results from executing tests in the sandbox."""

    test_run_id: str = ""
    total: int = 0
    passed: int = 0
    failed: int = 0
    errors: int = 0
    coverage: float = 0.0
    duration_ms: float = 0.0
    failures: list[dict[str, Any]] = Field(default_factory=list)
    logs: str = ""


class BugLocalization(BaseModel):
    """A localized bug with file, method, line, and confidence."""

    id: str = ""
    test_id: str = ""
    file_path: str = ""
    class_name: str = ""
    method_name: str = ""
    line_number: int = 0
    confidence: float = 0.0
    error_message: str = ""


class RootCause(BaseModel):
    """Root cause analysis for a detected bug."""

    bug_id: str = ""
    summary: str = ""
    why: str = ""
    dependency_impact: list[str] = Field(default_factory=list)
    requirement_violated: str = ""
    severity: str = "medium"


class Patch(BaseModel):
    """A candidate code patch."""

    id: str = ""
    bug_id: str = ""
    strategy: str = "minimal"
    diff: str = ""
    file_path: str = ""
    description: str = ""
    confidence: float = 0.0


class PatchValidation(BaseModel):
    """Validation result for a candidate patch."""

    patch_id: str = ""
    compilation_ok: bool = False
    failing_test_passes: bool = False
    regression_ok: bool = False
    coverage_maintained: bool = False
    verdict: str = "pending"
    reason: str = ""


class Explanation(BaseModel):
    """XAI explanation for any agent decision."""

    agent: str = ""
    decision: str = ""
    reason: str = ""
    retrieved_context: list[str] = Field(default_factory=list)
    knowledge_graph_nodes: list[str] = Field(default_factory=list)
    confidence: float = 0.0
    supporting_evidence: list[str] = Field(default_factory=list)
    alternatives_considered: list[str] = Field(default_factory=list)


class AgentAction(BaseModel):
    """Audit trail entry for an agent action."""

    agent: str = ""
    action: str = ""
    detail: str = ""
    timestamp: str = ""
    status: str = "success"


# ── Pipeline Status ──────────────────────────────────────────────


class PipelineStatus(StrEnum):
    PLANNING = "planning"
    ANALYZING = "analyzing"
    RETRIEVING = "retrieving"
    STRATEGIZING = "strategizing"
    GENERATING = "generating"
    VERIFYING = "verifying"
    EXECUTING = "executing"
    DEBUGGING = "debugging"
    REPAIRING = "repairing"
    VALIDATING = "validating"
    LEARNING = "learning"
    COMPLETE = "complete"
    ERROR = "error"


# ── Reducer Functions ────────────────────────────────────────────

def _merge_lists(left: list, right: list) -> list:
    """Reducer that appends right items to left. Used for accumulating fields."""
    return left + right


# ── Agent State ──────────────────────────────────────────────────

from typing import TypedDict


class AgentState(TypedDict, total=False):
    """Shared state flowing through all LangGraph agent nodes.

    Fields marked with Annotated[..., _merge_lists] accumulate across
    parallel/sequential agent writes instead of overwriting.
    """

    # Session
    project_id: str
    session_id: str
    messages: Annotated[list[BaseMessage], add_messages]

    # Phase outputs
    project_context: ProjectContext
    requirements: Annotated[list[Requirement], _merge_lists]
    architecture: ArchitectureGraph
    retrieved_context: Annotated[list[RetrievedDoc], _merge_lists]
    kg_context: Annotated[list[KGTriple], _merge_lists]
    test_strategy: TestStrategy
    generated_tests: Annotated[list[GeneratedTest], _merge_lists]
    verification_result: VerificationResult
    execution_result: ExecutionResult
    bug_localizations: Annotated[list[BugLocalization], _merge_lists]
    root_causes: Annotated[list[RootCause], _merge_lists]
    patches: Annotated[list[Patch], _merge_lists]
    patch_validations: Annotated[list[PatchValidation], _merge_lists]

    # XAI + Audit
    explanations: Annotated[list[Explanation], _merge_lists]
    agent_trace: Annotated[list[AgentAction], _merge_lists]

    # Control
    iteration: int
    max_iterations: int
    status: PipelineStatus
    error: str

    # ── Injected by API on pipeline start (real code context) ───────────────
    # These flow from the API layer into the Planner and downstream agents.
    repo_url: str               # e.g. https://github.com/user/repo
    language: str               # primary language detected from scan
    framework: str              # primary framework (FastAPI, React, etc.)
    local_path: str             # local path to cloned repo (if any)
    repo_summary: dict          # full scan result: files, functions, api_endpoints, etc.

