import { defineConfig, devices } from '@playwright/test';

/**
 * Per-run timestamped output dir (AH Rule 31).
 *
 * Playwright clears its outputDir at the START of every invocation - before
 * globalSetup runs, so archiving from a hook is impossible. Instead each run
 * gets its OWN folder, so no run can ever destroy another run's evidence and
 * results stay comparable across executions.
 *
 * Override with RUN_ID to group runs: RUN_ID=baseline npm test
 */
const RUN_ID = (() => {
  // Workers re-evaluate this module, so a bare new Date() yields a DIFFERENT
  // folder per process. Stamp it once into the env and let workers inherit it.
  if (!process.env.PW_RUN_ID) {
    process.env.PW_RUN_ID =
      process.env.RUN_ID ||
      new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
  }
  return process.env.PW_RUN_ID;
})();

export default defineConfig({
  testDir: './tests',
  outputDir: `test-results/${RUN_ID}`,    // AH Rule 31 - never overwritten by a later run
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30000,

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: `playwright-report/${RUN_ID}` }],
    ['json', { outputFile: `test-results/${RUN_ID}/results.json` }],
    // Allure - per-run results dir so `allure generate` can build cross-run trends.
    // Consumed by /test-closure for the coverage table + evidence links.
    ['allure-playwright', {
      resultsDir: `allure-results/${RUN_ID}`,
      environmentInfo: {
        RUN_ID,
        baseURL: 'http://localhost:7000',
        mode: 'headed',
      },
    }],
  ],

  use: {
    baseURL: 'http://localhost:7000',
    headless: false,              // AH Rule 17 - headed mode mandatory
    screenshot: 'on',             // capture PASS and FAIL
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 10000,
    launchOptions: {
      slowMo: 300,                // demo readability
    },
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
