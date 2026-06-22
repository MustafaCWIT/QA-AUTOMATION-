const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const testData = require('../utils/test-data');

test.describe('Ticket Replies Tests', () => {

  test('should navigate to ticket replies and click the first ticket', async ({ page }) => {
    test.setTimeout(120000);

    const loginPage = new LoginPage(page);

    // Use saved session from auth.setup.js — only log in if redirected to login page
    await page.goto('/dashboard/welcome', { waitUntil: 'domcontentloaded' });

    if (page.url().includes('/auth/login')) {
      await loginPage.login(
        testData.credentials.valid.email,
        testData.credentials.valid.password
      );
      await loginPage.waitForLoginSuccess('/dashboard/welcome', { timeout: 90000 });
    }

    await loginPage.handlePostLoginModals();
    await expect(page.getByRole('heading', { name: 'Welcome Dashboard' })).toBeVisible({ timeout: 30000 });

    // Close chat overlay if it blocks sidebar clicks
    const chatFrame = page.frameLocator('iframe').first();
    const chatCloseBtn = chatFrame.getByRole('button', { name: 'Close' });
    if (await chatCloseBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await chatCloseBtn.click();
      await page.waitForTimeout(500);
    }

    console.log('Clicking Ticket Replies in sidebar...');
    const ticketRepliesBtn = page.getByRole('button', { name: 'Ticket Replies', exact: true });
    await expect(ticketRepliesBtn).toBeVisible({ timeout: 20000 });
    await ticketRepliesBtn.scrollIntoViewIfNeeded();

    await Promise.all([
      page.waitForURL(/\/dashboard\/tickets/, { timeout: 30000 }),
      ticketRepliesBtn.click(),
    ]);
    await expect(page).toHaveURL(/\/dashboard\/tickets/);
    console.log('Successfully navigated to Ticket Replies page.');

    console.log('Waiting for ticket cards to appear...');
    const firstTicket = page.locator('div[data-ticket-id]').first();
    await expect(firstTicket).toBeVisible({ timeout: 20000 });

    const ticketId = await firstTicket.getAttribute('data-ticket-id');
    console.log(`Clicking on the first ticket (ID: ${ticketId})`);

    await firstTicket.scrollIntoViewIfNeeded();
    await firstTicket.click();

    await page.waitForTimeout(2000);
    console.log('Ticket clicked successfully!');

    console.log('Locating and clicking the Dolphin tab...');
    const dolphinTab = page.locator('button[role="tab"]:has-text("Dolphin"), [id*="-trigger-dolphin"], button:has-text("Dolphin")').first();
    await expect(dolphinTab).toBeVisible({ timeout: 20000 });
    await dolphinTab.scrollIntoViewIfNeeded();
    await dolphinTab.click();
    console.log('Dolphin tab clicked successfully.');

    console.log('Locating the Dolphin ask textarea...');
    const dolphinTextArea = page.locator('textarea[placeholder="Ask Dolphin..."]').first();
    await expect(dolphinTextArea).toBeVisible({ timeout: 15000 });
    await dolphinTextArea.scrollIntoViewIfNeeded();

    const queryMessage = 'I am writing to follow up on my meter installation request. Work at my premises is delayed and I need power for essential equipment. Kindly prioritize scheduling or advise the current status.Customer reference: CUST-0502.';
    console.log(`Typing message: "${queryMessage}"`);
    await dolphinTextArea.fill(queryMessage);

    console.log('Dragging the floating chat icon to the left corner...');
    const chatIcon = page.locator('button:has(svg.lucide-message-circle-plus), a:has(svg.lucide-message-circle-plus), svg.lucide-message-circle-plus, div:has(> svg.lucide-message-circle-plus), [class*="message-circle-plus"]').first();
    await expect(chatIcon).toBeVisible({ timeout: 15000 });
    const box = await chatIcon.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(100, box.y + box.height / 2, { steps: 10 });
      await page.mouse.up();
      console.log('Chat icon dragged to the left side successfully.');
    }

    await page.waitForTimeout(1000);

    console.log('Locating the Send query button in Dolphin...');
    const sendQueryBtn = page.locator('button[data-id="Send query button in dolphin"]').first();
    await expect(sendQueryBtn).toBeEnabled({ timeout: 10000 });
    await sendQueryBtn.click();

    await page.waitForTimeout(5000);
    console.log('Message sent successfully through Dolphin!');
  });
});
