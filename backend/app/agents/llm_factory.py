"""LLM Factory — Groq is first choice, with HuggingFace Inference API as fallback.

Priority:
1. Groq (llama-3.3-70b-versatile)
2. HuggingFace Inference API (Mistral-7B)
"""
from __future__ import annotations

from langchain_core.language_models import BaseChatModel

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def get_huggingface_llm() -> BaseChatModel:
    """Return a HuggingFace ChatModel (raises if token is missing/invalid)."""
    settings = get_settings()
    hf_token = settings.HUGGINGFACE_API_TOKEN.get_secret_value() if settings.HUGGINGFACE_API_TOKEN else ""
    if not hf_token or hf_token.startswith("hf_xxx") or hf_token == "":
        raise RuntimeError("HUGGINGFACE_API_TOKEN is not set")

    from langchain_huggingface import ChatHuggingFace, HuggingFaceEndpoint
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


def get_groq_llm() -> BaseChatModel:
    """Return a Groq ChatModel with automatic rate-limit key rotation (GROQ_API_KEY_1 to 5)."""
    settings = get_settings()

    raw_keys = [
        settings.GROQ_API_KEY_1.get_secret_value() if settings.GROQ_API_KEY_1 else "",
        settings.GROQ_API_KEY_2.get_secret_value() if settings.GROQ_API_KEY_2 else "",
        settings.GROQ_API_KEY_3.get_secret_value() if settings.GROQ_API_KEY_3 else "",
        settings.GROQ_API_KEY_4.get_secret_value() if settings.GROQ_API_KEY_4 else "",
        settings.GROQ_API_KEY_5.get_secret_value() if settings.GROQ_API_KEY_5 else "",
        settings.GROQ_API_KEY.get_secret_value() if settings.GROQ_API_KEY else "",
    ]

    # Filter out empty or placeholder keys, preserving order
    valid_keys = []
    for k in raw_keys:
        if k and not k.startswith("gsk_placeholder") and k not in valid_keys:
            valid_keys.append(k)

    if not valid_keys:
        logger.warning("no_valid_groq_keys_found_falling_back_to_hf")
        return get_huggingface_llm()

    try:
        from langchain_groq import ChatGroq
        logger.info("llm_selected", provider="groq_rotating", keys_count=len(valid_keys), model=settings.DEFAULT_LLM_MODEL)

        models = [
            ChatGroq(
                model=settings.DEFAULT_LLM_MODEL,
                temperature=settings.DEFAULT_TEMPERATURE,
                api_key=k,
            )
            for k in valid_keys
        ]

        # Add HuggingFace as final fallback if available
        try:
            hf_model = get_huggingface_llm()
            fallbacks = models[1:] + [hf_model]
        except Exception:
            fallbacks = models[1:]

        if not fallbacks:
            return models[0]
        return models[0].with_fallbacks(fallbacks)

    except Exception as e:
        logger.warning("groq_llm_failed_falling_back_to_hf", error=str(e))
        return get_huggingface_llm()


def get_best_llm() -> BaseChatModel:
    """Return the best available LLM — Groq (with rotation) → HuggingFace."""
    try:
        return get_groq_llm()
    except Exception as groq_err:
        logger.warning("groq_llm_unavailable_trying_hf", error=str(groq_err))
        try:
            return get_huggingface_llm()
        except Exception as hf_err:
            logger.error("all_llm_providers_failed", error=str(hf_err))
            raise hf_err
