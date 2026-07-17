"""V1 API router — aggregates all endpoint routers under /api/v1."""

from fastapi import APIRouter

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.projects import router as projects_router
from app.api.v1.endpoints.agents import router as agents_router
from app.knowledge.graph.endpoints import router as graph_router
from app.knowledge.rag.endpoints import router as rag_router
from app.api.v1.endpoints.execution import router as execution_router
from app.api.v1.endpoints.repair import router as repair_router
from app.api.v1.endpoints.metrics import router as metrics_router

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(auth_router)
api_v1_router.include_router(projects_router)
api_v1_router.include_router(agents_router)
api_v1_router.include_router(graph_router)
api_v1_router.include_router(rag_router)
api_v1_router.include_router(execution_router)
api_v1_router.include_router(repair_router)
api_v1_router.include_router(metrics_router)
