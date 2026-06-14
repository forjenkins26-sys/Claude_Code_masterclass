const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1536, height: 864 });

  try {
    await page.goto('https://www.facebook.com', { waitUntil: 'domcontentloaded' });

    console.log('=== LOGIN BUTTON INVESTIGATION ===\n');

    // Check input[type=submit]
    console.log('1. input[type="submit"]:');
    const submitInput = await page.locator('input[type="submit"]').first();
    const submitVisible = await submitInput.isVisible().catch(() => false);
    const submitExists = await submitInput.count();
    console.log(`   Exists: ${submitExists > 0}`);
    console.log(`   Visible: ${submitVisible}`);

    // Check for button elements
    console.log('\n2. button elements:');
    const buttons = await page.locator('button').all();
    console.log(`   Total buttons: ${buttons.length}`);

    for (let i = 0; i < Math.min(buttons.length, 3); i++) {
      const visible = await buttons[i].isVisible();
      const text = await buttons[i].textContent();
      console.log(`   Button ${i+1}: visible=${visible}, text="${text?.trim()}"`);
    }

    // Look for visible login button by text
    console.log('\n3. Looking for visible "Log" or "Login" button:');
    const loginBtnByText = await page.getByRole('button', { name: /log.*in/i }).first();
    const loginBtnVisible = await loginBtnByText.isVisible().catch(() => false);
    console.log(`   Found by role: ${loginBtnVisible}`);

    if (loginBtnVisible) {
      const attrs = await loginBtnByText.evaluate(el => ({
        tag: el.tagName,
        name: el.getAttribute('name'),
        type: el.getAttribute('type'),
        text: el.textContent?.trim()
      }));
      console.log(`   Details:`, JSON.stringify(attrs, null, 2));
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
