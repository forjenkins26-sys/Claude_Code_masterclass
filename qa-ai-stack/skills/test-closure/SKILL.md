---
name: test-closure
description: Close out a test cycle for an Epic — build a requirement-to-test traceability matrix, compute real coverage, list open defects, and issue a go/no-go ship recommendation. Reads progress.md execution rows + Jira + knowledge-base; never invents a result. Use when user says "/test-closure SCRUM-255", "close out this epic", "are we ready to ship", "coverage report", "go/no-go", "traceability matrix", or after a full test run when someone asks whether the feature can be released.
license: MIT
metadata:
  author: Anand Soni
  stlc-phase: Test Closure
  version: 1.0.0
---

# Test Closure

You answer one question: **"can this ship, and what is the evidence?"**

Coverage is computed from recorded execution results, never estimated. A requirement with no test row is an uncovered requirement — say so. The recommendation is advisory; a human owns release sign-off.

## RICEPOT Framework (Applied Every Run)

- **R**ole: QA lead closing a test cycle and briefing a release decision
- **I**nput: Epic key (+ optional spec path); `progress.md`; Jira; `knowledge-base/<PROJECT>/`
- **C**ontext: BLAST closure phase — the run already happened, this reports on it
- **E**xamples: coverage matrix + defect summary + go/no-go block (below)
- **P**ersona: evidence-first, states uncovered ACs plainly, does not soften a no-go
- **O**utput: markdown closure report, optionally posted to the Epic as a Jira comment
- **T**one: factual, no filler, every number traceable to a source row

## Rules Applied

### Anti-Hallucination
- **AH Rule 30** — recalled memory is a claim, not a fact. Re-read `progress.md` every run; never report a result from conversation memory.
- **AH Rule 25** — KB `business-rules.md` is the bug oracle; cite `BR-xx` when classifying a defect as Confirmed.
- **Never invent a test result.** No row in `progress.md` = `NOT RUN`, not an assumed pass.
- **Never invent an AC.** ACs come from the Epic or the Step 1C gap scan. A missing AC is a finding.
- **No estimated percentages.** Every number is `counted / counted`. If it can't be counted, print `UNKNOWN` and say why.

### Guardrails
- The report is a **recommendation**. A human owns release sign-off.
- NO-GO is a valid, expected output. Do not soften it to please the reader.
- An untested non-functional dimension (perf, authz, a11y) is an explicit coverage gap even when every functional test passed.

---

## Instructions

### Step 0: Load Sources (MANDATORY — in this order)

**1. `progress.md`** — the only source of truth for what actually ran.
```
Read: C:\ClaudeCodeMasterclass\progress.md
```
Find the most recent `/test-case-execution {EPIC-KEY}` block. Parse its result table:

| Column | Meaning |
|---|---|
| Test ID | `OD-008` — the join key to the AC |
| Jira | `SCRUM-263` — the test case issue |
| Result | ✅ PASS / ❌ FAIL / ⏭️ SKIP / 🚫 BLOCKED |
| Notes | failure reason; `REAL BUG — Bug: SCRUM-269` names the filed defect |

Also capture the header lines: `Total`, `Passed`, `Failed`, and any `Bug Filed` / `Fix Applied` lines.

**If no execution block exists for this Epic → STOP.** Report "no recorded execution — run `/test-case-execution {EPIC}` first." Do not build a matrix from test cases alone; an unrun suite has 0% coverage, not 100%.

**If multiple execution blocks exist** → use the most recent by timestamp. Note the earlier run dates in the report as prior cycles.

**2. Epic + child test cases from Jira:**
```
ToolSearch: select:mcp__atlassian__getJiraIssue,mcp__atlassian__searchJiraIssuesUsingJql
```
```json
mcp__atlassian__getJiraIssue({ "cloudId": "anandsoni2641.atlassian.net", "issueIdOrKey": "{EPIC-KEY}" })
```
Extract the **acceptance criteria lines** — these are the requirement rows of the matrix. Number them `AC-1..AC-n` in the order they appear.

Then fetch children for status reconciliation:
```
searchJiraIssuesUsingJql: parent = {EPIC-KEY}
```

**3. Knowledge base** (`knowledge-base/<PROJECT>/`, default `SCRUM`):
- `business-rules.md` — cite `BR-xx` when a defect Confirms a rule violation
- `known-defects.md` — separate pre-existing open defects from ones this cycle found
- `feature-map.md` — the `Used by` chain, for the regression-risk note

If absent → continue silently (KB is additive).

**4. Step 1C gap scan output** — if the creation run recorded requirement-completeness gaps (⚠️/❌ rows), carry them in as **uncovered dimensions**. A ❌ non-functional row means that dimension has no tests by construction.

---

### Step 1: Build the Traceability Matrix

Join on Test ID. One row per AC.

```markdown
| AC | Requirement | Test IDs | Result | Status |
|---|---|---|---|---|
| AC-1 | Order ID displayed on load | OD-001 | ✅ PASS | COVERED |
| AC-8 | Cancel only in Placed/Confirmed | OD-008 | ❌ FAIL | DEFECT (SCRUM-269) |
| AC-11 | Response under 2s | — | — | NOT COVERED |
```

**Status values — assign exactly one:**

| Status | Condition |
|---|---|
| `COVERED` | ≥1 test, all passed |
| `DEFECT` | ≥1 test, ≥1 failed with a filed bug |
| `PARTIAL` | ≥1 test passed, but AC has sub-conditions no test hits |
| `BLOCKED` | tests exist but couldn't run (dependency/env) |
| `NOT COVERED` | **no test row exists for this AC** |

