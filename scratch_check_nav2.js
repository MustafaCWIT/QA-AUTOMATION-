const { chromium } = require('playwright');
const { LoginPage } = require('./pages/LoginPage');
const testData = require('./utils/test-data');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const email = testData.credentials.valid.email;
  const password = testData.credentials.valid.password;

  await page.goto('http://46.62.211.210:4003/auth/login');
  const loginPage = new LoginPage(page);
  await loginPage.login(email, password);

  // Wait for login
  await page.waitForURL('**/dashboard/welcome', { timeout: 30000 }).catch(e => console.log('Timeout waiting for welcome page', e.message));

  console.log('Current URL after login:', page.url());

  const ticketRepliesBtn = page.locator('button[data-id="ticket-replies"]').first();
  if (await ticketRepliesBtn.isVisible()) {
      console.log('Clicking ticket replies button...');
      await ticketRepliesBtn.click();
      await page.waitForTimeout(2000);
      console.log('URL after click:', page.url());
      
      const aTags = await page.$$eval('a', as => as.map(a => ({ text: a.innerText.trim(), href: a.href })));
      console.log('All links with ticket:', aTags.filter(a => a.href && a.href.includes('ticket')));
  } else {
      console.log('No ticket replies button found');
  }

  await browser.close();
})();
