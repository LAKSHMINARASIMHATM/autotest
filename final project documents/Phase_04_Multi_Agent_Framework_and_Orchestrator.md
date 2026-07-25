# Phase 4: Multi-Agent Framework & Production Adaptive Orchestrator

---

## 1. Production Multi-Agent Framework Architecture

AutoTestAI implements a stateful, event-driven multi-agent framework using **LangGraph**. The framework decomposes software testing and automated program repair into 14 single-responsibility agents communicating through a shared thread-safe state context (`AgentState`).

```
+-----------------------------------------------------------------------------------------+
|                                ADAPTIVE AGENT ORCHESTRATOR                              |
|                              (LangGraph Dynamic Routing Engine)                         |
+-----------------------------------------------------------------------------------------+
    |               |               |               |               |               |
    v               v               v               v               v               v
+-------+       +-------+       +-------+       +-------+       +-------+       +-------+
|  A01  |       |  A02  |       |  A03  |       |  A04  |       |  A05  |       |  A06  |
|Project|       |Reqs   |       |Code   |       |Test   |       |TestGen|       |Verif  |
|Analyst|       |Analyst|       |Underst|       |Planner|       |Agent  |       |Agent  |
+-------+       +-------+       +-------+       +-------+       +-------+       +-------+
    |               |               |               |               |               |
    +---------------+---------------+---------------+---------------+---------------+
                                            |
                                            v
+-----------------------------------------------------------------------------------------+
|                          EXECUTION & REPAIR LOOP AGENTS                                 |
+-----------------------------------------------------------------------------------------+
    |               |               |               |               |               |
    v               v               v               v               v               v
+-------+       +-------+       +-------+       +-------+       +-------+       +-------+
|  A07  |       |  A08  |       |  A09  |       |  A10  |       |  A11  |       |  A12  |
|Executn|       |Coverg |       |Bug    |       |Root C |       |Repair |       |Patch  |
|Agent  |       |Analyst|       |Localiz|       |Analyst|       |Agent  |       |Valid  |
+-------+       +-------+       +-------+       +-------+       +-------+       +-------+
                                    |               |               |
                                    v               v               v
                            +---------------+---------------+---------------+
                            |     A13: Regression Testing Agent             |
                            |     A14: Explainability Agent                 |
                            +-----------------------------------------------+
```

---

## 2. Detailed Specifications for All 14 AI Agents

### 2.1 Agent 01: Project Analysis Agent
* **Purpose**: Analyzes repository structure, entry points, configuration files (`requirements.txt`, `pyproject.toml`), and framework dependencies.
* **Inputs**: Repository directory path / file list tree JSON.
* **Outputs**: Project Metadata JSON (`language`, `framework`, `entry_points`, `dependencies`, `loc`).
* **System Prompt**:
  ```text
  You are an expert Project Analysis Agent. Inspect the provided directory tree and configuration files. Identify language runtime versions, core framework conventions, entry points, and dependencies. Output JSON strictly.
  ```
* **Workflow**: Ingest repository manifest $\rightarrow$ Parse dependency files $\rightarrow$ Identify testing framework $\rightarrow$ Emit JSON metadata.
* **Internal Logic**: Regex pattern matching combined with LLM semantic structure extraction.
* **Failure Handling**: On unreadable config, default to Python 3.10 and generic PyTest assumptions.
* **Retry Strategy**: 2 exponential backoff retries on LLM query failure.
* **Memory Usage**: Low ($\sim 150\text{ KB}$ context footprint).

---

### 2.2 Agent 02: Requirement Analysis Agent
* **Purpose**: Extracts functional requirements, invariants, precondition assertions, and postconditions from code docstrings and type annotations.
* **Inputs**: Target source code file content.
* **Outputs**: Structured Requirement Specification Schema JSON (`function_contracts`: `[name, preconditions, postconditions, expected_exceptions]`).
* **System Prompt**:
  ```text
  You are a Requirement Analysis Agent. Parse the target code docstrings and signatures. Extract explicit and implicit constraints, value boundaries, and exception behaviors.
  ```
