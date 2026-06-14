const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('https://www.facebook.com/reg');
  await page.waitForTimeout(2000);

  console.log('Checking for buttons:');
  const buttons = await page.locator('button').all();
  console.log('Total buttons:', buttons.length);

  for (let i = 0; i < Math.min(buttons.length, 5); i++) {
    const text = await buttons[i].textContent();
    const name = await buttons[i].getAttribute('name');
    const type = await buttons[i].getAttribute('type');
    const visible = await buttons[i].isVisible();
    console.log(\  [\] text="\", type="\", visible=\\);
  }

  const signUpCount = await page.getByRole('button', { name: /sign up/i }).count();
  console.log('\\ngetByRole button "sign up" count:', signUpCount);

  await page.waitForTimeout(3000);
  await browser.close();
})();
