# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui\registration.spec.ts >> Registration Page Tests (SCRUM-142) >> REG-032: Verify XSS in email field does not execute
- Location: tests\ui\registration.spec.ts:339:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('#emailError')
Expected: visible
Received: hidden
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('#emailError')
    13 × locator resolved to <div id="emailError" class="error-msg">Enter a valid email address (e.g. name@domain.com)</div>
       - unexpected value "hidden"

```

```yaml
- heading "DemoApp" [level=1]
- paragraph: Create your account
- text: First Name *
- textbox "First Name *":
  - /placeholder: Rahul
- text: Last Name *
- textbox "Last Name *":
  - /placeholder: Sharma
- text: Email Address *
- textbox "Email Address *":
  - /placeholder: rahul.sharma@example.com
- text: Mobile Number *
- textbox "Mobile Number *":
  - /placeholder: "9876543210"
- text: Date of Birth *
- textbox "Date of Birth *"
- text: Password *
- textbox "Password *":
  - /placeholder: Create a strong password
- button "Toggle password visibility": 👁
- paragraph: "Password must contain:"
- text: At least 8 characters One uppercase letter (A-Z) One lowercase letter (a-z) One number (0-9) One special character (!@#$%^&*) Confirm Password *
- textbox "Confirm Password *":
  - /placeholder: Re-enter your password
- button "Toggle confirm password visibility": 👁
- checkbox "I agree to the Terms of Service and Privacy Policy"
- text: I agree to the
- link "Terms of Service":
  - /url: "#"
- text: and
- link "Privacy Policy":
  - /url: "#"
- button "Create Account"
- text: or Already have an account?
- link "Sign in":
  - /url: "#"
- text: ✅ Account created successfully! Welcome aboard.
```

# Test source

```ts
  250 |   });
  251 | 
  252 |   test('REG-025: Verify non-matching confirm password shows error', async ({ registrationPage }) => {
  253 |     // Source: SCRUM-142 — non-matching → FAIL: "Passwords do not match"
  254 |     await registrationPage.fillValidForm();
  255 |     await registrationPage.confirmPasswordInput.fill('DifferentPass1!');
  256 |     await registrationPage.submit();
  257 |     await expect(registrationPage.confirmPasswordError).toBeVisible();
  258 |     await expect(registrationPage.confirmPasswordError).toHaveText('Passwords do not match');
  259 |   });
  260 | 
  261 |   // ── Terms of Service ─────────────────────────────────────────────────────────
  262 | 
  263 |   test('REG-026: Verify unchecked Terms of Service blocks submission', async ({ registrationPage }) => {
  264 |     // Source: SCRUM-142 — unchecked → FAIL: "You must accept the Terms of Service to continue"
  265 |     // AFP-15: also confirm form was NOT submitted (success toast must NOT appear)
  266 |     await registrationPage.fillValidForm();
  267 |     await registrationPage.termsCheckbox.uncheck();
  268 |     await registrationPage.submit();
  269 |     await expect(registrationPage.termsError).toBeVisible();
  270 |     await expect(registrationPage.termsError).toHaveText('You must accept the Terms of Service to continue');
  271 |     await expect(registrationPage.toast).not.toHaveClass(/show/);
  272 |   });
  273 | 
  274 |   test('REG-027: Verify checked Terms of Service allows submission', async ({ registrationPage }) => {
  275 |     // Source: SCRUM-142 — checked → PASS
  276 |     await registrationPage.fillValidForm();
  277 |     await registrationPage.submit();
  278 |     await expect(registrationPage.termsError).not.toBeVisible();
  279 |   });
  280 | 
  281 |   // ── Edge Cases ───────────────────────────────────────────────────────────────
  282 | 
  283 |   test('REG-028: Verify all fields empty shows all validation errors simultaneously', async ({ registrationPage }) => {
  284 |     // Source: SCRUM-142 — all empty submit → all errors shown at once
  285 |     await registrationPage.submit();
  286 |     await expect(registrationPage.firstNameError).toBeVisible();
  287 |     await expect(registrationPage.firstNameError).toHaveText('Enter your first name (letters only, min 2 chars)');
  288 |     await expect(registrationPage.lastNameError).toBeVisible();
  289 |     await expect(registrationPage.lastNameError).toHaveText('Enter your last name (letters only, min 2 chars)');
  290 |     await expect(registrationPage.emailError).toBeVisible();
  291 |     await expect(registrationPage.emailError).toHaveText('Enter a valid email address (e.g. name@domain.com)');
  292 |     await expect(registrationPage.phoneError).toBeVisible();
  293 |     await expect(registrationPage.phoneError).toHaveText('Enter a valid 10-digit mobile number');
  294 |     await expect(registrationPage.dobError).toBeVisible();
  295 |     await expect(registrationPage.dobError).toHaveText('You must be at least 18 years old to register');
  296 |     await expect(registrationPage.passwordError).toBeVisible();
  297 |     await expect(registrationPage.passwordError).toHaveText('Password does not meet all requirements');
  298 |     await expect(registrationPage.termsError).toBeVisible();
  299 |     await expect(registrationPage.termsError).toHaveText('You must accept the Terms of Service to continue');
  300 |   });
  301 | 
  302 |   test('REG-029: Verify whitespace-only first name is rejected', async ({ registrationPage }) => {
  303 |     // Source: SCRUM-142 — whitespace → FAIL (validateName trims before regex)
  304 |     await registrationPage.fillValidForm();
  305 |     await registrationPage.firstNameInput.fill('   ');
  306 |     await registrationPage.submit();
  307 |     await expect(registrationPage.firstNameError).toBeVisible();
  308 |     await expect(registrationPage.firstNameError).toHaveText('Enter your first name (letters only, min 2 chars)');
  309 |   });
  310 | 
  311 |   test('REG-030: Verify special characters in name field are rejected', async ({ registrationPage }) => {
  312 |     // Source: SCRUM-142 — /^[A-Za-z]{2,}$/ — special chars fail regex
  313 |     await registrationPage.fillValidForm();
  314 |     await registrationPage.firstNameInput.fill('R@hul');
  315 |     await registrationPage.submit();
  316 |     await expect(registrationPage.firstNameError).toBeVisible();
  317 |     await expect(registrationPage.firstNameError).toHaveText('Enter your first name (letters only, min 2 chars)');
  318 |   });
  319 | 
  320 |   // ── Security Tests ───────────────────────────────────────────────────────────
  321 | 
  322 |   test('REG-031: Verify SQL injection in name fields is sanitized', async ({ registrationPage }) => {
  323 |     // Source: SCRUM-142 security scope — page must not crash or execute injected SQL
  324 |     // AFP-15: assert actual outcome — name invalid → error shown, no alert fired, page stays
  325 |     const alertDialogs: string[] = [];
  326 |     registrationPage.page.on('dialog', dialog => { alertDialogs.push(dialog.message()); dialog.dismiss(); });
  327 | 
  328 |     await registrationPage.fillValidForm();
  329 |     await registrationPage.firstNameInput.fill("'; DROP TABLE users;--");
  330 |     await registrationPage.submit();
  331 | 
  332 |     expect(alertDialogs.length).toBe(0);
  333 |     await expect(registrationPage.page).toHaveURL(/localhost:7000/);
  334 |     // SQL string fails name regex → error shown (not submitted)
  335 |     await expect(registrationPage.firstNameError).toBeVisible();
  336 |     await expect(registrationPage.toast).not.toHaveClass(/show/);
  337 |   });
  338 | 
  339 |   test('REG-032: Verify XSS in email field does not execute', async ({ registrationPage }) => {
  340 |     // Source: SCRUM-142 security scope
  341 |     // AFP-15: assert actual outcome — no alert + email error shown (XSS string fails validation)
  342 |     const alertDialogs: string[] = [];
  343 |     registrationPage.page.on('dialog', dialog => { alertDialogs.push(dialog.message()); dialog.dismiss(); });
  344 | 
  345 |     await registrationPage.fillValidForm();
  346 |     await registrationPage.emailInput.fill('<script>alert("XSS")</script>@example.com');
  347 |     await registrationPage.submit();
  348 | 
  349 |     expect(alertDialogs.length).toBe(0);
> 350 |     await expect(registrationPage.emailError).toBeVisible();
      |                                               ^ Error: expect(locator).toBeVisible() failed
  351 |     await expect(registrationPage.toast).not.toHaveClass(/show/);
  352 |   });
  353 | 
  354 |   test('REG-033: Verify XSS in name fields does not execute', async ({ registrationPage }) => {
  355 |     // Source: SCRUM-142 security scope
  356 |     // AFP-15: assert actual outcome — no alert + name error shown + form not submitted
  357 |     const alertDialogs: string[] = [];
  358 |     registrationPage.page.on('dialog', dialog => { alertDialogs.push(dialog.message()); dialog.dismiss(); });
  359 | 
  360 |     await registrationPage.fillValidForm();
  361 |     await registrationPage.firstNameInput.fill('<script>alert("XSS")</script>');
  362 |     await registrationPage.submit();
  363 | 
  364 |     expect(alertDialogs.length).toBe(0);
  365 |     await expect(registrationPage.firstNameError).toBeVisible();
  366 |     await expect(registrationPage.toast).not.toHaveClass(/show/);
  367 |   });
  368 | 
  369 | });
  370 | 
```