import { chromium } from '@playwright/test';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:7000/blinkit-login.html');
  const snap = await page.locator('body').ariaSnapshot();
  console.log(snap);
  await browser.close();
})();
