# CLAUDE.md — QA AI Stack Constitution

> Portable QA automation brain. Clone this into any Playwright TypeScript project and the full AI QA flow — POM generation, requirements-driven test cases, autonomous execution with self-healing, bug oracle, and persistent product memory — comes with it.
>
> **First time here?** Read `INSTALL.md` for the copy-paste bootstrap, then this file is the law for how the stack behaves.

## What This Stack Gives You

| Capability | Skill / File |
|---|---|
| Live DOM → TypeScript POM | `/explore` |
| Epic AC → Jira test cases + spec file | `/test-case-creation` |
| Run tests, auto-fix locators, file bugs, update Jira | `/test-case-execution` |
| Manual bug investigation / creation fallback | `/bug-triage`, `/create-bug` |
| 3-agent Planner/Generator/Healer | `playwright-ai-mcp-tutor` |
| Coding discipline guardrail | `karpathy-guidelines` |
| RCA / Self-Heal / Flaky AI agents | `agent-factory/` (`ai:rca`, `ai:heal`, `ai:flaky`, `ai:triage`) |
| POM/spec placement + naming enforcement | `scripts/rule-engine.js` (`rules:check`) |

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

## Reference Files (load on demand)

- `ANTI-HALLUCINATION-RULES.md` — 25 QA verification rules. Rule 25: KB bug-oracle + Confirmed/Suspected tiers · Rule 23: 4-category failure taxonomy · Rule 22: ai:rca before manual classification · Rule 17: headed mode first
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
- **Our QA engine** — anti-hallucination (25 rules), auto-fix protocol (17 rules), agent-factory (RCA/Heal/Flaky), rule-engine, the 3 core skills
- **imransdet/qa-assistant** — persistent per-product Knowledge Base + bug-vs-intended oracle + Confirmed/Suspected confidence tiers (layered onto our engine, which it lacks)
- **multica-ai/andrej-karpathy-skills** — `karpathy-guidelines` coding discipline (Surgical / Simplicity / Think-First / Goal-Driven)
- **cobusgreyling/loop-engineering** — `loop-verifier` maker/checker pattern → AUTO-FIX Rule 17 (independent verify before DONE, default-REJECT, re-run tests, no-cheating audit)
