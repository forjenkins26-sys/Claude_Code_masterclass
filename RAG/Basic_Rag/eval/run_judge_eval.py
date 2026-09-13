"""Milestone 7 — LLM-as-a-Judge benchmark.

NOT a replacement for the deterministic evaluator. The question is narrower and
more useful: **does an independent judge agree with our hand-written criteria,
and where it disagrees, which one is wrong?**

Milestones 1-6 score by comparing answers against phrasings written by hand.
That is reproducible and cheap, and it has a known weakness: five criteria bugs
have been found so far, every one a correct answer scored as a miss because the
model phrased it in a way nobody anticipated. A judge does not have that
failure mode. It has different ones.

THE INDEPENDENCE RULE IS ENFORCED IN CODE, NOT BY CONVENTION.
The RAG answers with Groq. The judge MUST NOT be Groq — a model grading its own
output shares its own blind spots, which is the reason milestones 3 and 4
avoided a judge entirely. `resolve_judges()` below refuses to run if the
judge provider resolves to the RAG's provider.

WHAT THE JUDGE SEES, per case:
    the user's question
    the retrieved chunks (the same context the RAG had)
    the RAG's final answer
    the expected criteria from questions_answer_quality.json

WHAT IT RETURNS: strict JSON, four dimensions scored 0/1/2, an overall 0-10,
and one sentence of reasoning.

THE JUDGE IS NOT ASSUMED CORRECT. Before scoring anything it is run against
milestone 5's pinned edge cases — the ones with a known right answer. A judge
that fails those is not fit to grade the real suite, and the run says so.

Usage:
    python run_judge_eval.py                 # calibration + full benchmark
    python run_judge_eval.py --calibrate     # calibration only
    python run_judge_eval.py --runs 3        # N judge samples per case
"""

from __future__ import annotations

import argparse
import json
import os
import re
import statistics
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from run_answer_quality_eval import (
    EVAL_VISITOR_ID,
    clear_workspace,
    score_answer,
    upload_corpus,
)
from run_answer_quality_eval import ask as ask_rag

# Milestone 7.1: transport moved to judge_client.py so the retry logic can
# be tested offline. M7's inline version returned None for every failure,
# so a rate limit was indistinguishable from a parse error and two cases
# were silently dropped from the benchmark.
from judge_client import Outcome, RetryConfig, call_judge

# Milestone 8: provider is a configuration value, not hardcoded. resolve_chain
# filters the RAG's own provider out of [primary, fallback] before anything is
# called - a fallback landing on the RAG's model would look successful and
# mean nothing.
from judge_providers import resolve_chain

HERE = Path(__file__).resolve().parent
RESULTS_DIR = HERE / "results"
DEFAULT_BASE_URL = "https://rag-explorer-api.onrender.com"

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


# --------------------------------------------------------------------------
# config and the independence guard
# --------------------------------------------------------------------------


def load_env() -> dict:
    """Read eval/.env. Keys live here, never in code (constraint: no secrets)."""
    env = {}
    path = HERE / ".env"
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                env[key.strip()] = value.strip()
    # A real environment variable wins over the file.
    # Milestone 8: every provider key plus the chain settings. A real
    # environment variable always wins over the file.
    for key in ("GEMINI_API_KEY", "ANTHROPIC_API_KEY", "OPENAI_API_KEY",
                "DEEPSEEK_API_KEY", "XAI_API_KEY", "GROQ_API_KEY",
                "MISTRAL_API_KEY",
                "JUDGE_PROVIDER", "JUDGE_MODEL",
                "JUDGE_FALLBACK_PROVIDER", "JUDGE_FALLBACK_MODEL",
                "RAG_PROVIDER", "JUDGE_MAX_RETRIES", "JUDGE_BACKOFF_BASE",
                "JUDGE_BACKOFF_CAP", "JUDGE_TIMEOUT"):
        if os.environ.get(key):
            env[key] = os.environ[key]
    return env


