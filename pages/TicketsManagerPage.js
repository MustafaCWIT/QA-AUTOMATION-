const { expect } = require('@playwright/test');

/**
 * Tickets Manager Page Object Model
 * Contains all selectors and methods for the tickets manager page
 */
class TicketsManagerPage {
  constructor(page) {
    this.page = page;
    // Selectors
    // + Ticket button: Use getByRole('button', { name: 'Ticket' }) - see clickAddTicket() method
    // Alternative selectors (for reference):
    // - button:has-text("Ticket"):has(svg)
    // - button.bg-\\[\\#4540a6\\]:has-text("Ticket")
    // - button.inline-flex.items-center.gap-1.rounded-full
    this.addTicketButton = 'button:has-text("Ticket")'; // Fallback selector
    this.addTaskButton = 'button:has-text("+ Task")';
    // Use heading role to target only the h2 heading, not the button
    this.ticketsManagerTitle = 'h2:has-text("Tickets Manager"), getByRole("heading", { name: "Tickets Manager" })';
    this.ticketForm = 'form, [role="dialog"], .modal, .form';
    this.ticketFormTitle = 'text=Create Ticket, text=New Ticket, text=Add Ticket';
  }

  /**
   * Navigate to the tickets manager page
   */
  async goto() {
    await this.page.goto('/dashboard/tickets-manager');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Dismiss overlays that block interaction (reminders, chat, etc.)
   */
  async dismissBlockingOverlays() {
    const dismissAll = this.page.getByRole('button', { name: 'Dismiss All' });
    if (await dismissAll.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dismissAll.click({ force: true });
      await this.page.waitForTimeout(500);
    }

    const chatFrame = this.page.frameLocator('iframe').first();
    const chatCloseBtn = chatFrame.getByRole('button', { name: 'Close' });
    if (await chatCloseBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await chatCloseBtn.click({ timeout: 5000 }).catch(() => {});
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Click the + Ticket button to open ticket creation form
   * Uses recommended getByRole approach with exact match to avoid matching "Tickets Manager" or "Ticket Replies"
   */
  async clickAddTicket() {
    await this.dismissBlockingOverlays();

    const button = this.page.getByRole('button', { name: 'Ticket', exact: true });
    await button.waitFor({ state: 'visible', timeout: 10000 });
    await button.click({ force: true });
    await this.page.waitForTimeout(1000);
  }

  /**
   * Verify we're on the tickets manager page
   */
  async verifyTicketsManagerPage() {
    // Use regex to work with any baseURL instead of hardcoded URL
    await expect(this.page).toHaveURL('http://46.62.211.210:4003/dashboard/tickets-manager');
    // Use getByRole to target the heading specifically (not the button)
    await expect(this.page.getByRole('heading', { name: 'Tickets Manager' })).toBeVisible();
  }

  /**
   * Verify ticket creation form is open
   */
  async verifyTicketFormOpen() {
    // Check if form/modal is visible
    const form = this.page.locator(this.ticketForm).first();
    await expect(form).toBeVisible({ timeout: 5000 });
  }

  /**
   * Wait for ticket form to appear
   */
  async waitForTicketForm() {
    // Wait for modal/form to appear - try multiple selectors
    await Promise.race([
      this.page.waitForSelector('[data-id="Create"]', { state: 'visible', timeout: 10000 }),
      this.page.waitForSelector(this.ticketForm, { state: 'visible', timeout: 10000 }),
      this.page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 10000 })
    ]).catch(() => {
      // If none found, just wait a bit for form to render
      return this.page.waitForTimeout(1000);
    });
  }

  /**
   * Contact create form container (modal overlay or inline split view after search).
   */
  getContactModal() {
    const overlay = this.page.locator('div.fixed.inset-0').filter({
      has: this.page.locator('button[data-id="Create Contact"]'),
    });

    const inlineForm = this.page.locator('div').filter({
      has: this.page.locator('button[data-id="Save Contact"]'),
      has: this.page.locator('button[data-id="Contact Numbers button in contact tabs"]'),
    });

    return overlay.or(inlineForm).first();
  }

  /**
   * Ensure the NextGen-AI modal is on the Create Contact tab (search-by-email lives here).
   */
  async openCreateContactTab() {
    const modal = this.getContactModal();
    await expect(modal).toBeVisible({ timeout: 10000 });

    const createContactTab = modal.locator('button[data-id="Create Contact"]');
    await expect(createContactTab).toBeVisible({ timeout: 10000 });
    await createContactTab.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Search contacts by email prefix (type + Enter). Stays on Create Contact tab.
   */
  async searchContactByEmail(searchTerm = 'm') {
    await this.openCreateContactTab();

    const modal = this.getContactModal();
    const searchInput = modal.locator('input[placeholder*="Search by Email" i]').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.click();
    await searchInput.fill(searchTerm);
    await expect(searchInput).toHaveValue(searchTerm);
    await searchInput.press('Enter');
    await this.page.waitForTimeout(1500);

    await expect(modal.locator('input[placeholder="Enter Name *"]')).toBeVisible({ timeout: 10000 });
  }

  async selectModalCombobox(modal, triggerText, optionText) {
    const combobox = modal.locator('button[role="combobox"]').filter({ hasText: triggerText }).first();
    await combobox.scrollIntoViewIfNeeded();
    await combobox.click();
    await this.page.waitForTimeout(500);

    const option = this.page
      .locator('[role="dialog"] [role="option"], [role="listbox"] [role="option"]')
      .filter({ hasText: optionText })
      .first();
    await expect(option).toBeVisible({ timeout: 5000 });
    await option.click();
    await this.page.waitForTimeout(300);
  }

  async clickContactSubTab(modal, dataId) {
    const tab = modal.locator(`button[data-id="${dataId}"]`);
    await expect(tab).toBeVisible({ timeout: 10000 });
    await tab.click();
    await this.page.waitForTimeout(500);
  }

  async clickEnabledAddButton(modal, dataId) {
    const addButton = modal.locator(`button[data-id="${dataId}"]`);
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await expect(addButton).toBeEnabled({ timeout: 10000 });
    await addButton.click();
    await this.page.waitForTimeout(500);
  }

  async fillContactNumbers(modal, data) {
    await this.clickContactSubTab(modal, 'Contact Numbers button in contact tabs');

    const phoneInput = modal.locator('input[placeholder="+4477123456789"]');
    await expect(phoneInput).toBeVisible({ timeout: 10000 });
    await phoneInput.click();
    await phoneInput.fill(data.phone);
    await expect(phoneInput).toHaveValue(data.phone);

    const addButton = modal.locator('button[data-id*="Add"][data-id*="contact number" i], button[data-id*="Add contact number" i]').first();
    if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(addButton).toBeEnabled({ timeout: 10000 });
      await addButton.click();
    } else {
      await modal.locator('button:enabled').filter({ hasText: /^Add$/ }).first().click();
    }
    await this.page.waitForTimeout(500);
  }

  async fillAddresses(modal, data) {
    await this.clickContactSubTab(modal, 'Addresses button in contact tabs');

    await this.selectModalCombobox(modal, 'Select Type', data.addressType);
    await modal.locator('input[placeholder="John Doe"]').fill(data.addressName);
    await modal.locator('input[placeholder="example@email.com"]').fill(data.addressEmail);
    await modal.locator('textarea[placeholder="Street, City, State, Zip"]').fill(data.address);

    await this.clickEnabledAddButton(modal, 'Add address button');
  }

  async fillSocialLinks(modal, data) {
    await this.clickContactSubTab(modal, 'Social Links button in contact tabs');

    await this.selectModalCombobox(modal, 'Select platform', data.socialPlatform);

    const socialInput = modal.locator(
      'input[placeholder="@username or URL"], input[placeholder*="handle" i], input[placeholder*="@" i]'
    ).first();
    await expect(socialInput).toBeVisible({ timeout: 10000 });
    await socialInput.fill(data.socialLink);

    const addButton = modal.getByRole('button', { name: 'Add', exact: true });
    await expect(addButton).toBeEnabled({ timeout: 10000 });
    await addButton.click();
    await this.page.waitForTimeout(500);
  }

  async fillIdentityDocuments(modal, data) {
    await this.clickContactSubTab(modal, 'Identity Documents button in contact tabs');

    await modal
      .locator('input[placeholder*="Government ID" i], input[placeholder*="Passport" i]')
      .first()
      .fill(data.documentType);
    await modal.locator('input[placeholder="Document value"]').fill(data.documentValue);

    await this.clickEnabledAddButton(modal, 'Add custom identity document button');
  }

  /**
   * Fill contact sub-tabs: numbers, addresses, social links, identity documents.
   */
  async fillCreateContactSubTabs(data) {
    const modal = this.getContactModal();
    await this.fillContactNumbers(modal, data);
    await this.fillAddresses(modal, data);
    await this.fillSocialLinks(modal, data);
    await this.fillIdentityDocuments(modal, data);
  }

  /**
   * Fill main Create Contact fields shown after email search (name, email, comboboxes).
   */
  async fillCreateContactMainFields(data) {
    const modal = this.getContactModal();

    await modal.locator('input[placeholder="Enter Name *"]').fill(data.name);
    await modal.locator('input[placeholder="Enter Email *"]').fill(data.email);

    await this.selectModalCombobox(modal, 'Select Gender', data.gender);
    await this.selectModalCombobox(modal, 'Select Contact Type', data.contactType);
    await this.selectModalCombobox(modal, 'Select Designation', data.designation);
  }

  /**
   * Click the Create Contact submit button (data-id="Save Contact").
   */
  async clickCreateContactButton() {
    const modal = this.getContactModal();
    const createButton = modal.locator('button[data-id="Save Contact"]');
    await expect(createButton).toBeVisible({ timeout: 10000 });
    await createButton.scrollIntoViewIfNeeded();
    await createButton.click();
    await this.page.waitForTimeout(1500);
  }

  /**
   * Fill all Create Contact form fields (main section + sub-tabs).
   */
  async fillCreateContactForm(data) {
    await this.fillCreateContactMainFields(data);

    const modal = this.getContactModal();

    if (data.method) {
      await this.selectModalCombobox(modal, 'Select Method', data.method);
    }

    if (data.referenceNo) {
      await modal.locator('input[placeholder="Contact Reference No"]').fill(data.referenceNo);
    }

    await this.fillCreateContactSubTabs(data);

    if (data.accountNumber) {
      await this.clickContactSubTab(modal, 'Additional Info button in contact tabs');
      await modal.locator('input[placeholder*="Account Number" i]').fill(data.accountNumber);
      await modal.getByRole('button', { name: 'Verify & Add' }).click();
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Search by email prefix, fill contact form (main + sub-tabs), and submit Create Contact.
   */
  async createContactViaSearch(searchTerm, data) {
    await this.searchContactByEmail(searchTerm);
    await this.fillCreateContactMainFields(data);
    await this.fillCreateContactSubTabs(data);
    await this.clickCreateContactButton();
  }

  /**
   * Open ticket create form via NextGen-AI modal: search contact by email prefix, then Search tab.
   * Does not click the Create tab (uses Search tab instead, same end result).
   */
  async openTicketCreateFormViaSearch(searchTerm = 'm') {
    await this.searchContactByEmail(searchTerm);

    const searchTab = this.page.locator('button[data-id="Search"].flex-1').first();
    await expect(searchTab).toBeVisible({ timeout: 10000 });
    await searchTab.click();
    await this.page.waitForTimeout(1000);

    const subjectInput = this.page
      .locator('input[placeholder*="Subject" i], input[placeholder*="Enter Subject"]')
      .first();
    await expect(subjectInput).toBeVisible({ timeout: 15000 });
  }
}

module.exports = { TicketsManagerPage };

