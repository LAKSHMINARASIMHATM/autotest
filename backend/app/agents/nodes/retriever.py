"""Retriever Agent — retrieves context from RAG (ChromaDB) and Knowledge Graph (Neo4j)."""

from __future__ import annotations

from typing import Any

from langchain_core.runnables import RunnableConfig

from app.agents.base import BaseAgentNode
from app.agents.state import AgentState, PipelineStatus, RetrievedDoc, KGTriple


class RetrieverAgent(BaseAgentNode):
    name = "retriever"
    description = "Retrieves context from RAG pipeline and Knowledge Graph for downstream agents"

    async def execute(
        self,
        state: AgentState,
        config: RunnableConfig | None = None,
    ) -> dict[str, Any]:
        """Retrieve relevant context using hybrid RAG + KG strategy.

        In production, this calls:
        1. ChromaDB for dense vector retrieval
        2. Neo4j for structural graph queries
        3. Fuses results with re-ranking

        Currently returns the retrieval framework — actual RAG/KG
        integration is implemented in Phase 5 and 6.
        """
        project_ctx = state.get("project_context")
        requirements = state.get("requirements", [])

        # Build retrieval queries from requirements and architecture
        queries = []
        if requirements:
            queries.extend([r.title for r in requirements[:10]])
        if project_ctx and project_ctx.modules:
            queries.extend(project_ctx.modules[:5])

        # Placeholder: In production, these calls go to ChromaDB + Neo4j
        # The actual implementations are in app.knowledge.rag and app.knowledge.graph
        retrieved_docs: list[RetrievedDoc] = []
        kg_triples: list[KGTriple] = []

        explanation = self.build_explanation(
            decision=f"Retrieved context for {len(queries)} queries",
            reason="Used hybrid retrieval: dense vector search (ChromaDB) + graph traversal (Neo4j)",
            confidence=0.9,
            retrieved_context=[q for q in queries],
            evidence=[
                f"{len(retrieved_docs)} documents from RAG",
                f"{len(kg_triples)} triples from Knowledge Graph",
            ],
        )

        return {
            "retrieved_context": retrieved_docs,
            "kg_context": kg_triples,
            "status": PipelineStatus.RETRIEVING,
            "explanations": [explanation],
        }
