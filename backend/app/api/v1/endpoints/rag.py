"""RAG API endpoints — index files, query the retriever, and return semantic context."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.api.deps import get_current_user_id
from app.services.rag_service import RAGService

router = APIRouter(prefix="/rag", tags=["rag"])


class IndexDocumentRequest(BaseModel):
    project_id: str = Field(..., description="ID of the project")
    file_path: str = Field(..., description="Relative file path")
    content: str = Field(..., description="Source code or document content")


class IndexDocumentResponse(BaseModel):
    message: str = Field(..., description="Ingestion status message")


class QueryRAGResponse(BaseModel):
    content: str = Field(..., description="Retrieved source chunk")
    score: float = Field(..., description="Semantic matching score")
    metadata: dict[str, Any] = Field(..., description="Document metadata")


@router.post(
    "/index",
    response_model=IndexDocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def index_document(
    payload: IndexDocumentRequest,
    _user_id: str = Depends(get_current_user_id),
) -> Any:
    """Index source files or documentation chunks into the remote vector store."""
    try:
        await RAGService.index_document(
            project_id=payload.project_id,
            file_path=payload.file_path,
            content=payload.content,
        )
        return IndexDocumentResponse(message=f"Successfully indexed {payload.file_path}")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Indexing failed: {e}",
        )


@router.get(
    "/query",
    response_model=list[QueryRAGResponse],
)
async def query_rag_pipeline(
    project_id: str = Query(..., description="ID of the project"),
    query: str = Query(..., description="Retrieval query string"),
    limit: int = Query(5, ge=1, le=20, description="Max documents to return"),
    _user_id: str = Depends(get_current_user_id),
) -> Any:
    """Retrieve semantically relevant code context for a query."""
    try:
        return await RAGService.retrieve_context(
            project_id=project_id,
            query=query,
            limit=limit,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Retrieval failed: {e}",
        )
