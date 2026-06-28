# QA Skills Cheat Sheet

> `/explore` → `/test-case-creation` → `/test-case-execution`  
> Full AI QA flow: POM from DOM → Test cases from Epic → Run + update Jira

---

## /explore

**Trigger:** `/explore <URL>`

**What it does:** Opens URL in live browser (Playwright MCP), snapshots DOM, extracts all interactive elements, generates TypeScript POM file.

**Input:**
```
/explore http://localhost:7000/order-details.html
/explore https://saucedemo.com
```

**Output:**
- Summary table — all elements found (inputs, buttons, links, dropdowns)
- Ready-to-use `PageName.ts` POM file
- Asks: save to `Playwright Automation Framework/src/pages/`?

**Locator priority:**
| Priority | Strategy | Example |
|---|---|---|
| 1st | Role + name | `getByRole('button', { name: 'Login' })` |
| 2nd | Placeholder | `getByPlaceholder('Enter email')` |
| 3rd | Label | `getByLabel('Email')` |
| 4th | ID | `page.locator('#email')` |
| Last | Class | `page.locator('.btn-primary')` ← fragile |

**Key rules:**
- Uses live DOM — NOT WebFetch, NOT memory
- `data-test` attrs NOT exposed in snapshot — use role-based locators
- `getByText('X')` must be scoped to parent if text appears in multiple elements:
  ```typescript
  // WRONG — may match 2 elements
  page.getByText('Placed')
  // RIGHT
  page.locator('.timeline').getByText('Placed', { exact: true })
  ```
- Flags: reCAPTCHA, iframes, dynamic content, dialog triggers

**Updates:** `rca-log.md` (BLAST protocol)

---

## /test-case-creation

**Trigger:** `/test-case-creation <URL> <EPIC-KEY>`

**What it does:** Fetches Epic from Jira → maps each AC line → generates test cases. Creates in Jira or outputs as markdown table.

**Input:**
```
/test-case-creation http://localhost:7000/order-details.html SCRUM-255
/test-case-creation https://saucedemo.com SCRUM-48
```

**Two-source model (CRITICAL):**
| Source | Used For |
|---|---|
| Jira Epic / AC | Assertions — what SHOULD happen |
| DOM / UI | Locators only — how to find elements |

> Never derive expected behavior from UI. Epic is truth. If UI doesn't match Epic → test FAILS → bug caught ✅

**Output (Jira):**
- N issues created as children of Epic
- Each issue: summary, steps, expected result, test data, source traced to AC line
- Asks: create POM + spec file?

**Test case structure in Jira:**
```
Summary:    OD-001: Verify Order ID displayed at top @SCRUM-256
Source:     Epic SCRUM-255 AC line 1
Steps:      1. Navigate → 2. Check element
Expected:   "#BLK-20240625-8842" visible (exact Epic text)
```

**Requirement gaps:** Flags ACs with no matching UI element → potential missing feature

**Updates:** `progress.md` (BLAST protocol)

---

## /test-case-execution

**Trigger:** `/test-case-execution <EPIC-KEY>` or `/test-case-execution <TEST-CASE-KEY>`

**What it does:** Runs Playwright tests → investigates failures → updates Jira statuses → files bugs for real defects.

**Input:**
```
/test-case-execution SCRUM-255          ← runs all 13 child tests
/test-case-execution SCRUM-263          ← runs single test
/test-case-execution SCRUM-255 firefox  ← specific browser
```

**ALWAYS headed mode** — `--headed` flag mandatory (AH Rule 17). Never headless.

**Failure classification (AH Rule 23):**
| Category | Signal | Action |
|---|---|---|
| `BROKEN_LOCATOR` | `0 elements found` | `npm run ai:heal` → auto-patch POM |
| `REAL_BUG` | Element visible, interaction broken | File Jira Bug → mark test Blocked |
| `FLAKY` | Passes on retry | `npm run ai:flaky` → add `@flaky` tag |
| `ENV_ISSUE` | Auth failure, binary missing | Fix env, reinstall browsers |

**Jira updates per result:**
| Result | Jira Status | Comment |
|---|---|---|
| PASS | Done | "Working as expected" + screenshot path |
| FAIL (app bug) | In Review | "Not working as expected" + bug key |
| FAIL (locator) | In Progress | Auto-fix applied, rerunning |
| BLOCKED | In Review | Bug filed as SCRUM-XXX |

**Bug filing (Step 5C):**
1. Search for duplicate bug first (AH Rule 21)
2. Create bug → capture bug key
3. **Link bug → test case** (`createIssueLink`: bug Blocks test) ← mandatory, never skip
4. Transition test to "In Review"
5. Add comment with bug key + evidence

**Screenshots:** `screenshots/{EpicKey}/{IssueKey}_{TestID}_{title}_{PASS|FAIL}.png`

**Updates:** `progress.md` + `rca-log.md` (BLAST protocol)

---

## Full E2E Flow

```
1. /explore <url>
   └─ Live DOM → POM file saved

2. /test-case-creation <url> <EPIC-KEY>
   └─ Epic AC → Jira test cases → spec file

3. /test-case-execution <EPIC-KEY>
   └─ Run tests (headed)
   └─ PASS → Done in Jira
   └─ FAIL → classify → auto-fix OR file bug → Blocked in Jira
```

---

## Common Gotchas

| Gotcha | Fix |
|---|---|
| Server not running | `python -m http.server 7000 --directory c:\ClaudeCodeMasterclass` |
| Browser binary missing | `cd "Playwright Automation Framework" && npx playwright install chromium` |
| `getByText` strict mode violation | Scope to parent + `{ exact: true }` |
| Cancel/confirm dialogs | `page.on('dialog', dialog => dialog.accept())` before click |
| Invoice download test | `page.waitForEvent('download')` before button click |
| SCRUM project has no "Blocked" | Use "In Review" (transition id=31) as proxy |
| "Test" issue type invalid | Use "Story" for test cases in SCRUM project |

---

## Quick Reference — Commands

```bash
# Start local server
python -m http.server 7000 --directory c:\ClaudeCodeMasterclass

# Run specific spec headed
cd "Playwright Automation Framework"
npx playwright test tests/ui/order-details.spec.ts --project=chromium --headed

# Run single test by name
npx playwright test --grep "OD-006" --project=chromium --headed

# AI agents
cd agent-factory-cli
npm run ai:rca       # classify failure
npm run ai:heal      # fix broken locators
npm run ai:flaky     # confirm + tag flaky
npm run ai:triage    # all 3 + Jira bug draft
```

---

*Last updated: 2026-06-27*  
*Rules: ANTI-HALLUCINATION-RULES.md (25 rules) | AUTO-FIX-PROTOCOL.md (17 rules)*
