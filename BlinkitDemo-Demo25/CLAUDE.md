# CLAUDE.md — BlinkitDemo-Demo25

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
| **Epic** | **SCRUM-672** — *Blinkit Customer Login — Client Demo (25Aug)* |

**SCRUM-672 is verified fresh: 0 child issues at creation.** 15 ACs, login page only.

**Do not create another Epic.** Several exist for this same page — a duplicate splits test cases and breaks the traceability the demo is meant to show.

Blinkit Epics that are NOT this one:

| Key | Why not |
|---|---|
| SCRUM-653 | **already fully run** — 18 child test cases, closure report exists |
| SCRUM-626 | already run — has children, some Done |
| SCRUM-603 | 20 test cases already created |
| SCRUM-576 | different app (MediCare) |

Other pages on the same deployment (out of scope — separate `/explore` runs):
- `/blinkit-products.html` — catalogue, search, cart drawer
- `/blinkit-checkout.html` — checkout

The app is public, so `/explore` uses **live Playwright MCP**, not `scripts/fetch-local-page.js`.

## Demo Flow

| # | Command | What the client sees | Takes |
|---|---|---|---|
| 1 | `/explore https://blinkit-demo-qa.vercel.app` | Live browser opens, DOM read, Page Object generated from real elements | ~2 min |
| 2 | `/test-case-creation SCRUM-672` | Requirements → test cases in Jira, edge-case matrix walked per control | ~4 min |
| 3 | `/test-case-execution SCRUM-672` | Headed run. **Failures classified before any fix.** Real bugs filed, test issues auto-fixed | ~5 min |
| 4 | `/test-closure SCRUM-672` | AC→test traceability, counted coverage, Allure evidence report, Go / No-Go verdict | ~2 min |

## The moment that sells it

Step 3. Two failures, two different verdicts:

- **A real defect** → classified `REAL_BUG`, cited against a `BR-xx` rule, filed in Jira, test marked blocked. **The framework refuses to "fix" it.**
- **A test's own fault** → classified `TEST`, auto-fixed, re-verified headed, no bug filed.

Say this out loud: *"Normal AI would have written a test that agrees with the bug and turned the suite green. This one read the requirement first, so it knew the difference."*

Seeded defects on this deployment (do not fix in the app — they are the demo):
- `#signupBtn` has no click handler → AC 12 violation
- forgot-password confirmation says "email" on a mobile-number login → AC 10 violation

## Allure evidence report

Wired from scaffold — reporter, per-run `allure-results/{RUN_ID}/`, and npm scripts are already in place. `/test-closure` Step 4B generates the report and fills the **Evidence Report (Allure)** table with real numbers from `widgets/summary.json`.

```bash
npm run allure:serve       # generate + serve over HTTP
npm run allure:generate    # write allure-report/
npm run allure:open        # serve an already-generated report
```

**Always view over HTTP.** Opening `index.html` via `file://` leaves every widget stuck on "Loading..." forever — browsers block `fetch()` on file URLs. The report is fine; the transport is not.

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
9. **URL scope** — this Epic covers the login page only. A click that navigates away gets **one** navigation assertion; the destination is a separate run (AH Rule 27)

## If MCP results start archiving

A tool result that comes back as `[Full result archived]` means the content never reached the model. It is payload-size driven and **session-local**.

1. Narrow `fields` to the minimum the step needs
2. Paginate — `maxResults: 5`, follow `nextPageToken`
3. If a single-field, single-issue read still archives → **start a fresh session and re-run**

**Never** fall back to the Jira REST API, search for `.env` files or API tokens, scrape Jira through a browser, or proceed on partial/remembered ACs. A blocked run reported honestly is correct; an invented AC is a silent failure.

**Also never trust an archived write.** A `createJiraIssue` whose response archived may have silently failed — always re-query by JQL to confirm the issue exists before relying on its key. This happened on 2026-08-24: an Epic reported as created never existed.

## Knowledge Base

```
knowledge-base/SCRUM/
  business-rules.md    ← bug oracle (BR-xx). Seed from the SCRUM-672 ACs before Step 3
  known-defects.md     ← dedup register — check before filing
  feature-map.md       ← regression blast radius
  product-flows.md     ← user journeys
  app-patterns.json    ← how the app is BUILT — hint only, never an oracle
```

**Seed `business-rules.md` from the SCRUM-672 ACs during Step 2.** Without it, Step 3 loses Confirmed/Suspected bug tiering and dedup — and it fails *silently*.

**Dedup warning:** earlier Blinkit Epics (SCRUM-121, SCRUM-386, SCRUM-403, SCRUM-603, SCRUM-626, SCRUM-653) already carry filed defects for this same app. If a defect here matches one of those, reference it rather than filing a duplicate (AH Rule 21).

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

All live globally at `~/.claude/skills/` and travel to every project — **never copied per project**.

`/explore` · `/test-case-creation` · `/test-case-execution` · `/test-closure` · `/requirement-drift` · `/qa-run` · `/spec-quality` · `/bug-triage`

## BLAST logging

Every skill run appends to the workspace-root `progress.md` at `c:\ClaudeCodeMasterclass\progress.md` — not to this project.
