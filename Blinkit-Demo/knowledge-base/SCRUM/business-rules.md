# Business Rules — Blinkit Customer Login

> **Bug-vs-intended oracle.** A rule here is authoritative truth. If observed behavior violates a `BR-xx`, it is a **Confirmed** defect — cite the rule ID. If behavior is unusual but matches a rule, it is NOT a bug.
>
> **Every rule must cite a real source** (Epic AC, filed bug, or observed+verified). Never invent.

**Source Epic:** SCRUM-603 — Blinkit — Customer Login Quality Assurance (14 ACs, fetched 2026-08-23)
**Target URL:** https://blinkit-demo-qa.vercel.app

| ID | Rule | Source | Severity if violated |
|----|------|--------|----------------------|
| BR-01 | First Name is mandatory. Empty submission is rejected and displays exactly `Enter your first name`. | SCRUM-603 AC line 1 | P2 |
| BR-02 | Last Name is mandatory. Empty submission is rejected and displays exactly `Enter your last name`. | SCRUM-603 AC line 2 | P2 |
| BR-03 | Mobile Number accepts **exactly 10** numeric digits — not 9, not 11. | SCRUM-603 AC line 3 | P1 |
| BR-04 | Mobile numbers with fewer than 10 digits are rejected and display exactly `Enter valid 10-digit mobile number`. | SCRUM-603 AC line 4 | P1 |
| BR-05 | Mobile Number prevents entry beyond 10 digits. | SCRUM-603 AC line 5 | P2 |
| BR-06 | Mobile Number rejects alphabetic and special characters. | SCRUM-603 AC line 6 | P2 |
| BR-07 | Submitting with all three fields empty displays all three validation errors simultaneously. | SCRUM-603 AC line 7 | P2 |
| BR-08 | On successful sign-in a confirmation toast confirms the OTP was sent to the mobile number entered. | SCRUM-603 AC line 8 | P2 |
| BR-09 | On successful sign-in first name, last name and mobile are persisted to `sessionStorage`. | SCRUM-603 AC line 9 | P2 |
| BR-10 | On successful sign-in the customer is navigated to the product catalogue page. | SCRUM-603 AC line 10 | P1 |
| BR-11 | Forgot Password confirmation states the reset link was sent to the customer's **mobile number**, consistent with mobile-based auth. | SCRUM-603 AC line 11 | P2 |
| BR-12 | Create New Account navigates the customer into the account registration flow. | SCRUM-603 AC line 12 | P1 |
| BR-13 | Invalid entries apply a visible error state to the **field itself**, not only the message text. | SCRUM-603 AC line 13 | P3 |
| BR-14 | All input fields reject SQL injection and XSS payloads without executing them or bypassing validation. | SCRUM-603 AC line 14 | P1 |

## Known AC-vs-implementation conflicts (observed 2026-08-23, /explore live DOM)

These are **rule violations already visible in the shipped code**. Recorded here as oracle context; each is confirmed or refuted by its own test at execution time — not pre-judged.

| Rule | AC requires | Live DOM shows | Where |
|------|-------------|----------------|-------|
| BR-03 / BR-04 | exactly 10 digits | regex `/^\d{9,10}$/` — a 9-digit value passes validation and logs in | inline script, submit handler |
| BR-11 | "sent to your mobile" | toast reads `📧 Password reset link sent to your email` | inline script, forgotBtn handler |
| BR-12 | navigates to registration | `#signupBtn` has zero script references and no handler; click does not change URL | inline script (absent) |

## Conflict handling
If a session's requirements contradict a rule here, flag the contradiction in analysis output — do not silently pick one.

## Out of scope (no ACs stated — do NOT generate tests or report coverage gaps)
Server-side authentication · OTP delivery/verification · product catalogue and checkout pages · performance · accessibility · internationalisation · audit logging.
