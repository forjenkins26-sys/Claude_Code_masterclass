import { test, expect } from '../../src/fixtures/test-fixtures';

/**
 * Blinkit — Customer Login  |  Epic SCRUM-603
 *
 * ORACLE: expected values below come from the SCRUM-603 Acceptance Criteria
 * (mirrored as BR-01..BR-14 in knowledge-base/SCRUM/business-rules.md).
 * They are NOT derived from what the UI currently does (AH Rule 19).
 * Where the shipped build contradicts an AC, the test asserts the AC and
 * is EXPECTED TO FAIL until the defect is fixed.
 */

const VALID = { firstName: 'Rahul', lastName: 'Sharma', mobile: '9876543210' };

const ERR = {
  firstName: 'Enter your first name',
  lastName: 'Enter your last name',
  mobile: 'Enter valid 10-digit mobile number',
} as const;

const LOGIN_URL = /blinkit-demo-qa\.vercel\.app\/?$/;

// ─────────────────────────────────────────────────────────────
// Mandatory field validation — BR-01, BR-02, BR-07, BR-13
// ─────────────────────────────────────────────────────────────

test('BL-001 @smoke empty submission shows all three validation errors | BR-07', async ({ loginPage }) => {
  await loginPage.submitEmptyForm();

  await expect(loginPage.firstNameError).toBeVisible();
  await expect(loginPage.lastNameError).toBeVisible();
  await expect(loginPage.mobileError).toBeVisible();

  await expect(loginPage.firstNameError).toHaveText(ERR.firstName);
  await expect(loginPage.lastNameError).toHaveText(ERR.lastName);
  await expect(loginPage.mobileError).toHaveText(ERR.mobile);
});

test('BL-002 missing first name is rejected with exact error text | BR-01', async ({ loginPage }) => {
  await loginPage.fillLoginForm('', VALID.lastName, VALID.mobile);
  await loginPage.loginButton.click();

  await expect(loginPage.firstNameError).toBeVisible();
  await expect(loginPage.firstNameError).toHaveText(ERR.firstName);
  await expect(loginPage.page).toHaveURL(LOGIN_URL);
});

test('BL-003 missing last name is rejected with exact error text | BR-02', async ({ loginPage }) => {
  await loginPage.fillLoginForm(VALID.firstName, '', VALID.mobile);
  await loginPage.loginButton.click();

  await expect(loginPage.lastNameError).toBeVisible();
  await expect(loginPage.lastNameError).toHaveText(ERR.lastName);
});

test('BL-004 whitespace-only names are rejected | BR-01, BR-02', async ({ loginPage }) => {
  await loginPage.fillLoginForm('   ', '   ', VALID.mobile);
  await loginPage.loginButton.click();

  await expect(loginPage.firstNameError).toBeVisible();
  await expect(loginPage.lastNameError).toBeVisible();
});

test('BL-005 invalid field gets a visible error state on the field itself | BR-13', async ({ loginPage }) => {
  await loginPage.submitEmptyForm();

  // BR-13: the error state must be on the FIELD, not only the message text.
  await expect(loginPage.firstNameInput).toHaveClass(/input-error/);
  await expect(loginPage.lastNameInput).toHaveClass(/input-error/);
  await expect(loginPage.mobileInput).toHaveClass(/input-error/);
});

// ─────────────────────────────────────────────────────────────
// Mobile number — BR-03, BR-04, BR-05, BR-06
// ─────────────────────────────────────────────────────────────

test('BL-006 @smoke 9-digit mobile is rejected — AC requires exactly 10 | BR-03, BR-04', async ({ loginPage }) => {
  await loginPage.fillLoginForm(VALID.firstName, VALID.lastName, '987654321'); // 9 digits
  await loginPage.loginButton.click();

  // BR-03/BR-04 — exactly 10 digits. Anything shorter must be rejected.
  await expect(loginPage.mobileError).toBeVisible();
  await expect(loginPage.mobileError).toHaveText(ERR.mobile);

  // Rejected means no session and no navigation.
  expect(await loginPage.getStoredUser()).toBeNull();
  await expect(loginPage.page).toHaveURL(LOGIN_URL);
});

test('BL-007 single-digit mobile is rejected | BR-04', async ({ loginPage }) => {
  await loginPage.fillLoginForm(VALID.firstName, VALID.lastName, '9');
  await loginPage.loginButton.click();

  await expect(loginPage.mobileError).toBeVisible();
  await expect(loginPage.mobileError).toHaveText(ERR.mobile);
});

test('BL-008 mobile field prevents entry beyond 10 digits | BR-05', async ({ loginPage }) => {
  // pressSequentially, not fill() — fill() bypasses the maxlength cap (AH Rule 18).
  await loginPage.mobileInput.pressSequentially('98765432109999');

  const value = await loginPage.getMobileValue();
  expect(value).toHaveLength(10);
  expect(value).toBe('9876543210');
});

test('BL-009 mobile field rejects alphabetic characters | BR-06', async ({ loginPage }) => {
  await loginPage.mobileInput.pressSequentially('98abc76543');

  const value = await loginPage.getMobileValue();
  expect(value).not.toMatch(/[a-z]/i);
});