def resolve_judges(env: dict) -> list:
    """Resolve the judge chain and prove every member is independent.

    Milestone 7 checked one judge. Milestone 8 has a chain, and the rule binds
    on every link: the fallback is exactly how the RAG's own provider could
    creep back in.

    Exits non-zero when nothing usable and independent remains. A warning
    would be ignored; a non-zero exit is not.
    """
    rag_provider = (env.get("RAG_PROVIDER") or "groq").lower()
    targets, notes = resolve_chain(env)

    print(f"  RAG provider    {rag_provider}  (excluded from the judge chain)")
    for note in notes:
        print(f"  note            {note}")

    if not targets:
        print("\n  No usable, independent judge. Set JUDGE_PROVIDER/JUDGE_MODEL")
        print("  to a provider that is not the RAG's, with its key in eval/.env.")
        sys.exit(2)

    for index, target in enumerate(targets):
        role = "primary" if index == 0 else "fallback"
        print(f"  {role:<15} {target.label}")
    print(f"  independence    OK - {len(targets)} judge(s), none is {rag_provider}")
    return targets


# --------------------------------------------------------------------------
# the judge
# --------------------------------------------------------------------------


JUDGE_PROMPT = """You are an impartial evaluator of a retrieval-augmented answer.

You will be given a QUESTION, the CONTEXT passages that were retrieved, the
ANSWER a system produced, and the EXPECTED CRITERIA a human wrote for this
question.

Score four dimensions. Use the full range — do not default to 2.

COMPLETENESS   0 = misses most of what was asked
               1 = answers part of the question
               2 = answers every part asked

FACTUAL_GROUNDING  0 = states things the context does not support
                   1 = partly supported, some claims unverifiable
                   2 = every claim traceable to the context

CITATION_DISCIPLINE  0 = no citation, or cites a chunk that is not in context
                     1 = cites some claims but not others
                     2 = claims carry an appropriate [Chunk #N] citation

PRECISION      0 = wanders well beyond what was asked
               1 = mostly focused, some unrequested detail
               2 = answers exactly what was asked, nothing extra

Judge the ANSWER on its own merits. The EXPECTED CRITERIA are one human's view
and may be incomplete — if the answer is good in a way the criteria did not
anticipate, say so in your reason.

Return ONLY valid JSON, no markdown fence, no prose:
{{"completeness":0-2,"factual_grounding":0-2,"citation_discipline":0-2,"precision":0-2,"overall":0-10,"reason":"one sentence"}}

QUESTION:
{question}

CONTEXT:
{context}

ANSWER:
{answer}

EXPECTED CRITERIA:
{criteria}
"""


def call_with_fallback(env: dict, targets: list, prompt: str,
                       config: RetryConfig):
    """Try each independent judge in turn.

    Falls through only on QUOTA_EXHAUSTED or ERROR - conditions the next
    provider might not share. A BAD_JSON or a persistent burst limit is not
    retried on the fallback: burning the second provider's quota on a case the
    first already answered badly wastes the only backup.

    Returns (result, label_of_the_judge_that_answered).
    """
    last = None
    for index, target in enumerate(targets):
        result = call_judge(env, prompt, config, target=target)
        if result.ok:
            return result, target.label
        last = (result, target.label)

        falls_through = result.outcome in (Outcome.QUOTA_EXHAUSTED, Outcome.ERROR)
        if falls_through and index + 1 < len(targets):
            print(f"      {target.label} unavailable ({result.outcome.value}) "
                  f"-> falling back to {targets[index + 1].label}")
            continue
        break
    return last


def build_criteria_text(item: dict) -> str:
    lines = []
    for part in item.get("required_parts", []):
        lines.append(f"- must state: {part['name']} (e.g. {', '.join(part['any_of'][:3])})")
    for fact in item.get("off_topic_facts", []):
        lines.append(f"- should NOT volunteer: {fact['name']}")
    lines.append(f"- a direct answer should fit in about {item.get('max_words', 40)} words")
    return "\n".join(lines)


# --------------------------------------------------------------------------
# calibration — is this judge fit to grade anything?
# --------------------------------------------------------------------------


