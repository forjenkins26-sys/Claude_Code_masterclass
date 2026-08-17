# Requirement Gap-Analysis Checklist

Run against the requirement source **before** scenario generation (Step 3).

**Source-agnostic:** Mode A = Epic ACs · Mode C = retrieved doc chunks · Mode B = N/A (no requirement source — skip, everything is already "VERIFICATION REQUIRED").

Score every row:
- ✅ **present** — stated and testable
- ⚠️ **ambiguous** — mentioned but not pass/fail observable
- ❌ **missing** — not addressed at all

**Every ⚠️ and ❌ becomes a row in the Step 7 Requirement Gap Report.**

---

## Functional
- [ ] Clear user story / goal
- [ ] Acceptance criteria testable (observable pass/fail)
- [ ] Happy path fully described
- [ ] Negative / error paths described (bad input, failure responses)
- [ ] Boundary & empty states (0, 1, max, empty list, null)
- [ ] State transitions / workflow steps enumerated

## Data & Environment
- [ ] Required test data specified or derivable
- [ ] Environment / config / feature flags named
- [ ] External dependencies & integrations listed
- [ ] Preconditions / setup stated

## Non-functional (most often missing)
- [ ] Performance / load expectations
- [ ] Security / authorization (which roles can and cannot)
- [ ] Accessibility (a11y) expectations
- [ ] Internationalization / localization
- [ ] Audit / logging / observability

## Cross-cutting
- [ ] Impact on existing features (regression surface)
- [ ] Backward compatibility / migration
- [ ] Mobile / responsive / browser matrix
- [ ] Rollback / feature-flag behavior

## Clarity
- [ ] No ambiguous wording ("should", "etc.", "handle gracefully")
- [ ] Terms defined consistently
- [ ] Mockups / designs linked and match the text

---

## Core Rule

**A missing AC is a finding, not a blank to fill.**

Never invent a requirement to close a ❌. Never write an assertion whose expected
value came from your own inference rather than the requirement source. If the Epic
or doc does not state the expected behavior, the gap is the deliverable — report it
in Step 7 and, where a test is still warranted, mark it `// VERIFICATION REQUIRED`
per AH Rule 4.

## Feeding the checklist forward

| Score | What it produces |
|---|---|
| ✅ | Normal scenario generation (Step 3), assertion cites the AC/chunk |
| ⚠️ | Scenario generated + flagged `AMBIGUOUS` + question for ticket author in Step 7 |
| ❌ | **No invented scenario.** Step 7 gap row + question for ticket author |

**Cross-check against the Knowledge Base (Step 1A):** a ❌ here that `business-rules.md`
already answers with a `BR-xx` rule is not a true gap — cite the `BR-xx` as the assertion
baseline and mark the row ✅ (KB-sourced). Only genuinely unanswered rows are gaps.

## Relationship to Step 7

Step 7 compares **requirement vs UI** (element missing, label mismatch).
This checklist scans **requirement vs completeness** (is the requirement itself
sufficient to test from). Both feed the same Step 7 gap report — different axes,
no overlap.
