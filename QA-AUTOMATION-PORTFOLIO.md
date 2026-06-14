# QA Automation Portfolio
### Anand Soni — Senior QA Engineer

---

## Executive Summary

End-to-end test automation ecosystem built from scratch using **Playwright + TypeScript**, integrated with **Jira via MCP (Model Context Protocol)**, AI-driven test generation, multi-layer reporting (Allure + Playwright HTML), and two original QA engineering frameworks: **Anti-Hallucination Rules** and **Auto-Fix Protocol**.

The system covers 84+ test cases across 5 features, with automated Jira lifecycle management (To Do → In Progress → Done/Blocked), screenshot archiving, and zero-touch bug filing.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Test Framework | Playwright Test + TypeScript |
| Architecture | 8-Layer POM with Fixture-based DI |
| Reporting | Allure v3.10.0 + Playwright HTML |
| CI Integration | JSON reporter → allure-results pipeline |
| Jira Integration | Atlassian MCP (OAuth via Claude connectors) |
| AI Tooling | Claude Code custom skills (`/test-case-creation`, `/test-case-execution`, `/test-plan`) |
| QA Frameworks | Anti-Hallucination Rules, Auto-Fix Protocol |
| Local Demo Apps | Blinkit Login (`localhost:7000`), Registration Demo (`localhost:7000/registration-demo.html`) |

---

## 1. Test Automation Framework Architecture

### Page Object Model — Fixture-Based Dependency Injection

All page objects injected via a single fixture file — tests never `new` a class directly.

```typescript
// src/fixtures/test-fixtures.ts
export const test = base.extend<PageFixtures>({
  registrationPage: async ({ page }, use) => {
    const registrationPage = new RegistrationPage(page);
    await use(registrationPage);
  },
  blinkitLoginPage: async ({ page }, use) => {
    const blinkitLoginPage = new BlinkitLoginPage(page);
    await use(blinkitLoginPage);
  },
  // + loginPage, forgotPasswordPage
});
```

**Why this matters:** Tests are completely decoupled from construction logic. Swap implementation → zero test changes. Exactly how enterprise codebases work.

### Page Object — Verified Locators Only

```typescript
// src/pages/RegistrationPage.ts
// All locators VERIFIED from live DOM (2026-06-12)
export class RegistrationPage {
  readonly firstNameInput:  Locator; // #firstName
  readonly emailInput:      Locator; // #email — BUG-A: validateEmail() only checks @ presence
  readonly passwordInput:   Locator; // #password — BUG-B: validatePassword() only checks length >= 8
  readonly submitButton:    Locator; // #submitBtn, text="Create Account"
  readonly toast:           Locator; // #toast — gains .show class on success

  constructor(page: Page) {
    this.firstNameInput = page.locator('#firstName');
    this.emailInput     = page.locator('#email');
    this.submitButton   = page.locator('#submitBtn');
    this.toast          = page.locator('#toast');
    // ...
  }
}
```

### Reporter Configuration

```typescript
// playwright.config.ts
reporter: [
  ['html',             { outputFolder: 'playwright-report', open: 'never' }],
  ['json',             { outputFile: 'test-results/results.json' }],
  ['list'],
  ['allure-playwright', { outputFolder: 'allure-results' }],
],
```

Multi-reporter setup: list output for CI logs, JSON for downstream processing, Playwright HTML for quick review, Allure for stakeholder dashboards.

---

## 2. Custom AI Skills — Automated QA Pipeline

Three custom skills built as reusable Claude Code commands. Each is a markdown instruction file that drives AI behavior precisely.

### `/test-case-creation` — Requirements-Driven Test Generation

**Not just "generate tests from the UI."** This skill enforces a strict two-source architecture:

| Source | Used For |
|---|---|
| Jira Epic / acceptance criteria | Test assertions — what SHOULD happen |
| UI DOM analysis | Locators only — how to find elements |