# Cases with an objectively known answer, drawn from the same edge cases M5
# pins for the deterministic matcher. If the judge cannot get these right, its
# verdicts on the real suite mean nothing.
CALIBRATION = [
    {
        "name": "perfect answer",
        "question": "How many digits is the OTP?",
        "context": "[Chunk #1 | otp.md p.1]\nThe OTP is six digits long.",
        "answer": "The OTP is six digits long. [Chunk #1]",
        "criteria": "- must state: digit count (six)\n- about 25 words",
        "expect": {"completeness": 2, "citation_discipline": 2, "precision": 2},
    },
    {
        "name": "hallucinated fact",
        "question": "How many digits is the OTP?",
        "context": "[Chunk #1 | otp.md p.1]\nThe OTP is six digits long.",
        "answer": "The OTP is four digits and expires after 30 minutes. [Chunk #1]",
        "criteria": "- must state: digit count (six)\n- about 25 words",
        "expect": {"factual_grounding": 0},
    },
    {
        "name": "phantom citation",
        "question": "How many digits is the OTP?",
        "context": "[Chunk #1 | otp.md p.1]\nThe OTP is six digits long.",
        "answer": "The OTP is six digits long. [Chunk #7]",
        "criteria": "- must state: digit count (six)\n- about 25 words",
        "expect": {"citation_discipline": 0},
    },
    {
        "name": "incomplete, two-part question",
        "question": "How many digits is the OTP, and how long is it valid?",
        "context": ("[Chunk #1 | otp.md p.1]\nThe OTP is six digits long. "
                    "The OTP expires 10 minutes after it is issued."),
        "answer": "The OTP is six digits long. [Chunk #1]",
        "criteria": ("- must state: digit count (six)\n"
                     "- must state: validity (10 minutes)\n- about 45 words"),
        "expect": {"completeness": 1},
    },
    {
        "name": "over-answering",
        "question": "How many digits is the OTP?",
        "context": ("[Chunk #1 | otp.md p.1]\nThe OTP is six digits long. It expires "
                    "after 10 minutes. A user may request a new OTP after 60 seconds. "
                    "A toast reads 'OTP sent'."),
        "answer": ("The OTP is six digits long. It expires after 10 minutes, a new one "
                   "can be requested after 60 seconds, and a toast reads 'OTP sent'. "
                   "[Chunk #1]"),
        "criteria": ("- must state: digit count (six)\n"
                     "- should NOT volunteer: expiry, resend window, toast\n"
                     "- about 25 words"),
        "expect": {"precision": 0},
    },
]


def run_calibration(env: dict, config: RetryConfig, targets: list) -> tuple[int, int, list]:
    print("\nCALIBRATION — can this judge grade known cases correctly?")
    print("-" * 88)

    correct, total, details = 0, 0, []
    for case in CALIBRATION:
        prompt = JUDGE_PROMPT.format(
            question=case["question"], context=case["context"],
            answer=case["answer"], criteria=case["criteria"],
        )
        result, judge_label = call_with_fallback(env, targets, prompt, config)
        if not result.ok:
            print(f"  {result.outcome.value}  {case['name']}: {result.detail}")
            details.append({"name": case["name"], "ok": False,
                            "outcome": result.outcome.value, "reason": result.detail})
            total += len(case["expect"])
            continue
        verdict = result.verdict

        for dimension, expected in case["expect"].items():
            total += 1
            got = verdict.get(dimension)
            ok = got == expected
            correct += 1 if ok else 0
            mark = "PASS" if ok else "FAIL"
            print(f"  {mark}  {case['name']:<30} {dimension:<20} got {got} want {expected}")
            details.append({
                "name": case["name"], "dimension": dimension,
                "got": got, "want": expected, "ok": ok,
                "reason": verdict.get("reason", ""),
            })
        time.sleep(1.0)

    print(f"\n  calibration: {correct}/{total} dimension checks correct")
    return correct, total, details


# --------------------------------------------------------------------------
# the benchmark
# --------------------------------------------------------------------------


def judge_to_composite(verdict: dict) -> float:
    """Judge's 0-10 overall, rescaled to the deterministic 0-1 composite."""
    return round(verdict.get("overall", 0) / 10.0, 4)


