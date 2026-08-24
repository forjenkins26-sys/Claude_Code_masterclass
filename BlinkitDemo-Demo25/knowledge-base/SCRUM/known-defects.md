# Known Defects — Blinkit Customer Login

> Checked **before filing any bug** (dedup, ahead of JQL). Reference an existing `Ref` instead of filing a duplicate. Probe `Open`/`Intermittent` areas harder during test generation.

**Seeded 2026-08-24 from the SCRUM-694 test-closure report** (`BlinkitDemo-Run2/output/closure-SCRUM-694-2026-08-24.md`). Same application under test (`blinkit-demo-qa.vercel.app`), different Epic — so these defects are already filed and must NOT be filed again under SCRUM-722 (AH Rule 21).

| Ref | Area | Symptom | Status | Confidence | Note for agent |
|-----|------|---------|--------|------------|----------------|
| SCRUM-718 | Account creation | `#signupBtn` does nothing — `type=submit`, no onclick handler, no parent form. Only `forgotBtn`, `loginForm` and `mobile` have listeners bound. | Open | Confirmed | Violates **BR-12**. Expected failure of BL-012 / SCRUM-734. **Reference this key — do not file a new bug.** |
| SCRUM-716 | Forgot password | Confirmation toast reads "📧 Password reset link sent to your **email**" on a login that collects only a mobile number. | Open | Confirmed | Violates **BR-10**. Expected failure of BL-010 / SCRUM-732. **Reference this key — do not file a new bug.** |
| SCRUM-721 | Accessibility | Validation errors are not announced to assistive technology — 0 occurrences of `aria-describedby`, `role="alert"` or `aria-live` in the page source. | Open | Confirmed | Violates **BR-13**. Expected failure of BL-013 / SCRUM-735. **Reference this key — do not file a new bug.** |
| SCRUM-720 | Account creation | Control is labelled "Create New Account"; the SCRUM-694 AC required the label "Sign Up". | Open | Confirmed (under SCRUM-694 only) | **Not a defect under SCRUM-722.** AC 11 deliberately does not prescribe the label — see the BR-11 scope note. Treat a label difference as an observation, not a bug. |

## Not yet filed — expected to surface this cycle

| Area | Symptom | Rule violated | Note for agent |
|------|---------|---------------|----------------|
| Mobile validation | Validation regex is `/^\d{9,10}$/`, so a **9-digit** number passes and the user is logged in with an invalid mobile number. Confirmed in the served page source, which carries an explicit "INTENTIONAL BUG" comment. | **BR-04** (and BR-01) | No existing Jira bug found for this. Expected failure of BL-004 / SCRUM-726 → **file it**, after a JQL dedup check. |

## Duplicates awaiting closure (housekeeping, not defects)

Created during the SCRUM-694 cycle when a `createJiraIssue` response archived and a verification count read 0 before the write had committed, prompting a retry on a write that had already succeeded.

| Ref | Action |
|-----|--------|
| SCRUM-717 | Duplicate of SCRUM-716 — renamed + Duplicate-linked, needs closing |
| SCRUM-719 | Duplicate of SCRUM-718 — renamed + Duplicate-linked, needs closing |

**Never re-issue a create on a count of 0.** After `createJiraIssue`, a count query can read 0 because the write has not committed yet — an archived response means *unknown*, never *failed*. Verify by ARI and wait. Filing is not idempotent.
