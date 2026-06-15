# Test Plan — TTACart E-Commerce Application

> Source ticket: SCRUM-178 — TTACart E-Commerce Application — Product Requirements
> Author: QA Team · Date: 2026-06-14 · Status: Draft

## Table of Contents
1. Objective
2. Scope
3. Inclusions
4. Test Environments
5. Defect Reporting Procedure
6. Test Strategy
7. Test Schedule
8. Test Deliverables
9. Entry and Exit Criteria
10. Test Execution
11. Test Closure
12. Tools
13. Risks and Mitigations
14. Approvals

---

## Objective

This test plan covers end-to-end functional verification of TTACart, a web-based e-commerce demo application used for QA automation practice with Playwright. The goal is to validate the complete shopping flow — authentication, product browsing, cart management, checkout, and order confirmation — across all supported user personas. Testing will produce a Playwright TypeScript automation suite covering all 7 application pages (SCRUM-179 to SCRUM-185) and ensure each persona behaves as specified in the acceptance criteria.

**URL / System under test:** https://app.thetestingacademy.com/playwright/ttacart

---

## Scope

1. **Functional Testing** — Verify all 7 pages (Login, Inventory, Product Detail, Cart, Checkout Step 1 & 2, Confirmation) work as specified in SCRUM-179–185 requirements.
2. **Data Validation Testing** — Validate form fields (Login, Checkout Step 1) enforce required-field rules and show correct error messages on empty submission.
3. **Error Handling Testing** — Verify locked_out_user gets rejected with error message; invalid credentials rejected; empty field submissions blocked.
4. **Security Testing** — Confirm unauthenticated users cannot access protected pages (/inventory, /cart, /checkout-*); session cleared on logout.
5. **Regression Testing** — Re-run full E2E flow after any fix to ensure cart state, badge count, and navigation remain consistent.
6. **Edge Case Testing** — Empty cart checkout attempt; adding same item multiple times; back-navigation mid-checkout; performance_glitch_user timing.
7. **Compatibility Testing** — Test across Chromium, Firefox, WebKit (Playwright projects) on desktop viewport.
8. **Ad Hoc / Exploratory Testing** — Explore problem_user, error_user, and visual_user scenarios for unexpected broken states.

> Scope may evolve during testing based on feedback, changing requirements, or discoveries. Review and adjust throughout the phase.

---

## Inclusions

**Authentication (Login Page — SCRUM-179)**
- Verify login form renders: username field, password field, Login button
- Login with standard_user / tta_secret → redirects to /inventory
- Login with locked_out_user → rejected, error message shown (no redirect)
- Login with invalid credentials → rejected, error message shown
- Submit with empty username → validation error shown
- Submit with empty password → validation error shown
- Login with performance_glitch_user → succeeds but with noticeable delay
- Login with problem_user, error_user, visual_user → session established (broken state scenarios covered in exploratory)

**Inventory / Products Page (SCRUM-180)**
- Page heading "Products" visible on load
- Product grid renders with name, price, description, image, "Add to Cart" per card
- Sorting dropdown: all 4 options (Name A→Z, Name Z→A, Price low→high, Price high→low) reorder correctly without page reload
- Default sort on load is Name (A to Z)
- "Add to Cart" → button changes to "Remove", cart badge increments
- "Remove" → button reverts to "Add to Cart", cart badge decrements
- Clicking product name or image → navigates to /item/{id}
- Cart icon in header → navigates to /cart
- Unauthenticated direct URL access → redirects to login

**Product Detail Page (SCRUM-181)**
- Product name, description, price, image all visible
- "Add to Cart" → cart badge updates
- "Back to Products" link → returns to /inventory, cart state preserved

**Cart Page (SCRUM-182)**
- "Your Cart" heading present
- All added items listed with name, description, price, quantity
- Per-item "Remove" → removes item, badge decrements
- Empty cart → appropriate empty state message shown
- "Continue Shopping" → /inventory
- "Checkout" (with items) → /checkout-step-one
- Cart badge in header matches line item count

