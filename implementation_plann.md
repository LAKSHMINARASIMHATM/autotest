# Plan: Replacing Mock Data with Real Database Data

This plan outlines the steps to replace hardcoded mock data in both the frontend and backend with real, accurate data fetched from MongoDB and a live Neo4j database, integrating Firebase Authentication.

## User Review Required

> [!IMPORTANT]
> ### 1. Neo4j Online (Neo4j Aura Cloud DB)
> To run Neo4j and Cypher online, you can use **Neo4j AuraDB** (the free cloud database service by Neo4j, similar to MongoDB Atlas):
> 1. Sign up/Log in at [Neo4j Aura Console](https://console.neo4j.io/).
> 2. Click **Create Database** and select the **AuraDB Free** instance.
> 3. Download the credentials file (`credentials.txt`) which contains:
>    - Connection URL: `neo4j+s://xxxxxxxx.databases.neo4j.io`
>    - Username: `neo4j`
>    - Password: `your-generated-password`
> 4. Add these credentials to your root `.env` and `backend/.env` files:
>    ```env
>    NEO4J_URI=neo4j+s://xxxxxxxx.databases.neo4j.io
>    NEO4J_USER=neo4j
>    NEO4J_PASSWORD=your-generated-password
>    ```
> Once added, the backend will connect to your live cloud Neo4j instance online. We will write a seeding script that populates this online database with actual nodes and relationships.
>
> ### 2. Firebase Authentication Integration
> Since you specified **"use firebase"** for authentication, we will implement Firebase Auth:
> - **Frontend**: Install `firebase` client SDK and set up an auto-login / sign-in widget or helper that retrieves the Firebase ID Token.
> - **Backend**: Install `firebase-admin` and verify the incoming `Authorization: Bearer <token>` token in `backend/app/core/security.py`.
> - **MongoDB Sync**: When a user signs in via Firebase, we retrieve their details (UID, email, name) and create/sync a corresponding `User` document in MongoDB.

## Proposed Changes

---

### [Component: Backend Core & Seeding]

#### [NEW] [seed.py](file:///d:/autotest/scripts/seed.py)
Create a seeding script inside the `scripts` folder to populate MongoDB Atlas and Neo4j Aura with:
- A default developer user matching the Firebase credentials.
- A default project (`AutoTestAI`).
- 9 historical test runs to show the coverage trend, bug counts, and passed test rates.
- Generated test cases.
- Localized bug reports (timing attacks and JWT token expiration).
- Candidate and accepted patches with their validations.
- **Neo4j Nodes**: Create Module, Function, API, and TestCase nodes with direct relationships (`:DEPENDS_ON`, `:TESTS`, `:EXPOSES_API`).

#### [MODIFY] [security.py](file:///d:/autotest/backend/app/core/security.py)
Configure Firebase Admin SDK. Update `get_current_user_payload` to verify Firebase ID tokens using `firebase_admin.auth.verify_id_token` instead of the local custom JWT implementation.

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
Add the `POST /query` endpoint to execute Cypher queries on the online Neo4j Aura instance.

---

### [Component: Frontend Client & Pages]

#### [NEW] [api.ts](file:///d:/autotest/frontend/src/lib/api.ts)
Create a central API client helper using standard `fetch` to handle backend communication, including sending the Firebase ID Token in the Authorization headers.

#### [NEW] [firebase.ts](file:///d:/autotest/frontend/src/lib/firebase.ts)
Initialize Firebase client SDK.

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
- Open the browser to the dashboard and navigate through pages (Projects, Tests, Bugs, Patches, Knowledge Graph) to verify they load and interact using live MongoDB and Neo4j Aura data.
