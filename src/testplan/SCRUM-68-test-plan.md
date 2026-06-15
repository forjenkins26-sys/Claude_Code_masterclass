# Test Plan — Facebook Login Page Testing

> Source ticket: SCRUM-68 — Facebook Login Page Testing
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

This test plan covers functional, validation, and security testing of the Facebook login page (https://www.facebook.com). Testing validates the login form (email/mobile + password), authentication flow, "Forgot password?" link navigation, "Create new account" link navigation, and multi-language support. 17 test cases (TC-001 to TC-017) are automated in `login.spec.ts` using Playwright TypeScript.

**URL / System under test:** https://www.facebook.com

---

## Scope

1. **Functional Testing** — Verify login form renders (email/mobile input, password input, Log In button); verify "Forgot password?" and "Create new account" links navigate correctly.
2. **Data Validation Testing** — Verify invalid email format, wrong password, empty fields produce appropriate error responses.
3. **Error Handling Testing** — Verify login rejected on invalid credentials with visible error message.
4. **Security Testing** — SQL injection and XSS in email and password fields.
5. **Compatibility Testing** — Run across Chromium, Firefox, WebKit with language-agnostic selectors (page may render in Gujarati or other locales).
6. **Regression Testing** — Re-run after Facebook page structure changes.

> Out of scope: actual Facebook session, post-login dashboard, mobile app, 2FA flow.

---

## Inclusions

**DOM Verification**
- Email/mobile input field present (TC-001)
- Password input field present
- "Log In" button visible and enabled
- "Forgot password?" link present
- "Create new account" link present
- Language selector present

**Login Behavior**
- Valid email + correct password → authentication attempt (may hit CAPTCHA in automation — expected)
- Invalid email format → error shown
- Valid email + wrong password → "Wrong password" or equivalent error
- Empty email → validation error
- Empty password → validation error
- Valid mobile number + correct password → authentication attempt

**Navigation Links**
- "Forgot password?" → navigates to forgot-password flow
- "Create new account" → navigates to registration page/modal

**Language Support**
- Language selector clickable; page re-renders in selected language

**Security**
- SQL injection in email field → no execution
- XSS in password field → no alert fires

---

## Test Environments

| Name | Env URL |
|------|---------|
| Production | https://www.facebook.com |
| Pre-Prod | _(not applicable — live site)_ |

**Platform / browser matrix**
- Chromium — primary
- Firefox
- WebKit
- **Important:** Page may display in Gujarati or another locale. All selectors must use `name`, `type`, `role` attributes — NOT visible text content.

---

## Defect Reporting Procedure

- **Defect criteria:** form field missing, login proceeds on empty input, error message absent, navigation link broken, security payload executes.
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
- Equivalence Class Partitioning: valid/invalid email formats, correct/wrong password, empty vs filled
- Boundary Value Analysis: minimum password length, email with/without domain
- Error Guessing: email with spaces, password with only spaces, very long strings
- Exploratory: double-click Log In, rapid Enter key submit, paste credentials

**Step 2 — Execution flow.**
1. Navigate to facebook.com; confirm login form renders.
2. Smoke: assert email field + password field + Log In button present (TC-001).
3. Full suite: TC-001 to TC-017 in headed mode.
4. Security tests last.
5. Classify failures: Facebook change vs test issue vs real bug.

**Step 3 — Best practices.**
- Selectors: `input[name="email"]`, `input[name="pass"]`, `button[name="login"]` — attribute-based.
- `networkidle` wait after submit (JS-heavy SPA).
- Security: assert `page.on('dialog')` never fires during XSS tests.

---

## Test Schedule

| Task | Dates |
|------|-------|
| Creating Test Plan | 2026-06-14 |
| Test Case Creation | _(TC-001 to TC-017 already in SCRUM-68 children)_ |
| Test Case Execution | _(assumed — confirm)_ |
| Summary Reports Submission | _(assumed — confirm)_ |

> Estimated duration: 1 sprint _(assumed — confirm)_.

---

## Test Deliverables

- Test Plan (this document)
- Playwright spec: `Playwright Automation Framework/tests/ui/login.spec.ts` (TC-001 to TC-017)
- POM: `src/pages/LoginPage.ts` (`createAccountLink` — `<a>` tag, not button)
- Defect Reports — new Jira bugs per failure
- Test Summary Report

---

## Entry and Exit Criteria

### Requirement Analysis
- **Entry:** SCRUM-68 scope reviewed; Facebook login page accessible; locale noted.
- **Exit:** 17 test scenarios understood; attribute-based selector strategy confirmed.

### Test Execution
- **Entry:** Playwright suite ready; Facebook.com accessible in headed mode.
- **Exit:** TC-001 to TC-017 executed; pass/fail recorded; failures classified.

### Test Closure
- **Entry:** Execution complete; defects filed.
- **Exit:** Test Summary Report delivered; open defects triaged.

---

## Tools

- **Jira** — bug tracking (project: SCRUM)
- **Playwright (TypeScript)** — `tests/ui/login.spec.ts`
- **Playwright HTML Reporter + Trace Viewer**

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Facebook selector changes | Re-verify in headed mode; update POM |
| Locale renders non-English text | Attribute selectors only — never text-based |
| CAPTCHA blocks login flow | Document; test DOM/validation layer only |
| `createAccountLink` is `<a>` not `<button>` | POM correctly uses `createAccountLink` (verified 2026-06-11) |
| Non-availability of resource | Backup resource planning |

---

## Approvals

Documents sent for approval before proceeding:
- Test Plan
- Test Cases (TC-001 to TC-017)
- Test Summary Report

> Testing continues to next step only once approvals are done.
