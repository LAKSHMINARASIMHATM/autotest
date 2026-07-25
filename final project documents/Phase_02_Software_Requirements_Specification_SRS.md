# Phase 2: Software Requirements Specification (SRS)

**Standard**: IEEE Std 830-1998 Compliant  
**Project**: AutoTestAI Framework  

---

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) document defines the complete functional, non-functional, interface, and system requirements for **AutoTestAI**: an Agentic AI-Based Autonomous Software Testing and Program Repair Framework. It serves as the baseline for system architecture, implementation, validation, and IEEE academic verification.

### 1.2 Document Conventions
* **FR-xx**: Functional Requirement identifier.
* **NFR-xx**: Non-Functional Requirement identifier.
* **MANDATORY**: Critical requirement; must be met in the primary release.
* **OPTIONAL**: Secondary or configurable capability.

### 1.3 Intended Audience
This document is intended for AI Researchers, Software Engineers, Systems Architects, QA Engineers, and IEEE Academic Reviewers.

---

## 2. Overall Description

### 2.1 Product Perspective
AutoTestAI is a full-stack multi-agent platform combining a React/TypeScript web interface, a Python FastAPI microservice architecture, a MongoDB persistence engine, and a LangGraph multi-agent orchestrator executing within sandboxed environments.

```
+-----------------------------------------------------------------------+
|                           AutoTestAI Web UI                           |
|               (React + TypeScript + Tailwind CSS + XAI)               |
+-----------------------------------------------------------------------+
                                   | HTTP REST / WebSockets
                                   v
+-----------------------------------------------------------------------+
|                         FastAPI Core Service                          |
|  +-----------------------------------------------------------------+  |
|  |                 Adaptive Agent Orchestrator                     |  |
|  | (LangGraph Engine: 14 Specialized Agents + Reflection Loop)      |  |
|  +-----------------------------------------------------------------+  |
|  |               Confidence & HITL Decision Module                 |  |
|  +-----------------------------------------------------------------+  |
+-----------------------------------------------------------------------+
          |                                            |
          v MongoDB Storage                            v Subprocess Isolation
+-------------------+                        +--------------------------+
| MongoDB Database  |                        | Sandboxed Execution Env  |
| (12 Collections)  |                        |  (PyTest + Coverage.py)  |
+-------------------+                        +--------------------------+
```

### 2.2 User Classes and Characteristics
1. **Software Developers**: Upload code, review generated unit tests, inspect bug reports, and accept/reject repair patches.
2. **QA & Testing Engineers**: Configure test generation parameters, view coverage reports, and execute regression suites.
3. **HITL Reviewers / Security Auditors**: Intervene when the Confidence Decision Module flags low-confidence agent outputs ($C < 0.70$).
4. **System Administrators**: Manage user authentication, agent LLM model assignments, API tokens, and sandbox execution settings.

### 2.3 Operating Environment
* **OS**: Cross-platform (Linux Ubuntu 22.04 LTS recommended, Windows 11, macOS Sonoma).
* **Backend Runtime**: Python 3.10+ with FastAPI, LangChain, LangGraph.
* **Frontend Runtime**: Node.js 18+ with Next.js / React 18, TypeScript, Tailwind CSS.
* **Database**: MongoDB v6.0+.
* **LLM Engine**: OpenAI API (GPT-4o), Ollama / Local (Llama 3 / DeepSeek-Coder-V2).

---

## 3. Functional Requirements

### 3.1 Project & Source Code Management
* **FR-01: Project Creation**: System MUST allow users to upload or import Python code repositories, zip files, or GitHub repository URLs.
* **FR-02: AST & Call Graph Indexing**: System MUST parse source files into Abstract Syntax Trees (AST) and generate call graphs for code understanding.
* **FR-03: Dependency Resolution**: System MUST detect project dependencies from `requirements.txt` or `pyproject.toml`.

### 3.2 Multi-Agent Test Generation Pipeline
* **FR-04: Test Planning**: System MUST generate a structured test plan identifying target functions, boundary conditions, edge cases, and exception scenarios.
* **FR-05: Unit Test Generation**: System MUST generate PyTest-compliant test files matching target source code functions.
* **FR-06: Static Verification**: System MUST statically check generated test code for syntax errors, missing imports, and undefined variables prior to execution.
* **FR-07: Sandboxed Test Execution**: System MUST execute generated test suites inside an isolated runtime container/subprocess with configurable execution timeouts.
* **FR-08: Coverage Metric Extraction**: System MUST collect line, branch, and method coverage data using `Coverage.py` and report metrics per file and function.

