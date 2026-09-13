"""RAG Explorer evaluation harness — milestone 4: answer quality.

A DIFFERENT AXIS FROM MILESTONE 3. That one asked "is the answer true?" and
scored 1.00. This one asks "is it a *good* answer?" — because an answer can be
perfectly grounded and still be poor:

    it can miss half of a two-part question          -> completeness
    it can volunteer facts nobody asked for          -> precision
    it can state facts with no citation              -> citation discipline
    it can bury one sentence of content in a page    -> conciseness

Milestone 3 proved the model does not lie. This one asks whether it answers
the question it was actually asked.

FOUR DIMENSIONS, ALL DETERMINISTIC — no LLM judge. Every score comes from
comparing the answer against hand-written criteria in
questions_answer_quality.json, so two runs of the same answer always produce
the same score.

The trick that makes PRECISION measurable without a judge: each case lists
`off_topic_facts` — facts that ARE in the corpus but were NOT asked for.
Milestone 3 would score those as perfectly grounded, because they are true.
Here they cost points, because the question did not ask for them.

Composite is the mean of the four dimensions.

Like milestones 1-3: HTTP only, imports nothing from the backend.

Usage:
    python run_answer_quality_eval.py
    python run_answer_quality_eval.py --base-url http://localhost:8000
    python run_answer_quality_eval.py --keep
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
# Reuses milestone 2/3's corpus. The questions are new; the documents are the
# same 8 single-chunk files, so no fact in this suite is invented.
CORPUS_DIR = HERE / "corpus_retrieval"
RESULTS_DIR = HERE / "results"

DEFAULT_BASE_URL = "https://rag-explorer-api.onrender.com"

# Fourth distinct visitor id. Separate workspaces mean a half-finished run of
# one milestone can never leave documents that skew another.
EVAL_VISITOR_ID = "eval-harness-milestone-4"

TOP_K = 4

# Same citation pattern as milestone 1. llm.py normalises the model's markers
# to exactly "[Chunk #2]" / "[Chunk #1, #3]" before we ever see them, so one
# pattern covers every form.
CITATION_PATTERN = re.compile(r"\[Chunk\s+#([\d,\s#]+)\]")


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
# text helpers
# --------------------------------------------------------------------------


def normalise(text: str) -> str:
    """Flatten the typography the model varies between runs.

    It writes "10-digit", "10 digit" and "10‑digit" (non-breaking hyphen)
    interchangeably, and wraps values in ** for bold. Without this, correct
    answers would fail on punctuation rather than on content.
    """
    lowered = text.lower()
    for ch in ("‑", "–", "—"):
        lowered = lowered.replace(ch, "-")
    lowered = lowered.replace(" ", " ").replace(" ", " ")
    lowered = lowered.replace("*", "").replace("“", '"').replace("”", '"')
    lowered = re.sub(r"[-_]", " ", lowered)
    return re.sub(r"\s+", " ", lowered)


def contains(haystack: str, needle: str) -> bool:
    """Delegates to the shared, validated matcher (milestone 5).

    Was a plain substring check. That silently scored "18 characters" as
    containing the fact "8", and counted a negated statement as an assertion.
    """
    return _match(haystack, needle)


def strip_citations(text: str) -> str:
    """Remove citation markers before counting words.

    "[Chunk #1, #3]" is machinery, not prose. Counting it as four words would
    penalise an answer for citing well — the opposite of what we want.
    """
    return CITATION_PATTERN.sub("", text)


def word_count(text: str) -> int:
    return len(strip_citations(text).split())


# --------------------------------------------------------------------------
# the four dimensions
# --------------------------------------------------------------------------


def score_completeness(item: dict, answer: str) -> tuple[float, list, list]:
    """Fraction of the question's parts that the answer actually covers.

    Each part lists `any_of` alternatives, because the model paraphrases. A
    part counts as covered if ANY alternative appears.
    """
    parts = item.get("required_parts", [])
    if not parts:
        return 1.0, [], []

    covered, missed = [], []
    for part in parts:
        if any(contains(answer, alt) for alt in part["any_of"]):
            covered.append(part["name"])
        else:
            missed.append(part["name"])

    return len(covered) / len(parts), covered, missed


def score_precision(item: dict, answer: str) -> tuple[float, list]:
    """How focused the answer stayed.

    Each `off_topic_facts` entry that shows up costs 1/3. Three strays takes
    the score to zero. The fraction is deliberate rather than all-or-nothing:
    volunteering one extra sentence is untidy, volunteering the whole document
    is a different failure, and the score should say which happened.
    """
    strays = [
        fact["name"]
        for fact in item.get("off_topic_facts", [])
        if any(contains(answer, alt) for alt in fact["any_of"])
    ]
    return max(0.0, 1.0 - (len(strays) / 3.0)), strays


def score_citation(item: dict, answer: str, chunks: list) -> tuple[float, str]:
    """Whether factual claims carry a citation, and whether it is real.

    Three outcomes, scored apart because they differ in seriousness:
      1.0  cited, and every cited chunk was actually retrieved
      0.0  cited a chunk that was never retrieved (phantom — a fabricated
           source, worse than no citation at all)
      0.0  no citation where one was expected — the claim is untraceable
    """
    if not item.get("expect_citation", True):
        return 1.0, "no citation required"

    valid = {c.get("chunk_number") for c in chunks}
    cited = [int(n) for g in CITATION_PATTERN.findall(answer) for n in re.findall(r"\d+", g)]

    if not cited:
        return 0.0, "no citation — claim is untraceable"

    phantom = sorted({n for n in cited if n not in valid})
    if phantom:
        return 0.0, f"phantom citation {phantom} — only {sorted(valid)} retrieved"

    return 1.0, f"cited {sorted(set(cited))}, all retrieved"


def score_conciseness(item: dict, answer: str) -> tuple[float, str]:
    """Is the answer a reasonable length for what was asked?

    `max_words` is hand-set per question and sized to its number of parts, so
    a three-part question is not punished for being longer than a one-part
    question.

    Degrades linearly past the budget instead of failing at a cliff: at 2x the
    budget the score is 0. A hard pass/fail at the boundary would make one
    extra clause look identical to three paragraphs of padding.
    """
    budget = item.get("max_words", 40)
    words = word_count(answer)

    if words <= budget:
        return 1.0, f"{words} words (budget {budget})"

    overshoot = (words - budget) / budget
    return max(0.0, 1.0 - overshoot), f"{words} words, over budget {budget}"


def score_answer(item: dict, response: dict) -> dict:
    answer = str(response.get("answer", ""))
    chunks = response.get("chunks", [])

    if not chunks:
        return {
            "id": item["id"], "question": item["question"],
            "status": "ERROR", "reason": "no chunks retrieved",
            "completeness": 0.0, "precision": 0.0,
            "citation_discipline": 0.0, "conciseness": 0.0,
            "composite": 0.0, "covered_parts": [], "missed_parts": [],
            "off_topic_included": [], "citation_detail": "",
            "conciseness_detail": "", "answer": answer,
        }

    completeness, covered, missed = score_completeness(item, answer)
    precision, strays = score_precision(item, answer)
    citation, citation_detail = score_citation(item, answer, chunks)
    conciseness, conciseness_detail = score_conciseness(item, answer)

    composite = (completeness + precision + citation + conciseness) / 4.0

    # Status is driven by COMPLETENESS, not by the composite. Missing part of
    # the question is a defect; being wordy or uncited is a quality warning.
    # Averaging them into one verdict would let a chatty complete answer and a
    # terse incomplete one land in the same bucket.
    if missed:
        status = "FAIL"
        reason = f"incomplete — missed {missed}"
    elif composite >= 0.85:
        status = "PASS"
        reason = "complete and focused"
    else:
        status = "WARN"
        issues = []
        if strays:
            issues.append(f"over-answered ({', '.join(strays)})")
        if citation < 1.0:
            issues.append(citation_detail)
        if conciseness < 1.0:
            issues.append(conciseness_detail)
        reason = "complete but " + ("; ".join(issues) if issues else "below quality bar")

    return {
        "id": item["id"],
        "question": item["question"],
        "status": status,
        "reason": reason,
        "completeness": round(completeness, 4),
        "precision": round(precision, 4),
        "citation_discipline": round(citation, 4),
        "conciseness": round(conciseness, 4),
        "composite": round(composite, 4),
        "covered_parts": covered,
        "missed_parts": missed,
        "off_topic_included": strays,
        "citation_detail": citation_detail,
        "conciseness_detail": conciseness_detail,
        "word_count": word_count(answer),
        "max_words": item.get("max_words"),
        "answer": answer,
    }


# --------------------------------------------------------------------------
# running and reporting
# --------------------------------------------------------------------------


def run(base_url: str, questions: list[dict]) -> list[dict]:
    print("\nPER-QUESTION RESULTS")
    print("-" * 94)
    print(f"{'id':<8}{'compl':>7}{'prec':>7}{'cite':>7}{'conc':>7}{'COMP':>8}  detail")
    print("-" * 94)

    results = []
    for item in questions:
        try:
            response = ask(base_url, item["question"])
            result = score_answer(item, response)
        except Exception as exc:
            result = {
                "id": item["id"], "question": item["question"],
                "status": "ERROR", "reason": f"request failed: {exc}",
                "completeness": 0.0, "precision": 0.0,
                "citation_discipline": 0.0, "conciseness": 0.0,
                "composite": 0.0, "covered_parts": [], "missed_parts": [],
                "off_topic_included": [], "citation_detail": "",
                "conciseness_detail": "", "answer": "",
            }

        results.append(result)
        print(
            f"{result['id']:<8}"
            f"{result['completeness']:>7.2f}{result['precision']:>7.2f}"
            f"{result['citation_discipline']:>7.2f}{result['conciseness']:>7.2f}"
            f"{result['composite']:>8.2f}"
            f"  {result['status']}: {result['reason']}"
        )
        time.sleep(0.4)

    return results


def aggregate(results: list[dict]) -> dict:
    scored = [r for r in results if r["status"] != "ERROR"]
    n = len(scored) or 1

    def mean(key: str) -> float:
        return round(sum(r[key] for r in scored) / n, 4)

    statuses = {}
    for r in results:
        statuses[r["status"]] = statuses.get(r["status"], 0) + 1

    return {
        "cases": len(results),
        "scored": len(scored),
        "completeness": mean("completeness"),
        "precision": mean("precision"),
        "citation_discipline": mean("citation_discipline"),
        "conciseness": mean("conciseness"),
        "composite_answer_quality": mean("composite"),
        "statuses": statuses,
    }


def print_summary(results: list[dict]) -> int:
    stats = aggregate(results)

    print("\n" + "=" * 94)
    print("ANSWER QUALITY SUMMARY")
    print("=" * 94)
    print(f"  cases scored              {stats['scored']}/{stats['cases']}")
    print()
    print(f"  Completeness              {stats['completeness']:.2f}   "
          "did it answer every part asked?")
    print(f"  Precision                 {stats['precision']:.2f}   "
          "did it stay on topic?")
    print(f"  Citation discipline       {stats['citation_discipline']:.2f}   "
          "did claims carry a real citation?")
    print(f"  Conciseness               {stats['conciseness']:.2f}   "
          "was it a reasonable length?")
    print("  " + "-" * 60)
    print(f"  COMPOSITE ANSWER QUALITY  {stats['composite_answer_quality']:.2f}")
    print()

    for label in ("PASS", "WARN", "FAIL", "ERROR"):
        if stats["statuses"].get(label):
            print(f"  {label:<6} {stats['statuses'][label]}")

    failures = stats["statuses"].get("FAIL", 0) + stats["statuses"].get("ERROR", 0)
    warns = stats["statuses"].get("WARN", 0)

    print()
    if failures == 0:
        print("RESULT: PASS — every question was answered completely.")
    else:
        print(f"RESULT: FAIL — {failures} incomplete or errored answer(s).")

    if warns:
        print(f"        {warns} complete but below the quality bar "
              "(reported, not failed).")

    return 1 if failures else 0


def save_results(results: list[dict], base_url: str) -> Path:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    path = RESULTS_DIR / f"answer-quality-{stamp}.json"
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
    parser = argparse.ArgumentParser(description="RAG answer quality evaluation")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--keep", action="store_true")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")

    print("=" * 94)
    print("RAG EVALUATION — milestone 4: answer quality")
    print("=" * 94)
    print(f"  API        {base_url}")
    print(f"  visitor id {EVAL_VISITOR_ID}")
    print()
    print("Ingesting corpus")
    upload_corpus(base_url)

    questions = json.loads(
        (HERE / "questions_answer_quality.json").read_text(encoding="utf-8")
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
