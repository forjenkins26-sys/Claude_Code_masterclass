# Test Plan — Facebook Forgot Password Testing

> Source ticket: SCRUM-85 — Facebook Forgot Password Testing
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

This test plan covers functional, behavioral, edge case, and security testing of Facebook's password recovery ("Forgot Password") flow. The flow is accessed via the "Forgot password?" link on the Facebook login page. Testing validates the email/phone input field, Search button behavior, Cancel/Back button functionality, invalid format handling, and non-existent account behavior. 15 test cases (FP-001 to FP-015) are automated in `forgot-password.spec.ts`.

**URL / System under test:** https://www.facebook.com → "Forgot password?" link

---

## Scope

1. **Functional Testing** — Verify the Forgot Password page renders correctly with email/phone input, Search button, and Cancel/Back button.
2. **Data Validation Testing** — Verify invalid email format and invalid phone format are rejected with appropriate feedback.
3. **Error Handling Testing** — Verify non-existent account input shows correct "account not found" behavior.
4. **Edge Case Testing** — Empty input submission, whitespace-only input, very long string input.
5. **Security Testing** — SQL injection and XSS payloads in the email/phone input field.
6. **Regression Testing** — Re-run after any Facebook page structure change.

> Out of scope: actual password reset email delivery, SMS OTP delivery, post-reset login flow.

---

## Inclusions

**DOM Verification (5 tests)**
- Forgot Password page loads after clicking "Forgot password?" on login page
- Email/phone input field present and focusable
- Search button present and enabled
- Cancel/Back button present
- Page heading / instruction text visible

**Behavioral Validation (5 tests)**
- Valid existing email → proceeds to next step (account found)
- Valid phone number format → proceeds to next step
- Search button click with valid input → navigates/updates page
- Cancel button → returns to login page
- Back button → returns to login page

**Edge Cases (3 tests)**
- Empty input → submit → validation error or button disabled
- Whitespace-only input → rejected
- Non-existent email → "No account found with that email" or equivalent message

**Security Tests (2 tests)**
- SQL injection `' OR 1=1 --` in email/phone field → no execution, no server error
- XSS `<script>alert('xss')</script>` → sanitised, no alert fires

---

## Test Environments

| Name | Env URL |
|------|---------|
| Production | https://www.facebook.com |
| Pre-Prod | _(not applicable — Facebook live site)_ |

**Platform / browser matrix**
- Chromium — primary
- Firefox
- WebKit
- Note: Use role/attribute selectors — NOT text content (locale may vary).

**Key locators (verified via headed mode):**
- `continueButton` — Search / Continue button
- `backButton` — Back / Cancel button

---

## Defect Reporting Procedure

- **Defect criteria:** input accepted when invalid, wrong/missing error message, Security payload executes, navigation broken.
- **Reporting:** Jira bug — summary, steps, expected vs actual, screenshot.
- **Tooling:** JIRA — project SCRUM.
- **Roles / POCs:**

| Area | POC |
|------|-----|
| QA Automation | _(assumed — confirm)_ |
| Test Lead | _(assumed — confirm)_ |

---

## Test Strategy

**Step 1 — Design.**
- Equivalence Class Partitioning: valid email, valid phone, invalid format, empty, non-existent account
- Boundary Value Analysis: empty vs 1-char vs valid length input
- Error Guessing: phone with spaces/dashes, email with multiple @, numeric-only input
- Exploratory: rapid Search clicks, paste, keyboard Enter to submit

**Step 2 — Execution flow.**
1. Navigate to facebook.com → click "Forgot password?".
2. Smoke: valid email → assert page advances.
3. Full suite: FP-001 to FP-015 in headed mode.
4. Security tests last (FP-014, FP-015).
5. Classify failures: Facebook behavior change vs test issue vs real bug.

**Step 3 — Best practices.**
- POM variable names: `continueButton` (not `searchButton`), `backButton` (not `cancelButton`) — verified via headed mode 2026-06-11.
- Security tests: assert no dialog fires via `page.on('dialog', ...)`.
- Use `networkidle` wait after Search click — Facebook is JS-heavy.

---

## Test Schedule

| Task | Dates |
|------|-------|
| Creating Test Plan | 2026-06-14 |
| Test Case Creation | _(already defined — FP-001 to FP-015)_ |
| Test Case Execution | _(assumed — confirm)_ |
| Summary Reports Submission | _(assumed — confirm)_ |

> Estimated duration: 1 sprint _(assumed — confirm)_.

---

## Test Deliverables

- Test Plan (this document)
- Playwright spec: `Playwright Automation Framework/tests/ui/forgot-password.spec.ts`
- POM: `src/pages/ForgotPasswordPage.ts` (locators: `continueButton`, `backButton`)
- Defect Reports — new Jira bugs per failure
- Test Summary Report (15 tests breakdown)

---

## Entry and Exit Criteria

### Requirement Analysis
- **Entry:** SCRUM-85 scope reviewed; Facebook forgot-password flow accessible.
- **Exit:** 15 test scenarios understood; POM locators confirmed in headed mode.

### Test Execution
- **Entry:** Playwright suite ready; Facebook.com accessible; headed mode working.
- **Exit:** FP-001 to FP-015 executed; all results recorded.

### Test Closure
- **Entry:** Execution complete; defects filed.
- **Exit:** Test Summary Report delivered; open defects triaged.

---

## Tools

- **Jira** — bug tracking (project: SCRUM)
- **Playwright (TypeScript)** — `tests/ui/forgot-password.spec.ts`
- **Playwright HTML Reporter + Trace Viewer**

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Facebook changes forgot-password flow | Re-verify in headed mode; update POM selectors |
| Locale changes button label text | Use role selector, not text (already using `continueButton` by role) |
| Non-existent account message text varies | Use `toContainText` (partial match) not `toHaveText` (exact) |
| Rate limiting / CAPTCHA on repeated runs | Space out runs; use unique test emails each run |
| Non-availability of resource | Backup resource planning |

---

## Approvals

Documents sent for approval before proceeding:
- Test Plan
- Test Cases (FP-001 to FP-015)
- Test Summary Report

> Testing continues to next step only once approvals are done.
