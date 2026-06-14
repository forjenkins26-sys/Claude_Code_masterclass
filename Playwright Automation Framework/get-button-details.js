const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1536, height: 864 });

  try {
    await page.goto('https://www.facebook.com', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('=== BUTTON WITH ROLE="button" ===\n');

    const btn = await page.getByRole('button').first();
    const visible = await btn.isVisible();
    const enabled = await btn.isEnabled();

    const details = await btn.evaluate(el => ({
      tag: el.tagName,
      type: el.getAttribute('type'),
      name: el.getAttribute('name'),
      value: el.getAttribute('value'),
      class: el.className,
      text: el.textContent?.trim(),
      id: el.id,
      ariaLabel: el.getAttribute('aria-label')
    }));

    console.log('Details:', JSON.stringify(details, null, 2));
    console.log(`\nVisible: ${visible}`);
    console.log(`Enabled: ${enabled}`);

    console.log('\n=== SELECTOR THAT WORKS ===');
    console.log(`getByRole('button').first()  ← USE THIS`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
