"""LLM Factory — Groq (rotating keys) first, HuggingFace Inference API as fallback.

Priority:
1. RotatingGroqLLM  — cycles through GROQ_API_KEY_1…5 + GROQ_API_KEY on every 429
2. HuggingFace Inference API — last resort

Key design decision: We do NOT use LangChain's with_fallbacks() for key rotation.
with_fallbacks() is passive and requires the exception to fully bubble up before it
acts. The Groq SDK's own retry logic (httpx_retry / groq._base_client) catches 429s
*before* LangChain ever sees them and waits up to 60 s per retry cycle.

Instead, RotatingGroqLLM overrides ainvoke() / invoke() to catch groq.RateLimitError
immediately (max_retries=0 on each ChatGroq) and jump to the next key with zero delay.
"""
from __future__ import annotations

import asyncio
from typing import Any, Sequence

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import BaseMessage
from langchain_core.outputs import ChatResult
from langchain_core.runnables import RunnableConfig

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Active rotating wrapper
# ─────────────────────────────────────────────────────────────────────────────

class RotatingGroqLLM(BaseChatModel):
    """A BaseChatModel that wraps a list of ChatGroq instances and rotates
    through them immediately when a RateLimitError (429) is raised.

    Unlike with_fallbacks(), this wrapper catches the exception at the call
    site before the SDK's internal retry loop can add any sleep delay.
    """

    # Pydantic fields – must be declared for BaseModel compatibility
    clients: list[Any]       # list[ChatGroq]
    hf_fallback: Any | None  # ChatHuggingFace | None

    class Config:
        arbitrary_types_allowed = True

    @property
    def _llm_type(self) -> str:
        return "rotating_groq"

    # ── sync invoke ───────────────────────────────────────────────────────────
    def _generate(
        self,
        messages: Sequence[BaseMessage],
        stop: list[str] | None = None,
        run_manager: Any = None,
        **kwargs: Any,
    ) -> ChatResult:
        """Try each Groq client in order; skip immediately on RateLimitError."""
        last_exc: Exception | None = None
        for idx, client in enumerate(self.clients):
            try:
                return client._generate(messages, stop=stop, run_manager=run_manager, **kwargs)
            except Exception as exc:
                if _is_rate_limit(exc):
                    logger.warning(
                        "groq_rate_limited_rotating_key",
                        key_index=idx,
                        total_keys=len(self.clients),
                    )
                    last_exc = exc
                    continue
                raise  # non-rate-limit errors propagate immediately

        # All Groq keys exhausted — try HuggingFace
        if self.hf_fallback is not None:
            logger.warning("all_groq_keys_exhausted_using_huggingface")
            return self.hf_fallback._generate(messages, stop=stop, run_manager=run_manager, **kwargs)

        raise last_exc or RuntimeError("All LLM providers exhausted")

    # ── async invoke ──────────────────────────────────────────────────────────
    async def _agenerate(
        self,
        messages: Sequence[BaseMessage],
        stop: list[str] | None = None,
        run_manager: Any = None,
        **kwargs: Any,
    ) -> ChatResult:
        """Async version — try each Groq client; skip immediately on RateLimitError."""
        last_exc: Exception | None = None
        for idx, client in enumerate(self.clients):
            try:
                return await client._agenerate(messages, stop=stop, run_manager=run_manager, **kwargs)
            except Exception as exc:
                if _is_rate_limit(exc):
                    logger.warning(
                        "groq_rate_limited_rotating_key",
                        key_index=idx,
                        total_keys=len(self.clients),
                    )
                    last_exc = exc
                    continue
                raise  # non-rate-limit errors propagate immediately

        # All Groq keys exhausted — try HuggingFace
        if self.hf_fallback is not None:
            logger.warning("all_groq_keys_exhausted_using_huggingface")
            return await self.hf_fallback._agenerate(messages, stop=stop, run_manager=run_manager, **kwargs)

        raise last_exc or RuntimeError("All LLM providers exhausted")


def _is_rate_limit(exc: Exception) -> bool:
    """Return True if the exception is a 429 / rate-limit error from Groq or httpx."""
    exc_type = type(exc).__name__
    exc_str = str(exc).lower()
    rate_limit_signals = (
        "ratelimit",
        "rate_limit",
        "429",
        "too many requests",
        "rate limit",
    )
    return (
        exc_type in ("RateLimitError", "APIStatusError")
        or any(s in exc_str for s in rate_limit_signals)
        or any(s in exc_type.lower() for s in rate_limit_signals)
    )


# ─────────────────────────────────────────────────────────────────────────────
# Public factory functions
# ─────────────────────────────────────────────────────────────────────────────

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
    """Return a RotatingGroqLLM that cycles through all valid API keys on 429s.

    - max_retries=0 on each ChatGroq so the SDK never sleeps waiting to retry.
    - RotatingGroqLLM catches RateLimitError and immediately tries the next key.
    - HuggingFace is the final fallback after all keys are exhausted.
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

    # Deduplicate & filter out empty / placeholder keys
    valid_keys: list[str] = []
    for k in raw_keys:
        if k and not k.startswith("gsk_placeholder") and k not in valid_keys:
            valid_keys.append(k)

    if not valid_keys:
        logger.warning("no_valid_groq_keys_found_falling_back_to_hf")
        return get_huggingface_llm()

    from langchain_groq import ChatGroq

    primary_model = settings.DEFAULT_LLM_MODEL
    fallback_models = [
        m for m in ["qwen/qwen3.8-27b", "allam-2-7b"]
        if m != primary_model
    ]
    all_model_names = [primary_model] + fallback_models

    logger.info(
        "llm_selected",
        provider="groq_rotating",
        keys_count=len(valid_keys),
        model=primary_model,
    )

    # Build one ChatGroq per (model × key) combination.
    # max_retries=0 prevents the SDK from sleeping on 429 — rotation is handled
    # by RotatingGroqLLM which moves to the next client immediately.
    clients: list[ChatGroq] = []
    for model_name in all_model_names:
        for key in valid_keys:
            clients.append(
                ChatGroq(
                    model=model_name,
                    temperature=settings.DEFAULT_TEMPERATURE,
                    api_key=key,
                    max_retries=0,
                )
            )

    # HuggingFace as last-resort fallback
    hf_fallback = None
    try:
        hf_fallback = get_huggingface_llm()
    except Exception:
        logger.warning("huggingface_fallback_unavailable")

    return RotatingGroqLLM(clients=clients, hf_fallback=hf_fallback)


def get_best_llm() -> BaseChatModel:
    """Return the best available LLM — RotatingGroqLLM → HuggingFace."""
    try:
        return get_groq_llm()
    except Exception as groq_err:
        logger.warning("groq_llm_unavailable_trying_hf", error=str(groq_err))
        try:
            return get_huggingface_llm()
        except Exception as hf_err:
            logger.error("all_llm_providers_failed", error=str(hf_err))
            raise hf_err
