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

## 2026-08-19 — /explore http://localhost:7000/blinkit-login.html

**POM Generated:** `c:\demo-live-e2e\src\pages\blinkitLoginPage.ts`
**Elements Found:** 10 total (3 inputs, 2 buttons, 1 link, 3 error spans, 1 toast)
**Locators Verified:** 10 confirmed from live DOM snapshot | 0 marked VERIFICATION REQUIRED
**Notes:** No iframes, no CAPTCHA. Console error = favicon.ico 404 only (not an app defect). Same-URL states captured: default, validation-error (empty submit -> 3 inline errors), toast ("OTP sent to +91 9876543210"). #mobile has maxlength=10. SCRUM-141 annotated on createNewAccountButton (verified: no onclick attr, click causes no nav and no toast). Valid Login navigates to blinkit-products.html — out of scope, needs its own /explore (Step 6 URL-boundary guard).

## 2026-08-19 — /explore http://localhost:7000/blinkit-login.html

**POM Generated:** `c:/demo-run-e2e/src/pages/blinkitLoginPage.ts`
**Elements Found:** 11 total (3 inputs, 2 buttons, 1 link, 3 error msgs, 1 toast, 1 heading)
**Locators Verified:** 11 confirmed from snapshot + live DOM | 0 marked VERIFICATION REQUIRED
**Notes:** No reCAPTCHA, no iframes. Console error = favicon.ico 404 only (unrelated). SCRUM-141 annotated on createNewAccountButton. Login with valid data navigates to blinkit-products.html — OUT OF SCOPE, separate /explore (Lesson #6). Validation errors are same-URL state, captured.

## 2026-08-19 — /explore http://localhost:7000/blinkit-login.html

**POM Generated:** `demo-showcase-e2e/src/pages/blinkitLoginPage.ts`
**Elements Found:** 11 total (3 inputs, 2 buttons, 1 link, 3 error spans, 1 toast, 1 heading)
**Locators Verified:** 11 confirmed from live snapshot + page source | 0 marked VERIFICATION REQUIRED
**States Captured:** default, post-submit validation (same URL). Valid login navigates to blinkit-products.html — OUT of scope, needs own /explore.
**Notes:** No reCAPTCHA, no iframes. `#signupBtn` annotated with KNOWN DEFECT SCRUM-141. Console shows only favicon.ico 404 (harmless). Typecheck passed.

## 2026-08-19 — /explore http://localhost:7000/blinkit-login.html

**POM Generated:** `c:\demo-fresh-e2e\src\pages\blinkitLoginPage.ts`
**Elements Found:** 11 total (3 inputs, 2 buttons, 1 link, 3 error spans, 1 toast, 1 static +91 prefix)
**Locators Verified:** 11 confirmed from snapshot + DOM source | 0 marked VERIFICATION REQUIRED
**Notes:** No reCAPTCHA, no iframes. Form has novalidate (JS validation only). Error spans + toast hidden by default — need toBeVisible() waits. #mobile has maxlength="10" (BR-12 hook). #signupBtn annotated with KNOWN DEFECT SCRUM-141 (no click handler, confirmed at blinkit-login.html:417). Console error = favicon.ico 404 only, not an app defect.

## 2026-08-22 — /explore https://medicare-pharmacy-demo-eight.vercel.app/

**POM Generated:** `MediCare-QA-Demo/src/pages/MediCareLoginPage.ts`
**Elements Found:** 10 total (3 inputs, 2 buttons, 1 link, 3 error messages, 1 toast)
**Locators Verified:** 10 confirmed from live deployed DOM | 0 marked VERIFICATION REQUIRED
**Attributes verified via browser_evaluate:** password maxlength=20, pincode maxlength=6 (type=text), email uncapped (type=email), form novalidate
**Notes:** No iframes, no CAPTCHA, no dropdowns. #registerBtn sits outside #loginForm with no click handler (registerHandlerInSource=false) — flagged as IN-02, not filed (AH Rule 19, Epic AC owns the verdict). Toast auto-dismisses at 3000ms. Console error is favicon 404 only. Target URL corrected from localhost to Vercel deployment mid-run; CLAUDE.md updated to match.

## 2026-08-23 — /explore https://medicare-pharmacy-demo-eight.vercel.app

**POM Generated:** `ClientDemo-E2E/src/pages/mediCareLoginPage.ts`
**Elements Found:** 10 total (3 inputs, 2 buttons, 1 link, 3 error nodes, 1 toast)
**Locators Verified:** 10 confirmed from live DOM snapshot + JS attribute read | 0 marked VERIFICATION REQUIRED
**Notes:** No reCAPTCHA, no iframes. `#registerBtn` is type="submit" but sits OUTSIDE `#loginForm` (parent `div.right-panel`, `btn.form === null`) with no click handler — clicking does nothing observable. Structural flag, not an assertion. Form has `novalidate`, so all validation is the JS submit handler. Error nodes lack `role="alert"` (class-toggle `.show`). Toast `#toast` auto-hides after 3000ms — needs waitFor. Console: favicon.ico 404 only, not a defect. Constraints read from DOM: password maxlength=20, pincode maxlength=6, no field has `required`.

## 2026-08-23 — /explore https://blinkit-demo-qa.vercel.app

**POM Generated:** `Blinkit-QA-Demo/src/pages/BlinkitLoginPage.ts` (typecheck clean)
**Elements Found:** 9 total (3 inputs, 2 buttons, 1 link, 3 hidden error elements)
**Locators Verified:** 9 confirmed from live DOM | 0 marked VERIFICATION REQUIRED
**DOM facts:** `#mobile` type=tel maxlength=10 · form `#loginForm` novalidate (JS validation) · error text: "Enter your first name" / "Enter your last name" / "Enter valid 10-digit mobile number"
**Happy path:** valid login writes `sessionStorage.blinkitUser` = `{firstName,lastName,mobile}` then navigates to `/blinkit-products.html` (out of scope — separate /explore, AH Rule 27)
**Suspected defect:** `Create New Account` (#signupBtn) — clean state + valid data = no nav, no error, no storage write, no visible change. Matches SCRUM-141 symptom on earlier build. NOT confirmed; expected behaviour owned by SCRUM-603 AC (AH Rule 19). Dedup vs SCRUM-141 before filing.
**Notes:** no CAPTCHA, no iframes, no password field (mobile-based login). Console shows one 404 for /favicon.ico — cosmetic only.

## 2026-08-23 — /explore https://blinkit-demo-qa.vercel.app

**POM Generated:** `Blinkit-Demo/src/pages/blinkitLoginPage.ts` (typecheck clean)
**Elements Found:** 12 total (3 inputs, 2 buttons, 1 link, 3 error messages, 1 toast, 2 static)
**Locators Verified:** 12 confirmed from live DOM + JS attribute read | 0 marked VERIFICATION REQUIRED
**Same-URL states captured:** default, validation-error, signup-click (no nav) — URL never changed, scope held to login page
**Notes:** No CAPTCHA, no iframes. `div#toast` has no ARIA role — absent from a11y snapshot, needs `#toast`. Happy path redirects to blinkit-products.html after a 1500ms setTimeout; session in sessionStorage not localStorage. Console shows only a favicon 404 (cosmetic).
**Observations (NOT assertions — Epic AC remains oracle):** page source carries 3 inline "INTENTIONAL BUG" comments — (1) mobile regex `{9,10}` vs a claimed AC-4 exactly-10 rule, (2) Forgot Password toast says "email" vs a claimed AC-7 "mobile", (3) `#signupBtn` has no handler (0 script refs, verified click = no URL change; matches SCRUM-141 symptom on the legacy page — dedup decision belongs to Step 3).
**KB written:** `Blinkit-Demo/knowledge-base/SCRUM/app-patterns.json` — FP-01/FP-02, UC-01..03, FL-01/FL-02, LS-01..03, IN-01. JSON validated.

## 2026-08-23 — /explore https://blinkit-demo-qa.vercel.app

**POM Generated:** `BlinkitDemo-Live/src/pages/blinkitLoginPage.ts`
**Elements Found:** 10 total (3 inputs, 2 buttons, 1 link, 3 error nodes, 1 country-code prefix)
**Locators Verified:** 10 confirmed from live DOM snapshot | 0 marked VERIFICATION REQUIRED
**Notes:** No CAPTCHA, no iframes. Console: 1 error (favicon.ico 404 — cosmetic, not app logic).
Two suspected defects surfaced during exploration, NOT filed (explore discovers locators, not verdicts — Epic AC owns expected behaviour):
- `#signupBtn` has no click handler (id absent from page script; click produced no state change). Dedup candidate: workspace SCRUM-141, same symptom on earlier Blinkit build.
- Mobile validation regex is `/^\d{9,10}$/` while label + error text state "10-digit". Verified live: 9-digit `987654321` logged in and redirected to `blinkit-products.html`. Page source comment cites "Requirement (AC-4): must be EXACTLY 10 digits."
**Scope:** login page only. `blinkit-products.html` reached during boundary probe — NOT captured into this POM (separate /explore, AH Rule 27 / Lesson #6).

## 2026-08-24 — /explore https://blinkit-demo-qa.vercel.app/

**POM Generated:** `BlinkitDemo-V2/src/pages/blinkitLoginPage.ts`
**Elements Found:** 10 total (3 inputs, 2 buttons, 1 link, 4 message elements)
**Locators Verified:** 10 confirmed from live snapshot + DOM inspect | 0 marked VERIFICATION REQUIRED
**Notes:** No reCAPTCHA, no iframes. No password field on the login form (First/Last Name + Mobile only). `#mobile` maxlength=10, type=tel. All 3 error spans (`#firstNameErr`/`#lastNameErr`/`#mobileErr`) verified visible after an empty submit. `#toast` text "Password reset link sent to your email" fires on Forgot Password while the form collects mobile only — matches existing Allure failure BL-003. `#signupBtn` is type=submit with no inline onclick — flagged against SCRUM-141, not asserted (an addEventListener would not appear in a DOM inspect). Console: favicon.ico 404 only. `knowledge-base/SCRUM/known-defects.md` in V2 is an unseeded template, so no defect annotations were possible.

## 2026-08-24 — /explore https://blinkit-demo-qa.vercel.app

**POM Generated:** `BlinkitDemo-Demo25/src/pages/blinkitLoginPage.ts` (typecheck: PASS)
**Elements Found:** 11 total (3 inputs, 2 buttons, 1 link, 3 error containers, 1 toast, 1 static prefix)
**Locators Verified:** 11 confirmed from live DOM snapshot + attribute probe | 0 marked VERIFICATION REQUIRED
**Same-URL states captured:** empty-submit validation (3 inline errors), Forgot Password toast, Create-New-Account click (no-op)
**Notes:** No CAPTCHA, no iframes. Toast `#toast` is transient (3000ms auto-hide) — tests must assert immediately. Error nodes always in DOM → assert visibility not presence. `#mobile` maxlength=10, type=tel, strips non-digits on input. Successful login → `blinkit-products.html` after 1500ms (OUT of Epic scope, AH Rule 27).
**Observations recorded, NOT asserted (Epic AC remains oracle — AH Rule 19):** (1) mobile regex `^\d{9,10}$` accepts 9 digits; (2) Forgot Password toast reads "email" on a mobile-only login; (3) `#signupBtn` has no listener — click verified empirically: no URL change, no toast, no sessionStorage write.

## 2026-08-24 — MCP archiving block on SCRUM-672 (/test-case-creation)

**Symptom:** Every `getJiraIssue` on SCRUM-672 returned `[Full result archived]` — AC text never reached the model. Run blocked at Step 1A.
**Root cause:** `MAX_MCP_OUTPUT_TOKENS` not set in ANY settings file (user/project/project-local/env — verified by grep). Harness default cap applied; Atlassian MCP response exceeded it.
**Key finding — CLAUDE.md remediation ladder was ineffective:** narrowing `fields` 6→1 barely moved payload (4,884 → 4,645 chars), and `summary`-only vs `description`-only were byte-identical (4,645 both). `searchJiraIssuesUsingJql` = 4,787. Bulk is the MCP response envelope (context object, account/cloud ids, client metadata), which `fields` does not trim. *(Inference from byte counts; archived payloads not readable on disk.)*
**Fix applied:** `env.MAX_MCP_OUTPUT_TOKENS = "50000"` added to `.claude/settings.json` (backup: `settings.json.bak-20260824`; 139 permission rules + enabledPlugins verified intact). CLAUDE.md "If MCP results start archiving" section rewritten with measured evidence table + corrected ladder.
**Status:** NOT YET VERIFIED — env is read at session startup. Requires restart + re-read of SCRUM-672 to confirm.
**Rule honored:** blocked run reported honestly; no test cases generated from `/explore` UI observations (AH Rule 19 — would have produced a green suite agreeing with all 3 seeded defects).

## 2026-08-24 — /explore https://blinkit-demo-qa.vercel.app

**POM Generated:** `BlinkitDemo-Run2/src/pages/blinkitLoginPage.ts` (typecheck clean)
**Elements Found:** 10 total (3 inputs, 2 buttons, 1 link, 3 error spans, 1 toast) + 1 heading
**Locators Verified:** 10 confirmed from live DOM snapshot + `browser_evaluate` attribute read | 0 marked VERIFICATION REQUIRED
**Notes:** No CAPTCHA, no iframes, no password field (mobile-only login). `<form id="loginForm" novalidate>` — JS validation only. Error spans always present in DOM; assert on visibility not presence. Mobile field `type=tel maxlength=10` (truncates on entry, not reject on submit). `+91` is a static span, NOT an input. Error-id convention `...Err` (matches workspace IN-01 inconsistency note). Console: 404 on /favicon.ico, cosmetic.
**Scope boundary honored:** valid login navigates to `/blinkit-products.html` — STOPPED, elements NOT pulled into this POM (Step 6 URL guard, Lesson #6). Products page = separate /explore.
**DOM observations passed to /test-case-creation (no assertions written — Epic AC owns expected behavior, AH Rule 19):**
  1. `#signupBtn` click → URL unchanged, no toast, no error, no new DOM node. Dead control.
  2. `#forgotBtn` toast reads "📧 Password reset link sent to your email" on a form collecting mobile number only, no email field.
**KB state:** `knowledge-base/SCRUM/known-defects.md` is unseeded `<PRODUCT>` template — 0 defect rows, so 0 locator annotations applied. Must be seeded from SCRUM-694 ACs during Step 2 or Step 3 loses Confirmed/Suspected tiering silently.

## 2026-08-24 — /explore https://blinkit-demo-qa.vercel.app

**POM Generated:** `BlinkitDemo-Demo25/src/pages/blinkitLoginPage.ts` (Epic SCRUM-722)
**Elements Found:** 12 total (3 inputs, 2 buttons, 1 link, 3 error nodes, 1 toast, 2 static text)
**Locators Verified:** 12/12 resolved to exactly 1 element in a live headed run | 0 marked VERIFICATION REQUIRED
**Notes:** No reCAPTCHA, no iframes. Error nodes + #toast are display:none at rest — absent from the at-rest a11y snapshot, need waitFor(). #toast is a shared channel (forgot-password AND OTP success) with a 3s auto-dismiss. Successful login navigates to blinkit-products.html — different URL, out of scope (AH Rule 27). Source review found a THIRD seeded defect not in CLAUDE.md: mobile regex is /^\d{9,10}$/, so a 9-digit number passes validation (violates AC-1/AC-4). Reported as an observation for /test-case-creation; explore writes no assertions.

## 2026-08-25 — /explore https://blinkit-demo-qa.vercel.app

**POM Generated:** `ClientDemo-25Aug/src/pages/blinkitLoginPage.ts`
**Elements Found:** 11 total (3 inputs, 2 buttons, 1 link, 3 error spans, 1 toast, 1 form)
**Locators Verified:** 11 confirmed via live count()==1 | 0 marked VERIFICATION REQUIRED
**States Captured:** default, empty-submit validation, forgot-password toast (all same-URL, no nav)
**Notes:** No reCAPTCHA, no iframes. Observations for /test-case-creation: mobile validation regex is `/^\d{9,10}$/`; listeners bound only to loginForm/mobile/forgotBtn (none on signupBtn); page has 0 aria-describedby, 0 role="alert", 0 aria-live; forgot-password toast reads "email" on a mobile-only login. All are DOM facts, not verdicts — the SCRUM-741 ACs decide.

## 2026-08-26 — /explore https://blinkit-demo-qa.vercel.app

**POM Generated:** `QuickDemo/src/pages/blinkitLoginPage.ts`
**Elements Found:** 12 total (3 inputs, 2 buttons, 1 link, 3 error spans, 1 toast, 2 containers)
**Locators Verified:** 12 confirmed live via count()==1 | 0 marked VERIFICATION REQUIRED
**Notes:** No reCAPTCHA, no iframes, no dropdowns. Console error is favicon.ico 404 only (cosmetic). Form is `novalidate` — JS-only validation. Same-URL states captured: empty-submit errors, forgot-password toast, OTP success toast; no click leaves the URL. Live a11y read: 0 aria-describedby / 0 role="alert" / 0 aria-live. Four documented defects observed live and annotated as comments (SCRUM-645 9-digit accepted, SCRUM-716 toast says "email", SCRUM-718 #signupBtn no nav, SCRUM-721 errors unannounced) — comments only, no assertions.
