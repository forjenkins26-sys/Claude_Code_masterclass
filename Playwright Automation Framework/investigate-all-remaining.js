const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://www.facebook.com/reg');
  await page.waitForTimeout(2000);

  console.log('=== Testing Dropdowns (REG-003) ===');
  const dayDropdown = page.getByRole('combobox', { name: 'Select day' });
  console.log('Day dropdown exists:', await dayDropdown.count());
  console.log('Day dropdown visible:', await dayDropdown.isVisible());

  // Test clicking dropdown
  console.log('\nTrying to click day dropdown...');
  await dayDropdown.click();
  await page.waitForTimeout(1000);

  // Check if options appear
  const options = await page.locator('[role="option"]').all();
  console.log('Options appeared after click:', options.length);

  if (options.length > 0) {
    console.log('First 5 option texts:');
    for (let i = 0; i < Math.min(5, options.length); i++) {
      const text = await options[i].textContent();
      console.log(`  [${i}] ${text}`);
    }

    // Try selecting option
    console.log('\nTrying to select option "15"...');
    const option15 = page.locator('[role="option"]', { hasText: '15' }).first();
    await option15.click();
    await page.waitForTimeout(500);
  }

  console.log('\n=== Testing Gender Radio Buttons (REG-004) ===');

  // Check for radio inputs
  const allRadios = await page.locator('input[type="radio"]').all();
  console.log('Total radio inputs:', allRadios.length);

  for (let i = 0; i < allRadios.length; i++) {
    const name = await allRadios[i].getAttribute('name');
    const value = await allRadios[i].getAttribute('value');
    const visible = await allRadios[i].isVisible();
    console.log(`  [${i}] name="${name}", value="${value}", visible=${visible}`);
  }

  // Check for labels
  const genderLabels = await page.locator('label:has-text("Female"), label:has-text("Male"), label:has-text("Custom")').all();
  console.log('\nGender labels found:', genderLabels.length);

  // Try clicking Male
  if (allRadios.length > 0) {
    console.log('\nTrying to click first radio (should be Female or Male)...');
    await allRadios[0].click({ force: true });
    await page.waitForTimeout(500);
    const checked = await allRadios[0].isChecked();
    console.log('First radio checked after click:', checked);
  }

  await page.waitForTimeout(3000);
  await browser.close();
})();