test('BL-010 mobile field rejects special characters | BR-06', async ({ loginPage }) => {
  await loginPage.mobileInput.pressSequentially('98!@#76543');

  const value = await loginPage.getMobileValue();
  expect(value).toMatch(/^\d*$/);
});

test('BL-011 exactly 10 digits is accepted | BR-03', async ({ loginPage }) => {
  await loginPage.fillLoginForm(VALID.firstName, VALID.lastName, VALID.mobile);
  await loginPage.loginButton.click();

  await expect(loginPage.mobileError).toBeHidden();
});

// ─────────────────────────────────────────────────────────────
// Successful sign-in — BR-08, BR-09, BR-10
// ─────────────────────────────────────────────────────────────

test('BL-012 @smoke successful sign-in shows an OTP toast naming the mobile entered | BR-08', async ({ loginPage }) => {
  await loginPage.login(VALID.firstName, VALID.lastName, VALID.mobile);

  await expect(loginPage.toast).toContainText('OTP');
  await expect(loginPage.toast).toContainText(VALID.mobile);
});

test('BL-013 successful sign-in persists the customer to sessionStorage | BR-09', async ({ loginPage }) => {
  await loginPage.login(VALID.firstName, VALID.lastName, VALID.mobile);

  await expect(loginPage.toast).toContainText('OTP');
  const stored = await loginPage.getStoredUser();

  expect(stored).not.toBeNull();
  expect(stored).toEqual({
    firstName: VALID.firstName,
    lastName: VALID.lastName,
    mobile: VALID.mobile,
  });
});

test('BL-014 @smoke successful sign-in navigates to the product catalogue | BR-10', async ({ loginPage }) => {
  await loginPage.login(VALID.firstName, VALID.lastName, VALID.mobile);

  // Redirect is on a 1500ms setTimeout — wait for it rather than asserting immediately.
  // URL scope: ONE navigation assertion. Catalogue contents belong to a separate Epic
  // (AH Rule 27 / project CLAUDE.md rule 9).
  await expect(loginPage.page).toHaveURL(/blinkit-products\.html/, { timeout: 10_000 });
});

// ─────────────────────────────────────────────────────────────
// Forgot Password — BR-11
// ─────────────────────────────────────────────────────────────

test('BL-015 forgot password confirmation states the link went to the mobile number | BR-11', async ({ loginPage }) => {
  await loginPage.clickForgotPassword();

  await expect(loginPage.toast).toBeVisible();
  // BR-11 — mobile-based auth, so the message must say mobile, not email.
  await expect(loginPage.toast).toContainText('mobile');
  await expect(loginPage.toast).not.toContainText('email');
});

test('BL-016 forgot password does not navigate away or clear the form | BR-11', async ({ loginPage }) => {
  await loginPage.fillLoginForm(VALID.firstName, VALID.lastName, VALID.mobile);
  await loginPage.clickForgotPassword();

  await expect(loginPage.page).toHaveURL(LOGIN_URL);
  await expect(loginPage.firstNameInput).toHaveValue(VALID.firstName);
});

// ─────────────────────────────────────────────────────────────
// Create New Account — BR-12
// ─────────────────────────────────────────────────────────────

test('BL-017 @smoke create new account navigates into the registration flow | BR-12', async ({ loginPage }) => {
  await loginPage.clickSignup();

  // BR-12 — must leave the login page and enter registration.
  await expect(loginPage.page).not.toHaveURL(LOGIN_URL, { timeout: 10_000 });
});

// ─────────────────────────────────────────────────────────────
// Security — BR-14
// ─────────────────────────────────────────────────────────────

const SQLI = `' OR '1'='1`;
const XSS = '<script>alert(1)</script>';

test('BL-018 SQL injection payload in name fields does not bypass validation | BR-14', async ({ loginPage }) => {
  let dialogFired = false;
  loginPage.page.on('dialog', async (d) => { dialogFired = true; await d.dismiss(); });

  await loginPage.fillLoginForm(SQLI, SQLI, '987654321'); // invalid mobile — must still be rejected
  await loginPage.loginButton.click();

  // Payload must not bypass the mobile rule.
  await expect(loginPage.mobileError).toBeVisible();
  expect(await loginPage.getStoredUser()).toBeNull();
  expect(dialogFired).toBe(false);
});

test('BL-019 XSS payload is not executed and is not rendered as markup | BR-14', async ({ loginPage }) => {
  let dialogFired = false;
  loginPage.page.on('dialog', async (d) => { dialogFired = true; await d.dismiss(); });

  await loginPage.fillLoginForm(XSS, XSS, VALID.mobile);
  await loginPage.loginButton.click();

  expect(dialogFired).toBe(false);
  // The payload must not have been injected as a live script element.
  const injected = await loginPage.page.evaluate(
    () => document.querySelectorAll('body script:not([src])').length
  );
  expect(injected).toBeLessThanOrEqual(1); // only the page's own inline script
});

test('BL-020 XSS payload in the mobile field is stripped to digits | BR-06, BR-14', async ({ loginPage }) => {
  await loginPage.mobileInput.pressSequentially(XSS);

  const value = await loginPage.getMobileValue();
  expect(value).toMatch(/^\d*$/);
});
