const { test, expect } = require('@playwright/test');
const { TicketsManagerPage } = require('../pages/TicketsManagerPage');
const testData = require('../utils/test-data');

/**
 * Ticket creation flow via the NextGen-AI modal contact search.
 *
 * Opens + Ticket (same entry as ticket-creation.spec.js), then searches a contact
 * by email prefix in the "Search by Email" field and presses Enter.
 */
test.describe('Ticket Creation via Contact Search', () => {
  test.beforeEach(async ({ page }) => {
    const ticketsManagerPage = new TicketsManagerPage(page);
    await ticketsManagerPage.goto();
    await ticketsManagerPage.verifyTicketsManagerPage();
    await ticketsManagerPage.dismissBlockingOverlays();
    await ticketsManagerPage.clickAddTicket();
    await ticketsManagerPage.waitForTicketForm();
    await ticketsManagerPage.verifyTicketFormOpen();
  });

  test('should search contact by email prefix and press Enter', async ({ page }) => {
    test.setTimeout(60000);

    const ticketsManagerPage = new TicketsManagerPage(page);
    const { searchTerm } = testData.contactData;

    await ticketsManagerPage.openCreateContactTab();

    const modal = ticketsManagerPage.getContactModal();
    const searchInput = modal.locator('input[placeholder*="Search by Email" i]').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    await searchInput.click();
    await searchInput.fill(searchTerm);
    await expect(searchInput).toHaveValue(searchTerm);
    await searchInput.press('Enter');

    await expect(modal.locator('input[placeholder="Enter Name *"]')).toBeVisible({ timeout: 10000 });
  });

  test('should search and create contact with required fields', async ({ page }) => {
    test.setTimeout(180000);

    const ticketsManagerPage = new TicketsManagerPage(page);
    const contactData = testData.contactData;
    const contactEmail = `${contactData.emailPrefix}.${Date.now()}@${contactData.emailDomain}`;

    await ticketsManagerPage.createContactViaSearch(contactData.searchTerm, {
      ...contactData,
      email: contactEmail,
    });

    await expect(page.getByText(/contact.*created|created successfully/i).first()).toBeVisible({
      timeout: 30000,
    });
  });

  test('should open ticket create form after contact search via Search tab', async ({ page }) => {
    test.setTimeout(60000);

    const ticketsManagerPage = new TicketsManagerPage(page);
    await ticketsManagerPage.openTicketCreateFormViaSearch(testData.contactData.searchTerm);

    const subjectInput = page
      .locator('input[placeholder*="Subject" i], input[placeholder*="Enter Subject"]')
      .first();
    await expect(subjectInput).toBeVisible({ timeout: 15000 });
  });
});