* **Workflow**: Parse source AST $\rightarrow$ Extract docstring nodes $\rightarrow$ Synthesize behavioral contract schema.
* **Internal Logic**: Standardizes NumPy, Google, and Sphinx docstrings into structured JSON constraints.
* **Failure Handling**: If docstrings are absent, infer contracts strictly from static type annotations and branch guards.
* **Retry Strategy**: 1 retry with simplified prompt.
* **Memory Usage**: Moderate ($\sim 500\text{ KB}$ context footprint).

---

### 2.3 Agent 03: Code Understanding Agent
* **Purpose**: Builds Abstract Syntax Trees (AST), control flow graphs (CFG), and dependency call graphs.
* **Inputs**: Python Source Code String.
* **Outputs**: AST Symbol Table and Call Dependency Graph JSON.
* **System Prompt**:
  ```text
  You are a Code Understanding Agent specializing in AST parsing and control-flow graph construction. Map out function definitions, branch complexity, and call hierarchies.
  ```
* **Workflow**: Run native `ast.parse()` $\rightarrow$ Traverse AST nodes $\rightarrow$ Build symbol table & CFG JSON.
* **Internal Logic**: Traverses AST nodes (`ast.FunctionDef`, `ast.If`, `ast.For`, `ast.Call`) to compute cyclomatic complexity.
* **Failure Handling**: On syntax parsing error, flag target file as un-parseable and alert static verifier.
* **Retry Strategy**: No LLM retry needed (Deterministic AST parser).
* **Memory Usage**: Minimal ($\sim 100\text{ KB}$).

---

### 2.4 Agent 04: Test Planning Agent
* **Purpose**: Formulates a detailed test plan detailing happy paths, zero-values, boundary limits, and edge case parameters.
* **Inputs**: Requirement Schema (Agent 02) + AST Symbol Table (Agent 03).
* **Outputs**: Test Plan Specification Document JSON (`test_cases`: `[id, name, target_function, inputs, expected_output, boundary_type]`).
* **System Prompt**:
  ```text
  You are a Test Planning Agent. Design a comprehensive unit test suite plan covering happy paths, boundary limits, null checks, and error exceptions.
  ```
* **Workflow**: Correlate requirement contracts with CFG branches $\rightarrow$ Formulate boundary condition inputs $\rightarrow$ Output test plan JSON.
* **Internal Logic**: Maps each branch node in CFG to at least one unique test case scenario to ensure maximum potential path coverage.
* **Failure Handling**: Fall back to basic happy path generation if CFG complexity exceeds 25.
* **Retry Strategy**: 2 retries on invalid JSON formatting.
* **Memory Usage**: Moderate ($\sim 1\text{ MB}$).

---

### 2.5 Agent 05: Unit Test Generation Agent
* **Purpose**: Synthesizes executable PyTest unit code matching the Test Plan specification.
* **Inputs**: Source Code + Test Plan JSON + Target AST Symbol Table.
* **Outputs**: Executable PyTest Python Code String (`test_*.py`).
* **System Prompt**:
  ```text
  You are a Unit Test Generation Agent. Generate production-ready, compilable PyTest code for the target plan. Enforce strict imports, explicit assert statements, and mock external I/O using pytest-mock. Output ONLY valid executable Python code.
  ```
* **Workflow**: Formulate prompt with code & plan $\rightarrow$ Query LLM $\rightarrow$ Extract Python markdown block $\rightarrow$ Clean code string.
* **Internal Logic**: Uses strict template formatting, mocking external network/database calls with `unittest.mock`.
* **Failure Handling**: On code parsing failure, retry with strict markdown block delimiter formatting.
* **Retry Strategy**: 3 retries integrated into Self-Reflection loop.
* **Memory Usage**: High ($\sim 2\text{ MB}$).

