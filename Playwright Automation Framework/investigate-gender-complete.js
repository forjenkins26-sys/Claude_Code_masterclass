const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://www.facebook.com/reg');
  await page.waitForTimeout(2000);

  console.log('=== Testing Gender Selection ===');

  // Check role-based approach
  console.log('\nChecking getByLabel("Female"):');
  const femaleCount = await page.getByLabel('Female').count();
  console.log('  Count:', femaleCount);

  console.log('\nChecking getByLabel("Male"):');
  const maleCount = await page.getByLabel('Male').count();
  console.log('  Count:', maleCount);

  console.log('\nChecking getByLabel("Custom"):');
  const customCount = await page.getByLabel('Custom').count();
  console.log('  Count:', customCount);

  // Try clicking Female
  if (femaleCount > 0) {
    console.log('\nTrying to click Female...');
    await page.getByLabel('Female').click();
    await page.waitForTimeout(500);
    console.log('Female clicked successfully');
  }

  // Check if there are clickable elements with text
  console.log('\nChecking text-based selectors:');
  const femaleText = await page.locator('text=Female').count();
  const maleText = await page.locator('text=Male').count();
  console.log('  text=Female:', femaleText);
  console.log('  text=Male:', maleText);

  await page.waitForTimeout(3000);
  await browser.close();
})();
