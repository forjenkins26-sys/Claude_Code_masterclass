"""Milestone 8 — free-fallback (Mistral) tests.

Eight scenarios, all offline. No network, no key, no waiting: the transport and
the sleep are injected, so a burst-limit retry path that would take 60 seconds
against a real API resolves here in microseconds.

WHY THIS FILE EXISTS SEPARATELY. test_judge_providers.py proves the chain
resolves correctly; this proves the chain BEHAVES correctly once Gemini starts
failing. Those are different claims. The first is about configuration, the
second is about what happens at 3am when the daily quota dies mid-benchmark.

THE SCENARIO THAT MATTERS MOST is 5 (all providers unavailable) and 7 (no
invented scores). A fallback chain makes it tempting to believe a number always
comes back. It must not: when every judge is down the honest answer is
"unavailable", and a harness that fabricates a 0 there corrupts the exact
statistic the benchmark exists to produce.

Usage:
    python test_mistral_fallback.py
"""

from __future__ import annotations

import io
import json
import sys
import urllib.error

from judge_client import Outcome, RetryConfig, call_judge
from judge_providers import PROVIDERS, JudgeTarget, provider_for_model, resolve_chain

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
    return urllib.error.HTTPError("u", code, "err", {}, io.BytesIO(body.encode()))


# Retries collapse to near-zero time; jitter off so counts are exact.
FAST = RetryConfig(max_retries=2, backoff_base=0.01, backoff_cap=0.02, jitter=False)

DAILY_429 = json.dumps({"error": {"details": [{"violations": [
    {"quotaId": "GenerateRequestsPerDayPerProjectPerModel-FreeTier",
     "quotaValue": "20"}]}]}})
BURST_429 = json.dumps({"error": {"details": [
    {"@type": "type.googleapis.com/google.rpc.RetryInfo", "retryDelay": "25s"}]}})

VERDICT_JSON = json.dumps({"completeness": 2, "factual_grounding": 2,
                           "citation_discipline": 1, "precision": 2,
                           "overall": 8, "reason": "ok"})

GEMINI = JudgeTarget(PROVIDERS["gemini"], "gemini-3.6-flash", "k-gem")
MISTRAL = JudgeTarget(PROVIDERS["mistral"], "open-mistral-7b", "k-mis")


def gemini_ok(_url, _data, _headers, _timeout) -> str:
    return json.dumps({"candidates": [{"content": {"parts": [
        {"text": VERDICT_JSON}]}}]})


def mistral_ok(_url, _data, _headers, _timeout) -> str:
    return json.dumps({"choices": [{"message": {"content": VERDICT_JSON}}]})


# --------------------------------------------------------------------------


def scenario_1_gemini_success() -> None:
    print("\n1. GEMINI SUCCEEDS — the fallback is never touched")
    seen = []

    def transport(url, data, headers, timeout):
        seen.append(url)
        return gemini_ok(url, data, headers, timeout)

    result = call_judge({}, "p", FAST, target=GEMINI, transport=transport,
                        sleep=lambda s: None, verbose=False)
    check("outcome OK", result.outcome, Outcome.OK)
    check("verdict parsed", result.verdict["overall"], 8)
    check("one call only", len(seen), 1)
    check("hit gemini", "googleapis" in seen[0], True)


def scenario_2_burst_rate_limit() -> None:
    print("\n2. BURST 429 — retried, not treated as a daily cap")
    calls = []

    def flaky(url, data, headers, timeout):
        calls.append(1)
        if len(calls) < 3:
            raise http_error(429, BURST_429)
        return gemini_ok(url, data, headers, timeout)

    result = call_judge({}, "p", FAST, target=GEMINI, transport=flaky,
                        sleep=lambda s: None, verbose=False)
    check("recovers after retries", result.outcome, Outcome.OK)
    check("took 3 attempts", len(calls), 3)
    check("waited a non-zero time", result.waited_seconds > 0, True)


def scenario_3_daily_quota() -> None:
    print("\n3. DAILY QUOTA — detected at once, retries NOT spent")
    calls = []

    def dead(url, data, headers, timeout):
        calls.append(1)
        raise http_error(429, DAILY_429)

    result = call_judge({}, "p", FAST, target=GEMINI, transport=dead,
                        sleep=lambda s: None, verbose=False)
    check("outcome QUOTA_EXHAUSTED", result.outcome, Outcome.QUOTA_EXHAUSTED)
    check("exactly ONE call", len(calls), 1)
    check("zero seconds wasted", result.waited_seconds, 0.0)
    check("not misread as a burst limit",
          result.outcome is not Outcome.RATE_LIMITED, True)


