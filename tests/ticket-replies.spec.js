const { test, expect } = require('@playwright/test');
const path = require('path');
const { LoginPage } = require('../pages/LoginPage');
const testData = require('../utils/test-data');

const DOLPHIN_QUESTIONS = testData.dolphinQuestions;
const DOLPHIN_RESPONSE_WAIT_MS = 8000;

function log(message) {
  console.log(message);
}

async function dismissChatOverlay(page, email) {
  const chatFrame = page.frameLocator('iframe').first();
  const chatCloseBtn = chatFrame.getByRole('button', { name: 'Close' });
  if (await chatCloseBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    log(`[${email}] Closing chat overlay...`);
    await chatCloseBtn.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
  }
}

async function moveChatIconAside(page) {
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
}

async function askAllDolphinQuestions(page, email) {
  const dolphinTextArea = page.locator('textarea[placeholder="Ask Dolphin..."]').first();
  const sendQueryBtn = page.locator('button[data-id="Send query button in dolphin"]').first();
  const questionResults = [];

  await expect(dolphinTextArea).toBeVisible({ timeout: 15000 });
  await moveChatIconAside(page);

  for (let i = 0; i < DOLPHIN_QUESTIONS.length; i++) {
    const question = DOLPHIN_QUESTIONS[i];
    const label = `Q${i + 1}/${DOLPHIN_QUESTIONS.length}`;

    try {
      log(`[${email}] Dolphin ${label}: ${question}`);
      await dolphinTextArea.scrollIntoViewIfNeeded();
      await dolphinTextArea.fill(question);
      await expect(sendQueryBtn).toBeEnabled({ timeout: 15000 });
      await sendQueryBtn.click();
      await page.waitForTimeout(DOLPHIN_RESPONSE_WAIT_MS);
      questionResults.push({ index: i + 1, question, status: 'sent' });
      log(`[${email}] Dolphin ${label}: sent`);
    } catch (error) {
      questionResults.push({ index: i + 1, question, status: 'failed', error: error.message });
      log(`[${email}] Dolphin ${label}: FAILED — ${error.message}`);
    }
  }

  const failed = questionResults.filter((r) => r.status === 'failed').length;
  return { questionResults, sent: questionResults.length - failed, failed };
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
  await dismissChatOverlay(page, email);

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

  log(`[${email}] Asking ${DOLPHIN_QUESTIONS.length} Dolphin questions...`);
  const dolphin = await askAllDolphinQuestions(page, email);

  return { ticketId, dolphin };
}

async function attachSessionArtifacts(testInfo, page, context, email, status) {
  const safeName = email.replace(/[@.]/g, '_');

  try {
    const screenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach(`screenshot-${status}-${safeName}`, {
      body: screenshot,
      contentType: 'image/png',
    });
  } catch {
    // Page may already be closed
  }

  const video = page.video();
  await context.close();

  if (video) {
    try {
      const videoPath = await video.path();
      await testInfo.attach(`video-${status}-${safeName}`, {
        path: videoPath,
        contentType: 'video/webm',
      });
      log(`[${email}] Video attached to report: ${path.basename(videoPath)}`);
    } catch (error) {
      log(`[${email}] Could not attach video: ${error.message}`);
    }
  }
}

test.describe('Ticket Replies Tests', () => {
  test('should navigate to ticket replies and click the first ticket', async ({ browser }, testInfo) => {
    const questionCount = DOLPHIN_QUESTIONS.length;
    const perUserMinutes = Math.ceil(questionCount * (DOLPHIN_RESPONSE_WAIT_MS / 1000 + 5) / 60) + 5;
    test.setTimeout(Math.max(7200000, testData.bulkLoginEmails.length * perUserMinutes * 60 * 1000));

    const emails = testData.bulkLoginEmails;
    const results = { successful: [], failed: [] };
    const BATCH_SIZE = 1;

    log(`Starting Dolphin ticket-replies tests for ${emails.length} agents, ${questionCount} questions each`);

    const testTicketRepliesForEmail = async (email, index, testInfo) => {
      let context;
      let page;

      try {
        log(`[${index + 1}/${emails.length}] Starting: ${email}`);

        if (index > 0) {
          await new Promise((resolve) => setTimeout(resolve, index * 200));
        }

        context = await browser.newContext({
          baseURL: testData.urls.baseUrl,
          storageState: undefined,
          recordVideo: {
            dir: testInfo.outputDir,
            size: { width: 1280, height: 720 },
          },
        });
        page = await context.newPage();
        const loginPage = new LoginPage(page);

        const { ticketId, dolphin } = await runTicketRepliesFlow(page, loginPage, email);
        results.successful.push({ email, ticketId, dolphin });
        log(
          `[${index + 1}/${emails.length}] PASSED: ${email} (ticket ${ticketId}, Dolphin ${dolphin.sent}/${questionCount} sent)`
        );
        await attachSessionArtifacts(testInfo, page, context, email, 'success');
        context = null;
      } catch (error) {
        results.failed.push({ email, reason: error.message });
        log(`[${index + 1}/${emails.length}] FAILED: ${email} — ${error.message}`);
        if (page && context) {
          await attachSessionArtifacts(testInfo, page, context, email, 'failure');
          context = null;
        } else if (context) {
          await context.close();
        }
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
          testTicketRepliesForEmail(email, batchStartIndex + batchEmailIndex, testInfo)
        )
      );

      if (batchIndex < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    log('='.repeat(60));
    log('DOLPHIN TICKET REPLIES TEST SUMMARY');
    log('='.repeat(60));
    log(`Total agents tested: ${emails.length}`);
    log(`Dolphin questions per agent: ${questionCount}`);
    log(`Successful agents: ${results.successful.length}`);
    log(`Failed agents: ${results.failed.length}`);
    log(`Total duration: ${duration} seconds`);
    log('Successful agents:');
    results.successful.forEach(({ email, ticketId, dolphin }) =>
      log(`  PASS ${email} (ticket ${ticketId}, Dolphin ${dolphin.sent}/${questionCount})`)
    );
    log('Failed agents:');
    results.failed.forEach(({ email, reason }) => log(`  FAIL ${email} — ${reason}`));
    log('='.repeat(60));
    log('Open HTML report for videos: npx playwright show-report');

    expect(results.successful.length).toBeGreaterThan(0);
  });
});