**Reverse-check — orphan tests:** any Test ID in `progress.md` that maps to no AC. Either the AC list is incomplete or the test is out of scope. List them; do not silently drop them.

---

### Step 2: Compute Coverage (counted, never estimated)

```
Requirement coverage = ACs with ≥1 test / total ACs
Pass rate            = PASS rows / executed rows
Execution rate       = executed rows / total test cases
```

Print each as `n/m (xx%)`. Show the fraction — a bare percentage hides a tiny denominator.

**Non-functional coverage** — report separately, it is the dimension that silently reads 100%:

| Dimension | Covered? | Evidence |
|---|---|---|
| Security / authorization | ❌ | no test rows |
| Performance | ❌ | Step 1C scored ❌ — no AC stated |
| Accessibility | ❌ | not in scope this cycle |

---

### Step 3: Defect Summary

From `progress.md` Notes + Jira + `known-defects.md`:

```markdown
| Bug | Summary | Severity | Status | Blocks AC | Tier |
|---|---|---|---|---|---|
| SCRUM-269 | Cancel visible in Dispatched | P2/High | Open | AC-8 | Confirmed (violates BR-08) |
```

**Tier** per AH Rule 25 — `Confirmed` (cites a `BR-xx`) or `[SUSPECTED]`. Separate **found this cycle** from **pre-existing open** (already in `known-defects.md`).

---

### Step 4: Go/No-Go Recommendation

Apply in order. First match wins.

| Verdict | Criteria |
|---|---|
| 🔴 **NO-GO** | any open P0/Critical/Blocker · requirement coverage <80% · any `BLOCKED` AC on a critical path |
| 🟡 **GO WITH RISK** | no P0 · open P1/P2 on non-critical paths · coverage ≥80% · every gap named |
| 🟢 **GO** | no open defects above P3 · coverage ≥95% · no `NOT COVERED` AC on a critical path |

State the verdict, the rule that triggered it, and what would change it.

```markdown
## Verdict: 🟡 GO WITH RISK

**Triggered by:** open P2 (SCRUM-269) on a non-critical path; coverage 12/13 (92%).
**Ship risk:** users can attempt cancel on a Dispatched order — AC-8 / BR-08 violation.
**Not covered:** perf, authz, a11y — no ACs stated, no tests exist.
**To reach GO:** fix SCRUM-269, re-run OD-008.
```

---

### Step 5: Output

Write to `output/closure-{EPIC-KEY}-{YYYY-MM-DD}.md`:

```markdown
# Test Closure Report — {EPIC-KEY}: {summary}

**Date:** {YYYY-MM-DD} · **Cycle:** {execution run timestamp from progress.md}
**Spec:** {spec path} · **Source:** progress.md run {timestamp}

## Verdict: {🟢 GO / 🟡 GO WITH RISK / 🔴 NO-GO}
{trigger rule, ship risk, what would change it}

## Coverage
Requirements: {n/m (xx%)} · Pass rate: {n/m (xx%)} · Execution: {n/m (xx%)}

## Traceability Matrix
{Step 1 table}

## Non-Functional Coverage
{Step 2 table}

## Defects
{Step 3 table}

## Uncovered / Open Questions
- {NOT COVERED ACs}
- {Step 1C ⚠️/❌ rows still unanswered}
- {orphan tests}

## Regression Note
{feature-map.md `Used by` chain — what else this feature can break}
```

**If user asks to post to Jira:**
```
ToolSearch: select:mcp__atlassian__addCommentToJiraIssue
```
Post to the Epic. Never transition the Epic to Done automatically — release sign-off is the human's.

---

## Quality Gates

Before finishing:
- ✅ `progress.md` re-read this run (AH Rule 30) — no result from memory
- ✅ Every matrix row traces to a real `progress.md` result row or is marked `NOT COVERED`
- ✅ No invented test result, no invented AC
- ✅ Coverage shown as counted fractions, not bare percentages
- ✅ Non-functional coverage reported separately
- ✅ Defects tiered Confirmed / `[SUSPECTED]`; pre-existing separated from this cycle
- ✅ Verdict states its trigger rule + what would change it
- ✅ Orphan tests listed, not dropped
- ✅ Appended to `progress.md`

## BLAST Progress Logging

Append to `C:\ClaudeCodeMasterclass\progress.md`:

```markdown
## {YYYY-MM-DD HH:MM} — /test-closure {EPIC-KEY}

**Epic:** {key} — {summary}
**Verdict:** {GO / GO WITH RISK / NO-GO} — {trigger}
**Coverage:** {n/m ACs} · **Pass rate:** {n/m}
**Open Defects:** {keys or "none"}
**Not Covered:** {list or "none"}
**Report:** output/closure-{EPIC-KEY}-{date}.md
```

Do NOT overwrite — always append.

## Usage Examples

```
/test-closure SCRUM-255
/test-closure SCRUM-255 post to jira
/test-closure SCRUM-121
```

## Anti-patterns

| ❌ Don't | ✅ Do |
|---|---|
| "Coverage looks good, ~90%" | `12/13 ACs (92%)` — counted |
| Assume unrun test = pass | `NOT RUN` |
| Build a matrix with no execution block | STOP, tell user to run execution first |
| Report 100% coverage ignoring non-functional | Separate non-functional table |
| Soften NO-GO because the team wants to ship | State the verdict and its trigger |
| Auto-transition the Epic to Done | Recommend; human signs off |
| Drop a test that maps to no AC | List it as an orphan |
