import { Page, Locator } from '@playwright/test';

export class TTALoginPage {
  readonly page: Page;

  // --- Form Fields ---
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly passwordToggle: Locator;

  // --- Buttons ---
  readonly loginButton: Locator;

  // --- Links ---
  readonly forgotPasswordLink: Locator;
  readonly signUpLink: Locator;

  // --- Navigation ---
  readonly homeNavLink: Locator;
  readonly allCoursesNavLink: Locator;
  readonly supportNavLink: Locator;
  readonly calendarNavLink: Locator;
  readonly blogNavLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // --- Form Fields ---
    this.emailInput     = page.getByRole('textbox', { name: 'Email Address' });
    this.passwordInput  = page.getByRole('textbox', { name: 'Password' });
    this.passwordToggle = page.locator('div').filter({ has: page.getByRole('textbox', { name: 'Password' }) }).locator('> div').last();

    // --- Buttons ---
    this.loginButton = page.getByRole('button', { name: 'Login' });

    // --- Links ---
    this.forgotPasswordLink = page.getByRole('link', { name: 'Forgot Password?' });
    this.signUpLink         = page.getByRole('link', { name: 'Sign Up' });

    // --- Navigation ---
    this.homeNavLink       = page.getByRole('link', { name: 'HOME' });
    this.allCoursesNavLink = page.getByRole('link', { name: 'ALL COURSES' });
    this.supportNavLink    = page.getByRole('link', { name: 'SUPPORT' });
    this.calendarNavLink   = page.getByRole('link', { name: 'CALENDAR' });
    this.blogNavLink       = page.getByRole('link', { name: 'BLOG' });
  }

  async navigate() {
    await this.page.goto('https://courses.thetestingacademy.com/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async togglePasswordVisibility() {
    await this.passwordToggle.click();
  }

  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
  }

  async clickSignUp() {
    await this.signUpLink.click();
  }

  // reCAPTCHA present on this page — use test site key for automation
  // Test bypass key: 6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
  getCaptchaFrame() {
    return this.page.frameLocator('iframe[src*="recaptcha"]');
  }

  async waitForCaptchaCheckbox() {
    return this.getCaptchaFrame().getByRole('checkbox', { name: "I'm not a robot" });
  }
}
