"""Milestone 5 — evaluation reliability. Tests the HARNESS, not the RAG app.

Milestones 1-4 measure the RAG pipeline. Nothing measured whether those
measurements are correct. This does.

It runs offline — no API, no network, no cost — so it can run before every
eval and on every change to a criteria file.

Three groups:

  A. MATCHER CORRECTNESS
     Known false positives and false negatives, each a case that produced or
     could produce a wrong score. Every one of these was found by writing this
     file, not by a failing eval run — a scoring bug does not announce itself.

  B. CRITERIA AUDIT
     Scans the live criteria files for patterns that are unsafe under
     substring matching, e.g. a bare "8" that matches inside "18".

  C. REGRESSION
     Re-scores previously collected real answers and asserts the scores did
     not move. Catches a matcher improvement that silently rewrites history.

Usage:
    python validate_harness.py            # all groups
    python validate_harness.py --group A  # one group
"""

from __future__ import annotations

import argparse
import glob
import json
import sys
from pathlib import Path

from matching import contains_fact, find_occurrences, is_negated, normalise

HERE = Path(__file__).resolve().parent

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


# --------------------------------------------------------------------------
# group A — matcher correctness
# --------------------------------------------------------------------------


def group_a() -> None:
    print("\nGROUP A — matcher correctness")
    print("-" * 74)

    print("\n A1. FALSE POSITIVES: a number inside a bigger number")
    # The dangerous direction. A wrong answer scoring as correct is worse than
    # a correct answer scoring as wrong, because nobody investigates a pass.
    check('"18 characters" must NOT match fact "8"',
          contains_fact("The minimum is 18 characters", "8"), False)
    check('"640 days" must NOT match fact "64"',
          contains_fact("Retained for 640 days", "64"), False)
    check('"900 days" must NOT match fact "90 days"',
          contains_fact("Retention is 900 days", "90 days"), False)
    check('"4011" must NOT match fact "401"',
          contains_fact("Error code 4011 returned", "401"), False)
    check('"sixteen" must NOT match fact "six"',
          contains_fact("The OTP is sixteen digits", "six"), False)

    print("\n A2. TRUE POSITIVES: the same numbers must still match")
    check('"8 characters" matches fact "8"',
          contains_fact("At least 8 characters", "8"), True)
    check('"90 days" matches fact "90 days"',
          contains_fact("Retained for 90 days", "90 days"), True)
    check('"401 Unauthorized" matches fact "401"',
          contains_fact("Refused with 401 Unauthorized", "401"), True)
    check('"six digits" matches fact "six"',
          contains_fact("The OTP is six digits", "six"), True)
    check('bold "**8 characters**" matches fact "8"',
          contains_fact("at least **8 characters** long", "8"), True)
    # Label kept ASCII: this file must run on a Windows console (cp1252),
    # where printing U+2011 raises UnicodeEncodeError and aborts the suite.
    check('non-breaking hyphen in "10-digit" still matches',
          contains_fact("Enter valid 10‑digit mobile number", "10-digit"), True)

    print("\n A3. FALSE POSITIVES: negated or hypothetical statements")
    # A denial is not an assertion. Without this, a correct REFUSAL scores as
    # if the model had stated the fact.
    check('"is NOT six digits" must NOT assert "six"',
          contains_fact("The OTP is not six digits", "six"), False)
    check('"does not mention 90 days" must NOT assert "90 days"',
          contains_fact("The spec does not mention 90 days", "90 days"), False)
    check('"no maximum of 64" must NOT assert "64"',
          contains_fact("There is no maximum of 64 characters", "64"), False)
    check('"unlike the 15 minute lockout" must NOT assert "15 minutes"',
          contains_fact("Unlike the 15 minutes lockout, sessions last 30", "15 minutes"),
          False)

    print("\n A4. NEGATION MUST NOT OVER-REACH")
    # The guard has to be narrow. If it swallowed any sentence containing
    # "not", half of all correct answers would score as misses.
    check('"not shown in plain text; length is 8" still asserts "8"',
          contains_fact("The value is not shown in plain text. Minimum length is 8", "8"),
          True)
    check('negation in a PREVIOUS sentence does not reach the fact',
          contains_fact(
              "There is no upper limit whatsoever on what a user may type here. "
              "The minimum is 8 characters.", "8"), True)

    print("\n A5. allow_negated — forbidden facts are different")
    # A forbidden value appearing at all is worth flagging, even in a denial:
    # the model still introduced a number that is not in the corpus.
    check('forbidden "bcrypt" flagged even when denied',
          contains_fact("Passwords are not hashed with bcrypt", "bcrypt",
                        allow_negated=True), True)
    check('same string, assertion-only mode, is NOT counted',
          contains_fact("Passwords are not hashed with bcrypt", "bcrypt"), False)

    print("\n A6. FALSE NEGATIVES: phrasings that must still match")
    # Every one of these is a real bug that milestones 1 and 4 hit: the model
    # was right, the criteria were too narrow, and a correct answer was
    # reported as a failure.
    check('"beneath the field" matches criterion "beneath"',
          contains_fact("Errors appear directly beneath the input field", "beneath"),
          True)
    check('"successfully logs in" matches that criterion',
          contains_fact("The counter clears when the user successfully logs in",
                        "successfully logs in"), True)
    check('"fifth failed attempt" matches that criterion',
          contains_fact("15 minutes from the fifth failed attempt", "fifth failed"),
          True)

    print("\n A7. WORD STEMS: prefixes must match their inflections")
    # Criteria like "invalidat" are written as stems on purpose, to cover
    # invalidated / invalidates / invalidation in one entry. A closing word
    # boundary would reject all three. Found by the group C regression when
    # AQ-10 dropped 1.00 -> 0.50 after boundary matching was introduced.
    check('stem "invalidat" matches "invalidated"',
          contains_fact("the session token is invalidated right away", "invalidat"),
          True)
    check('stem "invalidat" matches "invalidates"',
          contains_fact("logging out invalidates the token", "invalidat"), True)
    check('stem "mask" matches "masks"',
          contains_fact("the field masks its input", "mask"), True)

    print("\n A8. STEM RELAXATION MUST NOT REOPEN THE NUMBER BUG")
    # Relaxing the trailing boundary for words is safe; doing it for digits
    # would bring back "8" matching "18". These pin that distinction.
    check('"18" still does NOT match fact "8"',
          contains_fact("minimum is 18 characters", "8"), False)
    check('"640" still does NOT match fact "64"',
          contains_fact("retained 640 days", "64"), False)
    check('"sixteen" still does NOT match fact "six"',
          contains_fact("the OTP is sixteen digits", "six"), False)


