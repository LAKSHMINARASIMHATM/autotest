"""LLM Factory — selects the best available LLM provider in priority order.

Priority:
1. Groq (fast free inference, llama-3.3-70b-versatile)
2. HuggingFace Inference API (free, Mistral-7B or configurable)
3. OpenAI (paid fallback)

Usage:
    llm = get_best_llm()
"""
from __future__ import annotations

from langchain_core.language_models import BaseChatModel

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def get_best_llm() -> BaseChatModel:
    """Return the best available LLM based on configured API keys."""
    settings = get_settings()

    # 1. Groq — fastest, most reliable free option
    groq_key = settings.GROQ_API_KEY.get_secret_value() if settings.GROQ_API_KEY else ""
    if groq_key and not groq_key.startswith("gsk_Kk"):
        try:
            from langchain_groq import ChatGroq
            logger.info("llm_selected", provider="groq", model=settings.DEFAULT_LLM_MODEL)
            return ChatGroq(
                model=settings.DEFAULT_LLM_MODEL,
                temperature=settings.DEFAULT_TEMPERATURE,
                api_key=settings.GROQ_API_KEY,
            )
        except Exception as e:
            logger.warning("groq_llm_failed", error=str(e))

    # 2. Groq with any valid key
    if groq_key:
        try:
            from langchain_groq import ChatGroq
            logger.info("llm_selected", provider="groq_fallback", model=settings.DEFAULT_LLM_MODEL)
            return ChatGroq(
                model=settings.DEFAULT_LLM_MODEL,
                temperature=settings.DEFAULT_TEMPERATURE,
                api_key=settings.GROQ_API_KEY,
            )
        except Exception as e:
            logger.warning("groq_fallback_failed", error=str(e))

    # 3. HuggingFace Inference API
    hf_token = settings.HUGGINGFACE_API_TOKEN.get_secret_value() if settings.HUGGINGFACE_API_TOKEN else ""
    if hf_token and not hf_token.startswith("hf_xxx"):
        try:
            from langchain_huggingface import HuggingFaceEndpoint
            from langchain_huggingface import ChatHuggingFace
            hf_model = settings.HF_MODEL or "mistralai/Mistral-7B-Instruct-v0.3"
            logger.info("llm_selected", provider="huggingface", model=hf_model)
            endpoint = HuggingFaceEndpoint(
                repo_id=hf_model,
                huggingfacehub_api_token=hf_token,
                temperature=settings.DEFAULT_TEMPERATURE,
                max_new_tokens=2048,
                task="text-generation",
            )
            return ChatHuggingFace(llm=endpoint)
        except Exception as e:
            logger.warning("huggingface_llm_failed", error=str(e))

    # 4. OpenAI
    openai_key = settings.OPENAI_API_KEY.get_secret_value() if settings.OPENAI_API_KEY else ""
    if openai_key and not openai_key.startswith("sk-..."):
        try:
            from langchain_openai import ChatOpenAI
            logger.info("llm_selected", provider="openai", model="gpt-4o-mini")
            return ChatOpenAI(model="gpt-4o-mini", temperature=0, api_key=settings.OPENAI_API_KEY)
        except Exception as e:
            logger.warning("openai_llm_failed", error=str(e))

    # 5. Last resort — Groq with whatever key we have
    from langchain_groq import ChatGroq
    logger.warning("llm_selected", provider="groq_last_resort")
    return ChatGroq(
        model=settings.DEFAULT_LLM_MODEL,
        temperature=settings.DEFAULT_TEMPERATURE,
        api_key=settings.GROQ_API_KEY,
    )
