/**
 * fetch-local-page.js
 *
 * Playwright-based page analyzer for localhost/local URLs.
 * Replaces WebFetch for local pages — launches real browser, extracts live DOM.
 *
 * Usage (from "Playwright Automation Framework" directory):
 *   node scripts/fetch-local-page.js http://localhost:7000/blinkit-login.html
 *
 * Output: JSON with full page analysis (fields, buttons, links, text, structure)
 */

const { chromium } = require('@playwright/test');

const url = process.argv[2];

if (!url) {
  console.error('Usage: node scripts/fetch-local-page.js <url>');
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle' });

    const analysis = await page.evaluate(() => {
      // Page title
      const title = document.title;
      const heading = document.querySelector('h1, h2, h3')?.textContent?.trim() || '';

      // All input fields with labels
      const inputs = Array.from(document.querySelectorAll('input, textarea, select')).map(el => {
        const id = el.id;
        const label = id
          ? document.querySelector(`label[for="${id}"]`)?.textContent?.trim()
          : el.closest('div, label')?.querySelector('label')?.textContent?.trim();
        return {
          tag: el.tagName.toLowerCase(),
          type: el.type || null,
          name: el.name || null,
          id: el.id || null,
          placeholder: el.placeholder || null,
          ariaLabel: el.getAttribute('aria-label') || null,
          label: label || null,
          required: el.required,
          maxLength: el.maxLength > 0 ? el.maxLength : null,
        };
      });

      // All buttons and links acting as buttons
      const buttons = Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]')).map(el => ({
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.trim() || el.value || null,
        id: el.id || null,
        type: el.type || null,
        disabled: el.disabled || false,
        ariaLabel: el.getAttribute('aria-label') || null,
        hasOnclick: el.onclick !== null || el.getAttribute('onclick') !== null,
      }));

      // All links
      const links = Array.from(document.querySelectorAll('a')).map(el => ({
        text: el.textContent?.trim(),
        href: el.href,
        id: el.id || null,
      }));

      // Form structure
      const forms = Array.from(document.forms).map(form => ({
        id: form.id || null,
        action: form.action || null,
        method: form.method || null,
        fieldCount: form.elements.length,
      }));

      // Visible text content (headings + labels + taglines)
      const textContent = Array.from(document.querySelectorAll('h1,h2,h3,h4,p,label'))
        .map(el => el.textContent?.trim())
        .filter(t => t && t.length > 0 && t.length < 200);

      // Error/validation elements
      const errorElements = Array.from(document.querySelectorAll('[class*="error"], [role="alert"], .error-msg')).map(el => ({
        text: el.textContent?.trim(),
        id: el.id || null,
        selector: el.id ? `#${el.id}` : `.${el.className.split(' ')[0]}`,
      }));

      return { title, heading, inputs, buttons, links, forms, textContent, errorElements };
    });

    // Generate Playwright-recommended locators
    const suggestions = [];

    for (const input of analysis.inputs) {
      if (input.label)       suggestions.push(`page.getByLabel('${input.label}')`);
      else if (input.placeholder) suggestions.push(`page.getByPlaceholder('${input.placeholder}')`);
      else if (input.id)     suggestions.push(`page.locator('#${input.id}')`);
    }

    for (const btn of analysis.buttons) {
      if (btn.text) suggestions.push(`page.getByRole('button', { name: '${btn.text}' })`);
    }

    for (const link of analysis.links) {
      if (link.text) suggestions.push(`page.getByRole('link', { name: '${link.text}' })`);
    }

    const result = {
      url,
      analysis,
      suggestedLocators: [...new Set(suggestions)],
    };

    console.log(JSON.stringify(result, null, 2));

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
