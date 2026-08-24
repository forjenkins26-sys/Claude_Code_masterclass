# Business Rules — Blinkit Customer Login

> **Bug-vs-intended oracle.** A rule here is authoritative truth. If observed behavior violates a `BR-xx`, it is a **Confirmed** defect — cite the rule ID. If behavior is unusual but matches a rule, it is NOT a bug.
>
> **Every rule must cite a real source** (Epic AC, filed bug, or observed+verified). Never invent.

**Re-seeded 2026-08-24 from Epic SCRUM-722 acceptance criteria (15 ACs), retrieved verbatim via `mcp__atlassian__fetch`.**

> **Re-seed history.** This file previously carried rules sourced from Epic **SCRUM-672**, because the project folder was reused across Epics. SCRUM-672 AC 6 required the submit control to be *disabled until valid*; SCRUM-722 AC 6 requires it to be *always enabled*. Those are contradictory, so the stale rule would have flagged correct behaviour as a defect. Rules below now cite SCRUM-722 only.
>
> **A KB whose `Source` column names a different Epic than the one under test is stale — re-seed before execution, never reconcile mid-run.**

| ID | Rule | Source | Severity if violated |
|----|------|--------|----------------------|
| BR-01 | The mobile number field accepts at most 10 digits; further keystrokes are ignored | Epic SCRUM-722 AC 1 | P1 |
| BR-02 | Non-numeric characters are rejected in the mobile number field | Epic SCRUM-722 AC 2 | P2 |
| BR-03 | Submitting with an empty mobile number shows "Enter valid 10-digit mobile number" and does not proceed | Epic SCRUM-722 AC 3 | P1 |
| BR-04 | Submitting a mobile number shorter than 10 digits shows "Enter valid 10-digit mobile number" and does not proceed | Epic SCRUM-722 AC 4 | P1 |
| BR-05 | Leading and trailing whitespace in the mobile number is trimmed before validation | Epic SCRUM-722 AC 5 | P2 |
| BR-06 | The Login control is always enabled; validation happens on submit, not by disabling the control | Epic SCRUM-722 AC 6 | P2 |
| BR-07 | Submitting a valid 10-digit mobile number does not produce a validation error on the mobile field | Epic SCRUM-722 AC 7 | P1 |
| BR-08 | Submitting the same valid number twice in quick succession must not produce two concurrent requests | Epic SCRUM-722 AC 8 | P2 |
| BR-09 | The forgot-password link is visible on the login page | Epic SCRUM-722 AC 9 | P3 |
| BR-10 | Because this login collects only a mobile number and holds no email address, the forgot-password confirmation must reference the user's **mobile number** and must not mention email | Epic SCRUM-722 AC 10 | P2 |
| BR-11 | A control that starts account creation is visible on the login page | Epic SCRUM-722 AC 11 | P3 |
| BR-12 | Activating that control navigates the user away from the login page to the registration flow | Epic SCRUM-722 AC 12 | P1 |
| BR-13 | Every validation error is programmatically associated with its field (aria-describedby, role=alert, or equivalent) so assistive technology announces it. Colour alone is not sufficient | Epic SCRUM-722 AC 13 | P2 |
| BR-14 | No credential or OTP value is written to the browser console or to localStorage | Epic SCRUM-722 AC 14 | P1 |
| BR-15 | The page is usable at a 1280px-wide viewport with no horizontal scrolling | Epic SCRUM-722 AC 15 | P3 |

**BR-11 scope note.** Per the Epic, AC 11 deliberately does not prescribe the control's label. A label differing from expectation is an **observation**, not a defect, unless it makes the control unfindable. Do not file a bug on wording alone.

## Requirement-vs-UI discrepancies (recorded, NOT reconciled)

The Epic is the oracle (AH Rule 19). Where the live app disagrees with an AC, the AC wins and the difference is a defect to file — never a test to soften. All rows below verified against the live app on 2026-08-24 via `/explore` and the served page source.

| AC | Epic says | Live app (verified 2026-08-24) | Expected handling |
|----|-----------|--------------------------------|-------------------|
| AC 1 / BR-01 | at most 10 digits | `maxlength="10"` on `#mobile`; input handler strips non-digits | Expected PASS |
| AC 4 / BR-04 | shorter than 10 digits is rejected | validation regex is `/^\d{9,10}$/` — a **9-digit** number passes and the user is logged in | Test asserts BR-04. Expected **FAIL → defect** |
| AC 10 / BR-10 | confirmation references **mobile number**, never email | toast reads "📧 Password reset link sent to your **email**" | Test asserts BR-10. Expected **FAIL → defect** |
| AC 12 / BR-12 | activating the control navigates away | `#signupBtn` has **no click handler** — only `forgotBtn`, `loginForm` and `mobile` have listeners bound; the click is inert | Test asserts BR-12. Expected **FAIL → defect** |
| AC 13 / BR-13 | errors programmatically associated with their field | 0 occurrences of `aria-describedby`, `role="alert"` or `aria-live` in the page source | Test asserts BR-13. Expected **FAIL → defect** |

## Additional login-page controls not covered by any AC

Present in the DOM, no AC governs them. Not invented behaviour — raised as requirement gaps (see SCRUM-740 / BL-018), never silently asserted.

- **First Name** (`#firstName`) — enforced by the app, error "Enter your first name". No AC mentions it.
- **Last Name** (`#lastName`) — enforced by the app, error "Enter your last name". No AC mentions it.

Observed behaviour above is recorded as **evidence only**, never as an oracle. A missing AC is a finding, not a blank to fill (AH Rule 19).

## Conflict handling

If a session's requirements contradict a rule here, flag the contradiction in analysis output — do not silently pick one, and do not auto-edit this file mid-run (AH Rule 30). A wrong oracle entry corrupts every future run.
