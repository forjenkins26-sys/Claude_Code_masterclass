"""RAG Explorer evaluation harness — milestone 2: retrieval quality.

Answers one question: **does the right document come back, and how high?**

This is separate from milestone 1. That one judged the ANSWER (citations,
refusals). This one judges the SEARCH, before the LLM is involved at all —
if retrieval hands the model the wrong passages, no amount of prompt tuning
saves the answer.

Four metrics, all computed from the `chunks` array of /api/query:

    Hit Rate@4    did ANY relevant document appear in the top 4?
                  a blunt "did search work at all" signal

    Precision@4   what fraction of the returned chunks were relevant?
                  low precision means the model reads irrelevant text

    RR            reciprocal rank: 1/position of the FIRST relevant hit
                  1.0 if it ranked first, 0.5 if second, 0.25 if fourth

    MRR           mean of RR across all questions
                  the single number that captures "how high does it rank"

Ground truth comes from questions_retrieval.json, labelled by hand. It is
NEVER derived from what the RAG returns — that would measure the retriever
against itself.

Like milestone 1: talks to the API over HTTP, imports nothing from the
backend, changes nothing about it.

Usage:
    python run_retrieval_eval.py
    python run_retrieval_eval.py --base-url http://localhost:8000
    python run_retrieval_eval.py --keep
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

HERE = Path(__file__).resolve().parent
CORPUS_DIR = HERE / "corpus_retrieval"
RESULTS_DIR = HERE / "results"

DEFAULT_BASE_URL = "https://rag-explorer-api.onrender.com"

# A DIFFERENT visitor id from milestone 1. The two harnesses use different
# corpora, and sharing an id would mean one run's documents polluting the
# other's retrieval results.
EVAL_VISITOR_ID = "eval-harness-milestone-2"

TOP_K = 4


# --------------------------------------------------------------------------
# talking to the API
# --------------------------------------------------------------------------


def api_headers() -> dict:
    """Only the visitor id. No API keys — the server holds those."""
    return {"X-Visitor-Id": EVAL_VISITOR_ID}


def upload_corpus(base_url: str) -> int:
    """Ingest the retrieval corpus. Returns the total chunk count."""
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

        result = response.json().get("ingested", {})
        chunks = result.get("chunks", 0)
        total += chunks
        print(f"  {path.name:<30} {chunks} chunk(s)")

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
# the metrics
# --------------------------------------------------------------------------


def score_retrieval(item: dict, response: dict) -> dict:
    """Compute all four metrics for one question.

    The retrieved list is ranked — index 0 is the closest match. We compare
    each result's `source` (the filename) against the hand-labelled
    `relevant_sources`.
    """
    relevant = set(item["relevant_sources"])
    chunks = response.get("chunks", [])

    # Ranked list of filenames, best match first.
    retrieved = [c.get("source", "") for c in chunks]

    # Hit positions are 1-based, because reciprocal rank is 1/position and
    # a 0-based index would divide by zero on the top result.
    hit_positions = [i for i, src in enumerate(retrieved, start=1) if src in relevant]

    hit = len(hit_positions) > 0
    # Precision divides by the number ACTUALLY returned, not by TOP_K. If the
    # store holds fewer than 4 chunks, dividing by 4 would report a low score
    # for a retriever that returned everything it had.
    precision = (len(hit_positions) / len(retrieved)) if retrieved else 0.0
    rr = (1.0 / hit_positions[0]) if hit_positions else 0.0

    # A hit that ranks below a miss is worth flagging even when Hit Rate is 1.
    first_hit_rank = hit_positions[0] if hit_positions else None

    if not retrieved:
        status, reason = "ERROR", "no chunks returned"
    elif not hit:
        status = "FAIL"
        reason = f"no relevant doc in top {len(retrieved)} — expected {sorted(relevant)}"
    elif first_hit_rank == 1:
        status = "PASS"
        reason = f"relevant doc ranked #1 (RR 1.00, P@4 {precision:.2f})"
    else:
        status = "WARN"
        reason = f"relevant doc found but ranked #{first_hit_rank} (RR {rr:.2f})"

    return {
        "id": item["id"],
        "question": item["question"],
        "status": status,
        "reason": reason,
        "relevant_sources": sorted(relevant),
        "retrieved_sources": retrieved,
        "hit": hit,
        "first_hit_rank": first_hit_rank,
        "precision_at_4": round(precision, 4),
        "reciprocal_rank": round(rr, 4),
        "similarities": [c.get("similarity") for c in chunks],
    }


def aggregate(results: list[dict]) -> dict:
    """Roll per-question scores into the four headline numbers."""
    scored = [r for r in results if r["status"] != "ERROR"]
    n = len(scored)
    if n == 0:
        return {"questions": 0}

    return {
        "questions": n,
        "hit_rate_at_4": round(sum(1 for r in scored if r["hit"]) / n, 4),
        "mean_precision_at_4": round(sum(r["precision_at_4"] for r in scored) / n, 4),
        "mrr": round(sum(r["reciprocal_rank"] for r in scored) / n, 4),
        "ranked_first": sum(1 for r in scored if r["first_hit_rank"] == 1),
        "missed": sum(1 for r in scored if not r["hit"]),
        "errors": sum(1 for r in results if r["status"] == "ERROR"),
    }


# --------------------------------------------------------------------------
# running and reporting
# --------------------------------------------------------------------------


def run(base_url: str, questions: list[dict]) -> list[dict]:
    print("\nPER-QUESTION RESULTS")
    print("-" * 78)
    print(f"{'id':<9}{'hit':>5}{'rank':>6}{'P@4':>7}{'RR':>7}  detail")
    print("-" * 78)

    results = []
    for item in questions:
        try:
            response = ask(base_url, item["question"])
            result = score_retrieval(item, response)
        except Exception as exc:
            result = {
                "id": item["id"],
                "question": item["question"],
                "status": "ERROR",
                "reason": f"request failed: {exc}",
                "relevant_sources": item["relevant_sources"],
                "retrieved_sources": [],
                "hit": False,
                "first_hit_rank": None,
                "precision_at_4": 0.0,
                "reciprocal_rank": 0.0,
            }

        results.append(result)

        rank = result["first_hit_rank"]
        print(
            f"{result['id']:<9}"
            f"{('Y' if result['hit'] else 'n'):>5}"
            f"{(str(rank) if rank else '-'):>6}"
            f"{result['precision_at_4']:>7.2f}"
            f"{result['reciprocal_rank']:>7.2f}"
            f"  {result['status']}: {result['reason']}"
        )
        time.sleep(0.4)

    return results


def print_summary(results: list[dict], chunk_count: int) -> int:
    stats = aggregate(results)

    print("\n" + "=" * 78)
    print("RETRIEVAL QUALITY SUMMARY")
    print("=" * 78)
    print(f"  corpus chunks        {chunk_count}")
    print(f"  questions scored     {stats['questions']}")
    print()
    print(f"  Hit Rate@4           {stats['hit_rate_at_4']:.2f}   "
          f"({stats['questions'] - stats['missed']}/{stats['questions']} found a relevant doc)")
    print(f"  Mean Precision@4     {stats['mean_precision_at_4']:.2f}   "
          f"(share of returned chunks that were relevant)")
    print(f"  MRR                  {stats['mrr']:.2f}   "
          f"(1.00 = relevant doc always ranked first)")
    print()
    print(f"  ranked #1            {stats['ranked_first']}/{stats['questions']}")
    print(f"  missed entirely      {stats['missed']}")
    if stats.get("errors"):
        print(f"  request errors       {stats['errors']}")

    print()
    print("  Reading these together:")
    print("    high hit rate + low MRR    -> the right doc is found but ranked low")
    print("    high hit rate + low P@4    -> lots of irrelevant chunks come along")
    print("    low hit rate               -> retrieval is missing the document")

    failures = stats["missed"] + stats.get("errors", 0)
    print()
    if failures == 0:
        print("RESULT: PASS — every question retrieved a relevant document.")
    else:
        print(f"RESULT: FAIL — {failures} question(s) retrieved nothing relevant.")

    return 1 if failures else 0


def save_results(results: list[dict], base_url: str, chunk_count: int) -> Path:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    path = RESULTS_DIR / f"retrieval-{stamp}.json"

    payload = {
        "run_at_utc": datetime.now(timezone.utc).isoformat(),
        "base_url": base_url,
        "visitor_id": EVAL_VISITOR_ID,
        "top_k": TOP_K,
        "corpus_chunks": chunk_count,
        "summary": aggregate(results),
        "results": results,
    }
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    return path


def main() -> int:
    parser = argparse.ArgumentParser(description="RAG retrieval quality evaluation")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--keep", action="store_true",
                        help="do not clear the eval workspace afterwards")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")

    print("=" * 78)
    print("RAG EVALUATION — milestone 2: retrieval quality")
    print("=" * 78)
    print(f"  API        {base_url}")
    print(f"  visitor id {EVAL_VISITOR_ID}")
    print(f"  top_k      {TOP_K}")
    print()
    print("Ingesting retrieval corpus")

    chunk_count = upload_corpus(base_url)
    print(f"  total: {chunk_count} chunks")

    questions = json.loads(
        (HERE / "questions_retrieval.json").read_text(encoding="utf-8")
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

    exit_code = print_summary(results, chunk_count)
    saved = save_results(results, base_url, chunk_count)
    print(f"\nResults saved: {saved}")
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
