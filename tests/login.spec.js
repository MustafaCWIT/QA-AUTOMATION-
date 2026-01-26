const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { DashboardPage } = require('../pages/DashboardPage');
const { TicketsManagerPage } = require('../pages/TicketsManagerPage');

test.describe('Login Page Tests', () => {
  let loginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should display login page elements', async ({ page }) => {
    await loginPage.verifyLoginPage();
  });

  test('should show email and password fields', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
  });

  test('should allow entering email and password', async ({ page }) => {
    const testEmail = 'saima@maxenpower.com';
    const testPassword = 'Maxen12345@';

    await loginPage.enterEmail(testEmail);
    await loginPage.enterPassword(testPassword);

    // Verify values are entered
    await expect(page.locator('input[type="email"]')).toHaveValue(testEmail);
    await expect(page.locator('input[type="password"]')).toHaveValue(testPassword);
  });

  test('should attempt login with invalid credentials', async ({ page }) => {
    await loginPage.login('invalid@example.com', 'wrongpassword');
    
    // Wait for response or error message
    await page.waitForTimeout(2000);
    
    // Check if still on login page or error message appears
    // Adjust based on actual behavior
    const currentUrl = page.url();
    expect(currentUrl).toContain('/auth/login');
  });

  test('should validate required fields', async ({ page }) => {
    // Try to submit without filling fields
    await loginPage.clickLogin();
    
    // Check for validation messages (adjust selectors based on actual implementation)
    await page.waitForTimeout(1000);
    
    // Verify page is still on login (form validation prevented submission)
    expect(page.url()).toContain('/auth/login');
  });

  test('should navigate to login page successfully', async ({ page }) => {
    await expect(page).toHaveURL(/.*auth\/login/);
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('should successfully login and navigate to tickets manager', async ({ page }) => {
    const testEmail = 'saima@maxenpower.com';
    const testPassword = 'Maxen12345@';

    // Step 1: Login once
    await loginPage.login(testEmail, testPassword);
    
    // Step 2: Wait for navigation to welcome page
    await loginPage.waitForLoginSuccess('/dashboard/welcome');
    
    // Step 3: Verify we're on welcome page
    await expect(page).toHaveURL('http://46.62.211.210:4003/dashboard/welcome');
    
    // Step 4: Click Tickets Manager button from welcome screen (no login again)
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.clickTicketsManager();
    
    // Step 5: Wait for navigation to tickets manager page
    await dashboardPage.waitForTicketsManagerPage();
    
    // Step 6: Verify we're on tickets manager page (still logged in - no login again)
    await expect(page).toHaveURL('http://46.62.211.210:4003/dashboard/tickets-manager');
    // Verify we're still logged in (not redirected to login page)
    await expect(page).not.toHaveURL(/.*auth\/login/);
    
    // Step 7: Click + Ticket button in top right corner to open ticket creation form
    // (No login needed - using same session from Step 1)
    const ticketsManagerPage = new TicketsManagerPage(page);
    await ticketsManagerPage.verifyTicketsManagerPage();
    await ticketsManagerPage.clickAddTicket();
    
    // Step 8: Verify ticket creation form is open
    await ticketsManagerPage.waitForTicketForm();
    await ticketsManagerPage.verifyTicketFormOpen();
  });
});

