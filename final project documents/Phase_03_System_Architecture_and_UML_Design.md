# Phase 3: System Architecture & UML Design Specifications

---

## 1. High-Level System Architecture

AutoTestAI is structured as an end-to-end, multi-layered agentic system. The system separates user interaction, API orchestration, autonomous agent reasoning, execution sandboxing, and database storage into decoupled tiers.

```
+-----------------------------------------------------------------------------------+
|                                  PRESENTATION TIER                                |
|   +---------------------------------------------------------------------------+   |
|   |         React 18 + TypeScript + Tailwind CSS + XAI Visualizer             |   |
|   |   [Dashboard] [Project Mgr] [Test Gen UI] [HITL Review] [Analytics]       |   |
|   +---------------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------+
                                          | HTTP REST / WebSockets
                                          v
+-----------------------------------------------------------------------------------+
|                                 APPLICATION TIER                                  |
|   +---------------------------------------------------------------------------+   |
|   |                         FastAPI Application Core                          |   |
|   |  - Authentication Service      - Project Service     - Agent Gateway      |   |
|   |  - Execution Engine Controller - Repair Service      - Analytics Engine   |   |
|   +---------------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                             AGENTIC REASONING TIER                                |
|   +---------------------------------------------------------------------------+   |
|   |                     LangGraph Multi-Agent Orchestrator                    |   |
|   |  - State Graph Engine         - Self-Reflection Loop Engine               |   |
|   |  - 14 Specialized Agents      - Confidence Decision Module ($C_{score}$)  |   |
|   +---------------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------+
                     |                                      |
                     v Execution Telemetry                  v Database Operations
+------------------------------------------+  +-------------------------------------+
|            EXECUTION TIER                |  |           DATA TIER                 |
|  +------------------------------------+  |  |  +-------------------------------+  |
|  |     Subprocess PyTest Sandbox      |  |  |  |      MongoDB Database         |  |
|  |  (Code Exec, Coverage.py, SBFL)    |  |  |  |   (12 Core Collections)      |  |
|  +------------------------------------+  |  |  +-------------------------------+  |
+------------------------------------------+  +-------------------------------------+
```

---

## 2. Low-Level Module Design

### 2.1 Agent State Management Node (LangGraph State)
The orchestration relies on a shared `AgentState` object passed across graph nodes:
* `project_id`: Current active project identifier.
* `source_code`: Code dictionary mapped by filepath.
* `ast_data`: Parsed Abstract Syntax Trees & function symbols.
* `test_plan`: Generated test plan specification.
* `generated_code`: Latest candidate PyTest code.
* `execution_result`: Output from PyTest execution sandbox (stdout, stderr, exit_code, duration).
* `coverage_report`: Percentage line/branch coverage and missing lines.
* `localization_report`: Localized faulty file, function, and line numbers.
* `patch_code`: Unified diff patch produced by repair agent.
* `confidence_score`: Float value $C \in [0.0, 1.0]$.
* `iteration_count`: Current self-reflection retry loop index.
* `status`: State status (`PLANNING`, `GENERATING`, `EXECUTING`, `LOCALIZING`, `REPAIRING`, `HITL_REQUIRED`, `COMPLETED`).

---

## 3. Specifications for 7 Core UML Diagrams

### 3.1 Use Case Diagram Specification
**Actors**: Software Developer, QA Engineer, HITL Reviewer, AutoTestAI System.

```mermaid
graph TD
    User((Software Developer))
    HITLUser((HITL Reviewer))
    Sys((AutoTestAI System))

    User --> UC1[Upload Repository / Code]
    User --> UC2[Trigger Test Generation Pipeline]
    User --> UC3[View Coverage & Bug Analytics]

    UC2 --> UC4[Execute Multi-Agent Test Gen]
    UC4 --> UC5[Execute Sandboxed PyTest]
    UC5 --> UC6[Calculate Confidence Score]

    UC6 -->|Confidence < 0.70| UC7[Escalate to HITL Queue]
    UC7 --> HITLUser
    HITLUser --> UC8[Approve / Reject Patch & Test]

    UC6 -->|Confidence >= 0.85| UC9[Auto-Commit Test & Patch]
    Sys --> UC4
    Sys --> UC5
```

