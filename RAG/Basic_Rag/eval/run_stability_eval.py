"""Milestone 6 — evaluation stability and repeatability.

THE QUESTION: is one evaluation run a measurement, or a sample?

Milestone 5 found the answer by accident. Two M4 runs, no code change between
them, produced citation discipline 0.25 and then 0.17. That is a 32% swing in
a headline metric from model randomness alone (`temperature=0.3` in the
backend). Every score reported in M1-M4 was a single sample presented as a
number.

This runs the M4 suite N times and reports the spread, so a future reader can
tell a real regression from noise.

WHAT IT REUSES, AND WHY THAT MATTERS. It imports `run()`, `score_answer()` and
`aggregate()` from the M4 runner rather than reimplementing them. A separate
copy of the scoring logic would drift, and then the stability numbers would
describe a scorer nobody actually uses.

SEPARATING MODEL VARIANCE FROM EVALUATOR DEFECTS. A score that moves between
runs has two possible causes:

    model variance     the answer changed, the scorer read it correctly
    evaluator defect   the answer was the same, the scorer disagreed with
                       itself — which would be a bug

The two are told apart by comparing the ANSWER TEXT across runs, not just the
score. Identical text with different scores is a scorer bug; different text
with different scores is the model. M5's validate_harness.py is run first, so
a known-broken matcher never gets to produce stability numbers at all.

Usage:
    python run_stability_eval.py                 # 5 runs (the minimum)
    python run_stability_eval.py --runs 10
    python run_stability_eval.py --skip-validation
"""

from __future__ import annotations

import argparse
import json
import statistics
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# Reuse the real M4 machinery. Importing rather than copying is deliberate:
# a second implementation would drift from the one being measured.
from run_answer_quality_eval import (
    EVAL_VISITOR_ID,
    aggregate,
    clear_workspace,
    run as run_m4_suite,
    upload_corpus,
)

HERE = Path(__file__).resolve().parent
RESULTS_DIR = HERE / "results"
DEFAULT_BASE_URL = "https://rag-explorer-api.onrender.com"

METRICS = ["completeness", "precision", "citation_discipline", "conciseness", "composite"]

# A metric whose range across runs exceeds this is unstable enough that a
# single run should not be quoted without a spread. 0.10 is a judgement call,
# picked so the 0.08 citation swing M5 saw sits just under it and anything
# larger is flagged.
INSTABILITY_THRESHOLD = 0.10


def run_m5_validation() -> bool:
    """Run the M5 harness checks before measuring anything.

    Stability numbers from a broken scorer are worse than no numbers — they
    look authoritative and describe nothing. If M5 fails, stop.
    """
    print("Pre-flight: milestone 5 harness validation")
    result = subprocess.run(
        [sys.executable, str(HERE / "validate_harness.py")],
        capture_output=True, text=True, cwd=str(HERE),
    )
    tail = [ln for ln in result.stdout.strip().split("\n") if "passed" in ln or "RESULT" in ln]
    for line in tail:
        print(f"  {line.strip()}")
    return result.returncode == 0


def summarise_metric(values: list[float]) -> dict:
    """Mean, min, max, range and spread for one metric across runs."""
    return {
        "mean": round(statistics.mean(values), 4),
        "min": round(min(values), 4),
        "max": round(max(values), 4),
        "range": round(max(values) - min(values), 4),
        "stdev": round(statistics.stdev(values), 4) if len(values) > 1 else 0.0,
        "values": [round(v, 4) for v in values],
    }


def classify_instability(case_runs: list[dict]) -> str:
    """Why did this case's score move?

    Compares the ANSWER TEXT, not just the score:

      stable            every run scored the same
      model variance    text differed between runs -> the model changed its
                        answer and the scorer read each one correctly
      EVALUATOR DEFECT  identical text, different scores -> the scorer
                        disagreed with itself. This is a bug and is reported
                        in capitals because it invalidates the metric.
    """
    composites = {round(r["composite"], 4) for r in case_runs}
    if len(composites) == 1:
        return "stable"

    answers = {r.get("answer", "") for r in case_runs}
    if len(answers) == 1:
        return "EVALUATOR DEFECT"
    return "model variance"


