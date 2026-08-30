# Test Closure Report — SCRUM-653: Blinkit Login Page (Vercel) — Authentication & Field Validation

**Date:** 2026-08-24 · **Cycle:** execution run 2026-08-24 (progress.md line 749)
**Spec:** `BlinkitDemo-V2/tests/ui/blinkit-login.spec.ts` · **Source:** progress.md run 2026-08-24
**Build:** https://blinkit-demo-qa.vercel.app/ — Vercel, verified live 2026-08-24 (app exposes no build hash; URL+date is the only build identity available)
**Evidence report:** `allure-report/closure-SCRUM-653/` — verified 18 tests / 15 passed / 3 failed, 27 attachments. Serve with `npx allure open allure-report/closure-SCRUM-653 --port 8090`.

## Verdict: 🔴 NO-GO

**Triggered by:** two open **High**-priority defects (SCRUM-645, SCRUM-647) on the authentication path. The NO-GO rule fires on any open P0/Critical/Blocker-class defect; both Highs sit directly on sign-in, the feature's critical path.

**Ship risk:**
- **SCRUM-645 (High)** — a 9-digit mobile authenticates. Verified live: `987654321` reached `blinkit-products.html` and persisted to sessionStorage. This is an authentication-boundary defect, not cosmetic: the documented identity rule (exactly 10 digits, AC-4) is not enforced, so a user can sign in under a malformed identifier.
- **SCRUM-647 (High)** — Create New Account is inert. New users cannot register at all. Click leaves the URL unchanged; the element has no handler and is not bound to a form.
- **SCRUM-646 (Medium)** — the reset confirmation names an email channel the form never collects (0 email inputs on the page). Users are told to check an inbox that was never captured.

**Coverage is not the blocker.** 14/14 ACs are covered and the pass rate is 15/18 (83%) — above the 80% GO-WITH-RISK threshold. The verdict rests entirely on defect severity, not on gaps.

**To reach GO:** fix SCRUM-645 and SCRUM-647, re-run BL-008 and BL-015. SCRUM-646 (Medium) is defensible as GO-WITH-RISK once the two Highs are closed.

## Coverage

Requirements: **14/14 (100%)** · Pass rate: **15/18 (83%)** · Execution: **18/18 (100%)**

Every AC has at least one executing test. No AC is `NOT COVERED`.

## Traceability Matrix

| AC | Requirement | Test IDs | Result | Status |
|---|---|---|---|---|
| AC-1 | Empty First Name rejected — "Enter your first name" | BL-004 | ✅ PASS | COVERED |
| AC-2 | Empty Last Name rejected — "Enter your last name" | BL-005 | ✅ PASS | COVERED |
| AC-3 | Exactly 10-digit mobile accepted | BL-007 | ✅ PASS | COVERED |
| AC-4 | Shorter than 10 digits rejected, does not authenticate | BL-008, BL-009 | ❌ FAIL (BL-008) / ✅ PASS (BL-009) | **DEFECT (SCRUM-645)** |
| AC-5 | Mobile field prevents entry beyond 10 digits | BL-010 | ✅ PASS | COVERED |
| AC-6 | Mobile field rejects alphabetic and special characters | BL-011, BL-012 | ✅ PASS | COVERED |
| AC-7 | All three empty fields display all three errors together | BL-006 | ✅ PASS | COVERED |
| AC-8 | Toast "✅ OTP sent to +91 {mobile}" names the number entered | BL-002 | ✅ PASS | COVERED |
| AC-9 | Details persisted to sessionStorage on sign-in | BL-013 | ✅ PASS | COVERED |
| AC-10 | Successful sign-in navigates to blinkit-products.html | BL-014 | ✅ PASS | COVERED |
| AC-11 | Forgot Password confirmation names the mobile number | BL-003 | ❌ FAIL | **DEFECT (SCRUM-646)** |
| AC-12 | Create New Account navigates to the registration flow | BL-015 | ❌ FAIL | **DEFECT (SCRUM-647)** |
| AC-13 | Invalid entry applies a visible error state to the field | BL-016 | ✅ PASS | COVERED |
| AC-14 | SQL and XSS payloads neither bypass validation nor execute | BL-017, BL-018 | ✅ PASS | COVERED |

