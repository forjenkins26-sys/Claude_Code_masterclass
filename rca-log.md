# Findings & RCA Log
*Auto-updated by /bug-triage — BLAST protocol*

---

## 2026-06-25 — SCRUM-269: Cancel Order button visible in Dispatched state

**Classification:** REAL_BUG (AH Rule 23)
**Severity:** P2 — Major Functional
**Caught by:** OD-008 automated test (SCRUM-263)
**Root Cause:** `order-details.html` renders `#cancelBtn` unconditionally — no status-based visibility logic.
**AC Violated:** SCRUM-255 AC line 8 — Cancel visible ONLY in Placed/Confirmed states.
**Fix:** Add JS on page load: hide `#cancelBtn` if status not in `['Placed', 'Confirmed']`.
**Status:** Bug filed as SCRUM-269. SCRUM-263 BLOCKED pending fix.

---

## 2026-06-25 — /explore http://localhost:7000/order-details.html

**POM Generated:** `Playwright Automation Framework/src/pages/OrderDetailsPage.ts`
**Elements Found:** 7 total (0 inputs, 4 buttons, 0 links, 3 static locators)
**Locators Verified:** 7 confirmed from live DOM snapshot | 0 marked VERIFICATION REQUIRED
**Notes:** No inputs, dropdowns, or iframes. Cancel Order triggers browser confirm dialog — tests must handle `page.on('dialog')`. Invoice button triggers file download.

---

## 2026-06-15 — SCRUM-141: Create New Account button has no click handler

**Severity:** P2 (Major — Functional)
**Root Cause:** `#signupBtn` in `blinkit-login.html` has no `onclick` attribute and no JS `addEventListener`. Button renders but has no handler — intentional defect for test automation practice.
**System Layer:** UI (HTML only — no backend involved)
**Fix Recommendation:** Add `onclick="window.location.href='registration-demo.html'"` to `#signupBtn`. File `registration-demo.html` already exists at workspace root.
**Tests Added:** 5 regression cases + 1 verification test — see `tests/ui/blinkit-login.spec.ts` (BL-010)
**Jira:** [SCRUM-141](https://anandsoni2641.atlassian.net/browse/SCRUM-141)