**Checkout Step One — Customer Information (SCRUM-183)**
- Heading "Checkout: Your Information" present
- First Name, Last Name, Postal Code fields all present and fillable
- Submit with empty First Name → validation error
- Submit with empty Last Name → validation error
- Submit with empty Postal Code → validation error
- All fields filled → Continue → /checkout-step-two
- Cancel → returns to /cart

**Checkout Step Two — Order Overview (SCRUM-184)**
- Heading "Checkout: Overview" present
- All cart items listed with name, description, quantity, price
- Payment Information section present
- Shipping Information section present
- Item subtotal = sum of individual prices (math verified)
- Tax amount shown
- Order total = subtotal + tax (math verified)
- "Finish" → /checkout-complete
- "Cancel" → /inventory

**Order Confirmation (SCRUM-185)**
- "Thank you for your order!" message present
- Exact dispatch text: "Your order has been dispatched, and will arrive just as fast as the TTA Express pony can get there!"
- "Back Home" link → /inventory
- Cart badge resets to 0 after order placed

**Cross-Page / Navigation**
- Cart badge count consistent across all pages throughout full flow
- Header and cart icon persist on all authenticated pages
- Session cleared on logout → redirected to login

---

## Test Environments

| Name | Env URL |
|------|---------|
| QA / Demo | https://app.thetestingacademy.com/playwright/ttacart |
| Pre-Prod | _(assumed — confirm if separate pre-prod exists)_ |

**Test credentials:**

| Username | Password | Expected behavior |
|---|---|---|
| standard_user | tta_secret | Full access — golden path |
| locked_out_user | tta_secret | Login rejected |
| problem_user | tta_secret | Login passes; UI issues expected |
| performance_glitch_user | tta_secret | Login slow; functional |
| error_user | tta_secret | Login passes; errors expected |
| visual_user | tta_secret | Login passes; visual defects expected |

**Platform / browser matrix**
- Chromium (Desktop Chrome) — primary
- Firefox (Desktop Firefox)
- WebKit (Desktop Safari)
- Mobile viewport — _(assumed — confirm if mobile testing in scope)_

**Automation framework:** Playwright TypeScript, headed + headless modes

---

## Defect Reporting Procedure

- **Defect criteria:** deviation from SCRUM-179–185 requirements, broken navigation, incorrect badge counts, wrong error messages, math errors in price totals.
- **Reporting:** Jira bug with title, reproduction steps, expected vs actual, screenshot/video attached.
- **Triage:** assign severity (blocker / critical / major / minor) + priority; route to dev.
- **Tooling:** JIRA — project SCRUM.
- **Roles / POCs:**

| Area | POC |
|------|-----|
| Frontend / UI | _(assumed — confirm)_ |
| QA Automation | _(assumed — confirm)_ |
| DevOps / Env | _(assumed — confirm)_ |

- **Communication:** Daily defect status update in team channel; end-of-cycle summary email.
- **Metrics:** defects found per page, severity distribution, time-to-resolve.

---

## Test Strategy

**Step 1 — Design.** Create test scenarios and cases per page using:
- Equivalence Class Partitioning (valid/invalid inputs for login form, checkout form)
- Boundary Value Analysis (empty fields, max-length inputs)
- Decision Table (all 6 user personas × login outcomes)
- State Transition (cart badge state: 0 → N → 0 through add/remove/order-complete)
- Use Case testing (full E2E golden path for standard_user)
- Error Guessing (what happens on direct URL access when logged out; checkout with empty cart)
- Exploratory testing (problem_user, error_user, visual_user broken states)

**Step 2 — Execution flow.**
1. Smoke test: standard_user login → add 1 item → checkout → confirm. If this fails, block further testing.
2. On stable build: run all 7 page test suites sequentially, then full E2E flows.
3. Run across Chromium, Firefox, WebKit in parallel (Playwright projects).
4. Log bugs per session in Jira SCRUM project.
5. Retest fixed bugs; regression run after each fix batch.

