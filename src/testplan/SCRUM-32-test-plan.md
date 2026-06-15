# Test Plan — VWO Login & Authentication Testing

> Source ticket: SCRUM-32 — VWO Login & Authentication Testing
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

This test plan covers comprehensive authentication and account verification testing for the VWO (Visual Website Optimizer) platform login page. Testing validates the complete login flow, account verification ("Verify Now") workflow, help resources, demo call features, session management (logout), and platform loading/initialization experience. Automation via Playwright TypeScript targeting the VWO SPA login interface.

**URL / System under test:** https://app.vwo.com/#/login

---

## Scope

1. **Functional Testing** — Verify login form renders (email, password, Log In button); verify authentication flow; verify "Verify Now" account verification workflow.
2. **Data Validation Testing** — Verify invalid email format, wrong password, empty fields produce correct rejection behavior with error messages.
3. **Error Handling Testing** — Verify error messages appear on failed login; form does not proceed on invalid state.
4. **Security Testing** — SQL injection and XSS in email and password fields.
5. **Integration Testing** — Verify help resources link, "Book a Demo" / demo call feature accessible from login page.
6. **Regression Testing** — Re-run after VWO page structure changes; SPA hash-routing requires careful URL verification.

> Out of scope: post-login VWO dashboard, A/B test creation, campaign management, billing, 2FA/SSO flows.

---

## Inclusions

**Login Page DOM Verification**
- Email input field present
- Password input field present
- "Log In" / Sign In button present and enabled
- "Forgot password?" or password recovery link present
- VWO logo / branding visible
- Page loads at `https://app.vwo.com/#/login`

**Login Authentication**
- Valid credentials → redirect to VWO dashboard (post-login page)
- Invalid email format → validation error
- Wrong password → error message shown
- Empty email → validation error
- Empty password → validation error
- Correct credentials + Enter key → same as button click

**Account Verification ("Verify Now") Workflow**
- "Verify Now" button/link present (if account unverified state)
- Clicking "Verify Now" → triggers verification flow
- Verification email prompt or next step shown

**Help Resources**
- Help / Support link accessible from login page
- Clicking help → navigates to help center or opens chat

**Demo Call Feature**
- "Book a Demo" or similar CTA present on login page
- Clicking → opens demo booking flow or external URL

**Session Management**
- Logout from authenticated state → redirected back to login page
- Session cleared — cannot navigate back to dashboard via Back button

**Security**
- SQL injection `' OR 1=1 --` in email → no execution
- XSS `<script>alert('xss')</script>` in password → sanitised, no alert fires

---

## Test Environments

| Name | Env URL |
|------|---------|
| Production | https://app.vwo.com/#/login |
| Pre-Prod | _(assumed — confirm if VWO staging env available)_ |

**Platform / browser matrix**
- Chromium — primary
- Firefox
- WebKit
- Note: VWO is a React SPA with hash routing (`#/login`). Wait for `networkidle` after navigation. URL verification must check hash fragment.

---

## Defect Reporting Procedure

- **Defect criteria:** login proceeds on invalid input, error message missing/wrong, "Verify Now" flow broken, help/demo link missing, logout doesn't clear session, security payload executes.
- **Reporting:** Jira bug — summary, steps, expected vs actual, screenshot.
- **Tooling:** JIRA — project SCRUM. Example filed bugs: VWO-106, VWO-107.
- **Roles / POCs:**

| Area | POC |
|------|-----|
| QA Automation | _(assumed — confirm)_ |
| Test Lead | _(assumed — confirm)_ |

---

## Test Strategy

**Step 1 — Design.**
- Equivalence Class Partitioning: valid/invalid email, correct/wrong password, empty fields
- State Transition: unauthenticated → login attempt → authenticated → logout → unauthenticated
- Use Case testing: end-to-end login → session → logout flow
- Error Guessing: email with spaces, very long password, hash in email local part
- Exploratory: VWO-specific "Verify Now" state; demo booking CTA behavior

**Step 2 — Execution flow.**
1. Navigate to `https://app.vwo.com/#/login`; wait for `networkidle`.
2. Smoke: email + password fields present; Log In button visible.
3. Authentication tests (valid/invalid credentials).
4. Verify Now workflow (if account state allows).
5. Help + demo link tests.
6. Session/logout tests.
7. Security tests last.

**Step 3 — Best practices.**
- SPA routing: after login/logout, assert `page.url()` contains expected hash fragment.
- Wait strategy: `networkidle` after navigation — VWO app initializes asynchronously.
- Security: `page.on('dialog')` listener to catch any unexpected alerts.

---

## Test Schedule

| Task | Dates |
|------|-------|
| Creating Test Plan | 2026-06-14 |
| Test Case Creation | _(assumed — confirm sprint dates)_ |
| Test Case Execution | _(assumed — confirm sprint dates)_ |
| Summary Reports Submission | _(assumed — confirm sprint dates)_ |

> Estimated duration: 1 sprint _(assumed — confirm)_.

---

## Test Deliverables

- Test Plan (this document)
- Playwright spec: VWO login spec (TypeScript)
- POM: VWO Login Page Object
- Defect Reports — new Jira bugs per failure (existing: VWO-106, VWO-107)
- Test Summary Report

---

## Entry and Exit Criteria

### Requirement Analysis
- **Entry:** SCRUM-32 scope reviewed; VWO login page accessible; test credentials available.
- **Exit:** All flow scenarios mapped; SPA routing behavior understood; selector strategy confirmed.

### Test Execution
- **Entry:** Playwright suite ready; `https://app.vwo.com/#/login` accessible; headed mode confirmed.
- **Exit:** All test cases executed; results recorded; failures classified (test issue vs VWO behavior change vs real bug).

### Test Closure
- **Entry:** Execution complete; defects filed.
- **Exit:** Test Summary Report delivered; open defects triaged.

---

## Tools

- **Jira** — bug tracking (project: SCRUM; VWO-106 / VWO-107 reference bugs)
- **Playwright (TypeScript)**
- **Playwright HTML Reporter + Trace Viewer**

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| VWO SPA takes time to initialize | Use `networkidle` wait; increase `navigationTimeout` if needed |
| Hash routing URL assertions | Use `toContain('#/login')` not `toEqual` exact URL |
| Test credentials expire or change | Maintain test account credentials in secure config |
| "Verify Now" state depends on account state | Use dedicated unverified test account for that test |
| VWO page structure changes | Headed mode re-verification; update POM selectors |
| Non-availability of resource | Backup resource planning |

---

## Approvals

Documents sent for approval before proceeding:
- Test Plan
- Test Cases
- Test Summary Report

> Testing continues to next step only once approvals are done.
