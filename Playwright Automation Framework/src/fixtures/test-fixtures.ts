// Extends the evidence-collecting test, so every spec using these page
// objects gets console/network capture on failure without opting in.
import { test as base } from './browser-evidence';
import { LoginPage } from '../pages/LoginPage';
import { RegistrationPage } from '../pages/RegistrationPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { BlinkitLoginPage } from '../pages/BlinkitLoginPage';

type PageFixtures = {
  loginPage: LoginPage;
  registrationPage: RegistrationPage;
  forgotPasswordPage: ForgotPasswordPage;
  blinkitLoginPage: BlinkitLoginPage;
};

/**
 * Extended test fixture with page objects injected
 * Usage in tests: test('test name', async ({ loginPage }) => { ... })
 */
export const test = base.extend<PageFixtures>({

  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  registrationPage: async ({ page }, use) => {
    const registrationPage = new RegistrationPage(page);
    await use(registrationPage);
  },

  forgotPasswordPage: async ({ page }, use) => {
    const forgotPasswordPage = new ForgotPasswordPage(page);
    await use(forgotPasswordPage);
  },

  blinkitLoginPage: async ({ page }, use) => {
    const blinkitLoginPage = new BlinkitLoginPage(page);
    await use(blinkitLoginPage);
  },
});

export { expect } from '@playwright/test';
