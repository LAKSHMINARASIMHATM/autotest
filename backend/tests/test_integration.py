"""Backend integration test — smoke tests for all registered API routes."""

from __future__ import annotations

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as c:
        yield c


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient) -> None:
    """Health check should return 200."""
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ("ok", "healthy")


@pytest.mark.asyncio
async def test_openapi_schema(client: AsyncClient) -> None:
    """OpenAPI schema should be accessible."""
    resp = await client.get("/openapi.json")
    assert resp.status_code == 200
    schema = resp.json()
    assert "paths" in schema
    assert "/api/v1/auth/login" in schema["paths"]


@pytest.mark.asyncio
async def test_login_missing_credentials(client: AsyncClient) -> None:
    """Login with missing body should return 422."""
    resp = await client.post("/api/v1/auth/login", json={})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_protected_route_no_token(client: AsyncClient) -> None:
    """Accessing protected route without token should return 401."""
    resp = await client.get("/api/v1/projects")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_metrics_demo_mode(client: AsyncClient) -> None:
    """Metrics endpoint returns demo data when DB is unavailable."""
    # This tests graceful fallback — no actual DB connection required
    import app.evaluation.metrics_service as ms

    result = ms.MetricsService._demo_metrics("test-project")
    assert result["total_test_cases"] > 0
    assert result["total_bugs"] > 0
    assert 0 <= result["patch_success_rate"] <= 100


def test_coverage_parser_valid_xml() -> None:
    """CoverageParser should extract line_rate from valid Cobertura XML."""
    from app.execution.coverage_parser import CoverageParser

    xml = """<?xml version="1.0" ?>
    <coverage line-rate="0.85" branch-rate="0.72" version="7.0">
      <packages>
        <package name="app">
          <classes>
            <class filename="app/main.py" line-rate="0.90">
              <lines>
                <line number="1" hits="1"/>
                <line number="2" hits="0"/>
              </lines>
            </class>
          </classes>
        </package>
      </packages>
    </coverage>"""

    result = CoverageParser.parse_xml(xml)
    assert result["line_coverage_pct"] == 85.0
    assert result["branch_coverage_pct"] == 72.0
    assert len(result["files"]) == 1
    assert result["files"][0]["missing_lines"] == [2]


def test_result_parser_junit_xml() -> None:
    """ResultParser should correctly parse JUnit XML."""
    from app.execution.result_parser import ResultParser

    xml = """<?xml version="1.0"?>
    <testsuite tests="5" failures="1" errors="0" time="2.5">
      <testcase classname="tests.test_auth" name="test_login_valid" time="0.5"/>
      <testcase classname="tests.test_auth" name="test_login_invalid" time="0.3">
        <failure message="AssertionError">Expected 401, got 200</failure>
      </testcase>
      <testcase classname="tests.test_auth" name="test_register" time="0.4"/>
      <testcase classname="tests.test_auth" name="test_refresh" time="0.2"/>
      <testcase classname="tests.test_auth" name="test_logout" time="0.1"/>
    </testsuite>"""

    result = ResultParser.from_junit_xml(xml)
    assert result["total"] == 5
    assert result["failed"] == 1
    assert result["passed"] == 4
    assert len(result["failures"]) == 1
    assert "test_login_invalid" in result["failures"][0]["node_id"]


def test_result_parser_merge() -> None:
    """Merging results from multiple runners should aggregate correctly."""
    from app.execution.result_parser import ResultParser

    r1 = {"passed": 10, "failed": 2, "errors": 0, "total": 12, "duration_ms": 500.0, "failures": [], "logs": ""}
    r2 = {"passed": 5, "failed": 1, "errors": 1, "total": 7, "duration_ms": 300.0, "failures": [], "logs": ""}

    merged = ResultParser.merge_results(r1, r2)
    assert merged["passed"] == 15
    assert merged["failed"] == 3
    assert merged["total"] == 19
    assert merged["duration_ms"] == 800.0