---

### 2.6 Agent 06: Verification Agent
* **Purpose**: Statically verifies generated test code for syntax errors, unresolved imports, and symbol references prior to execution.
* **Inputs**: Generated PyTest Code String + Target Source Code.
* **Outputs**: Static Verification Result (`is_valid`: boolean, `syntax_errors`: list, `missing_imports`: list).
* **System Prompt**:
  ```text
  You are a Static Verification Agent. Audit candidate PyTest code for syntax errors, undefined variables, or invalid symbol references.
  ```
* **Workflow**: Parse AST of test code $\rightarrow$ Resolve imported symbols against source AST $\rightarrow$ Flag undefined variables.
* **Internal Logic**: Performs static symbol binding checks without executing the code.
* **Failure Handling**: If verification fails, automatically route to Self-Reflection loop with exact syntax error details.
* **Retry Strategy**: Deterministic static check (0 retries).
* **Memory Usage**: Minimal ($\sim 100\text{ KB}$).

---

### 2.7 Agent 07: Execution Agent
* **Purpose**: Safely runs generated unit tests within an isolated Python subprocess and captures standard output, return codes, and stack traces.
* **Inputs**: Target Source Code File + Generated Test File (`test_*.py`).
* **Outputs**: Execution Telemetry JSON (`exit_code`, `passed`, `failed`, `stdout`, `stderr`, `duration`).
* **System Prompt**: Operational Execution Agent (Subprocess Container Runner).
* **Workflow**: Write files to isolated temp directory $\rightarrow$ Execute `pytest --json-report` $\rightarrow$ Parse execution report JSON $\rightarrow$ Cleanup.
* **Internal Logic**: Enforces a strict $30\text{-second}$ timeout limit to kill hanging or infinite-loop test runs.
* **Failure Handling**: On process timeout, return `exit_code: 124` and mark test execution as `TIMED_OUT`.
* **Retry Strategy**: 1 process retry on unexpected OS signal failure.
* **Memory Usage**: Low ($\sim 200\text{ KB}$).

---

### 2.8 Agent 08: Coverage Analysis Agent
* **Purpose**: Measures line, branch, and statement code coverage using `Coverage.py` and identifies missing lines.
* **Inputs**: Execution Telemetry + Target Source File.
* **Outputs**: Coverage Metric Report (`line_coverage_pct`, `branch_coverage_pct`, `missing_lines`: list).
* **System Prompt**:
  ```text
  You are a Coverage Analysis Agent. Analyze Coverage.py JSON execution data. Identify un-covered lines and recommend specific test inputs.
  ```
* **Workflow**: Run `coverage run -m pytest` $\rightarrow$ Extract JSON coverage report $\rightarrow$ Map un-covered line numbers back to source AST.
* **Internal Logic**: Computes exact percentage line and branch coverage ratios.
* **Failure Handling**: If `.coverage` file is missing, return $0\%$ coverage status.
* **Retry Strategy**: Deterministic report parser (0 retries).
* **Memory Usage**: Minimal ($\sim 150\text{ KB}$).

---

### 2.9 Agent 09: Bug Localization Agent
* **Purpose**: Pinpoints the exact faulty file, function, and line numbers responsible for failing tests using Spectrum-Based Bug Localization (SBFL).
* **Inputs**: Execution Telemetry (failing stack trace) + Source AST + Coverage map.
* **Outputs**: Fault Localization Report (`faulty_file`, `faulty_function`, `suspect_lines`: list with suspicion scores).
* **System Prompt**:
  ```text
  You are a Bug Localization Agent. Inspect failing PyTest tracebacks and SBFL data. Pinpoint the top suspect lines causing the defect.
  ```
* **Workflow**: Parse traceback stack frames $\rightarrow$ Compute Ochiai suspicion scores for executed lines $\rightarrow$ Order suspect lines.
* **Internal Logic**: Applies SBFL Ochiai formula:
  $$S(e) = \frac{N_{cf}}{\sqrt{(N_{cf} + N_{uf}) \times (N_{cf} + N_{cp})}}$$
