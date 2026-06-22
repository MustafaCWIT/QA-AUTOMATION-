const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

async function run() {
  const authFile = path.join(__dirname, '../.auth/user.json');
  console.log('Using auth state from:', authFile);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: authFile });
  const page = await context.newPage();

  try {
    console.log('Navigating to welcome page...');
    await page.goto('http://46.62.211.210:4003/dashboard/welcome', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    console.log('Opening chat...');
    // Click the chat icon
    const chatBtn = page.locator('button:has(svg.lucide-message-circle-plus), a:has(svg.lucide-message-circle-plus), svg.lucide-message-circle-plus').first();
    await chatBtn.click();
    await page.waitForTimeout(2000);

    const frame = page.frameLocator('iframe').first();
    
    console.log('Searching and selecting user Amer...');
    const searchInput = frame.locator('input[placeholder*="Search or start a new chat"]');
    await searchInput.fill('Amer');
    await page.waitForTimeout(1000);

    const userBtn = frame.locator('button').filter({ hasText: 'Amer' }).first();
    await userBtn.click();
    await page.waitForTimeout(1500);

    console.log('Clicking Emoji picker button...');
    const emojiBtn = frame.locator('button[aria-label="Insert emoji"]').first();
    await emojiBtn.click();
    await page.waitForTimeout(2000);

    console.log('Dumping DOM contents...');
    // Get the HTML inside the iframe body
    const bodyHtml = await frame.locator('body').innerHTML();
    fs.writeFileSync(path.join(__dirname, 'chat_iframe_dom.html'), bodyHtml);
    console.log('Successfully wrote chat_iframe_dom.html!');

  } catch (err) {
    console.error('Error during run:', err);
  } finally {
    await browser.close();
  }
}

run();
