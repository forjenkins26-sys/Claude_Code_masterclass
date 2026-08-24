# Test Closure Report — SCRUM-722: Blinkit Login QA — Pipeline Dry Run 24Aug1930

**Date:** 2026-08-25 · **Cycle:** execution run 2026-08-24 23:50
**App:** https://blinkit-demo-qa.vercel.app
**Build:** ETag `6fd46ec3818f08374b290e4e4d601830` · Last-Modified 2026-08-24 11:25:15 GMT — **re-verified unchanged at closure**, so the recorded results are still valid
**Source:** `progress.md` run 2026-08-24 23:50 (18 rows, re-read this run per AH Rule 30)
**Spec:** `tests/ui/blinkit-login.spec.ts` · **POM:** `src/pages/blinkitLoginPage.ts`
**Mode:** headed chromium, workers=1, retries=0 · RUN_ID `exec-722` · 43.4s

**Evidence report:** `allure-report/exec-722/` — **served and verified live at http://127.0.0.1:8092 (HTTP 200)**
Verified non-empty from `widgets/summary.json`: total 18 · passed 13 · failed 4 · broken 0 · skipped 1 · 29 attachments.
The report total (18) equals the `progress.md` row count (18) — no partial run.
Single run retained, so **no trend available** (a trend needs ≥2 retained run folders).

---

## Verdict: 🔴 NO-GO

**Triggered by:** an open **P1** defect — SCRUM-718, the account-creation control is entirely non-functional, leaving registration unreachable from the login page. The NO-GO rule fires on any open P0/P1-class blocker regardless of the pass rate.

**Ship risk:**

1. **No new user can register.** `#signupBtn` has no click handler bound — only `forgotBtn`, `loginForm` and `mobile` carry listeners. The click is inert and there is no workaround from this page.
2. **An invalid mobile number is accepted.** The validation regex is `/^\d{9,10}$/`, so a **9-digit** number passes and the user is logged in with a number that cannot receive an OTP. AC-4 requires rejection.
3. **Forgot-password misdirects every user.** The confirmation says a reset link went to their *email*, on a login that collects only a mobile number and holds no email address. Users will wait for a message that cannot arrive.
4. **Screen-reader users get no error feedback.** Validation failures are conveyed visually only — zero `aria-describedby`, `role="alert"` or `aria-live` in the served page.

**Not covered:** performance · authorization/session security · internationalisation · cross-browser (chromium only) · viewports other than 1280px. None of these have an AC, so none have tests.

**To reach GO:** fix SCRUM-718 (P1) and the 9-digit regex defect; re-run BL-012 and BL-004. SCRUM-716 and SCRUM-721 (both P2) must be fixed or formally accepted as known risk. Answer the BL-018 requirement gap so first/last name validation becomes testable.

**This verdict is advisory. Release sign-off is the human's.**

---

## Coverage

| Metric | Counted | |
|---|---|---|
| Requirement coverage | **15/15 (100%)** | every AC has ≥1 test row |
| Pass rate | **13/17 (76%)** | of executed rows; BL-018 excluded (never ran) |
| Execution rate | **17/18 (94%)** | BL-018 is `test.fixme` — blocked on a missing requirement |
| ACs passing | **11/15 (73%)** | 4 ACs have a DEFECT status |

Fractions are shown deliberately — a bare percentage hides its denominator.

---

## Traceability Matrix