def run_benchmark(env: dict, base_url: str, questions: list[dict],
                  samples: int, config: RetryConfig,
                  targets: list) -> tuple[list[dict], list[dict]]:
    print(f"\nBENCHMARK — {len(questions)} cases, {samples} judge sample(s) each")
    print("-" * 88)
    print(f"{'id':<8}{'det':>7}{'judge':>7}{'delta':>8}  judge reason")
    print("-" * 88)

    rows, unavailable = [], []
    for item in questions:
        try:
            response = ask_rag(base_url, item["question"])
        except Exception as exc:
            print(f"{item['id']:<8}  RAG call failed: {exc}")
            continue

        deterministic = score_answer(item, response)
        answer = str(response.get("answer", ""))
        context = "\n\n".join(
            f"[Chunk #{c['chunk_number']} | {c['source']} p.{c['page']}]\n{c['content']}"
            for c in response.get("chunks", [])
        )

        prompt = JUDGE_PROMPT.format(
            question=item["question"], context=context,
            answer=answer, criteria=build_criteria_text(item),
        )

        verdicts, outcomes, judges_used = [], [], []
        for _ in range(samples):
            result, judge_label = call_with_fallback(env, targets, prompt, config)
            outcomes.append(result.outcome.value)
            judges_used.append(judge_label)
            if result.ok:
                verdicts.append(result.verdict)
            time.sleep(1.0)

        if not verdicts:
            # UNAVAILABLE, not zero. Assigning a score here would corrupt the
            # agreement statistic this benchmark exists to report.
            reason = outcomes[0] if outcomes else "UNKNOWN"
            if reason == Outcome.QUOTA_EXHAUSTED.value:
                # A per-day cap will not clear for the remaining cases either.
                # Continuing spends minutes to collect identical failures.
                print(f"{item['id']:<8}  QUOTA EXHAUSTED — stopping; "
                      "the daily cap resets at midnight PT")
                unavailable.append({
                    "id": item["id"], "question": item["question"],
                    "outcome": reason,
                    "deterministic_composite": deterministic["composite"],
                })
                for remaining in questions[questions.index(item) + 1:]:
                    unavailable.append({
                        "id": remaining["id"], "question": remaining["question"],
                        "outcome": "NOT_ATTEMPTED_QUOTA",
                        "deterministic_composite": None,
                    })
                break
            unavailable.append({
                "id": item["id"], "question": item["question"],
                "outcome": reason,
                "deterministic_composite": deterministic["composite"],
            })
            print(f"{item['id']:<8}{deterministic['composite']:>7.2f}"
                  f"{'--':>7}{'--':>8}  UNAVAILABLE ({reason})")
            continue

        judge_composite = statistics.mean(judge_to_composite(v) for v in verdicts)
        det_composite = deterministic["composite"]
        delta = judge_composite - det_composite

        rows.append({
            "id": item["id"],
            "question": item["question"],
            "deterministic": {
                "completeness": deterministic["completeness"],
                "precision": deterministic["precision"],
                "citation_discipline": deterministic["citation_discipline"],
                "conciseness": deterministic["conciseness"],
                "composite": det_composite,
                "status": deterministic["status"],
            },
            "judge": {
                "samples": len(verdicts),
                "completeness": statistics.mean(v.get("completeness", 0) for v in verdicts),
                "factual_grounding": statistics.mean(v.get("factual_grounding", 0) for v in verdicts),
                "citation_discipline": statistics.mean(v.get("citation_discipline", 0) for v in verdicts),
                "precision": statistics.mean(v.get("precision", 0) for v in verdicts),
                "overall": statistics.mean(v.get("overall", 0) for v in verdicts),
                "composite": round(judge_composite, 4),
                "reason": verdicts[0].get("reason", ""),
                "all_verdicts": verdicts,
            },
            "delta": round(delta, 4),
            "disagreement": abs(delta) >= 0.20,
            "answer": answer,
        })

        flag = "  <-- DISAGREE" if abs(delta) >= 0.20 else ""
        print(f"{item['id']:<8}{det_composite:>7.2f}{judge_composite:>7.2f}"
              f"{delta:>+8.2f}  {verdicts[0].get('reason','')[:44]}{flag}")

    return rows, unavailable


