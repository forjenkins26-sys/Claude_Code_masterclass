# Test Plan — Blinkit Login Page Testing

> Source ticket: SCRUM-121 — Blinkit Login Page Testing
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

This test plan covers functional and validation testing of the Blinkit-inspired login page demo served locally. The page contains First Name, Last Name, and Mobile Number fields, a Login button (triggers OTP flow on valid input), a Forgot Password link, and a Create New Account button with a known intentional defect (no click handler). Testing will validate field-level constraints, error messages, OTP trigger behavior, and security inputs via a Playwright TypeScript automation suite (19 test cases BL-001 to BL-019).

**URL / System under test:** `http://localhost:7000/blinkit-login.html`
**Server:** `python -m http.server 7000 --directory c:\ClaudeCodeMasterclass`

---

## Scope

1. **Functional Testing** — Verify login form fields (First Name, Last Name, Mobile Number) and button/link behaviors work per acceptance criteria.
2. **Data Validation Testing** — Verify field-level error messages for empty inputs and invalid mobile format.
3. **Error Handling Testing** — Verify form does not trigger OTP on invalid/empty input; error elements visible with correct text.
4. **Edge Case Testing** — Empty fields one at a time; boundary mobile numbers (9 digits, 10 digits, 11 digits); whitespace-only inputs.
5. **Security Testing** — SQL injection and XSS payloads in all text fields must not crash page or execute scripts.
6. **Regression Testing** — Re-run after any fix; BL-010 remains blocked until SCRUM-141 (Create New Account bug) is resolved.

> Out of scope: backend OTP delivery, actual SMS gateway, server-side validation.

---

## Inclusions

**Login Form — Field Validation**
- All fields empty → submit → errors shown for all 3 fields
- First Name empty → error shown for First Name only
- Last Name empty → error shown for Last Name only
- Mobile empty → error shown for Mobile only
- Mobile with letters `abc1234567` → FAIL: invalid mobile error
- Mobile with 9 digits → FAIL: invalid mobile error
- Mobile with 11 digits → FAIL: invalid mobile error
- Valid 10-digit mobile + all fields filled → OTP toast triggered: "✅ OTP sent to +91 [mobile]"

**Forgot Password Link**
- Clicking Forgot Password → triggers password reset flow / navigation

**Create New Account Button (Known Bug — SCRUM-141)**
- Button visible and appears clickable
- Click has no effect — no navigation, no handler (intentional defect)
- Test BL-010: BLOCKED by SCRUM-141; do NOT modify test assertion

**Security**
- SQL injection `' OR 1=1 --` in name fields → no crash, no execution
- XSS `<script>alert('xss')</script>` in name fields → sanitised, no popup

---

## Test Environments

| Name | Env URL |
|------|---------|
| Local Demo | http://localhost:7000/blinkit-login.html |
| Pre-Prod | _(not applicable — local demo only)_ |

**Server start:**
```bash
python -m http.server 7000 --directory c:\ClaudeCodeMasterclass
```

**Platform / browser matrix**
- Chromium — primary
- Firefox
- WebKit

---

## Defect Reporting Procedure

- **Defect criteria:** field accepts invalid mobile, error text wrong/missing, OTP triggered on invalid input, app crashes on security input.
- **Reporting:** Jira bug with title, steps, expected vs actual, screenshot/video.
- **Tooling:** JIRA — project SCRUM.
- **Known open bug:** SCRUM-141 — Create New Account button has no click handler. Do NOT re-file.
- **Roles / POCs:**

| Area | POC |
|------|-----|
| Frontend | _(assumed — confirm)_ |
| QA Automation | _(assumed — confirm)_ |

---

## Test Strategy

**Step 1 — Design.**
- Equivalence Class Partitioning: valid/invalid per field
- Boundary Value Analysis: mobile length (9, 10, 11 digits)
- Error Guessing: whitespace-only names, mobile starting with 0, letters mixed with digits
- Exploratory: rapid double-click login, tab-order, paste in mobile field

**Step 2 — Execution flow.**
1. Start local server; confirm page loads.
2. Smoke: fill valid data → assert OTP toast.
3. Full suite: BL-001 to BL-019 sequentially (headed mode).
4. BL-010: execute, assert button click has no effect, mark BLOCKED / link to SCRUM-141.
5. Security tests last.

**Step 3 — Best practices.**
- Always `--headed` first run (ANTI-HALLUCINATION Rule 17).
- Use `page.locator('#toast.show')` for toast assertion (CSS class `.show` indicates visibility).
- Use `pressSequentially()` for mobile field constraint tests.

---

## Test Schedule

| Task | Dates |
|------|-------|
| Creating Test Plan | 2026-06-14 |
| Test Case Creation | _(already created — BL-001 to BL-019 in SCRUM-121 children)_ |
| Test Case Execution | _(assumed — confirm)_ |
| Summary Reports Submission | _(assumed — confirm)_ |

> Estimated duration: 1 sprint _(assumed — confirm)_.

---

## Test Deliverables

- Test Plan (this document)
- Playwright spec: `tests/ui/blinkit-login.spec.ts` (BL-001 to BL-019)
- POM: `src/pages/BlinkitLoginPage.ts`
- Defect Reports — SCRUM-141 (existing), any new bugs filed
- Test Summary Report

---

## Entry and Exit Criteria

### Requirement Analysis
- **Entry:** SCRUM-121 scope reviewed; local server accessible; SCRUM-141 bug documented.
- **Exit:** All 19 test cases mapped; BL-010 block reason understood.

### Test Execution
- **Entry:** Local server running; Playwright suite ready; blinkit-login.html accessible.
- **Exit:** BL-001 to BL-019 executed; BL-010 marked Blocked; all others Pass/Fail recorded.

### Test Closure
- **Entry:** Execution complete.
- **Exit:** Test Summary Report delivered; SCRUM-141 tracked for future unblock.

---

## Tools

- **Jira** — bug tracking (project: SCRUM); SCRUM-141 open
- **Playwright (TypeScript)** — `tests/ui/blinkit-login.spec.ts`
- **Python http.server** — local server
- **Playwright HTML Reporter + Trace Viewer**

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Local server not running | Automate server-start in global setup or document prerequisite |
| Port 7000 conflict | Use alternate port; update `baseURL` |
| SCRUM-141 never fixed | BL-010 stays Blocked; document in summary report |
| Toast selector changes | Verify `#toast.show` selector in headed mode before full run |
| Non-availability of resource | Backup resource planning |

---

## Approvals

Documents sent for approval before proceeding:
- Test Plan
- Test Cases (SCRUM-121 children)
- Test Summary Report

> Testing continues to next step only once approvals are done.
