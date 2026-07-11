# CLAUDE.md — QA AI Stack Constitution

> Portable QA automation brain. Clone this into any Playwright TypeScript project and the full AI QA flow — POM generation, requirements-driven test cases, autonomous execution with self-healing, bug oracle, and persistent product memory — comes with it.
>
> **First time here?** Read `INSTALL.md` for the copy-paste bootstrap, then this file is the law for how the stack behaves.

## 🔒 FIRST ACTION at a new company — guard this stack from the company git

**This is the #1 priority and runs BEFORE anything else.** The stack files (rules, `.md`, `skills/`, `agent-factory/`, `knowledge-base/`) must NEVER reach the company's git.

**Trigger — fire on your VERY FIRST action in this repo, whatever the request.** Do NOT wait for a magic phrase. ANY of these = check the guard first:
- The user says *"set up the guard"*, *"guard this repo"*, *"protect the stack"*, *"new company setup"* — OR
- The user asks you to **analyze / explore / read / explain / run / test / "what is this repo"** — OR
- You are about to do **anything with git** (commit, push, add, status) — OR
- You simply notice this stack lives inside a git repo and have not yet confirmed a guard exists.

**Guard pre-check (run before honoring the request):**

1. `git remote -v`. If origin IS the stack repo (`AI_E2E_QA_Automation_Playwright_Master_Framework`), STOP — never guard the stack repo itself (files belong tracked there). Proceed with the user's request normally.
2. Else (origin is a company/other repo): check if a guard is already installed — does `.git/hooks/pre-commit` exist? If yes → guard is live, proceed with the request.
3. If NO guard yet → **install it FIRST, before doing what the user asked:**
   - Run `/guard` (the guard skill — `skills/guard/`). It bundles the script and does the full flow: pre-check, install hook + exclude, untrack if needed, self-test, scan.
   - Or run the script directly: `sh setup-local-guard.sh` from the project root (idempotent; handles untracked + cloned-from-stack, self-tests the hook, scans for leaks). See `HOW-TO-USE-GUARD.md` for the manual plan.
   - Report: which repo, what changed, final `CLEAN` / `LEAK`.
   - Then continue with the user's original request.

**HARD STOP — never commit or push without a guard.** If you are about to run `git commit` or `git push` in a company repo and step 2 shows no `.git/hooks/pre-commit`, STOP and install the guard first. Never `--no-verify`. Never `git add -A` / `git add .` — stage real work by name.

The user should only ever have to say one line — or nothing at all. You guard on first contact, then do the rest.

## What This Stack Gives You