def main() -> int:
    parser = argparse.ArgumentParser(description="M7 — LLM-as-a-Judge benchmark")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--runs", type=int, default=1,
                        help="judge samples per case")
    parser.add_argument("--calibrate", action="store_true",
                        help="run calibration only")
    parser.add_argument("--max-retries", type=int, default=None,
                        help="override JUDGE_MAX_RETRIES from eval/.env")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")
    env = load_env()

    if not env.get("GEMINI_API_KEY") or "PASTE" in env.get("GEMINI_API_KEY", ""):
        print("GEMINI_API_KEY not set in eval/.env. Stopping.")
        return 2

    config = RetryConfig.from_env(env)
    if args.max_retries is not None:
        config.max_retries = args.max_retries

    print("=" * 88)
    print("RAG EVALUATION — milestone 7: LLM-as-a-Judge benchmark")
    print("=" * 88)
    targets = resolve_judges(env)
    print(f"  retries         {config.max_retries} max, "
          f"backoff {config.backoff_base}s doubling, cap {config.backoff_cap}s")

    correct, total, calibration = run_calibration(env, config, targets)
    calibration_rate = correct / total if total else 0.0

    if args.calibrate:
        return 0 if calibration_rate >= 0.8 else 1

    if calibration_rate < 0.6:
        print("\n  Judge failed calibration badly. Its verdicts on the real suite")
        print("  would not be interpretable. Stopping.")
        return 1

    questions = json.loads(
        (HERE / "questions_answer_quality.json").read_text(encoding="utf-8")
    )["questions"]

    print("\nIngesting corpus")
    upload_corpus(base_url)

    rows, unavailable = [], []
    try:
        rows, unavailable = run_benchmark(env, base_url, questions,
                                          args.runs, config, targets)
    finally:
        print("\nTeardown")
        try:
            clear_workspace(base_url)
        except Exception as exc:
            print(f"  cleanup failed: {exc}")

    # ---- agreement analysis ----------------------------------------------
    print("\n" + "=" * 88)
    print("AGREEMENT: JUDGE vs DETERMINISTIC")
    print("=" * 88)

    total_cases = len(rows) + len(unavailable)
    print(f"  {len(rows)}/{total_cases} evaluated, {len(unavailable)} unavailable")
    if unavailable:
        for entry in unavailable:
            print(f"    {entry['id']}: {entry['outcome']} "
                  "(excluded from agreement — no score invented)")
    print()

    if rows:
        # Agreement is computed over EVALUATED cases only. Counting an
        # unavailable case as agreement or disagreement would be fiction.
        deltas = [r["delta"] for r in rows]
        disagreements = [r for r in rows if r["disagreement"]]
        judge_higher = [r for r in rows if r["delta"] > 0]

        print(f"  cases compared        {len(rows)}"
              f"   (agreement is over evaluated cases only)")
        print(f"  mean delta            {statistics.mean(deltas):+.3f}"
              "   (judge minus deterministic)")
        print(f"  largest disagreement  {max(abs(d) for d in deltas):.2f}")
        print(f"  disagreements >= 0.20 {len(disagreements)}")
        print(f"  judge scored higher   {len(judge_higher)}/{len(rows)}")

        if disagreements:
            print("\n  Where they disagree:")
            for row in disagreements:
                print(f"    {row['id']}: det {row['deterministic']['composite']:.2f}"
                      f" vs judge {row['judge']['composite']:.2f}")
                print(f"      judge says: {row['judge']['reason'][:90]}")

    print(f"\n  calibration: {correct}/{total} "
          f"({calibration_rate:.0%}) on known-answer cases")

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    path = RESULTS_DIR / f"judge-{stamp}.json"
    path.write_text(json.dumps({
        "run_at_utc": datetime.now(timezone.utc).isoformat(),
        "base_url": base_url,
        "rag_provider": env.get("RAG_PROVIDER", "groq"),
        "judge_model": env["JUDGE_MODEL"],
        "judge_samples_per_case": args.runs,
        "calibration": {
            "correct": correct, "total": total,
            "rate": round(calibration_rate, 4), "details": calibration,
        },
        "retry_config": {
            "max_retries": config.max_retries,
            "backoff_base": config.backoff_base,
            "backoff_cap": config.backoff_cap,
        },
        "evaluated": len(rows),
        "unavailable": len(unavailable),
        "unavailable_cases": unavailable,
        "comparisons": rows,
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nResults saved: {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