| AC | Requirement | Test | Jira | Result | Status |
|---|---|---|---|---|---|
| AC-1 | Mobile field accepts at most 10 digits | BL-001 | SCRUM-723 | ✅ PASS | COVERED |
| AC-2 | Non-numeric characters rejected | BL-002 | SCRUM-724 | ✅ PASS | COVERED |
| AC-3 | Empty mobile shows exact error, does not proceed | BL-003 | SCRUM-725 | ✅ PASS | COVERED |
| AC-4 | Mobile shorter than 10 digits rejected | BL-004 | SCRUM-726 | 🚫 BLOCKED | **DEFECT** (unfiled — see below) |
| AC-5 | Whitespace trimmed before validation | BL-005 | SCRUM-727 | ✅ PASS | COVERED |
| AC-6 | Login control always enabled | BL-006 | SCRUM-728 | ✅ PASS | COVERED |
| AC-7 | Valid mobile produces no validation error | BL-007 | SCRUM-729 | ✅ PASS | COVERED |
| AC-8 | Rapid double submit → one request | BL-008 | SCRUM-730 | ✅ PASS | COVERED |
| AC-9 | Forgot-password link visible | BL-009 | SCRUM-731 | ✅ PASS | COVERED |
| AC-10 | Confirmation references mobile, never email | BL-010 | SCRUM-732 | 🚫 BLOCKED | **DEFECT** (SCRUM-716) |
| AC-11 | Account-creation control visible | BL-011 | SCRUM-733 | ✅ PASS | COVERED |
| AC-12 | Activating it navigates away from login | BL-012 | SCRUM-734 | 🚫 BLOCKED | **DEFECT** (SCRUM-718) |
| AC-13 | Errors programmatically associated with field | BL-013 | SCRUM-735 | 🚫 BLOCKED | **DEFECT** (SCRUM-721) |
| AC-14 | No credential/OTP in console or localStorage | BL-014 | SCRUM-736 | ✅ PASS | COVERED |
| AC-15 | Usable at 1280px, no horizontal scroll | BL-015 | SCRUM-737 | ✅ PASS | COVERED |

**Orphan tests** — test rows that map to no AC (listed, not dropped):

| Test | Jira | Result | Why it has no AC |
|---|---|---|---|
| BL-016 | SCRUM-738 | ✅ PASS | XSS — Security Standard, applies regardless of Epic |
| BL-017 | SCRUM-739 | ✅ PASS | SQL injection — Security Standard, applies regardless of Epic |
| BL-018 | SCRUM-740 | ⏭️ SKIP | `test.fixme` — no AC governs first/last name validation |

BL-016 and BL-017 are intentional orphans: security tests are always in scope. BL-018 is a **requirement gap**, not an orphan by choice.

---

## Non-Functional Coverage

Reported separately — this is the dimension that silently reads 100% when folded into the headline number.

| Dimension | Covered? | Evidence |
|---|---|---|
| Accessibility | ⚠️ tested, **failing** | AC-13 / BL-013 → SCRUM-721 open |
| Security — credential leakage | ✅ | AC-14 / BL-014 passed |
| Security — injection (XSS, SQLi) | ✅ | BL-016, BL-017 passed |
| Responsive — 1280px | ✅ | AC-15 / BL-015 passed |
| Responsive — other viewports | ❌ | only 1280px stated in any AC |
| Performance | ❌ | no AC, no threshold, no test |
| Authorization / session security | ❌ | no AC, no test |
| Internationalisation / locale | ❌ | no AC, no test |
| Cross-browser | ❌ | chromium only; no AC names a browser matrix |

---

## Defects

### Found this cycle

| Bug | Summary | Severity | Status | Blocks AC | Tier |
|---|---|---|---|---|---|
| **⚠️ NOT FILED** | Validation regex `/^\d{9,10}$/` accepts a 9-digit mobile; user is logged in with an invalid number | **P1** | **unfiled — dedup blocked** | AC-4 | Confirmed (violates **BR-04**, **BR-01**) |

**Why it was not filed — and why that is the correct outcome.**
A JQL for pre-existing bugs (`created < startOfDay() AND summary ~ "9-digit mobile"`) returns a **count of 5**, but every attempt to READ those titles was archived by the MCP transport — including a single-row single-field query and the `search`+`fetch` fallback.

