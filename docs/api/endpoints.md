# AutoTestAI REST API Documentation

This document describes the API endpoints exposed by the AutoTestAI FastAPI backend server.

All V1 endpoints are prefix-grouped under `/api/v1` except for system management and metrics dashboards.

---

## 1. Authentication (`/api/v1/auth`)

Security protocol uses JWT Bearer Tokens in the authorization header:
`Authorization: Bearer <JWT_ACCESS_TOKEN>`

### `POST /api/v1/auth/register`
Registers a new user account.
- **Request Body (`RegisterRequest`)**:
  ```json
  {
    "email": "engineer@example.com",
    "password": "securepassword123",
    "full_name": "Senior QA Engineer"
  }
  ```
- **Response (`TokenResponse`)**: `201 Created`
  ```json
  {
    "access_token": "jwt_access_token_string",
    "refresh_token": "jwt_refresh_token_string",
    "token_type": "bearer",
    "expires_in": 1800
  }
  ```

### `POST /api/v1/auth/login`
Authenticates a user and issues access/refresh tokens.
- **Request Body (`LoginRequest`)**:
  ```json
  {
    "email": "engineer@example.com",
    "password": "securepassword123"
  }
  ```
- **Response (`TokenResponse`)**: `200 OK`
  ```json
  {
    "access_token": "jwt_access_token_string",
    "refresh_token": "jwt_refresh_token_string",
    "token_type": "bearer",
    "expires_in": 1800
  }
  ```

### `POST /api/v1/auth/refresh`
Exchanges a valid refresh token for a new token pair.
- **Request Body (`RefreshTokenRequest`)**:
  ```json
  {
    "refresh_token": "jwt_refresh_token_string"
  }
  ```
- **Response (`TokenResponse`)**: `200 OK`

### `GET /api/v1/auth/me`
Gets the currently authenticated user profile.
- **Response (`UserResponse`)**: `200 OK`
  ```json
  {
    "id": "user_id_string",
    "email": "engineer@example.com",
    "full_name": "Senior QA Engineer",
    "role": "engineer",
    "is_active": true
  }
  ```

---

## 2. Projects (`/api/v1/projects`)

Provides project setup, list retrieval, updates, and deletion.

### `POST /api/v1/projects`
Creates/imports a new software project.
- **Role Requirement**: `ADMIN`, `ENGINEER`
- **Request Body (`ProjectCreateRequest`)**:
  ```json
  {
    "name": "AutoTestAI Core",
    "description": "Agentic QA Pipeline",
    "repo_url": "https://github.com/autotest-ai/core.git",
    "language": "python",
    "framework": "pytest",
    "branch": "main",
    "config": {},
    "tags": ["core", "qa"]
  }
  ```
- **Response (`ProjectResponse`)**: `201 Created`
  ```json
  {
    "id": "project_uuid_string",
    "name": "AutoTestAI Core",
    "description": "Agentic QA Pipeline",
    "repo_url": "https://github.com/autotest-ai/core.git",
    "language": "python",
    "framework": "pytest",
    "branch": "main",
    "status": "active",
    "config": {},
    "tags": ["core", "qa"],
    "total_files": 45,
    "total_test_cases": 12,
    "total_bugs_found": 0,
    "total_patches_applied": 0,
    "coverage_percentage": 0.0,
    "created_at": "2026-07-16T15:27:04Z",
    "updated_at": "2026-07-16T15:27:04Z"
  }
  ```

### `GET /api/v1/projects`
Lists all active projects owned by the user.
- **Parameters**: `page` (default: 1), `page_size` (default: 10)
- **Response (`ProjectListResponse`)**: `200 OK`
  ```json
  {
    "items": [
      {
        "id": "project_uuid_string",
        "name": "AutoTestAI Core"
        // ... other project details
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 10
  }
  ```

### `GET /api/v1/projects/{project_id}`
Returns details for a single project.
- **Response (`ProjectResponse`)**: `200 OK`

### `PATCH /api/v1/projects/{project_id}`
Updates details of a single project. Only provided fields are changed.
- **Role Requirement**: `ADMIN`, `ENGINEER`
- **Request Body (`ProjectUpdateRequest`)**:
  ```json
  {
    "description": "Updated Agentic QA Core",
    "branch": "develop"
  }
  ```
- **Response (`ProjectResponse`)**: `200 OK`

### `DELETE /api/v1/projects/{project_id}`
Soft-deletes a project.
- **Role Requirement**: `ADMIN`
- **Response (`MessageResponse`)**: `200 OK`
  ```json
  {
    "message": "Project 'project_id_string' deleted successfully"
  }
  ```

---

## 3. Agents Control (`/api/v1/agents`)

Controls and checks status of the LangGraph multi-agent quality pipeline.

### `POST /api/v1/agents/trigger`
Triggers the 13-agent execution workflow for a project.
- **Request Body (`TriggerPipelineRequest`)**:
  ```json
  {
    "project_id": "project_uuid_string",
    "max_iterations": 3
  }
  ```
- **Response (`TriggerPipelineResponse`)**: `202 Accepted`
  ```json
  {
    "session_id": "session_uuid_string",
    "status": "started"
  }
  ```

---

## 4. Knowledge Graph (`/api/v1/graph`)

Interfacing with the Neo4j structured code ontology.

### `GET /api/v1/graph/module/dependencies`
Gets direct dependencies for a module.
- **Parameters**: `module_name` (str)
- **Response**: `200 OK`
  ```json
  [
    {
      "name": "app.core.config",
      "file_path": "app/core/config.py"
    }
  ]
  ```

