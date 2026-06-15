# Product Requirements Document — TTACart

**Product:** TTACart  
**URL:** https://app.thetestingacademy.com/playwright/ttacart  
**Document Type:** Product Requirements Document (PRD)  
**Date:** 2026-06-14  
**Author:** QA Analysis via Claude Code  
**Status:** Draft

---

## 1. Product Overview

TTACart is a web-based e-commerce demo application built for QA automation practice (specifically Playwright testing). It simulates a complete shopping cart flow — from login through product browsing, cart management, checkout, and order confirmation. The app supports multiple user personas to enable testing of edge cases such as locked accounts, performance degradation, and visual bugs.

---

## 2. Goals & Objectives

| Goal | Description |
|------|-------------|
| Practice Target | Provide a realistic e-commerce environment for QA automation learners |
| Multi-Persona Testing | Support 6 distinct user types to test different system behaviors |
| Full E2E Coverage | Cover login → inventory → cart → checkout → confirmation flow |
| Test Data Stability | Fixed product catalog and credentials for repeatable test runs |

---

## 3. User Personas

The application supports 6 built-in test users. All share password: `tta_secret`

| Username | Behavior / Purpose |
|---|---|
| `standard_user` | Normal user — full app access, all features work correctly |
| `locked_out_user` | Login rejected — tests lockout/error state handling |
| `problem_user` | Logged in but experiences UI/functional issues — tests broken states |
| `performance_glitch_user` | Logged in with simulated slowness — tests performance & timeout handling |
| `error_user` | Logged in but triggers errors — tests error state handling |
| `visual_user` | Logged in with visual defects — tests visual regression scenarios |

---

## 4. Application Pages & Features

### 4.1 Login Page
**URL:** `/playwright/ttacart` (root)  
**Title:** TTACart - Login

**Functional Requirements:**

| ID | Requirement |
|----|-------------|
| LGN-01 | Page must display username input field |
| LGN-02 | Page must display password input field |
| LGN-03 | Page must display Login submit button |
| LGN-04 | Accepted usernames listed: standard_user, locked_out_user, problem_user, performance_glitch_user, error_user, visual_user |
| LGN-05 | All accounts share password: `tta_secret` |
| LGN-06 | `standard_user` with correct password → redirect to `/inventory` |
| LGN-07 | `locked_out_user` → login rejected, error message displayed |
| LGN-08 | Invalid credentials → login rejected, error message displayed |
| LGN-09 | Empty username submission → validation error |
| LGN-10 | Empty password submission → validation error |
| LGN-11 | `performance_glitch_user` → login succeeds but with noticeable delay |

---

### 4.2 Inventory / Products Page
**URL:** `/playwright/ttacart/inventory`  
**Title:** TTACart - Products

**Functional Requirements:**

| ID | Requirement |
|----|-------------|
| INV-01 | Page heading must display "Products" |
| INV-02 | Page must display product grid/list of items |
| INV-03 | Each product card must show: product name, price, description, image, "Add to Cart" button |
| INV-04 | Sorting dropdown must be present with 4 options: Name (A to Z), Name (Z to A), Price (low to high), Price (high to low) |
| INV-05 | Default sort must be Name (A to Z) |
| INV-06 | Selecting sort option must reorder products without page reload |
| INV-07 | Cart icon must be visible in header showing item count badge |
| INV-08 | Cart badge must update immediately when "Add to Cart" is clicked |
| INV-09 | "Add to Cart" button must change to "Remove" after item is added |
| INV-10 | Clicking "Remove" must remove item from cart and revert button to "Add to Cart" |
| INV-11 | Clicking product name or image must navigate to product detail page |
| INV-12 | Cart icon must navigate to cart page when clicked |
| INV-13 | Header must display app name/logo |
| INV-14 | Burger/hamburger menu must be accessible (if present) |
| INV-15 | Unauthenticated access to `/inventory` must redirect to login |

---

### 4.3 Product Detail Page
**URL:** `/playwright/ttacart/item/{id}`  
**Title:** TTACart - [Product Name]

**Functional Requirements:**

| ID | Requirement |
|----|-------------|
| PDP-01 | Page must display full product name |
| PDP-02 | Page must display product description |
| PDP-03 | Page must display product price |
| PDP-04 | Page must display product image |
| PDP-05 | "Add to Cart" button must be present |
| PDP-06 | Cart badge must update when "Add to Cart" is clicked |
| PDP-07 | "Back to Products" / back navigation link must be present |
| PDP-08 | Back link must return user to inventory page |

---

### 4.4 Cart Page
**URL:** `/playwright/ttacart/cart`  
**Title:** TTACart - Your Cart

**Functional Requirements:**

| ID | Requirement |
|----|-------------|
| CRT-01 | Page heading must display "Your Cart" |
| CRT-02 | Cart must list all added items with name, description, price, quantity |
| CRT-03 | Each cart item must have a "Remove" button |
| CRT-04 | Clicking "Remove" must remove that item from cart and update badge count |
| CRT-05 | Empty cart must display appropriate empty state message |
| CRT-06 | "Continue Shopping" button must navigate back to inventory page |
| CRT-07 | "Checkout" button must navigate to checkout step one |
| CRT-08 | Checkout button must be disabled or hidden when cart is empty (or show validation) |
| CRT-09 | Total item count in header badge must match cart line items |

---

### 4.5 Checkout Step One — Customer Information
**URL:** `/playwright/ttacart/checkout-step-one`  
**Title:** TTACart - Checkout: Your Information

**Functional Requirements:**

