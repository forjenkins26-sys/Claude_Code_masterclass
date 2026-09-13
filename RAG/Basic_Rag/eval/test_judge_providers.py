"""Milestone 8 — offline tests for provider resolution and fallback.

No network, no API key. Every test runs against a fake environment dict.

THE TEST THAT MATTERS MOST is group 2: a fallback must never resolve to the
RAG's own provider. That is the failure mode this milestone could introduce —
adding a fallback is exactly how a Groq judge would sneak back in, and the run
would look successful while meaning nothing.

Usage:
    python test_judge_providers.py
"""

from __future__ import annotations

import json
import sys
import urllib.error

from judge_client import Outcome, RetryConfig, call_judge
from judge_providers import (
    PROVIDERS,
    JudgeTarget,
    provider_for_model,
    resolve_chain,
)

passed = 0
failed: list[str] = []


def check(label: str, got, want) -> None:
    global passed
    if got == want:
        passed += 1
        print(f"  PASS  {label}")
    else:
        failed.append(label)
        print(f"  FAIL  {label}  got={got!r} want={want!r}")


FAST = RetryConfig(max_retries=2, backoff_base=0.01, backoff_cap=0.02, jitter=False)


def http_error(code: int, body: str = "") -> urllib.error.HTTPError:
    import io
    return urllib.error.HTTPError("u", code, "err", {}, io.BytesIO(body.encode()))


# --------------------------------------------------------------------------


def test_provider_inference() -> None:
    print("\n1. INFERRING A PROVIDER FROM A MODEL NAME")
    check("gemini-3.6-flash -> gemini", provider_for_model("gemini-3.6-flash"), "gemini")
    check("claude-3-5-haiku -> anthropic",
          provider_for_model("claude-3-5-haiku-20241022"), "anthropic")
    check("grok-2-latest -> xai", provider_for_model("grok-2-latest"), "xai")
    check("deepseek-chat -> deepseek", provider_for_model("deepseek-chat"), "deepseek")
    check("gpt-4o-mini -> openai", provider_for_model("gpt-4o-mini"), "openai")

    # The ordering trap: the RAG's model is "openai/gpt-oss-120b" on GROQ.
    # A naive "gpt" check would call it OpenAI and let it pass the guard.
    check("openai/gpt-oss-120b -> groq, NOT openai",
          provider_for_model("openai/gpt-oss-120b"), "groq")

    check("unknown model -> None (never assumed independent)",
          provider_for_model("mystery-model-7"), None)


def test_fallback_never_lands_on_rag_provider() -> None:
    print("\n2. THE FALLBACK MUST NOT BE THE RAG'S OWN PROVIDER")

    # Someone configures Groq as the fallback, by name.
    targets, notes = resolve_chain({
        "RAG_PROVIDER": "groq",
        "JUDGE_PROVIDER": "gemini", "JUDGE_MODEL": "gemini-3.6-flash",
        "GEMINI_API_KEY": "k",
        "JUDGE_FALLBACK_PROVIDER": "groq", "JUDGE_FALLBACK_MODEL": "llama-3.3-70b",
        "GROQ_API_KEY": "k",
    })
    check("only the independent judge survives", len(targets), 1)
    check("survivor is gemini", targets[0].provider.name, "gemini")
    check("exclusion is reported, not silent",
          any("EXCLUDED" in n for n in notes), True)

    # Subtler: the fallback is named only by MODEL, and it is the RAG's model.
    targets, notes = resolve_chain({
        "RAG_PROVIDER": "groq",
        "JUDGE_PROVIDER": "gemini", "JUDGE_MODEL": "gemini-3.6-flash",
        "GEMINI_API_KEY": "k",
        "JUDGE_FALLBACK_MODEL": "openai/gpt-oss-120b", "GROQ_API_KEY": "k",
    })
    check("RAG model inferred and excluded even unnamed", len(targets), 1)

    # And the primary itself.
    targets, notes = resolve_chain({
        "RAG_PROVIDER": "groq",
        "JUDGE_PROVIDER": "groq", "JUDGE_MODEL": "openai/gpt-oss-120b",
        "GROQ_API_KEY": "k",
    })
    check("a groq PRIMARY is refused too", len(targets), 0)


def test_chain_resolution() -> None:
    print("\n3. BUILDING THE CHAIN")

    targets, _ = resolve_chain({
        "RAG_PROVIDER": "groq",
        "JUDGE_PROVIDER": "gemini", "JUDGE_MODEL": "gemini-3.6-flash",
        "GEMINI_API_KEY": "k1",
        "JUDGE_FALLBACK_PROVIDER": "anthropic",
        "JUDGE_FALLBACK_MODEL": "claude-3-5-haiku-20241022",
        "ANTHROPIC_API_KEY": "k2",
    })
    check("two independent judges resolve", len(targets), 2)
    check("primary first", targets[0].provider.name, "gemini")
    check("fallback second", targets[1].provider.name, "anthropic")
    check("labels are readable", targets[0].label, "gemini/gemini-3.6-flash")

    targets, notes = resolve_chain({
        "RAG_PROVIDER": "groq",
        "JUDGE_PROVIDER": "gemini", "JUDGE_MODEL": "gemini-3.6-flash",
        "GEMINI_API_KEY": "k1",
        "JUDGE_FALLBACK_PROVIDER": "anthropic",
        "JUDGE_FALLBACK_MODEL": "claude-3-5-haiku-20241022",
        # no ANTHROPIC_API_KEY
    })
    check("a keyless fallback is dropped", len(targets), 1)
    check("and says why", any("not set" in n for n in notes), True)

    targets, notes = resolve_chain({
        "RAG_PROVIDER": "groq",
        "JUDGE_PROVIDER": "gemini", "JUDGE_MODEL": "grok-2-latest",
        "GEMINI_API_KEY": "k",
    })
    check("provider/model mismatch is rejected", len(targets), 0)
    check("and says why", any("ambiguous" in n for n in notes), True)

    targets, notes = resolve_chain({
        "RAG_PROVIDER": "groq", "JUDGE_MODEL": "mystery-7",
        "GEMINI_API_KEY": "k",
    })
    check("unknown model is skipped, not assumed safe", len(targets), 0)


