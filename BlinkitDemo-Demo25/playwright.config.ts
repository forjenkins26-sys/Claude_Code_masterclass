import { defineConfig, devices } from '@playwright/test';

/**
 * RUN_ID keeps each execution's artefacts separate (AH Rule 31) — test-results/
 * is wiped on EVERY invocation, including one that matches zero tests.
 */
const RUN_ID = (() => {
  // Workers re-evaluate this module, so a bare new Date() would yield a
  // DIFFERENT folder per worker. Stamp it once and let workers inherit it.
  if (!process.env.PW_RUN_ID) {
    process.env.PW_RUN_ID =
      process.env.RUN_ID ||
      new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
  }
  return process.env.PW_RUN_ID;
})();

export default defineConfig({
  testDir: './tests',
  outputDir: `test-results/${RUN_ID}`,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 7_000 },

  reporter: [
    ['list'],
    ['html', { outputFolder: `playwright-report/${RUN_ID}`, open: 'never' }],
    ['json', { outputFile: `test-results/${RUN_ID}/results.json` }],
    // Allure — per-run results dir so `allure generate` can build cross-run trends.
    // REQUIRED by /test-closure Step 4B: closure attaches this as the evidence report.
    // Consumed as EVIDENCE only — progress.md stays the pass/fail oracle.
    ['allure-playwright', {
      resultsDir: `allure-results/${RUN_ID}`,
      environmentInfo: {
        RUN_ID,
        BASE_URL: process.env.BASE_URL ?? 'https://blinkit-demo-qa.vercel.app',
        mode: 'headed',
      },
    }],
  ],

  use: {
    // AH Rule 17 — headed mode is mandatory. Never flip this to true.
    headless: false,
    baseURL: process.env.BASE_URL ?? 'https://blinkit-demo-qa.vercel.app',
    screenshot: 'on',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    viewport: { width: 1536, height: 864 },
    ignoreHTTPSErrors: true,
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
