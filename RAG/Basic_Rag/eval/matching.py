"""Shared fact-matching for the evaluation harness.

WHY THIS FILE EXISTS. Milestones 1-4 each grew their own copy of "is this fact
present in this text?". All of them used a plain substring check, which has two
failure modes that silently corrupt scores:

  FALSE POSITIVE (number inside a number)
      fact "8"  matches "18 characters"    -> wrong answer scores as correct
      fact "64" matches "640 characters"   -> a hallucination goes undetected

  FALSE POSITIVE (negated or hypothetical statement)
      fact "six" matches "The OTP is NOT six digits."
      fact "90 days" matches "The spec does not mention 90 days."
      -> a refusal or a denial scores as if it asserted the fact

Both were found by milestone 5's validation suite, not by a failing eval run —
which is the point: a scoring bug does not announce itself, it just quietly
reports the wrong number.

The fix is word-boundary matching plus a negation guard, in one place that
every milestone imports. Milestones 1-4 keep their own goals and criteria
untouched; only the matching primitive is shared.
"""

from __future__ import annotations

import re

# Phrases that flip the meaning of a nearby fact. If one appears within
# NEGATION_WINDOW characters BEFORE the fact, the text is denying or
# questioning the fact rather than asserting it.
NEGATION_CUES = [
    "not ", "no ", "never ", "cannot ", "can't ", "isn't ", "doesn't ",
    "does not ", "did not ", "didn't ", "without ", "unlike ", "rather than ",
    "instead of ", "unclear whether", "unsure whether",
]

# How far back to look for a negation cue. Sized to catch "The spec does not
# mention 90 days" (cue 11 chars before the fact) without reaching into a
# previous sentence that legitimately negated something else.
NEGATION_WINDOW = 40

# Criteria that are deliberate word STEMS rather than complete words. These
# match their own inflections: "invalidat" covers invalidated, invalidates
# and invalidation.
#
# Everything not listed here gets a closing word boundary, which is the safe
# default — "six" must not match "sixteen".
#
# ADD A STEM HERE ONLY AFTER SEEING A REAL ANSWER IT SHOULD HAVE MATCHED.
# Adding one speculatively widens what counts as a pass, and a criterion that
# passes too easily is worse than one that is slightly too strict: nobody
# investigates a green result.
WORD_STEMS = {
    "invalidat",   # invalidated / invalidates / invalidation
    "mask",        # masks / masked / masking
    "reset",       # resets / resetting
    "expire",      # expires / expired
    "navigat",     # navigates / navigation
}


def normalise(text: str) -> str:
    """Flatten typography the model varies between runs.

    It writes "10-digit", "10 digit" and "10‑digit" (non-breaking hyphen)
    interchangeably and wraps values in ** for bold. Without this, correct
    answers fail on punctuation rather than on content.
    """
    lowered = text.lower()
    for ch in ("‑", "–", "—"):
        lowered = lowered.replace(ch, "-")
    lowered = lowered.replace(" ", " ").replace(" ", " ")
    lowered = lowered.replace("*", "").replace("“", '"').replace("”", '"')
    lowered = re.sub(r"[-_]", " ", lowered)
    return re.sub(r"\s+", " ", lowered).strip()


def _boundary_pattern(fact: str) -> re.Pattern:
    """Build a word-boundary regex for a fact.

    `re.escape` keeps values like "3:1" and "4.5" literal. `\\b` on each end
    stops "8" matching inside "18" and "64" inside "640".

    A fact that starts or ends with a non-word character (":", "%") cannot
    carry a word boundary there, so the boundary is applied only on the sides
    where it is meaningful — otherwise the pattern would never match.

    THE TRAILING BOUNDARY IS OPT-OUT, VIA AN EXPLICIT STEM LIST. Two real
    cases pull in opposite directions:

        "invalidat"  is a deliberate STEM, written to catch invalidated /
                     invalidates / invalidation in one criterion. A closing
                     \\b rejects all three -> false negative (AQ-10 dropped
                     1.00 -> 0.50 when boundary matching was introduced).

        "six"        is a COMPLETE WORD. Without a closing \\b it matches
                     "sixteen" -> false positive, the dangerous direction.

    There is no reliable way to tell these apart from the string alone, and
    guessing produces one bug or the other. So stems are declared explicitly
    in WORD_STEMS below. A criterion not on that list gets both boundaries —
    the safe default, because a false negative is investigated and a false
    positive is not.
    """
    clean = normalise(fact)
    escaped = re.escape(clean)
    left = r"\b" if re.match(r"\w", clean) else ""

    is_stem = clean in WORD_STEMS
    right = "" if is_stem else (r"\b" if re.search(r"\w$", clean) else "")

    return re.compile(left + escaped + right)


def find_occurrences(text: str, fact: str) -> list[int]:
    """Positions where the fact appears as a whole token."""
    return [m.start() for m in _boundary_pattern(fact).finditer(normalise(text))]


def is_negated(text: str, position: int) -> bool:
    """Is the fact at this position being denied rather than asserted?"""
    window = normalise(text)[max(0, position - NEGATION_WINDOW):position]
    return any(cue in window for cue in NEGATION_CUES)


def contains_fact(text: str, fact: str, *, allow_negated: bool = False) -> bool:
    """Does this text ASSERT this fact?

    Word-boundary matched, and by default an occurrence inside a negation is
    not counted — "The OTP is not six digits" does not assert "six".

    `allow_negated=True` restores plain presence checking, for the one case
    where it is correct: a FORBIDDEN fact appearing at all is worth flagging
    even in a denial, because the model still introduced the value.
    """
    positions = find_occurrences(text, fact)
    if not positions:
        return False
    if allow_negated:
        return True
    return any(not is_negated(text, pos) for pos in positions)
