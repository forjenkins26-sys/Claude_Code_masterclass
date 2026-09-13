"""Milestone 7.1 — robust judge transport.

Extracted from run_judge_eval.py so the retry logic can be tested offline,
without a network call or an API key.

WHAT M7 GOT WRONG. Its `call_judge` returned `None` for every kind of failure,
so a rate limit, a server error and malformed JSON were indistinguishable to
the caller. Two of twelve benchmark cases were silently dropped, and the
summary said "10 cases compared" without saying why it was not 12. A benchmark
that quietly loses cases cannot be trusted to report agreement.

Five specific defects:

    1. backoff was linear (8s, 16s), not exponential
    2. Gemini's own `retryDelay` hint in the 429 body was ignored
    3. retry count was hardcoded
    4. malformed JSON was never retried - one bad response killed the case
    5. no structured outcome, so "unavailable" could not be told from "failed"

WHAT THIS DOES INSTEAD. Every call returns a `JudgeResult` carrying an outcome
and the attempt history. A case that exhausts its retries is marked
`RATE_LIMITED` or `ERROR` and **is never given a score** - it is excluded from
the agreement statistics rather than counted as a zero. Inventing a score for
an unavailable case would corrupt the very number the benchmark exists to
report.

Configuration comes from the environment. No keys in code.

    JUDGE_MAX_RETRIES   default 4   attempts after the first, never unbounded
    JUDGE_BACKOFF_BASE  default 4.0 seconds; doubles each attempt
    JUDGE_BACKOFF_CAP   default 60.0 seconds; ceiling on any single wait
    JUDGE_TIMEOUT       default 120 seconds per HTTP call
"""

from __future__ import annotations

import json
import random
import re
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from enum import Enum

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


class Outcome(str, Enum):
    """Why a judge call ended the way it did.

    Kept as distinct values rather than a bool because the report has to say
    "2 unavailable due to rate limits" rather than "2 failed" - the reader
    needs to know whether to re-run or to investigate.
    """

    OK = "OK"                      # parsed a verdict
    RATE_LIMITED = "RATE_LIMITED"  # 429 burst limit; transient, re-runnable
    QUOTA_EXHAUSTED = "QUOTA_EXHAUSTED"  # 429 DAILY cap; retrying cannot help
    BAD_JSON = "BAD_JSON"          # responded, but never parseable
    ERROR = "ERROR"                # non-429 HTTP, network, timeout


@dataclass
class JudgeResult:
    outcome: Outcome
    verdict: dict | None = None
    attempts: int = 0
    waited_seconds: float = 0.0
    detail: str = ""
    history: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return self.outcome is Outcome.OK


@dataclass
class RetryConfig:
    """Bounded retry policy. `max_retries` is a hard ceiling, never infinite."""

    max_retries: int = 4
    backoff_base: float = 4.0
    backoff_cap: float = 60.0
    timeout: int = 120
    jitter: bool = True

    @classmethod
    def from_env(cls, env: dict) -> "RetryConfig":
        def num(key, default, cast):
            try:
                return cast(env.get(key, default))
            except (TypeError, ValueError):
                return cast(default)

        return cls(
            max_retries=max(0, num("JUDGE_MAX_RETRIES", 4, int)),
            backoff_base=num("JUDGE_BACKOFF_BASE", 4.0, float),
            backoff_cap=num("JUDGE_BACKOFF_CAP", 60.0, float),
            timeout=num("JUDGE_TIMEOUT", 120, int),
        )


def parse_retry_delay(body: str) -> float | None:
    """Pull Gemini's own `retryDelay` out of a 429 body.

    The API says how long to wait ("retryDelay": "25s"). Honouring that beats
    guessing: a shorter guess burns another 429, a longer one wastes time.
    Verified against a real 429 response, which carried 25s.
    """
    try:
        payload = json.loads(body)
    except Exception:
        return None

    for detail in payload.get("error", {}).get("details", []):
        raw = detail.get("retryDelay")
        if isinstance(raw, str):
            match = re.match(r"^([\d.]+)s?$", raw.strip())
            if match:
                return float(match.group(1))
    return None


def is_daily_quota(body: str) -> bool:
    """Is this 429 a DAILY cap rather than a burst limit?

    The two look identical at the HTTP layer and need opposite handling. A
    burst limit clears in seconds and is worth retrying. A daily cap resets at
    midnight Pacific, so retrying burns minutes to reach the same 429.

    Gemini names the quota in the violation, e.g.
    "GenerateRequestsPerDayPerProjectPerModel-FreeTier" (limit 20 on the free
    tier). Observed live after the M7 run exhausted it.
    """
    try:
        payload = json.loads(body)
    except Exception:
        return False

    for detail in payload.get("error", {}).get("details", []):
        for violation in detail.get("violations", []):
            if "PerDay" in str(violation.get("quotaId", "")):
                return True
    return "PerDay" in body


def backoff_seconds(attempt: int, config: RetryConfig,
                    server_hint: float | None = None) -> float:
    """How long to wait before attempt N.

    Exponential: base * 2^attempt, capped. The server's own hint wins when it
    is longer than our computed wait - the server knows its quota window and
    we do not.

    Jitter spreads retries so repeated runs do not re-collide on the same
    boundary.
    """
    wait = min(config.backoff_base * (2 ** attempt), config.backoff_cap)
    if server_hint is not None:
        wait = max(wait, server_hint)
    wait = min(wait, config.backoff_cap)
    if config.jitter:
        wait += random.uniform(0, min(1.5, wait * 0.15))
    return round(wait, 2)