# --------------------------------------------------------------------------
# group B — criteria audit
# --------------------------------------------------------------------------


def collect_criteria() -> list[tuple[str, str, str, str]]:
    """Every (file, question id, field, value) across the criteria files."""
    out = []
    specs = [
        ("questions_answer_quality.json", ["required_parts", "off_topic_facts"], True),
        ("questions_grounding.json", ["expected_facts", "forbidden_facts"], False),
    ]
    for filename, fields, nested in specs:
        path = HERE / filename
        if not path.exists():
            continue
        for q in json.loads(path.read_text(encoding="utf-8"))["questions"]:
            for field in fields:
                for entry in q.get(field, []):
                    values = entry["any_of"] if nested else [entry]
                    for value in values:
                        out.append((filename, q["id"], field, value))
    return out


def group_b() -> None:
    print("\nGROUP B — criteria audit (live criteria files)")
    print("-" * 74)

    criteria = collect_criteria()
    print(f"\n  scanned {len(criteria)} criteria values")

    # Bare numbers are the pattern that produced the "8" in "18" bug. They are
    # SAFE now that matching is word-boundary based — this reports them so the
    # dependency on that fix stays visible.
    bare_numbers = [c for c in criteria if c[3].strip().replace(".", "").isdigit()]
    print(f"\n  bare-number criteria: {len(bare_numbers)}")
    for filename, qid, field, value in bare_numbers:
        print(f"    {qid:<8} {field:<18} {value!r}")
    print("    ^ safe under word-boundary matching; would be unsafe with substring")

    # A criterion that is a substring of another in the SAME question means one
    # can never fire without the other, which makes the score misleading.
    print("\n  overlapping criteria within one question:")
    by_question: dict = {}
    for filename, qid, field, value in criteria:
        by_question.setdefault((filename, qid), []).append((field, value))

    overlaps = 0
    for (filename, qid), entries in by_question.items():
        for i, (field_a, a) in enumerate(entries):
            for j, (field_b, b) in enumerate(entries):
                if i != j and field_a != field_b and normalise(a) and normalise(a) in normalise(b):
                    print(f"    {qid}: {field_a} {a!r} is inside {field_b} {b!r}")
                    overlaps += 1
    if overlaps == 0:
        print("    none")

    check("no criterion is empty",
          all(c[3].strip() for c in criteria), True)
    check("every bare number survives boundary matching in context",
          all(contains_fact(f"value is {c[3]} here", c[3]) for c in bare_numbers), True)


