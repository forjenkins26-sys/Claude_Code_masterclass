import { test, expect } from '../../src/fixtures/test-fixtures';

/**
 * Blinkit Login Page Test Suite
 *
 * ANTI-HALLUCINATION COMPLIANCE (ANTI-HALLUCINATION-RULES.md):
 * - All locators VERIFIED via fetch-local-page.js (2026-06-11)
 * - All behaviors VERIFIED from blinkit-login.html source (2026-06-11)
 * - No assumptions about behavior — every assertion traceable to verified source
 *
 * VERIFIED FACTS:
 * - Inputs: First Name, Last Name, Mobile Number (maxlength=10, type=tel)
 * - Buttons: Login (submit), Create New Account (SHOULD navigate to registration page)
 * - Links: Forgot Password? (shows toast on click)
 * - Validation: trim() check on names, /^\d{10}$/ regex on mobile
 * - Success: toast "#toast.show" with "✅ OTP sent to +91 [mobile]"
 * - Forgot password: toast "📱 Password reset link sent to your mobile"
 *
 * Source: http://localhost:7000/blinkit-login.html (served via Python http.server 7000)
 */
test.describe('Blinkit Login Page Tests', () => {

  test.beforeEach(async ({ blinkitLoginPage }) => {
    await blinkitLoginPage.navigate();
  });

  // ─── VALID SCENARIOS ─────────────────────────────────────────────────────────

  test.describe('Valid Scenarios @smoke', () => {

    test('BL-001: Verify page loads and all elements are visible', async ({ blinkitLoginPage }) => {
      // VERIFIED: All elements confirmed in live DOM via fetch-local-page.js (2026-06-11)
      await expect(blinkitLoginPage.firstNameInput).toBeVisible();
      await expect(blinkitLoginPage.lastNameInput).toBeVisible();
      await expect(blinkitLoginPage.mobileInput).toBeVisible();
      await expect(blinkitLoginPage.loginButton).toBeVisible();
      await expect(blinkitLoginPage.forgotPasswordLink).toBeVisible();
      await expect(blinkitLoginPage.createNewAccountButton).toBeVisible();
    });

    test('BL-002: Verify valid login shows OTP toast', async ({ blinkitLoginPage }) => {
      // VERIFIED: JS validates !trim() for names, /^\d{10}$/ for mobile → showToast on success
      // AUTO-FIX Rule 15: getToastText() waits for #toast.show — validates actual outcome, not mechanics
      await blinkitLoginPage.login('Rahul', 'Sharma', '9876543210');

      const toastText = await blinkitLoginPage.getToastText();
      expect(toastText).toBe('✅ OTP sent to +91 9876543210');
    });

    test('BL-003: Verify Forgot Password click shows toast', async ({ blinkitLoginPage }) => {
      // VERIFIED: forgotBtn listener → showToast('📱 Password reset link sent to your mobile')
      // AUTO-FIX Rule 15: getToastText() waits for #toast.show — validates actual outcome
      await blinkitLoginPage.clickForgotPassword();

      const toastText = await blinkitLoginPage.getToastText();
      expect(toastText).toBe('📱 Password reset link sent to your mobile');
    });

    test('BL-004: Verify mobile input accepts digits only', async ({ blinkitLoginPage }) => {
      // VERIFIED: input event listener strips non-digits via replace(/\D/g, '')
      // fill() triggers input events in Playwright — stripping fires
      await blinkitLoginPage.fillMobile('abc9876543210xyz');

      const value = await blinkitLoginPage.mobileInput.inputValue();
      expect(value).toMatch(/^\d+$/);
    });

  });

  // ─── NEGATIVE SCENARIOS ──────────────────────────────────────────────────────

  test.describe('Negative Scenarios @regression', () => {

    test('BL-005: Verify empty First Name shows error', async ({ blinkitLoginPage }) => {
      // VERIFIED: JS checks !firstName.value.trim() → shows #firstNameErr (display:block), adds .input-error
      await blinkitLoginPage.fillLastName('Sharma');
      await blinkitLoginPage.fillMobile('9876543210');
      await blinkitLoginPage.clickLogin();

      await expect(blinkitLoginPage.firstNameError).toBeVisible();
      await expect(blinkitLoginPage.lastNameError).not.toBeVisible();
      await expect(blinkitLoginPage.mobileError).not.toBeVisible();
    });

    test('BL-006: Verify empty Last Name shows error', async ({ blinkitLoginPage }) => {
      // VERIFIED: JS checks !lastName.value.trim() → shows #lastNameErr (display:block)
      await blinkitLoginPage.fillFirstName('Rahul');
      await blinkitLoginPage.fillMobile('9876543210');
      await blinkitLoginPage.clickLogin();

      await expect(blinkitLoginPage.firstNameError).not.toBeVisible();
      await expect(blinkitLoginPage.lastNameError).toBeVisible();
      await expect(blinkitLoginPage.mobileError).not.toBeVisible();
    });

    test('BL-007: Verify empty Mobile shows error', async ({ blinkitLoginPage }) => {
      // VERIFIED: JS checks !/^\d{10}$/.test(mobile.value.trim()) → shows #mobileErr (display:block)
      await blinkitLoginPage.fillFirstName('Rahul');
      await blinkitLoginPage.fillLastName('Sharma');
      await blinkitLoginPage.clickLogin();

      await expect(blinkitLoginPage.firstNameError).not.toBeVisible();
      await expect(blinkitLoginPage.lastNameError).not.toBeVisible();
      await expect(blinkitLoginPage.mobileError).toBeVisible();
    });

    test('BL-008: Verify all empty fields show all errors', async ({ blinkitLoginPage }) => {
      // VERIFIED: JS validates all 3 fields independently — all errors shown simultaneously
      await blinkitLoginPage.clickLogin();

      await expect(blinkitLoginPage.firstNameError).toBeVisible();
      await expect(blinkitLoginPage.lastNameError).toBeVisible();
      await expect(blinkitLoginPage.mobileError).toBeVisible();
    });

    test('BL-009: Verify mobile with fewer than 10 digits shows error', async ({ blinkitLoginPage }) => {
      // VERIFIED: /^\d{10}$/ requires exactly 10 digits — 9 digits fails regex
      await blinkitLoginPage.fillFirstName('Rahul');
      await blinkitLoginPage.fillLastName('Sharma');
      await blinkitLoginPage.fillMobile('987654321');
      await blinkitLoginPage.clickLogin();

      await expect(blinkitLoginPage.mobileError).toBeVisible();
    });

    test('BL-010: Verify Create New Account button navigates to registration page', async ({ blinkitLoginPage }) => {
      // Expected: clicking "Create New Account" navigates away from login page to a registration/account creation page
      // This test validates EXPECTED behavior — will fail until navigation is implemented (correctly catches defect)
      await blinkitLoginPage.clickCreateNewAccount();

      // Assert URL changes — button SHOULD navigate away from login page
      // Failure here = defect: button click has no handler and does not navigate
      await expect(blinkitLoginPage.page).not.toHaveURL(
        'http://localhost:7000/blinkit-login.html',
        { timeout: 5000 }
      );
    });

  });

  // ─── EDGE CASES ──────────────────────────────────────────────────────────────

  test.describe('Edge Cases @regression', () => {

    test('BL-011: Verify mobile input enforces maxlength of 10', async ({ blinkitLoginPage }) => {
      // VERIFIED: <input maxlength="10"> on mobile field
      // ANTI-HALLUCINATION Rule 2: fill() bypasses HTML maxlength — use pressSequentially() to simulate real keystrokes
      // pressSequentially() respects maxlength attribute as a real browser would
      await blinkitLoginPage.mobileInput.pressSequentially('12345678901234');

      const value = await blinkitLoginPage.mobileInput.inputValue();
      expect(value.length).toBeLessThanOrEqual(10);
    });

    test('BL-012: Verify exactly 10-digit mobile shows OTP toast', async ({ blinkitLoginPage }) => {
      // VERIFIED: /^\d{10}$/ passes with exactly 10 digits
      await blinkitLoginPage.login('Rahul', 'Sharma', '1234567890');

      const toastText = await blinkitLoginPage.getToastText();
      expect(toastText).toBe('✅ OTP sent to +91 1234567890');
    });

    test('BL-013: Verify whitespace-only First Name shows error', async ({ blinkitLoginPage }) => {
      // VERIFIED: JS uses !firstName.value.trim() — "   ".trim() === "" → falsy → error shown
      await blinkitLoginPage.fillFirstName('   ');
      await blinkitLoginPage.fillLastName('Sharma');
      await blinkitLoginPage.fillMobile('9876543210');
      await blinkitLoginPage.clickLogin();

      await expect(blinkitLoginPage.firstNameError).toBeVisible();
    });

    test('BL-014: Verify double-click Login button shows OTP toast', async ({ blinkitLoginPage }) => {
      // VERIFIED: form submit listener is idempotent — re-validates and calls showToast each time
      // AUTO-FIX Rule 15: validate actual outcome (toast text) not mechanics
      await blinkitLoginPage.fillFirstName('Rahul');
      await blinkitLoginPage.fillLastName('Sharma');
      await blinkitLoginPage.fillMobile('9876543210');

      await blinkitLoginPage.loginButton.dblclick();

      const toastText = await blinkitLoginPage.getToastText();
      expect(toastText).toBe('✅ OTP sent to +91 9876543210');
    });

    test('BL-015: Verify special characters in name fields pass validation', async ({ blinkitLoginPage }) => {
      // VERIFIED: JS only checks !value.trim() — no format restriction on name fields
      // Special chars are truthy → validation passes → OTP toast shown
      // AUTO-FIX Rule 15: validate actual outcome (toast text)
      await blinkitLoginPage.login("O'Brian", 'García', '9876543210');

      const toastText = await blinkitLoginPage.getToastText();
      expect(toastText).toBe("✅ OTP sent to +91 9876543210");
    });

    test('BL-016: Verify 100+ character name passes validation', async ({ blinkitLoginPage }) => {
      // VERIFIED: No maxLength on firstName/lastName inputs — JS only checks !trim()
      // AUTO-FIX Rule 15: validate actual outcome (toast text)
      const longName = 'A'.repeat(110);
      await blinkitLoginPage.login(longName, longName, '9876543210');

      const toastText = await blinkitLoginPage.getToastText();
      expect(toastText).toBe('✅ OTP sent to +91 9876543210');
    });

    test('BL-019: Verify 9-digit mobile boundary shows error', async ({ blinkitLoginPage }) => {
      // VERIFIED: /^\d{10}$/ — 9 digits fails (boundary: exactly 10 required)
      await blinkitLoginPage.fillFirstName('Rahul');
      await blinkitLoginPage.fillLastName('Sharma');
      await blinkitLoginPage.fillMobile('123456789');
      await blinkitLoginPage.clickLogin();

      await expect(blinkitLoginPage.mobileError).toBeVisible();
    });

  });

  // ─── SECURITY TESTS ──────────────────────────────────────────────────────────

  test.describe('Security Tests @regression', () => {

    test('BL-017: Verify SQL injection in name fields does not crash page', async ({ blinkitLoginPage }) => {
      // VERIFIED: JS only checks !trim() — SQL string is truthy → validation passes, toast shown
      // AUTO-FIX Rule 15: validate actual outcome (toast appears = page handled input correctly)
      await blinkitLoginPage.login("' OR '1'='1", "'; DROP TABLE users;--", '9876543210');

      const toastText = await blinkitLoginPage.getToastText();
      expect(toastText).toBe('✅ OTP sent to +91 9876543210');
    });

    test('BL-018: Verify XSS attempt in name fields does not execute script', async ({ blinkitLoginPage }) => {
      // VERIFIED: toast uses textContent (not innerHTML) → script tags rendered as text, not executed
      const alertDialogs: string[] = [];
      blinkitLoginPage.page.on('dialog', async (dialog) => {
        alertDialogs.push(dialog.message());
        await dialog.dismiss();
      });

      await blinkitLoginPage.login('<script>alert("xss")</script>', 'Sharma', '9876543210');
      await blinkitLoginPage.page.waitForTimeout(500);

      // VERIFIED: No alert dialog triggered — textContent escapes HTML
      expect(alertDialogs.length).toBe(0);
    });

  });

});