**Step 3 — Best practices.**
- All tests run in headed mode first for visual verification (ANTI-HALLUCINATION Rule 17).
- Playwright `--headed` for selector verification; headless for CI runs.
- Each test isolated: fresh login per test (no shared session state).
- Screenshots captured for both PASS and FAIL results.

---

## Test Schedule

| Task | Dates |
|------|-------|
| Creating Test Plan | 2026-06-14 |
| Test Case Creation | _(assumed — confirm sprint dates)_ |
| Test Case Execution | _(assumed — confirm sprint dates)_ |
| Summary Reports Submission | _(assumed — confirm sprint dates)_ |

> Estimated duration: 1–2 sprints _(assumed — confirm)_.

---

## Test Deliverables

- Test Plan (this document) — `SCRUM-178-test-plan.md` / `.docx`
- Test Cases — Jira Stories SCRUM-179 to SCRUM-185 (already created)
- Playwright automation suite — TypeScript, covering all 7 pages
- Defect Reports — Jira bugs filed under SCRUM project
- Test Summary Report — pass/fail counts per page, defect list, recommendations

---

## Entry and Exit Criteria

### Requirement Analysis
- **Entry:** Testing team has access to SCRUM-178 Epic and child stories (SCRUM-179–185).
- **Exit:** Requirements reviewed; all ambiguities raised; test plan approved.

### Test Execution
- **Entry:** Playwright test suite scaffolded; test environment accessible at https://app.thetestingacademy.com/playwright/ttacart; all 6 user credentials confirmed working.
- **Exit:** All test cases executed; pass/fail recorded per test ID; all defects logged in Jira.

### Test Closure
- **Entry:** Test execution complete; defect reports ready.
- **Exit:** Test Summary Report delivered; open defects triaged and accepted/deferred by product owner.

---

## Test Execution

| Page | Jira Story | Test IDs | Priority |
|------|-----------|----------|----------|
| Login | SCRUM-179 | LGN-01 to LGN-11 | High |
| Inventory | SCRUM-180 | INV-01 to INV-15 | High |
| Product Detail | SCRUM-181 | PDP-01 to PDP-08 | Medium |
| Cart | SCRUM-182 | CRT-01 to CRT-09 | High |
| Checkout Step 1 | SCRUM-183 | CHK1-01 to CHK1-10 | High |
| Checkout Step 2 | SCRUM-184 | CHK2-01 to CHK2-10 | High |
| Confirmation | SCRUM-185 | CONF-01 to CONF-06 | High |

**Total requirement IDs to cover:** 69 across 7 pages.

---

## Test Closure

- All planned test cases executed
- All defects logged; severity/priority assigned
- Regression pass completed after final fix batch
- Test Summary Report reviewed by QA lead
- Automation suite committed to repository
- Stakeholder sign-off received

---

## Tools

- **Jira** — test case management, bug tracking (project: SCRUM)
- **Playwright (TypeScript)** — test automation framework
- **Playwright HTML Reporter** — test result reporting
- **Playwright Trace Viewer** — debugging failures
- **VS Code / Claude Code** — test authoring environment
- Screenshot tool (built-in Playwright `--screenshot=on`)
- Word/Excel — test plan documentation

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Non-availability of a resource | Backup resource planning; pair testing |
| Demo app URL unavailable / changed | Test locally if static files available; check with TTA team |
| Less time for testing | Prioritize golden path (standard_user E2E) first; defer edge cases |
| problem_user / error_user behavior undocumented | Exploratory session first; document observed behavior as baseline |
| Cart state persists across tests (session bleed) | Use fresh login + `storageState` reset per test; or call Reset App State via menu |
| Performance glitch user causes test timeouts | Increase Playwright `navigationTimeout` for this persona specifically |
| Visual user defects are subjective | Define screenshot baseline; use Playwright visual comparison |

---

## Approvals

Documents sent for approval before proceeding to the next step:
- Test Plan (this document)
- Test Cases (Jira SCRUM-179 to SCRUM-185)
- Automation test results
- Test Summary Report

> Testing continues to the next step only once approvals are done.
