# AutoTestAI — High-Level Design (HLD)

## 1. System Overview

AutoTestAI is a **13-node agentic pipeline** that autonomously performs the full software quality engineering lifecycle:

```
Code Input → Knowledge Extraction → Test Generation → Execution → Bug Repair → Learning
```

---

## 2. Component Architecture

### 2.1 Frontend Layer
- **Framework:** Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- **Key Screens:** Dashboard, Agent Monitor, KG Explorer, XAI Trace Viewer
- **State:** TanStack Query for async server state; Framer Motion for animations
- **Data viz:** Recharts (coverage trend, bug distribution, patch strategy)

### 2.2 Backend API Layer
- **Framework:** FastAPI 0.115 + Python 3.12
- **Auth:** JWT Bearer tokens + RBAC (Admin / Engineer / Viewer)
- **Routers:** `/auth` `/projects` `/agents` `/graph` `/rag` `/execution` `/repair` `/metrics`
- **ODM:** Beanie (async MongoDB) via Motor driver

### 2.3 Agent Orchestration Layer
- **Engine:** LangGraph StateGraph with `AgentState` TypedDict
- **LLM:** Groq `llama-3.3-70b-versatile` (free tier)
- **Nodes:** 13 specialized agents (see §3)
- **Routing:** Conditional edges for failure-path repair loop

### 2.4 Knowledge Layer
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Vector Store | ChromaDB (remote HttpClient) | Dense semantic search |
| Embeddings | HuggingFace Inference API (free) | Remote embedding generation |
| Graph DB | Neo4j 5 | Structural code knowledge graph |
| Indexing | LlamaIndex | Document chunking + retrieval |

### 2.5 Execution Layer
- **Sandbox:** Docker SDK (ephemeral containers with network isolation)
- **Test Runners:** PyTest, Playwright, Newman
- **Result Parsing:** JUnit XML, pytest-json-report, Cobertura coverage.xml
- **Resource Limits:** 512MB RAM, 1 vCPU per container

### 2.6 Repair Layer
- **Patch Engine:** Groq LLM generating 4-strategy unified diff patches
- **Patch Validator:** Apply → compile check → failing test → regression sweep
- **Regression Checker:** Full test suite comparison against baseline

### 2.7 Data Layer
| Store | Technology | Data |
|-------|-----------|------|
| Primary DB | MongoDB Atlas | Users, Projects, Tests, Bugs, Patches |
| Cache | Redis 7 | Sessions, rate limiting, agent state |
| Vector Store | ChromaDB | Code embeddings |
| Graph | Neo4j | Code structure graph |

---

## 3. Agent Pipeline

```
┌─────────┐    ┌────────────┐    ┌──────────────┐    ┌──────────┐
│ Planner │───▶│ Requirement│───▶│ Architecture │───▶│ Retriever│
└─────────┘    └────────────┘    └──────────────┘    └────┬─────┘
                                                          │
                                                          ▼
┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Test Strategy│───▶│ Test Generation  │───▶│   Verification   │
└──────────────┘    └──────────────────┘    └────────┬─────────┘
                                                     │
                                                     ▼
                                              ┌──────────┐
                                              │ Execution│
                                              └────┬─────┘
                              ┌─────── pass ───────┘
                              │               └───── fail ──────────┐
                              ▼                                     ▼
                         ┌──────────┐                    ┌─────────────────┐
                         │ Learning │                    │ Bug Localization │
                         └──────────┘                    └────────┬────────┘
                                                                  ▼
                                                         ┌──────────────┐
                                                         │  Root Cause  │
                                                         └──────┬───────┘
                                                                ▼
                                                      ┌──────────────────┐
                                                      │ Program Repair   │◀── retry
                                                      └────────┬─────────┘
                                                               ▼
                                                      ┌──────────────────┐
                                                      │ Patch Validation  │
                                                      └────────┬─────────┘
                                                    accepted   │   rejected
                                                      ▼              │
                                               ┌──────────┐         │
                                               │ Learning │         │
                                               └──────────┘    (retry loop)
```

---

## 4. Data Flow

1. User submits a project via `/api/v1/projects`
2. Frontend triggers `/api/v1/agents/trigger`
3. Backend compiles the LangGraph StateGraph and invokes `ainvoke()`
4. Each agent reads from and writes to `AgentState`
5. List-accumulating fields merge safely across parallel writes
6. Terminal state is `COMPLETE` or `ERROR`
7. Frontend polls `/api/v1/metrics/dashboard/{project_id}` for real-time updates

---

## 5. Security Design

- JWT tokens (HS256, 30-min access + 7-day refresh)
- RBAC: Admin (full), Engineer (trigger, view), Viewer (read-only)
- Docker sandbox: `network_mode=none`, memory + CPU limits
- MongoDB queries via Beanie (type-safe, no raw injection risk)
- All secrets in env vars, SecretStr in Pydantic config
