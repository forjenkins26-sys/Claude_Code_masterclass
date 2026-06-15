import { Page, Locator } from '@playwright/test';

export class SauceDemoCheckoutCompletePage {
  readonly page: Page;

  // --- Confirmation ---
  // VERIFIED: heading "Thank you for your order!" confirmed in snapshot 2026-06-14
  readonly confirmationHeader: Locator;
  // VERIFIED: text "Your order has been dispatched..." confirmed in snapshot 2026-06-14
  readonly confirmationText: Locator;
  // VERIFIED: img "Pony Express" confirmed in snapshot 2026-06-14
  readonly ponyExpressImage: Locator;

  // --- Actions ---
  // VERIFIED: button "Back Home" confirmed in snapshot 2026-06-14
  readonly backHomeButton: Locator;

  // --- Header ---
  // VERIFIED: button "Open Menu" confirmed in snapshot 2026-06-14
  readonly openMenuButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // --- Confirmation ---
    // VERIFIED: heading role + exact text confirmed in snapshot 2026-06-14
    this.confirmationHeader = page.getByRole('heading', { name: 'Thank you for your order!' });
    // VERIFIED: text confirmed in snapshot — using text locator
    this.confirmationText = page.getByText('Your order has been dispatched');
    // VERIFIED: img role + name "Pony Express" confirmed in snapshot 2026-06-14
    this.ponyExpressImage = page.getByRole('img', { name: 'Pony Express' });

    // --- Actions ---
    // VERIFIED: button "Back Home" confirmed in snapshot 2026-06-14
    this.backHomeButton = page.getByRole('button', { name: 'Back Home' });

    // --- Header ---
    this.openMenuButton = page.getByRole('button', { name: 'Open Menu' });
  }

  async navigate() {
    await this.page.goto('https://www.saucedemo.com/checkout-complete.html');
  }

  async backHome() {
    await this.backHomeButton.click();
  }

  async getConfirmationHeader(): Promise<string> {
    return await this.confirmationHeader.textContent() ?? '';
  }

  async isOrderConfirmed(): Promise<boolean> {
    return await this.confirmationHeader.isVisible();
  }
}
