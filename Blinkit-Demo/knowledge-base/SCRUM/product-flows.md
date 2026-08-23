# Product Flows — Blinkit Customer Login

> Real navigation flows. Grounds happy-path / E2E test cases in actual movement, not guesses.

## Successful login
1. Open `https://blinkit-demo-qa.vercel.app/` → login page, heading "Welcome back"
2. Fill First Name, Last Name, 10-digit Mobile → no errors shown
3. Click **Login** (`#loginBtn`, submits `#loginForm`) → JS validation runs, `preventDefault` stops a real form GET
4. Toast `✅ OTP sent to +91 <mobile>` appears in `div#toast` → auto-hides after 3000ms
5. `sessionStorage['blinkitUser']` set to `{firstName, lastName, mobile}`
6. After a **1500ms** `setTimeout` → `window.location.href = 'blinkit-products.html'`

**Timing note:** the redirect is delayed. A URL assertion must wait — an immediate check reads the login URL and fails spuriously.
**Source:** SCRUM-603 AC 8-10 + observed 2026-08-23 live DOM

## Failed login (validation)
1. Open login page
2. Click **Login** with one or more fields invalid/empty
3. Each failing field: `.input-error` class added, `#<field>Err` flips `display:none` → `block`
4. URL unchanged, no sessionStorage write, no navigation
5. Errors reset at the start of the next submit

**Source:** SCRUM-603 AC 1-7, 13 + observed 2026-08-23 live DOM

## Forgot Password
1. Open login page
2. Click **Forgot Password?** (`#forgotBtn`, `href="#"`) → `preventDefault`
3. Toast appears in the shared `div#toast`
4. No navigation, no session change, form state untouched

**Source:** SCRUM-603 AC 11 + observed 2026-08-23 live DOM

## Create New Account
1. Open login page
2. Click **Create New Account** (`#signupBtn`)
3. AC-12 (BR-12) expects navigation into the registration flow

**Observed 2026-08-23:** no handler is attached and the URL does not change. The button is `type="submit"` inside `#loginForm`, so a click runs the **login** validation instead. Expected behaviour is owned by BR-12; execution decides the verdict.
**Source:** SCRUM-603 AC 12 + observed 2026-08-23 live DOM
