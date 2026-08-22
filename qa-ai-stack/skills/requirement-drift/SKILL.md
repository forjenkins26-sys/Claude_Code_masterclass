---
name: requirement-drift
description: Detect what changed since the last test cycle — acceptance criteria edited/added/removed in Jira, and whether the app was redeployed. Reports which business rules are now stale and which tests must be re-run. Use when user says "/requirement-drift SCRUM-255", "did the AC change", "what changed since last run", "do we need to retest", "new build deployed", or at the start of any regression cycle on an Epic tested before.
license: MIT
metadata:
  author: Anand Soni
  stlc-phase: Requirement Analysis / Regression Planning
  version: 1.0.0
---

# Requirement Drift Detection

You answer two questions before any test runs:

1. **Did the requirement change?** (AC edited, added, or removed since the rules were written)
2. **Did the app change?** (new build deployed since the last results)

Either one makes previous results untrustworthy. This skill finds out which, and names exactly what must be re-tested.

**Core principle — the AC is the authority.** A stored `BR-xx` rule reflects the AC *at the time it was written*. When they disagree, the AC wins and the rule is stale (AH Rule 30, applied to requirements). Never resolve a mismatch in favour of memory.

## RICEPOT

- **R**ole: QA lead deciding scope for a regression cycle
- **I**nput: Epic key; `knowledge-base/<PROJECT>/business-rules.md`; `progress.md`; Jira
- **C**ontext: Runs BEFORE `/test-case-execution` — it sets the scope of that run
- **O**utput: drift report + a re-test list
- **T**one: factual, names every changed item, never softens a "re-test everything"

## Rules Applied

- **AH Rule 30** — a stored rule is a claim; re-verify against its cited source every cycle
- **AH Rule 19** — the requirement is the oracle; the UI never resolves a mismatch
- **Never invent an AC.** A new AC with no rule and no test is a gap to report, not to fill
- **No estimated scope.** The re-test list is derived from actual diffs, never guessed

---

## Instructions

### Step 1: Load stored rules and their sources

```
Read: knowledge-base/<PROJECT>/business-rules.md    (default PROJECT = SCRUM)
```

Every rule carries a `Source` column — e.g. `BR-08 | Cancel visible ONLY when Placed/Confirmed | SCRUM-255 AC line 8`.

That citation is what makes drift detectable. Build the map:

```
BR-01 → SCRUM-255 AC line 1
BR-08 → SCRUM-255 AC line 8
...
```

**If a rule has no source citation** → flag it `[UNSOURCED]`. It cannot be drift-checked and should not be used as a bug oracle until sourced.

---

### Step 2: Fetch the CURRENT acceptance criteria

```
ToolSearch: select:mcp__atlassian__getJiraIssue
```
```json
mcp__atlassian__getJiraIssue({
  "cloudId": "anandsoni2641.atlassian.net",
  "issueIdOrKey": "{EPIC-KEY}",
  "fields": ["summary", "description", "updated"]
})
```

Parse the description into numbered AC lines, same numbering as when the rules were seeded. Capture the Epic's `updated` timestamp.

**Fast path:** if Epic `updated` is older than the last `/test-case-execution` entry in `progress.md`, no AC can have changed. Report "no requirement drift" and skip to Step 4 (build check). Still run Step 3 if the user explicitly asked for a full diff.

---

### Step 3: Compare — rule vs its current source

For every `BR-xx`, compare the stored rule text against the current AC line it cites.

| Finding | Condition | Verdict |
|---|---|---|
| `UNCHANGED` | AC line matches the stored rule | Rule stands, no re-test |
| `CHANGED` | AC line exists but text differs materially | **Rule is stale** — update it, re-test its tests |
| `REMOVED` | The cited AC line no longer exists | Requirement retired — confirm before deleting the rule |
| `NEW` | An AC line exists with no rule pointing to it | **Coverage gap** — no rule, likely no test |

**Material vs cosmetic:** a wording change that does not alter the testable condition (typo fix, reordering) is cosmetic — note it, do not force a re-test. A change to a value, state, boundary, or condition is material. When uncertain, treat it as material (safer to re-test than to miss).

**Map changed rules to tests:** for every `CHANGED` / `REMOVED` rule, find the test IDs that assert it — from `progress.md` rows and the spec file. Those are the re-test targets.

---

### Step 4: Detect redeployment

**A test result belongs to the build it ran against.** A pass on an older build proves nothing about the current one.

Capture the current build identity, in this order of preference:

