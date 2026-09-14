---
name: spec-quality
description: Static quality gate for generated Playwright spec files. Scans .spec.ts/.spec.js for flaky patterns (fixed waits, sleep, page.pause), hardcoded secrets, tests missing expect() assertions, unawaited async page calls, and empty/stub test bodies — emits a 0–100 score + letter grade + findings. Use when user says "/spec-quality [path]", "score this spec", "check spec quality", "quality gate on [file]", or as an optional pre-run gate after /test-case-creation generates specs (before /test-case-execution runs them). Pure regex, zero dependencies. Does NOT modify specs or any other skill — read-only scorer.
improvements: 0
---

# Spec Quality — static quality gate for generated specs

A read-only scorer that catches low-quality generated Playwright specs **before** they run. Pure regex, zero dependencies. It does NOT fix or modify anything and does NOT alter `/explore`, `/test-case-creation`, or `/test-case-execution` — it's an optional gate you point at spec files.

> **Why this exists:** parity with Vara Prasad's `ReviewerAgent` (vperambu/Playwright-Rag-Langraph-autoheal) — the one genuinely portable idea from that framework. Rewritten for Playwright + TypeScript with our own deduction model. Complements AUTO-FIX Rule 17 (which verifies *behavior*); this verifies *code quality* statically.

## What it checks (deduction model, floor 0)

| Finding | Penalty (each) |
|---|---|
| `page.waitForTimeout(ms)` — fixed wait | −3 |
| `setTimeout` / `sleep()` — hardcoded delay | −3 |
| `page.pause()` — debug call left in | −5 |
| Hardcoded password / token / api-key literal | −4 |
| Unawaited async `page.*` call (missing `await`) | −5 |
| Test with no `expect()` assertion | −5 |
| Empty / stub test body | −10 |
| **Reward:** every test in the file asserts | +5 |

Grade: A ≥90, B ≥80, C ≥70, D ≥60, else F.

## Usage

```bash
# from the Playwright project root
node ~/.claude/skills/spec-quality/scripts/spec-quality.js <file | dir | glob> [--json] [--min=70]

# examples
node .../spec-quality.js tests/ui/login.spec.ts
node .../spec-quality.js "tests/ui/*.spec.ts" --min=75
node .../spec-quality.js tests/ui --json
```

- **Exit 0** if every file scores ≥ `--min` (default 70) → gate passes.
- **Exit 1** if any file is below → gate fails (use in CI / pre-run).
- **Exit 2** if no spec files matched the path.

If a project copies the script locally, prefer `scripts/spec-quality.js` and add an npm script:
`"spec:quality": "node ./scripts/spec-quality.js tests --min=70"`.

## Instructions

### Step 1: Resolve target
Parse the path from user input (`/spec-quality tests/ui/login.spec.ts`). If none given, ask which spec/dir to score. Default `--min=70` unless the user specifies.

### Step 2: Run the scanner
Run the script via Bash against the target. Capture stdout + exit code. Do NOT edit any spec — this is read-only.

### Step 3: Report
Show the per-file score, grade, and findings table. Then:
- **All ≥ min (exit 0):** report PASS. If invoked as a pre-run gate, hand back to the flow (e.g. proceed to `/test-case-execution`).
- **Any < min (exit 1):** report FAIL with the specific findings. Recommend fixes BUT do not apply them here — surface to the user (or, if they ask, the fix belongs to `/test-case-creation` regeneration or a manual edit, following AUTO-FIX Rule 16 surgical + Rule 17 verify). This skill only scores.

## Companion: TypeScript critic gate (`ts-critic.js`)

`spec-quality.js` scores spec **text** with regex. It cannot tell you whether a
generated spec **compiles**. A spec that does not typecheck fails at run time as
a confusing runtime error, which then gets misread as an application bug — the
AH Rule 32 trap (test failing ≠ app broken). `ts-critic.js` closes that hole by
running the `tsc --noEmit` these frameworks already define and mapping errors
back to spec files.

> Not a new compiler: 2 of 3 frameworks here already have `"typecheck": "tsc --noEmit"`.
> This wires an existing command into a gate.

```bash
node ~/.claude/skills/spec-quality/scripts/ts-critic.js <projectDir> [--json]
node .../ts-critic.js "Playwright Automation Framework"          # auto-ramp
node .../ts-critic.js <dir> --enforce                            # force blocking
node .../ts-critic.js <dir> --advisory                           # force non-blocking
node .../ts-critic.js <dir> --reset                              # clear run counter
```

**Self-promoting ramp (machine-checkable, never ask-the-user).** Per the
2026-09-10 SCRUM-794 finding — machine-checkable gates missed 0/58 runs while
ask-the-user gates missed 5/58 — this gate never asks permission:

| Run | Mode | Behaviour |
|---|---|---|
| 1–3 | `ADVISORY` | reports type errors, exit 0, does not block |
| 4+ | `ENFORCING` | reports and exits 1 on any type error |

State lives in `.ts-critic-state.json` in the project root (gitignored).

**Exit codes:** `0` clean or advisory · `1` type errors while enforcing ·
`2` tsc failed to run at all (config/invocation problem — never a silent pass).

Verified 2026-09-14 on `Playwright Automation Framework`: clean run passes;
an injected `const n: number = "string"` was caught as TS2322 + TS2345 and
correctly attributed to the spec file; ramp confirmed advisory×3 → enforcing
at run 4 (exit 0,0,0,1,1). One real defect found and fixed during verification:
Windows CRLF broke the diagnostic regex, making genuine type errors report as
"tsc did not run".

### Optional: pre-run gate placement
This skill is designed to slot in AFTER `/test-case-creation` produces a spec and BEFORE `/test-case-execution` runs it — as an advisory gate. It is NOT wired into those skills automatically (their logic is unchanged); invoke it explicitly or via `/qa-run` if you want the check. A failing score is a warning, not a hard block, unless you run it in CI with the non-zero exit.

## Anti-patterns

❌ **Don't:**
- Modify spec files from this skill — it is read-only. Fixes happen elsewhere (regenerate or manual + Rule 16/17).
- Treat the score as truth about behavior — it's static code quality, not test correctness. A 100/100 spec can still assert the wrong thing (that's the two-source model + Rule 19's job).
- Edit `/explore`, `/test-case-creation`, or `/test-case-execution` to embed this — keep it a separate, optional gate.
- Hard-fail a flow on a low score without telling the user why; always show the findings.

✅ **Do:**
- Use it as a fast advisory gate on freshly generated specs.
- Tune `--min` per project (stricter for production suites).
- Pair with Rule 17: spec-quality (static) + independent verify (behavioral) = both axes covered.
- Copy the script into a project's `scripts/` + add an npm `spec:quality` script for CI.
