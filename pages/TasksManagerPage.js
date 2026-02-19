const { expect } = require('@playwright/test');

/**
 * Tasks Manager Page Object Model
 * Contains all selectors and methods for the tasks page and task creation form
 */
class TasksManagerPage {
  constructor(page) {
    this.page = page;
  }

  /**
   * Navigate to the tickets manager page (tasks are created from here)
   */
  async goto() {
    await this.page.goto('/dashboard/tickets-manager');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click the "+ Task" button to open task creation form
   */
  async clickAddTask() {
    // The "+" is an SVG icon, so button text is just "Task"
    // Use exact match to avoid matching "Tasks Manager" or other elements
    const button = this.page.getByRole('button', { name: 'Task', exact: true });
    await button.waitFor({ state: 'visible', timeout: 10000 });
    await button.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Wait for the task creation form to appear
   */
  async waitForTaskForm() {
    await Promise.race([
      this.page.waitForSelector('input[placeholder="Title"]', { state: 'visible', timeout: 15000 }),
      this.page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 15000 }),
      this.page.waitForSelector('button[data-id="Details"]', { state: 'visible', timeout: 15000 }),
    ]).catch(() => {
      return this.page.waitForTimeout(2000);
    });
  }

  /**
   * Verify the task creation form is open by checking for the Title input
   */
  async verifyTaskFormOpen() {
    const titleInput = this.page.locator('input[placeholder="Title"]').first();
    await expect(titleInput).toBeVisible({ timeout: 10000 });
  }

  /**
   * Switch to a specific tab in the task creation form
   * @param {'Details' | 'Checklist' | 'Assignee(s)'} tabName
   */
  async switchTab(tabName) {
    const tab = this.page.locator(`button[data-id="${tabName}"]`).first();
    await expect(tab).toBeVisible({ timeout: 5000 });
    await tab.click();
    await this.page.waitForTimeout(500);
  }
}

module.exports = { TasksManagerPage };