def scenario_4_fallback_to_mistral() -> None:
    print("\n4. FALLBACK — Gemini exhausted, Mistral answers")
    seen = []

    def transport(url, data, headers, timeout):
        seen.append(url)
        if "googleapis" in url:
            raise http_error(429, DAILY_429)
        return mistral_ok(url, data, headers, timeout)

    primary = call_judge({}, "p", FAST, target=GEMINI, transport=transport,
                         sleep=lambda s: None, verbose=False)
    check("primary is exhausted", primary.outcome, Outcome.QUOTA_EXHAUSTED)

    backup = call_judge({}, "p", FAST, target=MISTRAL, transport=transport,
                        sleep=lambda s: None, verbose=False)
    check("mistral answers", backup.outcome, Outcome.OK)
    check("openai-shaped response parsed", backup.verdict["overall"], 8)
    check("really a different endpoint", "api.mistral.ai" in seen[-1], True)
    check("mistral is independent of the RAG",
          MISTRAL.provider.name != "groq", True)


def scenario_5_all_unavailable() -> None:
    print("\n5. EVERY PROVIDER DOWN — no score is produced")

    def everything_dead(url, data, headers, timeout):
        raise http_error(429, DAILY_429)

    results = [call_judge({}, "p", FAST, target=t, transport=everything_dead,
                          sleep=lambda s: None, verbose=False)
               for t in (GEMINI, MISTRAL)]
    check("both exhausted",
          [r.outcome for r in results],
          [Outcome.QUOTA_EXHAUSTED, Outcome.QUOTA_EXHAUSTED])
    check("neither invented a verdict",
          all(r.verdict is None for r in results), True)
    check("neither claims success", any(r.ok for r in results), False)


def scenario_6_malformed_fallback() -> None:
    print("\n6. FALLBACK RESPONDS WITH GARBAGE — reported, not guessed at")
    calls = []

    def rambling(url, data, headers, timeout):
        calls.append(1)
        return json.dumps({"choices": [{"message": {
            "content": "Sure! Here is my assessment: the answer seems fine."}}]})

    result = call_judge({}, "p", FAST, target=MISTRAL, transport=rambling,
                        sleep=lambda s: None, verbose=False)
    check("outcome BAD_JSON", result.outcome, Outcome.BAD_JSON)
    check("no verdict salvaged from prose", result.verdict, None)
    # Retried: a model that rambles once often complies next call.
    check("retried before giving up", len(calls), FAST.max_retries + 1)

    # A truncated JSON body must not half-parse into a partial score.
    def truncated(url, data, headers, timeout):
        return json.dumps({"choices": [{"message": {
            "content": '{"completeness":2,"factual_grou'}}]})

    result = call_judge({}, "p", FAST, target=MISTRAL, transport=truncated,
                        sleep=lambda s: None, verbose=False)
    check("truncated JSON is not partially accepted", result.verdict, None)


def scenario_7_no_invented_scores() -> None:
    print("\n7. NO INVENTED SCORES ON ANY FAILURE PATH")
    paths = {
        "daily quota": lambda *a: (_ for _ in ()).throw(http_error(429, DAILY_429)),
        "burst limit": lambda *a: (_ for _ in ()).throw(http_error(429, BURST_429)),
        "server error": lambda *a: (_ for _ in ()).throw(http_error(500, "boom")),
        "network drop": lambda *a: (_ for _ in ()).throw(OSError("connection reset")),
        "garbage body": lambda *a: json.dumps(
            {"choices": [{"message": {"content": "no json here"}}]}),
    }
    for label, transport in paths.items():
        result = call_judge({}, "p", FAST, target=MISTRAL, transport=transport,
                            sleep=lambda s: None, verbose=False)
        # The point: not None-and-zero, not None-and-empty-dict. None.
        check(f"{label}: verdict is None", result.verdict, None)
        check(f"{label}: not reported OK", result.ok, False)


