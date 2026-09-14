import { test, expect } from '../../src/fixtures/test-fixtures';

/**
 * Blinkit Products Page — Catalogue Load States (BL-020..BL-024)
 *
 * ANTI-HALLUCINATION COMPLIANCE (ANTI-HALLUCINATION-RULES.md):
 * - All locators VERIFIED via fetch-local-page.js (2026-09-15)
 * - All behaviours VERIFIED from blinkit-products.html source (2026-09-15)
 * - Every assertion traceable to verified source — no assumed behaviour
 *
 * VERIFIED FACTS:
 * - Catalogue is fetched from api/products.json on load (16 products in the file)
 * - Success  → .product-card per product, rendered into #productGrid
 * - Failure  → #productsError banner + #retryProducts button, zero cards
 * - Empty [] → 'No products found.' (renderProducts() empty branch)
 * - Retry    → re-invokes loadProducts(), recovers without a page reload
 * - A guard (productsLoaded) stops search/category filters clobbering these states
 *
 * WHY THESE EXIST: the catalogue is a real network request, so these are the
 * page's real failure states. Routes are registered BEFORE navigate() — Playwright
 * only intercepts requests made after the route is installed.
 *
 * Source: http://localhost:7000/blinkit-products.html (Python http.server 7000)
 */
test.describe('Blinkit Products Page Tests', () => {

  // ─── CATALOGUE LOAD — HAPPY PATH ───────────────────────────────────────────

  test.describe('Catalogue Load @smoke', () => {

    test('BL-020: Verify catalogue loads products from the API', async ({ blinkitProductsPage }) => {
      // VERIFIED: api/products.json holds 16 products; renderProducts() emits one card each
      const requests: string[] = [];
      blinkitProductsPage.page.on('request', (req) => {
        if (req.url().includes('api/products.json')) requests.push(req.url());
      });

      await blinkitProductsPage.navigate();

      // The catalogue really is fetched over the network, not inlined in the page
      await expect(blinkitProductsPage.productCards).toHaveCount(16);
      expect(requests.length).toBe(1);
      await expect(blinkitProductsPage.errorBanner).toBeHidden();
    });
  });

  // ─── CATALOGUE FAILURE STATES ──────────────────────────────────────────────

  test.describe('Catalogue Failure States @regression', () => {

    test('BL-021: Verify API 500 shows the error banner and no products', async ({ blinkitProductsPage }) => {
      // VERIFIED: loadProducts() throws on !res.ok → catch renders #productsError
      await blinkitProductsPage.stubProductsFailure(500);
      await blinkitProductsPage.navigate();

      await expect(blinkitProductsPage.errorBanner).toBeVisible();
      await expect(blinkitProductsPage.retryButton).toBeVisible();
      await expect(blinkitProductsPage.productCards).toHaveCount(0);

      // The banner states the failure, so a user is not left with a blank grid
      expect(await blinkitProductsPage.getErrorText()).toContain("Couldn't load products");
    });

    test('BL-022: Verify an empty catalogue shows the no-products message', async ({ blinkitProductsPage }) => {
      // VERIFIED: [] is a valid 200 — renderProducts() empty branch, NOT the error branch
      await blinkitProductsPage.stubProductsEmpty();
      await blinkitProductsPage.navigate();

      await expect(blinkitProductsPage.emptyMessage).toBeVisible();
      await expect(blinkitProductsPage.productCards).toHaveCount(0);
      // An empty catalogue is not an error — the banner must stay hidden
      await expect(blinkitProductsPage.errorBanner).toBeHidden();
    });

    test('BL-023: Verify a dropped connection shows the error banner', async ({ blinkitProductsPage }) => {
      // VERIFIED: an aborted request rejects fetch() → same catch branch as a bad status
      await blinkitProductsPage.abortProductsRequest();
      await blinkitProductsPage.navigate();

      await expect(blinkitProductsPage.errorBanner).toBeVisible();
      await expect(blinkitProductsPage.productCards).toHaveCount(0);
    });
  });

  // ─── RECOVERY ──────────────────────────────────────────────────────────────

  test.describe('Catalogue Recovery @regression', () => {

    test('BL-024: Verify Retry recovers the catalogue after a failure', async ({ blinkitProductsPage }) => {
      // VERIFIED: #retryProducts calls loadProducts() again — recovery without a reload
      await blinkitProductsPage.stubProductsFailingOnce(500);
      await blinkitProductsPage.navigate();

      await expect(blinkitProductsPage.errorBanner).toBeVisible();

      await blinkitProductsPage.clickRetry();

      await expect(blinkitProductsPage.productCards).toHaveCount(16);
      await expect(blinkitProductsPage.errorBanner).toBeHidden();
    });
  });
});
