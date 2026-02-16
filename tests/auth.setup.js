const playwright = require('@playwright/test');
const { test: setup, expect } = playwright;
const { LoginPage } = require('../pages/LoginPage');
const testData = require('../utils/test-data');
const path = require('path');

/**
 * Authentication Setup
 * 
 * This file runs once before all tests to authenticate and save the session.
 * All tests can then use this saved authentication state instead of logging in each time.
 * 
 * This is more reliable than logging in before each test, especially when tests run in parallel.
 */

const authFile = path.join(__dirname, '../.auth/user.json');

setup('authenticate', async ({ page }) => {
  // Step 1: Navigate to login page
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  
  // Step 2: Verify login form is visible
  await page.waitForSelector('input#email, input[type="email"]', { timeout: 10000 });
  
  // Step 3: Perform login using updated selectors
  await loginPage.login(
    testData.credentials.valid.email,
    testData.credentials.valid.password
  );
  
  // Step 4: Wait for redirect to dashboard (any dashboard route)
  await page.waitForURL(/\/dashboard/, { timeout: 30000 });
  
  // Step 5: Verify we're actually logged in (not on login page)
  const currentUrl = page.url();
  if (currentUrl.includes('/auth/login')) {
    throw new Error('Authentication setup failed - still on login page. URL: ' + currentUrl);
  }
  
  // Step 6: Verify we're on dashboard (accept any dashboard route)
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  
  // Step 7: Verify dashboard content is visible
  await expect(page.locator('body')).toContainText(/dashboard|timesheet|welcome/i, { timeout: 10000 });
  
  // Step 8: Wait for network to be idle to ensure session is fully established
  try {
    await page.waitForLoadState('networkidle', { timeout: 5000 });
  } catch (e) {
    // If networkidle times out, that's okay - continue with domcontentloaded
    await page.waitForLoadState('domcontentloaded');
  }
  
  // Step 9: Save authentication state to file
  await page.context().storageState({ path: authFile });
  
  console.log(`✅ [SETUP] Authentication successful for ${testData.credentials.valid.email} - session saved to ${authFile}`);
  console.log(`📝 [SETUP] Note: This saved session will be used by tests that don't explicitly create fresh contexts.`);
  console.log(`📝 [SETUP] Tests using { browser } fixture with storageState: undefined will create fresh sessions.\n`);
});

