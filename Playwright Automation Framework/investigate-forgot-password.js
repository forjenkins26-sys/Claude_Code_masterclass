const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Navigating to Facebook forgot password page...');
  await page.goto('https://www.facebook.com/recover/initiate/');
  await page.waitForTimeout(3000);

  console.log('\n=== INVESTIGATING EMAIL/PHONE INPUT ===');

  // Check all input elements
  const allInputs = await page.locator('input').all();
  console.log(`Found ${allInputs.length} input elements`);

  for (let i = 0; i < allInputs.length; i++) {
    const input = allInputs[i];
    const isVisible = await input.isVisible();

    if (isVisible) {
      const name = await input.getAttribute('name');
      const id = await input.getAttribute('id');
      const type = await input.getAttribute('type');
      const placeholder = await input.getAttribute('placeholder');
      const ariaLabel = await input.getAttribute('aria-label');

      console.log(`\nVisible Input #${i}:`);
      console.log(`  name: ${name}`);
      console.log(`  id: ${id}`);
      console.log(`  type: ${type}`);
      console.log(`  placeholder: ${placeholder}`);
      console.log(`  aria-label: ${ariaLabel}`);
    }
  }

  console.log('\n=== INVESTIGATING BUTTONS ===');

  // Check all buttons
  const allButtons = await page.locator('button').all();
  console.log(`Found ${allButtons.length} button elements`);

  for (let i = 0; i < allButtons.length; i++) {
    const button = allButtons[i];
    const isVisible = await button.isVisible();

    if (isVisible) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const type = await button.getAttribute('type');

      console.log(`\nVisible Button #${i}:`);
      console.log(`  text: ${text?.trim()}`);
      console.log(`  aria-label: ${ariaLabel}`);
      console.log(`  type: ${type}`);
    }
  }

  console.log('\n=== INVESTIGATING LINKS (for Cancel) ===');

  // Check for cancel link
  const allLinks = await page.locator('a').all();
  console.log(`Found ${allLinks.length} link elements`);

  for (let i = 0; i < allLinks.length; i++) {
    const link = allLinks[i];
    const isVisible = await link.isVisible();

    if (isVisible) {
      const text = await link.textContent();
      const href = await link.getAttribute('href');

      if (text && (text.toLowerCase().includes('cancel') || text.toLowerCase().includes('back'))) {
        console.log(`\nPossible Cancel Link #${i}:`);
        console.log(`  text: ${text.trim()}`);
        console.log(`  href: ${href}`);
      }
    }
  }

  console.log('\n=== MANUAL VERIFICATION ===');
  console.log('Browser will stay open for 30 seconds.');
  console.log('Manually inspect elements in DevTools.');

  await page.waitForTimeout(30000);

  await browser.close();
  console.log('\nInvestigation complete.');
})();
