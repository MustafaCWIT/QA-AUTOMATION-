const { test, expect } = require('@playwright/test');
const { ProjectsManagerPage } = require('../pages/ProjectsManagerPage');
const testData = require('../utils/test-data');

/**
 * Playwright test for creating a project.
 *
 * Create Project form structure (from HTML):
 *
 * TABS: Details | Checklist | Assignee(s) | Checklist Assignees | Meta
 *
 * DETAILS TAB:
 *   - Owner Type: combobox (defaults to "User")
 *   - Owner: combobox (e.g. "Reads (testreads@maxenpower.com)")
 *   - Template: combobox ("Select Template" - optional)
 *   - Title: input[placeholder="Title"] (required - Create Project disabled without it)
 *   - Description: TipTap ProseMirror editor (data-placeholder="Enter task description...")
 *   - Start Date: input[type="datetime-local"]
 *   - Due Date: input[type="datetime-local"] (required)
 *   - Estimated Hours: input[placeholder="Enter hours"]
 *   - Estimated Days: input[placeholder="Working days"]
 *   - Priority: combobox (Normal | Low | Medium | High | Critical)
 *   - Status: combobox (To-Do | In Progress | Review)
 *   - Project Type: combobox (Technical - Ticket)
 *   - Reminder (Hours): input[placeholder="0 to disable"]
 *
 * BOTTOM BUTTONS: Close | Reset | Create Project (disabled until Title filled)
 */

