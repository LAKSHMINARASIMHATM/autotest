# Phase 7: Software Testing Pipeline & Implementation Details

---

## 1. End-to-End Testing & Repair Pipeline Implementation

AutoTestAI unifies software test engineering and automated program repair into an integrated 10-stage pipeline.

```
[1. Test Planning] ----> [2. Test Generation] ----> [3. Verification]
                                                             |
[6. Bug Localiz.] <---- [5. Coverage Analysis] <---- [4. Execution]
       |
       v
[7. Root Cause]   ----> [8. Program Repair]    ----> [9. Patch Valid.]
                                                             |
                                                             v
                                                    [10. Regression]
```

---

### 1.1 Detailed Pipeline Stages

#### Stage 1: Test Planning
- **Implementation**: `backend/app/agents/test_planner.py`
- **Logic**: Ingests AST nodes and docstrings; formulates a JSON specification of input invariants, edge conditions, zero-values, and exception handling paths.

#### Stage 2: Test Generation
- **Implementation**: `backend/app/agents/unit_test_generator.py`
- **Logic**: Employs LLM code generation conditioned on PyTest syntax rules, enforcing strict import statements, target function calls, and explicit `assert` statements.

#### Stage 3: Test Verification
- **Implementation**: `backend/app/agents/verification_agent.py`
- **Logic**: Performs static AST parsing on generated test files using Python `ast.parse()`. Checks symbol resolution and flags undefined variable references.

#### Stage 4: Multi-Framework Test Execution
- **Implementation**: `backend/app/execution/runners/` (`pytest_runner.py`, `jest_runner.py`, `newman_runner.py`, `playwright_runner.py`)
- **Logic**: Dispatches test suites to isolated sandbox runners matching target language/framework (PyTest for Python, Jest for JavaScript/TypeScript, Newman for REST API Collections, Playwright for E2E Web UI). Enforces a hard $30\text{-second}$ timeout limit.

#### Stage 5: Coverage Analysis
- **Implementation**: `backend/app/execution/coverage_analyzer.py`
- **Logic**: Integrates `Coverage.py` API to compute line, statement, and branch coverage metrics. Maps un-covered line numbers back to source AST nodes.

#### Stage 6: Bug Localization
- **Implementation**: `backend/app/agents/bug_localization_agent.py`
- **Logic**: Parses PyTest execution tracebacks and applies Spectrum-Based Bug Localization (SBFL) using the Ochiai metric formula:
  $$S(e) = \frac{N_{cf}}{\sqrt{(N_{cf} + N_{uf}) \times (N_{cf} + N_{cp})}}$$

#### Stage 7: Root Cause Analysis (RCA)
- **Implementation**: `backend/app/agents/root_cause_analyst.py`
- **Logic**: Synthesizes SBFL suspect line numbers, execution stack traces, and local source snippets to produce a human-readable explanation of the defect.

#### Stage 8: Program Repair (APR)
- **Implementation**: `backend/app/agents/program_repair_agent.py`
- **Logic**: Generates a unified Git diff patch (`--- a/file.py \n +++ b/file.py`) targeting localized fault lines while preserving surrounding function logic.

#### Stage 9: Patch Validation
- **Implementation**: `backend/app/execution/patch_validator.py`
- **Logic**: Applies candidate patch diff to a temporary file copy and re-runs the previously failing PyTest test case.

#### Stage 10: Regression Testing
- **Implementation**: `backend/app/execution/regression_runner.py`
- **Logic**: Executes the entire project test suite against the patched source code to ensure $100\%$ zero regression rate.

---

## 2. System Directory & File Structure

```
autotest/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── auth.py
│   │   │   │   ├── projects.py
│   │   │   │   ├── agents.py
│   │   │   │   ├── testing.py
│   │   │   │   ├── repair.py
│   │   │   │   └── analytics.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   └── security.py
│   │   ├── agents/
│   │   │   ├── base_agent.py
│   │   │   ├── orchestrator.py
│   │   │   ├── project_analyzer.py
│   │   │   ├── test_planner.py
│   │   │   ├── unit_test_generator.py
│   │   │   ├── verification_agent.py
│   │   │   ├── bug_localization_agent.py
│   │   │   ├── program_repair_agent.py
│   │   │   └── explainability_agent.py
│   │   ├── execution/
│   │   │   ├── sandbox.py
│   │   │   ├── pytest_runner.py
│   │   │   ├── coverage_analyzer.py
│   │   │   └── patch_validator.py
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── project.py
│   │   │   ├── test_case.py
│   │   │   └── repair_job.py
│   │   └── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── projects/
│   │   │   ├── test-gen/
│   │   │   ├── hitl-review/
│   │   │   └── xai-visualizer/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── AgentStateGraph.tsx
│   │   │   ├── CoverageHeatmap.tsx
│   │   │   └── PatchDiffViewer.tsx
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   └── types.ts
│   └── package.json
└── docker-compose.yml
```

---

## 3. Coding Standards & Architectural Conventions

1. **Python / Backend Standards**:
   - PEP 8 styling enforced via `ruff` and `black`.
   - Strict static type hinting (`typing.Annotated`, `pydantic.BaseModel`).
   - Async-first I/O handling (`async def` endpoints, `motor` async MongoDB client).
2. **TypeScript / Frontend Standards**:
   - React 18 functional components with strict TypeScript types (`strict: true`).
   - Tailwind CSS utility styling with modular UI component design.
   - State management via React Context & Zustand.
3. **Database Integration**:
   - MongoDB documents modeled using Pydantic schemas.
   - All mutations execute with audit timestamping (`created_at`, `updated_at`).
