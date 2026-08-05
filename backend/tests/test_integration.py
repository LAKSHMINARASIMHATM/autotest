"""Backend integration test — smoke tests for all registered API routes."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

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
    """Metrics endpoint returns metrics dictionary gracefully when DB is unavailable."""
    import app.evaluation.metrics_service as ms

    result = await ms.MetricsService.get_dashboard_metrics("test-project")
    assert "total_test_cases" in result
    assert "total_bugs" in result
    assert "patch_success_rate" in result



@pytest.mark.asyncio
async def test_new_auth_api_key_endpoints_registered(client: AsyncClient) -> None:
    """New /auth/api-keys and /auth/audit-log routes should be registered (not 404)."""
    # Unauthenticated → 401, not 404 or 405
    resp = await client.get("/api/v1/auth/api-keys")
    assert resp.status_code == 401

    resp = await client.get("/api/v1/auth/audit-log")
    assert resp.status_code == 401

    resp = await client.post("/api/v1/auth/api-keys", json={"name": "test"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_monitoring_health_registered(client: AsyncClient) -> None:
    """GET /monitoring/health should be registered (not 404)."""
    resp = await client.get("/api/v1/monitoring/health")
    assert resp.status_code == 401  # protected; not 404


@pytest.mark.asyncio
async def test_agents_sessions_registered(client: AsyncClient) -> None:
    """GET /agents/sessions should be registered and protected."""
    resp = await client.get("/api/v1/agents/sessions")
    assert resp.status_code == 401