**Why this distinction matters:** If the UI has a typo (`"Sinup"` instead of `"Sign Up"`), a UI-driven test accepts the typo. A requirements-driven test asserts `"Sign Up"` → FAILS → bug caught. The test is correct. The UI is wrong.

**Invocation:**
```bash
/test-case-creation http://localhost:7000/registration-demo.html epic SCRUM-142 output jira SCRUM
```

**What it does:**
1. Fetches Epic SCRUM-142 from Jira via MCP → extracts acceptance criteria
2. Runs live DOM fetch via Playwright (`fetch-local-page.js`) for localhost URLs
3. Maps each requirement → one or more test scenarios
4. Creates test cases directly in Jira (33 issues under SCRUM-142) with:
   - Exact expected result text from Epic (not UI observation)
   - Preconditions, test steps, test data columns
   - Source column: `Epic SCRUM-142` or `UI Observed`
5. Flags requirement gaps: Epic mentions feature → no UI element → potential missing feature

**Output:** 33 Jira test cases (REG-001 to REG-033) created, linked to Epic, ready for execution

---

### `/test-case-execution` — Automated Execution + Jira Lifecycle

**Not just "run tests."** Full QA lifecycle automation:

```
Jira "To Do" → In Progress → [Run Playwright headed] → Parse result → Done / Blocked
                                                                    ↓ (if fail)
                                                          Investigate: test bug vs app bug
                                                                    ↓
                                                          Auto-Fix Protocol (max 3 attempts)
                                                                    ↓
                                                          File Jira bug if real app defect
```

**Invocation:**
```bash
/test-case-execution SCRUM-142
```

**Execution rules enforced:**
- Always `--headed` mode (Anti-Hallucination Rule 17 — real selector verification)
- `--screenshot=on` for both pass and fail
- Results parsed from JSON reporter — no assumption, only verified facts
- Screenshots organised: `screenshots/SCRUM-142/SCRUM-XXX_REG-001_verify-success-toast_PASS.png`

**Bug classification logic (Rule 20):**
When a test fails, the skill does NOT assume the test is wrong. It classifies:

| What was seen | Wrong assumption | What the skill does |
|---|---|---|
| XSS test fails | "XSS handler broken" | Traces input → validation fn → finds BUG-A (email `@` check) is root cause |
| Error element missing | "Feature missing" | Asks: did validation run? What path did input take? |
| Unexpected pass | "Test is wrong" | Asks: which bug allowed this input through? |

**Result for SCRUM-142:** 33 tests executed. 27 pass (Done). 6 blocked by intentional app bugs — Jira updated automatically with blocking bug keys.

---

### `/test-plan` — Jira Ticket → Full Test Plan Document

```bash
/test-plan VWO-105                              # fetch ticket via MCP
/test-plan VWO-105 create docx ./output/testplan/
```

Generates a 14-section test plan:
- Objective, Scope, Inclusions, Environments, Defect Reporting
- Strategy (test types: smoke/regression/API/UI detection)
- Schedule, Deliverables, Entry/Exit Criteria
- Tools, Risks, Approvals

Outputs `.md` + `.docx` (via `python-docx`). Detects UI vs API test targets automatically.

---

## 3. Jira MCP Integration — Zero-Touch Issue Management

**MCP = Model Context Protocol.** Direct programmatic Jira access via OAuth — no copy-paste, no API token files.

### What gets automated:

| Action | MCP Tool |
|---|---|
| Fetch Epic + child issues | `searchJiraIssuesUsingJql` |
| Fetch test case details + acceptance criteria | `getJiraIssue` |
| Transition status (To Do → In Progress → Done) | `transitionJiraIssue` |
| Add execution comment with result + screenshot path | `addCommentToJiraIssue` |
| Create bug report from test failure | `createJiraIssue` |
| Link bug to blocked test case | `createIssueLink` |
| Update test case description with fix details | `editJiraIssue` |

