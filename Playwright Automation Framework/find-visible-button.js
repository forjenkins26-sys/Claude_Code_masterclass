const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1536, height: 864 });

  try {
    await page.goto('https://www.facebook.com', { waitUntil: 'networkidle' });

    // Wait a bit for any JS to render
    await page.waitForTimeout(2000);

    console.log('=== FINDING VISIBLE LOGIN BUTTON ===\n');

    // Get ALL elements with text "Log in" or "Log In"
    const loginTexts = await page.locator('text=/log.*in/i').all();
    console.log(`Found ${loginTexts.length} elements with "log in" text`);

    for (let i = 0; i < loginTexts.length; i++) {
      const visible = await loginTexts[i].isVisible();
      if (visible) {
        const details = await loginTexts[i].evaluate(el => ({
          tag: el.tagName,
          type: el.getAttribute('type'),
          name: el.getAttribute('name'),
          role: el.getAttribute('role'),
          class: el.className,
          text: el.textContent?.trim(),
          id: el.id
        }));
        console.log(`\n✓ VISIBLE element ${i+1}:`);
        console.log(JSON.stringify(details, null, 2));
      }
    }

    // Also try to find by button role
    console.log('\n=== Checking getByRole("button") ===');
    const allButtons = await page.getByRole('button').all();
    console.log(`Total role=button elements: ${allButtons.length}`);

    for (let i = 0; i < Math.min(allButtons.length, 5); i++) {
      const text = await allButtons[i].textContent();
      const visible = await allButtons[i].isVisible();
      if (text && text.toLowerCase().includes('log')) {
        console.log(`Button ${i+1}: "${text?.trim()}" - visible: ${visible}`);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
