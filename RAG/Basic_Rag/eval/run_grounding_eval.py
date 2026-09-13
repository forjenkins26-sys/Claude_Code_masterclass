"""RAG Explorer evaluation harness — milestone 3: grounding / faithfulness.

Asks: **is every factual claim in the answer actually present in the chunks
the model was given?**

Milestone 1 judged citations and refusals. Milestone 2 judged the search.
This one judges the gap between them — the model had the right context, but
did it stay inside it?

NO LLM JUDGE, ON PURPOSE. The usual approach is to have a second model rate
entailment. The only strong model wired into this system is the same Groq
model that wrote the answer, and a model grading its own output shares its own
blind spots. So grounding is checked deterministically instead:

    expected_facts    values that must appear in the answer AND in the chunks
    forbidden_facts   plausible values that are NOT in the corpus at all

A forbidden fact in the answer is the model filling a gap from training data.
That is the hallucination signal, and it needs no judge to detect.

Four labels, as specified:

    FULLY_GROUNDED      every expected fact present, nothing invented
    PARTIALLY_GROUNDED  some expected facts missing, but nothing invented
    UNGROUNDED          a forbidden fact appeared — the model invented it
    CORRECT_REFUSAL     corpus cannot answer, and the model said so

Like milestones 1 and 2: HTTP only, imports nothing from the backend.

Usage:
    python run_grounding_eval.py
    python run_grounding_eval.py --base-url http://localhost:8000
    python run_grounding_eval.py --keep
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

# Milestone 5: the fact matcher lives in matching.py and is covered by
# validate_harness.py. Using it here fixes two silent scoring bugs -
# "8" matching inside "18", and a negated fact counting as asserted.
from matching import contains_fact as _match

HERE = Path(__file__).resolve().parent
# Reuses milestone 2's corpus: 8 single-chunk documents with precise,
# checkable facts. Building a third corpus would add nothing.
CORPUS_DIR = HERE / "corpus_retrieval"
RESULTS_DIR = HERE / "results"

DEFAULT_BASE_URL = "https://rag-explorer-api.onrender.com"

# Third distinct visitor id. Separate workspaces mean a half-finished run of
# one milestone can never leave documents that skew another.
EVAL_VISITOR_ID = "eval-harness-milestone-3"

TOP_K = 4

# Phrases that mean "not in the context". Same list as milestone 1 — it was
# rebuilt there from real observed answers after an earlier version marked six
# correct refusals as failures.
REFUSAL_PHRASES = [
    "not contain", "not mention", "not state", "not describe", "not include",
    "not specify", "not provide", "not define", "not cover", "not address",
    "not list", "not indicate", "could not find", "couldn't find",
    "unable to find", "cannot find", "no information", "no such information",
    "no mention", "no details", "not mentioned", "not specified",
    "not provided", "not stated", "not available in the",
    "no relevant information", "is not covered", "out of scope",
]


# --------------------------------------------------------------------------
# talking to the API
# --------------------------------------------------------------------------


def api_headers() -> dict:
    """Only the visitor id. No API keys — the server holds those."""
    return {"X-Visitor-Id": EVAL_VISITOR_ID}


def upload_corpus(base_url: str) -> int:
    files = sorted(p for p in CORPUS_DIR.iterdir() if p.is_file())
    if not files:
        print(f"No files in {CORPUS_DIR}.")
        sys.exit(2)

    total = 0
    for path in files:
        with path.open("rb") as handle:
            response = requests.post(
                f"{base_url}/api/upload",
                headers=api_headers(),
                files={"file": (path.name, handle)},
                timeout=180,
            )
        if response.status_code != 200:
            print(f"  upload failed: {path.name} -> {response.status_code}")
            sys.exit(2)
        total += response.json().get("ingested", {}).get("chunks", 0)

    print(f"  {len(files)} file(s), {total} chunk(s)")
    return total


def ask(base_url: str, question: str) -> dict:
    response = requests.post(
        f"{base_url}/api/query",
        headers={**api_headers(), "Content-Type": "application/json"},
        json={"question": question, "top_k": TOP_K},
        timeout=180,
    )
    response.raise_for_status()
    return response.json()


def clear_workspace(base_url: str) -> None:
    response = requests.delete(
        f"{base_url}/api/sources", headers=api_headers(), timeout=60
    )
    print(f"  workspace cleared (HTTP {response.status_code})")


# --------------------------------------------------------------------------
# fact matching
# --------------------------------------------------------------------------


def normalise(text: str) -> str:
    """Lowercase and flatten punctuation that varies between renderings.

    The model writes "10-digit", "10 digit" and "10‑digit" (non-breaking
    hyphen) interchangeably, and wraps values in ** for bold. Without this,
    a correct answer fails on typography rather than on content.
    """
    lowered = text.lower()
    lowered = lowered.replace("‑", "-").replace("–", "-").replace("—", "-")
    lowered = lowered.replace(" ", " ").replace(" ", " ")
    lowered = lowered.replace("*", "").replace("“", '"').replace("”", '"')
    lowered = re.sub(r"[-_]", " ", lowered)
    lowered = re.sub(r"\s+", " ", lowered)
    return lowered


def contains_fact(haystack: str, fact: str) -> bool:
    """Is this fact present in this text?

    Delegates to the shared, validated matcher (milestone 5). Was a plain
    substring check, which scored "640 days" as containing the forbidden fact
    "64", and treated a negated mention as an assertion.
    """
    return _match(haystack, fact)


def mentions_fact(haystack: str, fact: str) -> bool:
    """Presence check that counts negated mentions too.

    Used for FORBIDDEN facts only. "Passwords are not hashed with bcrypt"
    still introduces a value that is nowhere in the corpus, and that is worth
    flagging even though the sentence denies it.
    """
    return _match(haystack, fact, allow_negated=True)


def score_grounding(item: dict, response: dict) -> dict:
    """Assign one of the four labels to a single case."""
    answer = str(response.get("answer", ""))
    chunks = response.get("chunks", [])
    context = "\n".join(str(c.get("content", "")) for c in chunks)

    expected = item.get("expected_facts", [])
    forbidden = item.get("forbidden_facts", [])
    should_refuse = item.get("should_refuse", False)

    refused = any(p in answer.lower() for p in REFUSAL_PHRASES)

    # An expected fact only counts as grounded if it is in the answer AND in
    # the retrieved context. In the answer alone, it could have come from
    # training data and merely happen to be right.
    supported, missing, unsupported = [], [], []
    for fact in expected:
        in_answer = contains_fact(answer, fact)
        in_context = contains_fact(context, fact)
        if in_answer and in_context:
            supported.append(fact)
        elif in_answer and not in_context:
            unsupported.append(fact)   # right value, not from the context
        else:
            missing.append(fact)

    invented = [f for f in forbidden if mentions_fact(answer, f)]

    # --- label ------------------------------------------------------------
    if not chunks:
        label, status = "ERROR", "ERROR"
        reason = "no chunks retrieved"
    elif invented:
        label, status = "UNGROUNDED", "FAIL"
        reason = f"invented {invented} — not in the corpus"
    elif should_refuse and refused:
        label, status = "CORRECT_REFUSAL", "PASS"
        reason = "correctly declined — corpus cannot answer this"
    elif should_refuse and not refused:
        label, status = "UNGROUNDED", "FAIL"
        reason = "answered a question the corpus cannot answer"
    elif unsupported:
        label, status = "UNGROUNDED", "FAIL"
        reason = f"stated {unsupported} but it is absent from the retrieved chunks"
    elif expected and missing and supported:
        label, status = "PARTIALLY_GROUNDED", "WARN"
        reason = f"supported {supported}, missing {missing}"
    elif expected and missing and not supported:
        label, status = "PARTIALLY_GROUNDED", "WARN"
        reason = f"none of the expected facts stated: {missing}"
    else:
        label, status = "FULLY_GROUNDED", "PASS"
        reason = (
            f"all {len(supported)} fact(s) supported by context"
            if supported else "nothing invented; no specific fact required"
        )

    # Per-case grounding score, used for the overall average.
    if label == "FULLY_GROUNDED" or label == "CORRECT_REFUSAL":
        score = 1.0
    elif label == "PARTIALLY_GROUNDED":
        score = (len(supported) / len(expected)) if expected else 0.5
    else:
        score = 0.0

    return {
        "id": item["id"],
        "question": item["question"],
        "label": label,
        "status": status,
        "reason": reason,
        "grounding_score": round(score, 4),
        "expected_facts": expected,
        "supported_facts": supported,
        "missing_facts": missing,
        "unsupported_facts": unsupported,
        "invented_facts": invented,
        "refused": refused,
        "should_refuse": should_refuse,
        "retrieved_sources": [c.get("source") for c in chunks],
        "answer": answer,
    }


# --------------------------------------------------------------------------
# running and reporting
# --------------------------------------------------------------------------


def run(base_url: str, questions: list[dict]) -> list[dict]:
    print("\nPER-TEST RESULTS")
    print("-" * 88)
    print(f"{'id':<9}{'label':<22}{'score':>7}  detail")
    print("-" * 88)

    results = []
    for item in questions:
        try:
            response = ask(base_url, item["question"])
            result = score_grounding(item, response)
        except Exception as exc:
            result = {
                "id": item["id"], "question": item["question"],
                "label": "ERROR", "status": "ERROR",
                "reason": f"request failed: {exc}", "grounding_score": 0.0,
                "expected_facts": item.get("expected_facts", []),
                "supported_facts": [], "missing_facts": [],
                "unsupported_facts": [], "invented_facts": [],
                "refused": False, "should_refuse": item.get("should_refuse", False),
                "retrieved_sources": [], "answer": "",
            }

        results.append(result)
        print(f"{result['id']:<9}{result['label']:<22}{result['grounding_score']:>7.2f}"
              f"  {result['reason']}")
        time.sleep(0.4)

    return results


def aggregate(results: list[dict]) -> dict:
    labels = {}
    for r in results:
        labels[r["label"]] = labels.get(r["label"], 0) + 1

    scored = [r for r in results if r["label"] != "ERROR"]
    overall = (sum(r["grounding_score"] for r in scored) / len(scored)) if scored else 0.0

    return {
        "cases": len(results),
        "scored": len(scored),
        "overall_grounding_score": round(overall, 4),
        "labels": labels,
        "hallucinations": labels.get("UNGROUNDED", 0),
    }


def print_summary(results: list[dict]) -> int:
    stats = aggregate(results)

    print("\n" + "=" * 88)
    print("GROUNDING SUMMARY")
    print("=" * 88)
    for label in ("FULLY_GROUNDED", "CORRECT_REFUSAL", "PARTIALLY_GROUNDED",
                  "UNGROUNDED", "ERROR"):
        count = stats["labels"].get(label, 0)
        if count:
            print(f"  {label:<22} {count}")
    print()
    print(f"  OVERALL GROUNDING SCORE   {stats['overall_grounding_score']:.2f}"
          f"   ({stats['scored']} case(s) scored)")
    print()
    print("    1.00 = fully grounded or a correct refusal")
    print("    0.00 = invented a fact, or answered what it could not know")

    failures = stats["hallucinations"] + stats["labels"].get("ERROR", 0)
    print()
    if failures == 0:
        print("RESULT: PASS — nothing invented.")
    else:
        print(f"RESULT: FAIL — {failures} ungrounded/error case(s).")

    partial = stats["labels"].get("PARTIALLY_GROUNDED", 0)
    if partial:
        print(f"        {partial} partially grounded (reported, not failed)"
              " — facts omitted, none invented.")

    return 1 if failures else 0


def save_results(results: list[dict], base_url: str) -> Path:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    path = RESULTS_DIR / f"grounding-{stamp}.json"
    path.write_text(json.dumps({
        "run_at_utc": datetime.now(timezone.utc).isoformat(),
        "base_url": base_url,
        "visitor_id": EVAL_VISITOR_ID,
        "top_k": TOP_K,
        "summary": aggregate(results),
        "results": results,
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    return path


def main() -> int:
    parser = argparse.ArgumentParser(description="RAG grounding / faithfulness evaluation")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--keep", action="store_true")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")

    print("=" * 88)
    print("RAG EVALUATION — milestone 3: grounding / faithfulness")
    print("=" * 88)
    print(f"  API        {base_url}")
    print(f"  visitor id {EVAL_VISITOR_ID}")
    print()
    print("Ingesting corpus")
    upload_corpus(base_url)

    questions = json.loads(
        (HERE / "questions_grounding.json").read_text(encoding="utf-8")
    )["questions"]

    results = []
    try:
        results = run(base_url, questions)
    finally:
        if not args.keep:
            print("\nTeardown")
            try:
                clear_workspace(base_url)
            except Exception as exc:
                print(f"  cleanup failed: {exc}")

    exit_code = print_summary(results)
    saved = save_results(results, base_url)
    print(f"\nResults saved: {saved}")
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