### Real example — SCRUM-142 execution run:
- 33 child issues fetched via JQL: `parent = SCRUM-142 ORDER BY key ASC`
- Each transitioned: To Do → In Progress → Done (pass) or Blocked (app bug)
- 6 blocked tests linked to SCRUM-176 (BUG-A: email validation) and SCRUM-177 (BUG-B: password validation)
- Comments added with: duration, retry count, browser, screenshot path, exact failure reason

---

## 4. Anti-Hallucination Rules Framework

**Original QA engineering framework.** Written to prevent a specific class of automation failure: tests that pass because they validate wrong behavior, not because the feature works.

### Core Problem It Solves

AI-generated tests and even human-written tests fall into common traps:
- **URL hallucination:** Assuming `/login` when actual path is `/auth/v2/sso`
- **Selector hallucination:** `input[name="firstname"]` when actual DOM has no `name` attribute
- **State hallucination:** "User is logged in" without verifying actual session state
- **Rubber-stamp testing:** Test observes UI, asserts what UI does → validates broken implementation

### Key Rules (Selected)

**Rule 17 — Headed Mode First:**
When a test fails `"element not found"`, never guess selectors. Run headed mode, inspect actual DOM, use verified selectors. Headless guessing: 1 hour wasted. Headed investigation: 30 seconds.

**Rule 18 — `pressSequentially()` for Constraint Tests:**
```typescript
// WRONG — fill() bypasses maxlength HTML attribute
await phoneInput.fill('12345678901234');

// RIGHT — pressSequentially() simulates real keystrokes, browser enforces maxlength
await phoneInput.pressSequentially('12345678901234');
const value = await phoneInput.inputValue();
expect(value.length).toBeLessThanOrEqual(10);
```

**Rule 19 — Requirements Drive Assertions, UI Drives Locators:**
UI observation = locator source. Epic acceptance criteria = assertion source. These are never swapped.

**Rule 20 — Classify by Actual Failure Mechanism:**
```
REG-032: XSS email test fails
Wrong: "XSS vulnerability — fix XSS handler"
Right: "BUG-A: validateEmail() checks only @ presence → accepts XSS payload because it contains @
        Root bug: email validation. XSS test is a side-effect victim."
```

### Interview Talking Point

> "I wrote this after discovering that our test suite had a 96% pass rate but was actually rubber-stamping broken behavior. The tests were correct mechanically but derived their expected results from observing the broken UI rather than from requirements. I built these rules to enforce the separation: UI tells you WHERE elements are, requirements tell you WHAT they should do."

---

## 5. Auto-Fix Protocol

**Original incident response framework for test automation.** When a test fails, most teams ask the engineer to investigate. This protocol makes investigation systematic and autonomous.

### The Protocol

```
DETECT   → Extract: what failed, where, why. Classify root cause.
INVESTIGATE → Headed mode. DOM state check. exists ≠ visible ≠ actionable.
FIX      → Apply based on investigation. Document why it works.
VERIFY   → Single test → related → full suite → 3x repeat.
REPORT   → 100% fixed or escalate after 3 attempts.
```

### Failure Classification Gate

The most important question: **is this a test bug or an application bug?**

| Symptom | Root Cause | Action |
|---|---|---|
| Element not found | Selector wrong | Fix selector (investigate headed first) |
| Element found, click ignored | App button broken | File Jira bug, mark test Blocked |
| Form submits, no error shown | App validation missing | File Jira bug, don't fix test |
| Test fails first run, passes on retry | Timing/race condition | Fix wait strategy |

**Critical rule:** Never modify a test assertion to make a failing test pass if the test is correctly catching an application bug. The test is evidence. Changing it destroys the evidence.

### Rule 13 — Fix ALL Artifacts

When a hallucinated name is found (e.g., `searchButton` when actual UI text is "Continue"):
- Fix selector in POM
- Rename property: `searchButton` → `continueButton`
- Rename method: `clickSearch()` → `clickContinue()`
- Update all spec files referencing old name
- Update Jira test case titles/descriptions
- Update CLAUDE.md, README, comments

