const { expect } = require('@playwright/test');

/**
 * Tickets Manager Page Object Model
 * Contains all selectors and methods for the tickets manager page
 */
class TicketsManagerPage {
  constructor(page) {
    this.page = page;
    // Selectors
    // + Ticket button: button with text "Ticket" containing SVG plus icon
    this.addTicketButton = 'button:has-text("Ticket"):has(svg), button.bg-\\[\\#4540a6\\]:has-text("Ticket"), button:has-text("Ticket").rounded-full';
    this.addTaskButton = 'button:has-text("+ Task")';
    this.ticketsManagerTitle = 'text=Tickets Manager';
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
   * Click the + Ticket button to open ticket creation form
   */
  async clickAddTicket() {
    // Find button with text "Ticket" that contains SVG plus icon
    // The button has class with bg-[#4540a6] and contains "Ticket" text
    const button = this.page.locator('button:has-text("Ticket"):has(svg)').first();
    await button.waitFor({ state: 'visible', timeout: 10000 });
    await button.click();
    // Wait for form/modal to appear
    await this.page.waitForTimeout(1000);
  }

  /**
   * Verify we're on the tickets manager page
   */
  async verifyTicketsManagerPage() {
    await expect(this.page).toHaveURL('https://support.cwit.ae/dashboard/tickets-manager');
    await expect(this.page.locator(this.ticketsManagerTitle)).toBeVisible();
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
    await this.page.waitForSelector(this.ticketForm, { state: 'visible', timeout: 10000 });
  }
}

module.exports = { TicketsManagerPage };

