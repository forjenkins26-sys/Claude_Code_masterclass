# Test Plan — Facebook Registration Testing

> Source ticket: SCRUM-86 — Facebook Registration Testing
> Author: QA Team · Date: 2026-06-14 · Status: Draft

## Table of Contents
1. Objective
2. Scope
3. Inclusions
4. Test Environments
5. Defect Reporting Procedure
6. Test Strategy
7. Test Schedule
8. Test Deliverables
9. Entry and Exit Criteria
10. Test Execution
11. Test Closure
12. Tools
13. Risks and Mitigations
14. Approvals

---

## Objective

This test plan covers functional, validation, edge case, and security testing of the Facebook user registration flow (Create New Account page). Testing validates form inputs — name, email, password, date of birth, gender — along with dropdown/radio button functionality, invalid input rejection, and XSS/SQL injection prevention. 19 test cases (REG-001 to REG-019) are defined and automated via Playwright TypeScript in `registration.spec.ts`.

**URL / System under test:** https://www.facebook.com (Create Account modal/page)

---

## Scope

1. **Functional Testing** — Verify all registration form fields render and accept valid data; form submits correctly when all fields valid.
2. **Data Validation Testing** — Verify invalid email, weak password, missing required fields, underage DOB trigger correct rejection behavior.
3. **Error Handling Testing** — Verify error messages appear for invalid inputs; form does not proceed on invalid state.
4. **Security Testing** — SQL injection in name/email fields; XSS in name and email fields — neither must execute or crash the form.
5. **Edge Case Testing** — Underage user DOB, existing email re-registration, missing gender selection.
6. **Regression Testing** — Re-run full 19 test suite after any Facebook page structure change.

> Out of scope: actual Facebook account creation (live network), post-registration flows, email verification, two-factor auth.

---

## Inclusions

**DOM Verification (6 tests)**
- All registration form inputs present: First Name, Last Name, Email/Mobile, Password, DOB (month/day/year dropdowns), Gender radio buttons
- Submit button visible and enabled
- "Already have an account?" / Log In link present

**Behavioral Validation (6 tests)**
- Valid complete registration data → form proceeds (or shows CAPTCHA — expected)
- Invalid email format → error shown
- Weak password (too short) → error shown
- Missing required field (name empty) → error shown
- Gender not selected → error or default applied
- DOB dropdowns functional — month/day/year all selectable

**Edge Cases (4 tests)**
- Underage DOB (under 13) → rejected or warning shown
- Existing email re-registration → "email already in use" or similar error
- Very long name input → accepted or truncated gracefully
- Special characters in name → handled without crash

**Security Tests (3 tests)**
- SQL injection `'; DROP TABLE users; --` in First Name → no execution, no server error
- XSS `<script>alert('xss')</script>` in name field → sanitised
- XSS in email field → sanitised

---

## Test Environments

| Name | Env URL |
|------|---------|
| Production | https://www.facebook.com |
| Pre-Prod | _(not applicable — Facebook live site)_ |

**Platform / browser matrix**
- Chromium (Desktop Chrome) — primary
- Firefox
- WebKit
- Note: Facebook may show locale-specific UI. Use role/name attribute selectors — NOT text content (page may be in Gujarati or other languages).

---

## Defect Reporting Procedure

- **Defect criteria:** field accepts invalid data, error message missing, form submits on invalid state, security payload executes.
- **Reporting:** Jira bug — summary, steps, expected vs actual, screenshot.
- **Tooling:** JIRA — project SCRUM.
- **Note:** Facebook live site changes frequently. If a selector breaks, investigate via headed mode before filing as bug vs test issue.
- **Roles / POCs:**

| Area | POC |
|------|-----|
| QA Automation | _(assumed — confirm)_ |
| Test Lead | _(assumed — confirm)_ |

---

## Test Strategy

**Step 1 — Design.**
- Equivalence Class Partitioning: valid/invalid per field
- Boundary Value Analysis: password min-length, DOB age limits (13 minimum for Facebook)
- Decision Table: combinations of missing required fields
- Error Guessing: emoji in name, phone number as email, future DOB year
- Exploratory: tab order, paste, mobile viewport behavior

**Step 2 — Execution flow.**
1. Navigate to facebook.com → click "Create New Account".
2. Smoke: fill valid data → assert form proceeds.
3. Full suite: REG-001 to REG-019 in headed mode.
4. Security tests last (REG-017 to REG-019).
5. Log failures; classify test issue vs Facebook behavior change vs actual bug.

**Step 3 — Best practices.**
- Use role/attribute selectors — NOT text (locale changes break text selectors).
- Add `networkidle` wait after navigation — Facebook is JS-heavy.
- Security tests: verify no alert dialog fires (`page.on('dialog')`).

---

## Test Schedule

| Task | Dates |
|------|-------|
| Creating Test Plan | 2026-06-14 |
| Test Case Creation | _(already defined — REG-001 to REG-019)_ |
| Test Case Execution | _(assumed — confirm)_ |
| Summary Reports Submission | _(assumed — confirm)_ |

> Estimated duration: 1 sprint _(assumed — confirm)_.

---

## Test Deliverables

- Test Plan (this document)
- Playwright spec: `Playwright Automation Framework/tests/ui/registration.spec.ts`
- POM: `src/pages/RegistrationPage.ts`
- Defect Reports — new Jira bugs filed per failure
- Test Summary Report (19 tests: pass/fail/blocked breakdown)

---

## Entry and Exit Criteria

### Requirement Analysis
- **Entry:** SCRUM-86 scope reviewed; Facebook registration page accessible.
- **Exit:** 19 test case scenarios understood; selector strategy confirmed (role/attribute).

### Test Execution
- **Entry:** Playwright suite ready; Facebook.com accessible; headed mode confirmed working.
- **Exit:** REG-001 to REG-019 executed; all results recorded; failures classified.

### Test Closure
- **Entry:** Execution complete; defects filed.
- **Exit:** Test Summary Report delivered; open defects triaged.

---

## Tools

- **Jira** — bug tracking (project: SCRUM)
- **Playwright (TypeScript)** — `tests/ui/registration.spec.ts`
- **Playwright HTML Reporter + Trace Viewer**

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Facebook page structure changes | Re-verify selectors in headed mode; update POM |
| Locale/language changes break text selectors | Use role/name/attribute selectors only |
| CAPTCHA blocks registration flow | Note in summary; test DOM/validation without actual submit |
| Security test triggers Facebook ban/block | Use clearly fake test data; don't repeat rapid requests |
| Non-availability of resource | Backup resource planning |

---

## Approvals

Documents sent for approval before proceeding:
- Test Plan
- Test Cases (REG-001 to REG-019)
- Test Summary Report

> Testing continues to next step only once approvals are done.