**Why:** A code fix with a misleading variable name is a ticking time bomb. The next engineer reads `searchButton` and debugs for an hour wondering why "search" doesn't work on a page with no search feature.

---

## 6. Reporting — Allure Dashboard

### Setup

```bash
# Install
npm install --save-dev allure-playwright

# Generate report from results
npx allure generate allure-results --clean -o allure-report

# Serve (background, no CMD window)
python -m http.server 5001 --directory allure-report &
```

### Reporter config

```typescript
reporter: [
  ['allure-playwright', { outputFolder: 'allure-results' }],
  ['html',             { outputFolder: 'playwright-report', open: 'never' }],
  ['json',             { outputFile: 'test-results/results.json' }],
  ['list'],
],
```

### What Allure Shows

- Pass/fail breakdown with percentage
- Suite-level grouping (by spec file)
- Per-test timeline, duration, retry count
- Screenshot attachments on failure
- Flaky test detection (passed on retry)
- Categories (broken, failed, skipped, passed)
- Trend chart across runs (with history)

### Screenshot Archiving

`globalSetup` runs before every test run and archives `test-results/` → `screenshots-archive/{timestamp}/` before Playwright clears it. No failure evidence ever lost.

Organized screenshots created by `/test-case-execution`:
```
screenshots/
  SCRUM-142/
    SCRUM-143_REG-001_verify-success-toast_PASS.png
    SCRUM-152_REG-010_verify-invalid-email-format_FAIL.png
```

---

## 7. Features Covered — Test Matrix

| Feature | Epic | Tests | Status |
|---|---|---|---|
| Facebook Login | SCRUM-68 | 17 (TC-001–TC-017) | All Done |
| Facebook Registration | SCRUM-86 | 19 (REG-001–REG-019) | All Done |
| Facebook Forgot Password | SCRUM-85 | 15 (FP-001–FP-015) | All Done |
| Blinkit Login | SCRUM-121 | 19 (BL-001–BL-019) | 18 Done, 1 Blocked (SCRUM-141) |
| Registration Demo | SCRUM-142 | 33 (REG-001–REG-033) | 27 Done, 6 Blocked (SCRUM-176/177) |
| **Total** | **5 Epics** | **103 tests** | **101 Done, 2 Blocked** |

**Blocked tests are not failures.** They are correctly written tests catching real application bugs. Blocking is the right status — it communicates "test is valid, app is broken."

---

## 8. Intentional Bug Design — Teaching Tool

Two bugs embedded in `registration-demo.html` to demonstrate realistic failure scenarios:

**BUG-A (SCRUM-176) — Email Validation:**
```javascript
// Actual implementation (intentionally broken)
function validateEmail(email) {
  return email.includes('@'); // Only checks @ presence
}
// Accepts: "notanemail@", "<script>@x.com", "a@"
// Should reject all of these
```
Affects: REG-009, REG-010, REG-011, REG-032 (XSS via email field)

**BUG-B (SCRUM-177) — Password Validation:**
```javascript
// Actual implementation (intentionally broken)
function validatePassword(password) {
  return password.length >= 8; // Only checks length
}
// Accepts: "password1" (no uppercase, no special char)
// Should require: uppercase + lowercase + digit + special char
```
Affects: REG-020, REG-021

**Interview talking point:** "I designed the application to have known defects so I could demonstrate the full QA cycle — test detects bug, engineer investigates, classifies root cause correctly (Rule 20), files Jira bug with exact reproduction steps, marks test Blocked (not Failed), links bug to test case. That's production QA workflow, not just running scripts."

---

## 9. Key Engineering Decisions

### Why Fixture-Based DI?

Alternatives (direct `new` in test, `beforeEach` construction) create tight coupling. Fixture pattern:
- Page object lifecycle managed by framework, not test
- Tests receive objects ready to use
- Swap implementation behind interface → tests unchanged
- Exactly matches how DI containers work in production code

### Why `pressSequentially()` over `fill()` for constraint tests?

