const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://www.facebook.com/reg');
  await page.waitForTimeout(2000);

  console.log('=== Testing Gender Radio Buttons ===');

  // Check for radio inputs
  const allRadios = await page.locator('input[type="radio"]').all();
  console.log('Total radio inputs:', allRadios.length);

  for (let i = 0; i < allRadios.length; i++) {
    const name = await allRadios[i].getAttribute('name');
    const value = await allRadios[i].getAttribute('value');
    const visible = await allRadios[i].isVisible();
    const id = await allRadios[i].getAttribute('id');
    console.log(`  [${i}] name="${name}", value="${value}", id="${id}", visible=${visible}`);
  }

  // Check specific values the test expects
  console.log('\nChecking expected selectors:');
  const male = await page.locator('input[name="sex"][value="2"]').count();
  const female = await page.locator('input[name="sex"][value="1"]').count();
  const custom = await page.locator('input[name="sex"][value="-1"]').count();
  console.log(`  input[name="sex"][value="2"] (male?): ${male}`);
  console.log(`  input[name="sex"][value="1"] (female?): ${female}`);
  console.log(`  input[name="sex"][value="-1"] (custom?): ${custom}`);

  // Check labels
  console.log('\nGender labels:');
  const labels = await page.locator('label').all();
  for (const label of labels) {
    const text = await label.textContent();
    if (text && (text.includes('Female') || text.includes('Male') || text.includes('Custom'))) {
      const forAttr = await label.getAttribute('for');
      console.log(`  Label: "${text.trim()}", for="${forAttr}"`);
    }
  }

  await page.waitForTimeout(3000);
  await browser.close();
})();
