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
   * Click the + Ticket button to open ticket creation form
   * Uses recommended getByRole approach with exact match to avoid matching "Tickets Manager" or "Ticket Replies"
   */
  async clickAddTicket() {
    // Use exact: true to match only "Ticket" (not "Tickets Manager" or "Ticket Replies")
    // The button has class "inline-flex items-center gap-1 rounded-full bg-[#4540a6]"
    const button = this.page.getByRole('button', { name: 'Ticket', exact: true });
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
}

module.exports = { TicketsManagerPage };

