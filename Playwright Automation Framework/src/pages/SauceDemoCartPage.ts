import { Page, Locator } from '@playwright/test';

export class SauceDemoCartPage {
  readonly page: Page;

  // --- Header ---
  // VERIFIED: button "Open Menu" confirmed in snapshot 2026-06-14
  readonly openMenuButton: Locator;

  // --- Cart Items ---
  // VERIFIED: snapshot shows link "Sauce Labs Backpack", qty "1", price "$29.99"
  readonly itemNames: Locator;
  readonly itemQuantities: Locator;
  // VERIFIED: button "Remove" confirmed in cart snapshot 2026-06-14
  readonly removeButtons: Locator;

  // --- Actions ---
  // VERIFIED: button "Go back Continue Shopping" confirmed in snapshot 2026-06-14
  readonly continueShoppingButton: Locator;
  // VERIFIED: button "Checkout" confirmed in snapshot 2026-06-14
  readonly checkoutButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // --- Header ---
    this.openMenuButton = page.getByRole('button', { name: 'Open Menu' });

    // --- Cart Items ---
    // VERIFIED: product links in cart snapshot 2026-06-14
    this.itemNames      = page.locator('.inventory_item_name');
    // VERIFIED: qty visible as text "1" in generic container — class fallback
    // VERIFICATION REQUIRED: confirm class name in headed mode
    this.itemQuantities = page.locator('.cart_quantity');
    // VERIFIED: button "Remove" confirmed in cart snapshot 2026-06-14
    this.removeButtons  = page.getByRole('button', { name: 'Remove' });

    // --- Actions ---
    // VERIFIED: button text "Continue Shopping" confirmed in snapshot 2026-06-14
    this.continueShoppingButton = page.getByRole('button', { name: 'Continue Shopping' });
    // VERIFIED: button "Checkout" confirmed in snapshot 2026-06-14
    this.checkoutButton = page.getByRole('button', { name: 'Checkout' });
  }

  async navigate() {
    await this.page.goto('https://www.saucedemo.com/cart.html');
  }

  async checkout() {
    await this.checkoutButton.click();
  }

  async continueShopping() {
    await this.continueShoppingButton.click();
  }

  async removeItem() {
    await this.removeButtons.first().click();
  }

  async getCartItemCount(): Promise<number> {
    return await this.itemNames.count();
  }

  async getItemNames(): Promise<string[]> {
    return await this.itemNames.allTextContents();
  }
}
