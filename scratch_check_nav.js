const { chromium } = require('playwright');
const { LoginPage } = require('./pages/LoginPage');
const testData = require('./utils/test-data');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const email = testData.credentials.valid.email;
  const password = testData.credentials.valid.password;

  const loginPage = new LoginPage(page);
  // Manually navigate since playwright context is not used
  await page.goto('http://46.62.211.210:4003/auth/login');
  await loginPage.login(email, password);

  // Wait for network idle and for welcome page
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);

  console.log('Current URL:', page.url());

  // Dump all links
  const links = await page.$$eval('a', as => as.map(a => ({ text: a.innerText.trim(), href: a.href, dataId: a.getAttribute('data-id') })));
  console.log('Links:', links);

  // Dump all buttons with data-id
  const buttons = await page.$$eval('button[data-id]', btns => btns.map(b => ({ text: b.innerText.trim(), dataId: b.getAttribute('data-id') })));
  console.log('Buttons with data-id:', buttons);

  // Also try to find anything with "Ticket" in it
  const elements = await page.$$eval('*', els => {
    return els.filter(e => e.innerText && e.innerText.includes('Ticket') && e.tagName !== 'SCRIPT' && e.tagName !== 'STYLE' && e.tagName !== 'HTML' && e.tagName !== 'BODY')
              .map(e => ({ tag: e.tagName, text: e.innerText.trim().slice(0, 50), dataId: e.getAttribute('data-id'), href: e.href }));
  });
  console.log('Elements containing Ticket:', elements.slice(0, 10)); // just first 10

  await browser.close();
})();
