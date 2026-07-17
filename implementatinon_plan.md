# Plan: Replacing Mock Data with Real Database Data

This plan outlines the steps to replace hardcoded mock data in both the frontend and backend with real, accurate data fetched from MongoDB (with graceful fallback for Neo4j).

## User Review Required

> [!IMPORTANT]
> - **MongoDB Database**: The database credentials in `.env` connect to a remote MongoDB Atlas cluster. We will write a seeding script to populate this database with realistic, accurate project, test run, test case, bug report, and patch data.
> - **Developer Auth Fallback**: The frontend does not currently implement a login flow in the UI. To allow API requests to succeed during development without requiring manual authentication, we will add a fallback in the backend JWT validation. If `APP_ENV=development` and no token is present, the API will automatically run in the context of the default seeded user.
> - **Neo4j/Cypher Fallback**: Since Docker is not running and Neo4j is unavailable locally, we will implement a fallback resolver for the Cypher query console in the backend that queries MongoDB for code entities, tests, and bugs, and returns the accurate, real-time results.

## Proposed Changes

---

### [Component: Backend Core & Seeding]

#### [NEW] [seed.py](file:///d:/autotest/scripts/seed.py)
Create a seeding script inside the `scripts` folder to populate MongoDB Atlas with:
- A default developer user (`admin@autotest.ai`).
- A default project (`AutoTestAI`).
- 9 historical test runs to show the coverage trend, bug counts, and passed test rates.
- Generated test cases (matching the mock schemas).
- Localized bug reports (timing attacks and JWT token expiration).
- Candidate and accepted patches with their validations.

#### [MODIFY] [security.py](file:///d:/autotest/backend/app/core/security.py)
Modify `get_current_user_payload` to support a dev bypass. If `APP_ENV == "development"` and no token is present, return the default seeded user's payload. Set `auto_error=False` on the `HTTPBearer` scheme.

#### [MODIFY] [metrics_service.py](file:///d:/autotest/backend/app/evaluation/metrics_service.py)
Fix `latest_run.coverage` type checking. Since `coverage` is stored as a dictionary by the coverage parser, extract `line_coverage_pct` before rounding to avoid a `TypeError`.

---

### [Component: Backend API Endpoints]

#### [MODIFY] [projects.py](file:///d:/autotest/backend/app/api/v1/endpoints/projects.py)
Add three sub-resource endpoints under `/api/v1/projects`:
- `GET /{project_id}/test-cases`: Retrieve real test cases from MongoDB.
- `GET /{project_id}/bugs`: Retrieve localized bug reports from MongoDB.
- `GET /{project_id}/patches`: Retrieve patches and their validation statuses from MongoDB.

#### [MODIFY] [endpoints.py](file:///d:/autotest/backend/app/knowledge/graph/endpoints.py)
Add the `POST /query` endpoint to execute Cypher queries. Implement a parser/fallback that translates the console's query strings into MongoDB queries if Neo4j is down, ensuring accurate query output.

---

### [Component: Frontend Client & Pages]

#### [NEW] [api.ts](file:///d:/autotest/frontend/src/lib/api.ts)
Create a central API client helper using standard `fetch` to handle backend communication, endpoint paths, and payload formats.

#### [MODIFY] [charts.tsx](file:///d:/autotest/frontend/src/components/dashboard/charts.tsx)
Refactor the charts (`CoverageChart`, `BugSeverityChart`, `PatchStatusChart`) to accept dynamic data as props rather than using local hardcoded arrays.

#### [MODIFY] [page.tsx](file:///d:/autotest/frontend/src/app/dashboard/page.tsx)
Update the main Dashboard page to fetch:
- Overview metrics from `/api/v1/metrics/dashboard/{project_id}`.
- Coverage trend history from `/api/v1/metrics/coverage/{project_id}`.
- Bug severity counts from `/api/v1/metrics/bugs/{project_id}/severity`.
- Patch strategy success rates from `/api/v1/metrics/patches/{project_id}/strategies`.

#### [MODIFY] [page.tsx](file:///d:/autotest/frontend/src/app/dashboard/projects/page.tsx)
Update the Projects page to fetch and list real projects from `/api/v1/projects`.

#### [MODIFY] [page.tsx](file:///d:/autotest/frontend/src/app/dashboard/tests/page.tsx)
Update the Tests page to fetch real test cases for the active project.

#### [MODIFY] [page.tsx](file:///d:/autotest/frontend/src/app/dashboard/bugs/page.tsx)
Update the Bugs page to fetch real bugs for the active project, and wire up the "Auto-Repair" button to trigger a patch generation call.

#### [MODIFY] [page.tsx](file:///d:/autotest/frontend/src/app/dashboard/patches/page.tsx)
Update the Patches page to fetch real patches, and wire up the Accept/Reject buttons.

#### [MODIFY] [page.tsx](file:///d:/autotest/frontend/src/app/dashboard/knowledge/page.tsx)
Update the Cypher console in the Knowledge Graph page to send queries to `/api/v1/graph/query` and print the real results.

---

## Verification Plan

### Automated Tests
- Run database seeding: `backend\.venv\Scripts\python.exe scripts/seed.py`
- Run pytest integration tests to verify routes: `pytest backend/tests/test_integration.py`

### Manual Verification
- Start the backend server.
- Start the frontend server.
- Open the browser to the dashboard and navigate through pages (Projects, Tests, Bugs, Patches, Knowledge Graph) to verify they load and interact using live MongoDB data.
