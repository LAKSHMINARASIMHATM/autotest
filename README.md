# AutoTestAI 🤖

> **An Autonomous Agentic Multi-Agent Software Quality Engineer for Autonomous Testing, Spectrum-Based Fault Localization, Multi-Strategy Automated Program Repair, and Continuous Validation using Hybrid RAG and Knowledge Graphs**

[![CI/CD Pipeline](https://github.com/LAKSHMINARASIMHATM/autotest/actions/workflows/ci.yml/badge.svg)](https://github.com/LAKSHMINARASIMHATM/autotest/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue.svg)](https://python.org)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-green.svg)](https://fastapi.tiangolo.com)
[![LangGraph](https://img.shields.io/badge/LangGraph-Multi--Agent-orange.svg)](https://langchain-ai.github.io/langgraph/)
[![Groq](https://img.shields.io/badge/LLM-Groq%20Llama%203.3-purple.svg)](https://groq.com)
[![Evaluation](https://img.shields.io/badge/Evaluation-In%20Progress-blue.svg)](evaluation/)
[![Preprint](https://img.shields.io/badge/Preprint-In%20Preparation-orange.svg)](final%20project%20documents/IEEE_Conference_Paper_Full_Manuscript.md)

---

## 🧠 Overview

**AutoTestAI** is an industrial-grade, research-oriented agentic platform that automates the entire software quality engineering lifecycle. Rather than relying on simple one-shot LLM prompts, AutoTestAI deploys a **14-agent LangGraph orchestrator** that ingests raw codebases, constructs dual structural knowledge representations (Neo4j Knowledge Graph + ChromaDB Vector Index), plans and synthesizes multi-framework test suites, executes them in isolated Docker sandboxes, localizes bugs via Spectrum-Based Fault Localization (SBFL), performs Automated Program Repair (APR) across 4 specialized strategies, validates candidate patches against regressions, and continuously learns from runtime telemetry.

### Primary Missions:
- 🎓 **Academic Research Capstone** — Novel closed-loop agentic architecture evaluating real-world Python defects against SOTA multi-agent approaches.
- 🏆 **Final Year Engineering Capstone** — Production-ready, fully validated software system.
- 💼 **FAANG-Level Architecture** — Asynchronous microservices, clean decoupled patterns, resilient fallback chains, and containerized sandboxes.
- 🌐 **Open-Source SaaS Platform** — Full-stack web portal with a 3D animated landing page, real-time agent visualizers, and interactive diff review tooling.

---

## ✨ Key Capabilities

| Capability | Technical Details |
| :--- | :--- |
| 🤖 **14-Agent LangGraph Pipeline** | Stateful graph pipeline: Planner → Requirements → Code Understanding → Architecture → Test Planner → Generation → AST Verification → Execution → Coverage Analyst → Bug Localization → Root Cause → Program Repair → Patch Validation → Regression Suite → Explainability → Learning |
| 🧬 **Dual Hybrid RAG** | Dense semantic vector embeddings (ChromaDB + HuggingFace) fused with structural call-graph and dependency traversal (Neo4j Cypher) |
| 🔬 **Structural Knowledge Graph** | Maps modules, classes, functions, inheritance hierarchies, dependencies, and REST API endpoints into an interactive graph |
| ⚡ **Multi-Framework Sandboxing** | Isolated test runners for **PyTest** (Python Unit/Integration), **Playwright** (E2E Browser Automation), **Newman** (Postman API Collections), and **JUnit** |
| 🔧 **4-Strategy Program Repair (APR)** | Generates and ranks candidates across 4 distinct strategies: `minimal` (surgical 1-line), `defensive` (null/type guard), `refactor` (structural simplification), and `boundary` (edge cases) |
| 🛡️ **Sandbox Patch Validation** | Strict 3-stage containment: AST compilation check → targeted failing test reproduction → full regression test sweep |
| 🎨 **3D Cyberpunk Landing Experience** | Interactive WebGL/Canvas dynamic particle flow, holographic glowing grid, floating telemetry badges, and 1-click launch |
| 📊 **14 Full-Stack Dashboard Views** | Glassmorphic Next.js 16 UI with live LangGraph execution monitoring, Neo4j interactive explorer, AST diff viewer, and security audit logs |
| 🛡️ **HITL Safety & Anti-Tampering** | Confidence scoring ($C < 0.70$) with Human-in-the-Loop approval modal and anti-deletion guards rejecting malicious patches (e.g., `/dev/null`) |
| 🔬 **Reproducible Evaluation Suite** | Real-world evaluation harness targeting real defects in BugsInPy and the 5 MAGISTER repositories |
| 🆓 **100% Free API Tier Ready** | Built natively on Groq (`llama-3.3-70b-versatile`) and free local/Atlas cloud services — zero paid OpenAI dependency required |

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               AutoTestAI Unified Platform                              │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  Frontend Client (Next.js 16 App Router + Tailwind CSS 4 + Framer Motion + WebGL)     │
│  3D Landing Page │ Agent Telemetry │ Graph Explorer │ Diff Viewer │ Security Console   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  API Gateway & Microservices (FastAPI + Python 3.12 + Pydantic v2)                     │
│  /auth  /projects  /agents  /graph  /rag  /execution  /repair  /metrics  /monitoring   │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│  Multi-Agent Core        │  Knowledge Layer            │  Execution Sandboxes          │
│  LangGraph StateGraph    │  Neo4j (Cypher Graph)       │  Docker Container Sandboxes   │
│  14 Specialized Agents   │  ChromaDB (Vector RAG)      │  Subprocess Isolation Fallback│
├──────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│  LLM Engine              │  Storage & Persistence      │  Security & Governance        │
│  Groq (Llama 3.3-70B)    │  MongoDB Atlas (Beanie ODM) │  JWT + RBAC Access Control    │
│  Free Cloud Inference    │  Redis 7 (Session Cache)    │  Anti-Tampering Sandbox Guard │
└──────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

### 14-Agent Adaptive Pipeline Flow

```mermaid
flowchart TD
    Start([Repository Ingested]) --> Planner[1. Project Analyst Agent]
    Planner --> Req[2. Requirements Agent]
    Req --> CodeUnd[3. Code Understanding Agent]
    CodeUnd --> Arch[4. Architecture Agent]
    Arch --> Strategy[5. Test Strategy Agent]
    Strategy --> Gen[6. Test Generation Agent]
    Gen --> Verify[7. AST Verification Agent]
    Verify --> Exec[8. Sandbox Execution Agent]
    Exec --> Cov[9. Coverage Analyst Agent]

    Cov --> CheckPass{All Tests Pass?}
    
    CheckPass -- Yes --> Explain[13. Explainability Agent]
    CheckPass -- No / Defects --> BugLoc[10. Bug Localization Agent]

    BugLoc --> RootCause[11. Root Cause Agent]
    RootCause --> Repair[12. Program Repair Engine]
    Repair --> PatchVal[Patch Validation Sandbox]
    PatchVal --> Regress[Regression Agent]

    Regress --> VerdictCheck{Patch Approved?}
    VerdictCheck -- Rejected (Iter < Max) --> Repair
    VerdictCheck -- Approved / Done --> Explain

    Explain --> Learn[14. Continuous Learning Agent]
    Learn --> Finish([Execution Complete & Persisted])

    style Start fill:#1e293b,stroke:#3b82f6,color:#fff
    style Finish fill:#1e293b,stroke:#22c55e,color:#fff
    style CheckPass fill:#0f172a,stroke:#eab308,color:#fff
    style VerdictCheck fill:#0f172a,stroke:#eab308,color:#fff
    style Repair fill:#311042,stroke:#a855f7,color:#fff
    style PatchVal fill:#1c1917,stroke:#f97316,color:#fff
```

---

## 🔬 Empirical Evaluation & Research Protocol

AutoTestAI is evaluated following rigorous software engineering empirical guidelines. The experimental harness measures fault localization (SBFL), automated program repair, and test generation across real-world Python repositories.

- 📋 **Evaluation Harness & Protocols:** [`evaluation/`](evaluation/)
- 📄 **Academic Research Methodology:** [`BENCHMARKS.md`](BENCHMARKS.md)
- 🔬 **MAGISTER Comparative Differentiation:** [`AutoTestAI_Benchmarking_and_MAGISTER_Differentiation.md`](AutoTestAI_Benchmarking_and_MAGISTER_Differentiation.md)

### 1. Evaluation Scope & Datasets

| Target Capability | Benchmark Dataset | Size / Scope | Target Metrics | Status |
| :--- | :--- | :---: | :--- | :---: |
| **Fault Localization (SBFL)** | **BugsInPy** | 40–50 Python Defects | Top-1 / Top-3 / Top-5 Ochiai ranking accuracy | `In Progress` |
| **Program Repair (APR)** | **BugsInPy** | 40–50 Python Defects | Plausible patch rate (passes test suite) & Correct patch rate | `In Progress` |
| **Test Generation vs. MAGISTER** | **5 MAGISTER Repos** (`tqdm`, `rich`, `markdown`, `tenacity`, `typer`) | 5 Repos | Line coverage (`coverage.py`), branch coverage, mutation score (`mutmut`) | `In Progress` |
| **Confidence & HITL Governance** | **QuixBugs** (Dev / Tuning Split) | 40 Python Programs | Expected Calibration Error ($ECE$), AUROC, false acceptance rate | `In Progress` |

*Note: Previous versions of this repository contained synthetic illustrative data (`benchmark_155_defects_raw.csv`), which has been purged to ensure strict academic integrity and reproducible measurement.*

---

### 2. Live Machine Verification & Smoke Checks

All core system layers are validated on the host development machine:

- **Core Backend Suite:** `26 / 26` Tests Passed in **~5.5 seconds** (`0` failures, `0` errors)
- **LangGraph Topology:** `16 / 16` Active Nodes verified (14 specialized agents + workflow handlers)
- **Frontend Production Build:** `17 / 17` Static Routes generated with `0` TypeScript errors
- **Safety Heuristics:** Instantaneous rejection of malicious deletion patches (`/dev/null`) in `< 0.001s`

To run the local developer smoke checks:
```bash
python scripts/smoke_checks.py
```

To run the full backend unit and integration test suite:
```bash
cd backend
python -m pytest tests/test_unit.py tests/test_integration.py -v
```

---

## 💻 Modern Web Application & Dashboard

The frontend is constructed using **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS 4**, and **Framer Motion**, delivering an ultra-modern glassmorphic design system:

```
frontend/src/app/
├── page.tsx                    # 3D Cyberpunk Landing Page with dynamic particle matrix
├── login/                      # JWT Authentication & Session Manager
└── dashboard/
    ├── page.tsx                # Executive KPI Summary & Telemetry Dashboard
    ├── pipeline/               # Interactive LangGraph Agent Pipeline Visualizer
    ├── agents/                 # Real-time Telemetry across all 14 Agents
    ├── bugs/                   # Spectrum-Based Fault Localization & Root Cause Diagnosis
    ├── patches/                # Multi-Strategy Unified Diff Viewer & 1-Click Validation
    ├── tests/                  # Multi-Framework Test Execution Hub (PyTest, Playwright, Newman)
    ├── execution/              # Real-Time Docker Sandbox Streaming Logs
    ├── knowledge/              # Dual Knowledge Graph (Neo4j Cypher Console + Vector Search)
    ├── projects/               # Full-Stack Project Repository Ingestion & File Browser
    ├── monitoring/             # System Health, Memory, Token Latency & Throughput
    ├── security/               # Role-Based Access Control (RBAC), API Keys & Safety Logs
    └── settings/               # LLM Configuration (Groq Llama-3.3-70B), Thresholds & Sandbox
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend UI** | Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Framer Motion, Three.js / Canvas 3D, Lucide Icons, Recharts |
| **Backend API** | Python 3.12, FastAPI 0.115, Pydantic v2, Uvicorn, Asyncio |
| **Agentic AI Core** | LangGraph (StateGraph), LangChain Core, LlamaIndex, Groq SDK (`llama-3.3-70b-versatile`), HuggingFace Transformers |
| **Graph Database** | Neo4j 5 (Enterprise / Aura Cloud) with Cypher Query Language |
| **Vector Database** | ChromaDB (Remote HttpClient mode + Local Fallback) |
| **Document Database**| MongoDB 7 / MongoDB Atlas with Beanie ODM |
| **Cache & Sessions** | Redis 7 (In-Memory Key-Value Cache) |
| **Execution Sandboxes** | Docker Engine, Isolated Linux Containers, Subprocess Sandbox Fallback |
| **Testing Runtimes** | PyTest, Playwright (Chromium/WebKit/Firefox), Newman (Postman API), JUnit |
| **DevOps & CI/CD** | Docker Compose, GitHub Actions CI/CD, Multi-Stage Builds |
| **Security & Auth** | JWT Authentication, Passlib (Bcrypt), RBAC Permissions, Anti-Tampering AST Guards |

---

## 🚀 Quick Start Guide

### Prerequisites
- [Docker & Docker Compose](https://www.docker.com/products/docker-desktop) installed and running.
- A free **Groq API Key** (available instantly at [console.groq.com](https://console.groq.com)).
- Free MongoDB Atlas cluster or local MongoDB instance.

### 1. Clone & Setup Environment

```bash
git clone https://github.com/LAKSHMINARASIMHATM/autotest.git
cd autotest
cp .env.example .env
```

Configure `.env`:
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
MONGODB_URL=mongodb+srv://user:password@cluster.mongodb.net/autotest
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_neo4j_password
JWT_SECRET=your-super-secret-jwt-key
```

### 2. Launch with Docker Compose (Recommended)

Start all services (Frontend, Backend API, ChromaDB, Neo4j, Redis):

```bash
docker compose up -d --build
```

### 3. Service Access Endpoints

| Portal / Service | URL | Credentials / Notes |
| :--- | :--- | :--- |
| 🖥️ **Web Application** | [http://localhost:3000](http://localhost:3000) | 3D Landing Page & Full Dashboard |
| 📚 **Interactive Swagger Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | OpenAPI 3.0 UI |
| 🔵 **Neo4j Graph Browser** | [http://localhost:7474](http://localhost:7474) | User: `neo4j` |
| 🧠 **ChromaDB Vector Server** | [http://localhost:8001](http://localhost:8001) | REST Vector Index |

---

### 4. Local Development Mode

If you prefer running services outside Docker containers:

#### Backend Setup (Python 3.12+):
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -e ".[dev]"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Frontend Setup (Node.js 18+):
```bash
cd frontend
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📡 REST API Reference

The backend exposes a fully documented, asynchronous REST API:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register new user account |
| `POST` | `/api/v1/auth/login` | Authenticate user & return JWT token |
| `GET`  | `/api/v1/auth/me` | Fetch active user profile and roles |
| `GET`  | `/api/v1/projects` | List all ingested software repositories |
| `POST` | `/api/v1/projects` | Ingest and index new project codebase |
| `POST` | `/api/v1/agents/trigger` | Trigger the 14-agent LangGraph test pipeline |
| `GET`  | `/api/v1/agents/status/{run_id}` | Poll real-time multi-agent execution telemetry |
| `GET`  | `/api/v1/graph/module/dependencies` | Retrieve module dependency graph for visualization |
| `POST` | `/api/v1/rag/index` | Extract AST chunks and index into ChromaDB |
| `GET`  | `/api/v1/rag/query` | Perform hybrid semantic code search |
| `POST` | `/api/v1/execution/run` | Execute tests in Docker isolated sandbox |
| `POST` | `/api/v1/repair/generate` | Synthesize 4-strategy patch candidates |
| `POST` | `/api/v1/repair/validate` | Validate patch diff against regressions |
| `GET`  | `/api/v1/metrics/dashboard/{id}` | Retrieve executive quality & coverage KPIs |
| `GET`  | `/api/v1/metrics/xai/trace/{id}` | Inspect full agent XAI reasoning attribution chain |

Full interactive OpenAPI documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs).

---

## 📁 Repository Structure

```
autotest/
├── .github/
│   └── workflows/ci.yml             # GitHub Actions CI pipeline
├── backend/
│   ├── app/
│   │   ├── agents/                  # LangGraph orchestrator & 14 specialized agent nodes
│   │   │   ├── nodes/               # Planner, Code Understanding, Repair, Regression, etc.
│   │   │   ├── orchestrator.py      # StateGraph wiring, conditional edges, back-loops
│   │   │   ├── llm_factory.py       # Groq Llama-3.3-70B model provider
│   │   │   └── state.py             # AgentState schema definition
│   │   ├── api/v1/                  # FastAPI routers (auth, projects, agents, repair, etc.)
│   │   ├── core/                    # Security, JWT, config, database connectors
│   │   ├── evaluation/              # Coverage analysis, metrics & XAI attribution service
│   │   ├── execution/               # Docker sandbox runners (PyTest, Playwright, Newman)
│   │   ├── models/                  # MongoDB Beanie ODM document models
│   │   ├── repair/                  # 4-strategy patch engine & sandbox validator
│   │   └── services/                # Neo4j Graph Builder & ChromaDB RAG services
│   ├── reports/                     # Standardized JUnit XML & JSON benchmark outputs
│   ├── tests/                       # Unit & integration test suites
│   ├── pyproject.toml               # Python dependencies and metadata
│   └── coverage.xml                 # Cobertura coverage output
├── frontend/
│   ├── src/
│   │   ├── app/                     # Next.js 16 App Router pages & layouts
│   │   ├── components/              # 40+ UI components (Diff viewer, Graph, XAI panel)
│   │   ├── contexts/                # Auth, Project, and WebSocket contexts
│   │   ├── hooks/                   # Custom telemetry & query hooks
│   │   └── types/                   # Comprehensive TypeScript interfaces
│   ├── package.json                 # Next.js dependencies and scripts
│   └── tsconfig.json                # Strict TypeScript configuration
├── deployment/                      # Dockerfiles & production deployment configurations
├── docs/                            # Architecture diagrams, API specs, and presentations
├── final project documents/         # IEEE Research Manuscript, PPT slides, and reports
├── scripts/
│   ├── smoke_checks.py              # Developer system & sandbox sanity check runner
│   └── seed.py                      # Database seeding for development
├── evaluation/                      # Empirical evaluation harness, configs, & results
├── test-bug-repo/                   # Dedicated live bug reproduction repository
├── BENCHMARK_RESULTS.md             # Empirical evaluation methodology & results
├── BENCHMARKS.md                    # Standardized evaluation protocol specification
├── docker-compose.yml               # Multi-container local orchestration
└── README.md                        # Master project documentation
```

---

## 🔬 Research & Academic Publications

AutoTestAI is prepared as a research capstone and formatted for academic submission:

- **Full Research Manuscript:** [`final project documents/IEEE_Conference_Paper_Full_Manuscript.md`](final%20project%20documents/IEEE_Conference_Paper_Full_Manuscript.md)
- **Updated IEEE Ready Document:** [`AutoTestAI_IEEE_Paper_IEEE_Ready_Updated.docx`](AutoTestAI_IEEE_Paper_IEEE_Ready_Updated.docx)

### Academic Citation:

```bibtex
@misc{autotestai2026,
  author    = {T M Lakshmi Narasimha},
  title     = {AutoTestAI: An Autonomous Agentic Multi-Agent Framework for Software Quality Engineering and Closed-Loop Program Repair},
  year      = {2026},
  note      = {Preprint / Research capstone in preparation}
}
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feat/novel-capability`)
3. Commit your Changes (`git commit -m 'feat: introduce novel capability'`)
4. Push to the Branch (`git push origin feat/novel-capability`)
5. Open a Pull Request following [Conventional Commits](https://www.conventionalcommits.org/).

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

## 👤 Author & Acknowledgments

**T M Lakshmi Narasimha**
- **GitHub:** [@LAKSHMINARASIMHATM](https://github.com/LAKSHMINARASIMHATM)
- **Repository:** [AutoTestAI on GitHub](https://github.com/LAKSHMINARASIMHATM/autotest)

*Built with ❤️ for autonomous software engineering, multi-agent AI research, and high-assurance automated program repair.*