import { test, expect } from '../../src/fixtures/test-fixtures';

// Epic: SCRUM-142 — Registration Page Testing — Form Validation & Field Constraints
// URL:  http://localhost:7000/registration-demo.html
// All assertions sourced from SCRUM-142 acceptance criteria (AH-19)
// Known intentional bugs: BUG-A (email), BUG-B (password) — tests WILL FAIL until fixed

test.describe('Registration Page Tests (SCRUM-142)', () => {

  test.beforeEach(async ({ registrationPage }) => {
    await registrationPage.goto();
    await registrationPage.submitButton.waitFor({ state: 'visible' });
  });

  // ── Valid Scenarios ──────────────────────────────────────────────────────────

  test('REG-001: Verify successful registration with all valid inputs', async ({ registrationPage }) => {
    // Source: SCRUM-142 — "All fields valid + terms checked → Toast: ✅ Account created successfully! Welcome aboard."
    // AFP-15: validate actual outcome — toast visible + exact text + has .show class
    await registrationPage.fillValidForm();
    await registrationPage.submit();
    await expect(registrationPage.toast).toHaveClass(/show/);
    await expect(registrationPage.toast).toHaveText('✅ Account created successfully! Welcome aboard.');
  });

  // ── Name Field Validation ────────────────────────────────────────────────────

  test('REG-002: Verify empty first name shows error', async ({ registrationPage }) => {
    // Source: SCRUM-142 — empty → FAIL: "Enter your first name (letters only, min 2 chars)"
    await registrationPage.fillValidForm();
    await registrationPage.firstNameInput.fill('');
    await registrationPage.submit();
    await expect(registrationPage.firstNameError).toBeVisible();
    await expect(registrationPage.firstNameError).toHaveText('Enter your first name (letters only, min 2 chars)');
  });

  test('REG-003: Verify single-char first name shows error', async ({ registrationPage }) => {
    // Source: SCRUM-142 — "R" (1 char) → FAIL: same error message
    await registrationPage.fillValidForm();
    await registrationPage.firstNameInput.fill('R');
    await registrationPage.submit();
    await expect(registrationPage.firstNameError).toBeVisible();
    await expect(registrationPage.firstNameError).toHaveText('Enter your first name (letters only, min 2 chars)');
  });

  test('REG-004: Verify digits-only first name shows error', async ({ registrationPage }) => {
    // Source: SCRUM-142 — "123" (digits) → FAIL
    await registrationPage.fillValidForm();
    await registrationPage.firstNameInput.fill('123');
    await registrationPage.submit();
    await expect(registrationPage.firstNameError).toBeVisible();
    await expect(registrationPage.firstNameError).toHaveText('Enter your first name (letters only, min 2 chars)');
  });

  test('REG-005: Verify empty last name shows error', async ({ registrationPage }) => {
    // Source: SCRUM-142 — empty last name → FAIL: "Enter your last name (letters only, min 2 chars)"
    await registrationPage.fillValidForm();
    await registrationPage.lastNameInput.fill('');
    await registrationPage.submit();
    await expect(registrationPage.lastNameError).toBeVisible();
    await expect(registrationPage.lastNameError).toHaveText('Enter your last name (letters only, min 2 chars)');
  });

  test('REG-006: Verify single-char last name shows error', async ({ registrationPage }) => {
    // Source: SCRUM-142 — "S" (1 char) → FAIL
    await registrationPage.fillValidForm();
    await registrationPage.lastNameInput.fill('S');
    await registrationPage.submit();
    await expect(registrationPage.lastNameError).toBeVisible();
    await expect(registrationPage.lastNameError).toHaveText('Enter your last name (letters only, min 2 chars)');
  });

  test('REG-007: Verify valid name format passes validation', async ({ registrationPage }) => {
    // Source: SCRUM-142 — "Rahul" → PASS
    await registrationPage.fillValidForm();
    await registrationPage.submit();
    await expect(registrationPage.firstNameError).not.toBeVisible();
    await expect(registrationPage.lastNameError).not.toBeVisible();
  });

  // ── Email Validation ─────────────────────────────────────────────────────────

  test('REG-008: Verify valid email format passes validation', async ({ registrationPage }) => {
    // Source: SCRUM-142 — "rahul@example.com" → PASS
    await registrationPage.fillValidForm();
    await registrationPage.submit();
    await expect(registrationPage.emailError).not.toBeVisible();
  });

  test('REG-009: Verify email with no domain is rejected [WILL FAIL — BUG-A]', async ({ registrationPage }) => {
    // Source: SCRUM-142 — "rahul@" → FAIL: "Enter a valid email address (e.g. name@domain.com)"
    // BUG-A: validateEmail() only checks '@' presence — accepts "rahul@" as valid
    await registrationPage.fillValidForm();
    await registrationPage.emailInput.fill('rahul@');
    await registrationPage.submit();
    await expect(registrationPage.emailError).toBeVisible();
    await expect(registrationPage.emailError).toHaveText('Enter a valid email address (e.g. name@domain.com)');
  });

  test('REG-010: Verify email with no TLD is rejected [WILL FAIL — BUG-A]', async ({ registrationPage }) => {
    // Source: SCRUM-142 — "rahul@nodot" → FAIL
    // BUG-A: accepts "rahul@nodot" because @ is present
    await registrationPage.fillValidForm();
    await registrationPage.emailInput.fill('rahul@nodot');
    await registrationPage.submit();
    await expect(registrationPage.emailError).toBeVisible();
    await expect(registrationPage.emailError).toHaveText('Enter a valid email address (e.g. name@domain.com)');
  });

  test('REG-011: Verify @ symbol only is rejected [WILL FAIL — BUG-A]', async ({ registrationPage }) => {
    // Source: SCRUM-142 — "@only" → FAIL
    // BUG-A: "@only" contains @ so passes validateEmail()
    await registrationPage.fillValidForm();
    await registrationPage.emailInput.fill('@only');
    await registrationPage.submit();
    await expect(registrationPage.emailError).toBeVisible();
    await expect(registrationPage.emailError).toHaveText('Enter a valid email address (e.g. name@domain.com)');
  });

  test('REG-012: Verify email with no @ symbol is rejected', async ({ registrationPage }) => {
    // Source: SCRUM-142 — "notanemail" (no @) → FAIL
    await registrationPage.fillValidForm();
    await registrationPage.emailInput.fill('notanemail');
    await registrationPage.submit();
    await expect(registrationPage.emailError).toBeVisible();
    await expect(registrationPage.emailError).toHaveText('Enter a valid email address (e.g. name@domain.com)');
  });

  // ── Phone Validation ─────────────────────────────────────────────────────────

  test('REG-013: Verify valid 10-digit mobile passes validation', async ({ registrationPage }) => {
    // Source: SCRUM-142 — "9876543210" (10 digits) → PASS
    await registrationPage.fillValidForm();
    await registrationPage.submit();
    await expect(registrationPage.phoneError).not.toBeVisible();
  });

  test('REG-014: Verify phone under 10 digits is rejected', async ({ registrationPage }) => {
    // Source: SCRUM-142 — "98765" (5 digits) → FAIL: "Enter a valid 10-digit mobile number"
    await registrationPage.fillValidForm();
    await registrationPage.phoneInput.fill('');
    await registrationPage.phoneInput.pressSequentially('98765');
    await registrationPage.submit();
    await expect(registrationPage.phoneError).toBeVisible();
    await expect(registrationPage.phoneError).toHaveText('Enter a valid 10-digit mobile number');
  });

  test('REG-015: Verify letters in phone field are rejected', async ({ registrationPage }) => {
    // Source: SCRUM-142 — "abcdefghij" → FAIL
    await registrationPage.fillValidForm();
    await registrationPage.phoneInput.fill('');
    await registrationPage.phoneInput.pressSequentially('abcdefghij');
    await registrationPage.submit();
    await expect(registrationPage.phoneError).toBeVisible();
    await expect(registrationPage.phoneError).toHaveText('Enter a valid 10-digit mobile number');
  });

  test('REG-016: Verify phone maxlength=10 enforced by browser via pressSequentially', async ({ registrationPage }) => {
    // Source: SCRUM-142 — DOM maxlength=10 must be enforced
    // AH-18: pressSequentially() respects maxlength; fill() bypasses it
    await registrationPage.phoneInput.pressSequentially('12345678901234');
    const value = await registrationPage.phoneInput.inputValue();
    expect(value.length).toBeLessThanOrEqual(10);
  });

  // ── Date of Birth (Age Gate) ─────────────────────────────────────────────────

  test('REG-017: Verify DOB making user exactly 18 passes age gate', async ({ registrationPage }) => {
    // Source: SCRUM-142 — exactly 18 years old → PASS
    // Date: user born 2008-06-12 is exactly 18 on 2026-06-12
    await registrationPage.fillValidForm();
    await registrationPage.dobInput.fill('2008-06-12');
    await registrationPage.submit();
    await expect(registrationPage.dobError).not.toBeVisible();
  });

  test('REG-018: Verify DOB making user under 18 is rejected', async ({ registrationPage }) => {
    // Source: SCRUM-142 — 17 yrs 11 months → FAIL: "You must be at least 18 years old to register"
    // Date: 2008-07-12 = 17 years 11 months on 2026-06-12
    await registrationPage.fillValidForm();
    await registrationPage.dobInput.fill('2008-07-12');
    await registrationPage.submit();
    await expect(registrationPage.dobError).toBeVisible();
    await expect(registrationPage.dobError).toHaveText('You must be at least 18 years old to register');
  });

  // ── Password Strength Validation ─────────────────────────────────────────────

  test('REG-019: Verify strong password with all requirements passes', async ({ registrationPage }) => {
    // Source: SCRUM-142 — "Password1!" → PASS (upper, lower, digit, special, length ≥ 8)
    await registrationPage.fillValidForm();
    await registrationPage.submit();
    await expect(registrationPage.passwordError).not.toBeVisible();
  });

  test('REG-020: Verify all-lowercase password is rejected [WILL FAIL — BUG-B]', async ({ registrationPage }) => {
    // Source: SCRUM-142 — "password" → FAIL (missing uppercase, digit, special char)
    // BUG-B: validatePassword() only checks length >= 8 — "password" passes
    await registrationPage.fillValidForm();
    await registrationPage.passwordInput.fill('password');
    await registrationPage.confirmPasswordInput.fill('password');
    await registrationPage.submit();
    await expect(registrationPage.passwordError).toBeVisible();
    await expect(registrationPage.passwordError).toHaveText('Password does not meet all requirements');
  });

  test('REG-021: Verify all-uppercase password is rejected [WILL FAIL — BUG-B]', async ({ registrationPage }) => {
    // Source: SCRUM-142 — "PASSWORD1" → FAIL (missing lowercase, special char)
    // BUG-B: "PASSWORD1" has length >= 8 so passes validatePassword()
    await registrationPage.fillValidForm();
    await registrationPage.passwordInput.fill('PASSWORD1');
    await registrationPage.confirmPasswordInput.fill('PASSWORD1');
    await registrationPage.submit();
    await expect(registrationPage.passwordError).toBeVisible();
    await expect(registrationPage.passwordError).toHaveText('Password does not meet all requirements');
  });

  test('REG-022: Verify too-short password is rejected', async ({ registrationPage }) => {
    // Source: SCRUM-142 — "Pass1" → FAIL (length < 8)
    await registrationPage.fillValidForm();
    await registrationPage.passwordInput.fill('Pass1');
    await registrationPage.confirmPasswordInput.fill('Pass1');
    await registrationPage.submit();
    await expect(registrationPage.passwordError).toBeVisible();
    await expect(registrationPage.passwordError).toHaveText('Password does not meet all requirements');
  });

  test('REG-023: Verify live password strength indicator updates on each keystroke', async ({ registrationPage }) => {
    // Source: SCRUM-142 — "Password requirements indicator must visually update live as user types"
    // Indicator gains .met class when condition satisfied
    await registrationPage.passwordInput.fill('a');
    await expect(registrationPage.reqLower).toHaveClass(/met/);
    await expect(registrationPage.reqUpper).not.toHaveClass(/met/);

    await registrationPage.passwordInput.fill('Password1!');
    await expect(registrationPage.reqLength).toHaveClass(/met/);
    await expect(registrationPage.reqUpper).toHaveClass(/met/);
    await expect(registrationPage.reqLower).toHaveClass(/met/);
    await expect(registrationPage.reqDigit).toHaveClass(/met/);
    await expect(registrationPage.reqSpecial).toHaveClass(/met/);
  });

  // ── Confirm Password ─────────────────────────────────────────────────────────

  test('REG-024: Verify matching passwords pass confirm check', async ({ registrationPage }) => {
    // Source: SCRUM-142 — matching passwords → PASS
    await registrationPage.fillValidForm();
    await registrationPage.submit();
    await expect(registrationPage.confirmPasswordError).not.toBeVisible();
  });

  test('REG-025: Verify non-matching confirm password shows error', async ({ registrationPage }) => {
    // Source: SCRUM-142 — non-matching → FAIL: "Passwords do not match"
    await registrationPage.fillValidForm();
    await registrationPage.confirmPasswordInput.fill('DifferentPass1!');
    await registrationPage.submit();
    await expect(registrationPage.confirmPasswordError).toBeVisible();
    await expect(registrationPage.confirmPasswordError).toHaveText('Passwords do not match');
  });

  // ── Terms of Service ─────────────────────────────────────────────────────────

  test('REG-026: Verify unchecked Terms of Service blocks submission', async ({ registrationPage }) => {
    // Source: SCRUM-142 — unchecked → FAIL: "You must accept the Terms of Service to continue"
    // AFP-15: also confirm form was NOT submitted (success toast must NOT appear)
    await registrationPage.fillValidForm();
    await registrationPage.termsCheckbox.uncheck();
    await registrationPage.submit();
    await expect(registrationPage.termsError).toBeVisible();
    await expect(registrationPage.termsError).toHaveText('You must accept the Terms of Service to continue');
    await expect(registrationPage.toast).not.toHaveClass(/show/);
  });

  test('REG-027: Verify checked Terms of Service allows submission', async ({ registrationPage }) => {
    // Source: SCRUM-142 — checked → PASS
    await registrationPage.fillValidForm();
    await registrationPage.submit();
    await expect(registrationPage.termsError).not.toBeVisible();
  });

  // ── Edge Cases ───────────────────────────────────────────────────────────────

  test('REG-028: Verify all fields empty shows all validation errors simultaneously', async ({ registrationPage }) => {
    // Source: SCRUM-142 — all empty submit → all errors shown at once
    await registrationPage.submit();
    await expect(registrationPage.firstNameError).toBeVisible();
    await expect(registrationPage.firstNameError).toHaveText('Enter your first name (letters only, min 2 chars)');
    await expect(registrationPage.lastNameError).toBeVisible();
    await expect(registrationPage.lastNameError).toHaveText('Enter your last name (letters only, min 2 chars)');
    await expect(registrationPage.emailError).toBeVisible();
    await expect(registrationPage.emailError).toHaveText('Enter a valid email address (e.g. name@domain.com)');
    await expect(registrationPage.phoneError).toBeVisible();
    await expect(registrationPage.phoneError).toHaveText('Enter a valid 10-digit mobile number');
    await expect(registrationPage.dobError).toBeVisible();
    await expect(registrationPage.dobError).toHaveText('You must be at least 18 years old to register');
    await expect(registrationPage.passwordError).toBeVisible();
    await expect(registrationPage.passwordError).toHaveText('Password does not meet all requirements');
    await expect(registrationPage.termsError).toBeVisible();
    await expect(registrationPage.termsError).toHaveText('You must accept the Terms of Service to continue');
  });

  test('REG-029: Verify whitespace-only first name is rejected', async ({ registrationPage }) => {
    // Source: SCRUM-142 — whitespace → FAIL (validateName trims before regex)
    await registrationPage.fillValidForm();
    await registrationPage.firstNameInput.fill('   ');
    await registrationPage.submit();
    await expect(registrationPage.firstNameError).toBeVisible();
    await expect(registrationPage.firstNameError).toHaveText('Enter your first name (letters only, min 2 chars)');
  });

  test('REG-030: Verify special characters in name field are rejected', async ({ registrationPage }) => {
    // Source: SCRUM-142 — /^[A-Za-z]{2,}$/ — special chars fail regex
    await registrationPage.fillValidForm();
    await registrationPage.firstNameInput.fill('R@hul');
    await registrationPage.submit();
    await expect(registrationPage.firstNameError).toBeVisible();
    await expect(registrationPage.firstNameError).toHaveText('Enter your first name (letters only, min 2 chars)');
  });

  // ── Security Tests ───────────────────────────────────────────────────────────

  test('REG-031: Verify SQL injection in name fields is sanitized', async ({ registrationPage }) => {
    // Source: SCRUM-142 security scope — page must not crash or execute injected SQL
    // AFP-15: assert actual outcome — name invalid → error shown, no alert fired, page stays
    const alertDialogs: string[] = [];
    registrationPage.page.on('dialog', dialog => { alertDialogs.push(dialog.message()); dialog.dismiss(); });

    await registrationPage.fillValidForm();
    await registrationPage.firstNameInput.fill("'; DROP TABLE users;--");
    await registrationPage.submit();

    expect(alertDialogs.length).toBe(0);
    await expect(registrationPage.page).toHaveURL(/localhost:7000/);
    // SQL string fails name regex → error shown (not submitted)
    await expect(registrationPage.firstNameError).toBeVisible();
    await expect(registrationPage.toast).not.toHaveClass(/show/);
  });

  test('REG-032: Verify XSS in email field does not execute', async ({ registrationPage }) => {
    // Source: SCRUM-142 security scope
    // AFP-15: assert actual outcome — no alert + email error shown (XSS string fails validation)
    const alertDialogs: string[] = [];
    registrationPage.page.on('dialog', dialog => { alertDialogs.push(dialog.message()); dialog.dismiss(); });

    await registrationPage.fillValidForm();
    await registrationPage.emailInput.fill('<script>alert("XSS")</script>@example.com');
    await registrationPage.submit();

    expect(alertDialogs.length).toBe(0);
    await expect(registrationPage.emailError).toBeVisible();
    await expect(registrationPage.toast).not.toHaveClass(/show/);
  });

  test('REG-033: Verify XSS in name fields does not execute', async ({ registrationPage }) => {
    // Source: SCRUM-142 security scope
    // AFP-15: assert actual outcome — no alert + name error shown + form not submitted
    const alertDialogs: string[] = [];
    registrationPage.page.on('dialog', dialog => { alertDialogs.push(dialog.message()); dialog.dismiss(); });

    await registrationPage.fillValidForm();
    await registrationPage.firstNameInput.fill('<script>alert("XSS")</script>');
    await registrationPage.submit();

    expect(alertDialogs.length).toBe(0);
    await expect(registrationPage.firstNameError).toBeVisible();
    await expect(registrationPage.toast).not.toHaveClass(/show/);
  });

});
