import asyncio
import os
import sys
from datetime import datetime, timedelta, UTC

# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.core.config import get_settings
from app.core.database import init_mongodb
from app.core.security import hash_password, Role
from app.models.user import User
from app.models.project import Project, ProjectStatus
from app.models.test_case import TestCase, TestType, TestFramework
from app.models.test_run import TestRun, TestRunStatus
from app.models.bug_report import BugReport, BugSeverity, BugStatus
from app.models.patch import Patch, PatchStrategy, PatchStatus
from app.models.patch_validation import PatchValidation
from app.knowledge.graph.neo4j_service import Neo4jService
from beanie import PydanticObjectId


async def main():
    await init_mongodb()
    
    print("Seeding Users...")
    email = "admin@autotest.ai"
    user = await User.find_one(User.email == email)
    if not user:
        user = User(
            email=email,
            password_hash=hash_password("adminpassword"),
            full_name="AutoTest Admin",
            role=Role.ADMIN,
            is_active=True
        )
        await user.insert()
        print("Admin user created.")
    else:
        print("Admin user already exists.")
        
    print("Seeding Projects...")
    project = await Project.find_one(Project.name == "AutoTestAI")
    if not project:
        project = Project(
            name="AutoTestAI",
            description="Autonomous Quality Engineering and Self-Healing Platform",
            repo_url="https://github.com/autotest-ai/autotest",
            language="python",
            framework="FastAPI",
            branch="main",
            local_path="d:/autotest",
            owner_id=user.id,
            status=ProjectStatus.COMPLETE,
            total_files=156,
            total_test_cases=247,
            total_bugs_found=23,
            total_patches_applied=19,
            coverage_percentage=87.2
        )
        await project.insert()
        print("Project 'AutoTestAI' created.")
    else:
        # Update metrics to make sure they match
        project.total_files = 156
        project.total_test_cases = 247
        project.total_bugs_found = 23
        project.total_patches_applied = 19
        project.coverage_percentage = 87.2
        await project.save()
        print("Project 'AutoTestAI' updated.")
        
    print("Seeding Test Runs (History)...")
    await TestRun.find(TestRun.project_id == project.id).delete()
    run_history = [
        {"coverage": 42.0, "passed": 120, "failed": 40, "errors": 5, "duration_ms": 145000},
        {"coverage": 55.0, "passed": 140, "failed": 35, "errors": 3, "duration_ms": 138000},
        {"coverage": 61.0, "passed": 160, "failed": 30, "errors": 2, "duration_ms": 132000},
        {"coverage": 68.0, "passed": 180, "failed": 25, "errors": 1, "duration_ms": 129000},
        {"coverage": 72.0, "passed": 195, "failed": 20, "errors": 1, "duration_ms": 124000},
        {"coverage": 78.0, "passed": 210, "failed": 15, "errors": 0, "duration_ms": 120000},
        {"coverage": 82.0, "passed": 222, "failed": 12, "errors": 0, "duration_ms": 118000},
        {"coverage": 85.0, "passed": 235, "failed": 10, "errors": 0, "duration_ms": 115000},
        {"coverage": 87.2, "passed": 240, "failed": 7, "errors": 0, "duration_ms": 112000},
    ]
    
    now = datetime.now(UTC)
    for i, data in enumerate(run_history):
        run = TestRun(
            project_id=project.id,
            triggered_by="agent",
            status=TestRunStatus.PASSED if data["failed"] == 0 else TestRunStatus.FAILED,
            total_tests=data["passed"] + data["failed"] + data["errors"],
            passed=data["passed"],
            failed=data["failed"],
            errors=data["errors"],
            skipped=0,
            duration_ms=data["duration_ms"],
            coverage={"line_coverage_pct": data["coverage"], "branch_coverage_pct": data["coverage"] - 5},
            sandbox_id=f"sandbox-run-{i}",
            logs="All tests executed successfully."
        )
        run.created_at = now - timedelta(days=(8 - i))
        await run.insert()
    print(f"Inserted {len(run_history)} historical test runs.")
    
    print("Seeding Test Cases...")
    await TestCase.find(TestCase.project_id == project.id).delete()
    
    tc1 = TestCase(
        project_id=project.id,
        test_type=TestType.UNIT,
        framework=TestFramework.PYTEST,
        name="test_jwt_login_successful",
        description="Verify user authentication via email and password with JWT token response.",
        code="""def test_jwt_login_successful(client, test_user):
    payload = {"email": test_user.email, "password": "testpassword"}
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer\"""",
        file_path="tests/unit/test_auth.py",
        is_verified=True,
        confidence=0.95,
        explanation={"assertions": 4, "pass_rate": 100.0}
    )
    await tc1.insert()
    
    tc2 = TestCase(
        project_id=project.id,
        test_type=TestType.SECURITY,
        framework=TestFramework.PYTEST,
        name="test_jwt_token_expiration",
        description="Verify expired token throws HTTP 401 Unauthorized status code.",
        code="""def test_jwt_token_expiration(client, expired_token):
    headers = {"Authorization": f"Bearer {expired_token}"}
    response = client.get("/api/v1/projects", headers=headers)
    assert response.status_code == 401
    assert "ExpiredSignatureError" in response.json()["detail"]""",
        file_path="tests/unit/test_auth.py",
        is_verified=True,
        confidence=0.92,
        explanation={"assertions": 2, "pass_rate": 100.0}
    )
    await tc2.insert()
    
    tc3 = TestCase(
        project_id=project.id,
        test_type=TestType.BOUNDARY,
        framework=TestFramework.PYTEST,
        name="test_create_project_invalid_url",
        description="Verify project creation fails when repository URL is malformed.",
        code="""def test_create_project_invalid_url(client, auth_headers):
    invalid_payload = {"name": "Test", "repo_url": "not_a_valid_url"}
    response = client.post("/api/v1/projects", json=invalid_payload, headers=auth_headers)
    assert response.status_code == 422
    assert "repo_url" in response.text""",
        file_path="tests/unit/test_projects.py",
        is_verified=True,
        confidence=0.88,
        explanation={"assertions": 2, "pass_rate": 100.0}
    )
    await tc3.insert()
    print("Inserted test cases.")
    
    print("Seeding Bugs...")
    await BugReport.find(BugReport.project_id == project.id).delete()
    
    bug1 = BugReport(
        project_id=project.id,
        test_result_id=PydanticObjectId(),
        severity=BugSeverity.CRITICAL,
        status=BugStatus.PATCH_GENERATED,
        file_path="app/core/security.py",
        class_name="",
        method_name="verify_password",
        line_number=24,
        confidence=0.94,
        root_cause_summary="Timing attack vulnerability due to standard string comparison instead of constant-time comparison helper.",
        dependency_impact=["app/api/v1/auth.py"],
        requirement_violated="SEC-AUTH-03: Password comparison must prevent timing side-channel attacks.",
        explanation={
            "code_snippet": """def verify_password(plain: str, hashed: str) -> bool:
    # VULNERABLE: Direct string comparison takes variable time
    return plain == hashed""",
            "fix_suggestion": "Use hmac.compare_digest or passlib CryptContext verification to ensure constant-time verification."
        }
    )
    await bug1.insert()
    
    bug2 = BugReport(
        project_id=project.id,
        test_result_id=PydanticObjectId(),
        severity=BugSeverity.HIGH,
        status=BugStatus.DETECTED,
        file_path="app/api/v1/auth.py",
        class_name="",
        method_name="verify_jwt_token",
        line_number=87,
        confidence=0.91,
        root_cause_summary="Uncaught ExpiredSignatureError exceptions return generic 500 status code instead of standard 401 Unauthorized client response.",
        dependency_impact=["app/core/security.py", "app/api/deps.py"],
        requirement_violated="SEC-AUTH-04: Expired credentials must return 401 client response.",
        explanation={
            "code_snippet": """try:
    payload = jwt.decode(token, SECRET, algorithms=[ALG])
except JWTError as e:
    # VULNERABLE: ExpiredSignatureError is caught by JWTError but re-raised or crashes
    raise e""",
            "fix_suggestion": "Explicitly catch jose.exceptions.ExpiredSignatureError and raise HTTPException(401)."
        }
    )
    await bug2.insert()
    print("Inserted localized bugs.")
    
    print("Seeding Patches...")
    await Patch.find(Patch.project_id == project.id).delete()
    await PatchValidation.find_all().delete()
    
    p1 = Patch(
        project_id=project.id,
        bug_report_id=bug1.id,
        strategy=PatchStrategy.SAFE,
        status=PatchStatus.ACCEPTED,
        diff="""--- a/app/core/security.py
+++ b/app/core/security.py
@@ -24,3 +24,5 @@
 def verify_password(plain: str, hashed: str) -> bool:
-    return plain == hashed
+    import hmac
+    return hmac.compare_digest(plain.encode('utf-8'), hashed.encode('utf-8'))""",
        file_path="app/core/security.py",
        description="Replace standard string comparison with hmac.compare_digest to mitigate timing attacks.",
        confidence=0.95
    )
    await p1.insert()
    
    val1 = PatchValidation(
        patch_id=p1.id,
        compilation_success=True,
        failing_test_passes=True,
        regression_passes=True,
        coverage_maintained=True,
        verdict="accepted",
        reason="Patch resolved the timing side-channel vulnerability, passed all unit tests, and maintained 100% test coverage.",
        duration_ms=45000,
        coverage_before=85.3,
        coverage_after=85.3
    )
    await val1.insert()
    
    p2 = Patch(
        project_id=project.id,
        bug_report_id=bug2.id,
        strategy=PatchStrategy.MINIMAL,
        status=PatchStatus.CANDIDATE,
        diff="""--- a/app/api/v1/auth.py
+++ b/app/api/v1/auth.py
@@ -87,4 +87,6 @@
         payload = jwt.decode(token, SECRET, algorithms=[ALG])
+    except jwt.ExpiredSignatureError:
+        raise HTTPException(status_code=401, detail="Token has expired")
     except JWTError as e:
         raise e""",
        file_path="app/api/v1/auth.py",
        description="Catch ExpiredSignatureError explicitly and raise HTTP 401 Unauthorized.",
        confidence=0.88
    )
    await p2.insert()
    
    val2 = PatchValidation(
        patch_id=p2.id,
        compilation_success=True,
        failing_test_passes=True,
        regression_passes=False,
        coverage_maintained=True,
        verdict="pending",
        reason="Failing test passed but 1 regression test failed (ExpiredSignatureError module import missing).",
        duration_ms=42000,
        coverage_before=85.3,
        coverage_after=85.3
    )
    await val2.insert()
    print("Inserted candidate patches and validations.")
    
    print("Connecting to live Neo4j Aura database...")
    try:
        await Neo4jService.init_driver()
        print("Connected! Clearing Neo4j database data...")
        await Neo4jService.execute_query("MATCH (n) DETACH DELETE n")
        
        print("Creating Project node...")
        project_query = """
        CREATE (p:Project {
            id: $project_id,
            name: $name,
            repo_url: $repo_url,
            language: $language,
            framework: $framework
        })
        """
        await Neo4jService.execute_query(project_query, {
            "project_id": str(project.id),
            "name": project.name,
            "repo_url": project.repo_url,
            "language": project.language,
            "framework": project.framework
        })
        
        print("Creating API Endpoint nodes...")
        endpoints = [
            {"method": "POST", "path": "/auth/login"},
            {"method": "POST", "path": "/auth/register"},
            {"method": "GET", "path": "/projects"},
            {"method": "POST", "path": "/projects/{id}/analyze"},
            {"method": "GET", "path": "/projects/{id}/requirements"}
        ]
        
        for ep in endpoints:
            ep_query = """
            MATCH (p:Project {id: $project_id})
            CREATE (e:API {method: $method, path: $path})
            CREATE (p)-[:EXPOSES_API]->(e)
            """
            await Neo4jService.execute_query(ep_query, {
                "project_id": str(project.id),
                "method": ep["method"],
                "path": ep["path"]
            })
            
        print("Creating Function nodes...")
        methods = [
            {"name": "verify_password", "signature": "verify_password(plain, hashed)", "file_path": "app/core/security.py"},
            {"name": "create_access_token", "signature": "create_access_token(subject, role)", "file_path": "app/core/security.py"},
            {"name": "get_project_by_id", "signature": "get_project_by_id(project_id)", "file_path": "app/services/project_service.py"},
            {"name": "run_analysis_pipeline", "signature": "run_analysis_pipeline(project_id)", "file_path": "app/agents/pipeline.py"}
        ]
        
        for m in methods:
            m_query = """
            CREATE (f:Function {name: $name, signature: $signature, file_path: $file_path})
            """
            await Neo4jService.execute_query(m_query, m)
            
        print("Linking Test Cases to Functions...")
        tests = [
            {"id": "tc_001", "name": "test_jwt_login_successful", "target_func": "verify_password"},
            {"id": "tc_002", "name": "test_jwt_token_expiration", "target_func": "create_access_token"},
            {"id": "tc_003", "name": "test_create_project_invalid_url", "target_func": "get_project_by_id"},
            {"id": "tc_004", "name": "test_run_pipeline_success", "target_func": "run_analysis_pipeline"}
        ]
        
        for t in tests:
            t_query = """
            MATCH (f:Function {name: $target_func})
            CREATE (tc:TestCase {id: $id, name: $name})
            CREATE (tc)-[:TESTS]->(f)
            """
            await Neo4jService.execute_query(t_query, t)
            
        print("Linking Bugs to Functions...")
        bugs_neo = [
            {"severity": "critical", "target_func": "verify_password"},
            {"severity": "high", "target_func": "create_access_token"}
        ]
        
        for b in bugs_neo:
            b_query = """
            MATCH (f:Function {name: $target_func})
            CREATE (bug:Bug {severity: $severity})
            CREATE (bug)-[:LOCALIZED_IN]->(f)
            """
            await Neo4jService.execute_query(b_query, b)
            
        print("Neo4j Aura database seeded successfully!")
    except Exception as e:
        print(f"WARNING: Neo4j seeding failed: {e}")
        
    print("\nDatabase seeding completed successfully!")


if __name__ == "__main__":
    asyncio.run(main())