def main() -> int:
    parser = argparse.ArgumentParser(description="M6 — evaluation stability")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--runs", type=int, default=5,
                        help="number of repeat runs (minimum 5)")
    parser.add_argument("--skip-validation", action="store_true",
                        help="skip the M5 pre-flight (not recommended)")
    args = parser.parse_args()

    if args.runs < 5:
        print(f"--runs {args.runs} is below the minimum of 5; using 5.")
        args.runs = 5

    base_url = args.base_url.rstrip("/")

    print("=" * 94)
    print(f"RAG EVALUATION — milestone 6: stability over {args.runs} runs")
    print("=" * 94)
    print(f"  API        {base_url}")
    print(f"  visitor id {EVAL_VISITOR_ID}  (same as M4, on purpose)")
    print()

    if not args.skip_validation:
        if not run_m5_validation():
            print("\nM5 validation FAILED — the scorer is not trustworthy.")
            print("Stability numbers from a broken scorer would be misleading. Stopping.")
            return 2
        print()

    questions = json.loads(
        (HERE / "questions_answer_quality.json").read_text(encoding="utf-8")
    )["questions"]

    print("Ingesting corpus once, then querying repeatedly.")
    print("The corpus is NOT re-uploaded between runs: re-ingesting would add")
    print("retrieval variance on top of generation variance and confound the two.")
    upload_corpus(base_url)

    all_runs: list[list[dict]] = []
    try:
        for n in range(1, args.runs + 1):
            print(f"\n{'=' * 94}\nRUN {n} of {args.runs}\n{'=' * 94}")
            results = run_m4_suite(base_url, questions)
            all_runs.append(results)
            stats = aggregate(results)
            print(f"  -> composite {stats['composite_answer_quality']:.2f}"
                  f"   citation {stats['citation_discipline']:.2f}"
                  f"   statuses {stats['statuses']}")
            if n < args.runs:
                time.sleep(1.0)
    finally:
        print("\nTeardown")
        try:
            clear_workspace(base_url)
        except Exception as exc:
            print(f"  cleanup failed: {exc}")

    # ---- metric-level stability -------------------------------------------
    per_run = [aggregate(r) for r in all_runs]
    metric_stats = {}
    for metric in METRICS:
        key = "composite_answer_quality" if metric == "composite" else metric
        metric_stats[metric] = summarise_metric([s[key] for s in per_run])

    print("\n" + "=" * 94)
    print(f"STABILITY ACROSS {args.runs} RUNS")
    print("=" * 94)
    print(f"{'metric':<22}{'mean':>8}{'min':>8}{'max':>8}{'range':>8}{'stdev':>8}  verdict")
    print("-" * 94)
    for metric in METRICS:
        s = metric_stats[metric]
        verdict = "UNSTABLE" if s["range"] > INSTABILITY_THRESHOLD else "stable"
        print(f"{metric:<22}{s['mean']:>8.2f}{s['min']:>8.2f}{s['max']:>8.2f}"
              f"{s['range']:>8.2f}{s['stdev']:>8.3f}  {verdict}")

    # ---- case-level stability ---------------------------------------------
    by_case: dict[str, list[dict]] = {}
    for results in all_runs:
        for r in results:
            by_case.setdefault(r["id"], []).append(r)

    print("\nCASES THAT CHANGED BETWEEN RUNS")
    print("-" * 94)
    unstable_cases, defects = [], []
    for case_id, runs in sorted(by_case.items()):
        kind = classify_instability(runs)
        if kind == "stable":
            continue
        composites = [r["composite"] for r in runs]
        statuses = [r["status"] for r in runs]
        entry = {
            "id": case_id,
            "kind": kind,
            "composites": [round(c, 4) for c in composites],
            "range": round(max(composites) - min(composites), 4),
            "statuses": statuses,
            "grade_changed": len(set(statuses)) > 1,
        }
        unstable_cases.append(entry)
        if kind == "EVALUATOR DEFECT":
            defects.append(entry)

        grade = " GRADE CHANGED" if entry["grade_changed"] else ""
        print(f"  {case_id:<8} {kind:<18} composite {min(composites):.2f}-{max(composites):.2f}"
              f"  {statuses}{grade}")

    if not unstable_cases:
        print("  none — every case scored identically in every run")

    # ---- verdict ----------------------------------------------------------
    worst = max(metric_stats[m]["range"] for m in METRICS)
    unstable_metrics = [m for m in METRICS
                        if metric_stats[m]["range"] > INSTABILITY_THRESHOLD]

    print("\n" + "=" * 94)
    print("VERDICT")
    print("=" * 94)
    if defects:
        print(f"  {len(defects)} EVALUATOR DEFECT(S): identical answer text scored")
        print("  differently across runs. The scorer disagrees with itself — fix")
        print("  before trusting any number from this harness.")
    else:
        print("  No evaluator defects: every score change traced to changed model")
        print("  output, not to the scorer.")

    print()
    if unstable_metrics:
        print(f"  Unstable metrics (range > {INSTABILITY_THRESHOLD}): "
              f"{', '.join(unstable_metrics)}")
        print(f"  Widest swing: {worst:.2f}")
        print()
        print(f"  ONE RUN IS NOT SUFFICIENT. Quote a mean over >= {args.runs} runs")
        print("  with its range, and treat a delta smaller than the range as noise.")
    else:
        print(f"  Every metric held within {INSTABILITY_THRESHOLD} across {args.runs} runs.")
        print("  One run is a reasonable estimate; a range is still worth quoting.")

    # ---- save -------------------------------------------------------------
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    path = RESULTS_DIR / f"stability-{stamp}.json"
    path.write_text(json.dumps({
        "run_at_utc": datetime.now(timezone.utc).isoformat(),
        "base_url": base_url,
        "visitor_id": EVAL_VISITOR_ID,
        "runs": args.runs,
        "instability_threshold": INSTABILITY_THRESHOLD,
        "metric_stability": metric_stats,
        "per_run_summaries": per_run,
        "unstable_cases": unstable_cases,
        "evaluator_defects": defects,
        "all_runs": all_runs,
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nResults saved: {path}")

    # Exit non-zero ONLY for an evaluator defect. Model variance is a finding
    # to report, not a failure — it is the thing this milestone set out to
    # measure.
    return 1 if defects else 0


if __name__ == "__main__":
    sys.exit(main())