1. An explicit version the user supplies (`/requirement-drift SCRUM-255 build 4.2.1`)
2. A version string exposed by the app (meta tag, `/version` endpoint, footer build number)
3. `git rev-parse --short HEAD` in the app repo, if the app is local to the workspace
4. For a local static demo app — the AUT file's modified timestamp

Compare against the `Build:` line of the most recent execution block in `progress.md`.

| Condition | Verdict |
|---|---|
| Build identical | Previous results remain valid for unchanged ACs |
| **Build differs** | **All previous results EXPIRED** — full re-run required |
| No build recorded on the last run | Unknown — treat as expired, and start recording from this cycle |

**Never infer "nothing changed" from a missing build record.** Absence of evidence is not evidence of no deployment.

---

### Step 5: Output the drift report

```markdown
# Drift Report — {EPIC-KEY}
**Checked:** {date} · **Epic updated:** {jira timestamp} · **Last run:** {progress.md timestamp}

## Build
| | Value |
|---|---|
| Last tested build | {old or "not recorded"} |
| Current build | {new} |
| **Verdict** | {SAME — results valid / **CHANGED — all results expired**} |

## Requirement changes
| Rule | Source | Status | What changed |
|---|---|---|---|
| BR-08 | SCRUM-255 AC line 8 | **CHANGED** | "Dispatched" → "Delivered" |
| BR-03 | SCRUM-255 AC line 3 | REMOVED | AC line no longer present |
| — | SCRUM-255 AC line 14 | **NEW** | No rule, no test — coverage gap |
| BR-01..07, 09, 10 | — | UNCHANGED | — |

## What must be re-tested
| Reason | Tests | Priority |
|---|---|---|
| New build deployed | **ALL 13** | Everything — prior results expired |
| BR-08 changed | OD-008, OD-011 | Update assertions to the new AC first |
| AC line 14 is new | *none exist* | Write new tests — currently uncovered |

## Actions required
1. Update BR-08 in `business-rules.md` to the new AC text (cite line 8)
2. Update OD-008 / OD-011 assertions before re-running
3. Create a test case for AC line 14 — run `/test-case-creation {EPIC}`
4. Confirm with the BA whether BR-03's requirement was intentionally retired
```

**If nothing drifted and the build is unchanged** → say so plainly in two lines. A clean report is a valid, useful result.

---

### Step 6: Update the knowledge base (only after human confirmation)

Drift detection **reports**; it does not silently rewrite rules. Propose the edits and let the user approve:

- `CHANGED` → update the rule text, keep the same `BR-xx` ID, keep the source citation
- `REMOVED` → mark the rule `[RETIRED {date}]` rather than deleting it — history matters for old defects citing it
- `NEW` → propose a new `BR-xx` sourced to that AC line

**Never auto-edit `business-rules.md`.** It is the bug oracle; a wrong entry silently corrupts every future run (AH Rule 30).

---

## Quality Gates

Before finishing:
- ✅ Epic re-fetched this run — no AC text taken from memory
- ✅ Every rule compared against its cited source, or flagged `[UNSOURCED]`
- ✅ Build compared; a missing prior build treated as expired, never as "same"
- ✅ Re-test list derived from actual diffs, never estimated
- ✅ New ACs with no rule reported as coverage gaps
- ✅ No rule auto-edited without confirmation
- ✅ Appended to `progress.md`

## BLAST Progress Logging

```markdown
## {YYYY-MM-DD HH:MM} — /requirement-drift {EPIC-KEY}

**Epic:** {key} — {summary}
**Build:** {old} → {new} ({SAME / CHANGED})
**AC changes:** {n} changed · {n} removed · {n} new
**Stale rules:** {BR-xx list or "none"}
**Re-test scope:** {ALL / specific test IDs}
```

## Usage

```
/requirement-drift SCRUM-255
/requirement-drift SCRUM-255 build 4.2.1
/requirement-drift SCRUM-121
```

Run it **before** `/test-case-execution` — it defines that run's scope.

## Anti-patterns

| ❌ Don't | ✅ Do |
|---|---|
| Trust a stored rule without checking its source | Re-fetch the Epic and compare every cycle |
| Resolve an AC/UI mismatch in favour of the UI | The AC wins — a mismatch is a bug, not a decision |
| Assume "no build recorded" means nothing changed | Treat unknown as expired |
| Silently rewrite a business rule | Propose the change, get confirmation |
| Skip a new AC because no test exists | That IS the finding — report the gap |
| Re-test everything "to be safe" when only one AC moved | Scope from the actual diff |
