const { expect } = require('@playwright/test');

/**
 * Dashboard Page Object Model
 * Contains all selectors and methods for the dashboard/welcome page
 */
class DashboardPage {
  constructor(page) {
    this.page = page;
    // Selectors - Try multiple variations to find Tickets Manager button/link
    this.ticketsManagerButton = 'button:has-text("Tickets Manager"), a:has-text("Tickets Manager"), [href*="tickets-manager"], button:has-text("Tickets"), a:has-text("Tickets")';
    this.welcomeText = 'text=Welcome';
  }

  /**
   * Navigate to the dashboard welcome page
   */
  async goto() {
    await this.page.goto('/dashboard/welcome');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click the Tickets Manager button/link
   */
  async clickTicketsManager() {
    // Use getByRole to target the button specifically (not the heading)
    // The button is in the sidebar navigation
    const button = this.page.getByRole('button', { name: 'Tickets Manager' });
    await button.waitFor({ state: 'visible', timeout: 10000 });
    await button.click();
    // Wait for navigation to complete (use domcontentloaded instead of networkidle)
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Verify we're on the welcome page
   */
  async verifyWelcomePage() {
    await expect(this.page).toHaveURL(/.*dashboard\/welcome/);
  }

  /**
   * Wait for navigation to tickets manager page
   */
  async waitForTicketsManagerPage() {
    await this.page.waitForURL('**/dashboard/tickets-manager', { timeout: 10000 });
  }

  /**
   * Verify we're on the tickets manager page
   */
  async verifyTicketsManagerPage() {
    // Use regex to work with any baseURL instead of hardcoded URL
    await expect(this.page).toHaveURL('http://46.62.211.210:4003/dashboard/tickets-manager');
  }
}

module.exports = { DashboardPage };