| Capability | Skill / File |
|---|---|
| Keep stack OFF company git (pre-commit hook + exclude) | `/guard` (`skills/guard/`) |
| Live DOM → TypeScript POM | `/explore` |
| Epic AC → Jira test cases + spec file | `/test-case-creation` |
| Run tests, auto-fix locators, file bugs, update Jira | `/test-case-execution` |
| Manual bug investigation / creation fallback | `/bug-triage`, `/create-bug` |
| 3-agent Planner/Generator/Healer | `playwright-ai-mcp-tutor` |
| Coding discipline guardrail | `karpathy-guidelines` |
| RCA / Self-Heal / Flaky AI agents | `agent-factory/` (`ai:rca`, `ai:heal`, `ai:flaky`, `ai:triage`) |
| POM/spec placement + naming enforcement | `scripts/rule-engine.js` (`rules:check`) |
| One-command orchestrator — chains explore→creation→execution with checkpoints | `/qa-run` (conductor only, doesn't modify the 3 skills it chains) |
| Static 0–100 quality gate on generated specs (flaky/secrets/missing-expect/unawaited/empty) | `/spec-quality` (read-only, pure regex, optional gate before `/test-case-execution`) |

## The 3-Step E2E Flow

```
1. /explore <url>               → live DOM → POM (defect-aware: annotates known-defect locators)
2. /test-case-creation <EPIC>   → Epic AC → test cases (KB-grounded: regression scope from feature-map)
3. /test-case-execution <EPIC>  → run headed → classify failure → auto-fix OR file bug (with confidence tier)
        ↓
   PASS → Done in Jira
   FAIL → BROKEN_LOCATOR (ai:heal) | REAL_BUG (file bug, Confirmed/Suspected) | FLAKY (ai:flaky) | ENV_ISSUE
```

## Hard Rules (always active)

1. **Headed mode mandatory** for all test execution — `--headed`, no headless (AH Rule 17)
2. **Two-source model** — Epic/AC = assertions (what SHOULD happen); DOM = locators only (how to find). Never derive expected behavior from UI (AH Rule 19)
3. **Test failing ≠ wrong test** — investigate before modifying. A test correctly catching an app bug must NOT be "fixed" (AH Rule 19)
4. **ARIA snapshot does NOT expose `data-test`** — use `getByRole` + `// VERIFICATION REQUIRED` (AH Rule 8)
5. **Surgical fixes** — auto-fix touches only the failing line; no adjacent refactor (AUTO-FIX Rule 16 / karpathy)
6. **Dedup before filing** — check `knowledge-base/<PROJECT>/known-defects.md` then JQL before any new bug (AH Rule 21/25)
7. **Confidence tiers** — REAL_BUG that violates a `BR-xx` rule = **Confirmed** (cite it); heuristic only = **Suspected** (AH Rule 25)
8. **pressSequentially() not fill()** for constraint tests (maxlength/pattern) — `fill()` bypasses browser enforcement (AH Rule 18)
9. **Never invent** — selectors, BR-xx rules, error text, URLs. Every assertion + rule traces to a real source (Epic AC, filed bug, observed+verified)
10. **Stay in command scope** — produce only the command's defined deliverable; no bonus files/steps. Scope creep = scope hallucination (AH Rule 26)
11. **URL scope** — `/explore` + `/test-case-creation` cover only the given URL. Same-URL states (dropdowns/modals/tabs) are IN; a click that changes the URL is OUT. For a link/button that navigates away, write ONE navigation test (assert destination) but never cover the destination page's contents — that's a separate run (AH Rule 27 / explore Lesson #6 / test-case-creation Lesson #2)

## Reference Files (load on demand)

- `ANTI-HALLUCINATION-RULES.md` — 30 QA verification rules. Rule 30: recalled memory is a claim, not a fact — re-verify before use (closes KB feedback-loop risk) · Rule 29: edge-case coverage matrix (BVA/ECP/etc) · Rule 28: before/after evidence shots · Rule 27: URL scope (nav-test links, don't cover destinations) · Rule 26: stay in command scope · Rule 25: KB bug-oracle + Confirmed/Suspected tiers · Rule 23: 4-category failure taxonomy · Rule 17: headed mode first
- `AUTO-FIX-PROTOCOL.md` — 17-rule autonomous fix protocol (max 3 attempts; Rule 16 surgical changes; Rule 17 independent verify before DONE — maker≠checker, default-REJECT)
- `QA-SKILLS-CHEATSHEET.md` — one-page reference for the 3-step flow
- `knowledge-base/GUIDE.md` — how persistent product memory works + grow workflow
- `karpathy-guidelines` skill — Surgical Changes / Simplicity First / Think Before Coding / Goal-Driven Execution

## Knowledge Base (persistent product memory — adapted from imransdet/qa-assistant)

Each product gets a folder under `knowledge-base/<PROJECT>/` (keyed by Jira project), loaded before any analysis. Start one by copying `_TEMPLATE`:

```bash
cp -r knowledge-base/_TEMPLATE knowledge-base/<YOUR_PROJECT>
```

| File | Role |
|---|---|
| `business-rules.md` | **Bug-vs-intended oracle** — `BR-xx` rules are authoritative truth. Violated = Confirmed defect |
| `known-defects.md` | Dedup list — check before filing; probe weak spots harder |
| `feature-map.md` | Regression blast radius — a feature's `Used by` chain becomes test scope |
| `product-flows.md` | Real navigation flows — grounds happy-path tests |

**Loaded by:** `test-case-creation` Step 1A (scope), `test-case-execution` Step 0 (oracle + dedup), `explore` Step 1.5 (locator annotation, known-defects only).

**It compounds:** `test-case-execution` Step 7C proposes KB additions after each run (new confirmed defect, new rule). Append-only. Never invent — only record what the run established.

## agent-factory — Verdict → Action (AH Rule 22)

Run `ai:rca` before manual classification. Verdict drives action:

| RCA verdict | Action |
|---|---|
| `LOCATOR` | `ai:heal` → auto-patch POM |
| `TEST` | Fix test logic manually (surgical) |
| `PRODUCT_BUG` | Skip fix → file Jira bug (tier it) → mark test Blocked/In Review |
| `ENV` | Check credentials / network / browser binaries |
| `FLAKY` | `ai:flaky` → confirm → add `@flaky` tag |

**`ai:heal` verify-after-patch (2026-07-11):** `--apply` re-runs the failing spec right after patching the Page Object. Red re-run ⇒ auto-revert from `.bak`, `HealVerdict.verified = false`. Green ⇒ `verified = true`. Closes the gap where a patch could ship without ever being checked (AUTO-FIX Rule 17, maker≠checker). Matches the Claude Code subagent path (`.claude/agents/heal.md`), which already re-ran the spec. See `agent-factory/ai-agents/heal/CHANGE-verify-after-patch.md`.

## Commands (after install — see package-scripts.json)

```bash
npm test -- --headed                       # ALWAYS headed
npm run ai:rca                             # classify failure
npm run ai:heal                           # auto-patch broken locators
npm run ai:flaky                          # confirm + tag flaky
npm run ai:triage                         # all 3 + Jira bug draft
npm run rules:check                       # enforce POM/spec placement + naming
```

## Secrets Policy (never commit)

- `.env`, `.vercel/`, any API token, credential, or LLM key
- agent-factory `.env` (GROQ/DeepSeek/Ollama key) — per-request only
- Add to `.gitignore` on day one. Verify with `git check-ignore .env` before any commit.

## Provenance

This stack combines:
- **Our QA engine** — anti-hallucination (30 rules), auto-fix protocol (17 rules), agent-factory (RCA/Heal/Flaky), rule-engine, the 3 core skills
- **imransdet/qa-assistant** — persistent per-product Knowledge Base + bug-vs-intended oracle + Confirmed/Suspected confidence tiers (layered onto our engine, which it lacks)
- **multica-ai/andrej-karpathy-skills** — `karpathy-guidelines` coding discipline (Surgical / Simplicity / Think-First / Goal-Driven)
- **cobusgreyling/loop-engineering** — `loop-verifier` maker/checker pattern → AUTO-FIX Rule 17 (independent verify before DONE, default-REJECT, re-run tests, no-cheating audit)
