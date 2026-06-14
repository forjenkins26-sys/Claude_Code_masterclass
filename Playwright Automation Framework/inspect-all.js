const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://www.facebook.com', { waitUntil: 'domcontentloaded' });

    console.log('=== ALL FORM ELEMENTS ===\n');

    // Get all elements in the form
    const formHTML = await page.locator('form').first().evaluate(form => {
      const inputs = Array.from(form.querySelectorAll('input, button'));
      return inputs.map(el => ({
        tag: el.tagName,
        type: el.type || 'N/A',
        name: el.name || 'N/A',
        id: el.id || 'N/A',
        value: el.value || 'N/A',
        text: el.textContent?.trim() || 'N/A',
        dataTestid: el.getAttribute('data-testid') || 'N/A'
      }));
    });

    console.log(JSON.stringify(formHTML, null, 2));

    console.log('\n=== ALL LINKS ===\n');
    const links = await page.locator('a').all();
    for (let i = 0; i < Math.min(links.length, 5); i++) {
      const text = await links[i].textContent();
      const href = await links[i].getAttribute('href');
      console.log(`Link ${i + 1}: ${text?.trim()} -> ${href}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
