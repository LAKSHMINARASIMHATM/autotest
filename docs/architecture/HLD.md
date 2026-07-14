# AutoTestAI — High-Level Design Document

## 1. System Overview

AutoTestAI is an agentic multi-agent platform that autonomously performs software quality engineering. It ingests a software project, builds a knowledge graph of its structure, generates intelligent tests, executes them, localizes bugs, repairs code, validates patches, and continuously learns from outcomes.

## 2. Architecture Style

**Modular Monolith with Microservice-Ready Boundaries**

Each domain (agents, knowledge, execution, evaluation) is a self-contained module with explicit interfaces. This enables deployment as a monolith for simplicity or decomposition into microservices for scale.

## 3. System Layers

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| Presentation | Next.js, React, Tailwind, Shadcn UI | Dashboard, agent visualization, KG explorer |
| API Gateway | FastAPI | REST API, JWT auth, RBAC, rate limiting, SSE |
| Agent Orchestration | LangGraph | 13-agent stateful workflow with conditional routing |
| Knowledge | Neo4j + LlamaIndex + ChromaDB | Knowledge graph + hybrid RAG retrieval |
| Memory | Redis + PostgreSQL + ChromaDB | Short-term working memory + long-term episodic memory |
| Execution | Docker-in-Docker | Sandboxed test execution, patch application |
| Evaluation | Custom metrics engine | Coverage, risk scoring, XAI traces, hallucination detection |
| Data | PostgreSQL | Persistent relational storage for all entities |

## 4. Agent Orchestration

The 13 agents form a directed acyclic graph (with cycles for repair retries) orchestrated by LangGraph. Each agent:

- Receives the shared `AgentState`
- Performs its specialized task
- Returns an updated state
- Provides an XAI explanation for every decision

**Key design principle**: Agents are stateless functions over a shared state. All persistence is handled by the memory layer. This makes agents testable, replaceable, and composable.

## 5. Knowledge Retrieval: Hybrid RAG + KG

The Retriever Agent uses two complementary strategies:

1. **Dense Retrieval (RAG)**: LlamaIndex indexes source code, docs, requirements, and test history into ChromaDB. Semantic similarity search retrieves relevant context.

2. **Graph Traversal (KG)**: Neo4j stores structural relationships. Cypher queries traverse the graph to find related entities (e.g., "what methods call this function?", "what requirements trace to this module?").

The fusion of both strategies provides both semantic relevance and structural precision.

## 6. Security Architecture

- **Authentication**: JWT with refresh tokens
- **Authorization**: Role-Based Access Control (Admin, Engineer, Viewer)
- **Rate Limiting**: Token bucket per user
- **Input Validation**: Pydantic models on all endpoints
- **Audit Logging**: Every mutation logged with user, action, timestamp
- **Sandbox Isolation**: Test execution in ephemeral Docker containers

## 7. Deployment Architecture

```
┌──────────────────────────────────────────────┐
│                  Nginx Reverse Proxy          │
├──────────────┬───────────────────────────────┤
│  Frontend    │  Backend                       │
│  (Next.js)   │  (FastAPI)                     │
│  Port 3000   │  Port 8000                     │
├──────────────┴───────────────────────────────┤
│  PostgreSQL  │  Neo4j   │  ChromaDB  │ Redis │
│  Port 5432   │  7474/7687│  Port 8001 │ 6379 │
└──────────────┴───────────┴───────────┴───────┘
```

All services containerized via Docker Compose. Production-ready with health checks, restart policies, and volume mounts.

## 8. Scalability Considerations

- **Horizontal**: Stateless API servers behind a load balancer
- **Agent parallelism**: LangGraph supports parallel node execution for independent agents
- **Async I/O**: FastAPI + async SQLAlchemy for non-blocking database operations
- **Vector DB scaling**: ChromaDB supports sharding; migration path to Pinecone/Weaviate
- **Graph DB scaling**: Neo4j Aura for managed scaling

## 9. Monitoring & Observability

- **Prometheus**: Metrics collection (request latency, agent execution time, queue depth)
- **Grafana**: Dashboards for system health and agent performance
- **Structured Logging**: JSON logs with correlation IDs for distributed tracing
