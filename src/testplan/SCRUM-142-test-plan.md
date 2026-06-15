# Test Plan — Registration Page Testing — Form Validation & Field Constraints

> Source ticket: SCRUM-142 — Registration Page Testing — Form Validation & Field Constraints
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

This test plan covers comprehensive client-side functional and validation testing of the Demo App registration page — a locally served HTML form with 7 input fields and a Terms & Conditions checkbox. The goal is to verify all field-level constraints, inline error messages, password strength indicator, age gate, and success toast against the acceptance criteria defined in SCRUM-142. Two intentional bugs (email and password validation) are documented and will produce known failures until fixed. Testing will produce a Playwright TypeScript automation suite.

**URL / System under test:** `http://localhost:7000/registration-demo.html` (served via `python -m http.server 7000 --directory c:\ClaudeCodeMasterclass`)

---

## Scope

1. **Functional Testing** — Verify all 8 form inputs (First Name, Last Name, Email, Mobile, DOB, Password, Confirm Password, T&C checkbox) accept valid data and reject invalid data per acceptance criteria.
2. **Data Validation Testing** — Verify exact error message text for every invalid scenario: name min-length, email format, mobile 10-digit rule, age gate (≥18), password strength, confirm password match, T&C required.
3. **Error Handling Testing** — Verify inline errors appear on blur/submit; verify form does NOT submit when any field fails.
4. **Edge Case Testing** — Boundary values: exactly 18 years old DOB (PASS), 17y11m DOB (FAIL); 1-char name (FAIL); 10-digit mobile with trailing letter (FAIL).
5. **Security Testing** — SQL injection and XSS payloads in all text fields must be rejected or sanitised without crashing the form.
6. **Regression Testing** — Re-run full suite after BUG-A (email) and BUG-B (password) fixes to confirm validation now works.

> Scope may evolve during testing. Out of scope: backend/API, server-side validation, database persistence, email verification.

---

## Inclusions

**First Name / Last Name Validation**
- Valid: `Rahul` → PASS
- 1-char input `R` → FAIL: "Enter your first name (letters only, min 2 chars)"
- Digits `123` → FAIL
- Empty field → FAIL

**Email Address Validation**
- Valid: `rahul@example.com` → PASS
- `rahul@` → FAIL: "Enter a valid email address (e.g. name@domain.com)"
- `rahul@nodot` → FAIL: same error
- `@only` → FAIL: same error
- `notanemail` (no @) → FAIL: same error
- Known BUG-A: current `validateEmail()` only checks `@` presence — above invalid cases currently PASS (bug)

**Mobile Number Validation**
- Valid: `9876543210` (10 digits) → PASS
- `98765` (5 digits) → FAIL: "Enter a valid 10-digit mobile number"
- `abcdefghij` (letters) → FAIL
- `9876543210a` (10 digits + letter) → FAIL

**Date of Birth — Age Gate**
- DOB making user exactly 18 → PASS
- DOB making user 17 years 11 months → FAIL: "You must be at least 18 years old to register"

**Password Strength Validation**
- `Password1!` → PASS (upper + lower + digit + special, length ≥ 8)
- `password` → FAIL (missing uppercase, digit, special)
- `PASSWORD1` → FAIL (missing lowercase, special)
- `Pass1` → FAIL (length < 8)
- `Pass word1!` → FAIL (contains space)
- Live strength indicator updates as user types
- Known BUG-B: current `validatePassword()` only checks `length >= 8` — weak passwords currently PASS (bug)

**Confirm Password**
- Matching passwords → PASS
- Non-matching → FAIL: "Passwords do not match"

**Terms of Service Checkbox**
- Unchecked on submit → FAIL: "You must accept the Terms of Service to continue"
- Checked → PASS

**Success State**
- All fields valid + terms checked → Toast: "✅ Account created successfully! Welcome aboard."
- Form resets after success submission

**Security**
- SQL injection in name/email/mobile fields → rejected, no crash
- XSS `<script>alert('xss')</script>` in text fields → sanitised, no execution

---

## Test Environments

| Name | Env URL |
|------|---------|
| Local Dev | http://localhost:7000/registration-demo.html |
| Pre-Prod | _(not applicable — local demo only)_ |

**Server start command:**
```bash
python -m http.server 7000 --directory c:\ClaudeCodeMasterclass
```

