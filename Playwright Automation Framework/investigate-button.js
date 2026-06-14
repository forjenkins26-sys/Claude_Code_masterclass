const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://www.facebook.com/reg');
  await page.waitForTimeout(2000);

  console.log('=== Checking for sign up button ===');

  // Check for buttons
  const allButtons = await page.locator('button').all();
  console.log('Total buttons:', allButtons.length);

  for (let i = 0; i < allButtons.length; i++) {
    const text = await allButtons[i].textContent();
    const visible = await allButtons[i].isVisible();
    const name = await allButtons[i].getAttribute('name');
    const type = await allButtons[i].getAttribute('type');
    console.log(`  [${i}] text="${text?.trim()}", type="${type}", name="${name}", visible=${visible}`);
  }

  // Check getByRole
  console.log('\nChecking getByRole("button"):');
  const roleButtons = await page.getByRole('button').all();
  console.log('  Count:', roleButtons.length);
  for (let i = 0; i < Math.min(roleButtons.length, 5); i++) {
    const text = await roleButtons[i].textContent();
    const visible = await roleButtons[i].isVisible();
    console.log(`  [${i}] text="${text?.trim()}", visible=${visible}`);
  }

  // Check for "sign up" text
  console.log('\nChecking getByRole with "sign up":');
  const signUpCount = await page.getByRole('button', { name: /sign up/i }).count();
  console.log('  Count:', signUpCount);

  // Check for submit type
  console.log('\nChecking button[type="submit"]:');
  const submitButtons = await page.locator('button[type="submit"]').all();
  console.log('  Count:', submitButtons.length);
  for (let i = 0; i < submitButtons.length; i++) {
    const text = await submitButtons[i].textContent();
    const visible = await submitButtons[i].isVisible();
    console.log(`  [${i}] text="${text?.trim()}", visible=${visible}`);
  }

  await page.waitForTimeout(3000);
  await browser.close();
})();