def scenario_8_unavailable_reporting() -> None:
    print("\n8. UNAVAILABLE CASES ARE COUNTED AND EXPLAINED")
    # A 12-case benchmark where Gemini dies after 3 and Mistral is absent.
    state = {"n": 0}

    def transport(url, data, headers, timeout):
        state["n"] += 1
        if state["n"] <= 3:
            return gemini_ok(url, data, headers, timeout)
        raise http_error(429, DAILY_429)

    evaluated, unavailable = [], []
    for i in range(1, 13):
        result = call_judge({}, "p", FAST, target=GEMINI, transport=transport,
                            sleep=lambda s: None, verbose=False)
        (evaluated if result.ok else unavailable).append(
            (f"AQ-{i:02d}", result.outcome.value))

    check("3 evaluated", len(evaluated), 3)
    check("9 unavailable", len(unavailable), 9)
    check("all 12 accounted for", len(evaluated) + len(unavailable), 12)
    check("every unavailable case carries a reason",
          all(reason == "QUOTA_EXHAUSTED" for _, reason in unavailable), True)
    print(f"        -> reports: {len(evaluated)} of 12 evaluated, "
          f"{len(unavailable)} unavailable (QUOTA_EXHAUSTED)")


def scenario_9_wiring_and_independence() -> None:
    print("\n9. WIRING — mistral is registered, inferable, and still guarded")
    check("registered", "mistral" in PROVIDERS, True)
    # Verified live: mistral-small-latest 429s on the free tier while
    # open-mistral-7b returns 200. The default must be one that actually works.
    check("free-tier default model",
          PROVIDERS["mistral"].default_model, "open-mistral-7b")
    check("ministral spelling also infers mistral",
          provider_for_model("ministral-3b-latest"), "mistral")
    check("key read from env, never code",
          PROVIDERS["mistral"].key_env, "MISTRAL_API_KEY")
    check("mistral-small-latest -> mistral",
          provider_for_model("mistral-small-latest"), "mistral")
    check("open-mistral-7b -> mistral",
          provider_for_model("open-mistral-7b"), "mistral")

    targets, _ = resolve_chain({
        "RAG_PROVIDER": "groq",
        "JUDGE_PROVIDER": "gemini", "JUDGE_MODEL": "gemini-3.6-flash",
        "GEMINI_API_KEY": "k",
        "JUDGE_FALLBACK_PROVIDER": "mistral",
        "JUDGE_FALLBACK_MODEL": "open-mistral-7b",
        "MISTRAL_API_KEY": "k2",
    })
    check("chain resolves to gemini then mistral",
          [t.provider.name for t in targets], ["gemini", "mistral"])

    # Without a key the fallback must vanish and SAY so, not silently persist.
    targets, notes = resolve_chain({
        "RAG_PROVIDER": "groq",
        "JUDGE_PROVIDER": "gemini", "JUDGE_MODEL": "gemini-3.6-flash",
        "GEMINI_API_KEY": "k",
        "JUDGE_FALLBACK_PROVIDER": "mistral",
        "JUDGE_FALLBACK_MODEL": "open-mistral-7b",
    })
    check("keyless mistral is dropped", len(targets), 1)
    check("and the drop is reported",
          any("MISTRAL_API_KEY not set" in n for n in notes), True)

    # The independence rule is not weakened by having a free fallback: if the
    # RAG ever moved to Mistral, this fallback must be refused like any other.
    targets, notes = resolve_chain({
        "RAG_PROVIDER": "mistral",
        "JUDGE_PROVIDER": "gemini", "JUDGE_MODEL": "gemini-3.6-flash",
        "GEMINI_API_KEY": "k",
        "JUDGE_FALLBACK_PROVIDER": "mistral",
        "JUDGE_FALLBACK_MODEL": "open-mistral-7b",
        "MISTRAL_API_KEY": "k2",
    })
    check("mistral refused when IT is the RAG provider", len(targets), 1)
    check("exclusion stated", any("EXCLUDED" in n for n in notes), True)


def main() -> int:
    print("=" * 78)
    print("MILESTONE 8 — FREE FALLBACK (MISTRAL) TESTS (offline)")
    print("=" * 78)

    for scenario in (scenario_1_gemini_success, scenario_2_burst_rate_limit,
                     scenario_3_daily_quota, scenario_4_fallback_to_mistral,
                     scenario_5_all_unavailable, scenario_6_malformed_fallback,
                     scenario_7_no_invented_scores,
                     scenario_8_unavailable_reporting,
                     scenario_9_wiring_and_independence):
        scenario()

    print("\n" + "=" * 78)
    print(f"  {passed} passed, {len(failed)} failed")
    if failed:
        for label in failed:
            print(f"    - {label}")
        return 1
    print("\nRESULT: PASS — the free fallback behaves correctly on every path.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
