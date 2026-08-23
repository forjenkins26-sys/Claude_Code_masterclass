# Feature Map — Blinkit Customer Login

> **Regression blast radius.** When a feature changes, its `Used by` chain becomes regression-risk scope added to the test plan.

| Feature | Depends on | Used by (regression risk) | Source |
|---------|-----------|---------------------------|--------|
| Field validation (First/Last/Mobile) | none — client-side only | Login submit, OTP dispatch, session write, catalogue nav | SCRUM-603 AC 1-7, observed 2026-08-23 |
| Login submit (`#loginForm`) | all three field validations passing | sessionStorage write, toast, catalogue redirect | SCRUM-603 AC 8-10 |
| Session persistence (`sessionStorage.blinkitUser`) | successful login submit | product catalogue page (reads the session) | SCRUM-603 AC 9 |
| Catalogue navigation | successful login submit + 1500ms timer | blinkit-products.html — **separate Epic** | SCRUM-603 AC 10 |
| Toast (`div#toast`) | login success OR forgot-password click | shared by both flows — a change to one affects the other | observed 2026-08-23 |
| Forgot Password | none — independent handler | toast only; no navigation, no session change | SCRUM-603 AC 11 |
| Create New Account | none — currently no handler at all | registration flow (**not reachable** in this build) | SCRUM-603 AC 12 |

**Shared-component warning:** `div#toast` is a single element reused by login-success and forgot-password. Any change to toast markup, timing (3000ms) or the `.show` class affects **both** flows — test both after any toast change.

**Out-of-scope boundary:** the catalogue page is reached but never asserted beyond one navigation check (AH Rule 27 / project CLAUDE.md rule 9).