**Note on AC-4:** covered by two tests with split results. BL-009 (1-digit) passes — short numbers ARE rejected at the low end. BL-008 (9-digit) fails. The boundary is enforced at the wrong value, which is why a single-test AC would have masked this.

### Orphan tests

| Test ID | Jira | Maps to | Disposition |
|---|---|---|---|
| BL-001 | SCRUM-654 | no single AC | Page-render smoke test — asserts all six controls are visible. Precondition for every other AC rather than a requirement of its own. Kept, not dropped. |

## Non-Functional Coverage

| Dimension | Covered? | Evidence |
|---|---|---|
| Security — injection | ✅ | BL-017 (SQLi), BL-018 (XSS) both pass |
| Security — authorization | ❌ | No AC states role/session rules; no test rows |
| Performance | ❌ | No AC states a response-time budget; no test rows |
| Accessibility | ❌ | Not in scope this cycle; no AC, no tests |
| Internationalisation | ❌ | No AC; the +91 prefix is hard-coded, untested for other regions |
| Audit / logging | ❌ | No AC; no test rows |

Functional coverage reads 100%. That figure covers **only** the 14 stated ACs — five non-functional dimensions have no requirements written and therefore no tests by construction. Do not read 100% as "fully tested".

## Defects

### Open — blocking this cycle

| Bug | Summary | Severity | Status | Blocks AC | Tier |
|---|---|---|---|---|---|
| SCRUM-645 | Mobile validation accepts 9-digit numbers | **High** | To Do | AC-4 | [SUSPECTED] |
| SCRUM-647 | Create New Account button is inert | **High** | To Do | AC-12 | [SUSPECTED] |
| SCRUM-646 | Password reset confirmation names email as the channel | Medium | To Do | AC-11 | [SUSPECTED] |

All three were filed 2026-08-23 — **pre-existing, one day before this cycle**. This cycle found no new defects; it independently reproduced three known ones.

**Tier justification:** all three are `[SUSPECTED]`, not `Confirmed`. `knowledge-base/SCRUM/business-rules.md` is still the unseeded `<PRODUCT>` template, so no `BR-xx` rule exists to cite. The classification rests on the Epic ACs alone. Each was reproduced manually in headed mode independently of the test run, so the *behaviour* is verified fact — only the Confirmed/Suspected tier is limited by the missing oracle.

### Duplicate-filing problem (process finding)

JQL found each defect filed repeatedly:

| Defect | Open duplicates |
|---|---|
| 9-digit mobile authenticates | SCRUM-645, SCRUM-497, SCRUM-418 |
| Reset toast names email | SCRUM-646, SCRUM-419 |
| Create New Account inert | SCRUM-647, SCRUM-624, SCRUM-575, SCRUM-141 |

Nine open tickets for three defects. This cycle filed nothing new and linked to the newest of each via *Blocks*. The duplication predates this cycle and is worth a cleanup pass — it inflates the open-bug count and splits discussion across tickets.

## Uncovered / Open Questions

- **Authorization, performance, accessibility, i18n, audit** — no ACs stated, so no tests exist. Whether these matter is a product decision, not a QA gap to silently close.
- **AC-4's intended boundary is unconfirmed.** The app's validation accepts 9–10 digits; the Epic says exactly 10. The Epic wins by rule (AH Rule 19), but nobody has confirmed which is the *intended* requirement. If 9 digits is intentional, AC-4 is wrong and three tickets are invalid.
- **`business-rules.md` is unseeded.** Until `BR-xx` rules exist, every defect this project finds is capped at `[SUSPECTED]`. Seeding it from the 14 ACs would let the next cycle assign `Confirmed`.
- **Trend unavailable** — two runs exist (`exec-SCRUM-653`, `closure-SCRUM-653`) but only the closure run produced Allure results. No history graph until a second Allure-instrumented cycle runs.

## Regression Note

`knowledge-base/SCRUM/feature-map.md` is an unseeded template, so no `Used by` chain is recorded and blast radius cannot be computed from the KB.

From observed behaviour this cycle, login is upstream of at least: the product catalogue (`blinkit-products.html`, reached by BL-014) and any consumer of the `blinkitUser` sessionStorage record (written per BL-013). A change to the login contract — particularly the mobile format — propagates to both. Seeding `feature-map.md` would make this computable rather than inferred.
