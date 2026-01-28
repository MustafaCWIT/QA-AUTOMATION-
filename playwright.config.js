// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: false, // Disabled - run tests sequentially to avoid server overload
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry failed tests */
  retries: process.env.CI ? 2 : 1, // Enable retries locally too (1 retry) for flaky tests
  /* Run tests sequentially (one at a time) to avoid overwhelming remote server */
  workers: 1, // Sequential execution - one test at a time
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://46.62.211.210:4003',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'on',
    /* Increase timeout for navigation and actions */
   
  },
  
  /* Global timeout for each test */
  timeout: 60000,


  /* Configure projects for major browsers */
  projects: [
    // Setup project - runs once to authenticate and save session
    {
      name: 'setup',
      testMatch: /.*\.setup\.js/,
    },
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Use saved authentication state from setup
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // Temporarily disabled - Firefox/WebKit installation issues
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});