// ============================================================
// HELPER: Select an option from a Combobox
// ============================================================
async function selectComboboxOption(page, label, optionText, timeout = 10000) {
  try {
    console.log(`Attempting to select "${optionText}" for "${label}"`);

    let comboboxTrigger = null;
    const labelElement = page.locator('label').filter({ hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\*?\\s*$`) }).first();
    const labelVisible = await labelElement.isVisible({ timeout: 3000 }).catch(() => false);

    if (labelVisible) {
      const parentDiv = labelElement.locator('..');
      comboboxTrigger = parentDiv.locator('button[role="combobox"]').first();

      if (!(await comboboxTrigger.isVisible({ timeout: 2000 }).catch(() => false))) {
        comboboxTrigger = labelElement.locator('xpath=following-sibling::button[@role="combobox"]').first();
      }
      if (!(await comboboxTrigger.isVisible({ timeout: 2000 }).catch(() => false))) {
        comboboxTrigger = labelElement.locator('xpath=following::button[@role="combobox"][1]').first();
      }
    }

    if (!comboboxTrigger || !(await comboboxTrigger.isVisible({ timeout: 2000 }).catch(() => false))) {
      throw new Error(`Could not find combobox trigger for "${label}"`);
    }

    await expect(comboboxTrigger).toBeVisible({ timeout });
    await comboboxTrigger.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const isExpanded = await comboboxTrigger.getAttribute('aria-expanded');
    if (isExpanded !== 'true') {
      await comboboxTrigger.click({ timeout });
      await page.waitForTimeout(500);
    }

    const popoverSelectors = ['[role="dialog"]', '[role="listbox"]', '[data-radix-popper-content-wrapper]'];
    for (const selector of popoverSelectors) {
      if (await page.locator(selector).first().isVisible({ timeout: 2000 }).catch(() => false)) break;
    }

    const searchInput = page.locator(
      '[role="dialog"] input[type="text"], [role="dialog"] input[type="search"], [data-radix-popper-content-wrapper] input'
    ).first();

    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.click();
      await searchInput.press('Control+a');
      await searchInput.press('Delete');
      await searchInput.fill(optionText);
      await page.waitForTimeout(1200);
    }

    let option = page.locator(`[role="option"]:has-text("${optionText}")`).first();
    if (!(await option.isVisible({ timeout: 3000 }).catch(() => false))) {
      option = page.locator('[role="option"]').filter({ hasText: optionText }).first();
    }
    if (!(await option.isVisible({ timeout: 3000 }).catch(() => false))) {
      option = page.locator('[role="option"]').filter({ hasText: new RegExp(optionText, 'i') }).first();
    }

    if (!(await option.isVisible({ timeout: 3000 }).catch(() => false))) {
      await page.screenshot({ path: `combobox-error-${label.replace(/\s+/g, '-')}.png` });
      throw new Error(`Could not find option "${optionText}" in dropdown for "${label}"`);
    }

    await option.scrollIntoViewIfNeeded();
    await option.click();
    await page.waitForTimeout(800);

    console.log(`✅ Selected "${optionText}" for "${label}"`);
  } catch (error) {
    console.error(`❌ Error selecting "${optionText}" for "${label}":`, error);
    await page.screenshot({ path: `combobox-error-${label.replace(/\s+/g, '-')}.png` }).catch(() => {});
    throw error;
  }
}

// ============================================================
// HELPER: Fill TipTap / ProseMirror rich text editor
// ============================================================
async function fillDescription(page, content) {
  const editor = page.locator('div[data-field="description"] .ProseMirror, [contenteditable="true"].ProseMirror').first();
  await expect(editor).toBeVisible({ timeout: 10000 });
  await editor.click();
  await editor.press('Control+a');
  await editor.press('Delete');
  await editor.type(content, { delay: 30 });
  await page.waitForTimeout(500);
  console.log('✅ Description filled');
}

// ============================================================
// TEST SUITE
// ============================================================
test.describe('Project Creation', () => {
  test.beforeEach(async ({ page }) => {
    const projectsManagerPage = new ProjectsManagerPage(page);
    await projectsManagerPage.goto();

    // Click "+ Project" button to open the project creation form
    await projectsManagerPage.clickAddProject();

    await projectsManagerPage.waitForProjectForm();
    await projectsManagerPage.verifyProjectFormOpen();
  });

  test('should create a new project with all required fields', async ({ page }) => {
    test.setTimeout(120000);

    const projectData = testData.projectData || {
      title: 'E2E Test Project - Automated Playwright Test',
      description: 'This project was created by an automated Playwright test.',
      ownerType: 'User',
      owner: 'Reads',
      startDate: '2026-03-06T06:00',
      dueDate: '2026-03-15T17:00',
      estimatedHours: '40',
      estimatedDays: '5',
      priority: 'High',
      status: 'To-Do',
      projectType: 'Technical - Ticket',
      reminderHours: '2',
    };

    // =============================================
    // 1. DETAILS TAB (default active)
    // =============================================
    await test.step('Fill Project Details', async () => {
      // Title (required - enables Create Project button)
      const titleInput = page.locator('input[placeholder="Title"]').first();
      await titleInput.fill(projectData.title);
      console.log(`✅ Title: "${projectData.title}"`);

      // Description (TipTap ProseMirror editor)
      await fillDescription(page, projectData.description);

      // Owner Type (combobox - defaults to "User")
      if (projectData.ownerType && projectData.ownerType !== 'User') {
        await selectComboboxOption(page, 'Owner Type', projectData.ownerType);
      } else {
        console.log('✅ Owner Type already set to "User" (default)');
      }

      // Owner (combobox)
      if (projectData.owner) {
        await selectComboboxOption(page, 'Owner', projectData.owner);
      }

      // Template (optional)
      if (projectData.template) {
        await selectComboboxOption(page, 'Template', projectData.template);
      }

      // Start Date
      if (projectData.startDate) {
        const startDateInput = page.locator('label:has-text("Start Date")').locator('..').locator('input[type="datetime-local"]').first();
        if (await startDateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await startDateInput.fill(projectData.startDate);
          console.log(`✅ Start Date: "${projectData.startDate}"`);
        }
      }

      // Due Date (required)
      const dueDateInput = page.locator('label:has-text("Due Date")').locator('..').locator('input[type="datetime-local"]').first();
      await expect(dueDateInput).toBeVisible({ timeout: 5000 });
      await dueDateInput.fill(projectData.dueDate);
      console.log(`✅ Due Date: "${projectData.dueDate}"`);

      // Estimated Hours
      if (projectData.estimatedHours) {
        const estimatedInput = page.locator('input[placeholder="Enter hours"]').first();
        if (await estimatedInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await estimatedInput.fill(projectData.estimatedHours);
          console.log(`✅ Estimated Hours: ${projectData.estimatedHours}`);
        }
      }

      // Estimated Days
      if (projectData.estimatedDays) {
        const estimatedDaysInput = page.locator('input[placeholder="Working days"]').first();
        if (await estimatedDaysInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await estimatedDaysInput.fill(projectData.estimatedDays);
          console.log(`✅ Estimated Days: ${projectData.estimatedDays}`);
        }
      }

      // Priority (combobox)
      if (projectData.priority) {
        await selectComboboxOption(page, 'Priority', projectData.priority);
      }

      // Status (combobox)
      if (projectData.status) {
        await selectComboboxOption(page, 'Status', projectData.status);
      }

      // Project Type (combobox)
      if (projectData.projectType) {
        await selectComboboxOption(page, 'Project Type', projectData.projectType);
      }

      // Reminder (Hours)
      if (projectData.reminderHours) {
        const reminderInput = page.locator('input[placeholder="0 to disable"]').first();
        if (await reminderInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await reminderInput.fill(projectData.reminderHours);
          console.log(`✅ Reminder: ${projectData.reminderHours} hours`);
        }
      }
    });

    // =============================================
    // 2. SUBMIT THE PROJECT
    // =============================================
    await test.step('Submit Project', async () => {
      const createProjectBtn = page.locator('button[data-id="Create Project"]').first();
      await expect(createProjectBtn).toBeVisible({ timeout: 10000 });
      await createProjectBtn.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);

      await expect(createProjectBtn).toBeEnabled({ timeout: 5000 });

      await page.screenshot({ path: 'project-form-before-submit.png', fullPage: true });

      await createProjectBtn.click();
      console.log('✅ Clicked Create Project button');
    });

    // Wait for success feedback (toast or redirect)
    await expect(page.getByText(/created|success/i)).toBeVisible({ timeout: 30000 });
    console.log('✅ Project created successfully!');
  });

  test('should validate that Title is required', async ({ page }) => {
    const createProjectBtn = page.locator('button[data-id="Create Project"]').first();
    await expect(createProjectBtn).toBeVisible({ timeout: 5000 });
    await expect(createProjectBtn).toBeDisabled();
    console.log('✅ Create Project button is disabled when Title is empty');

    await expect(createProjectBtn).toHaveAttribute('title', 'Title is required');
    console.log('✅ Button shows "Title is required" tooltip');

    // Fill Title and Due Date, verify button becomes enabled
    await page.locator('input[placeholder="Title"]').first().fill('Test Project Title');
    await page.waitForTimeout(300);

    const dueDateInput = page.locator('label:has-text("Due Date")').locator('..').locator('input[type="datetime-local"]').first();
    await dueDateInput.fill('2026-03-15T17:00');
    await page.waitForTimeout(500);

    await expect(createProjectBtn).toBeEnabled({ timeout: 5000 });
    console.log('✅ Create Project button becomes enabled after filling Title + Due Date');
  });
});