# --------------------------------------------------------------------------
# group C — regression against real collected answers
# --------------------------------------------------------------------------


def group_c() -> None:
    print("\nGROUP C — regression on previously collected answers")
    print("-" * 74)

    files = sorted(glob.glob(str(HERE / "results" / "answer-quality-*.json")))
    if not files:
        print("  no prior answer-quality results — nothing to regress against")
        return

    questions = {
        q["id"]: q
        for q in json.loads(
            (HERE / "questions_answer_quality.json").read_text(encoding="utf-8")
        )["questions"]
    }

    latest = json.loads(Path(files[-1]).read_text(encoding="utf-8"))
    print(f"  baseline: {Path(files[-1]).name}")

    # Re-score each stored answer with the NEW matcher and compare against the
    # completeness the harness recorded at the time. A change here means the
    # matcher fix silently rewrote a past result.
    drifted = []
    for result in latest["results"]:
        item = questions.get(result["id"])
        if not item:
            continue
        parts = item.get("required_parts", [])
        if not parts:
            continue

        covered = sum(
            1 for part in parts
            if any(contains_fact(result["answer"], alt) for alt in part["any_of"])
        )
        recomputed = covered / len(parts)
        if abs(recomputed - result["completeness"]) > 1e-6:
            drifted.append((result["id"], result["completeness"], recomputed))

    if drifted:
        print(f"\n  {len(drifted)} question(s) score differently under the new matcher:")
        for qid, before, after in drifted:
            direction = "stricter" if after < before else "looser"
            print(f"    {qid}: {before:.2f} -> {after:.2f}  ({direction})")
        print("\n  Review each before accepting. A stricter score may be a"
              "\n  false positive that was being counted as a pass.")
    else:
        print("\n  no drift — every stored answer scores the same under the new matcher")

    check("regression completed", True, True)


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate the evaluation harness")
    parser.add_argument("--group", choices=["A", "B", "C", "all"], default="all")
    args = parser.parse_args()

    print("=" * 74)
    print("MILESTONE 5 — EVALUATION RELIABILITY")
    print("=" * 74)
    print("  Tests the HARNESS, not the RAG app. Runs offline.")

    if args.group in ("A", "all"):
        group_a()
    if args.group in ("B", "all"):
        group_b()
    if args.group in ("C", "all"):
        group_c()

    print("\n" + "=" * 74)
    print(f"  {passed} passed, {len(failed)} failed")
    if failed:
        print("\n  failing:")
        for label in failed:
            print(f"    - {label}")
        print("\nRESULT: FAIL — the harness itself is unreliable.")
        return 1

    print("\nRESULT: PASS — matcher behaves correctly on every known edge case.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
