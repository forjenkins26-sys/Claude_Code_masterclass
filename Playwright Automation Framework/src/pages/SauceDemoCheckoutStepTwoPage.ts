import { Page, Locator } from '@playwright/test';

export class SauceDemoCheckoutStepTwoPage {
  readonly page: Page;

  // --- Order Summary ---
  // VERIFIED: product link "Sauce Labs Backpack" confirmed in overview snapshot 2026-06-14
  readonly itemNames: Locator;
  // VERIFIED: price "$29.99" visible as text in snapshot 2026-06-14
  readonly itemPrices: Locator;
  // VERIFIED: qty "1" visible in snapshot 2026-06-14
  readonly itemQuantities: Locator;
  // VERIFIED: "SauceCard #31337" text confirmed in snapshot 2026-06-14
  readonly paymentInfoValue: Locator;
  // VERIFIED: "Free Pony Express Delivery!" text confirmed in snapshot 2026-06-14
  readonly shippingInfoValue: Locator;
  // VERIFIED: "Item total: $29.99" text confirmed in snapshot 2026-06-14
  readonly subtotalLabel: Locator;
  // VERIFIED: "Tax: $2.40" text confirmed in snapshot 2026-06-14
  readonly taxLabel: Locator;
  // VERIFIED: "Total: $32.39" text confirmed in snapshot 2026-06-14
  readonly totalLabel: Locator;

  // --- Buttons ---
  // VERIFIED: button "Go back Cancel" confirmed in snapshot 2026-06-14
  readonly cancelButton: Locator;
  // VERIFIED: button "Finish" confirmed in snapshot 2026-06-14
  readonly finishButton: Locator;

  // --- Header ---
  // VERIFIED: button "Open Menu" confirmed in snapshot 2026-06-14
  readonly openMenuButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // --- Order Summary ---
    // Using class selectors — data-test attrs unverified from ARIA snapshot
    // VERIFICATION REQUIRED: confirm class names via headed mode
    this.itemNames      = page.locator('.inventory_item_name');
    this.itemPrices     = page.locator('.inventory_item_price');
    this.itemQuantities = page.locator('.cart_quantity');
    this.paymentInfoValue  = page.locator('.summary_value_label').first();
    this.shippingInfoValue = page.locator('.summary_value_label').nth(1);
    this.subtotalLabel  = page.locator('.summary_subtotal_label');
    this.taxLabel       = page.locator('.summary_tax_label');
    this.totalLabel     = page.locator('.summary_total_label');

    // --- Buttons ---
    // VERIFIED: button text "Cancel" confirmed in snapshot 2026-06-14
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    // VERIFIED: button "Finish" confirmed in snapshot 2026-06-14
    this.finishButton = page.getByRole('button', { name: 'Finish' });

    // --- Header ---
    this.openMenuButton = page.getByRole('button', { name: 'Open Menu' });
  }

  async navigate() {
    await this.page.goto('https://www.saucedemo.com/checkout-step-two.html');
  }

  async finish() {
    await this.finishButton.click();
  }

  async cancel() {
    await this.cancelButton.click();
  }

  async getTotalAmount(): Promise<string> {
    return await this.totalLabel.textContent() ?? '';
  }

  async getSubtotal(): Promise<string> {
    return await this.subtotalLabel.textContent() ?? '';
  }

  async getTax(): Promise<string> {
    return await this.taxLabel.textContent() ?? '';
  }
}