### `GET /api/v1/graph/module/impact`
Runs impact analysis indicating how changes to a module propagate.
- **Parameters**: `module_name` (str), `depth` (int, default: 3)
- **Response**: `200 OK`
  ```json
  [
    {
      "affected_module": "app.main",
      "distance": 1
    }
  ]
  ```

### `GET /api/v1/graph/function/callers`
Gets callers of a function.
- **Parameters**: `function_name` (str)
- **Response**: `200 OK`
  ```json
  [
    {
      "name": "create_app",
      "signature": "def create_app() -> FastAPI"
    }
  ]
  ```

### `GET /api/v1/graph/dead-code`
Finds isolated functions (functions with 0 callers/callees).
- **Response**: `200 OK`
  ```json
  [
    {
      "name": "deprecated_helper",
      "docstring": "Old unused helper."
    }
  ]
  ```

---

## 5. Retrieval-Augmented Generation (`/api/v1/rag`)

Document vector indexing and semantic retrieval.

### `POST /api/v1/rag/index`
Indexes a source file or document.
- **Request Body (`IndexDocumentRequest`)**:
  ```json
  {
    "project_id": "project_uuid_string",
    "file_path": "app/main.py",
    "content": "def create_app(): ..."
  }
  ```
- **Response (`IndexDocumentResponse`)**: `201 Created`
  ```json
  {
    "message": "Successfully indexed app/main.py"
  }
  ```

### `GET /api/v1/rag/query`
Retrieves semantically related code contexts.
- **Parameters**: `project_id` (str), `query` (str), `limit` (int, default: 5)
- **Response (`list[QueryRAGResponse]`)**: `200 OK`
  ```json
  [
    {
      "content": "def create_app(): ...",
      "score": 0.85,
      "metadata": {
        "project_id": "project_uuid_string",
        "file_path": "app/main.py"
      }
    }
  ]
  ```

---

## 6. Execution Sandbox (`/api/v1/execution`)

Executes test suites inside isolated Docker environments.

### `POST /api/v1/execution/run`
Runs a test suite in a containerized sandbox.
- **Request Body (`ExecuteTestsRequest`)**:
  ```json
  {
    "project_id": "project_uuid_string",
    "project_path": "d:/autotest/backend",
    "test_files": ["tests/test_unit.py"],
    "framework": "pytest",
    "collection_path": ""
  }
  ```
- **Response (`ExecutionResultResponse`)**: `202 Accepted`
  ```json
  {
    "run_id": "run_id_string",
    "framework": "pytest",
    "passed": 6,
    "failed": 0,
    "errors": 0,
    "total": 6,
    "duration_ms": 1200.0,
    "coverage_pct": 82.5,
    "failures": [],
    "logs": "============================= test session starts ====================="
  }
  ```

---

## 7. Program Repair (`/api/v1/repair`)

Generates patches and performs validation routines.

### `POST /api/v1/repair/generate`
Generates multi-strategy patch candidates for a localized bug using the LLM.
- **Request Body (`GeneratePatchRequest`)**:
  ```json
  {
    "bug_id": "bug_uuid_string",
    "file_path": "app/main.py",
    "method_name": "create_app",
    "buggy_code": "if x is None: pass",
    "error_message": "AssertionError",
    "root_cause": "Null value not handled",
    "strategies": ["minimal"]
  }
  ```
- **Response (`list[PatchResponse]`)**: `201 Created`
  ```json
  [
    {
      "id": "patch_uuid_string",
      "bug_id": "bug_uuid_string",
      "strategy": "minimal",
      "file_path": "app/main.py",
      "diff": "+    if x is None: return",
      "description": "Handle null return early",
      "confidence": 0.95
    }
  ]
  ```

### `POST /api/v1/repair/validate`
Applies a patch in an isolated sandbox and validates it.
- **Request Body (`ValidatePatchRequest`)**:
  ```json
  {
    "patch_id": "patch_uuid_string",
    "patch_diff": "+    if x is None: return",
    "file_path": "app/main.py",
    "project_path": "d:/autotest/backend",
    "failing_test": "tests/test_unit.py::test_main",
    "run_id": "manual"
  }
  ```
- **Response (`ValidationResponse`)**: `200 OK`
  ```json
  {
    "patch_id": "patch_uuid_string",
    "compilation_ok": true,
    "failing_test_passes": true,
    "regression_ok": true,
    "coverage_maintained": true,
    "verdict": "ACCEPT",
    "reason": "All checks passed."
  }
  ```

### `POST /api/v1/repair/regression`
Runs a full regression suite sweep to ensure patches do not break existing test cases.
- **Request Body (`RegressionRequest`)**:
  ```json
  {
    "project_path": "d:/autotest/backend",
    "baseline_passed": 14
  }
  ```
- **Response**: `200 OK`

---

## 8. Telemetry & Metrics (`/api/v1/metrics`)

Aggregates system telemetry and workspace dashboard statistics.

### `GET /api/v1/metrics/dashboard/{project_id}`
Returns all KPI tiles for the project dashboard.
- **Response**: `200 OK`

### `GET /api/v1/metrics/coverage/{project_id}`
Returns coverage % trend over the last N runs.
- **Parameters**: `limit` (int, default: 10)
- **Response**: `200 OK`

### `GET /api/v1/metrics/bugs/{project_id}/severity`
Returns bug count distribution by severity (critical, high, medium, low).
- **Response**: `200 OK`

### `GET /api/v1/metrics/patches/{project_id}/strategies`
Returns patch count per repair strategy.
- **Response**: `200 OK`

### `GET /api/v1/metrics/xai/trace/{session_id}`
Returns the full XAI reasoning trace for an agent pipeline session.
- **Response**: `200 OK`

### `GET /api/v1/metrics/xai/confidence/{session_id}`
Returns per-agent confidence scores for visualization.
- **Response**: `200 OK`
