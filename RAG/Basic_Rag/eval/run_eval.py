"""RAG Explorer evaluation harness — milestone 1.

Measures two things, both without an LLM judge:

  1. Citation accuracy   — when the model answers, does it cite chunk numbers
                           that actually came back from retrieval?
  2. Refusal behaviour   — when the answer is NOT in the corpus, does the model
                           decline instead of inventing one?

This talks to the RAG API over HTTP like any other client. It imports nothing
from the backend and changes nothing about it. If the harness is deleted, the
RAG app is byte-for-byte unaffected.

Usage:
    python run_eval.py                      # both suites against the live API
    python run_eval.py --base-url http://localhost:8000
    python run_eval.py --suite citation     # one suite only
    python run_eval.py --keep               # leave the eval workspace in place
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

HERE = Path(__file__).resolve().parent
CORPUS_DIR = HERE / "corpus"
RESULTS_DIR = HERE / "results"

DEFAULT_BASE_URL = "https://rag-explorer-api.onrender.com"

# Every request carries this id, so the evaluation gets its own private
# workspace. Nothing it ingests is visible to the seed corpus or to any real
# visitor, and the teardown at the end only ever deletes THIS id's documents.
# Must be 8-64 chars of [A-Za-z0-9_-] to satisfy the API's header check.
EVAL_VISITOR_ID = "eval-harness-milestone-1"

# The model is asked to cite as "[Chunk #2]" or "[Chunk #1, #3]".
# llm.py normalises its output to exactly that shape before we ever see it,
# so one pattern is enough.
CITATION_PATTERN = re.compile(r"\[Chunk\s+#([\d,\s#]+)\]")

# Phrases that mean "I could not find this in the context".
#
# The system prompt asks for one specific sentence, but the model paraphrases
# freely. The first version of this list only had "does not contain" and
# marked six correct refusals as hallucinations — the model had said "does not
# mention", "does not state", "does not describe" instead. A harness that
# cries wolf trains you to ignore it, so the list below was widened from real
# observed answers rather than from imagination.
#
# Still deliberately narrow in one respect: every phrase is a statement about
# the SOURCE ("the specification does not..."), not a hedge about confidence
# ("I'm not sure, but..."). An answer that hedges and then invents must still
# fail.
REFUSAL_PHRASES = [
    # "the context does not ___"
    "not contain",
    "not mention",
    "not state",
    "not describe",
    "not include",
    "not specify",
    "not provide",
    "not define",
    "not cover",
    "not address",
    "not list",
    "not indicate",
    # "I could not find it"
    "could not find",
    "couldn't find",
    "unable to find",
    "cannot find",
    # absence phrased as a noun
    "no information",
    "no such information",
    "no mention",
    "no details",
    "not mentioned",
    "not specified",
    "not provided",
    "not stated",
    "not available in the",
    "no relevant information",
    "is not covered",
    "out of scope",
]


# --------------------------------------------------------------------------
# talking to the API
# --------------------------------------------------------------------------


def api_headers() -> dict:
    """Only the visitor id. No API keys — the server holds those."""
    return {"X-Visitor-Id": EVAL_VISITOR_ID}


def upload_corpus(base_url: str) -> list[dict]:
    """Ingest every file in eval/corpus/ into the evaluation workspace."""
    uploaded = []
    files = sorted(p for p in CORPUS_DIR.iterdir() if p.is_file())

    if not files:
        print(f"No files in {CORPUS_DIR}. Add a document and re-run.")
        sys.exit(2)

    for path in files:
        with path.open("rb") as handle:
            response = requests.post(
                f"{base_url}/api/upload",
                headers=api_headers(),
                files={"file": (path.name, handle)},
                timeout=180,
            )
        if response.status_code != 200:
            print(f"  upload failed: {path.name} -> {response.status_code} {response.text[:200]}")
            sys.exit(2)

        result = response.json().get("ingested", {})
        uploaded.append(result)
        chunks = result.get("chunks", 0)
        note = " (duplicate, skipped)" if result.get("skipped") == "duplicate" else ""
        print(f"  ingested {path.name}: {chunks} chunk(s){note}")

    return uploaded


def ask(base_url: str, question: str, top_k: int = 4) -> dict:
    """One question to /api/query. Returns the parsed JSON response."""
    response = requests.post(
        f"{base_url}/api/query",
        headers={**api_headers(), "Content-Type": "application/json"},
        json={"question": question, "top_k": top_k},
        timeout=180,
    )
    response.raise_for_status()
    return response.json()


def clear_workspace(base_url: str) -> None:
    """Delete everything this harness ingested. Scoped to the eval id only."""
    response = requests.delete(
        f"{base_url}/api/sources", headers=api_headers(), timeout=60
    )
    print(f"  workspace cleared (HTTP {response.status_code})")


# --------------------------------------------------------------------------
# suite 1 — citation accuracy
# --------------------------------------------------------------------------


def extract_cited_numbers(answer: str) -> list[int]:
    """Pull the chunk numbers out of an answer.

    "See [Chunk #2] and [Chunk #1, #3]." -> [2, 1, 3]
    """
    found = []
    for group in CITATION_PATTERN.findall(answer):
        for number in re.findall(r"\d+", group):
            found.append(int(number))
    return found


def score_citation(item: dict, response: dict) -> dict:
    """Judge one citation question. No LLM involved — pure comparison.

    Three distinct failures, deliberately kept separate rather than collapsed
    into one pass/fail, because they mean different things:

      phantom    the model cited a chunk that was never retrieved. This is a
                 fabricated source and the most serious of the three.
      missing    the model answered with no citation at all. Not a lie, but
                 the answer cannot be traced back to a document.
      no_chunks  retrieval returned nothing, so there was nothing to cite.
                 That is a retrieval problem, not a citation problem, and it
                 is reported separately so it cannot be mistaken for one.
    """
    answer = str(response.get("answer", ""))
    chunks = response.get("chunks", [])

    valid_numbers = {c.get("chunk_number") for c in chunks}
    cited = extract_cited_numbers(answer)

    phantom = sorted({n for n in cited if n not in valid_numbers})
    has_citation = len(cited) > 0

    if not chunks:
        status, reason = "ERROR", "no chunks retrieved — nothing could be cited"
    elif phantom:
        status = "FAIL"
        reason = f"phantom citation {phantom} — only {sorted(valid_numbers)} were retrieved"
    elif not has_citation and item.get("expect_citation", True):
        status, reason = "WARN", "answer has no citation — claim is untraceable"
    else:
        status, reason = "PASS", f"cited {sorted(set(cited))}, all retrieved"

    return {
        "id": item["id"],
        "question": item["question"],
        "status": status,
        "reason": reason,
        "cited_chunks": cited,
        "retrieved_chunks": sorted(n for n in valid_numbers if n is not None),
        "phantom_citations": phantom,
        "answer": answer,
    }


# --------------------------------------------------------------------------
# suite 2 — refusal / out-of-corpus
# --------------------------------------------------------------------------


def looks_like_refusal(answer: str) -> bool:
    """True when the answer says, in some form, 'this is not in the context'."""
    lowered = answer.lower()
    return any(phrase in lowered for phrase in REFUSAL_PHRASES)


def score_refusal(item: dict, response: dict) -> dict:
    """Judge one refusal question.

    The answer is NOT in the corpus, so the only correct behaviour is to say
    so. Anything else is the model filling a gap from training data — which is
    exactly the failure this suite exists to catch.
    """
    answer = str(response.get("answer", ""))
    refused = looks_like_refusal(answer)

    if refused:
        status = "PASS"
        reason = "correctly declined — said the context does not cover it"
    else:
        status = "FAIL"
        reason = "answered anyway — the corpus does not contain this"

    return {
        "id": item["id"],
        "kind": item.get("kind", "unknown"),
        "question": item["question"],
        "status": status,
        "reason": reason,
        "answer": answer,
    }


# --------------------------------------------------------------------------
# running and reporting
# --------------------------------------------------------------------------


def load_questions(filename: str) -> list[dict]:
    path = HERE / filename
    data = json.loads(path.read_text(encoding="utf-8"))
    return data["questions"]


def run_suite(base_url: str, name: str, questions: list[dict], scorer) -> list[dict]:
    print(f"\n{name}")
    print("-" * 72)

    results = []
    for item in questions:
        try:
            response = ask(base_url, item["question"])
            result = scorer(item, response)
        except Exception as exc:  # network, timeout, bad JSON
            result = {
                "id": item["id"],
                "question": item["question"],
                "status": "ERROR",
                "reason": f"request failed: {exc}",
                "answer": "",
            }

        results.append(result)
        symbol = {"PASS": "PASS", "FAIL": "FAIL", "WARN": "WARN", "ERROR": "ERR "}[result["status"]]
        print(f"  [{symbol}] {result['id']}  {result['reason']}")
        time.sleep(0.4)  # be gentle with the free-tier backend

    return results


def summarise(results: list[dict]) -> dict:
    counts = {"PASS": 0, "FAIL": 0, "WARN": 0, "ERROR": 0}
    for result in results:
        counts[result["status"]] += 1
    counts["total"] = len(results)
    return counts


def print_summary(citation: list[dict] | None, refusal: list[dict] | None) -> int:
    """Print the final table. Returns the process exit code."""
    print("\n" + "=" * 72)
    print("SUMMARY")
    print("=" * 72)
    print(f"{'suite':<22}{'total':>7}{'pass':>7}{'fail':>7}{'warn':>7}{'error':>7}")

    failures = 0
    for name, results in (("Citation accuracy", citation), ("Refusal", refusal)):
        if results is None:
            continue
        s = summarise(results)
        print(
            f"{name:<22}{s['total']:>7}{s['PASS']:>7}{s['FAIL']:>7}"
            f"{s['WARN']:>7}{s['ERROR']:>7}"
        )
        failures += s["FAIL"] + s["ERROR"]

    print()
    if failures == 0:
        print("RESULT: PASS — no failures.")
    else:
        print(f"RESULT: FAIL — {failures} failing check(s).")

    # WARN is reported but does not fail the run. An answer with no citation is
    # worth knowing about; it is not the same defect as a fabricated one.
    if citation:
        warns = summarise(citation)["WARN"]
        if warns:
            print(f"        {warns} answer(s) had no citation (reported, not failed).")

    return 1 if failures else 0


def save_results(citation, refusal, base_url: str) -> Path:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    path = RESULTS_DIR / f"eval-{stamp}.json"

    payload = {
        "run_at_utc": datetime.now(timezone.utc).isoformat(),
        "base_url": base_url,
        "visitor_id": EVAL_VISITOR_ID,
        "suites": {
            "citation_accuracy": {
                "summary": summarise(citation) if citation else None,
                "results": citation,
            },
            "refusal": {
                "summary": summarise(refusal) if refusal else None,
                "results": refusal,
            },
        },
    }
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    return path


def main() -> int:
    parser = argparse.ArgumentParser(description="RAG Explorer evaluation harness")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL,
                        help=f"RAG API base URL (default: {DEFAULT_BASE_URL})")
    parser.add_argument("--suite", choices=["citation", "refusal", "both"], default="both")
    parser.add_argument("--keep", action="store_true",
                        help="do not clear the eval workspace afterwards")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")

    print("=" * 72)
    print("RAG EVALUATION — milestone 1")
    print("=" * 72)
    print(f"  API        {base_url}")
    print(f"  visitor id {EVAL_VISITOR_ID}")
    print()
    print("Ingesting evaluation corpus")

    upload_corpus(base_url)

    citation_results = None
    refusal_results = None

    try:
        if args.suite in ("citation", "both"):
            citation_results = run_suite(
                base_url,
                "SUITE 1 — citation accuracy (answers ARE in the corpus)",
                load_questions("questions_citation.json"),
                score_citation,
            )

        if args.suite in ("refusal", "both"):
            refusal_results = run_suite(
                base_url,
                "SUITE 2 — refusal (answers are NOT in the corpus)",
                load_questions("questions_refusal.json"),
                score_refusal,
            )
    finally:
        # Runs even on Ctrl-C, so a half-finished run never leaves documents
        # sitting in the eval workspace to skew the next one.
        if not args.keep:
            print("\nTeardown")
            try:
                clear_workspace(base_url)
            except Exception as exc:
                print(f"  cleanup failed: {exc}")

    exit_code = print_summary(citation_results, refusal_results)
    saved = save_results(citation_results, refusal_results, base_url)
    print(f"\nResults saved: {saved}")
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
