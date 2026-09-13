"""Milestone 7.1 — offline tests for judge retry behaviour.

No network, no API key, no real sleeping. The transport and the sleep function
are injected, so every retry path is exercised deterministically in under a
second.

That matters: the bug this milestone fixes only appeared under a live rate
limit, which is exactly the condition that is hardest to reproduce on demand.
A fake transport reproduces it every time.

Usage:
    python test_judge_client.py
"""

from __future__ import annotations

import json
import sys
import urllib.error

from judge_client import (
    Outcome,
    is_daily_quota,
    RetryConfig,
    backoff_seconds,
    call_judge,
    extract_verdict,
    parse_retry_delay,
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


ENV = {"JUDGE_MODEL": "gemini-3.6-flash", "GEMINI_API_KEY": "test-key-not-real"}
FAST = RetryConfig(max_retries=3, backoff_base=0.01, backoff_cap=0.05, jitter=False)

VALID_BODY = json.dumps({
    "candidates": [{"content": {"parts": [{"text": json.dumps({
        "completeness": 2, "factual_grounding": 2,
        "citation_discipline": 1, "precision": 2,
        "overall": 8, "reason": "good",
    })}]}}]
})


def http_error(code: int, body: str = "") -> urllib.error.HTTPError:
    import io
    return urllib.error.HTTPError("u", code, "err", {}, io.BytesIO(body.encode()))


RATE_LIMIT_BODY = json.dumps({
    "error": {
        "code": 429, "status": "RESOURCE_EXHAUSTED",
        "message": "quota exceeded",
        "details": [{"@type": "type.googleapis.com/google.rpc.RetryInfo",
                     "retryDelay": "25s"}],
    }
})


# --------------------------------------------------------------------------


def test_success_first_try() -> None:
    print("\n1. SUCCESS PATH")
    calls = []

    def transport(u, d, h, t):
        calls.append(1)
        return VALID_BODY

    result = call_judge(ENV, "p", FAST, transport=transport, sleep=lambda s: None,
                        verbose=False)
    check("outcome is OK", result.outcome, Outcome.OK)
    check("verdict parsed", result.verdict["overall"], 8)
    check("exactly one HTTP call", len(calls), 1)
    check("no time waited", result.waited_seconds, 0.0)


def test_429_then_success() -> None:
    print("\n2. RATE LIMIT THEN RECOVERY (the M7 bug)")
    calls = []

    def transport(u, d, h, t):
        calls.append(1)
        if len(calls) < 3:
            raise http_error(429, RATE_LIMIT_BODY)
        return VALID_BODY

    slept = []
    result = call_judge(ENV, "p", FAST, transport=transport,
                        sleep=slept.append, verbose=False)
    check("recovers to OK", result.outcome, Outcome.OK)
    check("took 3 attempts", len(calls), 3)
    check("slept twice", len(slept), 2)
    # NOT asserting growth here. The 429 body carries a 25s server hint, which
    # exceeds FAST's 0.05s cap, so both waits correctly clamp to the cap and
    # are equal. Growth is proven in test 9 against a realistic config; here
    # the meaningful assertion is that the server hint was honoured at all.
    check("server hint honoured (waits hit the cap)",
          all(w == FAST.backoff_cap for w in slept), True)


def test_429_exhausted() -> None:
    print("\n3. RATE LIMIT NEVER CLEARS")
    calls = []

    def transport(u, d, h, t):
        calls.append(1)
        raise http_error(429, RATE_LIMIT_BODY)

    result = call_judge(ENV, "p", FAST, transport=transport, sleep=lambda s: None,
                        verbose=False)
    # The point of the milestone: an exhausted case is UNAVAILABLE, not zero.
    check("marked RATE_LIMITED", result.outcome, Outcome.RATE_LIMITED)
    check("no verdict invented", result.verdict, None)
    check("bounded: 1 + max_retries calls", len(calls), FAST.max_retries + 1)
    check("not infinite", len(calls) <= 10, True)


DAILY_QUOTA_BODY = json.dumps({
    "error": {
        "code": 429, "status": "RESOURCE_EXHAUSTED",
        "message": "You exceeded your current quota",
        "details": [{
            "@type": "type.googleapis.com/google.rpc.QuotaFailure",
            "violations": [{
                "quotaId": "GenerateRequestsPerDayPerProjectPerModel-FreeTier",
                "quotaValue": "20",
            }],
        }],
    }
})


def test_daily_quota_stops_immediately() -> None:
    print("\n3b. DAILY QUOTA IS NOT RETRIED (it cannot clear in seconds)")
    calls = []

    def transport(u, d, h, t):
        calls.append(1)
        raise http_error(429, DAILY_QUOTA_BODY)

    result = call_judge(ENV, "p", FAST, transport=transport, sleep=lambda s: None,
                        verbose=False)
    # A per-day cap resets at midnight PT. Retrying burns minutes to reach the
    # same answer. Observed live: the M7 run exhausted a 20/day free tier.
    check("marked QUOTA_EXHAUSTED", result.outcome, Outcome.QUOTA_EXHAUSTED)
    check("stopped after 1 call", len(calls), 1)
    check("no verdict invented", result.verdict, None)
    check("distinct from burst rate limit",
          result.outcome is not Outcome.RATE_LIMITED, True)


def test_daily_quota_detection() -> None:
    print("\n3c. TELLING A DAILY CAP FROM A BURST LIMIT")
    check("detects PerDay quota", is_daily_quota(DAILY_QUOTA_BODY), True)
    check("burst limit is not daily", is_daily_quota(RATE_LIMIT_BODY), False)
    check("garbage is not daily", is_daily_quota("not json"), False)


def test_bad_json_then_success() -> None:
    print("\n4. MALFORMED JSON IS RETRIED (M7 gave up here)")
    calls = []

    def transport(u, d, h, t):
        calls.append(1)
        if len(calls) == 1:
            return json.dumps({"candidates": [{"content": {"parts": [
                {"text": "I think the answer is quite good overall."}]}}]})
        return VALID_BODY

    result = call_judge(ENV, "p", FAST, transport=transport, sleep=lambda s: None,
                        verbose=False)
    check("recovers to OK", result.outcome, Outcome.OK)
    check("retried once", len(calls), 2)


def test_bad_json_exhausted() -> None:
    print("\n5. MALFORMED JSON EVERY TIME")

    def transport(u, d, h, t):
        return json.dumps({"candidates": [{"content": {"parts": [
            {"text": "no json here at all"}]}}]})

    result = call_judge(ENV, "p", FAST, transport=transport, sleep=lambda s: None,
                        verbose=False)
    check("marked BAD_JSON", result.outcome, Outcome.BAD_JSON)
    check("no verdict invented", result.verdict, None)
    check("distinguishable from rate limit",
          result.outcome is not Outcome.RATE_LIMITED, True)


def test_non_429_4xx_stops_early() -> None:
    print("\n6. A 400 IS NOT RETRIED (it will not fix itself)")
    calls = []

    def transport(u, d, h, t):
        calls.append(1)
        raise http_error(400, '{"error":{"message":"bad request"}}')

    result = call_judge(ENV, "p", FAST, transport=transport, sleep=lambda s: None,
                        verbose=False)
    check("marked ERROR", result.outcome, Outcome.ERROR)
    check("stopped after 1 call", len(calls), 1)


def test_5xx_is_retried() -> None:
    print("\n7. A 503 IS RETRIED (transient)")
    calls = []

    def transport(u, d, h, t):
        calls.append(1)
        if len(calls) < 2:
            raise http_error(503, "overloaded")
        return VALID_BODY

    result = call_judge(ENV, "p", FAST, transport=transport, sleep=lambda s: None,
                        verbose=False)
    check("recovers to OK", result.outcome, Outcome.OK)
    check("retried", len(calls), 2)


def test_network_error_retried() -> None:
    print("\n8. NETWORK ERROR IS RETRIED")
    calls = []

    def transport(u, d, h, t):
        calls.append(1)
        if len(calls) < 2:
            raise TimeoutError("timed out")
        return VALID_BODY

    result = call_judge(ENV, "p", FAST, transport=transport, sleep=lambda s: None,
                        verbose=False)
    check("recovers to OK", result.outcome, Outcome.OK)


def test_backoff_is_exponential() -> None:
    print("\n9. BACKOFF SHAPE")
    config = RetryConfig(backoff_base=4.0, backoff_cap=60.0, jitter=False)
    waits = [backoff_seconds(i, config) for i in range(5)]
    check("doubles: 4, 8, 16, 32", waits[:4], [4.0, 8.0, 16.0, 32.0])
    check("capped at 60", waits[4], 60.0)
    check("server hint wins when longer",
          backoff_seconds(0, config, server_hint=25.0), 25.0)
    check("server hint ignored when shorter",
          backoff_seconds(2, config, server_hint=5.0), 16.0)
    check("hint still capped",
          backoff_seconds(0, config, server_hint=999.0), 60.0)


def test_retry_delay_parsing() -> None:
    print("\n10. SERVER RETRY HINT")
    check("reads retryDelay from a real 429 body",
          parse_retry_delay(RATE_LIMIT_BODY), 25.0)
    check("handles a bare number", parse_retry_delay(json.dumps(
        {"error": {"details": [{"retryDelay": "7"}]}})), 7.0)
    check("None when absent", parse_retry_delay('{"error":{}}'), None)
    check("None on garbage", parse_retry_delay("not json"), None)


def test_verdict_extraction() -> None:
    print("\n11. VERDICT EXTRACTION")
    check("plain json", extract_verdict('{"overall":7}'), {"overall": 7})
    check("fenced json", extract_verdict('```json\n{"overall":7}\n```'),
          {"overall": 7})
    check("json after prose",
          extract_verdict('Here is my verdict:\n{"overall":7}'), {"overall": 7})
    check("None when no json", extract_verdict("no verdict here"), None)
    check("None on malformed", extract_verdict('{"overall": }'), None)


def test_config_from_env() -> None:
    print("\n12. CONFIG COMES FROM ENV, NOT CODE")
    config = RetryConfig.from_env({"JUDGE_MAX_RETRIES": "7",
                                   "JUDGE_BACKOFF_BASE": "2.5",
                                   "JUDGE_BACKOFF_CAP": "30"})
    check("max_retries read", config.max_retries, 7)
    check("backoff_base read", config.backoff_base, 2.5)
    check("backoff_cap read", config.backoff_cap, 30.0)

    defaults = RetryConfig.from_env({})
    check("sane default retries", defaults.max_retries, 4)

    junk = RetryConfig.from_env({"JUDGE_MAX_RETRIES": "not-a-number"})
    check("junk falls back to default", junk.max_retries, 4)

    zero = RetryConfig.from_env({"JUDGE_MAX_RETRIES": "0"})
    check("zero retries allowed", zero.max_retries, 0)


def main() -> int:
    print("=" * 74)
    print("MILESTONE 7.1 — JUDGE RETRY TESTS (offline)")
    print("=" * 74)
    print("  No network, no API key, no real sleeping.")

    for test in (test_success_first_try, test_429_then_success,
                 test_429_exhausted, test_daily_quota_stops_immediately,
                 test_daily_quota_detection, test_bad_json_then_success,
                 test_bad_json_exhausted, test_non_429_4xx_stops_early,
                 test_5xx_is_retried, test_network_error_retried,
                 test_backoff_is_exponential, test_retry_delay_parsing,
                 test_verdict_extraction, test_config_from_env):
        test()

    print("\n" + "=" * 74)
    print(f"  {passed} passed, {len(failed)} failed")
    if failed:
        for label in failed:
            print(f"    - {label}")
        return 1
    print("\nRESULT: PASS — retry behaviour is correct on every path.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