* **Failure Handling**: Fall back to top stack frame within project directory if SBFL data is sparse.
* **Retry Strategy**: 1 retry with simplified stack trace parsing.
* **Memory Usage**: Moderate ($\sim 800\text{ KB}$).

---

### 2.10 Agent 10: Root Cause Analysis Agent
* **Purpose**: Synthesizes localized bug lines, state variables, and execution error logs into an explainable textual explanation of *why* the code failed.
* **Inputs**: Bug Localization Report + Source Code snippet + Failing Test output.
* **Outputs**: Root Cause Analysis Document (`error_type`, `explanation`, `variable_states`, `suggested_fix_strategy`).
* **System Prompt**:
  ```text
  You are a Root Cause Analysis Agent. Synthesize localized bug lines, error traces, and source code logic. Explain the underlying defect cause clearly.
  ```
* **Workflow**: Construct prompt with localized snippet & trace $\rightarrow$ Query LLM $\rightarrow$ Generate structured RCA diagnosis.
* **Internal Logic**: Identifies logical flaws, off-by-one errors, type mismatches, or unhandled null states.
* **Failure Handling**: Fall back to raw error trace summary if LLM synthesis fails.
* **Retry Strategy**: 2 retries on LLM formatting error.
* **Memory Usage**: Moderate ($\sim 1.2\text{ MB}$).

---

### 2.11 Agent 11: Program Repair Agent
* **Purpose**: Generates targeted unified code diff patches to repair identified source code defects without altering intended behavior.
* **Inputs**: Source Code + Fault Localization Report + RCA Diagnosis.
* **Outputs**: Unified Git Patch String (`--- a/source.py \n +++ b/source.py ...`).
* **System Prompt**:
  ```text
  You are an expert Program Repair Agent. Produce a minimal, precise code patch fixing the diagnosed root cause. Output ONLY valid Unified Diff format.
  ```
* **Workflow**: Ingest original code & RCA diagnosis $\rightarrow$ Generate patch code $\rightarrow$ Validate diff syntax $\rightarrow$ Return patch diff string.
* **Internal Logic**: Applies minimal edits targeting localized lines to minimize regression risk.
* **Failure Handling**: If patch application (`patch -p1`) fails, retry patch generation with explicit full-file rewrite.
* **Retry Strategy**: 3 retries integrated into Self-Reflection loop.
* **Memory Usage**: High ($\sim 2.5\text{ MB}$).

---

### 2.12 Agent 12: Patch Validation Agent
* **Purpose**: Validates generated code patches by applying them to a temporary copy of the codebase and re-executing the failing unit test.
* **Inputs**: Original Code + Patch Diff + Generated Test Suite.
* **Outputs**: Patch Validation Status (`is_repaired`: boolean, `test_pass_rate`: float, `new_errors`: list).
* **System Prompt**: Operational Validation Agent (Execution Sandbox Runner).
* **Workflow**: Apply patch to source file copy $\rightarrow$ Execute PyTest sandbox $\rightarrow$ Check if previously failing test now passes $\rightarrow$ Return result.
* **Internal Logic**: Verifies that the targeted bug is $100\%$ resolved by the candidate patch.
* **Failure Handling**: If patch causes compilation failure, set `is_repaired: false` and trigger repair retry.
* **Retry Strategy**: Deterministic validation runner (0 retries).
* **Memory Usage**: Low ($\sim 300\text{ KB}$).

---

