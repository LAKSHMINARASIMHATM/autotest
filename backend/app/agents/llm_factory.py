"""LLM Factory — Groq is first choice, with HuggingFace Inference API as fallback.

Priority chain (per request):
1. Groq primary model (openai/gpt-oss-20b) × all valid keys
2. Groq fallback model (qwen/qwen3.8-27b) × all valid keys  [rate-limit guard]
3. HuggingFace Inference API
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
    """Return a Groq ChatModel with key rotation and model fallback chain.

    Fallback order:
      primary_model × key_1 → primary_model × key_2 → ...
      → fallback_model × key_1 → fallback_model × key_2 → ...
      → HuggingFace
    """
    settings = get_settings()

    raw_keys = [
        settings.GROQ_API_KEY_1.get_secret_value() if settings.GROQ_API_KEY_1 else "",
        settings.GROQ_API_KEY_2.get_secret_value() if settings.GROQ_API_KEY_2 else "",
        settings.GROQ_API_KEY_3.get_secret_value() if settings.GROQ_API_KEY_3 else "",
        settings.GROQ_API_KEY_4.get_secret_value() if settings.GROQ_API_KEY_4 else "",
        settings.GROQ_API_KEY_5.get_secret_value() if settings.GROQ_API_KEY_5 else "",
        settings.GROQ_API_KEY.get_secret_value() if settings.GROQ_API_KEY else "",
    ]

    # Filter out empty or placeholder keys, preserving order, deduplicate
    valid_keys = []
    for k in raw_keys:
        if k and not k.startswith("gsk_placeholder") and k not in valid_keys:
            valid_keys.append(k)

    if not valid_keys:
        logger.warning("no_valid_groq_keys_found_falling_back_to_hf")
        return get_huggingface_llm()

    try:
        from langchain_groq import ChatGroq

        primary_model = settings.DEFAULT_LLM_MODEL
        fallback_model = getattr(settings, "DEFAULT_FALLBACK_MODEL", "qwen/qwen3.8-27b")
        max_tokens = getattr(settings, "DEFAULT_MAX_TOKENS", 4096)

        logger.info(
            "llm_selected",
            provider="groq_rotating",
            keys_count=len(valid_keys),
            primary_model=primary_model,
            fallback_model=fallback_model,
            max_tokens=max_tokens,
        )

        def make_groq(model: str, key: str) -> ChatGroq:
            return ChatGroq(
                model=model,
                temperature=settings.DEFAULT_TEMPERATURE,
                max_tokens=max_tokens,
                api_key=key,
            )

        # Build full fallback chain: primary×keys → fallback_model×keys → HF
        primary_instances = [make_groq(primary_model, k) for k in valid_keys]
        fallback_instances = (
            [make_groq(fallback_model, k) for k in valid_keys]
            if fallback_model != primary_model
            else []
        )

        # HuggingFace as last resort
        try:
            hf_fallback = [get_huggingface_llm()]
        except Exception:
            hf_fallback = []

        all_fallbacks = primary_instances[1:] + fallback_instances + hf_fallback

        if not all_fallbacks:
            return primary_instances[0]
        return primary_instances[0].with_fallbacks(all_fallbacks)

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
