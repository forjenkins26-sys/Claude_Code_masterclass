import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  globalSetup: './src/global-setup',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
    ['allure-playwright', { outputFolder: 'allure-results' }],
  ],
  use: {
    baseURL: 'https://www.facebook.com',
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    // Blinkit — no auth setup required.
    // Target is switchable: BLINKIT_BASE_URL picks local demo vs deployed build,
    // so the same suite can be run against either without editing the POM.
    {
      name: 'blinkit',
      testMatch: /blinkit.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.BLINKIT_BASE_URL ?? 'http://localhost:7000',
        viewport: { width: 1536, height: 864 },
      },
    },
    // Facebook tests — require auth setup
    {
      name: 'chromium',
      testIgnore: /blinkit.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1536, height: 864 },
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      testIgnore: /blinkit.*\.spec\.ts/,
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      testIgnore: /blinkit.*\.spec\.ts/,
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
      dependencies: ['setup'],
    },
  ],

  outputDir: 'test-results/',
});