### 2.13 Agent 13: Regression Testing Agent
* **Purpose**: Ensures that applied patches do not break previously passing test cases across the entire project repository.
* **Inputs**: Patched Repository Code + Full Project Test Suite.
* **Outputs**: Regression Status (`regression_passed`: boolean, `total_tests`: int, `passed_tests`: int, `regressed_tests`: list).
* **System Prompt**: Operational Regression Suite Runner.
* **Workflow**: Run entire project PyTest suite against patched code $\rightarrow$ Compare pass rate against pre-patch baseline $\rightarrow$ Flag regressed tests.
* **Internal Logic**: If any previously passing test fails after patch application, flag a regression violation.
* **Failure Handling**: On regression violation, reject candidate patch and notify Program Repair Agent.
* **Retry Strategy**: Deterministic regression runner (0 retries).
* **Memory Usage**: Moderate ($\sim 1\text{ MB}$).

---

### 2.14 Agent 14: Explainability Agent
* **Purpose**: Translates complex multi-agent telemetry, confidence scores, and patch diffs into developer-friendly explanations for the XAI Dashboard.
* **Inputs**: Complete `AgentState` history dictionary.
* **Outputs**: XAI Summary Object (`workflow_timeline`, `confidence_breakdown`, `decision_justification`, `patch_summary`).
* **System Prompt**:
  ```text
  You are an Explainable AI Agent. Summarize the complete autonomous testing and repair execution trajectory into a transparent report for developers.
  ```
* **Workflow**: Aggregate agent execution logs $\rightarrow$ Synthesize workflow steps $\rightarrow$ Output structured XAI report JSON.
* **Internal Logic**: Generates step-by-step reasoning chains for developer auditability.
* **Failure Handling**: If state history is missing entries, generate partial summary with available agent logs.
* **Retry Strategy**: 1 retry.
* **Memory Usage**: High ($\sim 2\text{ MB}$).

---

## 3. Production Adaptive Agent Orchestrator Code Blueprint

```python
# backend/app/agents/orchestrator.py
from typing import Dict, Any, Literal
from langgraph.graph import StateGraph, END
from pydantic import BaseModel

class AgentStatePayload(BaseModel):
    project_id: str
    source_code: Dict[str, str]
    ast_data: Dict[str, Any] = {}
    test_plan: Dict[str, Any] = {}
    generated_code: str = ""
    verification_result: Dict[str, Any] = {}
    execution_result: Dict[str, Any] = {}
    coverage_report: Dict[str, Any] = {}
    bug_report: Dict[str, Any] = {}
    patch_code: str = ""
    confidence_score: float = 0.0
    iteration_count: int = 0
    max_retries: int = 3
    status: str = "INITIALIZED"

def compute_confidence(state: AgentStatePayload) -> float:
    s_syntax = 1.0 if state.verification_result.get("is_valid", False) else 0.0
    s_compile = 1.0 if state.execution_result.get("exit_code", 1) == 0 else 0.0
    
    total = state.execution_result.get("passed_count", 0) + state.execution_result.get("failed_count", 0)
    s_pass = (state.execution_result.get("passed_count", 0) / total) if total > 0 else 0.0
    
    line_cov = state.coverage_report.get("line_coverage_pct", 0.0) / 100.0
    branch_cov = state.coverage_report.get("branch_coverage_pct", 0.0) / 100.0
    s_cov = 0.6 * line_cov + 0.4 * branch_cov
    
    s_regress = 1.0  # Default baseline
    
    C = 0.15 * s_syntax + 0.20 * s_compile + 0.35 * s_pass + 0.15 * s_cov + 0.15 * s_regress
    return round(C, 4)

def route_next_node(state: AgentStatePayload) -> Literal["self_reflection", "bug_localization", "explainability", "hitl_queue"]:
    if not state.verification_result.get("is_valid", False):
        if state.iteration_count < state.max_retries:
            return "self_reflection"
        return "hitl_queue"

    if state.execution_result.get("failed_count", 0) > 0 and not state.patch_code:
        return "bug_localization"

    C = compute_confidence(state)
    state.confidence_score = C

    if C >= 0.85:
        return "explainability"
    elif 0.70 <= C < 0.85 and state.iteration_count < state.max_retries:
        return "self_reflection"
    else:
        return "hitl_queue"
```