def test_provider_request_shapes() -> None:
    print("\n4. EACH PROVIDER BUILDS ITS OWN REQUEST")
    for name in ("gemini", "anthropic", "openai", "deepseek", "xai"):
        provider = PROVIDERS[name]
        url = provider.build_url("m")
        headers = provider.build_headers("secret-key")
        payload = provider.build_payload("m", "prompt text")
        ok = (url.startswith("https://")
              and any("secret-key" in str(v) for v in headers.values())
              and "prompt text" in json.dumps(payload))
        check(f"{name}: url, auth header and payload", ok, True)

    check("gemini reads candidates[]",
          PROVIDERS["gemini"].extract_text(
              {"candidates": [{"content": {"parts": [{"text": "hi"}]}}]}), "hi")
    check("anthropic reads content[]",
          PROVIDERS["anthropic"].extract_text({"content": [{"text": "hi"}]}), "hi")
    check("openai reads choices[]",
          PROVIDERS["openai"].extract_text(
              {"choices": [{"message": {"content": "hi"}}]}), "hi")


def test_call_with_target() -> None:
    print("\n5. CALLING THROUGH A RESOLVED TARGET")
    seen = {}

    def transport(url, data, headers, timeout):
        seen["url"] = url
        seen["headers"] = headers
        return json.dumps({"content": [{"text": '{"overall":9}'}]})

    target = JudgeTarget(PROVIDERS["anthropic"], "claude-3-5-haiku-20241022", "sekret")
    result = call_judge({}, "p", FAST, target=target, transport=transport,
                        sleep=lambda s: None, verbose=False)

    check("verdict parsed via the provider's shape", result.verdict, {"overall": 9})
    check("used anthropic's endpoint",
          "api.anthropic.com" in seen["url"], True)
    check("used anthropic's auth header", seen["headers"].get("x-api-key"), "sekret")


def test_fallback_on_quota_exhaustion() -> None:
    print("\n6. FALLBACK TAKES OVER WHEN THE PRIMARY IS EXHAUSTED")
    daily_quota = json.dumps({"error": {"details": [{"violations": [
        {"quotaId": "GenerateRequestsPerDayPerProjectPerModel-FreeTier"}]}]}})

    calls = []

    def transport(url, data, headers, timeout):
        calls.append(url)
        if "googleapis" in url:
            raise http_error(429, daily_quota)
        return json.dumps({"content": [{"text": '{"overall":7}'}]})

    primary = JudgeTarget(PROVIDERS["gemini"], "gemini-3.6-flash", "k1")
    fallback = JudgeTarget(PROVIDERS["anthropic"], "claude-3-5-haiku-20241022", "k2")

    first = call_judge({}, "p", FAST, target=primary, transport=transport,
                       sleep=lambda s: None, verbose=False)
    check("primary reports QUOTA_EXHAUSTED", first.outcome, Outcome.QUOTA_EXHAUSTED)
    check("primary invented no score", first.verdict, None)

    second = call_judge({}, "p", FAST, target=fallback, transport=transport,
                        sleep=lambda s: None, verbose=False)
    check("fallback succeeds", second.outcome, Outcome.OK)
    check("fallback used a different endpoint",
          "anthropic" in calls[-1], True)


def test_unavailable_is_never_scored() -> None:
    print("\n7. AN UNAVAILABLE CASE IS NEVER GIVEN A SCORE")

    def always_429(url, data, headers, timeout):
        raise http_error(429, '{"error":{"message":"slow down"}}')

    target = JudgeTarget(PROVIDERS["gemini"], "gemini-3.6-flash", "k")
    result = call_judge({}, "p", FAST, target=target, transport=always_429,
                        sleep=lambda s: None, verbose=False)

    check("outcome is RATE_LIMITED", result.outcome, Outcome.RATE_LIMITED)
    check("verdict is None, not a zero", result.verdict, None)
    check("not silently OK", result.ok, False)


def main() -> int:
    print("=" * 78)
    print("MILESTONE 8 — PROVIDER AND FALLBACK TESTS (offline)")
    print("=" * 78)

    for test in (test_provider_inference,
                 test_fallback_never_lands_on_rag_provider,
                 test_chain_resolution, test_provider_request_shapes,
                 test_call_with_target, test_fallback_on_quota_exhaustion,
                 test_unavailable_is_never_scored):
        test()

    print("\n" + "=" * 78)
    print(f"  {passed} passed, {len(failed)} failed")
    if failed:
        for label in failed:
            print(f"    - {label}")
        return 1
    print("\nRESULT: PASS — provider resolution and fallback are correct.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
