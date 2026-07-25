# Phase 6: Production Database Schema (17 Collections) & REST API Specifications

---

## 1. MongoDB Production Architecture & Database Design

AutoTestAI utilizes **MongoDB v6.0+** as its primary persistence engine. The schema contains **17 production collections** designed with strict document validation schemas, compound indexes, entity relationships, and aggregation pipelines.

```
+-----------------------------------------------------------------------------------+
|                        MONGODB PRODUCTION DATABASE SCHEMA                         |
|                                                                                   |
|  [Users] <-------+-- [Projects] <----+-- [Repositories]                           |
|                  |                   +-- [SourceFiles]                            |
|                  |                   +-- [AgentStates]                            |
|                  |                   +-- [GeneratedTests] <--- [Executions]       |
|                  |                   +-- [AgentLogs]               |              |
|                  |                   +-- [Notifications]           v              |
|                  +-- [HITLReviews] <------------------------- [BugReports]        |
|                  |                                                 |              |
|  [CoverageReports] <-- [Executions]                                v              |
|  [PatchValidation] <-- [Repairs] <---------------------------------+              |
|  [RegressionResults] <- [PatchValidation]                                         |
|  [AuditLogs] <--- System Events                                                   |
|  [Settings]  <--- Global / User Configs                                           |
+-----------------------------------------------------------------------------------+
```

---

### 1.1 Complete Collection Schemas, Indexes & Validation Rules

#### 1. `Users` Collection
* **Indexes**: 
  - `email`: `{ email: 1 }` (Unique)
  - `role`: `{ role: 1 }`
* **Schema Validation**:
```json
{
  "_id": { "$oid": "66a000000000000000000001" },
  "email": "lead.engineer@autotest.ai",
  "password_hash": "$2b$12$e8N0...hashed_password",
  "full_name": "Dr. Grace Hopper",
  "role": "PRINCIPAL_ENGINEER",
  "is_active": true,
  "mfa_enabled": false,
  "created_at": "2026-07-25T10:00:00Z",
  "updated_at": "2026-07-25T10:00:00Z"
}
```

#### 2. `Projects` Collection
* **Indexes**:
  - `user_id_name`: `{ user_id: 1, name: 1 }` (Compound Unique)
  - `status`: `{ status: 1 }`
```json
{
  "_id": { "$oid": "66a000000000000000000002" },
  "user_id": { "$oid": "66a000000000000000000001" },
  "name": "AutoTestAI Autonomous Platform",
  "description": "Multi-agent automated software testing core engine",
  "language": "python",
  "framework": "pytest",
  "status": "ACTIVE",
  "created_at": "2026-07-25T10:15:00Z",
  "updated_at": "2026-07-25T10:15:00Z"
}
```

#### 3. `Repositories` Collection
* **Indexes**:
  - `project_id`: `{ project_id: 1 }`
  - `clone_url`: `{ clone_url: 1 }`
```json
{
  "_id": { "$oid": "66a000000000000000000003" },
  "project_id": { "$oid": "66a000000000000000000002" },
  "repo_name": "autotest-core",
  "clone_url": "https://github.com/autotest/autotest-core.git",
  "default_branch": "main",
  "commit_hash": "a1b2c3d4e5f67890123456789abcdef012345678",
  "file_count": 48,
  "total_loc": 12500,
  "synced_at": "2026-07-25T10:16:00Z"
}
```

#### 4. `SourceFiles` Collection
* **Indexes**:
  - `project_id_path`: `{ project_id: 1, file_path: 1 }` (Compound Unique)
```json
{
  "_id": { "$oid": "66a000000000000000000004" },
  "project_id": { "$oid": "66a000000000000000000002" },
  "file_path": "app/services/payment.py",
  "content": "def process_payment(amount: float) -> dict:\n    if amount <= 0:\n        raise ValueError('Invalid payment amount')\n    return {'status': 'SUCCESS', 'amount': amount}",
  "ast_data": {
    "functions": ["process_payment"],
    "classes": [],
    "imports": ["typing"],
    "cyclomatic_complexity": 2
  },
  "loc": 6,
  "updated_at": "2026-07-25T10:20:00Z"
}
```

#### 5. `AgentStates` Collection
* **Indexes**:
  - `project_id_session`: `{ project_id: 1, session_id: 1 }`
  - `status`: `{ status: 1 }`
```json
{
  "_id": { "$oid": "66a000000000000000000005" },
  "project_id": { "$oid": "66a000000000000000000002" },
  "session_id": "sess_9981237",
  "current_node": "node_unit_test_generation",
  "state_payload": {
    "target_file": "app/services/payment.py",
    "iteration_count": 1,
    "confidence_score": 0.88
  },
  "status": "RUNNING",
  "updated_at": "2026-07-25T10:24:00Z"
}
```

