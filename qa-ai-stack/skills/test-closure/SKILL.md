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

### Step 4B: Attach the Evidence Report (OPTIONAL — only if Allure results exist)

**Skip entirely if `allure-results/` is absent.** This step never blocks closure and never becomes the oracle — `progress.md` execution rows remain the source of truth for pass/fail (Step 0).

Playwright projects configured per AH Rule 31 write per-run artefacts to `allure-results/{RUN_ID}/`. When present, generate a browsable evidence report and link it from the closure report:

```bash
# one run
npx allure generate allure-results/{RUN_ID} --clean -o allure-report/{RUN_ID}

# all retained runs — enables the trend/history graph
npx allure generate allure-results --clean -o allure-report
```

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

### Step 4C: Auto-Open the Evidence Report (MANDATORY when Step 4B generated a report)

Closure is not finished until the human can SEE the evidence. A path in a markdown file is not evidence delivered — the report must be open in a browser tab by the time the summary is reported.

**Run as the LAST action of the closure run**, after the report file is written (Step 5) and `progress.md` is appended:

```bash
npx allure open allure-report --port 8800    # background it — the server blocks
```

`allure open` starts a local web server AND launches the default browser at that URL. Both are required: Allure is a single-page app that fetches `widgets/*.json` over HTTP, so opening `index.html` from `file://` renders a blank page. Never hand the user a raw `file://` path or tell them to double-click `index.html`.

**Rules:**
- Run it **backgrounded** — the server stays alive for the session; a foreground call hangs the run.
- Verify it actually came up before reporting success: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8800/` → expect `200`. Never claim the report opened without this check.
- **Port in use?** Increment (8801, 8802…) and retry once. Report the port actually used.
- Prefer the **aggregate** report (`allure-report/`, all retained runs) — it carries the trend graph. Fall back to the per-run folder if only that exists.
- Always print the live URL in the summary, so the user can reopen it after closing the tab.
- **Never block closure on this.** If the server fails to start, report `[report generated but not served — {reason}]` plus the manual command, and continue. The verdict does not depend on it.

**Check the npm script target before using it.** `npm run allure:open` may point at `allure-report/` while Step 4B generated `allure-report/{RUN_ID}/` — mismatched paths fail. Either generate the aggregate first (`npm run allure:generate`) or call `npx allure open` on the folder that actually exists.

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
- ✅ `progress.md` re-read this run (AH Rule 30) — no result from memory
- ✅ Every matrix row traces to a real `progress.md` result row or is marked `NOT COVERED`
- ✅ No invented test result, no invented AC
- ✅ Coverage shown as counted fractions, not bare percentages
- ✅ Non-functional coverage reported separately
- ✅ Defects tiered Confirmed / `[SUSPECTED]`; pre-existing separated from this cycle
- ✅ Verdict states its trigger rule + what would change it
- ✅ Orphan tests listed, not dropped
- ✅ Appended to `progress.md`
- ✅ **Allure report auto-opened (Step 4C)** — server verified `200`, live URL printed in the summary. If it couldn't be served, the reason and the manual command are stated.

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

❌ **Don't:** End a closure run with only a file path to the Allure report in the markdown output. A path is not delivered evidence — the user has to hunt for it, and `file://` on `index.html` renders a blank page because Allure fetches `widgets/*.json` over HTTP. Also don't assume `npm run allure:open` matches whatever Step 4B generated; the script may target `allure-report/` while the run produced `allure-report/{RUN_ID}/`.
✅ **Do:** Auto-open the report as the final action of every closure run (Step 4C) — `npx allure open allure-report --port 8800`, backgrounded, verified with a `200` check, live URL printed in the summary. Generate the aggregate first if the npm script points there. Never block the verdict on it: if serving fails, state the reason plus the manual command and continue.
*(Lesson #1 — 2026-08-19: QA asked "where is the allure report" on a closure whose report WAS generated and referenced twice — the paths were plain backticks, unclickable, and the server was never started. Fix: serve + open automatically, don't just cite a path.)*

❌ **Don't:** Treat `allure generate`'s "Report successfully generated" message — or the existence of `index.html` — as proof the report has data. It prints that on success even when it found ZERO results, producing a browsable shell whose Overview reads 0 tests. Nor assume `allure generate allure-results` picks up per-run subfolders: it scans only the TOP level for `*-result.json`, so a config writing to `allure-results/{RUN_ID}/` (AH Rule 31) yields an empty report every time. Shell globs (`allure-results/*`) don't rescue it — npm on Windows passes the `*` through unexpanded and the CLI errors.
✅ **Do:** After generating, **verify `widgets/summary.json` has `statistic.total > 0`** before reporting the report as ready or linking it. Pass run folders explicitly (`allure generate allure-results/exec-338 allure-results/smoke ...`) or enumerate them in a helper script. `total: 0` means the path was wrong, not that the suite was empty — check the raw `*-result.json` count under each run folder to confirm.
*(Lesson #2 — 2026-08-19: QA asked "why 0 details, why is overview not showing" on a report reported as generated. Both the aggregate AND per-run reports were empty shells; 13 valid result files existed the whole time. Root cause: generate pointed at the parent dir. Fix: scripts/allure-report.js enumerates run folders and fails loudly on total:0.)*
