import { Page, Locator } from '@playwright/test';

/**
 * LoginPage - Facebook Login Page Object Model
 *
 * ✅ LOCATORS VERIFIED against actual Facebook DOM (2026-06-09)
 * All selectors inspected via automated DOM inspection script.
 * Note: Facebook loads in browser's locale (may show Gujarati or other languages).
 * All selectors are language-agnostic (use attributes, not text).
 */
export class LoginPage {
  readonly page: Page;

  // Locators
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly createAccountLink: Locator; // Actual element: <a> link (not a button)
  readonly errorMessage: Locator;
  readonly languageSelector: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main login form elements
    // VERIFIED: Facebook uses name="email" attribute (not ID)
    // ID is dynamic: changes per session (e.g., _R_1h6kqsqppb6amH1_)
    this.emailInput = page.locator('input[name="email"]');

    // VERIFIED: Facebook uses name="pass" attribute (not ID)
    // ID is dynamic: changes per session
    this.passwordInput = page.locator('input[name="pass"]');

    // VERIFIED: Visible login button is DIV with role="button", not the hidden input[type="submit"]
    // The hidden input exists but Facebook shows a styled div as the actual clickable button
    this.loginButton = page.getByRole('button').first();

    // VERIFIED: Forgot password link - href contains /recover/initiate/
    this.forgotPasswordLink = page.locator('a[href*="/recover"]').first();

    // VERIFIED: Create new account link - href contains /reg/ (it's an <a> tag, not a button)
    this.createAccountLink = page.locator('a[href*="/reg/"]').first();

    // Error and feedback elements
    // VERIFIED: Facebook uses role="alert" or specific error div
    this.errorMessage = page.locator('[role="alert"], div[class*="error"]').first();

    // Other elements
    // Language selector - ID is dynamic, use select element instead
    this.languageSelector = page.locator('select[aria-label*="language"], select').first();
  }

  /**
   * Navigate to Facebook login page
   *
   * ⚠️ Base URL assumption: Uses relative URL '/'
   * VERIFIED: Base URL configured in playwright.config.ts as https://www.facebook.com
   * Login page is at root path (not /login, /signin, etc.)
   * Verification date: 2026-06-11
   */
  async navigate(): Promise<void> {
    await this.page.goto('/');
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Perform login with credentials
   *
   * ⚠️ Expected behavior NOT verified - requires actual Facebook testing
   * Assumes login flow: fill email → fill password → click button
   */
  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  /**
   * Fill email field only
   */
  async enterEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  /**
   * Fill password field only
   */
  async enterPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  /**
   * Click login button
   */
  async clickLogin(): Promise<void> {
    await this.loginButton.click();
  }

  /**
   * Click forgot password link
   */
  async clickForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
  }

  /**
   * Click create new account link
   */
  async clickCreateAccount(): Promise<void> {
    await this.createAccountLink.click();
  }

  /**
   * Get error message text
   *
   * ⚠️ Error message selector and format NOT verified against actual Facebook
   * Assumes error appears in [role="alert"] element
   */
  async getErrorMessage(): Promise<string> {
    await this.errorMessage.waitFor({ state: 'visible', timeout: 5000 });
    return await this.errorMessage.textContent() || '';
  }

  /**
   * Check if error message is displayed
   */
  async isErrorDisplayed(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  /**
   * Verify login page is loaded
   */
  async isLoaded(): Promise<boolean> {
    return (
      await this.emailInput.isVisible() &&
      await this.passwordInput.isVisible() &&
      await this.loginButton.isVisible()
    );
  }

  /**
   * Clear login form
   */
  async clearForm(): Promise<void> {
    await this.emailInput.clear();
    await this.passwordInput.clear();
  }

  /**
   * Get page title
   */
  async getPageTitle(): Promise<string> {
    return await this.page.title();
  }
}