### 3.3 Bug Localization & Automated Program Repair (APR)
* **FR-09: Bug Localization**: Upon test failure, the system MUST pinpoint failing line numbers using Spectrum-Based Bug Localization (SBFL) and AST analysis.
* **FR-10: Root Cause Analysis (RCA)**: The Root Cause Analysis Agent MUST synthesize execution stack traces and localized AST nodes to generate a human-readable explanation of the defect.
* **FR-11: Patch Generation**: The Program Repair Agent MUST produce unified code diffs targeted at fixing identified bugs without breaking valid assertions.
* **FR-12: Patch Validation**: System MUST execute the updated code against the full test suite to verify bug resolution.
* **FR-13: Regression Testing**: System MUST automatically execute all existing passing tests against the repaired code to ensure zero regression.

### 3.4 Self-Reflection & Confidence Module
* **FR-14: Iterative Self-Reflection**: Agents MUST iteratively refine failing outputs (up to $N_{max\_retry} = 3$ iterations) by ingesting runtime execution feedback.
* **FR-15: Confidence Calculation**: System MUST compute a composite confidence score $C \in [0, 1]$ based on syntax correctness, compilation, pass rate, and code coverage.
* **FR-16: Automated Routing**: 
  - If $C \ge 0.85$, auto-accept output.
  - If $0.70 \le C < 0.85$, trigger self-reflection retry.
  - If $C < 0.70$, escalate to Human-in-the-Loop (HITL) review.

### 3.5 Human-in-the-Loop (HITL) & Explainability Dashboard
* **FR-17: HITL Review Queue**: System MUST hold low-confidence outputs in a reviewer queue, providing code diffs, execution logs, and recommended actions.
* **FR-18: Reviewer Action Logging**: System MUST capture reviewer decisions (Approve, Reject, Modify) and update agent memory for feedback learning.
* **FR-19: XAI Workflow Visualization**: Frontend MUST render dynamic agent state transitions, prompt histories, confidence gauges, and coverage heatmaps.

---

## 4. Non-Functional Requirements (NFR)

### 4.1 Performance Requirements
* **NFR-01: Response Time**: API endpoint response time for non-LLM operations MUST be under $200\text{ ms}$.
* **NFR-02: Test Generation Latency**: Single-function test generation and verification MUST complete within $15\text{ seconds}$ (excluding LLM network latency).
* **NFR-03: Execution Timeout**: Sandboxed test execution MUST terminate automatically if execution exceeds $30\text{ seconds}$ to prevent infinite loops.

### 4.2 Security & Safety Requirements
* **NFR-04: Sandboxed Code Execution**: All generated tests and patches MUST be executed in isolated subprocesses with restricted system privileges.
* **NFR-05: API Authentication**: All REST endpoints MUST require JWT (JSON Web Token) authentication with SHA-256 password hashing.
* **NFR-06: Data Isolation**: Tenant project data, code files, and test results MUST be isolated per user account.

### 4.3 Scalability & Reliability
* **NFR-07: Concurrent Jobs**: Backend MUST support processing up to 10 concurrent project test generation pipelines without memory leaks.
* **NFR-08: System Availability**: System MUST achieve $99.5\%$ uptime in production deployment setups.

### 4.4 Usability & Maintainability
* **NFR-09: Responsive UI**: Frontend MUST support desktop viewports ($1920\times1080$, $1440\times900$) with a dark-mode, high-contrast accessible interface.
* **NFR-10: Modular Design**: Backend services MUST follow standard FastAPI dependency injection and LangGraph decoupled node architecture.

---

## 5. System Interfaces & Constraints

### 5.1 External Interfaces
* **REST APIs**: FastAPI REST endpoints for all CRUD operations.
* **WebSockets**: Real-time agent streaming updates to the frontend dashboard.
* **LLM Provider APIs**: HTTP JSON interface to OpenAI, Ollama, DeepSeek, or Anthropic services.

### 5.2 System Constraints & Assumptions
* Primary target language for initial release is Python 3.10+ (PyTest ecosystem).
* Multi-agent LLM invocations depend on external or local API availability and token limits.
