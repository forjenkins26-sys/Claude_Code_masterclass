"""Milestone 8 — provider-independent judge interface.

M7.1 hardened the transport but hardcoded Gemini: its URL, its auth header, its
response shape. Swapping judges meant editing code, and the fallback the
milestone needs was impossible.

This makes the provider a configuration value. A provider is four things:

    how to build the request URL
    how to authenticate
    how to shape the payload
    how to pull the text out of the response

Everything else — retries, backoff, quota detection, outcome types — already
lives in judge_client.py and is provider-agnostic.

THE INDEPENDENCE RULE STILL BINDS, AND NOW BINDS HARDER.
The RAG answers with Groq. Neither the primary judge NOR the fallback may be
Groq. A fallback that quietly lands on the RAG's own model would be worse than
no fallback: the run would look successful and mean nothing. `resolve_chain()`
filters the RAG's provider out of the chain before anything is called.

Keys come from the environment. None in code.

    JUDGE_PROVIDER          primary, e.g. "gemini"
    JUDGE_MODEL             primary model
    JUDGE_FALLBACK_PROVIDER optional; used only if independent of the RAG
    JUDGE_FALLBACK_MODEL
    RAG_PROVIDER            what to exclude; defaults to "groq"
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Callable


@dataclass(frozen=True)
class Provider:
    """Everything that differs between one judge API and another."""

    name: str
    key_env: str                       # env var holding the API key
    build_url: Callable[[str], str]    # model -> endpoint
    build_headers: Callable[[str], dict]   # key -> headers
    build_payload: Callable[[str, str], dict]  # (model, prompt) -> body
    extract_text: Callable[[dict], str]    # response -> the model's text
    default_model: str


def _gemini_payload(model: str, prompt: str) -> dict:
    return {
        "contents": [{"parts": [{"text": prompt}]}],
        # Temperature 0: the judge should be as reproducible as possible. M6
        # showed generation variance alone swings scores; judge variance on top
        # would make a disagreement unattributable to either side.
        "generationConfig": {"temperature": 0.0, "maxOutputTokens": 100000},
    }


def _openai_style_payload(model: str, prompt: str) -> dict:
    """Shared by OpenAI, DeepSeek, xAI, Mistral and OpenRouter — chat/completions."""
    return {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.0,
        "max_tokens": 2000,
    }


PROVIDERS: dict[str, Provider] = {
    "gemini": Provider(
        name="gemini",
        key_env="GEMINI_API_KEY",
        build_url=lambda m: f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent",
        build_headers=lambda k: {"x-goog-api-key": k, "Content-Type": "application/json"},
        build_payload=_gemini_payload,
        extract_text=lambda r: r["candidates"][0]["content"]["parts"][0]["text"],
        default_model="gemini-3.6-flash",
    ),
    "anthropic": Provider(
        name="anthropic",
        key_env="ANTHROPIC_API_KEY",
        build_url=lambda m: "https://api.anthropic.com/v1/messages",
        build_headers=lambda k: {"x-api-key": k, "anthropic-version": "2023-06-01",
                                 "content-type": "application/json"},
        build_payload=lambda m, p: {"model": m, "max_tokens": 2000,
                                    "temperature": 0.0,
                                    "messages": [{"role": "user", "content": p}]},
        extract_text=lambda r: r["content"][0]["text"],
        default_model="claude-3-5-haiku-20241022",
    ),
    "openai": Provider(
        name="openai",
        key_env="OPENAI_API_KEY",
        build_url=lambda m: "https://api.openai.com/v1/chat/completions",
        build_headers=lambda k: {"Authorization": f"Bearer {k}",
                                 "Content-Type": "application/json"},
        build_payload=_openai_style_payload,
        extract_text=lambda r: r["choices"][0]["message"]["content"],
        default_model="gpt-4o-mini",
    ),
    "deepseek": Provider(
        name="deepseek",
        key_env="DEEPSEEK_API_KEY",
        build_url=lambda m: "https://api.deepseek.com/chat/completions",
        build_headers=lambda k: {"Authorization": f"Bearer {k}",
                                 "Content-Type": "application/json"},
        build_payload=_openai_style_payload,
        extract_text=lambda r: r["choices"][0]["message"]["content"],
        default_model="deepseek-chat",
    ),
    "xai": Provider(
        name="xai",
        key_env="XAI_API_KEY",
        build_url=lambda m: "https://api.x.ai/v1/chat/completions",
        build_headers=lambda k: {"Authorization": f"Bearer {k}",
                                 "Content-Type": "application/json"},
        build_payload=_openai_style_payload,
        extract_text=lambda r: r["choices"][0]["message"]["content"],
        default_model="grok-2-latest",
    ),
    # The free fallback. Mistral's La Plateforme has a no-cost tier that needs
    # no card, which is why it is the fallback rather than a paid provider: an
    # exhausted Gemini day should not stop the benchmark, and it should not
    # cost anything to continue. Its API is OpenAI-shaped, so it reuses the
    # shared payload builder and the existing retry/quota machinery unchanged.
    #
    # Independent of the RAG by construction: the RAG generates with Groq, and
    # `resolve_chain` still filters on provider name, so this is subject to the
    # same rule as every other link, not exempted from it.
    "mistral": Provider(
        name="mistral",
        key_env="MISTRAL_API_KEY",
        build_url=lambda m: "https://api.mistral.ai/v1/chat/completions",
        build_headers=lambda k: {"Authorization": f"Bearer {k}",
                                 "Content-Type": "application/json",
                                 "Accept": "application/json"},
        build_payload=_openai_style_payload,
        extract_text=lambda r: r["choices"][0]["message"]["content"],
        # Verified live on the free tier: mistral-small-latest returns a
        # persistent 429 ("Rate limit exceeded", code 1300) on this account
        # while open-mistral-7b and ministral-3b-latest both return 200.
        # open-mistral-7b is the larger of the two working models, so it is
        # the default; ministral-3b-latest is the smaller fallback.
        default_model="open-mistral-7b",
    ),
    # Present so the guard can RECOGNISE and REJECT it. The RAG generates with
    # Groq, so a Groq judge is never independent. Listing it makes the refusal
    # explicit rather than falling through to "unknown provider".
    "groq": Provider(
        name="groq",
        key_env="GROQ_API_KEY",
        build_url=lambda m: "https://api.groq.com/openai/v1/chat/completions",
        build_headers=lambda k: {"Authorization": f"Bearer {k}",
                                 "Content-Type": "application/json"},
        build_payload=_openai_style_payload,
        extract_text=lambda r: r["choices"][0]["message"]["content"],
        default_model="openai/gpt-oss-120b",
    ),
}


# Model-name fragments that identify a provider when only JUDGE_MODEL is set.
# Order matters: "gpt-oss" must be checked before "gpt", or the RAG's own
# Groq model would be misread as OpenAI and pass the independence check.
MODEL_HINTS = [
    ("gpt-oss", "groq"),
    ("gemini", "gemini"),
    ("claude", "anthropic"),
    ("grok", "xai"),
    ("deepseek", "deepseek"),
    # Covers "mistral-small-latest", "open-mistral-7b", "mistral-large-latest".
    # "ministral" is a separate spelling (ministral-3b/8b), not a typo: without
    # its own entry those models infer as None and are dropped as unidentifiable.
    ("ministral", "mistral"),
    ("mistral", "mistral"),
    ("gpt-", "openai"),
    ("o1-", "openai"),
]


def provider_for_model(model: str) -> str | None:
    """Infer the provider from a model name. None when it cannot be told.

    Returning None matters: an unrecognised model must NOT be assumed
    independent. Guessing here is how a Groq model slips through.
    """
    lowered = (model or "").lower()
    for fragment, provider in MODEL_HINTS:
        if fragment in lowered:
            return provider
    return None


@dataclass
class JudgeTarget:
    """A resolved, callable judge: provider + model + key."""

    provider: Provider
    model: str
    api_key: str

    @property
    def label(self) -> str:
        return f"{self.provider.name}/{self.model}"


def resolve_chain(env: dict) -> tuple[list[JudgeTarget], list[str]]:
    """Build the ordered [primary, fallback] chain, dropping anything unusable.

    Returns (usable targets, human-readable notes about what was excluded and
    why). Nothing silently vanishes — a fallback dropped for sharing the RAG's
    provider is reported, because that is exactly the failure this milestone
    exists to prevent.
    """
    rag_provider = (env.get("RAG_PROVIDER") or "groq").lower()
    notes: list[str] = []
    targets: list[JudgeTarget] = []

    candidates = [
        ("primary", env.get("JUDGE_PROVIDER"), env.get("JUDGE_MODEL")),
        ("fallback", env.get("JUDGE_FALLBACK_PROVIDER"),
         env.get("JUDGE_FALLBACK_MODEL")),
    ]

    for role, provider_name, model in candidates:
        if not provider_name and not model:
            continue

        # A model alone is enough if its provider can be inferred.
        if not provider_name:
            provider_name = provider_for_model(model)
            if not provider_name:
                notes.append(
                    f"{role}: cannot infer a provider from model {model!r} — "
                    "skipped rather than assumed independent")
                continue

        provider_name = provider_name.lower()
        provider = PROVIDERS.get(provider_name)
        if provider is None:
            notes.append(f"{role}: unknown provider {provider_name!r} — skipped")
            continue

        # THE RULE. Applies to the fallback exactly as it applies to the
        # primary: a fallback that lands on the RAG's own model would produce
        # a run that looks successful and means nothing.
        if provider_name == rag_provider:
            notes.append(
                f"{role}: {provider_name} is the RAG's own provider — EXCLUDED. "
                "A model grading its own output shares its blind spots.")
            continue

        model = model or provider.default_model
        # Guard against a mismatched pair, e.g. provider=gemini model=grok-2.
        inferred = provider_for_model(model)
        if inferred and inferred != provider_name:
            notes.append(
                f"{role}: model {model!r} looks like {inferred}, not "
                f"{provider_name} — skipped as ambiguous")
            continue

        api_key = env.get(provider.key_env, "")
        if not api_key or "PASTE" in api_key:
            notes.append(f"{role}: {provider.key_env} not set — skipped")
            continue

        targets.append(JudgeTarget(provider, model, api_key))

    return targets, notes
