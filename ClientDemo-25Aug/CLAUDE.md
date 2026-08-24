# CLAUDE.md — ClientDemo-25Aug

> Law for this project. This file is truth.

## What this is

A clean E2E QA project for a **live client demonstration**. Nothing has been run yet — the demo executes the full pipeline in front of the client, live.

## App Under Test

| | |
|---|---|
| **URL** | https://blinkit-demo-qa.vercel.app |
| **App** | Blinkit — grocery delivery, customer login |
| **Hosting** | Vercel, public, no auth wall |
| **Jira project** | `SCRUM` on `anandsoni2641.atlassian.net` |
| **Epic** | **SCRUM-741** — *Blinkit Customer Login QA — CLIENT DEMO 25Aug* |

**SCRUM-741 verified fresh: 0 child issues.** 15 ACs, login page only.

**Do not create another Epic.** Several exist for this same page — a duplicate splits test cases and breaks the traceability the demo is meant to show.

Blinkit login Epics that are NOT this one:

| Key | Why not |
|---|---|
| SCRUM-722 | **consumed** — 18 test cases, full pipeline dry run, closure report exists |
| SCRUM-694 | consumed — 21 test cases |
| SCRUM-672 | consumed — 21 test cases |
| SCRUM-653 | consumed — 18 test cases |
| SCRUM-626, SCRUM-603 | already run |
| SCRUM-576 | different app (MediCare) |

Other pages on the same deployment (out of scope — separate `/explore` runs):
- `/blinkit-products.html` — catalogue, search, cart drawer
- `/blinkit-checkout.html` — checkout

The app is public, so `/explore` uses **live Playwright MCP**, not `scripts/fetch-local-page.js`.

## Demo Flow

| # | Command | What the client sees | Takes |
|---|---|---|---|
| 1 | `/explore https://blinkit-demo-qa.vercel.app` | Live browser opens, DOM read, Page Object generated from real elements | ~2 min |
| 2 | `/test-case-creation SCRUM-741` | Requirements → test cases in Jira, edge-case matrix walked per control | ~4 min |
| 3 | `/test-case-execution SCRUM-741` | Headed run. **Failures classified before any fix.** Real bugs filed, test issues auto-fixed | ~5 min |
| 4 | `/test-closure SCRUM-741` | AC→test traceability, counted coverage, Allure evidence, Go / No-Go verdict | ~3 min |

## What the dry run (SCRUM-722) proved — expect the same here

Verified end-to-end on 2026-08-24. Expected outcome for this Epic:

- **13 pass, 4 blocked, 1 skipped** out of 18 tests
- **BL-004** fails — validation regex is `/^\d{9,10}$/`, so a 9-digit number passes. AC-4 requires rejection.
- **BL-010** fails — forgot-password toast says "email" on a mobile-only login (AC-10)
- **BL-012** fails — `#signupBtn` has no click handler; only `forgotBtn`, `loginForm`, `mobile` have listeners (AC-12)
- **BL-013** fails — 0 `aria-describedby`, 0 `role="alert"`, 0 `aria-live` in the page (AC-13)
- **BL-018** skipped — `test.fixme`, no AC governs first/last name validation
- Verdict: **NO-GO** on the P1s

## The moment that sells it

Step 3. Failures get **classified before anything is fixed**:

- **A real defect** → `REAL_BUG`, cited against a `BR-xx` rule, filed or linked in Jira, test marked blocked. **The framework refuses to "fix" it.**
- **A test's own fault** → `TEST`, auto-fixed, re-verified headed, no bug filed.

Say this out loud: *"Normal AI would have written a test that agrees with the bug and turned the suite green. This one read the requirement first, so it knew the difference."*

Two more moments worth pointing at:

1. **BL-011 passes** even though the control is labelled "Create New Account" rather than "Sign Up" — AC-11 deliberately does not prescribe the label, so it is an observation, not a defect. The framework does not invent bugs.
2. **Dedup** — three of the four failures match already-filed bugs. It references them instead of filing duplicates.

## Allure evidence report

Wired in `playwright.config.ts` — per-run `allure-results/{RUN_ID}/` (AH Rule 31).

```bash
npm run allure:serve       # generate + serve over HTTP
npm run allure:generate    # write allure-report/
npm run allure:open        # serve an already-generated report
```

**Generating is not delivering — always SERVE.** Opening `index.html` via `file://` leaves every widget stuck on "Loading..." forever, because browsers block `fetch()` on file URLs.

Two false greens to guard:
1. A `--reporter=` CLI flag **overrides the entire config reporter array** and silently disables Allure. Run with no `--reporter` flag.
2. `allure generate` prints "Report successfully generated" even when the results dir does not exist. Verify `widgets/summary.json` `total` equals the `progress.md` row count.

Allure is **evidence, not the oracle** — `progress.md` remains the source of truth for pass/fail.

## Hard Rules (always active)

