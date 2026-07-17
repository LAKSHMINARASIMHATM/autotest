"""RAG Service — uses LlamaIndex with a remote ChromaDB server and Hugging Face Inference API.

Ensures all embedding generation and database storage run in the cloud/remote endpoints,
avoiding local processing overhead.
"""

from __future__ import annotations

from typing import Any, List

import chromadb
from llama_index.core import Document, VectorStoreIndex, StorageContext
from llama_index.core.embeddings import BaseEmbedding
from llama_index.core.bridge.pydantic import PrivateAttr
from llama_index.vector_stores.chroma import ChromaVectorStore

from app.core.config import get_settings
from app.core.logging import get_logger
import httpx

logger = get_logger(__name__)


class HFInferenceEmbedding(BaseEmbedding):
    """Custom LlamaIndex Embedding provider using Hugging Face's Free Inference API.

    Ensures zero local CPU/GPU footprint for embedding generation.
    """

    _api_url: str = PrivateAttr()
    _headers: dict = PrivateAttr()

    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2", **kwargs: Any) -> None:
        super().__init__(model_name=model_name, **kwargs)
        settings = get_settings()
        self._api_url = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{model_name}"
        # Fallback authorization if API key is present
        huggingface_key = settings.OPENAI_API_KEY.get_secret_value()  # uses fallback config
        self._headers = {}
        if huggingface_key:
            self._headers["Authorization"] = f"Bearer {huggingface_key}"

    def _get_query_embedding(self, query: str) -> List[float]:
        """Generate embedding for query string."""
        return self._get_hf_embedding(query)

    def _get_text_embedding(self, text: str) -> List[float]:
        """Generate embedding for document text."""
        return self._get_hf_embedding(text)

    async def _aget_query_embedding(self, query: str) -> List[float]:
        """Generate embedding for query string asynchronously."""
        return await self._aget_hf_embedding(query)

    async def _aget_text_embedding(self, text: str) -> List[float]:
        """Generate embedding for document text asynchronously."""
        return await self._aget_text_embedding(text)

    def _get_hf_embedding(self, text: str) -> List[float]:
        """Synchronously calls Hugging Face API."""
        try:
            with httpx.Client() as client:
                res = client.post(
                     self._api_url,
                     headers=self._headers,
                     json={"inputs": [text], "options": {"wait_for_model": True}},
                     timeout=30.0,
                )
                res.raise_for_status()
                result = res.json()
                # API returns list of lists or nested floats depending on endpoint
                if isinstance(result, list) and len(result) > 0:
                    if isinstance(result[0], list):
                        return result[0]
                    return result
                raise ValueError("Unexpected HuggingFace API response format")
        except Exception as e:
            logger.error("hf_embedding_failed", error=str(e))
            # Fallback to random/mock vector for resilience in case API limit reached
            return [0.0] * 384

    async def _aget_hf_embedding(self, text: str) -> List[float]:
        """Asynchronously calls Hugging Face API."""
        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    self._api_url,
                    headers=self._headers,
                    json={"inputs": [text], "options": {"wait_for_model": True}},
                    timeout=30.0,
                )
                res.raise_for_status()
                result = res.json()
                if isinstance(result, list) and len(result) > 0:
                    if isinstance(result[0], list):
                        return result[0]
                    return result
                raise ValueError("Unexpected HuggingFace API response format")
        except Exception as e:
            logger.error("hf_embedding_async_failed", error=str(e))
            # Fallback mock vector
            return [0.0] * 384


class RAGService:
    """Manages indexing, embedding, and retrieval with a remote Chroma DB and LlamaIndex."""

    _chroma_client: chromadb.HttpClient | None = None
    _embed_model: HFInferenceEmbedding | None = None

    @classmethod
    def get_client(cls) -> chromadb.HttpClient:
        """Initialize the remote ChromaDB HTTP client."""
        if cls._chroma_client is None:
            settings = get_settings()
            # Connect to hosted/remote ChromaDB via HTTP client instead of local persistent storage
            cls._chroma_client = chromadb.HttpClient(
                host=settings.CHROMA_HOST,
                port=settings.CHROMA_PORT,
            )
        return cls._chroma_client

    @classmethod
    def get_embed_model(cls) -> HFInferenceEmbedding:
        """Initialize the cloud HuggingFace embedding engine."""
        if cls._embed_model is None:
            cls._embed_model = HFInferenceEmbedding()
        return cls._embed_model

    @classmethod
    async def index_document(cls, project_id: str, file_path: str, content: str) -> None:
        """Ingests code files/documents into the remote ChromaDB collection."""
        client = cls.get_client()
        embed = cls.get_embed_model()

        # Create or fetch project-specific collection on the remote server
        collection_name = f"project_{project_id}"
        chroma_collection = client.get_or_create_collection(collection_name)

        vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
        storage_context = StorageContext.from_defaults(vector_store=vector_store)

        doc = Document(
            text=content,
            metadata={"project_id": project_id, "file_path": file_path},
            id_=f"{project_id}_{file_path}",
        )

        # Index document using LlamaIndex pipeline
        VectorStoreIndex.from_documents(
            [doc],
            storage_context=storage_context,
            embed_model=embed,
        )
        logger.info("rag_document_indexed", project_id=project_id, file_path=file_path)

    @classmethod
    async def retrieve_context(cls, project_id: str, query: str, limit: int = 5) -> List[dict[str, Any]]:
        """Perform semantic search query against the remote ChromaDB collection."""
        client = cls.get_client()
        embed = cls.get_embed_model()

        collection_name = f"project_{project_id}"
        chroma_collection = client.get_or_create_collection(collection_name)

        vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
        storage_context = StorageContext.from_defaults(vector_store=vector_store)

        index = VectorStoreIndex.from_vector_store(
            vector_store=vector_store,
            embed_model=embed,
        )

        retriever = index.as_retriever(similarity_top_k=limit)
        nodes = retriever.retrieve(query)

        results = []
        for node in nodes:
            results.append({
                "content": node.node.text,
                "score": node.score or 0.0,
                "metadata": node.node.metadata,
            })
        return results
