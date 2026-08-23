// All locators VERIFIED against live DOM: 2026-08-23 (10/10 resolved, count=1 each)
import { Page, Locator } from '@playwright/test';

export class MediCareLoginPage {
  readonly page: Page;

  // --- Form Fields ---
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly pincodeInput: Locator;

  // --- Buttons ---
  readonly signInButton: Locator;
  // ⚠️ #registerBtn: type="submit" but sits OUTSIDE #loginForm (parent div.right-panel,
  //    btn.form === null) and has no click handler — clicking does nothing observable.
  //    Structural fact from live DOM; whether it is a defect is the Epic AC's call (AH Rule 19).
  readonly createAccountButton: Locator;

  // --- Links ---
  readonly forgotPasswordLink: Locator;

  // --- Validation Messages ---
  readonly emailError: Locator;
  readonly passwordError: Locator;
  readonly pincodeError: Locator;

  // --- Toast (auto-hides after 3000ms) ---
  readonly toast: Locator;

  constructor(page: Page) {
    this.page = page;

    // --- Form Fields ---
    this.emailInput = page.getByRole('textbox', { name: 'Email Address' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });
    this.pincodeInput = page.getByRole('textbox', { name: 'Delivery Pincode' });

    // --- Buttons ---
    this.signInButton = page.getByRole('button', { name: 'Sign In' });
    this.createAccountButton = page.getByRole('button', { name: 'Create New Account' });

    // --- Links ---
    this.forgotPasswordLink = page.getByRole('link', { name: 'Forgot Password?' });

    // --- Validation Messages (static ids, no role="alert" — visibility via .show class) ---
    this.emailError = page.locator('#emailErr');
    this.passwordError = page.locator('#passwordErr');
    this.pincodeError = page.locator('#pincodeErr');

    // --- Toast ---
    this.toast = page.locator('#toast');
  }

  // --- Navigation ---
  async navigate() {
    await this.page.goto('https://medicare-pharmacy-demo-eight.vercel.app/');
  }

  // --- Actions ---
  async login(email: string, password: string, pincode: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.pincodeInput.fill(pincode);
    await this.signInButton.click();
  }

  async submitEmpty() {
    await this.signInButton.click();
  }

  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
  }

  async clickCreateAccount() {
    await this.createAccountButton.click();
  }

  // --- Getters ---
  async getToastText(): Promise<string> {
    await this.toast.waitFor({ state: 'visible' });
    return (await this.toast.textContent())?.trim() ?? '';
  }
}
