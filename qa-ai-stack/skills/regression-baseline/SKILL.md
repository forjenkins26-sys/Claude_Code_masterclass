---
name: regression-baseline
description: Run-history store and run-over-run regression diff for Playwright execution results. Parses /test-case-execution blocks out of progress.md into an append-only run history, resolves a composite build identity for the target URL, sets a baseline run, and computes a machine-checkable regression verdict (REGRESSION / FIXED / KNOWN / NEW). Use when the user says "/regression-baseline", "did anything regress", "compare this run to the last one", "set baseline", "run history", "regression report", or after /test-case-execution when someone asks whether a failure is new. Read-only on progress.md — never writes results, never edits the KB oracle.
improvements: 0
---

# Regression Baseline — run history + regression diff

Answers one question your stack could not previously answer mechanically:
**"is this failure new, or did we already know about it?"**

`progress.md` records every run, but comparing two runs meant reading 1100 lines
by eye. This turns that into a counted diff with an exit code.

> **Why this exists:** gap found 2026-09-14 reverse-engineering a public "QA
> Orchestrator" (`/api/runs/{id}/regression`, `set-baseline`, `compare/{a}/{b}`).
> Run-over-run comparison was the one genuinely missing capability — adopted for
> real observed pain, not feature parity (karpathy Guideline 5). Its SaaS shell,
> auto-file-every-failure bug agent, and mechanical scoring were deliberately
> NOT copied — we already have a KB bug oracle and LLM-as-Judge.

## Hard rules

1. **`progress.md` stays the oracle.** This skill never writes to it, never
   invents a result. An unparsable block is *reported*, never guessed (AH Rule 30).
2. **Build identity is a composite, never a bare ETag.** Verified 2026-09-14 on
   `blinkit-demo-qa.vercel.app`: ETag `6fd46ec3818f08374b290e4e4d601830` was
   **identical** on 2026-08-23, 08-24 and 09-14, while `Last-Modified` moved to
   Sep 14. ETag alone ⇒ "same build" forever ⇒ stale results wrongly kept valid.
   `build_id = sha256(etag | last-modified | content-length)`.
3. **UNKNOWN is never SAME.** A target exposing no identity headers (real case,
   `progress.md:752`) is treated as CHANGED — results expired, never trusted.
4. **Append-only.** `set-baseline` moves a pointer and records `previous`;
   it never rewrites history. Overwriting silently reframes future verdicts.
5. **Never auto-edits `business-rules.md`** or any KB oracle file (AH Rule 30).

## Store

```
knowledge-base/<PROJECT>/run-history.jsonl   append-only, one run per line
knowledge-base/<PROJECT>/run-baseline.json   pointer + build identity + previous
```

## Usage

```bash
S=qa-ai-stack/skills/regression-baseline/scripts

# what does progress.md actually contain? (read-only, no writes)
node $S/regression-baseline.js parse --progress=progress.md

# seed / refresh the store
node $S/regression-baseline.js seed --progress=progress.md --kb=knowledge-base/SCRUM

# pick the run everything is measured against
node $S/regression-baseline.js set-baseline --kb=knowledge-base/SCRUM --run=<run_id>

# did anything regress?
node $S/regression-baseline.js regression --kb=knowledge-base/SCRUM --to=<run_id>
node $S/regression-baseline.js diff --kb=knowledge-base/SCRUM --from=<id> --to=<id>

# resolve a live build identity
node $S/build-identity.js https://your-app.example.com --json

# static HTML dashboard over the run store (read-only, no server, no keys)
node $S/dashboard.js --kb=knowledge-base/SCRUM --out=output/qa-dashboard.html
```

## Dashboard (`dashboard.js`)

A single self-contained HTML file built from `run-history.jsonl`. No server, no
build step, no API keys, no network calls — open the file directly.

**What it deliberately refuses to draw.** It does NOT plot one pass-rate line
across every run. Verified on the real store (2026-09-14): 17 runs span **16
distinct epics** with test counts from 13 to 31, and only SCRUM-121 has more
than one run. A single series would place SCRUM-299 (10/16) beside SCRUM-545
(25/31) as though one followed the other and read as a declining quality trend
that does not exist. So:

| Situation | Rendering |
|---|---|
| Epic with 2+ runs | Sparkline — a real trend |
| Epic with 1 run | Card marked "single run — no trend", never connected |
| Run with no build identity | `NONE` / `NO BUILD ID` in red, never hidden |
| Two runs, same build, PASS→FAIL | **REGRESSION** — "code got worse" |
| Two runs, different build, PASS→FAIL | **DIFFERENCE — NOT proven regressions**, baseline expired |

No composite "quality score" is computed. A blended percentage across
incomparable suites looks authoritative and means nothing.

The regression panel calls `diffRuns()` from `regression-baseline.js` rather
than recomputing verdicts in the page, so the HTML and the CLI cannot disagree —
verified: both report the same 3 KNOWN rows and "no regressions" for SCRUM-121.

**Exit codes:** `0` no regressions · `1` one or more REGRESSION/NEW_FAILURE · `2` bad input.

## Verdict vocabulary

| Verdict | Meaning | Action |
|---|---|---|
| `REGRESSION` | was passing, now FAILED/BLOCKED | investigate first — this is the signal |
| `NEW_FAILURE` | new test id, already failing | triage as a fresh finding |
| `FIXED` | was FAILED/BLOCKED, now passing | confirm the bug can be closed |
| `KNOWN` | failing in both runs | dedup against `known-defects.md`, do not re-file |
| `NEW` / `DROPPED` | test appeared / no longer recorded | check coverage drift |

## Instructions

### Step 1 — Parse before trusting
Run `parse` first. It prints countable runs and flags unparsable blocks with
line numbers. If a block you care about is unparsable, fix the block format in
`progress.md` (or report it) — do **not** work around it by inventing results.

### Step 2 — Check build identity
Resolve the target's current identity with `build-identity.js`. Compare against
the baseline's recorded build. If `CHANGED` or `UNKNOWN`, say so plainly in the
report: **baseline results are expired and are not evidence.**

### Step 3 — Diff and report
Run `regression`. Report the counted verdict table. Lead with REGRESSION rows —
those are the only ones that block a release. Cross-check `KNOWN` rows against
`known-defects.md` before anything gets filed again.

### Step 4 — Hand off, do not decide
This skill reports. It does not transition Jira, does not file bugs, does not
set a release verdict. `/test-closure` owns go/no-go; a human owns sign-off.

## Verified on real data (2026-09-14)

- 15/15 `/test-case-execution` blocks in `progress.md` parsed, 0 unparsable
- itemised BLOCKED counts matched the stated `**Results:**` aggregate **14/14 runs**
- three real parser defects found and fixed during verification:
  inner `## Session Score:` headings truncating a block (dropped 4 blocked tests
  on SCRUM-694) · multi-test bullets (`ML-006 + ML-007`) recording only one id ·
  `BR-xx`/`AC-x` rule refs being miscounted as test ids (inflated SCRUM-603 4→9)
- real diff SCRUM-694 → SCRUM-722 produced: 1 NEW_FAILURE, 3 KNOWN, 1 FIXED, exit 1
