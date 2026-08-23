// All locators VERIFIED: headed mode 2026-08-23 — 12/12 pass
import { Page, Locator } from '@playwright/test';

/**
 * Blinkit — Customer Login page.
 * Source: https://blinkit-demo-qa.vercel.app/  (explored 2026-08-23, live DOM)
 *
 * All locators below were read from the live DOM, not inferred.
 * IDs used here are hand-authored and stable (#firstName, #toast, …) — not generated.
 */
export class BlinkitLoginPage {
  readonly page: Page;

  // --- Form Fields ---
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  /** #mobile — type=tel, maxlength=10. An 'input' handler strips non-digits live. */
  readonly mobileInput: Locator;

  // --- Buttons ---
  readonly loginButton: Locator;
  /**
   * ⚠️ NO EVENT HANDLER — verified in live DOM: #signupBtn is referenced 0 times
   * in page script and clicking it does not change the URL. It is type="submit"
   * inside #loginForm, so a click runs the LOGIN validation instead of signup.
   * Expected behaviour is owned by the Epic AC, not by this comment.
   */
  readonly signupButton: Locator;

  // --- Links ---
  readonly forgotPasswordLink: Locator;

  // --- Validation Messages (hidden until submit; display:none -> block) ---
  readonly firstNameError: Locator;
  readonly lastNameError: Locator;
  readonly mobileError: Locator;

  // --- Toast ---
  /** div#toast — no ARIA role, so absent from the accessibility snapshot. Visible only while .show is set (3000ms). */
  readonly toast: Locator;

  // --- Static Content ---
  readonly welcomeHeading: Locator;
  readonly countryCodePrefix: Locator;

  constructor(page: Page) {
    this.page = page;

    // --- Form Fields ---
    this.firstNameInput = page.getByRole('textbox', { name: 'First Name' });
    this.lastNameInput = page.getByRole('textbox', { name: 'Last Name' });
    this.mobileInput = page.getByRole('textbox', { name: 'Mobile Number' });

    // --- Buttons ---
    this.loginButton = page.getByRole('button', { name: 'Login' });
    this.signupButton = page.getByRole('button', { name: 'Create New Account' });

    // --- Links ---
    this.forgotPasswordLink = page.getByRole('link', { name: 'Forgot Password?' });

    // --- Validation Messages ---
    this.firstNameError = page.locator('#firstNameErr');
    this.lastNameError = page.locator('#lastNameErr');
    this.mobileError = page.locator('#mobileErr');

    // --- Toast ---
    this.toast = page.locator('#toast');

    // --- Static Content ---
    this.welcomeHeading = page.getByRole('heading', { name: 'Welcome back' });
    this.countryCodePrefix = page.getByText('+91', { exact: true });
  }

  // --- Navigation ---
  async navigate() {
    await this.page.goto('https://blinkit-demo-qa.vercel.app/');
  }

  // --- Actions ---
  async fillLoginForm(firstName: string, lastName: string, mobile: string) {
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    await this.mobileInput.fill(mobile);
  }

  async login(firstName: string, lastName: string, mobile: string) {
    await this.fillLoginForm(firstName, lastName, mobile);
    await this.loginButton.click();
  }

  async submitEmptyForm() {
    await this.loginButton.click();
  }

  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
  }

  async clickSignup() {
    await this.signupButton.click();
  }

  // --- Reads ---
  /** Toast text. Auto-hides ~3000ms after it appears — read it promptly. */
  async getToastText(): Promise<string> {
    return (await this.toast.textContent())?.trim() ?? '';
  }

  /** Value actually held by #mobile — the input handler may have stripped characters. */
  async getMobileValue(): Promise<string> {
    return this.mobileInput.inputValue();
  }

  /** Session record written on successful login. Null when login did not succeed. */
  async getStoredUser(): Promise<{ firstName: string; lastName: string; mobile: string } | null> {
    const raw = await this.page.evaluate(() => sessionStorage.getItem('blinkitUser'));
    return raw ? JSON.parse(raw) : null;
  }
}
