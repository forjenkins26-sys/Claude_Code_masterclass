import { test as base } from '@playwright/test';
import { BlinkitLoginPage } from '../pages/blinkitLoginPage';

/**
 * Fixture DI — injects page objects into tests so specs never construct them.
 */
type Fixtures = {
  loginPage: BlinkitLoginPage;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new BlinkitLoginPage(page);
    await loginPage.navigate();
    await use(loginPage);
  },
});

export { expect } from '@playwright/test';
