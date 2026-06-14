# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui\registration.spec.ts >> Registration Page Tests (SCRUM-142) >> REG-021: Verify all-uppercase password is rejected [WILL FAIL — BUG-B]
- Location: tests\ui\registration.spec.ts:207:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('#passwordError')
Expected: visible
Received: hidden
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('#passwordError')
    13 × locator resolved to <div class="error-msg" id="passwordError">Password does not meet all requirements</div>
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
  114 |     await registrationPage.emailInput.fill('@only');
  115 |     await registrationPage.submit();
  116 |     await expect(registrationPage.emailError).toBeVisible();
  117 |     await expect(registrationPage.emailError).toHaveText('Enter a valid email address (e.g. name@domain.com)');
  118 |   });
  119 | 
  120 |   test('REG-012: Verify email with no @ symbol is rejected', async ({ registrationPage }) => {
  121 |     // Source: SCRUM-142 — "notanemail" (no @) → FAIL
  122 |     await registrationPage.fillValidForm();
  123 |     await registrationPage.emailInput.fill('notanemail');
  124 |     await registrationPage.submit();
  125 |     await expect(registrationPage.emailError).toBeVisible();
  126 |     await expect(registrationPage.emailError).toHaveText('Enter a valid email address (e.g. name@domain.com)');
  127 |   });
  128 | 
  129 |   // ── Phone Validation ─────────────────────────────────────────────────────────
  130 | 
  131 |   test('REG-013: Verify valid 10-digit mobile passes validation', async ({ registrationPage }) => {
  132 |     // Source: SCRUM-142 — "9876543210" (10 digits) → PASS
  133 |     await registrationPage.fillValidForm();
  134 |     await registrationPage.submit();
  135 |     await expect(registrationPage.phoneError).not.toBeVisible();
  136 |   });
  137 | 
  138 |   test('REG-014: Verify phone under 10 digits is rejected', async ({ registrationPage }) => {
  139 |     // Source: SCRUM-142 — "98765" (5 digits) → FAIL: "Enter a valid 10-digit mobile number"
  140 |     await registrationPage.fillValidForm();
  141 |     await registrationPage.phoneInput.fill('');
  142 |     await registrationPage.phoneInput.pressSequentially('98765');
  143 |     await registrationPage.submit();
  144 |     await expect(registrationPage.phoneError).toBeVisible();
  145 |     await expect(registrationPage.phoneError).toHaveText('Enter a valid 10-digit mobile number');
  146 |   });
  147 | 
  148 |   test('REG-015: Verify letters in phone field are rejected', async ({ registrationPage }) => {
  149 |     // Source: SCRUM-142 — "abcdefghij" → FAIL
  150 |     await registrationPage.fillValidForm();
  151 |     await registrationPage.phoneInput.fill('');
  152 |     await registrationPage.phoneInput.pressSequentially('abcdefghij');
  153 |     await registrationPage.submit();
  154 |     await expect(registrationPage.phoneError).toBeVisible();
  155 |     await expect(registrationPage.phoneError).toHaveText('Enter a valid 10-digit mobile number');
  156 |   });
  157 | 
  158 |   test('REG-016: Verify phone maxlength=10 enforced by browser via pressSequentially', async ({ registrationPage }) => {
  159 |     // Source: SCRUM-142 — DOM maxlength=10 must be enforced
  160 |     // AH-18: pressSequentially() respects maxlength; fill() bypasses it
  161 |     await registrationPage.phoneInput.pressSequentially('12345678901234');
  162 |     const value = await registrationPage.phoneInput.inputValue();
  163 |     expect(value.length).toBeLessThanOrEqual(10);
  164 |   });
  165 | 
  166 |   // ── Date of Birth (Age Gate) ─────────────────────────────────────────────────
  167 | 
  168 |   test('REG-017: Verify DOB making user exactly 18 passes age gate', async ({ registrationPage }) => {
  169 |     // Source: SCRUM-142 — exactly 18 years old → PASS
  170 |     // Date: user born 2008-06-12 is exactly 18 on 2026-06-12
  171 |     await registrationPage.fillValidForm();
  172 |     await registrationPage.dobInput.fill('2008-06-12');
  173 |     await registrationPage.submit();
  174 |     await expect(registrationPage.dobError).not.toBeVisible();
  175 |   });
  176 | 
  177 |   test('REG-018: Verify DOB making user under 18 is rejected', async ({ registrationPage }) => {
  178 |     // Source: SCRUM-142 — 17 yrs 11 months → FAIL: "You must be at least 18 years old to register"
  179 |     // Date: 2008-07-12 = 17 years 11 months on 2026-06-12
  180 |     await registrationPage.fillValidForm();
  181 |     await registrationPage.dobInput.fill('2008-07-12');
  182 |     await registrationPage.submit();
  183 |     await expect(registrationPage.dobError).toBeVisible();
  184 |     await expect(registrationPage.dobError).toHaveText('You must be at least 18 years old to register');
  185 |   });
  186 | 
  187 |   // ── Password Strength Validation ─────────────────────────────────────────────
  188 | 
  189 |   test('REG-019: Verify strong password with all requirements passes', async ({ registrationPage }) => {
  190 |     // Source: SCRUM-142 — "Password1!" → PASS (upper, lower, digit, special, length ≥ 8)
  191 |     await registrationPage.fillValidForm();
  192 |     await registrationPage.submit();
  193 |     await expect(registrationPage.passwordError).not.toBeVisible();
  194 |   });
  195 | 
  196 |   test('REG-020: Verify all-lowercase password is rejected [WILL FAIL — BUG-B]', async ({ registrationPage }) => {
  197 |     // Source: SCRUM-142 — "password" → FAIL (missing uppercase, digit, special char)
  198 |     // BUG-B: validatePassword() only checks length >= 8 — "password" passes
  199 |     await registrationPage.fillValidForm();
  200 |     await registrationPage.passwordInput.fill('password');
  201 |     await registrationPage.confirmPasswordInput.fill('password');
  202 |     await registrationPage.submit();
  203 |     await expect(registrationPage.passwordError).toBeVisible();
  204 |     await expect(registrationPage.passwordError).toHaveText('Password does not meet all requirements');
  205 |   });
  206 | 
  207 |   test('REG-021: Verify all-uppercase password is rejected [WILL FAIL — BUG-B]', async ({ registrationPage }) => {
  208 |     // Source: SCRUM-142 — "PASSWORD1" → FAIL (missing lowercase, special char)
  209 |     // BUG-B: "PASSWORD1" has length >= 8 so passes validatePassword()
  210 |     await registrationPage.fillValidForm();
  211 |     await registrationPage.passwordInput.fill('PASSWORD1');
  212 |     await registrationPage.confirmPasswordInput.fill('PASSWORD1');
  213 |     await registrationPage.submit();
> 214 |     await expect(registrationPage.passwordError).toBeVisible();
      |                                                  ^ Error: expect(locator).toBeVisible() failed
  215 |     await expect(registrationPage.passwordError).toHaveText('Password does not meet all requirements');
  216 |   });
  217 | 
  218 |   test('REG-022: Verify too-short password is rejected', async ({ registrationPage }) => {
  219 |     // Source: SCRUM-142 — "Pass1" → FAIL (length < 8)
  220 |     await registrationPage.fillValidForm();
  221 |     await registrationPage.passwordInput.fill('Pass1');
  222 |     await registrationPage.confirmPasswordInput.fill('Pass1');
  223 |     await registrationPage.submit();
  224 |     await expect(registrationPage.passwordError).toBeVisible();
  225 |     await expect(registrationPage.passwordError).toHaveText('Password does not meet all requirements');
  226 |   });
  227 | 
  228 |   test('REG-023: Verify live password strength indicator updates on each keystroke', async ({ registrationPage }) => {
  229 |     // Source: SCRUM-142 — "Password requirements indicator must visually update live as user types"
  230 |     // Indicator gains .met class when condition satisfied
  231 |     await registrationPage.passwordInput.fill('a');
  232 |     await expect(registrationPage.reqLower).toHaveClass(/met/);
  233 |     await expect(registrationPage.reqUpper).not.toHaveClass(/met/);
  234 | 
  235 |     await registrationPage.passwordInput.fill('Password1!');
  236 |     await expect(registrationPage.reqLength).toHaveClass(/met/);
  237 |     await expect(registrationPage.reqUpper).toHaveClass(/met/);
  238 |     await expect(registrationPage.reqLower).toHaveClass(/met/);
  239 |     await expect(registrationPage.reqDigit).toHaveClass(/met/);
  240 |     await expect(registrationPage.reqSpecial).toHaveClass(/met/);
  241 |   });
  242 | 
  243 |   // ── Confirm Password ─────────────────────────────────────────────────────────
  244 | 
  245 |   test('REG-024: Verify matching passwords pass confirm check', async ({ registrationPage }) => {
  246 |     // Source: SCRUM-142 — matching passwords → PASS
  247 |     await registrationPage.fillValidForm();
  248 |     await registrationPage.submit();
  249 |     await expect(registrationPage.confirmPasswordError).not.toBeVisible();
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
```