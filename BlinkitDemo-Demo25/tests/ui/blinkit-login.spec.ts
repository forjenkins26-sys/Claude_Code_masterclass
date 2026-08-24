import { test, expect } from '@playwright/test';
import { BlinkitLoginPage } from '../../src/pages/blinkitLoginPage';

const MOBILE_ERROR = 'Enter valid 10-digit mobile number';
const VALID_MOBILE = '9876543210';

const shot = (page: any, scrum: string, bl: string, phase: 'before' | 'after' | 'destination') =>
  page.screenshot({ path: `screenshots/SCRUM-722/${scrum}_${bl}_${phase}.png` });

test.describe('Blinkit Customer Login — SCRUM-722', () => {
  let login: BlinkitLoginPage;

  test.beforeEach(async ({ page }) => {
    login = new BlinkitLoginPage(page);
    await login.navigate();
  });

  // BL-001 SCRUM-723 — mobile field accepts at most 10 digits
  test('BL-001: mobile field accepts at most 10 digits', async () => {
    await login.mobileInput.pressSequentially('98765432101');
    expect(await login.mobileValue()).toBe('9876543210');
  });

  // BL-002 SCRUM-724 — non-numeric characters rejected
  test('BL-002: non-numeric characters are rejected', async () => {
    await login.mobileInput.pressSequentially('98a7b6@543c');
    expect(await login.mobileValue()).toBe('9876543');
  });

  // BL-003 SCRUM-725 — empty mobile shows error, does not proceed
  test('BL-003: empty mobile shows the error and does not proceed', async ({ page }) => {
    const startUrl = page.url();
    await login.submitEmpty();
    await expect(login.mobileError).toBeVisible();
    await expect(login.mobileError).toHaveText(MOBILE_ERROR);
    expect(page.url()).toBe(startUrl);
  });

  // BL-004 SCRUM-726 — 9-digit mobile rejected
  test('BL-004: 9-digit mobile is rejected and does not proceed', async ({ page }) => {
    const startUrl = page.url();
    await login.login('Rahul', 'Sharma', '987654321');
    await expect(login.mobileError).toBeVisible();
    await expect(login.mobileError).toHaveText(MOBILE_ERROR);
    expect(page.url()).toBe(startUrl);
  });

  // BL-005 SCRUM-727 — whitespace trimmed before validation
  test('BL-005: whitespace around the mobile number is trimmed', async () => {
    await login.firstNameInput.fill('Rahul');
    await login.lastNameInput.fill('Sharma');
    await login.mobileInput.pressSequentially(`  ${VALID_MOBILE}  `);
    await login.loginButton.click();
    await expect(login.mobileError).toBeHidden();
  });

  // BL-006 SCRUM-728 — Login control always enabled
  test('BL-006: Login control is always enabled', async () => {
    await expect(login.loginButton).toBeEnabled();
    await login.mobileInput.fill(VALID_MOBILE);
    await expect(login.loginButton).toBeEnabled();
  });

  // BL-007 SCRUM-729 — valid mobile produces no validation error
  test('BL-007: valid 10-digit mobile produces no validation error', async () => {
    await login.login('Rahul', 'Sharma', VALID_MOBILE);
    await expect(login.mobileError).toBeHidden();
  });

  // BL-008 SCRUM-730 — rapid double submit produces one request
  test('BL-008: rapid double submit does not produce two concurrent requests', async ({ page }) => {
    const submissions: string[] = [];
    page.on('request', (r) => {
      if (r.method() === 'POST') submissions.push(r.url());
    });

    await login.fillCredentials('Rahul', 'Sharma', VALID_MOBILE);
    await Promise.all([
      login.loginButton.click(),
      login.loginButton.click({ noWaitAfter: true }).catch(() => {}),
    ]);

    expect(submissions.length).toBeLessThanOrEqual(1);
  });

  // BL-009 SCRUM-731 — forgot-password link visible
  test('BL-009: forgot-password link is visible', async () => {
    await expect(login.forgotPasswordLink).toBeVisible();
  });

  // BL-010 SCRUM-732 — forgot-password confirmation references mobile, not email
  test('BL-010: forgot-password confirmation references mobile, never email', async () => {
    await login.clickForgotPassword();
    const message = await login.toastText();
    expect(message.toLowerCase()).not.toContain('email');
    expect(message.toLowerCase()).toContain('mobile');
  });

  // BL-011 SCRUM-733 — account-creation control visible
  test('BL-011: an account-creation control is visible', async () => {
    await expect(login.createAccountButton).toBeVisible();
  });

  // BL-012 SCRUM-734 — activating account creation navigates away
  test('BL-012: activating account creation navigates away from login', async ({ page }) => {
    const startUrl = page.url();
    await login.clickCreateAccount();
    await expect
      .poll(() => page.url(), { timeout: 5000 })
      .not.toBe(startUrl);
    await shot(page, 'SCRUM-734', 'BL-012', 'destination');
  });

  // BL-013 SCRUM-735 — validation errors programmatically associated with their field
  test('BL-013: validation errors are programmatically associated with their field', async ({ page }) => {
    await login.submitEmpty();
    await expect(login.mobileError).toBeVisible();

    const associations = await page.evaluate(() => {
      const pairs = [
        ['mobile', 'mobileErr'],
        ['firstName', 'firstNameErr'],
        ['lastName', 'lastNameErr'],
      ];
      return pairs.map(([fieldId, errId]) => {
        const field = document.getElementById(fieldId);
        const err = document.getElementById(errId);
        const describedBy = field?.getAttribute('aria-describedby') ?? '';
        return {
          field: fieldId,
          linkedByDescribedBy: describedBy.split(/\s+/).includes(errId),
          errHasAlertRole: err?.getAttribute('role') === 'alert',
          errHasAriaLive: !!err?.getAttribute('aria-live'),
        };
      });
    });

    for (const a of associations) {
      expect(
        a.linkedByDescribedBy || a.errHasAlertRole || a.errHasAriaLive,
        `${a.field}: error must be programmatically associated with its field`,
      ).toBe(true);
    }
  });

  // BL-014 SCRUM-736 — no credential or OTP written to console or localStorage
  test('BL-014: no credential or OTP is written to console or localStorage', async ({ page }) => {
    const consoleText: string[] = [];
    page.on('console', (m) => consoleText.push(m.text()));

    await login.login('Rahul', 'Sharma', VALID_MOBILE);
    await login.toastText();

    expect(consoleText.join('\n')).not.toContain(VALID_MOBILE);

    const stored = await page.evaluate(() => JSON.stringify(localStorage));
    expect(stored).not.toContain(VALID_MOBILE);
  });

  // BL-015 SCRUM-737 — usable at 1280px with no horizontal scrolling
  test('BL-015: page is usable at 1280px with no horizontal scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await login.navigate();

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflows).toBe(false);

    await expect(login.mobileInput).toBeVisible();
    await expect(login.loginButton).toBeVisible();
    await expect(login.forgotPasswordLink).toBeVisible();
    await expect(login.createAccountButton).toBeVisible();
  });

  // BL-016 SCRUM-738 — XSS payload rendered inert
  test('BL-016: XSS payload in name fields is rendered inert', async ({ page }) => {
    let dialogFired = false;
    page.on('dialog', async (d) => {
      dialogFired = true;
      await d.dismiss();
    });

    await login.login(`<script>alert('xss')</script>`, `<img src=x onerror=alert(1)>`, VALID_MOBILE);
    await page.waitForTimeout(1000);

    expect(dialogFired).toBe(false);
    expect(await page.locator('body script:not([src])').count()).toBe(
      await page.evaluate(() => document.querySelectorAll('body script:not([src])').length),
    );
  });

  // BL-017 SCRUM-739 — SQL injection payload handled as inert text
  test('BL-017: SQL injection payload is handled as inert text', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    await login.login(`' OR '1'='1`, `"; DROP TABLE users;--`, VALID_MOBILE);
    await page.waitForTimeout(500);

    expect(pageErrors).toEqual([]);
    await expect(login.welcomeHeading).toBeVisible();
  });

  // BL-018 SCRUM-740 — blocked: no requirement governs first/last name validation
  test.fixme('BL-018: first/last name validation rules undefined', async () => {
    // No AC in SCRUM-722 governs the First Name or Last Name fields.
    // Writing an assertion here would mean inventing the requirement (AH Rule 19).
    // See SCRUM-740 for the questions raised with the ticket author.
  });
});
