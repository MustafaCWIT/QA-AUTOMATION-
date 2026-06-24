const { test } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { TicketsManagerPage } = require('../pages/TicketsManagerPage');

test('debug contact modal structure', async ({ page }) => {
  test.setTimeout(120000);
  const loginPage = new LoginPage(page);
  const ticketsManagerPage = new TicketsManagerPage(page);

  await ticketsManagerPage.goto();
  await loginPage.handlePostLoginModals();
  await ticketsManagerPage.dismissBlockingOverlays();
  await ticketsManagerPage.clickAddTicket();
  await ticketsManagerPage.waitForTicketForm();
  await ticketsManagerPage.searchContactByEmail('m');

  const modal = ticketsManagerPage.getContactModal();
  await modal.locator('input[placeholder="Enter Name *"]').fill('Debug Contact');

  const tabs = ['Contact Numbers', 'Addresses', 'Social Links', 'Identity Documents', 'Additional Info'];
  for (const tab of tabs) {
    await modal.getByRole('button', { name: tab, exact: true }).click();
    await page.waitForTimeout(800);
    const buttons = await modal.locator('button').evaluateAll((els) =>
      els.map((el) => ({
        text: el.textContent?.trim(),
        disabled: el.disabled,
        dataId: el.getAttribute('data-id'),
        visible: el.offsetParent !== null,
      })).filter((b) => b.text === 'Add' || b.dataId?.includes('Add'))
    );
    const inputs = await modal.locator('input, textarea, button[role="combobox"]').evaluateAll((els) =>
      els.map((el) => ({
        tag: el.tagName,
        role: el.getAttribute('role'),
        placeholder: el.getAttribute('placeholder'),
        text: el.textContent?.trim().slice(0, 40),
        disabled: el.disabled,
      }))
    );
    console.log(`\n=== ${tab} ===`);
    console.log('Add buttons:', JSON.stringify(buttons, null, 2));
    console.log('Fields:', JSON.stringify(inputs, null, 2));
  }
});
