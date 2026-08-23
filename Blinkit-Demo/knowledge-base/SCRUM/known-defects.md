# Known Defects — Blinkit Customer Login

> Checked **before filing any bug** (dedup, ahead of JQL). Reference an existing `Ref` instead of filing a duplicate. Probe `Open`/`Intermittent` areas harder during test generation.

**Dedup scan run 2026-08-23** (JQL over project SCRUM, Bug type). The two headline login defects have each been filed **six times** across earlier Blinkit Epics. Do NOT file a seventh — reference the open Ref.

| Ref | Area | Symptom | Status | Confidence | Note for agent |
|-----|------|---------|--------|------------|----------------|
| SCRUM-418 | Mobile validation | 9-digit mobile number is accepted and logs the user in | Open | Confirmed | Violates **BR-03 / BR-04**. Regex is `/^\d{9,10}$/`, AC requires exactly 10. Most recent open instance — reference this one. |
| SCRUM-419 | Forgot Password | Reset toast says "sent to your email" instead of "your mobile" | Open | Confirmed | Violates **BR-11**. Toast string is `📧 Password reset link sent to your email`. Most recent open instance — reference this one. |
| SCRUM-497 | Mobile validation | Validation for mobile < 10 digits (9 digits) | Open | Confirmed | Duplicate of SCRUM-418, no parent Epic. |
| SCRUM-498 | Forgot Password | Forgot Password functionality | Open | Confirmed | Duplicate of SCRUM-419, no parent Epic. |
| SCRUM-516 | Forgot Password | Click Forgot Password Link | Open | Suspected | Vague summary — same area, verify before treating as distinct. |
| SCRUM-186 | Login | Valid credentials rejected with false validation errors | Open | Suspected | Filed against legacy Epic SCRUM-121 (local demo page), not this deployment. Re-verify before reuse. |

## Closed duplicates (historical — do not re-file)
9-digit accepted: SCRUM-316, SCRUM-352, SCRUM-384, SCRUM-401 (all Done)
Forgot Password email/mobile: SCRUM-317, SCRUM-353, SCRUM-369, SCRUM-385, SCRUM-402 (all Done)
Non-digit chars in mobile: SCRUM-514 (Done)

## Not yet filed against this app
| Area | Symptom | Note |
|------|---------|------|
| Create New Account | `#signupBtn` has no event handler — click does nothing | Violates **BR-12**. JQL found NO existing bug for this on the Vercel deployment. Legacy `SCRUM-141` covers the same symptom on the old **local** page — different app under test, so it is NOT a dedup match. File fresh if execution confirms. |
