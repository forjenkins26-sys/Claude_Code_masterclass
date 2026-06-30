---
name: qa-run
description: One-command end-to-end QA orchestrator. Runs the full 3-step flow — /explore (POM from live DOM) → /test-case-creation (Epic AC → test cases + spec) → /test-case-execution (run headed, classify, auto-fix or file bug, update Jira) — in sequence from a single invocation. Use when user says "/qa-run [EPIC] [URL]", "run the full QA flow", "do end-to-end QA for [EPIC]", or "orchestrate the 3 steps". This skill ONLY chains the three existing skills with checkpoints between them — it does not re-implement their logic and never modifies them.
improvements: 0
---

# QA Run — End-to-End Orchestrator (3-step flow in one command)

Single entry point that runs the existing 3-step QA flow in order, with a human checkpoint between each stage. It is a **conductor only** — it calls `/explore`, `/test-case-creation`, `/test-case-execution` exactly as they already work. It adds NO new test logic, changes NO assertions, and edits NONE of the three skills.

> **Why this exists:** parity with single-command orchestrators (e.g. Vara Prasad's `run-orchestration.js`). Same UX win — one command, full cycle — but each stage keeps your stack's guarantees (two-source model, anti-hallucination rules, bug oracle, maker/checker verify). The brains live in the three skills; this just sequences them.

## Guardrails (read first)

- **Do NOT modify, inline, or paraphrase** the logic of `/explore`, `/test-case-creation`, or `/test-case-execution`. Invoke each via the Skill tool and let it run its own steps.
- **Each underlying skill keeps its own gates** (headed mode, KB load, duplicate detection, Jira prompts, POM verification 6B, etc.). This orchestrator never skips or overrides them.
- **Stop at every checkpoint** unless the user passed `--auto` (see Input). A failed or ambiguous stage halts the chain — do not push a broken POM into test-case-creation.
- **Company-repo guard still applies first.** If `CLAUDE.md`'s FIRST-ACTION guard pre-check has not run in this repo, do that before anything (see `guard` skill).

## Input

```
/qa-run SCRUM-121 http://localhost:7000/blinkit-login.html
/qa-run SCRUM-255                       (Epic only — URL pulled from Epic description if present)
/qa-run SCRUM-121 <url> --auto          (no checkpoints — run all 3 back-to-back; use only when trusted)
/qa-run SCRUM-121 <url> --from=2        (skip explore, start at test-case-creation; e.g. POM already exists)
```

Parse:
- **EPIC** — Jira Epic key (required). Drives stages 2 + 3.
- **URL** — feature under test (optional if Epic description has it; required for stage 1 if no POM yet).
- **`--auto`** — run all stages without stopping for confirmation (default: checkpoint between each).
- **`--from=N`** — start at stage N (1=explore, 2=creation, 3=execution). Lets you re-enter mid-flow.

If EPIC missing → ask: "Which Jira Epic should I run the full QA flow for?"

## Instructions

### Step 0: Pre-flight

1. **Guard check** (company repos) — per `CLAUDE.md` FIRST-ACTION rule, confirm a guard is installed before any git-touching stage. If not, run `/guard` first.
2. Echo the plan back so the user sees what will run:

```
QA Run — Epic {EPIC}
  Stage 1: /explore {URL}                  → POM
  Stage 2: /test-case-creation {EPIC}      → test cases + spec
  Stage 3: /test-case-execution {EPIC}     → run + classify + fix/file + Jira
  Mode: {checkpointed | --auto}  Start: stage {N}
```

### Step 1: Stage 1 — Explore (skip if `--from` > 1 or POM already exists)

Invoke the existing skill — do not reimplement:

```
Skill: explore   (args: the URL)
```

Let `/explore` run its full flow (Playwright MCP snapshot → POM → save → rca-log append). When it finishes:

- Capture the **POM path** it produced.
- **Checkpoint** (unless `--auto`): report POM saved + any flags (reCAPTCHA, iframes, VERIFICATION REQUIRED locators). Ask: "Stage 1 done — POM at `{path}`. Proceed to test-case-creation? (yes / fix first / stop)".
- If `/explore` could not produce a clean POM (e.g. unverified locators) → **halt**, surface it. Do not proceed with a broken POM.

### Step 2: Stage 2 — Test Case Creation

```
Skill: test-case-creation   (args: the URL + "epic {EPIC}")
```

Let it run its own two-source flow (Epic AC = assertions, DOM = locators), KB Step 1A scope load, duplicate detection, Jira prompts, and **Step 6B POM verification + 6C smoke gate**. Do not answer its internal prompts on the user's behalf — relay them.

When it finishes:
- Capture: created Jira test keys + spec file path.
- **Checkpoint** (unless `--auto`): report counts + requirement gaps it flagged. Ask: "Stage 2 done — {N} test cases, spec at `{path}`. Proceed to execution? (yes / review / stop)".
- If it surfaced a requirement gap or could not verify locators → **halt** and surface; let the user decide.

### Step 3: Stage 3 — Test Case Execution

```
Skill: test-case-execution   (args: the EPIC key)
```

Let it run its full flow: KB Step 0 (oracle + dedup), headed run, AH Rule 23 failure taxonomy, `ai:rca` verdict → auto-fix (BROKEN_LOCATOR) / file bug with Confirmed|Suspected tier (REAL_BUG) / `ai:flaky` (FLAKY) / env check (ENV_ISSUE), AUTO-FIX Rule 17 independent verify before DONE, screenshots, Jira status + comment, Step 7C KB grow proposal.

When it finishes, produce the **final orchestration report** (Step 4).

### Step 4: Final Report

Summarize the whole run (this is the only NEW output qa-run adds — a roll-up; the per-stage detail came from each skill):

```
## QA Run Complete — Epic {EPIC}

| Stage | Skill | Result |
|---|---|---|
| 1 | /explore | POM: {path} ({N} locators, {M} flagged) |
| 2 | /test-case-creation | {N} test cases → Jira, spec: {path} |
| 3 | /test-case-execution | {pass}✅ {fail}❌ {fixed}🔧 {blocked}🚫 {flaky}🌀 |

**Bugs filed:** {keys + Confirmed/Suspected tier, or "none"}
**Auto-fixed:** {locators healed, or "none"}
**Blocked:** {test → reason, or "none"}
**KB additions proposed (Step 7C):** {new BR-xx / defect rows, or "none"}

Next: {e.g. "review SCRUM-XXX bug" / "all green — Epic ready for Done"}
```

## Anti-patterns

❌ **Don't:**
- Reimplement or "optimize" any logic from the three skills — call them, don't copy them.
- Skip a skill's own gates (headed mode, 6B verification, dedup, KB load) to go faster.
- Answer a sub-skill's user prompt yourself — relay it to the human.
- Push a broken POM (Stage 1 unverified) into Stage 2, or broken specs into Stage 3.
- Run `--auto` in a company repo before the guard is confirmed installed.
- File bugs or update Jira from the orchestrator — that's `/test-case-execution`'s job; qa-run only rolls up its results.

✅ **Do:**
- Treat this as a conductor: sequence + checkpoint + roll-up only.
- Halt the chain on any failed/ambiguous stage and surface it.
- Preserve every guarantee the individual skills provide.
- Default to checkpointed mode; require explicit `--auto` to run unattended.
