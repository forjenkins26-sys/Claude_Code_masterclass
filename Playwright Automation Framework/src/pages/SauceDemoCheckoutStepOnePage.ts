import { Page, Locator } from '@playwright/test';

export class SauceDemoCheckoutStepOnePage {
  readonly page: Page;

  // --- Form Fields ---
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly postalCodeInput: Locator;

  // --- Buttons ---
  readonly cancelButton: Locator;
  readonly continueButton: Locator;

  // --- Error ---
  readonly errorMessage: Locator;
  readonly errorCloseButton: Locator;

  // --- Header ---
  readonly openMenuButton: Locator;
  readonly cartBadge: Locator;

  constructor(page: Page) {
    this.page = page;

    // --- Form Fields ---
    this.firstNameInput  = page.locator('[data-test="firstName"]');
    this.lastNameInput   = page.locator('[data-test="lastName"]');
    this.postalCodeInput = page.locator('[data-test="postalCode"]');

    // --- Buttons ---
    this.cancelButton   = page.locator('[data-test="cancel"]');
    this.continueButton = page.locator('[data-test="continue"]');

    // --- Error ---
    this.errorMessage    = page.locator('[data-test="error"]');
    this.errorCloseButton = page.locator('[data-test="error"] button');

    // --- Header ---
    this.openMenuButton = page.getByRole('button', { name: 'Open Menu' });
    this.cartBadge      = page.locator('[data-test="shopping-cart-badge"]');
  }

  async navigate() {
    await this.page.goto('https://www.saucedemo.com/checkout-step-one.html');
  }

  async fillShippingInfo(firstName: string, lastName: string, postalCode: string) {
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    await this.postalCodeInput.fill(postalCode);
  }

  async continue() {
    await this.continueButton.click();
  }

  async cancel() {
    await this.cancelButton.click();
  }

  async getErrorMessage(): Promise<string> {
    await this.errorMessage.waitFor({ state: 'visible' });
    return await this.errorMessage.textContent() ?? '';
  }

  async isErrorVisible(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }
}
