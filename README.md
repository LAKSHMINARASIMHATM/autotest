# AutoTestAI

> **An Agentic Multi-Agent Software Quality Engineer for Autonomous Testing, Root Cause Analysis, Automated Program Repair, and Continuous Validation using Retrieval-Augmented Generation (RAG) and Knowledge Graphs**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue.svg)](https://python.org)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-green.svg)](https://fastapi.tiangolo.com)

---

## Overview

AutoTestAI is a production-grade, research-oriented platform that acts as an **autonomous AI Software Quality Engineer**. It ingests an entire software project, builds a knowledge graph of its architecture, retrieves contextual knowledge via hybrid RAG, generates intelligent test suites, executes them in sandboxed environments, localizes failures, performs automated program repair, validates patches, and continuously learns from execution history.

### Research Contributions

1. **Hierarchical Multi-Agent Architecture** — 13 specialized agents orchestrated via LangGraph
2. **Hybrid Knowledge Retrieval** — RAG (ChromaDB + LlamaIndex) fused with Knowledge Graph reasoning (Neo4j)
3. **Autonomous Software Testing** — End-to-end test generation, execution, and validation
4. **Automated Program Repair** — Multi-candidate patch generation with isolated validation
5. **Explainable AI** — Every agent decision includes reasoning traces, confidence scores, and evidence
6. **Continuous Learning** — Long-term episodic memory improves future agent performance

---

## Architecture

```
Frontend (Next.js) → API Gateway (FastAPI) → Agent Orchestrator (LangGraph)
                                                    ↓
                                    ┌───────────────┼───────────────┐
                                    ↓               ↓               ↓
                              Knowledge Layer   Execution Layer  Memory Layer
                              (Neo4j + RAG)     (Docker Sandbox) (Redis + PG)
```

See [docs/architecture/HLD.md](docs/architecture/HLD.md) for the full High-Level Design.

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, Shadcn UI, Framer Motion, React Flow |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2 |
| AI/ML | LangGraph, LangChain, LlamaIndex, OpenAI GPT-4o, Claude, Llama 3 |
| Vector DB | ChromaDB |
| Graph DB | Neo4j |
| Database | PostgreSQL 16 |
| Cache | Redis |
| Testing | PyTest, Playwright, JUnit, Newman |
| DevOps | Docker, Docker Compose, GitHub Actions |
| Monitoring | Grafana, Prometheus |

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/your-org/autotest-ai.git
cd autotest-ai

# 2. Configure
cp .env.example .env
# Edit .env with your API keys and database credentials

# 3. Start all services
docker compose up -d

# 4. Access
# Dashboard: http://localhost:3000
# API Docs:  http://localhost:8000/docs
# Neo4j:     http://localhost:7474
```

---

## Project Structure

```
autotest/
├── backend/          # FastAPI + Agent Layer + Knowledge Layer
├── frontend/         # Next.js Dashboard
├── deployment/       # Docker, K8s, CI/CD
├── docs/             # Architecture, API, Research
├── scripts/          # Utility scripts
└── README.md
```

---

## License

MIT