Per AH Rule 21: *a count is not a dedup check*. A non-zero count with unreadable titles means dedup **FAILED**, not "no duplicate found". Filing on an unread count is exactly what produced the duplicate pair SCRUM-717 / SCRUM-719 in the previous cycle. The run stopped and reported the block rather than guessing.

**Human action required:** run the JQL below, confirm whether any of the 5 is this defect, then file or link accordingly.

```
project = SCRUM AND issuetype = Bug AND created < startOfDay() AND summary ~ "9-digit mobile"
```

### Pre-existing open defects (referenced this cycle, not re-filed)

All three were matched in `knowledge-base/SCRUM/known-defects.md` **before** any JQL, and each was verified still open at closure.

| Bug | Summary | Severity | Status | Blocks AC | Tier |
|---|---|---|---|---|---|
| **SCRUM-718** | Account-creation control does nothing — no click handler bound | **P1** | Open | AC-12 | Confirmed (violates **BR-12**) |
| SCRUM-716 | Forgot-password confirmation says "email" on mobile-only login | P2 | Open | AC-10 | Confirmed (violates **BR-10**) |
| SCRUM-721 | Validation errors not announced to assistive technology | P2 | Open | AC-13 | Confirmed (violates **BR-13**) |

**Zero duplicate bugs were created this cycle.** Three existing defects were referenced and linked (`Blocks`) to their test cases.

### Not a defect — recorded as an observation

The account-creation control is labelled "Create New Account". AC-11 **deliberately does not prescribe the label**, so per the Epic's own note this is an observation, not a defect. It was filed as P3 SCRUM-720 in a previous cycle under a different Epic whose AC did prescribe "Sign Up".

---

## Uncovered / Open Questions

1. **First and Last name validation is ungoverned.** Both fields exist in the DOM with dedicated error elements, and the app enforces them, but no AC in SCRUM-722 describes the expected behaviour. BL-018 is `test.fixme` pending answers (SCRUM-740):
   - Are both fields required at login?
   - What are the exact expected error messages?
   - Is there a min/max length or allowed character set?
   - Should a numeric or symbol-only name be rejected?
2. **AC-12 names no destination path** — "the registration flow" is not a URL. BL-012 asserts only that navigation away from login occurs.
3. **No performance AC** — no threshold exists, so no test can be written. Slowest test this run was BL-004 at 8849ms, but that duration reflects a Playwright timeout on a failing assertion, **not** an application performance measurement.
4. **No authorization/session AC** and **no i18n AC** — both dimensions are untested by construction.

---

## Regression Note

`knowledge-base/SCRUM/feature-map.md` is an unseeded template, so no `Used by` chain is recorded for this feature. Blast radius could not be computed from the KB — **[not verified — feature-map.md never seeded]**.

From the login page's own behaviour, observed this cycle: a successful login navigates to `blinkit-products.html`, so the catalogue page is downstream of this feature. That page is out of scope for this Epic (AH Rule 27) and needs its own `/explore` and Epic.

---

## Pipeline Health (dry-run purpose of this Epic)

This Epic existed to surface pipeline defects before a client demo. Result:

| Check | Outcome |
|---|---|
| Oracle staleness gate (new) | **PASS** — caught nothing because the KB was re-seeded first; all 15 `BR-xx` cite SCRUM-722 |
| Dedup register (new) | **WORKED** — 3 existing bugs referenced, 0 duplicates filed (the SCRUM-694 failure did not recur) |
| Archived-write retry guard | **WORKED** — all 18 creates returned keys in-band; no retry path triggered |
| `transition: { id }` shape | **WORKED** — 16 transitions succeeded, no MCP -32602 |
| Allure generate **and serve** | **WORKED** — report verified non-empty and served at HTTP 200 |
| Stale-oracle false positive | **PREVENTED** — BL-006 passed; the pre-re-seed BR-06 would have filed a bug against correct behaviour |

One residual limitation, not a regression: **MCP read archiving** still blocks title-level dedup on broad queries. The framework handled it correctly by refusing to file rather than guessing.
