import { Page, Locator } from '@playwright/test';

export class SauceDemoLoginPage {
  readonly page: Page;

  // --- Form Fields ---
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;

  // --- Buttons ---
  readonly loginButton: Locator;

  // --- Error ---
  readonly errorMessage: Locator;
  readonly errorCloseButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // --- Form Fields ---
    this.usernameInput = page.locator('[data-test="username"]');
    this.passwordInput = page.locator('[data-test="password"]');

    // --- Buttons ---
    this.loginButton = page.locator('[data-test="login-button"]');

    // --- Error ---
    // Error state not triggered during DOM capture — locator inferred from role
    // VERIFICATION REQUIRED: verify selector in headed mode after triggering error
    this.errorMessage    = page.locator('[data-test="error"]');
    this.errorCloseButton = page.locator('[data-test="error"] button');
  }

  async navigate() {
    await this.page.goto('https://www.saucedemo.com/');
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async getErrorMessage(): Promise<string> {
    await this.errorMessage.waitFor({ state: 'visible' });
    return await this.errorMessage.textContent() ?? '';
  }

  async isErrorVisible(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }
}
