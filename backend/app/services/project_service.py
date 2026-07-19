"""Project service — CRUD operations and project lifecycle management."""

from beanie import PydanticObjectId

from app.core.exceptions import NotFoundError
from app.core.logging import get_logger
from app.models.audit_log import AuditLog
from app.models.project import Project
from app.schemas.project import (
    ProjectCreateRequest,
    ProjectListResponse,
    ProjectResponse,
    ProjectUpdateRequest,
)

logger = get_logger(__name__)


class ProjectService:
    """Service layer for project management.

    Handles CRUD, pagination, and audit logging for projects.
    """

    @staticmethod
    async def create(request: ProjectCreateRequest, owner_id: str) -> ProjectResponse:
        """Create a new project.

        Args:
            request: Project creation payload.
            owner_id: ID of the authenticated user creating the project.

        Returns:
            Created project response.
        """
        project = Project(
            name=request.name,
            description=request.description,
            repo_url=request.repo_url,
            language=request.language,
            framework=request.framework,
            branch=request.branch,
            config=request.config,
            tags=request.tags,
            owner_id=PydanticObjectId(owner_id),
        )
        await project.insert()

        logger.info("project_created", project_id=str(project.id), name=project.name)

        await AuditLog(
            user_id=PydanticObjectId(owner_id),
            action="project.create",
            resource_type="project",
            resource_id=str(project.id),
            details={"name": project.name},
        ).insert()

        return _project_to_response(project)

    @staticmethod
    async def get_by_id(project_id: str) -> ProjectResponse:
        """Get a project by ID.

        Raises:
            NotFoundError: If project does not exist.
        """
        project = await Project.get(PydanticObjectId(project_id))
        if project is None or project.is_deleted:
            raise NotFoundError(detail=f"Project '{project_id}' not found")
        return _project_to_response(project)

    @staticmethod
    async def list_projects(
        owner_id: str,
        page: int = 1,
        page_size: int = 20,
    ) -> ProjectListResponse:
        """List projects owned by the user with pagination.

        Args:
            owner_id: Filter projects by owner.
            page: Page number (1-indexed).
            page_size: Items per page.

        Returns:
            Paginated project list.
        """
        query = Project.find(
            Project.owner_id == PydanticObjectId(owner_id),
            Project.is_deleted == False,  # noqa: E712
        )

        total = await query.count()
        skip = (page - 1) * page_size
        projects = await query.skip(skip).limit(page_size).sort("-created_at").to_list()

        return ProjectListResponse(
            items=[_project_to_response(p) for p in projects],
            total=total,
            page=page,
            page_size=page_size,
        )

    @staticmethod
    async def update(
        project_id: str,
        request: ProjectUpdateRequest,
        user_id: str,
    ) -> ProjectResponse:
        """Update project metadata.

        Only non-None fields in the request are applied.

        Raises:
            NotFoundError: If project does not exist.
        """
        project = await Project.get(PydanticObjectId(project_id))
        if project is None or project.is_deleted:
            raise NotFoundError(detail=f"Project '{project_id}' not found")

        update_data = request.model_dump(exclude_none=True)
        for field, value in update_data.items():
            setattr(project, field, value)

        project.mark_updated()
        await project.save()

        logger.info("project_updated", project_id=project_id, fields=list(update_data.keys()))

        await AuditLog(
            user_id=PydanticObjectId(user_id),
            action="project.update",
            resource_type="project",
            resource_id=project_id,
            details={"updated_fields": list(update_data.keys())},
        ).insert()

        return _project_to_response(project)

    @staticmethod
    async def delete(project_id: str, user_id: str) -> None:
        """Soft-delete a project.

        Raises:
            NotFoundError: If project does not exist.
        """
        project = await Project.get(PydanticObjectId(project_id))
        if project is None or project.is_deleted:
            raise NotFoundError(detail=f"Project '{project_id}' not found")

        project.soft_delete()
        await project.save()

        logger.info("project_deleted", project_id=project_id)

        await AuditLog(
            user_id=PydanticObjectId(user_id),
            action="project.delete",
            resource_type="project",
            resource_id=project_id,
        ).insert()


def _project_to_response(project: Project) -> ProjectResponse:
    """Map a Project document to the API response schema."""
    return ProjectResponse(
        id=str(project.id),
        name=project.name,
        description=project.description,
        repo_url=project.repo_url,
        language=project.language,
        framework=project.framework,
        branch=project.branch,
        status=project.status,
        config=project.config,
        tags=project.tags,
        total_files=project.total_files,
        total_test_cases=project.total_test_cases,
        total_bugs_found=project.total_bugs_found,
        total_patches_applied=project.total_patches_applied,
        coverage_percentage=project.coverage_percentage,
        local_path=project.local_path or "",
        created_at=project.created_at,
        updated_at=project.updated_at,
    )
