const playwright = require('@playwright/test');
const { test: setup, expect } = playwright;
const { LoginPage } = require('../pages/LoginPage');
const testData = require('../utils/test-data');
const fs = require('fs');
const path = require('path');

/**
 * Authentication Setup
 *
 * This file runs once before all tests to authenticate and save the session.
 * All tests can then use this saved authentication state instead of logging in each time.
 */

const authFile = path.join(__dirname, '../.auth/user.json');

async function saveSession(context) {
  await context.storageState({ path: authFile });
}

async function verifyWelcomeDashboard(page, loginPage) {
  await loginPage.handlePostLoginModals();
  await expect(page).toHaveURL(/\/dashboard\/welcome/, { timeout: 10000 });
  await expect(page.getByRole('heading', { name: 'Welcome Dashboard' })).toBeVisible({ timeout: 30000 });
}

async function tryReuseSavedSession(browser) {
  if (!fs.existsSync(authFile)) {
    return false;
  }

  const context = await browser.newContext({ storageState: authFile });
  const page = await context.newPage();
  const loginPage = new LoginPage(page);

  try {
    await page.goto('/dashboard/welcome', { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!page.url().includes('/dashboard/welcome')) {
      return false;
    }

    await verifyWelcomeDashboard(page, loginPage);
    await saveSession(context);
    console.log(`✅ [SETUP] Reused existing session for ${testData.credentials.valid.email}`);
    return true;
  } catch {
    return false;
  } finally {
    await context.close();
  }
}

async function signOutSavedSession(browser) {
  if (!fs.existsSync(authFile)) {
    return;
  }

  const context = await browser.newContext({ storageState: authFile });
  const page = await context.newPage();

  try {
    await page.goto('/api/auth/signout', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const signOutButton = page.locator('button:has-text("Sign out"), form button[type="submit"]');
    if (await signOutButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await signOutButton.first().click({ force: true });
      await page.waitForLoadState('domcontentloaded').catch(() => {});
    }
  } finally {
    await context.close();
  }
}

setup('authenticate', async ({ browser }) => {
  setup.setTimeout(120000);

  if (await tryReuseSavedSession(browser)) {
    return;
  }

  const context = await browser.newContext();
  const page = await context.newPage();
  const loginPage = new LoginPage(page);

  const performLogin = async () => {
    await loginPage.login(
      testData.credentials.valid.email,
      testData.credentials.valid.password
    );
    await loginPage.waitForLoginSuccess('/dashboard/welcome', { timeout: 90000 });
    await verifyWelcomeDashboard(page, loginPage);
  };

  let loggedIn = false;
  for (let attempt = 0; attempt < 3 && !loggedIn; attempt++) {
    if (attempt > 0) {
      await signOutSavedSession(browser);
      await loginPage.clearExistingSession();
      await page.waitForTimeout(5000);
    } else {
      await loginPage.clearExistingSession();
    }

    await loginPage.goto();
    await page.waitForSelector('input#email, input[type="email"]', { timeout: 10000 });

    try {
      await performLogin();
      loggedIn = true;
    } catch (error) {
      if (error.message !== 'ACTIVE_SESSION_EXISTS' || attempt === 2) {
        throw error;
      }
      console.log('⚠️ [SETUP] Active session detected, retrying after sign-out/wait...');
    }
  }

  try {
    await page.waitForLoadState('networkidle', { timeout: 5000 });
  } catch {
    await page.waitForLoadState('domcontentloaded');
  }

  await saveSession(context);
  await context.close();

  console.log(`✅ [SETUP] Authentication successful for ${testData.credentials.valid.email} - session saved to ${authFile}`);
});
