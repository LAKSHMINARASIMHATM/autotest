"""Agents API endpoints — trigger and monitor the LangGraph pipeline execution."""

from __future__ import annotations

from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from langchain_openai import ChatOpenAI
from langchain_groq import ChatGroq
from pydantic import BaseModel, Field

from app.agents.orchestrator import build_agent_graph
from app.agents.state import PipelineStatus
from app.api.deps import get_current_user_id
from app.core.config import get_settings

router = APIRouter(prefix="/agents", tags=["agents"])


class TriggerPipelineRequest(BaseModel):
    project_id: str = Field(..., description="ID of the project to analyze")
    max_iterations: int = Field(3, description="Maximum iterations for repair loop")


class TriggerPipelineResponse(BaseModel):
    session_id: str = Field(..., description="Unique orchestration session ID")
    status: str = Field(..., description="Initial status of the pipeline")


@router.post(
    "/trigger",
    response_model=TriggerPipelineResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def trigger_agent_pipeline(
    payload: TriggerPipelineRequest,
    user_id: str = Depends(get_current_user_id),
) -> Any:
    """Triggers the 13-agent orchestration pipeline for a project."""
    session_id = str(uuid4())
    settings = get_settings()

    # Dynamic LLM selection based on config keys
    groq_key = settings.GROQ_API_KEY.get_secret_value() if settings.GROQ_API_KEY else ""
    if groq_key:
        llm = ChatGroq(
            model=settings.DEFAULT_LLM_MODEL,
            temperature=settings.DEFAULT_TEMPERATURE,
            api_key=settings.GROQ_API_KEY,
        )
    else:
        llm = ChatOpenAI(
            model="gpt-4o",
            temperature=0,
            api_key=settings.OPENAI_API_KEY,
        )

    # Compile the StateGraph
    graph = build_agent_graph(llm).compile()

    # Initial state
    initial_state = {
        "project_id": payload.project_id,
        "session_id": session_id,
        "iteration": 0,
        "max_iterations": payload.max_iterations,
        "status": PipelineStatus.PLANNING,
        "messages": [],
    }

    try:
        # Run graph execution as background or stream task
        # Currently mocks async start for SaaS endpoints
        await graph.ainvoke(initial_state)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute pipeline: {e}",
        )

    return TriggerPipelineResponse(
        session_id=session_id,
        status="started",
    )
