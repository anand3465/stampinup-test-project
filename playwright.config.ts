import { defineConfig } from '@playwright/test';

export default defineConfig({
  timeout: 60000,
  retries: 1,
  testDir: './tests',
  reporter: [['html'], ['list']],

  use: {
    baseURL: 'https://www.stampinup.com',
    headless: false,
    trace: 'on-first-retry'
  },

  projects: [
    // Runs once to generate storageState JSON files
    {
      name: 'setup',
      testMatch: /tests\/setup\/.*\.setup\.ts/
    },

    // Runs API tests once (not per browser)
    {
      name: 'api',
      testMatch: /tests\/api\/.*\.spec\.ts/
    },

    // UI tests per browser (depend on setup)
    {
      name: 'chromium',
      testMatch: /tests\/ui\/.*\.spec\.ts/,
      use: { browserName: 'chromium' },
      dependencies: ['setup']
    },
    {
      name: 'firefox',
      testMatch: /tests\/ui\/.*\.spec\.ts/,
      use: { browserName: 'firefox' },
      dependencies: ['setup']
    },
    {
      name: 'webkit',
      testMatch: /tests\/ui\/.*\.spec\.ts/,
      use: { browserName: 'webkit' },
      dependencies: ['setup']
    }
  ]
});