def extract_verdict(text: str) -> dict | None:
    """Pull the JSON object out of a model response.

    Models wrap JSON in ```json fences regardless of instructions, and
    sometimes add a sentence before it. Strip the fence, then take the first
    balanced-looking object.
    """
    cleaned = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.M).strip()
    match = re.search(r"\{.*\}", cleaned, re.S)
    if not match:
        return None
    try:
        parsed = json.loads(match.group(0))
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        return None


def call_judge(env: dict, prompt: str, config: RetryConfig | None = None,
               *, target=None, transport=None, sleep=time.sleep,
               verbose: bool = True) -> JudgeResult:
    """One judge call with bounded retries.

    `transport` and `sleep` are injectable so the retry logic can be tested
    offline - no network, no key, no real waiting. That is the whole reason
    this function lives in its own module.

    A transport is a callable taking (url, data, headers, timeout) and either
    returning a response body string or raising urllib.error.HTTPError.
    """
    config = config or RetryConfig.from_env(env)

    # Milestone 8: when a target is supplied the request is built from that
    # provider's spec. Without one, fall back to the Gemini shape so every
    # milestone 7.1 test keeps passing untouched.
    if target is not None:
        url = target.provider.build_url(target.model)
        headers = target.provider.build_headers(target.api_key)
        payload = json.dumps(
            target.provider.build_payload(target.model, prompt)).encode()
        extract = target.provider.extract_text
    else:
        url = GEMINI_URL.format(model=env.get("JUDGE_MODEL", ""))
        payload = json.dumps({
            "contents": [{"parts": [{"text": prompt}]}],
            # Low temperature: the judge should be as reproducible as possible.
            # M6 showed generation variance alone swings scores; judge variance
            # on top would make disagreements unattributable.
            "generationConfig": {"temperature": 0.0, "maxOutputTokens": 100000},
        }).encode()
        headers = {"x-goog-api-key": env.get("GEMINI_API_KEY", ""),
                   "Content-Type": "application/json"}
        extract = lambda r: r["candidates"][0]["content"]["parts"][0]["text"]

    def default_transport(u, data, hdrs, timeout):
        request = urllib.request.Request(u, data=data, headers=hdrs)
        return urllib.request.urlopen(request, timeout=timeout).read().decode()

    send = transport or default_transport

    history: list[str] = []
    waited = 0.0
    last_outcome = Outcome.ERROR
    last_detail = ""

    # attempt 0 is the first try; attempts 1..max_retries are the retries.
    for attempt in range(config.max_retries + 1):
        try:
            raw = send(url, payload, headers, config.timeout)
            body = json.loads(raw)
            text = extract(body)
            verdict = extract_verdict(text)

            if verdict is not None:
                history.append(f"attempt {attempt}: OK")
                return JudgeResult(Outcome.OK, verdict, attempt + 1, waited,
                                   "parsed", history)

            # Responded, but the body was not usable. Retry - a model that
            # rambled once often complies on the next call. M7 gave up here.
            last_outcome, last_detail = Outcome.BAD_JSON, "unparseable response"
            history.append(f"attempt {attempt}: BAD_JSON")

        except urllib.error.HTTPError as exc:
            body = exc.read().decode() if hasattr(exc, "read") else ""
            if exc.code == 429:
                if is_daily_quota(body):
                    # A per-day cap will not clear within any retry window.
                    # Retrying spends minutes to arrive at the same answer, so
                    # report it honestly and stop.
                    history.append(f"attempt {attempt}: 429 daily quota")
                    return JudgeResult(
                        Outcome.QUOTA_EXHAUSTED, None, attempt + 1, waited,
                        "daily free-tier quota exhausted; resets at midnight PT",
                        history)
                last_outcome = Outcome.RATE_LIMITED
                hint = parse_retry_delay(body)
                last_detail = f"429 rate limited (server hint {hint}s)" if hint else "429 rate limited"
                history.append(f"attempt {attempt}: 429")
            else:
                last_outcome = Outcome.ERROR
                last_detail = f"HTTP {exc.code}: {body[:120]}"
                history.append(f"attempt {attempt}: HTTP {exc.code}")
                # A 4xx that is not 429 will not fix itself. Stop early rather
                # than burn the retry budget on a request that is malformed.
                if 400 <= exc.code < 500:
                    break
            hint_value = parse_retry_delay(body) if exc.code == 429 else None

        except Exception as exc:
            last_outcome = Outcome.ERROR
            last_detail = f"{type(exc).__name__}: {str(exc)[:100]}"
            history.append(f"attempt {attempt}: {type(exc).__name__}")
            hint_value = None
        else:
            hint_value = None

        if attempt >= config.max_retries:
            break

        wait = backoff_seconds(attempt, config, locals().get("hint_value"))
        waited += wait
        if verbose:
            print(f"      retry {attempt + 1}/{config.max_retries} "
                  f"after {wait:.1f}s ({last_detail[:48]})")
        sleep(wait)

    return JudgeResult(last_outcome, None, config.max_retries + 1, waited,
                       last_detail, history)
