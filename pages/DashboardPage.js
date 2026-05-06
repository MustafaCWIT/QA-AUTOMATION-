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
    this.timesheetButton = 'button:has-text("Timesheet"), a:has-text("Timesheet"), [href*="timesheet"]';
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
    // Wait for the welcome page to be fully loaded and stable
    await this.page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Wait for the welcome message to appear, ensuring page is ready
    await expect(this.page.locator('text=/Welcome/i')).toBeVisible({ timeout: 10000 });
    
    // The button has text "Ticket Manager" (singular, not "Tickets Manager")
    // It contains SVG icons and may have an arrow (→) after the text
    // Use locator with text filter - this is most reliable for buttons with icons
    const button = this.page.locator('button').filter({ hasText: /Ticket Manager/i }).first();
    
    // Wait for button to be visible, enabled, and stable
    await expect(button).toBeVisible({ timeout: 15000 });
    await expect(button).toBeEnabled({ timeout: 5000 });
    
    // Ensure button is in viewport and clickable
    await button.scrollIntoViewIfNeeded();
    
    // Wait a bit for any animations or transitions to complete
    await this.page.waitForTimeout(500);
    
    // Verify button is still visible and enabled before clicking
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
    
    // Get button bounding box to verify it's actually on screen
    const box = await button.boundingBox();
    if (!box || box.width === 0 || box.height === 0) {
      throw new Error('Ticket Manager button is not visible or has zero size in viewport');
    }
    
    // Click the button - use force: false to ensure it's actually clickable
    await button.click({ timeout: 10000, force: false });
    
    // Wait for navigation to start
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Click the Timesheet button/link to navigate to timesheet page
   */
  async clickTimesheet() {
    // Use getByRole to target the button specifically (not the heading)
    // The button is in the sidebar navigation
    const button = this.page.getByRole('button', { name: 'Timesheet' });
    await button.waitFor({ state: 'visible', timeout: 10000 });
    await button.click();
    // Wait for navigation to complete
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Wait for navigation to timesheet page
   */
  async waitForTimesheetPage() {
    await this.page.waitForURL('**/dashboard/timesheet', { timeout: 10000 });
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

