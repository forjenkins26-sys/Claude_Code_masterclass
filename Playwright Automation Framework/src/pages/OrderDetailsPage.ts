import { Page, Locator } from '@playwright/test';

export class OrderDetailsPage {
  readonly page: Page;

  // --- Buttons ---
  readonly backButton: Locator;
  readonly cancelOrderButton: Locator;
  readonly reorderButton: Locator;
  readonly invoiceButton: Locator;

  // --- Status & Info (read-only) ---
  readonly orderIdText: Locator;
  readonly statusBadge: Locator;
  readonly etaBar: Locator;

  constructor(page: Page) {
    this.page = page;

    // --- Buttons ---
    this.backButton        = page.getByRole('button', { name: '← Back' });
    this.cancelOrderButton = page.getByRole('button', { name: 'Cancel Order' });
    this.reorderButton     = page.getByRole('button', { name: 'Reorder' });
    this.invoiceButton     = page.getByRole('button', { name: 'Invoice 🧾' });

    // --- Status & Info ---
    this.orderIdText = page.locator('#orderId');
    this.statusBadge = page.locator('#statusBadge');
    this.etaBar      = page.locator('.eta-bar');
  }

  // --- Navigation ---
  async navigate() {
    await this.page.goto('http://localhost:7000/order-details.html');
  }

  // --- Actions ---
  async clickBack() {
    await this.backButton.click();
  }

  async cancelOrder() {
    await this.cancelOrderButton.click();
  }

  async reorder() {
    await this.reorderButton.click();
  }

  async downloadInvoice() {
    await this.invoiceButton.click();
  }

  // --- Getters ---
  async getOrderId(): Promise<string> {
    return await this.orderIdText.innerText();
  }

  async getStatus(): Promise<string> {
    return await this.statusBadge.innerText();
  }

  async getEtaText(): Promise<string> {
    return await this.etaBar.innerText();
  }
}
