import { Page, Locator } from '@playwright/test';

// VERIFIED: 2026-06-11 via fetch-local-page.js against http://localhost:7000/blinkit-login.html
export class BlinkitLoginPage {
  readonly page: Page;

  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly mobileInput: Locator;
  readonly loginButton: Locator;
  readonly createNewAccountButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly firstNameError: Locator;
  readonly lastNameError: Locator;
  readonly mobileError: Locator;
  readonly toast: Locator;

  constructor(page: Page) {
    this.page = page;

    // VERIFIED: <label for="firstName">First Name</label> → getByLabel matches
    this.firstNameInput = page.getByLabel('First Name');
    // VERIFIED: <label for="lastName">Last Name</label> → getByLabel matches
    this.lastNameInput = page.getByLabel('Last Name');
    // VERIFIED: <label for="mobile">Mobile Number</label>, type=tel, maxlength=10
    this.mobileInput = page.getByLabel('Mobile Number');

    // VERIFIED: <button type="submit" id="loginBtn">Login</button>
    this.loginButton = page.getByRole('button', { name: 'Login' });
    // VERIFIED: <button id="signupBtn">Create New Account</button>
    this.createNewAccountButton = page.getByRole('button', { name: 'Create New Account' });
    // VERIFIED: <a href="#" id="forgotBtn">Forgot Password?</a>
    this.forgotPasswordLink = page.getByRole('link', { name: 'Forgot Password?' });

    // VERIFIED: error spans use display:none by default, display:block on validation failure
    this.firstNameError = page.locator('#firstNameErr');
    this.lastNameError = page.locator('#lastNameErr');
    this.mobileError = page.locator('#mobileErr');
    // VERIFIED: toast uses .show class for visibility (CSS transform-based, not display)
    this.toast = page.locator('#toast');
  }

  async navigate(): Promise<void> {
    await this.page.goto('http://localhost:7000/blinkit-login.html');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async fillFirstName(firstName: string): Promise<void> {
    await this.firstNameInput.fill(firstName);
  }

  async fillLastName(lastName: string): Promise<void> {
    await this.lastNameInput.fill(lastName);
  }

  async fillMobile(mobile: string): Promise<void> {
    await this.mobileInput.fill(mobile);
  }

  async clickLogin(): Promise<void> {
    await this.loginButton.click();
  }

  async login(firstName: string, lastName: string, mobile: string): Promise<void> {
    await this.fillFirstName(firstName);
    await this.fillLastName(lastName);
    await this.fillMobile(mobile);
    await this.clickLogin();
  }

  async clickForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
  }

  async clickCreateNewAccount(): Promise<void> {
    await this.createNewAccountButton.click();
  }

  // Toast uses CSS class 'show' for visibility — check #toast.show selector
  async isToastVisible(): Promise<boolean> {
    return await this.page.locator('#toast.show').isVisible();
  }

  async getToastText(): Promise<string> {
    await this.page.locator('#toast.show').waitFor({ state: 'visible', timeout: 5000 });
    return await this.toast.textContent() || '';
  }

  async isFirstNameErrorVisible(): Promise<boolean> {
    return await this.firstNameError.isVisible();
  }

  async isLastNameErrorVisible(): Promise<boolean> {
    return await this.lastNameError.isVisible();
  }

  async isMobileErrorVisible(): Promise<boolean> {
    return await this.mobileError.isVisible();
  }

  async isLoaded(): Promise<boolean> {
    return (
      await this.firstNameInput.isVisible() &&
      await this.lastNameInput.isVisible() &&
      await this.mobileInput.isVisible() &&
      await this.loginButton.isVisible()
    );
  }
}
