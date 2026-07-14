"""Project endpoints — CRUD operations for software projects."""

from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_user_id, get_pagination
from app.core.security import RequireRole, Role
from app.schemas.common import MessageResponse, PaginationParams
from app.schemas.project import (
    ProjectCreateRequest,
    ProjectListResponse,
    ProjectResponse,
    ProjectUpdateRequest,
)
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new project",
    description="Import a software project for autonomous quality engineering.",
    dependencies=[Depends(RequireRole(Role.ADMIN, Role.ENGINEER))],
)
async def create_project(
    request: ProjectCreateRequest,
    user_id: str = Depends(get_current_user_id),
) -> ProjectResponse:
    return await ProjectService.create(request, owner_id=user_id)


@router.get(
    "",
    response_model=ProjectListResponse,
    summary="List projects",
    description="Get paginated list of projects owned by the current user.",
)
async def list_projects(
    user_id: str = Depends(get_current_user_id),
    pagination: PaginationParams = Depends(get_pagination),
) -> ProjectListResponse:
    return await ProjectService.list_projects(
        owner_id=user_id,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Get project details",
    description="Retrieve full details for a specific project.",
)
async def get_project(
    project_id: str,
    _user_id: str = Depends(get_current_user_id),
) -> ProjectResponse:
    return await ProjectService.get_by_id(project_id)


@router.patch(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Update project",
    description="Update project metadata. Only provided fields are changed.",
    dependencies=[Depends(RequireRole(Role.ADMIN, Role.ENGINEER))],
)
async def update_project(
    project_id: str,
    request: ProjectUpdateRequest,
    user_id: str = Depends(get_current_user_id),
) -> ProjectResponse:
    return await ProjectService.update(project_id, request, user_id)


@router.delete(
    "/{project_id}",
    response_model=MessageResponse,
    summary="Delete project",
    description="Soft-delete a project. Data is retained but hidden.",
    dependencies=[Depends(RequireRole(Role.ADMIN))],
)
async def delete_project(
    project_id: str,
    user_id: str = Depends(get_current_user_id),
) -> MessageResponse:
    await ProjectService.delete(project_id, user_id)
    return MessageResponse(message=f"Project '{project_id}' deleted successfully")
