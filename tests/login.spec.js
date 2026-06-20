const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { DashboardPage } = require('../pages/DashboardPage');
const { TicketsManagerPage } = require('../pages/TicketsManagerPage');
const { ChatPage } = require('../pages/ChatPage');

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
      "monitor@maxenpower.com",
      "hamza@gmail.com",
      "khurram.naveed@maxenpower.com",
      "rida.mahmood@maxenpower.com",
      "sadia.amjad@maxenpower.com",
      "hamza.sohail@maxenpower.com",
      "wajiha.javed@maxenpower.com",
      "asad.sultan@maxenpower.com",
      "fiaz.mumtaz@maxenpower.com",
      "shahroz.ali@maxenpower.com",
      "abdullah.abbas@maxenpower.com",
      "maria.riaz@maxenpower.com",
      "saqib.ali@maxenpower.com",
      "fareeha.rafaqat@maxenpower.com",
      "haseeb.paracha@maxenpower.com",
      "emaan.ali@maxenpower.com",
      "waseem.akhtar@maxenpower.com",
      "humair.lawrence@maxenpower.com",
      "umar.shaukat@maxenpower.com",
      "amina.mahnoor@maxenpower.com",
      "rashid.ali@maxenpower.com",
      "users123@gmail.com",
      "waiza.jahan@maxenpower.com",
      "amin.butt@maxenpower.com",
      "sadeeq@maxenpower.com",
      "muhammad.sufyan@maxenpower.com",
      "ehu@maxenpower.com",
      "fasih.ahmed@maxenpower.com",
      "laeba.hussain@maxenpower.com",
      "rp@maxenpower.com",
      "nouman@maxenpower.com",
      "bilal@maxenpower.com",
      "muaz.tahir@maxenpower.com",
      "candc@maxenpower.com"]
      ;
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
          console.log(`   [${index + 1}/${emails.length}] Login successful for ${email}`);

          try {
            // Step 1: Navigate to welcome page if not already there
            if (!finalUrl.includes('/dashboard/welcome')) {
              await page.goto('/dashboard/welcome');
              await page.waitForLoadState('networkidle');
            }

            // Step 2: Verify we're on welcome page
            await expect(page).toHaveURL(/.*dashboard\/welcome/);
            console.log(`   [${index + 1}/${emails.length}] Navigated to welcome page for ${email}`);

            // Step 3: Navigate directly to tickets-manager page
            await page.goto('http://46.62.211.210:4003/dashboard/tickets-manager', { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForLoadState('networkidle').catch(() => { });
            console.log(`   [${index + 1}/${emails.length}] Navigated to tickets manager for ${email}`);

            // Step 4: Verify we're on tickets manager page
            await expect(page).toHaveURL(/.*dashboard\/tickets-manager/);

            // Step 5: Refresh the page two times
            console.log(`   [${index + 1}/${emails.length}] Refreshing tickets manager page (1/2) for ${email}`);
            await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForLoadState('networkidle').catch(() => { });

            // Wait 10 seconds between refreshes
            console.log(`   [${index + 1}/${emails.length}] Waiting 10 seconds before second refresh for ${email}`);
            await page.waitForTimeout(10000);

            console.log(`   [${index + 1}/${emails.length}] Refreshing tickets manager page (2/2) for ${email}`);
            await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForLoadState('networkidle').catch(() => { });
            await page.waitForTimeout(1000);

            // Step 6: Verify still on tickets manager page after refreshes
            await expect(page).toHaveURL(/.*dashboard\/tickets-manager/);
            console.log(`   [${index + 1}/${emails.length}] Successfully refreshed tickets manager 2x for ${email}`);

            // Mark as successful
            results.successful.push(email);

          } catch (navError) {
            // Login was successful but navigation to tickets manager failed
            results.failed.push({ email, reason: `Navigation failed: ${navError.message}` });
            console.log(`    [${index + 1}/${emails.length}] Login successful but navigation failed for ${email}: ${navError.message}`);
          }
        } else {
          // Login failed - still on login page
          results.failed.push({ email, reason: 'Still on login page after login attempt' });
          console.log(`   [${index + 1}/${emails.length}] Login failed for ${email} - still on login page`);
        }
      } catch (error) {
        results.failed.push({ email, reason: error.message });
        console.log(`   [${index + 1}/${emails.length}] Login failed for ${email}: ${error.message}`);
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

    console.log(`\n Starting login tests for ${emails.length} emails in ${batches.length} batches of ${BATCH_SIZE}...`);
    console.log(` Note: This test creates fresh browser contexts without saved authentication state.`);
    console.log(` Each email will be tested independently with a clean session.`);
    console.log(` Batching prevents server overload and connection refused errors.\n`);
    const startTime = Date.now();

    // Process batches sequentially, but emails within each batch in parallel
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchStartIndex = batchIndex * BATCH_SIZE;

      console.log(`\n Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} emails)...`);

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
    results.successful.forEach(email => console.log(`  ${email}`));
    console.log('\nFailed emails:');
    results.failed.forEach(({ email, reason }) => console.log(`   ${email} - ${reason}`));
    console.log('='.repeat(60));

    // Assert that at least some logins were successful (adjust threshold as needed)
    expect(results.successful.length).toBeGreaterThan(0);
  });

  test('should login with 50 users and send a message to amer in chat', async ({ browser }, testInfo) => {
    test.setTimeout(2400000); // 40 minutes to ensure enough time
    const testData = require('../utils/test-data');
    const password = 'Maxen12345@';
    // 50 users for the chat test
    const emails = [

      "recovery@maxenpower.com"

    ];

    const results = {
      successful: [],
      failed: []
    };

    const testChatForUser = async (email, index) => {
      let context;
      let page;

      try {
        console.log(`[${index + 1}/${emails.length}] Starting chat test for: ${email}`);

        // Add significant stagger delay
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, index * 200));
        }

        context = await browser.newContext({
          baseURL: testData.urls.baseUrl,
          storageState: undefined,
          recordVideo: {
            dir: 'test-results/videos-chat/',
            size: { width: 1280, height: 720 }
          }
        });
        page = await context.newPage();

        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.login(email, password);

        let loginSuccessful = false;
        try {
          let state = 'waiting';
          for (let i = 0; i < 40; i++) {
            const currentUrl = page.url();

            try {
              if (await page.locator('h2:has-text("Late Check-In")').isVisible()) {
                console.log(`   [${index + 1}/${emails.length}] Handling Late Check-In modal for ${email}`);
                await page.locator('button[data-id="open-combobox"]').click({ force: true });
                await page.waitForTimeout(500);
                await page.locator('span:has-text("Alarm Issue")').click({ force: true });
                await page.locator('textarea#late-reason').fill('Sorry for the late check-in.');
                await page.locator('button[data-id="submit-late-reason"]').click({ force: true });
                await page.waitForTimeout(1000);
              }

              if (await page.locator('button[data-id="Dismiss All"]').isVisible()) {
                console.log(`   [${index + 1}/${emails.length}] Handling Reminder modal for ${email}`);
                await page.locator('button[data-id="Dismiss All"]').click({ force: true });
                await page.waitForTimeout(1000);
              }

              if (await page.locator('input#missed-checkout-time').isVisible()) {
                console.log(`   [${index + 1}/${emails.length}] Handling Missed Checkout modal for ${email}`);
                const pText = await page.locator('p:has-text("You forgot to check out")').textContent();
                const timeMatch = pText.match(/after\s+(\d{1,2}):(\d{2})/);
                let checkoutTime = '23:59';
                if (timeMatch) {
                  let hours = parseInt(timeMatch[1], 10);
                  let mins = parseInt(timeMatch[2], 10);
                  if (hours < 23) {
                    checkoutTime = `${(hours + 1).toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
                  }
                }
                await page.locator('input#missed-checkout-time').fill(checkoutTime);
                await page.locator('textarea#missed-checkout-reason').fill('Forgot to checkout last night. Closed laptop in a hurry.');
                await page.locator('button[data-id="submit-checkout-reason"]').click({ force: true });
                await page.waitForTimeout(1000);
              }
            } catch (modalError) {
              // Ignore any errors during modal handling so the loop can continue
              console.log(`   [${index + 1}/${emails.length}] Minor issue handling modal: ${modalError.message}`);
            }

            if (currentUrl.includes('/dashboard/welcome') &&
              !(await page.locator('button[data-id="Dismiss All"]').isVisible()) &&
              !(await page.locator('input#missed-checkout-time').isVisible()) &&
              !(await page.locator('h2:has-text("Late Check-In")').isVisible())) {
              state = 'dashboard';
              break;
            }

            await page.waitForTimeout(1000);
          }

          if (state === 'dashboard') {
            loginSuccessful = true;
          } else {
            throw new Error(`Login did not reach welcome page or was blocked by a modal. Current URL: ${page.url()}`);
          }
        } catch (error) {
          throw new Error(`Login process failed: ${error.message}`);
        }

        if (loginSuccessful) {
          console.log(`   [${index + 1}/${emails.length}] Login successful for ${email}`);

          const chatPage = new ChatPage(page);
          console.log(`   [${index + 1}/${emails.length}] Opening chat for ${email}`);

          let isChatVisible = false;
          for (let j = 0; j < 45; j++) {
            isChatVisible = await chatPage.isChatIconVisible();
            if (isChatVisible) break;
            await page.waitForTimeout(1000);
          }

          if (isChatVisible) {
            await chatPage.clickChatIcon();
            await chatPage.verifyChatOpen();

            console.log(`   [${index + 1}/${emails.length}] Searching for Amer for ${email}`);
            await chatPage.searchAndSelectUser('Amer');

            console.log(`   [${index + 1}/${emails.length}] Sending message from ${email}`);
            await chatPage.sendMessage(`Hello Amer, this is an automated message from ${email}`);

            results.successful.push(email);
            console.log(`   [${index + 1}/${emails.length}] Message sent successfully for ${email}`);
          } else {
            throw new Error('Chat icon is not visible');
          }
        } else {
          throw new Error('Still on login page after login attempt');
        }
      } catch (error) {
        results.failed.push({ email, reason: error.message });
        console.log(`   [${index + 1}/${emails.length}] Test failed for ${email}: ${error.message}`);
      } finally {
        if (context) {
          await context.close();

          try {
            if (page && page.video()) {
              const videoPath = await page.video().path();
              await testInfo.attach(`Video - ${email}`, {
                path: videoPath,
                contentType: 'video/webm'
              });
            }
          } catch (attachError) {
            // Ignore error if video cannot be attached
          }
        }
      }
    };

    const BATCH_SIZE = 10;
    const batches = [];
    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      batches.push(emails.slice(i, i + BATCH_SIZE));
    }

    console.log(`\n Starting chat tests for ${emails.length} emails in ${batches.length} batches of ${BATCH_SIZE}...`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchStartIndex = batchIndex * BATCH_SIZE;

      console.log(`\n Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} emails)...`);

      for (let batchEmailIndex = 0; batchEmailIndex < batch.length; batchEmailIndex++) {
        const email = batch[batchEmailIndex];
        const globalIndex = batchStartIndex + batchEmailIndex;
        // Run sequentially to avoid server rate-limiting and hanging on /auth/login
        await testChatForUser(email, globalIndex);
      }

      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('CHAT TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Successful messages: ${results.successful.length}`);
    console.log(`Failed tests: ${results.failed.length}`);
    results.failed.forEach(({ email, reason }) => console.log(`   ${email} - ${reason}`));
    console.log('='.repeat(60));

    expect(results.successful.length).toBeGreaterThan(0);
  });
});