#### 6. `GeneratedTests` Collection
* **Indexes**:
  - `project_id_file`: `{ project_id: 1, source_file_id: 1 }`
  - `confidence_score`: `{ confidence_score: -1 }`
```json
{
  "_id": { "$oid": "66a000000000000000000006" },
  "project_id": { "$oid": "66a000000000000000000002" },
  "source_file_id": { "$oid": "66a000000000000000000004" },
  "test_code": "import pytest\nfrom app.services.payment import process_payment\n\ndef test_process_payment_valid():\n    res = process_payment(100.0)\n    assert res['status'] == 'SUCCESS'\n    assert res['amount'] == 100.0\n\ndef test_process_payment_negative():\n    with pytest.raises(ValueError):\n        process_payment(-50.0)",
  "confidence_score": 0.94,
  "status": "AUTO_ACCEPTED",
  "created_at": "2026-07-25T10:25:00Z"
}
```

#### 7. `Executions` Collection
* **Indexes**:
  - `test_id`: `{ test_id: 1 }`
  - `status`: `{ status: 1 }`
```json
{
  "_id": { "$oid": "66a000000000000000000007" },
  "test_id": { "$oid": "66a000000000000000000006" },
  "exit_code": 0,
  "passed_count": 2,
  "failed_count": 0,
  "stdout": "2 passed in 0.14s",
  "stderr": "",
  "execution_time_seconds": 0.14,
  "status": "PASSED",
  "executed_at": "2026-07-25T10:26:00Z"
}
```

#### 8. `CoverageReports` Collection
* **Indexes**:
  - `execution_id`: `{ execution_id: 1 }` (Unique)
```json
{
  "_id": { "$oid": "66a000000000000000000008" },
  "execution_id": { "$oid": "66a000000000000000000007" },
  "project_id": { "$oid": "66a000000000000000000002" },
  "line_coverage_pct": 100.0,
  "branch_coverage_pct": 100.0,
  "covered_lines": [1, 2, 3, 4],
  "missing_lines": [],
  "generated_at": "2026-07-25T10:26:05Z"
}
```

#### 9. `BugReports` Collection
* **Indexes**:
  - `execution_id`: `{ execution_id: 1 }`
  - `status`: `{ status: 1 }`
```json
{
  "_id": { "$oid": "66a000000000000000000009" },
  "execution_id": { "$oid": "66a000000000000000000007" },
  "project_id": { "$oid": "66a000000000000000000002" },
  "failing_test_name": "test_process_payment_negative",
  "error_type": "AssertionError",
  "localized_file": "app/services/payment.py",
  "localized_line": 3,
  "ochiai_score": 0.95,
  "status": "LOCALIZED",
  "created_at": "2026-07-25T10:27:00Z"
}
```

#### 10. `Repairs` Collection
* **Indexes**:
  - `bug_id`: `{ bug_id: 1 }`
```json
{
  "_id": { "$oid": "66a00000000000000000000a" },
  "bug_id": { "$oid": "66a000000000000000000009" },
  "patch_diff": "--- a/app/services/payment.py\n+++ b/app/services/payment.py\n@@ -3,2 +3,2 @@\n- if amount < 0:\n+ if amount <= 0:",
  "explanation": "Corrected boundary conditional logic for zero payment amounts.",
  "status": "VALIDATED",
  "created_at": "2026-07-25T10:28:00Z"
}
```

#### 11. `PatchValidation` Collection
* **Indexes**:
  - `repair_id`: `{ repair_id: 1 }` (Unique)
```json
{
  "_id": { "$oid": "66a00000000000000000000b" },
  "repair_id": { "$oid": "66a00000000000000000000a" },
  "is_valid": true,
  "compilation_success": true,
  "failing_test_now_passes": true,
  "validated_at": "2026-07-25T10:29:00Z"
}
```

#### 12. `RegressionResults` Collection
* **Indexes**:
  - `patch_validation_id`: `{ patch_validation_id: 1 }`
```json
{
  "_id": { "$oid": "66a00000000000000000000c" },
  "patch_validation_id": { "$oid": "66a00000000000000000000b" },
  "regression_passed": true,
  "total_suite_count": 48,
  "passed_count": 48,
  "failed_count": 0,
  "executed_at": "2026-07-25T10:30:00Z"
}
```

#### 13. `HITLReviews` Collection
* **Indexes**:
  - `project_id_status`: `{ project_id: 1, reviewer_decision: 1 }`
