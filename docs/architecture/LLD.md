# AutoTestAI — Low-Level Design Document

## 1. Backend Application Factory

```python
# app/main.py — Application creation with dependency injection
def create_app() -> FastAPI:
    app = FastAPI(title="AutoTestAI", version="1.0.0")
    app.add_middleware(CORSMiddleware, ...)
    app.add_middleware(RateLimitMiddleware, ...)
    app.include_router(api_v1_router, prefix="/api/v1")
    app.add_event_handler("startup", on_startup)
    app.add_event_handler("shutdown", on_shutdown)
    return app
```

## 2. Core Module Design

### 2.1 Configuration (Pydantic Settings)

```python
class Settings(BaseSettings):
    MONGODB_URL: str
    MONGODB_DB_NAME: str
    REDIS_URL: str
    NEO4J_URI: str
    NEO4J_USER: str
    NEO4J_PASSWORD: SecretStr
    CHROMA_HOST: str
    CHROMA_PORT: int
    OPENAI_API_KEY: SecretStr
    ANTHROPIC_API_KEY: SecretStr
    GROQ_API_KEY: SecretStr
    JWT_SECRET: SecretStr
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    model_config = SettingsConfigDict(env_file=".env")
```

### 2.2 Security

- `create_access_token(subject, role)` → JWT with role claim
- `verify_token(token)` → decoded payload or 401
- `hash_password(plain)` / `verify_password(plain, hashed)` → bcrypt
- `RBACDependency(allowed_roles)` → FastAPI dependency

### 2.3 Exception Hierarchy

```
AppException (base)
├── AuthenticationError (401)
├── AuthorizationError (403)
├── NotFoundError (404)
├── ValidationError (422)
├── AgentExecutionError (500)
├── SandboxError (500)
└── ExternalServiceError (502)
```

## 3. Agent Node Interface

Every agent node extends the abstract class `BaseAgentNode` and implements the `execute` method contract:

```python
class BaseAgentNode(abc.ABC):
    name: str
    description: str
    llm: BaseChatModel | None

    async def __call__(
        self,
        state: AgentState,
        config: RunnableConfig | None = None,
    ) -> dict[str, Any]:
        # Wraps execute() with error handling, logging, and tracing

    @abc.abstractmethod
    async def execute(
        self,
        state: AgentState,
        config: RunnableConfig | None = None,
    ) -> dict[str, Any]:
        """Perform domain-specific agent logic and return state update dictionary."""
```

## 4. Knowledge Graph Operations

### 4.1 Graph Construction Pipeline

```
Source Code → AST Parser → Entity Extraction → Neo4j Ingestion
                                                  ↓
Requirements Doc → NLP Parser → Requirement Nodes → Link to Code Entities
                                                  ↓
API Spec → OpenAPI Parser → Endpoint Nodes → Link to Handlers
```

### 4.2 Key Cypher Queries

```cypher
// Find all methods that a failing test covers
MATCH (t:TestCase {id: $test_id})-[:TESTS]->(m:Method)
RETURN m.name, m.file, m.start_line, m.end_line

// Find requirement traceability gaps
MATCH (r:Requirement)
WHERE NOT (r)<-[:TRACED_TO]-(:TestCase)
RETURN r.id, r.description

// Impact analysis for a changed method
MATCH (m:Method {name: $method_name})<-[:CALLS*1..3]-(caller:Method)
RETURN caller.name, caller.file
```

## 5. RAG Pipeline Design

```
Document Ingestion
    ↓
Chunking (code-aware: by function/class, not arbitrary splits)
    ↓
Embedding (OpenAI text-embedding-3-small)
    ↓
ChromaDB Storage (with metadata: file_path, entity_type, language)
    ↓
Query → Hybrid Retrieval (dense similarity + metadata filter)
    ↓
Re-ranking (cross-encoder or LLM-based)
    ↓
Context Assembly → Agent Prompt
```

## 6. Execution Sandbox

```
Test Execution Request
    ↓
Build ephemeral Docker container from project Dockerfile
    ↓
Mount test files into container
    ↓
Execute: pytest / junit / playwright / newman
    ↓
Collect: stdout, stderr, coverage.xml, screenshots
    ↓
Parse results into TestResult schema
    ↓
Destroy container
```

## 7. Patch Validation Protocol

```
1. Clone project into isolated workspace
2. Apply patch (git apply)
3. Build/compile
4. Run original failing test → must pass
5. Run full regression suite → no new failures
6. Compute coverage diff → must not decrease
7. Verdict: ACCEPT | REJECT with reason
```

## 8. XAI Explanation Schema

Every agent decision produces:

```python
class Explanation(BaseModel):
    agent: str
    decision: str
    reason: str
    retrieved_context: list[str]         # RAG doc IDs
    knowledge_graph_nodes: list[str]     # Neo4j node IDs
    confidence: float                    # 0.0 - 1.0
    supporting_evidence: list[str]       # quoted passages
    alternative_considered: list[str]    # rejected alternatives


## 9. Backend Directory Layout

The backend application is structured around consolidated modules and clean domain boundaries:

```
app/
├── agents/            # LangGraph agent definitions & orchestrator
├── api/               # API router configurations
│   └── v1/
│       └── router.py  # Routes registry
├── core/              # Global app settings, database pools, logging
├── evaluation/        # Heuristics metrics & explanation tracing services
├── execution/         # Isolated Docker runners and parsers
├── knowledge/         # Consolidated knowledge base module
│   ├── graph/         # Neo4j Service, Graph Builder, and graph endpoints
│   └── rag/           # ChromaDB RAG Service and RAG endpoints
├── memory/            # Redis cache connection pools
├── models/            # ODM Beanie/Mongo database models
├── repair/            # Code patch, validator, and regression checking
├── schemas/           # Pydantic schemas for request/response payloads
└── utils/             # Helper utility functions and decorators
```
```
