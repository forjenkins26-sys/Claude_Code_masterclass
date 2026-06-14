const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Navigating to Facebook forgot password page...');
  await page.goto('https://www.facebook.com/recover/initiate/');
  await page.waitForTimeout(3000);

  console.log('\n=== CHECKING INPUT BY POSITION ===');

  // Try finding input by position (first visible text input)
  const firstTextInput = page.locator('input[type="text"]').first();
  const exists = await firstTextInput.count() > 0;
  console.log(`First text input exists: ${exists}`);

  if (exists) {
    const visible = await firstTextInput.isVisible();
    const enabled = await firstTextInput.isEnabled();
    console.log(`First text input visible: ${visible}`);
    console.log(`First text input enabled: ${enabled}`);

    if (visible && enabled) {
      await firstTextInput.fill('test@example.com');
      const value = await firstTextInput.inputValue();
      console.log(`Manual fill works: ${value === 'test@example.com'}`);
      await firstTextInput.clear();
    }
  }

  console.log('\n=== CHECKING ROLE-BASED BUTTONS ===');

  // Check for role="button"
  const roleButtons = await page.locator('[role="button"]').all();
  console.log(`Found ${roleButtons.length} elements with role="button"`);

  for (let i = 0; i < roleButtons.length; i++) {
    const button = roleButtons[i];
    const isVisible = await button.isVisible();

    if (isVisible) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');

      console.log(`\nRole=button #${i}:`);
      console.log(`  text: ${text?.trim()}`);
      console.log(`  aria-label: ${ariaLabel}`);
    }
  }

  console.log('\n=== CHECKING getByRole APPROACH ===');

  // Try Playwright's getByRole
  try {
    const searchBtn = page.getByRole('button', { name: /search/i });
    const searchExists = await searchBtn.count() > 0;
    console.log(`Search button via getByRole: ${searchExists ? 'FOUND' : 'NOT FOUND'}`);
  } catch (e) {
    console.log(`Search button via getByRole: ERROR - ${e.message}`);
  }

  try {
    const cancelBtn = page.getByRole('button', { name: /cancel/i });
    const cancelExists = await cancelBtn.count() > 0;
    console.log(`Cancel button via getByRole: ${cancelExists ? 'FOUND' : 'NOT FOUND'}`);
  } catch (e) {
    console.log(`Cancel button via getByRole: ERROR - ${e.message}`);
  }

  console.log('\n=== CHECKING getByText FOR BUTTONS ===');

  const textSearch = page.getByText('Search', { exact: false });
  const textSearchExists = await textSearch.count() > 0;
  console.log(`"Search" text exists: ${textSearchExists}`);
  if (textSearchExists) {
    console.log(`  Count: ${await textSearch.count()}`);
    const firstSearchVisible = await textSearch.first().isVisible();
    console.log(`  First visible: ${firstSearchVisible}`);
  }

  const textCancel = page.getByText('Cancel', { exact: false });
  const textCancelExists = await textCancel.count() > 0;
  console.log(`"Cancel" text exists: ${textCancelExists}`);
  if (textCancelExists) {
    console.log(`  Count: ${await textCancel.count()}`);
    const firstCancelVisible = await textCancel.first().isVisible();
    console.log(`  First visible: ${firstCancelVisible}`);
  }

  console.log('\n=== PAGE HTML SNAPSHOT (first 50 lines of body) ===');

  const bodyHTML = await page.locator('body').innerHTML();
  const lines = bodyHTML.split('\n').slice(0, 50);
  console.log(lines.join('\n'));

  console.log('\n=== MANUAL INSPECTION ===');
  console.log('Browser stays open for 20 seconds. Inspect in DevTools.');

  await page.waitForTimeout(20000);

  await browser.close();
  console.log('\nInvestigation complete.');
})();
