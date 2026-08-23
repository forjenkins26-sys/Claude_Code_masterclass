# Business Rules — MediCare Pharmacy (Login)

> **Bug-vs-intended oracle.** A rule here is authoritative truth. If observed behavior violates a `BR-xx`, it is a **Confirmed** defect — cite the rule ID. If behavior is unusual but matches a rule, it is NOT a bug.
>
> **Every rule must cite a real source** (Epic AC, filed bug, or observed+verified). Never invent.

**Seeded:** 2026-08-23 from Epic SCRUM-576 (14 ACs). Target: https://medicare-pharmacy-demo-eight.vercel.app

| ID | Rule | Source | Severity if violated |
|----|------|--------|----------------------|
| BR-01 | Email Address accepts a well-formed email and rejects any value lacking a local part, an "@", or a valid domain **with a dot** | Epic SCRUM-576 AC line 1 | P1 |
| BR-02 | Email validation error displays the exact text "Enter a valid email address" when email is invalid or empty | Epic SCRUM-576 AC line 2 | P2 |
| BR-03 | Password enforces a minimum of 8 characters; shorter values are rejected on submit | Epic SCRUM-576 AC line 3 | P1 |
| BR-04 | Password validation error displays the exact text "Password must be at least 8 characters" when password is invalid or empty | Epic SCRUM-576 AC line 4 | P2 |
| BR-05 | Password field is masked (type=password) and enforces a maximum length of 20 characters | Epic SCRUM-576 AC line 5 | P1 |
| BR-06 | Delivery Pincode accepts exactly 6 numeric digits; fewer, more, or any non-numeric character is rejected | Epic SCRUM-576 AC line 6 | P1 |
| BR-07 | Pincode validation error displays the exact text "Enter valid 6-digit pincode" when pincode is invalid or empty | Epic SCRUM-576 AC line 7 | P2 |
| BR-08 | Submitting with all three fields empty displays all three validation errors simultaneously | Epic SCRUM-576 AC line 8 | P2 |
| BR-09 | On successful sign-in, a confirmation toast is shown with the text "OTP sent to your registered mobile number" | Epic SCRUM-576 AC line 9 | P2 |
| BR-10 | On successful sign-in, user email and pincode are persisted to sessionStorage under key "medicareUser" | Epic SCRUM-576 AC line 10 | P1 |
| BR-11 | Forgot Password link triggers a password reset and displays a toast with the text "Password reset link sent to your email" | Epic SCRUM-576 AC line 11 | P2 |
| BR-12 | Create New Account button navigates the user to the account registration flow | Epic SCRUM-576 AC line 12 | P1 |
| BR-13 | Invalid field entries apply a visible error state to the field itself, not only the message text | Epic SCRUM-576 AC line 13 | P2 |
| BR-14 | All input fields reject SQL injection and XSS payloads without executing them or bypassing validation | Epic SCRUM-576 AC line 14 | P0 |

## Known rule-vs-app conflicts (verified 2026-08-23, live DOM)

These are recorded as **evidence**, not as amendments. The rule stays authoritative; the app is what deviates.

| Rule | Observed app behaviour | Tier | Note |
|------|------------------------|------|------|
| BR-01 | `validateEmail` is `v.indexOf('@') !== -1` — no domain/dot check. `a@b`, `user@domain`, `@nolocal.com` all **accepted** | **Confirmed** | Direct contradiction of BR-01. Locator resolves, behaviour observed. |
| BR-12 | `#registerBtn` has no click handler and `btn.form === null`. Clicked live — URL unchanged, no navigation | **Confirmed** | Direct contradiction of BR-12. |
| BR-09 | Toast renders `"✅ OTP sent to your registered mobile number"` — AC text present but prefixed with `✅` | **`[SUSPECTED]`** | Exact-match fails, substring passes. Cannot resolve from app or Epic alone: app may be wrong, or AC may have omitted the emoji. **Needs human confirmation — do not file as Confirmed.** |

## Conflict handling
If a session's requirements contradict a rule here, flag the contradiction in analysis output — do not silently pick one.

**BR-09 specifically:** until a human rules on it, any failure citing BR-09 is filed `[SUSPECTED]` per AH Rule 25. Do not auto-"fix" the test to match the app — that would silently ratify the app as correct and destroy the finding.