**Platform / browser matrix**
- Chromium (Desktop Chrome) — primary
- Firefox (Desktop Firefox)
- WebKit (Desktop Safari)

---

## Defect Reporting Procedure

- **Defect criteria:** field accepts invalid input, error message missing/wrong text, form submits when it shouldn't, success toast doesn't appear, known bugs BUG-A/BUG-B not yet fixed.
- **Reporting:** Jira bug with summary, exact steps, expected vs actual error text, screenshot.
- **Triage:** severity (blocker for submit bypass, major for wrong error text, minor for UI).
- **Tooling:** JIRA — project SCRUM.
- **Roles / POCs:**

| Area | POC |
|------|-----|
| Frontend / Validation Logic | _(assumed — confirm)_ |
| QA Automation | _(assumed — confirm)_ |

- **Known bugs already filed:** BUG-A (email) and BUG-B (password) — do NOT re-file; link test failures to existing bugs.

---

## Test Strategy

**Step 1 — Design.**
- Equivalence Class Partitioning: valid / invalid per field
- Boundary Value Analysis: min-length names (1 char FAIL, 2 chars PASS), DOB boundary (18y exact PASS, 17y11m FAIL), mobile length (9 digits FAIL, 10 PASS, 11 FAIL)
- Decision Table: all combinations of empty fields on submit
- Error Guessing: space in password, special chars in name, mixed case mobile
- Exploratory: paste attacks, rapid re-submit, tab-order validation

**Step 2 — Execution flow.**
1. Start local server. Confirm page loads at localhost:7000.
2. Smoke: fill all valid data → submit → assert success toast.
3. Full suite: one field invalid at a time → assert correct error per field.
4. BUG-A / BUG-B scenarios: execute and mark BLOCKED (known bugs).
5. Security: SQL injection + XSS per text field.
6. Retest after bug fixes; run regression.

**Step 3 — Best practices.**
- Use `pressSequentially()` for constraint tests (not `fill()`) per ANTI-HALLUCINATION Rule 18.
- Run headed mode first to verify error element selectors are correct.
- Assert exact error message text — not just element visibility.

---

## Test Schedule

| Task | Dates |
|------|-------|
| Creating Test Plan | 2026-06-14 |
| Test Case Creation | _(assumed — confirm)_ |
| Test Case Execution | _(assumed — confirm)_ |
| Bug Fix Retest (BUG-A, BUG-B) | _(after fixes deployed)_ |
| Summary Reports Submission | _(assumed — confirm)_ |

> Estimated duration: 1 sprint _(assumed — confirm)_.

---

## Test Deliverables

- Test Plan (this document)
- Playwright TypeScript test suite (registration form spec)
- Defect Reports — Jira bugs (BUG-A email, BUG-B password already filed)
- Test Summary Report — pass/fail per field, known-bug impact

---

## Entry and Exit Criteria

### Requirement Analysis
- **Entry:** SCRUM-142 acceptance criteria reviewed; local server accessible.
- **Exit:** All field constraints and error texts understood; BUG-A and BUG-B documented.

### Test Execution
- **Entry:** Local server running at localhost:7000; Playwright suite scaffolded.
- **Exit:** All test cases executed; pass/fail recorded; known-bug failures linked to existing Jira bugs.

### Test Closure
- **Entry:** Execution complete; defect reports ready.
- **Exit:** Test Summary Report delivered; BUG-A and BUG-B retested after fix; regression clean.

---

## Tools

- **Jira** — bug tracking (project: SCRUM)
- **Playwright (TypeScript)** — automation framework
- **Python http.server** — local file server for demo page
- **Playwright HTML Reporter** — result reporting
- **Playwright Trace Viewer** — debugging failures

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Local server not running | Add server-start check to test setup; document in README |
| BUG-A / BUG-B cause test failures | Mark as BLOCKED, link to known bugs; don't modify assertions |
| Port 7000 already in use | Use alternate port; update baseURL in playwright config |
| DOB boundary depends on test run date | Compute DOB dynamically in test (today - 18 years) |
| Non-availability of a resource | Backup resource planning |

---

## Approvals

Documents sent for approval before proceeding:
- Test Plan
- Test Cases
- Test Summary Report

> Testing continues to next step only once approvals are done.
