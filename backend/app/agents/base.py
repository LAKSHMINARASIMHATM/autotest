"""Base agent node — abstract class that all 13 agents extend.

Provides:
- Uniform error handling with fallback state updates
- XAI explanation generation
- Audit trail logging
- LLM invocation helper with retry
- JSON extraction helper that strips markdown fences
"""

from __future__ import annotations

import abc
import re
from datetime import UTC, datetime
from typing import Any

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig

from app.agents.state import AgentAction, AgentState, Explanation
from app.core.logging import get_logger

logger = get_logger(__name__)


class BaseAgentNode(abc.ABC):
    """Abstract base for all LangGraph agent nodes.

    Subclasses implement `execute()` with their domain logic.
    The `__call__` method wraps execution with error handling,
    audit logging, and XAI explanation capture.

    Usage in LangGraph:
        planner = PlannerAgent(llm=chat_model)
        graph.add_node("planner", planner)
    """

    name: str = "base_agent"
    description: str = ""

    def __init__(self, llm: BaseChatModel | None = None) -> None:
        self.llm = llm

    async def __call__(
        self,
        state: AgentState,
        config: RunnableConfig | None = None,
    ) -> dict[str, Any]:
        """Entry point called by LangGraph. Wraps execute() with error handling."""
        logger.info(
            "agent_started",
            agent=self.name,
            session_id=state.get("session_id", ""),
        )

        try:
            result = await self.execute(state, config)

            # Add audit trace
            trace = AgentAction(
                agent=self.name,
                action=f"{self.name}_completed",
                detail=f"{self.name} finished successfully",
                timestamp=datetime.now(UTC).isoformat(),
                status="success",
            )
            result.setdefault("agent_trace", []).append(trace)

            logger.info("agent_completed", agent=self.name)
            return result

        except Exception as e:
            logger.exception("agent_error", agent=self.name, error=str(e))

            trace = AgentAction(
                agent=self.name,
                action=f"{self.name}_error",
                detail=str(e),
                timestamp=datetime.now(UTC).isoformat(),
                status="error",
            )

            return {
                "agent_trace": [trace],
                "error": f"{self.name} failed: {e}",
            }

    @abc.abstractmethod
    async def execute(
        self,
        state: AgentState,
        config: RunnableConfig | None = None,
    ) -> dict[str, Any]:
        """Implement domain-specific agent logic.

        Args:
            state: Current pipeline state.
            config: LangGraph runtime config.

        Returns:
            Dict of state updates to merge into AgentState.
        """
        ...

    def build_explanation(
        self,
        decision: str,
        reason: str,
        confidence: float,
        retrieved_context: list[str] | None = None,
        kg_nodes: list[str] | None = None,
        evidence: list[str] | None = None,
        alternatives: list[str] | None = None,
    ) -> Explanation:
        """Construct a standardized XAI explanation."""
        return Explanation(
            agent=self.name,
            decision=decision,
            reason=reason,
            confidence=confidence,
            retrieved_context=retrieved_context or [],
            knowledge_graph_nodes=kg_nodes or [],
            supporting_evidence=evidence or [],
            alternatives_considered=alternatives or [],
        )

    async def invoke_llm(
        self,
        system_prompt: str,
        user_prompt: str,
        **kwargs: Any,
    ) -> str:
        """Helper to invoke the LLM with system + user messages.

        Args:
            system_prompt: System instruction.
            user_prompt: User/task prompt.
            **kwargs: Additional args passed to llm.ainvoke().

        Returns:
            LLM response content as string.

        Raises:
            RuntimeError: If no LLM is configured.
        """
        if self.llm is None:
            raise RuntimeError(f"{self.name}: No LLM configured")

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]
        response = await self.llm.ainvoke(messages, **kwargs)
        if hasattr(response, "content"):
            content = response.content
            if isinstance(content, list):
                return "".join(str(part) for part in content)
            return content
        return str(response)

    @staticmethod
    def extract_json(text: str) -> str:
        """Strip markdown code fences and return raw JSON text, finding valid JSON even with surrounding text.

        LLMs often wrap JSON in ```json ... ``` blocks or write text before/after JSON.
        This finds the first valid JSON object/array and returns that.
        """
        text = text.strip()
        # First try to find a ```json ... ``` block
        match = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", text)
        candidate = match.group(1).strip() if match else text

        # Try to find first '{' or '['
        start = -1
        for i, c in enumerate(candidate):
            if c in ('{', '['):
                start = i
                break

        if start == -1:
            return candidate

        # Find matching closing bracket using stack to handle nested structures
        stack = []
        end = -1
        open_brace = candidate[start]
        close_brace = '}' if open_brace == '{' else ']'

        for i in range(start, len(candidate)):
            c = candidate[i]
            if c == open_brace:
                stack.append(c)
            elif c == close_brace:
                stack.pop()
                if not stack:
                    end = i + 1
                    break

        if end != -1:
            return candidate[start:end].strip()

        return candidate
