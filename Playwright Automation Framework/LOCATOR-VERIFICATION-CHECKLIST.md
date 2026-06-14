# Locator Verification Checklist

Before running tests against Facebook, verify ALL locators using this checklist.

## How to Verify Locators

### Step 1: Run Codegen

```bash
npm run codegen
```

This opens Facebook with Playwright Inspector. Use it to:
- Inspect actual DOM elements
- Generate verified locators
- Test selectors in real-time

### Step 2: Verify Each Page Object

## LoginPage.ts Verification

Navigate to: `https://www.facebook.com`

- [ ] **emailInput**
  - Current: `#email`
  - Actual locator: ________________
  - Verified: ☐ Yes ☐ No

- [ ] **passwordInput**
  - Current: `#pass`
  - Actual locator: ________________
  - Verified: ☐ Yes ☐ No

- [ ] **loginButton**
  - Current: `getByRole('button', { name: 'Log In' })`
  - Actual text: ________________
  - Actual locator: ________________
  - Verified: ☐ Yes ☐ No

- [ ] **forgotPasswordLink**
  - Current: `getByRole('link', { name: 'Forgotten password?' })`
  - Actual text: ________________
  - Actual locator: ________________
  - Verified: ☐ Yes ☐ No

- [ ] **createAccountLink** (renamed from createAccountButton — element is `<a>` link, not a button)
  - Current: `page.locator('a[href*="/reg/"]').first()`
  - Actual text: ________________
  - Actual locator: ________________
  - Verified: ☐ Yes ☐ No

- [ ] **errorMessage**
  - Current: `[role="alert"]`
  - Actual locator: ________________
  - Verified: ☐ Yes ☐ No

- [ ] **languageSelector**
  - Current: `select#js_1`
  - Actual locator: ________________
  - Verified: ☐ Yes ☐ No

## RegistrationPage.ts Verification

Trigger registration modal by clicking "Create new account"

- [ ] **firstNameInput**
  - Current: `input[name="firstname"]`
  - Actual attribute: ________________
  - Verified: ☐ Yes ☐ No

- [ ] **lastNameInput**
  - Current: `input[name="lastname"]`
  - Actual attribute: ________________
  - Verified: ☐ Yes ☐ No

- [ ] **emailOrPhoneInput**
  - Current: `input[name="reg_email__"]`
  - Actual attribute: ________________
  - Verified: ☐ Yes ☐ No

- [ ] **newPasswordInput**
  - Current: `input[name="reg_passwd__"]`
  - Actual attribute: ________________
  - Verified: ☐ Yes ☐ No

- [ ] **dayDropdown**
  - Current: `select[name="birthday_day"]`
  - Actual attribute: ________________
  - Verified: ☐ Yes ☐ No

- [ ] **monthDropdown**
  - Current: `select[name="birthday_month"]`
  - Actual attribute: ________________
  - Verified: ☐ Yes ☐ No

- [ ] **yearDropdown**
  - Current: `select[name="birthday_year"]`
  - Actual attribute: ________________
  - Verified: ☐ Yes ☐ No

- [ ] **genderMale**
  - Current: `input[name="sex"][value="2"]`
  - Actual value: ________________
  - Verified: ☐ Yes ☐ No

- [ ] **genderFemale**
  - Current: `input[name="sex"][value="1"]`
  - Actual value: ________________
  - Verified: ☐ Yes ☐ No

- [ ] **genderCustom**
  - Current: `input[name="sex"][value="-1"]`
  - Actual value: ________________
  - Exists: ☐ Yes ☐ No
  - Verified: ☐ Yes ☐ No

- [ ] **submitButton** (renamed from signUpButton — actual button text is "Submit")
  - Current: `getByRole('button', { name: 'Submit' })`
  - Actual text: Submit
  - Actual locator: ________________
  - Verified: ☐ Yes ☐ No

## ForgotPasswordPage.ts Verification

Navigate to: `https://www.facebook.com/recover/initiate` (verify URL first)

- [ ] **Recovery page URL**
  - Current: `/recover/initiate`
  - Actual URL: ________________
  - Verified: ☐ Yes ☐ No

- [ ] **emailOrPhoneInput**
  - Current: `input[name="email"]`
  - Actual attribute: ________________
  - Verified: ☐ Yes ☐ No

- [ ] **searchButton**
  - Current: `getByRole('button', { name: 'Search' })`
  - Actual text: ________________
  - Actual locator: ________________
  - Verified: ☐ Yes ☐ No

- [ ] **cancelButton**
  - Current: `getByRole('button', { name: 'Cancel' })`
  - Actual text: ________________
  - Actual locator: ________________
  - Verified: ☐ Yes ☐ No

- [ ] **successMessage**
  - Current: `text=Please check your email`
  - Actual text: ________________
  - Actual locator: ________________
  - Verified: ☐ Yes ☐ No

## Expected Behavior Verification

Test actual Facebook behavior and document:

### Login Flow

- [ ] **Valid login behavior**
  - What happens: ________________
  - Redirect URL pattern: ________________

- [ ] **Invalid email format**
  - Error message: ________________
  - Error locator: ________________

- [ ] **Empty email**
  - Error message: ________________
  - Error locator: ________________

- [ ] **Empty password**
  - Error message: ________________
  - Error locator: ________________

- [ ] **Wrong credentials**
  - Error message: ________________
  - Error locator: ________________

### Navigation

- [ ] **Forgot password link**
  - Navigates to: ________________

- [ ] **Create account button**
  - Opens modal: ☐ Yes ☐ No
  - Navigates to page: ☐ Yes ☐ No
  - URL/behavior: ________________

## Update Tracking

After verification, update page objects and mark:

- [ ] LoginPage.ts updated
- [ ] RegistrationPage.ts updated
- [ ] ForgotPasswordPage.ts updated
- [ ] All TODO comments removed
- [ ] All Inference warnings removed
- [ ] Tests run successfully
- [ ] README updated with verification completion date

**Verification completed by:** ________________

**Date:** ________________

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
