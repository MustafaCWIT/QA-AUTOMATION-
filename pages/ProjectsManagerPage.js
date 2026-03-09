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
   * Wait for the Create Project modal to close and for the projects-manager screen to be visible
   */
  async waitForProjectFormClosedAndProjectsManagerScreen() {
    // Wait for Create Project modal to close (element detached from DOM or hidden)
    const modalHeading = this.page.locator('h2:has-text("Create Project")');
    await Promise.race([
      modalHeading.waitFor({ state: 'detached', timeout: 15000 }),
      modalHeading.waitFor({ state: 'hidden', timeout: 15000 }),
    ]);

    // Wait for projects-manager URL (http://46.62.211.210:4003/dashboard/projects-manager)
    await expect(this.page).toHaveURL(/\/dashboard\/projects-manager/, { timeout: 15000 });

    // Wait for projects-manager screen content (table or Project button)
    await this.page.waitForSelector('table, button:has-text("Project")', { state: 'visible', timeout: 10000 });
  }

  /**
   * Verify the project creation form is open
   */
  async verifyProjectFormOpen() {
    await expect(this.page.locator('h2:has-text("Create Project")')).toBeVisible({ timeout: 10000 });

    const titleInput = this.page.locator('input[placeholder="Title"]').first();
    await expect(titleInput).toBeVisible({ timeout: 10000 });
  }

  /**
   * Click the project ID link for a project row (opens/selects the project)
   * @param {string} projectTitle - The project title to find in the table
   */
  async clickProjectId(projectTitle) {
    const projectRow = this.page.locator('table tbody tr').filter({ hasText: projectTitle }).first();
    await expect(projectRow).toBeVisible({ timeout: 15000 });

    // Project ID is in the first column — clickable span with format PJEHU-XXXXX
    const projectIdLink = projectRow.locator('td').first().locator('span.text-indigo-600, span[class*="indigo"]').first();
    await expect(projectIdLink).toBeVisible({ timeout: 5000 });
    await projectIdLink.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Click the ellipsis (more options) button for a project row, then click "Create Task from Project"
   * @param {string} projectTitle - The project title to find in the table
   */
  async clickCreateTaskFromProject(projectTitle) {
    // Find the project row by title (Title column contains the project name)
    const projectRow = this.page.locator('table tbody tr').filter({ hasText: projectTitle }).first();
    await expect(projectRow).toBeVisible({ timeout: 15000 });

    // Scroll the Projects table container horizontally (not the page) so Actions column is visible
    const tableContainer = this.page.locator('div.sidebar-scrollbar').filter({
      has: this.page.locator('table').filter({ has: this.page.locator('th:has-text("Actions")') }),
    }).first();
    if (await tableContainer.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tableContainer.evaluate((el) => {
        el.scrollLeft = el.scrollWidth;
      });
      await this.page.waitForTimeout(500);
    } else {
      // Fallback: find scrollable parent of the project row's table
      await projectRow.evaluate((row) => {
        const table = row.closest('table');
        if (table) {
          const wrapper = table.closest('[class*="overflow"]') || table.parentElement;
          if (wrapper && wrapper.scrollWidth > wrapper.clientWidth) {
            wrapper.scrollLeft = wrapper.scrollWidth;
          }
        }
      });
      await this.page.waitForTimeout(500);
    }

    // Ellipsis button: try multiple selectors (data-id, aria-label, or SVG with vertical dots)
    let ellipsisBtn = projectRow.locator('button[data-id="Project More Options"]').first();
    if (!(await ellipsisBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
      ellipsisBtn = projectRow.locator('button[aria-label="More options"]').first();
    }
    if (!(await ellipsisBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
      ellipsisBtn = projectRow.locator('button:has(svg.lucide-ellipsis-vertical)').first();
    }
    if (!(await ellipsisBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
      ellipsisBtn = projectRow.locator('button:has(svg circle[cx="12"][cy="19"])').first();
    }

    await expect(ellipsisBtn).toBeVisible({ timeout: 5000 });
    await ellipsisBtn.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(200);

    // Click — try normal first, then force if needed
    try {
      await ellipsisBtn.click({ timeout: 5000 });
    } catch {
      await ellipsisBtn.click({ force: true, timeout: 5000 });
    }
    await this.page.waitForTimeout(500);

    // Click "Create Task from Project" in the dropdown menu
    const createTaskBtn = this.page.locator('button[data-id="Create Task from Project"]').first();
    await expect(createTaskBtn).toBeVisible({ timeout: 5000 });
    await createTaskBtn.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Wait for the task creation form to appear (opened from project context)
   */
  async waitForTaskForm() {
    await Promise.race([
      this.page.waitForSelector('input[placeholder="Title"]', { state: 'visible', timeout: 15000 }),
      this.page.waitForSelector('button[data-id="Create Task"]', { state: 'visible', timeout: 15000 }),
      this.page.waitForSelector('button[data-id="Details"]', { state: 'visible', timeout: 15000 }),
    ]).catch(() => {
      return this.page.waitForTimeout(2000);
    });
  }
}

module.exports = { ProjectsManagerPage };
