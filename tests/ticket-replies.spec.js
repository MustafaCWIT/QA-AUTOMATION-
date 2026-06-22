const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const testData = require('../utils/test-data');

const DOLPHIN_QUERY =
  'I am writing to follow up on my meter installation request. Work at my premises is delayed and I need power for essential equipment. Kindly prioritize scheduling or advise the current status.Customer reference: CUST-0502.';

function log(message) {
  console.log(message);
}

async function runTicketRepliesFlow(page, loginPage, email) {
  log(`[${email}] Clearing session and logging in...`);
  await loginPage.clearExistingSession();
  await loginPage.goto();
  await loginPage.login(email, testData.credentials.bulkPassword);

  try {
    await loginPage.waitForLoginSuccess('/dashboard/welcome', { timeout: 90000 });
  } catch (error) {
    if (error.message === 'ACTIVE_SESSION_EXISTS') {
      log(`[${email}] Active session detected — retrying login...`);
      await loginPage.clearExistingSession();
      await loginPage.goto();
      await loginPage.login(email, testData.credentials.bulkPassword);
      await loginPage.waitForLoginSuccess('/dashboard/welcome', { timeout: 90000 });
    } else {
      throw error;
    }
  }

  log(`[${email}] On welcome dashboard — handling modals...`);
  await loginPage.handlePostLoginModals();
  await expect(page.getByRole('heading', { name: 'Welcome Dashboard' })).toBeVisible({ timeout: 30000 });

  const chatFrame = page.frameLocator('iframe').first();
  const chatCloseBtn = chatFrame.getByRole('button', { name: 'Close' });
  if (await chatCloseBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    log(`[${email}] Closing chat overlay...`);
    await chatCloseBtn.click();
    await page.waitForTimeout(500);
  }

  log(`[${email}] Navigating to Ticket Replies...`);
  const ticketRepliesBtn = page.getByRole('button', { name: 'Ticket Replies', exact: true });
  await expect(ticketRepliesBtn).toBeVisible({ timeout: 20000 });
  await ticketRepliesBtn.scrollIntoViewIfNeeded();

  await Promise.all([
    page.waitForURL(/\/dashboard\/tickets/, { timeout: 30000 }),
    ticketRepliesBtn.click(),
  ]);
  await expect(page).toHaveURL(/\/dashboard\/tickets/);

  log(`[${email}] Selecting first ticket...`);
  const firstTicket = page.locator('div[data-ticket-id]').first();
  await expect(firstTicket).toBeVisible({ timeout: 20000 });

  const ticketId = await firstTicket.getAttribute('data-ticket-id');
  await firstTicket.scrollIntoViewIfNeeded();
  await firstTicket.click();
  await page.waitForTimeout(2000);

  log(`[${email}] Opening Dolphin tab for ticket ${ticketId}...`);
  const dolphinTab = page
    .locator('button[role="tab"]:has-text("Dolphin"), [id*="-trigger-dolphin"], button:has-text("Dolphin")')
    .first();
  await expect(dolphinTab).toBeVisible({ timeout: 20000 });
  await dolphinTab.scrollIntoViewIfNeeded();
  await dolphinTab.click();

  const dolphinTextArea = page.locator('textarea[placeholder="Ask Dolphin..."]').first();
  await expect(dolphinTextArea).toBeVisible({ timeout: 15000 });
  await dolphinTextArea.scrollIntoViewIfNeeded();
  await dolphinTextArea.fill(DOLPHIN_QUERY);

  const chatIcon = page
    .locator(
      'button:has(svg.lucide-message-circle-plus), a:has(svg.lucide-message-circle-plus), svg.lucide-message-circle-plus, div:has(> svg.lucide-message-circle-plus), [class*="message-circle-plus"]'
    )
    .first();
  if (await chatIcon.isVisible({ timeout: 5000 }).catch(() => false)) {
    const box = await chatIcon.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(100, box.y + box.height / 2, { steps: 10 });
      await page.mouse.up();
    }
  }

  await page.waitForTimeout(1000);

  log(`[${email}] Sending Dolphin query...`);
  const sendQueryBtn = page.locator('button[data-id="Send query button in dolphin"]').first();
  await expect(sendQueryBtn).toBeEnabled({ timeout: 10000 });
  await sendQueryBtn.click();
  await page.waitForTimeout(3000);

  return ticketId;
}

test.describe('Ticket Replies Tests', () => {
  test('should navigate to ticket replies and click the first ticket', async ({ browser }) => {
    test.setTimeout(1800000);

    const emails = testData.bulkLoginEmails;
    const results = { successful: [], failed: [] };
    const BATCH_SIZE = 1;

    log(`Starting ticket replies tests for ${emails.length} users (batch size: ${BATCH_SIZE})`);

    const testTicketRepliesForEmail = async (email, index) => {
      let context;

      try {
        log(`[${index + 1}/${emails.length}] Starting: ${email}`);

        if (index > 0) {
          await new Promise((resolve) => setTimeout(resolve, index * 200));
        }

        context = await browser.newContext({
          baseURL: testData.urls.baseUrl,
          storageState: undefined,
          recordVideo: {
            dir: 'test-results/videos/',
            size: { width: 1280, height: 720 },
          },
        });
        const page = await context.newPage();
        const loginPage = new LoginPage(page);

        const ticketId = await runTicketRepliesFlow(page, loginPage, email);
        results.successful.push({ email, ticketId });
        log(`[${index + 1}/${emails.length}] PASSED: ${email} (ticket ${ticketId})`);
      } catch (error) {
        results.failed.push({ email, reason: error.message });
        log(`[${index + 1}/${emails.length}] FAILED: ${email} — ${error.message}`);
      } finally {
        if (context) {
          await context.close();
        }
      }
    };

    const batches = [];
    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      batches.push(emails.slice(i, i + BATCH_SIZE));
    }

    const startTime = Date.now();

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchStartIndex = batchIndex * BATCH_SIZE;
      log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} user(s))...`);

      await Promise.all(
        batch.map((email, batchEmailIndex) =>
          testTicketRepliesForEmail(email, batchStartIndex + batchEmailIndex)
        )
      );

      if (batchIndex < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    log('='.repeat(60));
    log('TICKET REPLIES TEST SUMMARY');
    log('='.repeat(60));
    log(`Total users tested: ${emails.length}`);
    log(`Successful: ${results.successful.length}`);
    log(`Failed: ${results.failed.length}`);
    log(`Total duration: ${duration} seconds`);
    log('Successful users:');
    results.successful.forEach(({ email, ticketId }) => log(`  PASS ${email} (ticket ${ticketId})`));
    log('Failed users:');
    results.failed.forEach(({ email, reason }) => log(`  FAIL ${email} — ${reason}`));
    log('='.repeat(60));

    expect(results.successful.length).toBeGreaterThan(0);
  });
});