1. **Headed mode mandatory** — `headless: false` in config. Never flip it (AH Rule 17)
2. **The requirement is the oracle** — expected behaviour comes from the Epic AC, never from what the UI shows (AH Rule 19)
3. **Classify before fixing** — no auto-fix until the failure is categorised (AH Rule 23)
4. **Never fix a test that caught a real bug** — file the defect, mark the test blocked
5. **Capture the build every run** — a changed build expires all prior results
6. **Counted coverage only** — `n/m`, never estimated. No execution block = 0% coverage, not 100%
7. **A missing AC is a finding**, never a blank to fill by invention
8. **`RUN_ID` per run** — `test-results/` is wiped on every invocation (AH Rule 31)
9. **URL scope** — this Epic covers the login page only. A click that navigates away gets **one** navigation assertion (AH Rule 27)
10. **A count is not a dedup check** — a non-zero count with unreadable titles means dedup FAILED. Never file on it; never re-issue a create on a count of 0 (AH Rule 21)

## Knowledge Base — seed it during Step 2

```
knowledge-base/SCRUM/
  business-rules.md    ← bug oracle (BR-xx). SEED FROM SCRUM-741 ACs
  known-defects.md     ← dedup register — seed from bugs already filed on this app
  feature-map.md       ← regression blast radius
  product-flows.md     ← user journeys
  app-patterns.json    ← how the app is BUILT — hint only, never an oracle
```

All five are **bare templates right now**. `/test-case-creation` seeds `business-rules.md` from the Epic ACs at Step 1A, and `/test-case-execution` gates on it at Step 0A.

**Oracle staleness gate:** every `BR-xx` `Source` must cite **SCRUM-741**. A rule citing a different Epic is a hard stop — it would tier defects against requirements that no longer apply. Check with:

```bash
grep -oE "Epic [A-Z]+-[0-9]+" knowledge-base/SCRUM/business-rules.md | sort -u
```

**Seed `known-defects.md` too.** These are already filed against this same app — reference them, never re-file (AH Rule 21):

| Ref | Area | Symptom |
|---|---|---|
| SCRUM-718 | Account creation | `#signupBtn` has no click handler |
| SCRUM-716 | Forgot password | confirmation says "email" on mobile-only login |
| SCRUM-721 | Accessibility | validation errors not announced to assistive tech |

## If MCP results start archiving

A tool result returning `[Full result archived]` means the content never reached the model. It is payload-size driven and session-local.

**Working path when `getJiraIssue` / JQL archive** — `mcp__atlassian__fetch` does not carry the bloated response envelope:

```
1. mcp__atlassian__search  { query: "\"<exact issue title>\"" }   → returns the ARI
2. mcp__atlassian__fetch   { id: "ari:cloud:jira:<cloudId>:issue/<numericId>" }
```

`cloudId` for this site: `e74af77d-c1bf-4809-aa7e-20b6020a077b`.

**Never trust an archived write.** A `createJiraIssue` whose response archived may have succeeded *or* failed — always re-query by search to confirm before relying on its key. Both outcomes have happened on this workspace.

**Never** fall back to the Jira REST API, search for `.env` files or API tokens, scrape Jira through a browser, or proceed on partial/remembered ACs. A blocked run reported honestly is correct; an invented AC is a silent failure.

## Commands

```bash
npm install                    # done
npx playwright install         # first time on this machine only

npm test                       # all tests (headed per config)
npm run report                 # Playwright HTML report
npm run allure:serve           # Allure evidence report over HTTP
npm run typecheck              # TypeScript check

RUN_ID=demo-1 npx playwright test    # named run — keeps artefacts separate
```

## Layout

```
src/pages/            ← Page Objects, generated by /explore
src/fixtures/         ← fixture DI
tests/ui/             ← specs, generated by /test-case-creation
knowledge-base/       ← 5-file product memory
scripts/              ← fetch-local-page.js (localhost fallback only)
output/               ← closure reports
allure-results/{RUN}/ ← raw Allure results, per run
allure-report/{RUN}/  ← generated evidence report
screenshots/{EPIC}/   ← evidence, PASS and FAIL
```

## Skills used

All live globally at `~/.claude/skills/` and travel to every project — **never copied per project**. Currently at the 2026-08-18 baseline plus the oracle-staleness and verification-contract fixes.

`/explore` · `/test-case-creation` · `/test-case-execution` · `/test-closure` · `/requirement-drift` · `/qa-run` · `/spec-quality` · `/bug-triage`

## BLAST logging

Every skill run appends to the workspace-root `progress.md` at `c:\ClaudeCodeMasterclass\progress.md` — not to this project.

## Before the demo

1. `npx playwright install` (first time on this machine only)
2. Confirm the app returns 200: `curl -sI https://blinkit-demo-qa.vercel.app`
3. Run the pipeline in **one window only** — two sessions writing the same project is what caused a mid-run file conflict previously
