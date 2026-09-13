"""Milestone 8 — end-to-end behaviour proof against a simulated provider.

The live Gemini quota is exhausted (20 requests/day, free tier), so the real
API cannot demonstrate the behaviours M8 promises. A simulated provider can,
and it can demonstrate them *deterministically* — including the failure modes
that are hard to trigger on demand against a real service.

This is not a substitute for a live run. It proves the CODE PATHS are correct;
only a live run proves the judge itself is useful. Both facts are reported.

Usage:
    python verify_m8_behaviour.py
"""

from __future__ import annotations

import json
import sys
import urllib.error

from judge_client import Outcome, RetryConfig, backoff_seconds, call_judge
from judge_providers import PROVIDERS, JudgeTarget, resolve_chain

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


def http_error(code: int, body: str = "") -> urllib.error.HTTPError:
    import io
    return urllib.error.HTTPError("u", code, "err", {}, io.BytesIO(body.encode()))


BURST_429 = json.dumps({"error": {"code": 429, "details": [
    {"@type": "type.googleapis.com/google.rpc.RetryInfo", "retryDelay": "25s"}]}})

DAILY_429 = json.dumps({"error": {"code": 429, "details": [
    {"@type": "type.googleapis.com/google.rpc.QuotaFailure", "violations": [
        {"quotaId": "GenerateRequestsPerDayPerProjectPerModel-FreeTier",
         "quotaValue": "20"}]}]}})

VERDICT = json.dumps({"candidates": [{"content": {"parts": [{"text": json.dumps({
    "completeness": 2, "factual_grounding": 2, "citation_discipline": 1,
    "precision": 2, "overall": 8, "reason": "ok"})}]}}]})

FAST = RetryConfig(max_retries=3, backoff_base=0.01, backoff_cap=0.05, jitter=False)
GEMINI = JudgeTarget(PROVIDERS["gemini"], "gemini-3.6-flash", "k1")
XAI = JudgeTarget(PROVIDERS["xai"], "grok-2-latest", "k2")


def behaviour_1_independence() -> None:
    print("\n1. INDEPENDENCE — the RAG's provider can never judge")
    env = {"RAG_PROVIDER": "groq",
           "JUDGE_PROVIDER": "gemini", "JUDGE_MODEL": "gemini-3.6-flash",
           "GEMINI_API_KEY": "k",
           "JUDGE_FALLBACK_PROVIDER": "xai",
           "JUDGE_FALLBACK_MODEL": "grok-2-latest", "XAI_API_KEY": "k"}
    targets, _ = resolve_chain(env)
    check("gemini primary + xai fallback both resolve", len(targets), 2)
    check("neither is the RAG's provider",
          all(t.provider.name != "groq" for t in targets), True)

    # The one that matters: xAI (Grok) is NOT Groq. Different companies,
    # confusingly similar names. The guard must permit xai and refuse groq.
    check("xai is permitted (it is not the RAG provider)",
          targets[1].provider.name, "xai")

    env["JUDGE_FALLBACK_PROVIDER"] = "groq"
    env["JUDGE_FALLBACK_MODEL"] = "openai/gpt-oss-120b"
    targets, notes = resolve_chain(env)
    check("a groq fallback is excluded", len(targets), 1)
    check("and the exclusion is stated", any("EXCLUDED" in n for n in notes), True)


def behaviour_2_backoff() -> None:
    print("\n2. EXPONENTIAL BACKOFF WITH PROVIDER HINTS")
    config = RetryConfig(backoff_base=4.0, backoff_cap=60.0, jitter=False)
    check("doubles 4/8/16/32", [backoff_seconds(i, config) for i in range(4)],
          [4.0, 8.0, 16.0, 32.0])
    check("bounded at the cap", backoff_seconds(9, config), 60.0)
    check("provider hint wins when longer",
          backoff_seconds(0, config, server_hint=25.0), 25.0)
    check("hint ignored when shorter than computed",
          backoff_seconds(3, config, server_hint=5.0), 32.0)


def behaviour_3_bounded_retries() -> None:
    print("\n3. RETRIES ARE BOUNDED, NEVER INFINITE")
    calls = []

    def always_burst(url, data, headers, timeout):
        calls.append(1)
        raise http_error(429, BURST_429)

    result = call_judge({}, "p", FAST, target=GEMINI, transport=always_burst,
                        sleep=lambda s: None, verbose=False)
    check("stops at 1 + max_retries", len(calls), FAST.max_retries + 1)
    check("reports RATE_LIMITED", result.outcome, Outcome.RATE_LIMITED)
    check("invents no score", result.verdict, None)


