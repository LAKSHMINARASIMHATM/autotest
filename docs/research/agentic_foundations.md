# AutoTestAI Multi-Agent Research Foundations

This document details the research-grade 13-node multi-agent pipeline orchestrated via LangGraph in AutoTestAI.

---

## 1. Orchestration Model

AutoTestAI uses a cyclic **StateGraph** built on LangGraph to execute autonomous software quality workflows. The orchestration session state is defined by a mutable `AgentState` schema which propagates:
- Execution contexts and project files.
- Real-time unit test logs and code coverage percentages.
- Patch generation logs, validation histories, and structural AST nodes.
- XAI (Explainable AI) reasoning traces from each agent node.

```
                  ┌─────────┐
                  │ Planner │
                  └────┬────┘
                       ▼
             ┌──────────────────┐
             │ Requirement Eng. │
             └──────────────────┘
                       ▼
             ┌──────────────────┐
             │   Architecture   │
             └──────────────────┘
                       ▼
             ┌──────────────────┐
             │    Retriever     │
             └──────────────────┘
                       ▼
             ┌──────────────────┐
             │  Test Strategy   │
             └──────────────────┘
                       ▼
             ┌──────────────────┐
             │ Test Generation  │
             └──────────────────┘
                       ▼
             ┌──────────────────┐
             │   Verification   │
             └──────────────────┘
                       ▼
             ┌──────────────────┐
             │ Sandbox Run (Exec)│
             └─────────┬────────┘
                       ├───────── Tests Pass ────────┐
                       ▼                             ▼
                 ┌───────────┐                 ┌───────────┐
                 │ Learning  │                 │Bug Local. │
                 └─────┬─────┘                 └─────┬─────┘
                       │                             ▼
                       │                       ┌───────────┐
                       │                       │Root Cause │
                       │                       └─────┬─────┘
                       │                             ▼
                       │                       ┌───────────┐
                       │                       │  Repair   │◀─── Iteration
                       │                       └─────┬─────┘      Retry Loop
                       │                             ▼
                       │                       ┌───────────┐
                       │                       │ Validation│──── Fail ─┘
                       │                       └─────┬─────┘
                       │                           Pass
                       │                             ▼
                       │                       ┌───────────┐
                       └──────────────────────▶│ Learning  │
                                               └───────────┘
```

---

## 2. The 13 Specialized Agent Nodes

### 1. Planner Agent
Assesses the incoming code project structure and schedules overall verification goals.

### 2. Requirement Engineer Agent
Extracts functional requirements from developer docstrings, markdown documents, and API definitions to form baseline verification rules.

### 3. Architecture Agent
Parses source files into Abstract Syntax Trees (AST) to map out package dependencies, class inheritance structures, and function calls.

### 4. Retriever Agent
Retrieves semantic context and code blocks relevant to the specified module or failing test case from the ChromaDB vector store.

### 5. Test Strategy Agent
Formulates a detailed test plan, identifying partition classes, boundary values, and edge conditions to cover.

### 6. Test Generation Agent
Writes type-safe unit, integration, and end-to-end tests (e.g. using Pytest, Newman, or Playwright).

### 7. Verification Agent
Compiles test cases and validates syntax and type checking before executing tests.

### 8. Execution Agent
Invokes test runners inside ephemeral, isolated Docker containers and captures stdout/stderr and XML results.

### 9. Bug Localization Agent
Pinpoints buggy statements or methods using spectrum-based fault localization (SBFL) and call-graph analysis.

### 10. Root Cause Agent
Formulates hypotheses explaining why the identified code failed the assertions or crashed.

### 11. Program Repair (APR) Agent
Generates diff patch candidates using strategic code replacement models.

### 12. Patch Validation Agent
Applies the generated patch, executes the unit tests inside the sandbox, and runs a regression suite sweep.

### 13. Learning Agent
Collects telemetry, validates confidence levels, updates the knowledge graph with test histories, and records feedback for future repair tasks.
