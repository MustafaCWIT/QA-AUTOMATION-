const { expect } = require('@playwright/test');

/**
 * Projects Manager Page Object Model
 * Contains selectors and methods for the projects manager page and project creation form
 */
class ProjectsManagerPage {
  constructor(page) {
    this.page = page;
  }

  /**
   * Navigate to the projects manager page
   */
  async goto() {
    await this.page.goto('/dashboard/projects-manager');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click the "+ Project" button to open project creation form
   */
  async clickAddProject() {
    const button = this.page.getByRole('button', { name: 'Project', exact: true });
    await button.waitFor({ state: 'visible', timeout: 10000 });
    await button.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Wait for the project creation form to appear
   */
  async waitForProjectForm() {
    await Promise.race([
      this.page.waitForSelector('h2:has-text("Create Project")', { state: 'visible', timeout: 15000 }),
      this.page.waitForSelector('button[data-id="Create Project"]', { state: 'visible', timeout: 15000 }),
      this.page.waitForSelector('input[placeholder="Title"]', { state: 'visible', timeout: 15000 }),
    ]).catch(() => {
      return this.page.waitForTimeout(2000);
    });
  }

  /**
   * Verify the project creation form is open
   */
  async verifyProjectFormOpen() {
    await expect(this.page.locator('h2:has-text("Create Project")')).toBeVisible({ timeout: 10000 });

    const titleInput = this.page.locator('input[placeholder="Title"]').first();
    await expect(titleInput).toBeVisible({ timeout: 10000 });
  }
}

module.exports = { ProjectsManagerPage };