`fill()` injects value directly into DOM, bypassing browser input event pipeline. `maxlength` is enforced by browser on `keydown` events, not DOM property. `fill()` gives false passes on constraint tests. `pressSequentially()` simulates real keystrokes — browser enforces constraints as real user would trigger them.

### Why requirements-drive assertions, not UI observation?

QA role is to verify software meets requirements, not to document what software currently does. UI-driven tests validate the broken implementation. Requirements-driven tests catch the broken implementation. The difference is whether QA adds value or adds paperwork.

### Why MCP over API tokens?

MCP uses OAuth — no credentials in environment files, no rotation overhead, no security audit risk. Direct tool integration means zero boilerplate HTTP code. Jira operations are first-class tool calls, not string-concatenated REST requests.

---

## 10. Interview Questions — Prepared Answers

**Q: How do you handle flaky tests?**
> "Flaky tests have a root cause — they don't just 'happen'. My Auto-Fix Protocol classifies flakiness as: timing (add proper wait), networkidle (change wait strategy), selector fragility (fix to stable attribute). I track retry count in Allure. Anything with retry > 0 gets investigated before being committed. Force-click and `waitForTimeout` are symptoms, not fixes — I fix the wait strategy."

**Q: How do you ensure tests don't validate broken behavior?**
> "Anti-Hallucination Rule 19: UI analysis gives you locators, requirements give you assertions. I never derive expected results from what the UI currently does — I derive them from the Epic acceptance criteria. If the UI disagrees with requirements, the test fails and I file a bug. The test is correct."

**Q: How do you manage test maintenance when selectors change?**
> "Page Object Model with verified, ID-based selectors. IDs are the most stable selector type. Every selector in my POM has a comment showing the verification date and method (headed mode, DOM inspection). When a selector breaks, I run headed mode investigation before touching any code — Rule 17. I fix the helper method, not individual tests — one fix covers all tests using that locator."

**Q: What's your Jira integration approach?**
> "Full lifecycle via MCP. Test execution updates Jira status automatically: To Do → In Progress → Done or Blocked. Bug filing is automated from the `/test-case-execution` skill — it creates the Jira bug, links it to the blocked test case, and adds a comment explaining the classification. Engineers don't do status updates manually."

**Q: How do you handle test environment setup?**
> "Global setup archives screenshots before Playwright clears `test-results/`. Local demo apps run via Python HTTP server in background (no window). Multi-project Playwright config routes tests by pattern: `blinkit.*\.spec\.ts` goes to blinkit project (localhost baseURL), everything else goes to Facebook/registration projects. No test touches the wrong environment."

---

## Repository Structure

```
Playwright Automation Framework/
├── src/
│   ├── fixtures/test-fixtures.ts    # DI: injects all page objects into tests
│   ├── pages/
│   │   ├── LoginPage.ts             # Facebook login POM
│   │   ├── RegistrationPage.ts      # Facebook + demo registration POM
│   │   ├── ForgotPasswordPage.ts    # Facebook forgot password POM
│   │   └── BlinkitLoginPage.ts      # Blinkit login POM (localhost)
│   └── global-setup.ts             # Screenshot archiver (runs before each suite)
├── tests/ui/
│   ├── login.spec.ts                # 17 tests, SCRUM-68
│   ├── registration.spec.ts         # 19+33 tests, SCRUM-86 + SCRUM-142
│   ├── forgot-password.spec.ts      # 15 tests, SCRUM-85
│   └── blinkit-login.spec.ts        # 19 tests, SCRUM-121
├── screenshots/                     # Organised: {EpicKey}/{IssueKey}_{TestID}_{slug}_{PASS|FAIL}.png
├── allure-results/                  # Raw Allure data (input to generate)
├── allure-report/                   # Generated HTML dashboard
├── playwright-report/               # Playwright built-in HTML report
└── playwright.config.ts             # Multi-project config + 4 reporters
```

---

*Anand Soni | QA Automation Engineer | 2026*
