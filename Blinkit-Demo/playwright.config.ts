import { defineConfig, devices } from '@playwright/test';

/**
 * Client demo E2E config.
 *
 * RUN_ID keeps each execution's artefacts separate (AH Rule 31) — test-results/
 * is wiped on EVERY invocation, including one that matches zero tests, so a
 * second run would otherwise destroy the first run's evidence before it is
 * harvested.
 */
const RUN_ID = (() => {
  // Workers re-evaluate this module, so a bare new Date() would yield a
  // DIFFERENT folder per worker process. Stamp it once into the env and let
  // every worker inherit the same value.
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
  ],

  use: {
    // AH Rule 17 — headed mode is mandatory. Never flip this to true.
    headless: false,
    baseURL: process.env.BASE_URL ?? 'https://blinkit-demo-qa.vercel.app',
    screenshot: 'on',            // PASS and FAIL both need evidence
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    viewport: { width: 1536, height: 864 },
    ignoreHTTPSErrors: true,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
