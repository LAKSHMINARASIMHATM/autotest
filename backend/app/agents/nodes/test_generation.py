"""Test Generation Agent — generates test code (PyTest, JUnit, Playwright, Postman)."""

from __future__ import annotations

import json
from typing import Any

from langchain_core.runnables import RunnableConfig

from app.agents.base import BaseAgentNode
from app.agents.state import AgentState, GeneratedTest, PipelineStatus
from app.core.logging import get_logger

logger = get_logger(__name__)


class TestGenerationAgent(BaseAgentNode):
    name = "test_generation"
    description = "Generates high-coverage, readable, maintainable test code"

    SYSTEM_PROMPT = """You are the Test Generation Agent of AutoTestAI.

Generate production-quality test cases based on the test strategy, requirements, and retrieved context.

## Critical Rules
- **YOU MUST RESPOND ONLY WITH A JSON ARRAY, NO OTHER TEXT BEFORE OR AFTER**
- Do not include any explanations or introductions
- Always wrap the JSON in ```json ... ``` if you want, but JSON must be valid

For each test, provide:
1. name: descriptive test function name (snake_case, starts with 'test_')
2. test_type: unit, api, integration, security, etc.
3. framework: pytest, junit, playwright, postman
4. code: complete, runnable test source code (with proper escaping for newlines)
5. target_entity: the function/class/endpoint being tested
6. requirement_id: linked requirement (if any, can be empty string)
7. description: what this test validates
8. confidence: how confident you are in correctness (0.0-1.0)

Example JSON output:
```json
[
    {
        "name": "test_add_numbers_correct",
        "test_type": "unit",
        "framework": "pytest",
        "code": "def test_add_numbers_correct():\n    assert add_numbers(5, 3) == 8",
        "target_entity": "add_numbers",
        "requirement_id": "",
        "description": "Verifies add_numbers correctly adds two positive integers",
        "confidence": 0.95
    },
    {
        "name": "test_add_numbers_negative",
        "test_type": "unit",
        "framework": "pytest",
        "code": "def test_add_numbers_negative():\n    assert add_numbers(-1, -2) == -3",
        "target_entity": "add_numbers",
        "requirement_id": "",
        "description": "Verifies add_numbers correctly adds two negative integers",
        "confidence": 0.9
    }
]
```"""

    async def execute(
        self,
        state: AgentState,
        config: RunnableConfig | None = None,
    ) -> dict[str, Any]:
        strategy = state.get("test_strategy")
        requirements = state.get("requirements", [])
        architecture = state.get("architecture")
        retrieved = state.get("retrieved_context", [])

        # Build context from repo_summary files
        repo_summary = state.get("repo_summary") or {}
        file_context = ""
        if repo_summary.get("files"):
            file_context = "\n\n".join(
                f"## File: {f.get('path')}\n```python\n{f.get('content', '')}\n```"
                for f in repo_summary.get("files", [])[:5]
            )

        context_text = "\n".join(doc.content for doc in retrieved[:10]) if retrieved else ""
        req_text = "\n".join(f"- {r.id}: {r.title}" for r in requirements[:20])
        api_text = "\n".join(
            f"- {ep.get('method', 'GET')} {ep.get('path', '/')}"
            for ep in (architecture.api_endpoints if architecture else [])[:10]
        )

        user_prompt = f"""Generate test cases for this project.

Project Language: {state.get('language', 'python')}
Project Framework: {state.get('framework', '')}

Test Strategy:
- Types: {', '.join(strategy.test_types) if strategy else 'unit'}
- Estimated: {strategy.estimated_count if strategy else 5} tests
- Risk areas: {', '.join(strategy.risk_areas) if strategy else 'none'}

Requirements:
{req_text or 'None extracted'}

API Endpoints:
{api_text or 'None found'}

Source Code Files:
{file_context}

Generate 3-5 comprehensive test cases as a valid JSON array! Remember, no extra text!"""

        response = await self.invoke_llm(self.SYSTEM_PROMPT, user_prompt)

        try:
            data = json.loads(self.extract_json(response))
            if not isinstance(data, list):
                data = [data]
        except json.JSONDecodeError:
            logger.warning("test_gen_json_parse_failed", raw=response[:200])
            data = []

        tests = [
            GeneratedTest.from_llm(t, i)
            for i, t in enumerate(data)
            if isinstance(t, dict)
        ]

        explanation = self.build_explanation(
            decision=f"Generated {len(tests)} test cases",
            reason=f"Created tests covering {', '.join(set(t.test_type for t in tests))} types",
            confidence=0.85,
            evidence=[f"{len(tests)} tests across {len(set(t.framework for t in tests))} frameworks"],
        )

        return {
            "generated_tests": tests,
            "status": PipelineStatus.GENERATING,
            "explanations": [explanation],
        }