| ID | Requirement |
|----|-------------|
| CHK1-01 | Page heading must display "Checkout: Your Information" |
| CHK1-02 | Page must display First Name input field |
| CHK1-03 | Page must display Last Name input field |
| CHK1-04 | Page must display Postal Code / Zip Code input field |
| CHK1-05 | "Continue" button must be present |
| CHK1-06 | "Cancel" button must be present — navigates back to cart |
| CHK1-07 | Submitting with empty First Name → validation error displayed |
| CHK1-08 | Submitting with empty Last Name → validation error displayed |
| CHK1-09 | Submitting with empty Postal Code → validation error displayed |
| CHK1-10 | All fields filled → "Continue" navigates to Checkout Step Two |

---

### 4.6 Checkout Step Two — Order Overview
**URL:** `/playwright/ttacart/checkout-step-two`  
**Title:** TTACart - Checkout: Overview

**Functional Requirements:**

| ID | Requirement |
|----|-------------|
| CHK2-01 | Page heading must display "Checkout: Overview" |
| CHK2-02 | Page must list all cart items with name, description, quantity, price |
| CHK2-03 | Page must display Payment Information section |
| CHK2-04 | Page must display Shipping Information section |
| CHK2-05 | Page must display item total (sum of all product prices) |
| CHK2-06 | Page must display tax amount |
| CHK2-07 | Page must display order total (item total + tax) |
| CHK2-08 | "Finish" button must be present — submits order |
| CHK2-09 | "Cancel" button must navigate back to inventory page |
| CHK2-10 | Clicking "Finish" → navigates to Checkout Complete page |

---

### 4.7 Checkout Complete — Order Confirmation
**URL:** `/playwright/ttacart/checkout-complete`  
**Title:** TTACart - Checkout: Complete!

**Functional Requirements:**

| ID | Requirement |
|----|-------------|
| CONF-01 | Page must display "Thank you for your order!" confirmation message |
| CONF-02 | Page must display order dispatch confirmation text |
| CONF-03 | Expected dispatch message: "Your order has been dispatched, and will arrive just as fast as the TTA Express pony can get there!" |
| CONF-04 | "Back Home" button/link must be present |
| CONF-05 | "Back Home" must navigate to inventory page |
| CONF-06 | Cart badge must reset to 0 after order completion |

---

## 5. Navigation Flow

```
[Login Page]
    ↓ (valid credentials)
[Inventory / Products Page]  ←──────────────────────────────┐
    ↓ (click product)           ↑ Back to Products           │
[Product Detail Page]           │                            │
    ↓ (Add to Cart)             │                            │
[Cart Page]                     │                  [Checkout Complete]
    ↓ (Checkout)                │                            ↑
[Checkout Step One]             │                            │
    ↓ (Continue)                │                            │
[Checkout Step Two]  → (Finish) ┘───────────────────────────┘
```

---

## 6. Common / Cross-Page Requirements

| ID | Requirement |
|----|-------------|
| CMN-01 | Header must persist across all authenticated pages |
| CMN-02 | Cart badge count must be consistent across all pages |
| CMN-03 | Cart icon in header must be clickable and navigate to cart from any page |
| CMN-04 | Unauthenticated users accessing any protected page must be redirected to login |
| CMN-05 | App must be responsive (no horizontal scroll on standard desktop widths) |
| CMN-06 | All navigation must work without full page reload (SPA behavior expected) |
| CMN-07 | Burger/hamburger menu (if present) must include: All Items, About, Logout, Reset App State |
| CMN-08 | "Logout" menu item must clear session and redirect to login page |
| CMN-09 | "Reset App State" must clear cart and reset all product button states |

---

## 7. User-Type Specific Behavior

| User Type | Login | Inventory | Cart | Checkout |
|---|---|---|---|---|
| `standard_user` | ✅ Passes | ✅ Normal | ✅ Normal | ✅ Normal |
| `locked_out_user` | ❌ Rejected | N/A | N/A | N/A |
| `problem_user` | ✅ Passes | ⚠️ Issues (images/buttons may be broken) | ⚠️ Issues | ⚠️ Issues |
| `performance_glitch_user` | ✅ Passes (slow) | ✅ Slow load | ✅ Normal | ✅ Normal |
| `error_user` | ✅ Passes | ⚠️ Errors during add/remove | ⚠️ Errors | ⚠️ Errors |
| `visual_user` | ✅ Passes | ⚠️ Visual defects | ✅ Normal | ✅ Normal |

---

## 8. Out of Scope

- Payment gateway integration (no real payment processing)
- User registration / account creation
- Order history / account dashboard
- Product search / filtering by category
- Wishlist / saved items
- Email notifications
- Mobile app

---

## 9. Test Coverage Recommendations

| Area | Priority | Notes |
|------|----------|-------|
| Login — all 6 user types | High | Core gate for all other flows |
| Inventory sort — all 4 options | High | Core product feature |
| Add to Cart / Remove | High | Cart badge accuracy critical |
| Full E2E checkout — standard_user | Critical | Golden path |
| Checkout validation — empty fields | High | CHK1 form validation |
| Locked out user error message | Medium | Negative login path |
| Problem user broken states | Medium | Visual/functional regression |
| Performance glitch user timing | Medium | Timeout / wait strategy tests |
| Cart persistence across pages | High | Badge count consistency |
| Post-order cart reset | Medium | CONF-06 |

---

## 10. Assumptions

1. Product catalog is static — same products always appear for `standard_user`
2. Prices and product names are fixed (no dynamic data from external source)
3. Session is cookie/storage based — clearing storage logs user out
4. App is a Single Page Application (React/Angular/Vue) — DOM updates without full reload
5. All 6 user accounts always exist with password `tta_secret`
