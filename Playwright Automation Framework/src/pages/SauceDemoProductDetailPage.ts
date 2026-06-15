import { Page, Locator } from '@playwright/test';

export class SauceDemoProductDetailPage {
  readonly page: Page;

  // --- Navigation ---
  // VERIFIED: button "Go back Back to products" confirmed in snapshot 2026-06-14
  readonly backButton: Locator;

  // --- Product Info ---
  // VERIFIED: snapshot shows product name as text inside generic — using heading/text role
  readonly productName: Locator;
  readonly productDescription: Locator;
  readonly productPrice: Locator;
  // VERIFIED: img "Sauce Labs Backpack" confirmed in snapshot 2026-06-14
  readonly productImage: Locator;

  // --- Actions ---
  // VERIFIED: button "Add to cart" confirmed in snapshot 2026-06-14
  readonly addToCartButton: Locator;
  // Remove button appears after add — VERIFICATION REQUIRED: not captured in initial snapshot
  readonly removeButton: Locator;

  // --- Header ---
  // VERIFIED: button "Open Menu" confirmed in snapshot 2026-06-14
  readonly openMenuButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // --- Navigation ---
    // Snapshot: button "Go back Back to products" — name includes "Back to products"
    this.backButton = page.getByRole('button', { name: 'Back to products' });

    // --- Product Info ---
    // Snapshot shows text nodes inside generic containers — using class-based fallback
    // VERIFICATION REQUIRED: verify these class selectors in headed mode
    this.productName        = page.locator('.inventory_details_name');
    this.productDescription = page.locator('.inventory_details_desc');
    this.productPrice       = page.locator('.inventory_details_price');
    // VERIFIED: img role with name confirmed in snapshot
    this.productImage = page.getByRole('img', { name: 'Sauce Labs Backpack' });

    // --- Actions ---
    // VERIFIED: button "Add to cart" confirmed in snapshot 2026-06-14
    this.addToCartButton = page.getByRole('button', { name: 'Add to cart' });
    // VERIFICATION REQUIRED: "Remove" button appears post-add — not in initial snapshot
    this.removeButton = page.getByRole('button', { name: 'Remove' });

    // --- Header ---
    this.openMenuButton = page.getByRole('button', { name: 'Open Menu' });
  }

  async navigateToItem(itemId: number) {
    await this.page.goto(`https://www.saucedemo.com/inventory-item.html?id=${itemId}`);
  }

  async addToCart() {
    await this.addToCartButton.click();
  }

  async removeFromCart() {
    await this.removeButton.click();
  }

  async goBack() {
    await this.backButton.click();
  }

  async getProductName(): Promise<string> {
    return await this.productName.textContent() ?? '';
  }

  async getProductPrice(): Promise<string> {
    return await this.productPrice.textContent() ?? '';
  }
}
