const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Navigating to Facebook...');
    await page.goto('https://www.facebook.com', { waitUntil: 'domcontentloaded' });

    console.log('\n=== FACEBOOK LOGIN PAGE DOM INSPECTION ===\n');

    // Check email input
    console.log('EMAIL INPUT:');
    const emailInput = await page.locator('input[name="email"]').first();
    const emailAttrs = await emailInput.evaluate(el => ({
      id: el.id,
      name: el.name,
      type: el.type,
      placeholder: el.placeholder,
      autocomplete: el.autocomplete
    }));
    console.log(JSON.stringify(emailAttrs, null, 2));

    // Check password input
    console.log('\nPASSWORD INPUT:');
    const passwordInput = await page.locator('input[name="pass"]').first();
    const passAttrs = await passwordInput.evaluate(el => ({
      id: el.id,
      name: el.name,
      type: el.type,
      placeholder: el.placeholder
    }));
    console.log(JSON.stringify(passAttrs, null, 2));

    // Check login button - try multiple selectors
    console.log('\nLOGIN BUTTON:');
    let loginBtn;
    try {
      loginBtn = await page.locator('button[type="submit"]').first();
      const btnAttrs = await loginBtn.evaluate(el => ({
        name: el.name,
        type: el.type,
        textContent: el.textContent.trim(),
        value: el.value,
        dataTestid: el.getAttribute('data-testid')
      }));
      console.log(JSON.stringify(btnAttrs, null, 2));
    } catch (e) {
      console.log('Submit button not found, trying getByRole...');
      const btnText = await page.getByRole('button').first().textContent();
      console.log(`First button text: ${btnText}`);
    }

    // Check for forgot password link
    console.log('\nFORGOT PASSWORD LINK:');
    const forgotLink = await page.locator('a:has-text("Forgot")').first();
    const forgotText = await forgotLink.textContent();
    const forgotHref = await forgotLink.getAttribute('href');
    console.log(`Text: ${forgotText}`);
    console.log(`Href: ${forgotHref}`);

    // Check for create account button
    console.log('\nCREATE ACCOUNT BUTTON:');
    const createBtn = await page.locator('a[role="button"]:has-text("Create")').first();
    const createText = await createBtn.textContent();
    const createDataTestid = await createBtn.getAttribute('data-testid');
    console.log(`Text: ${createText}`);
    console.log(`data-testid: ${createDataTestid}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