---

### 3.2 Class Diagram Specification

```mermaid
classDiagram
    class Project {
        +String id
        +String name
        +String language
        +List~SourceFile~ files
        +DateTime createdAt
    }

    class AgentState {
        +String projectId
        +Map sourceCode
        +Object testPlan
        +String generatedTest
        +Object executionResult
        +Object coverageReport
        +Float confidenceScore
        +Int iterationCount
    }

    class BaseAgent {
        +String agentName
        +String role
        +execute(AgentState state) AgentState
    }

    class TestGenerationAgent {
        +generateTests(String code, Object plan) String
    }

    class BugLocalizationAgent {
        +localizeFault(Object executionResult, Map ast) Object
    }

    class ProgramRepairAgent {
        +generatePatch(String code, Object fault) String
    }

    class AdaptiveOrchestrator {
        +LangGraph graph
        +routeNextNode(AgentState state) String
        +evaluateConfidence(AgentState state) Float
    }

    BaseAgent <|-- TestGenerationAgent
    BaseAgent <|-- BugLocalizationAgent
    BaseAgent <|-- ProgramRepairAgent
    AdaptiveOrchestrator --> AgentState
    AdaptiveOrchestrator --> BaseAgent
    Project "1" -- "*" AgentState
```

---

### 3.3 Sequence Diagram Specification (Autonomous Test & Repair Loop)

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant WebUI as React Frontend
    participant API as FastAPI Backend
    participant Orch as Adaptive Orchestrator
    participant Agents as Agent Graph
    participant Exec as PyTest Sandbox
    participant DB as MongoDB

    User->>WebUI: Click "Generate & Test"
    WebUI->>API: POST /api/v1/projects/{id}/execute
    API->>Orch: Start LangGraph Workflow
    Orch->>Agents: Code Analysis & Test Planning Agents
    Agents-->>Orch: Return Test Plan & AST
    Orch->>Agents: Unit Test Generation Agent
    Agents-->>Orch: Return Generated PyTest Code
    Orch->>Exec: Run PyTest + Coverage.py
    Exec-->>Orch: Execution Result (Failures & Coverage)
    
    alt Test Failed
        Orch->>Agents: Bug Localization & RCA Agents
        Agents-->>Orch: Localized Line & RCA Report
        Orch->>Agents: Program Repair Agent
        Agents-->>Orch: Unified Patch Code
        Orch->>Exec: Re-Run PyTest (Patch Validation)
        Exec-->>Orch: Validation Result (Passing)
    end

    Orch->>Orch: Compute Confidence Score C
    Orch->>DB: Save GeneratedTests, Executions, Repairs
    Orch-->>API: Return Final Pipeline Output
    API-->>WebUI: Stream Execution & XAI Results via WebSocket
    WebUI-->>User: Display Results on XAI Dashboard
```

---

### 3.4 Activity Diagram Specification (Confidence & HITL Decision Logic)

```mermaid
stateDiagram-v2
    [*] --> InitializeState
    InitializeState --> CodeAnalysis
    CodeAnalysis --> TestGeneration
    TestGeneration --> StaticVerification

    state StaticVerification {
        [*] --> SyntaxCheck
        SyntaxCheck --> CompilationCheck
    }

    StaticVerification --> TestExecution: Compilation Success
    StaticVerification --> SelfReflection: Compilation Fail

    TestExecution --> CoverageAnalysis
    CoverageAnalysis --> CalculateConfidence

    CalculateConfidence --> CheckConfidenceThreshold

    state CheckConfidenceThreshold <<choice>>
    CheckConfidenceThreshold --> AutoAccept: C >= 0.85
    CheckConfidenceThreshold --> SelfReflection: 0.70 <= C < 0.85 and Iterations < 3
    CheckConfidenceThreshold --> EscalateHITL: C < 0.70 or Iterations >= 3

    SelfReflection --> TestGeneration: Mutate Prompt & Context
    EscalateHITL --> HITLReviewerQueue
    HITLReviewerQueue --> UserApproval

    state UserApproval <<choice>>
    UserApproval --> AutoAccept: Approved
    UserApproval --> TestGeneration: Rejected with Feedback

    AutoAccept --> SaveToDB
    SaveToDB --> [*]