```json
{
  "_id": { "$oid": "66a00000000000000000000d" },
  "project_id": { "$oid": "66a000000000000000000002" },
  "item_type": "PATCH_REVIEW",
  "confidence_score": 0.64,
  "reviewer_id": { "$oid": "66a000000000000000000001" },
  "reviewer_decision": "APPROVED",
  "feedback_comments": "Patch verified manually by principal engineer.",
  "reviewed_at": "2026-07-25T11:00:00Z"
}
```

#### 14. `AgentLogs` Collection
* **Indexes**:
  - `project_id_agent`: `{ project_id: 1, agent_name: 1, timestamp: -1 }`
```json
{
  "_id": { "$oid": "66a00000000000000000000e" },
  "project_id": { "$oid": "66a000000000000000000002" },
  "agent_name": "UnitTestGenerationAgent",
  "action": "MUTATE_PROMPT_RETRY",
  "input_tokens": 1240,
  "output_tokens": 350,
  "latency_ms": 1450,
  "timestamp": "2026-07-25T10:24:50Z"
}
```

#### 15. `Notifications` Collection
* **Indexes**:
  - `user_id_read`: `{ user_id: 1, is_read: 1 }`
```json
{
  "_id": { "$oid": "66a00000000000000000000f" },
  "user_id": { "$oid": "66a000000000000000000001" },
  "title": "HITL Queue Escalation",
  "message": "Project payment-core triggered HITL escalation (Confidence C = 0.64).",
  "severity": "WARNING",
  "is_read": false,
  "created_at": "2026-07-25T10:35:00Z"
}
```

#### 16. `AuditLogs` Collection
* **Indexes**:
  - `user_id_action`: `{ user_id: 1, action: 1, timestamp: -1 }`
```json
{
  "_id": { "$oid": "66a000000000000000000010" },
  "user_id": { "$oid": "66a000000000000000000001" },
  "action": "HITL_PATCH_APPROVED",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  "resource_id": "66a00000000000000000000a",
  "timestamp": "2026-07-25T11:00:05Z"
}
```

#### 17. `Settings` Collection
* **Indexes**:
  - `user_id_scope`: `{ user_id: 1, scope: 1 }` (Unique)
```json
{
  "_id": { "$oid": "66a000000000000000000011" },
  "user_id": { "$oid": "66a000000000000000000001" },
  "scope": "GLOBAL",
  "default_llm_provider": "openai",
  "default_llm_model": "gpt-4o",
  "min_confidence_threshold": 0.85,
  "max_reflection_retries": 3,
  "sandbox_timeout_seconds": 30,
  "updated_at": "2026-07-25T11:15:00Z"
}
```

---

### 1.2 MongoDB Aggregation Pipelines

#### Pipeline 1: Project Coverage & Bug Summary Aggregation
```javascript
db.Projects.aggregate([
  { $match: { _id: ObjectId("66a000000000000000000002") } },
  {
    $lookup: {
      from: "CoverageReports",
      localField: "_id",
      foreignField: "project_id",
      as: "coverage_history"
    }
  },
  {
    $lookup: {
      from: "BugReports",
      localField: "_id",
      foreignField: "project_id",
      as: "bugs_found"
    }
  },
  {
    $project: {
      name: 1,
      latest_coverage: { $arrayElemAt: ["$coverage_history.line_coverage_pct", -1] },
      total_bugs_localized: { $size: "$bugs_found" }
    }
  }
]);
```

---

## 2. Complete REST API Specifications

### 2.1 Authentication & User APIs
- `POST /api/v1/auth/register` - User Registration
- `POST /api/v1/auth/login` - OAuth2 JWT Password Bearer Login
- `GET /api/v1/auth/me` - Fetch authenticated user profile

### 2.2 Project & Repository APIs
- `POST /api/v1/projects` - Create new project container
- `GET /api/v1/projects` - List all active projects
- `POST /api/v1/repositories/import` - Import GitHub repository
- `GET /api/v1/projects/{project_id}/files` - Explore source files AST tree

### 2.3 Multi-Agent Pipeline & Execution APIs
- `POST /api/v1/projects/{project_id}/execute-pipeline` - Trigger 14-agent test generation & repair pipeline
- `GET /api/v1/pipeline/{session_id}/state` - Real-time state graph status
- `GET /api/v1/executions/{execution_id}/logs` - PyTest stdout/stderr execution telemetry

### 2.4 Repair, HITL & Analytics APIs
- `GET /api/v1/hitl/queue` - Fetch low-confidence queue items ($C < 0.70$)
- `POST /api/v1/hitl/reviews/{review_id}/decide` - Submit human approval/rejection decision
- `GET /api/v1/analytics/{project_id}/summary` - Aggregate metrics dashboard data
