const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Navigating to registration page...');
  await page.goto('https://www.facebook.com/reg');
  await page.waitForTimeout(3000);

  console.log('\n=== Checking for select/dropdown elements ===');
  const selectCount = await page.locator('select').count();
  console.log('  Native <select> elements found:', selectCount);

  if (selectCount > 0) {
    const selects = await page.locator('select').all();
    for (let i = 0; i < selects.length; i++) {
      const name = await selects[i].getAttribute('name');
      const id = await selects[i].getAttribute('id');
      console.log(`    [${i}] name="${name}", id="${id}"`);
    }
  } else {
    console.log('  No native select elements. Checking for role="combobox":');
    const comboboxCount = await page.getByRole('combobox').count();
    console.log('    Comboboxes found:', comboboxCount);

    if (comboboxCount > 0) {
      const comboboxes = await page.getByRole('combobox').all();
      for (let i = 0; i < Math.min(comboboxes.length, 5); i++) {
        const name = await comboboxes[i].getAttribute('aria-label');
        console.log(`    [${i}] aria-label="${name}"`);
      }
    }
  }

  console.log('\n=== Investigating input[name="firstname"] ===');
  const firstNameInput = page.locator('input[name="firstname"]');
  const exists = await firstNameInput.count() > 0;
  console.log('  Exists:', exists);

  if (exists) {
    const visible = await firstNameInput.isVisible();
    const enabled = await firstNameInput.isEnabled();
    console.log('  Visible:', visible);
    console.log('  Enabled:', enabled);
  } else {
    console.log('  Element NOT FOUND. Checking alternative selectors...');

    // Check for any input fields
    const allInputs = await page.locator('input').count();
    console.log('\n  Total input elements found:', allInputs);

    // List all input attributes
    console.log('\n  Input attributes found:');
    const inputs = await page.locator('input[type="text"], input[type="password"]').all();
    for (let i = 0; i < inputs.length; i++) {
      const name = await inputs[i].getAttribute('name');
      const placeholder = await inputs[i].getAttribute('placeholder');
      const type = await inputs[i].getAttribute('type');
      const id = await inputs[i].getAttribute('id');
      const ariaLabel = await inputs[i].getAttribute('aria-label');
      const isVisible = await inputs[i].isVisible();
      console.log(`    [${i}] type="${type}", visible=${isVisible}`);
      console.log(`         name="${name}", id="${id}"`);
      console.log(`         placeholder="${placeholder}"`);
      console.log(`         aria-label="${ariaLabel}"`);
    }

    // Check for label elements
    console.log('\n  Checking for label elements:');
    const labels = await page.locator('label').all();
    console.log(`    Total labels found: ${labels.length}`);
    for (let i = 0; i < Math.min(labels.length, 10); i++) {
      const text = await labels[i].textContent();
      const htmlFor = await labels[i].getAttribute('for');
      console.log(`    [${i}] text="${text}", for="${htmlFor}"`);
    }

    // Check getByLabel approach
    console.log('\n  Testing label-based selectors:');
    const labelTests = ['First name', 'Surname', 'Mobile number or email', 'New password'];
    for (const label of labelTests) {
      const count = await page.getByLabel(label, { exact: false }).count();
      if (count > 0) {
        console.log(`    ✅ Found: label="${label}" (count: ${count})`);
      }
    }

    // Check role-based approach
    console.log('\n  Testing role-based textbox selectors:');
    const textboxes = await page.getByRole('textbox').all();
    console.log(`    Total textboxes found: ${textboxes.length}`);
    for (let i = 0; i < textboxes.length; i++) {
      const name = await textboxes[i].getAttribute('name');
      const visible = await textboxes[i].isVisible();
      console.log(`    [${i}] name="${name}", visible=${visible}`);
    }

    // Try index-based approach (most reliable when no attributes)
    console.log('\n  Testing index-based selection:');
    const firstInput = page.locator('input[type="text"]').nth(0);
    const firstExists = await firstInput.count() > 0;
    console.log(`    input[type="text"].nth(0) exists: ${firstExists}`);
    if (firstExists) {
      const firstVisible = await firstInput.isVisible();
      console.log(`    input[type="text"].nth(0) visible: ${firstVisible}`);
    }
  }

  await page.waitForTimeout(5000);
  await browser.close();
})();
