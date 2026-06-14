const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Loading Facebook...');
    await page.goto('https://www.facebook.com', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('\n=== LOGIN BUTTON INSPECTION ===');

    // Try finding login button different ways
    const buttons = await page.locator('button').all();
    console.log(`Total buttons found: ${buttons.length}`);

    for (let i = 0; i < Math.min(buttons.length, 5); i++) {
      const attrs = await buttons[i].evaluate(el => ({
        name: el.name || 'N/A',
        type: el.type || 'N/A',
        text: el.textContent?.trim() || 'N/A',
        id: el.id || 'N/A',
        className: el.className || 'N/A',
        dataTestid: el.getAttribute('data-testid') || 'N/A'
      }));
      console.log(`\nButton ${i + 1}:`, JSON.stringify(attrs, null, 2));
    }

    console.log('\n=== CREATE ACCOUNT LINK/BUTTON ===');

    // Find create account element
    const links = await page.locator('a[role="button"]').all();
    console.log(`Links with role=button: ${links.length}`);

    for (let i = 0; i < Math.min(links.length, 3); i++) {
      const attrs = await links[i].evaluate(el => ({
        text: el.textContent?.trim() || 'N/A',
        href: el.href || 'N/A',
        dataTestid: el.getAttribute('data-testid') || 'N/A',
        id: el.id || 'N/A'
      }));
      console.log(`\nLink ${i + 1}:`, JSON.stringify(attrs, null, 2));
    }

    await page.waitForTimeout(2000);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
