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

## 2026-06-29 — /explore https://rahulshettyacademy.com/seleniumPractise/#/

**POM Generated:** `pages/GreenKartPage.ts` (overwritten fresh from snapshot)
**Jira context:** SCRUM-270 (known-defects.md for SCRUM = missing → no defect annotations)
**Elements Found:** 13 distinct types — 1 searchbox, 1 search button, 31 product cards (name/price/stepper/ADD TO CART each), cart icon, live Items/Price summary, Top Deals link
**Locators Verified:** landing-page snapshot-confirmed; .product/h4.product-name/p.product-price/stepper verified via querySelectorAll | cart dropdown + checkout (#/cart) marked VERIFICATION REQUIRED (dynamic, not in landing snapshot)
**Notes:** No reCAPTCHA, no iframes. SPA hash-route — cart/checkout content dynamic, may need waitFor().

## 2026-06-29 — /explore https://rahulshettyacademy.com/seleniumPractise/#/ (SCRUM-270)

**POM Generated:** `pages/GreenKartPage.ts` (overwritten fresh, #/-only per Lesson #6)
**Scope:** #/ DOM only — cart dropdown IN (same URL); checkout #/cart OUT (URL change).
**Elements Found:** 14 types — searchbox, search btn, 31 products (name/price/stepper/ADD TO CART), 4 header links (Top Deals, Flight Booking[EXT], TechSmartHire[EXT], Cart), live Items/Price summary, cart dropdown (items/remove ×/PROCEED).
**Locators Verified:** snapshot-confirmed; .product/h4.product-name/p.product-price via querySelectorAll | searchButton(.search-button) marked VERIFICATION REQUIRED.
**Notes:** No reCAPTCHA, no iframes. SPA hash-route. KB known-defects for SCRUM absent → no annotations.

## 2026-08-18 — /explore http://localhost:7000/blinkit-login.html

**POM Generated:** `c:\demo-e2e-ai\src\pages\blinkitLoginPage.ts`
**Elements Found:** 10 total (3 inputs, 2 buttons, 1 link, 3 validation messages, 1 toast)
**Locators Verified:** 10 confirmed from live snapshot | 0 marked VERIFICATION REQUIRED
**Notes:** No reCAPTCHA, no iframes. Toast (#toast) is transient — auto-hides after 3000ms, needs waitFor(). Success login navigates to blinkit-products.html after 1500ms (separate /explore scope). Known defect SCRUM-141 annotated on createNewAccountButton (#signupBtn has no click handler). Two further intentional bugs seen in page source and annotated as UNVERIFIED vs Epic — mobile regex /^\d{9,10}$/ accepts 9 digits, and Forgot Password toast reads "email". Assertions deferred to /test-case-creation against SCRUM-299 ACs. No knowledge-base/SCRUM/known-defects.md present.

## 2026-08-18 — /explore http://localhost:7000/blinkit-login.html

**POM Generated:** `c:\demo-blinkit-e2e\src\pages\blinkitLoginPage.ts`
**Elements Found:** 6 total (3 inputs, 2 buttons, 1 link)
**Locators Verified:** 6 confirmed from snapshot | 0 marked VERIFICATION REQUIRED
**Notes:** No reCAPTCHA/iframes. Only console error = favicon.ico 404 (unrelated). `#mobile` has maxlength="10" (BR-12). `#signupBtn` annotated with KNOWN DEFECT SCRUM-141. Login click navigates to blinkit-products.html — scope boundary, products elements excluded (needs own /explore).

## 2026-08-19 — /explore http://localhost:7000/blinkit-login.html

**POM Generated:** `c:/demo-final-e2e/src/pages/blinkitLoginPage.ts`
**Elements Found:** 11 total (3 inputs, 2 buttons, 1 link, 3 error messages, 1 toast, 1 heading)
**Locators Verified:** 11 confirmed from snapshot + live DOM (scripts/fetch-local-page.js) | 0 marked VERIFICATION REQUIRED
**Notes:** No iframes, no CAPTCHA. Console error = favicon.ico 404 only (not an app defect). Toast (#toast) + inline errors are dynamically shown — need waitFor(). SCRUM-141 annotated on createNewAccountButton (#signupBtn has no click handler — verified in source, no addEventListener). Valid login changes URL to blinkit-products.html — out of scope, separate /explore run (Step 6 URL-boundary guard).
