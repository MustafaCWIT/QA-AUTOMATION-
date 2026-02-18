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
    const testPassword = 'maxen12345';

    // Check if we're already logged in (on dashboard/welcome page)
    const currentUrl = page.url();
    const isAlreadyLoggedIn = currentUrl.includes('/dashboard/');
    
    if (!isAlreadyLoggedIn) {
      // Step 1: Navigate to login page and login
      // (beforeEach already navigated, but ensure we're on login page)
      if (!currentUrl.includes('/auth/login')) {
        await loginPage.goto();
      }
      
      // Step 2: Perform login
      await loginPage.login(testEmail, testPassword);
      
      // Step 3: Wait for navigation to welcome page
      await loginPage.waitForLoginSuccess('/dashboard/welcome');
    } else {
      // Already logged in, just navigate to welcome page if not already there
      if (!currentUrl.includes('/dashboard/welcome')) {
        await page.goto('/dashboard/welcome');
        await page.waitForLoadState('networkidle');
      }
    }
    
    // Step 4: Verify we're on welcome page
    await expect(page).toHaveURL(/.*dashboard\/welcome/);
    
    // Step 5: Click Tickets Manager button from welcome screen
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.clickTicketsManager();
    
    // Step 6: Wait for navigation to tickets manager page
    await dashboardPage.waitForTicketsManagerPage();
    
    // Step 7: Verify we're on tickets manager page (still logged in - no login again)
    await expect(page).toHaveURL(/.*dashboard\/tickets-manager/);
    // Verify we're still logged in (not redirected to login page)
    await expect(page).not.toHaveURL(/.*auth\/login/);
    
    // Step 8: Click + Ticket button in top right corner to open ticket creation form
    // (No login needed - using same session)
    const ticketsManagerPage = new TicketsManagerPage(page);
    await ticketsManagerPage.verifyTicketsManagerPage();
    await ticketsManagerPage.clickAddTicket();
    
    // Step 9: Verify ticket creation form is open
    await ticketsManagerPage.waitForTicketForm();
    await ticketsManagerPage.verifyTicketFormOpen();
  });

  /**
   * Test to login with all provided email addresses
   * NOTE: This test uses { browser } fixture to create fresh contexts without saved authentication state.
   * The auth.setup.js runs before all tests and logs in with credentials from test-data.js,
   * but this test explicitly creates new browser contexts without that saved state to test each email independently.
   * 
   * Timeout set to 30 minutes (1800000ms) to allow testing all 214 emails in batches.
   */
  test('should login with all provided email addresses', async ({ browser }) => {
    test.setTimeout(1800000); // 30 minutes - enough time for 214 emails in batches
    const testData = require('../utils/test-data');
    const password = 'maxen12345';
    const emails = [
     "sohaib.javaid@maxenpower.com",
      "testreads@maxenpower.com",
      "muhammad.usman@maxenpower.com",
      "tahir.feroz@maxenpower.com",
      "monitor.two@recovery.com",
      "abdul@gmail.com",
      "farhan@maxenpower.com",
      "izza.humayun@maxenpower.com",
      "madiha.hashmi@maxenpower.com",
      "nimra.waqar@maxenpower.com",
      "hanzala.khubaib@maxenpower.com",
      "hamna.shoukat@maxenpower.com",
      "yahya.usman@maxenpower.com",
      "zaheer.iqbal@maxenpower.com",
      "hassan.butt@maxenpower.com",
      "fatima.kafayat@maxenpower.com",
      "te@i",
      "bakar.hassan@maxenpower.com",
      "humza.humayun@maxenpower.com",
      "maham.akram@maxenpower.com",
      "waqar.ahmad@maxenpower.com",
      "tehreem.khan@maxenpower.com",
      "komal.shahid@maxenpower.com"
    ];

    const results = {
      successful: [],
      failed: []
    };

    // Function to test login for a single email (runs in parallel)
    const testLoginForEmail = async (email, index) => {
      let context;
      let page;
      
      try {
        console.log(`[${index + 1}/${emails.length}] Starting login test for: ${email}`);
        
        // Add significant stagger delay to avoid overwhelming server with simultaneous requests
        // Stagger by 200ms per email to spread load over ~42 seconds for 214 emails
        // This prevents ERR_CONNECTION_REFUSED errors from too many parallel connections
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, index * 200));
        }
        
        // Create a new browser context for this email (isolated session)
        // Explicitly set storageState to undefined to ensure no saved authentication is used
        // Enable video recording for debugging login issues
        context = await browser.newContext({
          baseURL: testData.urls.baseUrl,
          storageState: undefined,  // Don't use saved authentication state - test each email independently
          recordVideo: {
            dir: 'test-results/videos/', // Save videos in test-results/videos directory
            size: { width: 1280, height: 720 } // Standard HD resolution
          }
        });
        page = await context.newPage();
        
        // Create page objects for this context
        const loginPage = new LoginPage(page);
        
        // Navigate to login page
        await loginPage.goto();
        
        // Perform login
        await loginPage.login(email, password);
        
        // Wait for login redirect with proper timeout (like the working test)
        let loginSuccessful = false;
        try {
          // Wait for redirect to dashboard (any dashboard route) - same as auth.setup.js
          await page.waitForURL(/\/dashboard/, { timeout: 30000 });
          loginSuccessful = true;
        } catch (error) {
          // Wait a moment for any error messages to appear
          await page.waitForTimeout(1000);
          
          // Check if there's an error message on the page
          const errorMessage = await loginPage.getErrorMessage().catch(() => null);
          const currentUrl = page.url();
          
          if (errorMessage) {
            throw new Error(`Login failed: ${errorMessage}`);
          }
          
          // If still on login page, provide more context
          if (currentUrl.includes('/auth/login')) {
            // Check if form is still visible (login didn't process)
            const emailInput = await page.locator('input#email, input[type="email"]').isVisible().catch(() => false);
            if (emailInput) {
              throw new Error('Login failed - still on login page. Possible reasons: invalid credentials, account locked, or server error.');
            } else {
              throw new Error('Login timeout - page did not redirect after 30 seconds');
            }
          }
          
          // If we're somewhere else, might have redirected but not to dashboard
          throw new Error(`Login did not redirect to dashboard. Current URL: ${currentUrl}. Original error: ${error.message}`);
        }
        
        const finalUrl = page.url();
        if (loginSuccessful && (finalUrl.includes('/dashboard/') || finalUrl.includes('/welcome'))) {
          // Login successful
          console.log(`  ✅ [${index + 1}/${emails.length}] Login successful for ${email}`);
          
          try {
            // Step 1: Navigate to welcome page if not already there
            if (!finalUrl.includes('/dashboard/welcome')) {
              await page.goto('/dashboard/welcome');
              await page.waitForLoadState('networkidle');
            }
            
            // Step 2: Verify we're on welcome page
            await expect(page).toHaveURL(/.*dashboard\/welcome/);
            console.log(`  ✅ [${index + 1}/${emails.length}] Navigated to welcome page for ${email}`);
            
            // Step 3: Navigate directly to tickets-manager page
            await page.goto('http://46.62.211.210:4003/dashboard/tickets-manager', { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForLoadState('networkidle').catch(() => {});
            console.log(`  ✅ [${index + 1}/${emails.length}] Navigated to tickets manager for ${email}`);
            
            // Step 4: Verify we're on tickets manager page
            await expect(page).toHaveURL(/.*dashboard\/tickets-manager/);
            
            // Step 5: Refresh the page two times
            console.log(`  🔄 [${index + 1}/${emails.length}] Refreshing tickets manager page (1/2) for ${email}`);
            await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForLoadState('networkidle').catch(() => {});
            
            // Wait 10 seconds between refreshes
            console.log(`  ⏳ [${index + 1}/${emails.length}] Waiting 10 seconds before second refresh for ${email}`);
            await page.waitForTimeout(10000);
            
            console.log(`  🔄 [${index + 1}/${emails.length}] Refreshing tickets manager page (2/2) for ${email}`);
            await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForLoadState('networkidle').catch(() => {});
            await page.waitForTimeout(1000);
            
            // Step 6: Verify still on tickets manager page after refreshes
            await expect(page).toHaveURL(/.*dashboard\/tickets-manager/);
            console.log(`  ✅ [${index + 1}/${emails.length}] Successfully refreshed tickets manager 2x for ${email}`);
            
            // Mark as successful
            results.successful.push(email);
            
          } catch (navError) {
            // Login was successful but navigation to tickets manager failed
            results.failed.push({ email, reason: `Navigation failed: ${navError.message}` });
            console.log(`  ⚠️  [${index + 1}/${emails.length}] Login successful but navigation failed for ${email}: ${navError.message}`);
          }
        } else {
          // Login failed - still on login page
          results.failed.push({ email, reason: 'Still on login page after login attempt' });
          console.log(`  ❌ [${index + 1}/${emails.length}] Login failed for ${email} - still on login page`);
        }
      } catch (error) {
        results.failed.push({ email, reason: error.message });
        console.log(`  ❌ [${index + 1}/${emails.length}] Login failed for ${email}: ${error.message}`);
      } finally {
        // Close the context (this will also close the page)
        if (context) {
          await context.close();
        }
      }
    };

    // Run logins in batches to avoid overwhelming server with too many simultaneous connections
    // Process emails in batches of 10 to prevent ERR_CONNECTION_REFUSED errors
    const BATCH_SIZE = 20;
    const batches = [];
    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      batches.push(emails.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`\n🚀 Starting login tests for ${emails.length} emails in ${batches.length} batches of ${BATCH_SIZE}...`);
    console.log(`📝 Note: This test creates fresh browser contexts without saved authentication state.`);
    console.log(`📝 Each email will be tested independently with a clean session.`);
    console.log(`📝 Batching prevents server overload and connection refused errors.\n`);
    const startTime = Date.now();
    
    // Process batches sequentially, but emails within each batch in parallel
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchStartIndex = batchIndex * BATCH_SIZE;
      
      console.log(`\n📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} emails)...`);
      
      await Promise.all(
        batch.map((email, batchEmailIndex) => {
          const globalIndex = batchStartIndex + batchEmailIndex;
          return testLoginForEmail(email, globalIndex);
        })
      );
      
      // Small delay between batches to let server recover
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2s pause between batches
      }
    }
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('LOGIN TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total emails tested: ${emails.length}`);
    console.log(`Successful logins: ${results.successful.length}`);
    console.log(`Failed logins: ${results.failed.length}`);
    console.log(`Total duration: ${duration} seconds`);
    console.log(`Average time per login: ${(duration / emails.length).toFixed(2)} seconds`);
    console.log('\nSuccessful emails:');
    results.successful.forEach(email => console.log(`  ✅ ${email}`));
    console.log('\nFailed emails:');
    results.failed.forEach(({ email, reason }) => console.log(`  ❌ ${email} - ${reason}`));
    console.log('='.repeat(60));

    // Assert that at least some logins were successful (adjust threshold as needed)
    expect(results.successful.length).toBeGreaterThan(0);
  });
});

