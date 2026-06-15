import { Page, Locator } from '@playwright/test';

export class SauceDemoInventoryPage {
  readonly page: Page;

  // --- Header ---
  // VERIFIED: DOM snapshot 2026-06-14 — button "Open Menu" confirmed
  readonly openMenuButton: Locator;
  // VERIFIED: DOM snapshot 2026-06-14 — cart badge text "1" confirmed in snapshot
  readonly cartBadge: Locator;

  // --- Sidebar Menu (VERIFIED: snapshot after hamburger click 2026-06-14) ---
  readonly allItemsLink: Locator;
  readonly aboutLink: Locator;
  readonly logoutLink: Locator;
  readonly resetAppStateLink: Locator;
  readonly closeMenuButton: Locator;

  // --- Sort (VERIFIED: combobox with 4 options confirmed in snapshot 2026-06-14) ---
  readonly sortDropdown: Locator;

  // --- Product Cards (VERIFIED: links + buttons confirmed in snapshot 2026-06-14) ---
  readonly addToCartButtons: Locator;
  readonly productLinks: Locator;

  constructor(page: Page) {
    this.page = page;

    // --- Header ---
    this.openMenuButton = page.getByRole('button', { name: 'Open Menu' });
    // Cart badge appears as text node inside cart link — generic ref=e24 in snapshot
    // VERIFICATION REQUIRED: exact selector for cart badge — not role-accessible in snapshot
    this.cartBadge = page.locator('.shopping_cart_badge');

    // --- Sidebar Menu ---
    this.allItemsLink      = page.getByRole('link', { name: 'All Items' });
    this.aboutLink         = page.getByRole('link', { name: 'About' });
    this.logoutLink        = page.getByRole('link', { name: 'Logout' });
    this.resetAppStateLink = page.getByRole('link', { name: 'Reset App State' });
    this.closeMenuButton   = page.getByRole('button', { name: 'Close Menu' });

    // --- Sort ---
    // VERIFIED: combobox role confirmed in snapshot — options: Name A-Z, Name Z-A, Price low-high, Price high-low
    this.sortDropdown = page.getByRole('combobox');

    // --- Product Cards ---
    // VERIFIED: button "Add to cart" confirmed in snapshot (6 instances)
    this.addToCartButtons = page.getByRole('button', { name: 'Add to cart' });
    // VERIFIED: product links confirmed in snapshot (e.g. link "Sauce Labs Backpack")
    this.productLinks = page.getByRole('link').filter({ hasNotText: /Twitter|Facebook|LinkedIn|All Items|About|Logout|Reset/ });
  }

  async navigate() {
    await this.page.goto('https://www.saucedemo.com/inventory.html');
  }

  async openMenu() {
    await this.openMenuButton.click();
  }

  async closeMenu() {
    await this.closeMenuButton.click();
  }

  async logout() {
    await this.openMenu();
    await this.logoutLink.click();
  }

  // VERIFIED: options confirmed from combobox snapshot 2026-06-14
  async sortBy(option: 'Name (A to Z)' | 'Name (Z to A)' | 'Price (low to high)' | 'Price (high to low)') {
    await this.sortDropdown.selectOption(option);
  }

  // VERIFIED: product title links confirmed in snapshot 2026-06-14
  async clickProductByName(productName: string) {
    await this.page.getByRole('link', { name: productName }).first().click();
  }

  async addAllToCart() {
    const count = await this.addToCartButtons.count();
    for (let i = 0; i < count; i++) {
      await this.addToCartButtons.nth(i).click();
    }
  }
}
