import { Page, Locator, Route } from '@playwright/test';

// VERIFIED: 2026-09-15 via fetch-local-page.js against http://localhost:7000/blinkit-products.html
//
// The page fetches its catalogue from api/products.json on load, so the loading,
// error and empty states below are real states the page can be in — not simulated
// ones. Tests drive them by intercepting that request.
export class BlinkitProductsPage {
  readonly page: Page;

  /** Glob matching the catalogue request — used with page.route() to force states. */
  static readonly PRODUCTS_API_GLOB = '**/api/products.json';

  readonly searchInput: Locator;
  readonly cartButton: Locator;
  readonly logoutButton: Locator;
  readonly productGrid: Locator;
  readonly productCards: Locator;
  readonly sectionTitle: Locator;
  readonly userGreeting: Locator;

  // States driven by the catalogue fetch
  readonly loadingMessage: Locator;
  readonly errorBanner: Locator;
  readonly retryButton: Locator;
  readonly emptyMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // VERIFIED: <input id="searchInput" placeholder="🔍  Search for groceries...">
    this.searchInput = page.locator('#searchInput');
    // VERIFIED: <button id="cartBtn" onclick="toggleCart()">🛒 Cart 0</button>
    this.cartButton = page.locator('#cartBtn');
    // VERIFIED: <button onclick="logout()">Logout</button> — no id, matched by role+name
    this.logoutButton = page.getByRole('button', { name: 'Logout' });

    // VERIFIED: <div class="product-grid" id="productGrid"></div> — filled by renderProducts()
    this.productGrid = page.locator('#productGrid');
    // VERIFIED: renderProducts() emits <div class="product-card" id="card-${p.id}">
    this.productCards = page.locator('.product-card');
    // VERIFIED: <div class="section-title" id="sectionTitle">
    this.sectionTitle = page.locator('#sectionTitle');
    // VERIFIED: <span class="user-greeting" id="userGreeting">
    this.userGreeting = page.locator('#userGreeting');

    // VERIFIED: loadProducts() renders these ids into #productGrid per fetch outcome
    this.loadingMessage = page.locator('#productsLoading');
    this.errorBanner = page.locator('#productsError');
    this.retryButton = page.locator('#retryProducts');
    // VERIFIED: renderProducts() empty branch → 'No products found.'
    this.emptyMessage = page.getByText('No products found.');
  }

  async navigate(): Promise<void> {
    // Mirrors BlinkitLoginPage: path resolves against the project baseURL so the
    // same POM runs against the local demo server and a deployed build.
    const productsPath = process.env.BLINKIT_PRODUCTS_PATH ?? '/blinkit-products.html';
    await this.page.goto(productsPath);
    await this.page.waitForLoadState('domcontentloaded');
  }

  // ─── Catalogue state control ───────────────────────────────────────────────
  // Each helper must be called BEFORE navigate(), so the route is registered
  // before the request it intercepts is made.

  /** Force the catalogue request to fail with an HTTP status. */
  async stubProductsFailure(status = 500): Promise<void> {
    await this.page.route(BlinkitProductsPage.PRODUCTS_API_GLOB, (route: Route) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'catalogue unavailable' }),
      }),
    );
  }

  /** Force the catalogue to come back empty — a valid 200 with no products. */
  async stubProductsEmpty(): Promise<void> {
    await this.page.route(BlinkitProductsPage.PRODUCTS_API_GLOB, (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );
  }

  /** Serve a caller-supplied catalogue, to pin the exact products under test. */
  async stubProducts(products: unknown[]): Promise<void> {
    await this.page.route(BlinkitProductsPage.PRODUCTS_API_GLOB, (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(products),
      }),
    );
  }

  /** Simulate a dropped connection rather than an HTTP error response. */
  async abortProductsRequest(): Promise<void> {
    await this.page.route(BlinkitProductsPage.PRODUCTS_API_GLOB, (route: Route) => route.abort());
  }

  /**
   * Fail the catalogue request the first time, then let it through — so a test
   * can prove the Retry button actually recovers.
   */
  async stubProductsFailingOnce(status = 500): Promise<void> {
    let failed = false;
    await this.page.route(BlinkitProductsPage.PRODUCTS_API_GLOB, (route: Route) => {
      if (!failed) {
        failed = true;
        return route.fulfill({
          status,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'catalogue unavailable' }),
        });
      }
      return route.continue();
    });
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  async clickRetry(): Promise<void> {
    await this.retryButton.click();
  }

  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
  }

  async selectCategory(name: string): Promise<void> {
    await this.page.getByRole('button', { name }).click();
  }

  async getProductCount(): Promise<number> {
    return await this.productCards.count();
  }

  async getErrorText(): Promise<string> {
    return (await this.errorBanner.textContent()) || '';
  }
}
