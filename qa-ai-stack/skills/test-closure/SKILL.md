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

### Step 0-PRE: Verification Contract (MANDATORY — applies to every statement in the report)

This skill produces a **client-facing** artefact: a traceability matrix, a counted coverage figure, and a ship verdict. A number stated here gets read as fact by people who will not re-derive it. That makes an assumption more expensive here than anywhere else in the pipeline.

**State nothing you have not read from a tool result in THIS run.**

| Kind of claim | What discharges it |
|---|---|
| A count (tests, ACs, defects, attachments) | Counted from a file or query result you actually read this run |
| A file exists (report, spec, screenshot) | A directory listing or read that returned it |
| A test passed or failed | The row in `progress.md` / `results.json`, not recollection |
| A Jira key, status, or summary | A tool result naming it — never a key you inferred from a pattern |
| A coverage percentage | `n/m` where both n and m were counted, never estimated |
| A URL is reachable | A response code you saw |

**Three hard prohibitions:**

1. **An unreadable result means UNKNOWN, never a value.** An archived MCP response, a failed read, a timed-out command — none of these are evidence of absence. Report the block; do not fill the hole.
2. **A plausible number is still a guess.** "18 tests" recalled from earlier in the conversation is a claim; the same figure counted from `results.json` this run is a fact. Prefer the second even when they agree.
3. **A tool printing "success" is not verification of the outcome.** `allure generate` reports success against a non-existent results dir. Verify the artefact, not the exit message.

**When you cannot verify something, say so in the report** — `[not verified — reason]`. A closure report that admits one unverified line is trustworthy. One that quietly rounds a gap into a number is not, and nobody can tell which they are holding.

This is the rulebook's own premise (strict verification, bounded scope of knowledge) applied to the reporting phase, and it sits above every step below.

---

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

### Step 4B: Attach the Evidence Report (OPTIONAL — only if Allure results exist)

**Skip entirely if `allure-results/` is absent.** This step never blocks closure and never becomes the oracle — `progress.md` execution rows remain the source of truth for pass/fail (Step 0).

Playwright projects configured per AH Rule 31 write per-run artefacts to `allure-results/{RUN_ID}/`. When present, generate a browsable evidence report and link it from the closure report:

```bash
# one run
npx allure generate allure-results/{RUN_ID} --clean -o allure-report/{RUN_ID}

# all retained runs — enables the trend/history graph
npx allure generate allure-results --clean -o allure-report
```

**Then SERVE it — generating alone is not delivering.** A generated report opened via `file://` leaves every widget stuck on "Loading..." forever: browsers block `fetch()` on file URLs. The report is fine; the transport is not. A closure that links an unviewable report has not produced evidence.

```bash
npx allure serve allure-results/{RUN_ID}     # generate + serve, prints the URL
# or, for an already-generated report:
npx allure open allure-report/{RUN_ID}
```

Run it in the background, capture the printed `http://127.0.0.1:{port}` URL, and **put that URL in the closure report AND in the summary to the user**. If the project defines its own script (`npm run allure:serve`), prefer it — it carries the project's own paths.

If serving fails or prints no port, say so plainly and link the file path with the `file://` caveat attached. Never imply a report is viewable when it is not.

**What to pull from it (evidence only, never verdicts):**

| Use for | Do NOT use for |
|---|---|
| Report path linked in the closure output | Deriving pass/fail — that comes from `progress.md` |
| Per-test duration (flags slow tests worth a perf AC) | Overriding a defect tier assigned by the `BR-xx` oracle |
| Screenshot/trace attachment links per test row | Inventing coverage a test did not actually assert |
| Trend across retained runs (a test that flips = FLAKY candidate, AH Rule 23) | Claiming a trend from a single run |

**Trend requires ≥2 retained run folders.** With one folder there is no history — say "single run, no trend available" rather than implying stability.

**If `allure-results/` exists but `allure` CLI is not installed:** note `[report not generated — allure CLI unavailable]` in the closure output and continue. Never fabricate report contents or a URL.

---

### Step 5: Output

Write to `output/closure-{EPIC-KEY}-{YYYY-MM-DD}.md`:

```markdown
# Test Closure Report — {EPIC-KEY}: {summary}

**Date:** {YYYY-MM-DD} · **Cycle:** {execution run timestamp from progress.md}
**Spec:** {spec path} · **Source:** progress.md run {timestamp}
**Evidence report:** {allure-report/{RUN_ID}/index.html — or "not generated"}

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
- ✅ **Verification contract (Step 0-PRE) honoured** — every count, file path, Jira key and status in the report was read from a tool result THIS run. Anything unverifiable is marked `[not verified — reason]`, never rounded into a number
- ✅ **Every artefact the report links was confirmed to exist AND be non-empty** — a generator printing "success" is not proof (`allure generate` reports success against a missing results dir). Verify the artefact, not the exit message
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

## Lessons

❌ **Don't:** Stop at `allure generate` and link the resulting `index.html` path in the closure report. A generated report opened via `file://` shows "Loading..." on every widget forever — browsers block `fetch()` on file URLs. Linking it looks like evidence was delivered when nothing is viewable.
✅ **Do:** Generate THEN serve (`npx allure serve allure-results/{RUN_ID}`, or the project's own `npm run allure:serve`), capture the printed `http://127.0.0.1:{port}`, and put that URL in both the closure report and the summary to the user. Step 4B is not complete at generate.
*(Lesson — 2026-08-24, SCRUM-694: the report generated fine and was linked by file path, but was never served, so it could not actually be opened. The project's own CLAUDE.md documented `npm run allure:serve` and the `file://` trap; Step 4B said only "generate". The local project rule and the skill disagreed — the skill was the one missing the step.)*
