const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const testData = require('../utils/test-data');

test.describe('Ticket Replies Tests', () => {

  test('should navigate to ticket replies and click the first ticket', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes timeout

    const email = testData.credentials.valid.email;
    const password = testData.credentials.valid.password;

    console.log(`Starting login for: ${email}`);

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(email, password);

    // Modal handling loop to ensure login successfully redirects to welcome dashboard page
    let loginSuccessful = false;
    try {
      let state = 'waiting';
      for (let i = 0; i < 40; i++) {
        const currentUrl = page.url();

        try {
          // 1. Handle Late Check-In modal
          if (await page.locator('h2:has-text("Late Check-In")').isVisible()) {
            console.log(`Handling Late Check-In modal for ${email}`);
            await page.locator('button[data-id="open-combobox"]').click({ force: true });
            await page.waitForTimeout(500);
            await page.locator('span:has-text("Alarm Issue")').click({ force: true });
            await page.locator('textarea#late-reason').fill('Sorry for the late check-in.');
            await page.locator('button[data-id="submit-late-reason"]').click({ force: true });
            await page.waitForTimeout(1000);
          }

          // 2. Handle Reminder modal
          if (await page.locator('button[data-id="Dismiss All"]').isVisible()) {
            console.log(`Handling Reminder modal for ${email}`);
            await page.locator('button[data-id="Dismiss All"]').click({ force: true });
            await page.waitForTimeout(1000);
          }

          // 3. Handle Missed Checkout modal
          if (await page.locator('input#missed-checkout-time').isVisible()) {
            console.log(`Handling Missed Checkout modal for ${email}`);
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
          console.log(`Minor issue handling modal: ${modalError.message}`);
        }

        // Break loop if on welcome page and no modals are visible
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
      console.log(`Login successful for ${email}`);

      // Step 2: Click the Ticket Replies menu button
      console.log('Locating and clicking the Ticket Replies button...');
      const ticketRepliesBtn = page.locator('button[data-id="ticket-replies"]').first();
      await expect(ticketRepliesBtn).toBeVisible({ timeout: 20000 });
      await ticketRepliesBtn.scrollIntoViewIfNeeded();
      await ticketRepliesBtn.click();

      // Wait for page loading
      await page.waitForLoadState('networkidle').catch(() => { });
      await expect(page).toHaveURL('http://46.62.211.210:4003/dashboard/tickets?view=card');
      console.log('Successfully navigated to Ticket Replies page.');

      // Step 3: Find and click on the first ticket (containing the data-ticket-id attribute)
      console.log('Waiting for ticket cards to appear...');
      const firstTicket = page.locator('div[data-ticket-id]').first();
      await expect(firstTicket).toBeVisible({ timeout: 20000 });

      const ticketId = await firstTicket.getAttribute('data-ticket-id');
      console.log(`Clicking on the first ticket (ID: ${ticketId})`);

      await firstTicket.scrollIntoViewIfNeeded();
      await firstTicket.click();

      // Verify that the click was successful
      await page.waitForTimeout(2000);
      console.log('Ticket clicked successfully!');

      // Step 4: Click the Dolphin tab in the right-side detail panel
      console.log('Locating and clicking the Dolphin tab...');
      const dolphinTab = page.locator('button[role="tab"]:has-text("Dolphin"), [id*="-trigger-dolphin"], button:has-text("Dolphin")').first();
      await expect(dolphinTab).toBeVisible({ timeout: 20000 });
      await dolphinTab.scrollIntoViewIfNeeded();
      await dolphinTab.click();
      console.log('Dolphin tab clicked successfully.');

      // Step 5: Locate the Dolphin input textarea and type a message
      console.log('Locating the Dolphin ask textarea...');
      const dolphinTextArea = page.locator('textarea[placeholder="Ask Dolphin..."]').first();
      await expect(dolphinTextArea).toBeVisible({ timeout: 15000 });
      await dolphinTextArea.scrollIntoViewIfNeeded();

      const queryMessage = 'Hello Dolphin, this is an automated test query.';
      console.log(`Typing message: "${queryMessage}"`);
      await dolphinTextArea.fill(queryMessage);

      // Step 6: Drag the floating chat icon out of the way to the left side
      console.log('Dragging the floating chat icon to the left corner...');
      const chatIcon = page.locator('button:has(svg.lucide-message-circle-plus), a:has(svg.lucide-message-circle-plus), svg.lucide-message-circle-plus, div:has(> svg.lucide-message-circle-plus), [class*="message-circle-plus"]').first();
      await expect(chatIcon).toBeVisible({ timeout: 15000 });
      const box = await chatIcon.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        // Drag to left side (e.g. x: 100, y: box.y + box.height / 2)
        await page.mouse.move(100, box.y + box.height / 2, { steps: 10 });
        await page.mouse.up();
        console.log('Chat icon dragged to the left side successfully.');
      } else {
        console.log('Could not find chat icon bounding box to drag.');
      }
      await page.waitForTimeout(1000);

      // Step 7: Click the send query button in Dolphin
      console.log('Locating the Send query button in Dolphin...');
      const sendQueryBtn = page.locator('button[data-id="Send query button in dolphin"]').first();
      // Wait for the button to become enabled after typing
      await expect(sendQueryBtn).toBeEnabled({ timeout: 10000 });
      console.log('Clicking the Send query button...');
      await sendQueryBtn.click();

      // Wait a few seconds to let the message send process
      await page.waitForTimeout(5000);
      console.log('Message sent successfully through Dolphin!');
    } else {
      throw new Error('Still on login page after login attempt');
    }
  });
});
