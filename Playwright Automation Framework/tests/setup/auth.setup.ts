import { test as setup } from '@playwright/test';

/**
 * Authentication setup for tests that require logged-in state
 * Currently disabled as it requires valid Facebook credentials
 *
 * To enable:
 * 1. Set FB_TEST_EMAIL and FB_TEST_PASSWORD environment variables
 * 2. Uncomment the code below
 * 3. Update playwright.config.ts to use storageState
 */

setup('authenticate', async ({ page }) => {
  // Uncomment and modify when ready to use

  // await page.goto('https://www.facebook.com');
  // await page.locator('#email').fill(process.env.FB_TEST_EMAIL!);
  // await page.locator('#pass').fill(process.env.FB_TEST_PASSWORD!);
  // await page.getByRole('button', { name: 'Log In' }).click();
  //
  // await page.waitForURL(/facebook.com\/(?!login)/);
  //
  // await page.context().storageState({ path: 'playwright/.auth/user.json' });

  console.log('Auth setup skipped - requires valid credentials');
});