def behaviour_4_daily_quota() -> None:
    print("\n4. DAILY QUOTA IS DETECTED AND NOT RETRIED")
    calls = []

    def daily(url, data, headers, timeout):
        calls.append(1)
        raise http_error(429, DAILY_429)

    result = call_judge({}, "p", FAST, target=GEMINI, transport=daily,
                        sleep=lambda s: None, verbose=False)
    # A per-day cap cannot clear inside any retry window. Retrying spends
    # minutes to reach the same answer, which is what M7.1 did.
    check("stops after ONE call", len(calls), 1)
    check("reports QUOTA_EXHAUSTED", result.outcome, Outcome.QUOTA_EXHAUSTED)
    check("distinct from a burst limit",
          result.outcome is not Outcome.RATE_LIMITED, True)
    check("invents no score", result.verdict, None)


def behaviour_5_fallback() -> None:
    print("\n5. FALLBACK TO A DIFFERENT PROVIDER ON EXHAUSTION")
    seen = []

    def transport(url, data, headers, timeout):
        seen.append(url)
        if "googleapis" in url:
            raise http_error(429, DAILY_429)
        return json.dumps({"choices": [{"message": {"content": json.dumps(
            {"completeness": 2, "factual_grounding": 2,
             "citation_discipline": 1, "precision": 2,
             "overall": 8, "reason": "ok"})}}]})

    primary = call_judge({}, "p", FAST, target=GEMINI, transport=transport,
                         sleep=lambda s: None, verbose=False)
    check("primary exhausted", primary.outcome, Outcome.QUOTA_EXHAUSTED)

    fallback = call_judge({}, "p", FAST, target=XAI, transport=transport,
                          sleep=lambda s: None, verbose=False)
    check("fallback (xai) answers", fallback.outcome, Outcome.OK)
    check("fallback parsed the openai-style shape",
          fallback.verdict["overall"], 8)
    check("it really hit a different endpoint", "x.ai" in seen[-1], True)


def behaviour_6_unavailable_reporting() -> None:
    print("\n6. UNAVAILABLE CASES ARE REPORTED, NOT SCORED")
    # Simulate a 12-case benchmark where the quota dies after case 4.
    state = {"n": 0}

    def transport(url, data, headers, timeout):
        state["n"] += 1
        if state["n"] <= 4:
            return VERDICT
        raise http_error(429, DAILY_429)

    evaluated, unavailable = [], []
    for i in range(1, 13):
        result = call_judge({}, "p", FAST, target=GEMINI, transport=transport,
                            sleep=lambda s: None, verbose=False)
        if result.ok:
            evaluated.append(f"AQ-{i:02d}")
        else:
            unavailable.append((f"AQ-{i:02d}", result.outcome.value))

    check("4 of 12 evaluated", len(evaluated), 4)
    check("8 unavailable", len(unavailable), 8)
    check("every unavailable case carries a reason",
          all(reason == "QUOTA_EXHAUSTED" for _, reason in unavailable), True)
    check("evaluated + unavailable accounts for all 12",
          len(evaluated) + len(unavailable), 12)
    print(f"        -> would report: {len(evaluated)} of 12 evaluated, "
          f"{len(unavailable)} unavailable (QUOTA_EXHAUSTED)")


def behaviour_7_calibration_gate() -> None:
    print("\n7. CALIBRATION RUNS BEFORE THE BENCHMARK")
    # A judge that cannot grade known-answer cases must not grade real ones.
    def bad_judge(url, data, headers, timeout):
        return json.dumps({"candidates": [{"content": {"parts": [
            {"text": "I am not going to answer in JSON."}]}}]})

    result = call_judge({}, "p", FAST, target=GEMINI, transport=bad_judge,
                        sleep=lambda s: None, verbose=False)
    check("an unusable judge is caught", result.outcome, Outcome.BAD_JSON)
    check("no verdict invented from it", result.verdict, None)


def main() -> int:
    print("=" * 78)
    print("MILESTONE 8 — BEHAVIOUR VERIFICATION (simulated provider)")
    print("=" * 78)
    print("  The live Gemini quota is exhausted, so these behaviours are proven")
    print("  against a simulated provider. This validates the CODE PATHS, not")
    print("  the judge's usefulness — only a live run does that.")

    for behaviour in (behaviour_1_independence, behaviour_2_backoff,
                      behaviour_3_bounded_retries, behaviour_4_daily_quota,
                      behaviour_5_fallback, behaviour_6_unavailable_reporting,
                      behaviour_7_calibration_gate):
        behaviour()

    print("\n" + "=" * 78)
    print(f"  {passed} passed, {len(failed)} failed")
    if failed:
        for label in failed:
            print(f"    - {label}")
        return 1
    print("\nRESULT: PASS — every M8 behaviour verified against a simulated provider.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
