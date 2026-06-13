import { defineConfig } from '@playwright/test';
import { config } from './src/01_config/config';

export default defineConfig({
  testDir: './tests',
  timeout: config.timeout,
  use: {
    baseURL: config.baseURL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  },
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list']
  ],
  projects: [
    { name: 'api-tests' }
  ]
});
