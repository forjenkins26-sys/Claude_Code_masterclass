# Test Plan — Facebook Login & Authentication Testing

> Source ticket: SCRUM-48 — Facebook Login & Authentication Testing
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

This test plan covers comprehensive authentication and user access testing for the Facebook login page — Facebook's primary authentication gateway. Testing validates the complete login flow (email/mobile + password), password recovery ("Forgot password?"), new account creation workflow, language preference selection, Meta ecosystem product links (Messenger, Instagram, Threads), and privacy/terms access. Automation via Playwright TypeScript.

**URL / System under test:** https://www.facebook.com/

---

## Scope

1. **Functional Testing** — Verify login authentication (email + password), all navigation links, language selector, Meta product links, and footer links function correctly.
2. **Data Validation Testing** — Verify empty fields, invalid email formats, wrong passwords produce correct rejection behavior.
3. **Error Handling Testing** — Verify error messages appear for failed login attempts; form does not proceed on invalid state.
4. **Security Testing** — SQL injection and XSS in email and password fields.
5. **Compatibility Testing** — Chromium, Firefox, WebKit; language-agnostic selectors mandatory.
6. **Regression Testing** — Re-run after Facebook structural changes.

> Out of scope: actual authenticated session, post-login features, mobile app, 2FA, Messenger/Instagram backend.

---

## Inclusions

**Login Authentication**
- Valid credentials → login proceeds (CAPTCHA expected in headless)
- Invalid email format → error shown
- Wrong password → "Wrong password" or equivalent error
- Empty email field → validation error
- Empty password field → validation error
- Login with mobile number format → accepted

**Password Recovery**
- "Forgot password?" link → navigates to password recovery flow
- Recovery page loads with email/phone input

**New Account Creation**
- "Create new account" link → opens registration page/modal
- Registration form renders correctly

**Language Selection**
- Language selector present in footer/header
- Selecting a language re-renders page in chosen language
- Login form still functional after language switch

**Meta Product Links**
- Messenger link present and clickable
- Instagram link present
- Threads link present
- Other Meta product links functional

**Privacy & Terms**
- Privacy Policy link present and navigates correctly
- Terms of Service link present and navigates correctly

---

## Test Environments

| Name | Env URL |
|------|---------|
| Production | https://www.facebook.com/ |
| Pre-Prod | _(not applicable — live site)_ |

**Platform / browser matrix**
- Chromium — primary
- Firefox
- WebKit
- Note: Locale may be non-English — use attribute/role selectors only.

---

## Defect Reporting Procedure

- **Defect criteria:** login proceeds on empty/invalid input, navigation link broken, language switch breaks form, security payload executes, Meta product links missing.
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
- Equivalence Class Partitioning: valid/invalid credentials, present/missing fields
- Use Case testing: end-to-end login → forgot password → create account flows
- Error Guessing: email with spaces, very long password, phone as email
- Exploratory: footer link coverage, language switch mid-session

**Step 2 — Execution flow.**
1. Navigate to facebook.com; confirm page loads.
2. Smoke: login form present + Log In button visible.
3. Authentication tests: valid/invalid credentials.
4. Navigation tests: Forgot password, Create account links.
5. Language selection tests.
6. Meta product link tests.
7. Security tests last.

**Step 3 — Best practices.**
- Attribute-based selectors: `input[name="email"]`, `input[name="pass"]`.
- Verify Meta product links exist in DOM before clicking (avoid stale element errors).
- Language test: after switch, re-assert `input[name="email"]` still present (same attribute).

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
- Playwright spec covering login, forgot-password link, create-account link, language, Meta links
- POM: `src/pages/LoginPage.ts`
- Defect Reports — new Jira bugs per failure
- Test Summary Report

---

## Entry and Exit Criteria

### Requirement Analysis
- **Entry:** SCRUM-48 scope reviewed; Facebook page accessible; locale noted.
- **Exit:** All flow scenarios mapped; selector strategy confirmed.

### Test Execution
- **Entry:** Playwright suite ready; Facebook.com accessible.
- **Exit:** All test cases executed; results recorded; failures classified.

### Test Closure
- **Entry:** Execution complete; defects filed.
- **Exit:** Test Summary Report delivered; open defects triaged.

---

## Tools

- **Jira** — bug tracking (project: SCRUM)
- **Playwright (TypeScript)**
- **Playwright HTML Reporter + Trace Viewer**

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Facebook page structure changes | Headed mode re-verification; update selectors |
| CAPTCHA blocks actual login | Test form validation layer; document CAPTCHA as blocker |
| Meta product links change | Use flexible `href` attribute checks not exact URL |
| Locale renders non-English | Attribute-only selectors; never text-based |
| Non-availability of resource | Backup resource planning |

---

## Approvals

Documents sent for approval before proceeding:
- Test Plan
- Test Cases
- Test Summary Report

> Testing continues to next step only once approvals are done.