```

---

### 3.5 Component Diagram Specification

```
+----------------------------------------------------------------------------------+
|                                FRONTEND COMPONENT                                |
|  [Auth UI]  [Dashboard UI]  [Project Manager]  [XAI Dashboard]  [HITL Console]   |
+----------------------------------------------------------------------------------+
                                          |
                                   REST / WebSocket API
                                          v
+----------------------------------------------------------------------------------+
|                                BACKEND SERVICE TIER                              |
|  +-----------------------+  +------------------------+  +---------------------+  |
|  | Authentication API    |  | Project Management API |  | Agent Gateway API   |  |
|  +-----------------------+  +------------------------+  +---------------------+  |
|  +-----------------------+  +------------------------+  +---------------------+  |
|  | Testing & Exec API    |  | Repair & Patch API     |  | Analytics Engine    |  |
|  +-----------------------+  +------------------------+  +---------------------+  |
+----------------------------------------------------------------------------------+
                                          |
                                          v
+----------------------------------------------------------------------------------+
|                            MULTI-AGENT ENGINE (LangGraph)                         |
|  [Analysis Agents]  [Generation Agents]  [Execution Node]  [Reflection Engine]    |
|  [Localization Agent] [Repair Agent]     [HITL Controller] [XAI Generator]       |
+----------------------------------------------------------------------------------+
                |                                                  |
                v                                                  v
+---------------------------------+              +---------------------------------+
|      DATABASE SYSTEM            |              |      ISOLATED EXECUTION         |
|  MongoDB (12 Collections)       |              |  PyTest / Subprocess Sandbox    |
+---------------------------------+              +---------------------------------+
```

---

### 3.6 Deployment Diagram Specification

```
+----------------------------------------------------------------------------------+
|                              PHYSICAL HOST / DOCKER CLUSTER                      |
|                                                                                  |
|  +----------------------------------+      +----------------------------------+  |
|  |   Frontend Container (Nginx)     |      |   Backend Container (FastAPI)    |  |
|  |   - Port 80 / 443                | <--> |   - Port 8000                    |  |
|  |   - Serves React Static Bundle   |      |   - Python 3.10 Runtime         |  |
|  +----------------------------------+      +----------------------------------+  |
|                                                              |                   |
|                                                              v                   |
|  +----------------------------------+      +----------------------------------+  |
|  |  Database Container (MongoDB)    |      |  Sandbox Execution Subprocess    |  |
|  |  - Port 27017                    |      |  - PyTest, Coverage.py Engine    |  |
|  |  - Persistent Named Volume       |      |  - Restricted Privileges         |  |
|  +----------------------------------+      +----------------------------------+  |
+----------------------------------------------------------------------------------+
```

---

### 3.7 Entity-Relationship (ER) Diagram Specification

```mermaid
erDiagram
    USERS ||--o{ PROJECTS : owns
    PROJECTS ||--o{ SOURCE_FILES : contains
    PROJECTS ||--o{ GENERATED_TESTS : produces
    GENERATED_TESTS ||--o{ EXECUTIONS : triggers
    EXECUTIONS ||--|| COVERAGE_REPORTS : generates
    EXECUTIONS ||--o{ BUG_REPORTS : localizes
    BUG_REPORTS ||--o{ REPAIRS : yields
    REPAIRS ||--|| PATCH_VALIDATIONS : satisfies
    PATCH_VALIDATIONS ||--|| REGRESSION_RESULTS : verifies
    EXECUTIONS ||--o{ HITL_REVIEWS : escalates
    PROJECTS ||--o{ AGENT_LOGS : records

    USERS {
        ObjectId _id
        string email
        string password_hash
        string role
    }
    PROJECTS {
        ObjectId _id
        ObjectId user_id
        string name
        string repository_url
    }
    GENERATED_TESTS {
        ObjectId _id
        ObjectId project_id
        string test_code
        float confidence_score
    }
    EXECUTIONS {
        ObjectId _id
        ObjectId test_id
        string status
        int exit_code
    }
    REPAIRS {
        ObjectId _id
        ObjectId bug_id
        string patch_diff
        string status
    }
```
