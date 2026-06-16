const { test, expect } = require('@playwright/test');
const { ProjectsManagerPage } = require('../pages/ProjectsManagerPage');
const { TasksManagerPage } = require('../pages/TasksManagerPage');
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
// HELPER: Select radio pill (for Task form - Priority / Status)
// ============================================================
async function selectRadioPill(page, radioName, optionText) {
  const label = page.locator(`label:has(input[name="${radioName}"])`).filter({ hasText: optionText }).first();
  await expect(label).toBeVisible({ timeout: 5000 });
  await label.click();
  await page.waitForTimeout(300);
  console.log(`✅ Selected "${optionText}" for ${radioName}`);
}

// ============================================================
// HELPER: Open combobox by label and select first option (Task Type)
// ============================================================
async function selectFirstComboboxOption(page, label, timeout = 10000) {
  try {
    console.log(`Selecting mandatory "${label}" option: Technical - Ticket`);

    const labelElement = page.locator('label').filter({ hasText: new RegExp(`^${label}\\s*\\*?\\s*$`) }).first();
    await expect(labelElement).toBeVisible({ timeout });

    const comboboxTrigger = labelElement.locator('..').locator('button[role="combobox"]').first();
    await expect(comboboxTrigger).toBeVisible({ timeout });
    await comboboxTrigger.scrollIntoViewIfNeeded();
    await comboboxTrigger.click({ timeout });

    const openDialog = page.locator('[role="dialog"][data-state="open"]').last();
    await expect(openDialog).toBeVisible({ timeout });

    let option = openDialog.locator('[role="option"]').filter({ hasText: /Technical\s*-\s*Ticket/i }).first();
    if (!(await option.isVisible({ timeout: 2000 }).catch(() => false))) {
      option = openDialog.locator('[role="option"]').first();
    }

    await expect(option).toBeVisible({ timeout });
    await option.scrollIntoViewIfNeeded();
    await option.click({ timeout, force: true });
    await page.waitForTimeout(500);

    console.log(`✅ Selected option for "${label}"`);
  } catch (error) {
    console.error(`❌ Error selecting first option for "${label}":`, error);
    await page.screenshot({ path: `combobox-error-${label.replace(/\s+/g, '-')}.png` }).catch(() => {});
    throw error;
  }
}

// ============================================================
// HELPER: Set due date for datetime-local input (Task form)
// ============================================================
function formatDateTimeLocal(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function setDateTimeLocalByLabel(page, label, preferredDateTime) {
  const dateInput = page
    .locator(`label:has-text("${label}")`)
    .locator('..')
    .locator('input[type="datetime-local"]')
    .first();

  await expect(dateInput).toBeVisible({ timeout: 5000 });
  await dateInput.scrollIntoViewIfNeeded();
  await dateInput.click();

  let targetDate = preferredDateTime ? new Date(preferredDateTime) : new Date(Date.now() + 60 * 60 * 1000);
  if (Number.isNaN(targetDate.getTime())) {
    targetDate = new Date(Date.now() + 60 * 60 * 1000);
  }

  const minValue = await dateInput.getAttribute('min');
  if (minValue) {
    const minDate = new Date(minValue);
    if (!Number.isNaN(minDate.getTime()) && targetDate < minDate) {
      targetDate = new Date(minDate.getTime() + 60 * 1000);
    }
  }

  const finalValue = formatDateTimeLocal(targetDate);
  await dateInput.fill(finalValue);
  await dateInput.press('Tab');
  await expect(dateInput).toHaveValue(finalValue);
  console.log(`✅ ${label}: "${finalValue}"`);
}

async function setStartDate(page, preferredDateTime) {
  await setDateTimeLocalByLabel(page, 'Start Date', preferredDateTime);
}

async function setDueDate(page, preferredDateTime) {
  await setDateTimeLocalByLabel(page, 'Due Date', preferredDateTime);
}

// ============================================================
// HELPER: Dismiss "Proceed without all Task details?" modal
// ============================================================
async function clickCreateTaskAnywayIfVisible(page, timeout = 5000) {
  const taskConfirmModal = page.getByText('Proceed without all Task details?');
  if (await taskConfirmModal.isVisible({ timeout }).catch(() => false)) {
    const createAnywayBtn = page.locator('button:has-text("Create anyway")').first();
    await expect(createAnywayBtn).toBeVisible({ timeout });
    await createAnywayBtn.click();
    console.log('✅ Clicked "Create anyway" in task confirmation modal');
  }
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
      owner: 'Mohammad Shoaib',
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

      // Confirmation modal: "Proceed without all Project details?" — click "Create anyway"
      const createAnywayBtn = page.locator('button:has-text("Create anyway")').first();
      if (await createAnywayBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await createAnywayBtn.click();
        console.log('✅ Clicked "Create anyway" in confirmation modal');
      }
    });

    // Wait for Create Project modal to close and projects-manager screen to be visible
    const projectsManagerPage = new ProjectsManagerPage(page);
    await projectsManagerPage.waitForProjectFormClosedAndProjectsManagerScreen();
    console.log('✅ Create Project modal closed, projects-manager screen visible');

    // Wait for success feedback (toast or redirect)
    await expect(page.getByText(/created|success/i)).toBeVisible({ timeout: 30000 });
    console.log('✅ Project created successfully!');

    // Click on project ID to redirect to tasks view (e.g. /dashboard/tasks?task=713&source=projects&projectId=713&view=list)
    await projectsManagerPage.clickProjectId(projectData.title, {
      expectedUrl: /\/dashboard\/tasks\?.*source=projects.*projectId=\d+.*view=list/,
    });
    console.log('✅ Clicked project ID, redirected to tasks view');
  });

  test('should create 100 projects under one test', async ({ page }) => {
    test.setTimeout(3600000); // 60 minutes

    const TOTAL_PROJECTS = 100;
    const projectsManagerPage = new ProjectsManagerPage(page);

    for (let i = 0; i < TOTAL_PROJECTS; i++) {
      const index = i + 1;
      const uniqueTitle = `E2E Bulk Project ${String(index).padStart(3, '0')} - ${Date.now()}`;

      await test.step(`Create project ${index}/${TOTAL_PROJECTS}`, async () => {
        // Fill required and key fields for stable bulk creation.
        const titleInput = page.locator('input[placeholder="Title"]').first();
        await expect(titleInput).toBeVisible({ timeout: 10000 });
        await titleInput.fill(uniqueTitle);

        const description = `Bulk project description for project ${index}/${TOTAL_PROJECTS}.`;
        await fillDescription(page, description);

        const dueDateInput = page.locator('label:has-text("Due Date")').locator('..').locator('input[type="datetime-local"]').first();
        await expect(dueDateInput).toBeVisible({ timeout: 10000 });
        await dueDateInput.fill('2026-12-31T17:00');

        // Project Type combobox is sometimes rendered with placeholder text instead of easy label targeting.
        try {
          await selectComboboxOption(page, 'Project Type', 'Technical - Ticket');
        } catch (_error) {
          const projectTypeCombo = page.locator('button[role="combobox"]').filter({ hasText: /select project type/i }).first();
          await expect(projectTypeCombo).toBeVisible({ timeout: 10000 });
          await projectTypeCombo.click();

          const projectTypeOption = page.locator('[role="option"]').filter({ hasText: /technical\s*-\s*ticket/i }).first();
          await expect(projectTypeOption).toBeVisible({ timeout: 10000 });
          await projectTypeOption.click();
          await page.waitForTimeout(500);
          console.log('✅ Selected "Technical - Ticket" for Project Type (fallback locator)');
        }

        const createProjectBtn = page.locator('button[data-id="Create Project"]').first();
        await expect(createProjectBtn).toBeVisible({ timeout: 10000 });
        await expect(createProjectBtn).toBeEnabled({ timeout: 10000 });
        await createProjectBtn.click();

        const createAnywayBtn = page.locator('button:has-text("Create anyway")').first();
        if (await createAnywayBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
          await createAnywayBtn.click();
        }

        await projectsManagerPage.waitForProjectFormClosedAndProjectsManagerScreen();
        await expect(page.getByText(/created|success/i)).toBeVisible({ timeout: 30000 });
        console.log(`✅ Created project ${index}/${TOTAL_PROJECTS}: ${uniqueTitle}`);
      });

      if (index < TOTAL_PROJECTS) {
        await projectsManagerPage.clickAddProject();
        await projectsManagerPage.waitForProjectForm();
        await projectsManagerPage.verifyProjectFormOpen();
      }
    }
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

// ============================================================
// CREATE TASK UNDER PROJECT (sibling describe — no beforeEach)
// ============================================================
test.describe('Create Task Under Project', () => {
  test('should create task under project', async ({ page }) => {
    test.setTimeout(120000);

    const projectsManagerPage = new ProjectsManagerPage(page);
    const tasksManagerPage = new TasksManagerPage(page);

    const projectTitle = `E2E Task Under Project - ${Date.now()}`;
    const taskData = {
      title: `E2E Task Under Project Task - ${Date.now()}`,
      description: 'This task was created under a project via the ellipsis menu in an automated Playwright test.',
      ownerType: 'User',
      owner: 'EHU',
      taskType: 'Technical - Ticket',
      priority: 'High',
      status: 'In Progress',
      startDate: '2026-06-12T09:00',
      dueDate: '2026-06-14T17:00',
      reminderHours: '2',
      estimatedHours: '8',
      checklistItem: 'Verify all user inputs are validated',
      checklistMandatory: true,
      checklistAttachment: false,
      assigneeType: 'User',
      assigneeName: 'EHU',
    };

    await test.step('Create project', async () => {
      await projectsManagerPage.goto();
      await projectsManagerPage.clickAddProject();
      await projectsManagerPage.waitForProjectForm();
      await projectsManagerPage.verifyProjectFormOpen();

      const titleInput = page.locator('input[placeholder="Title"]').first();
      await titleInput.fill(projectTitle);
      console.log(`✅ Project Title: "${projectTitle}"`);

      await fillDescription(page, 'Project created for task-under-project E2E test.');

      const dueDateInput = page.locator('label:has-text("Due Date")').locator('..').locator('input[type="datetime-local"]').first();
      await expect(dueDateInput).toBeVisible({ timeout: 5000 });
      await dueDateInput.fill('2026-06-16T17:00');

      try {
        await selectComboboxOption(page, 'Project Type', 'Technical - Ticket');
      } catch (_error) {
        const projectTypeCombo = page.locator('button[role="combobox"]').filter({ hasText: /select project type/i }).first();
        await expect(projectTypeCombo).toBeVisible({ timeout: 10000 });
        await projectTypeCombo.click();
        const projectTypeOption = page.locator('[role="option"]').filter({ hasText: /technical\s*-\s*ticket/i }).first();
        await expect(projectTypeOption).toBeVisible({ timeout: 10000 });
        await projectTypeOption.click();
        await page.waitForTimeout(500);
      }

      const createProjectBtn = page.locator('button[data-id="Create Project"]').first();
      await expect(createProjectBtn).toBeEnabled({ timeout: 10000 });
      await createProjectBtn.click();

      const createAnywayBtn = page.locator('button:has-text("Create anyway")').first();
      if (await createAnywayBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
        await createAnywayBtn.click();
      }

      await projectsManagerPage.waitForProjectFormClosedAndProjectsManagerScreen();
      await expect(page.getByText(/created|success/i)).toBeVisible({ timeout: 30000 });
      console.log('✅ Project created successfully');
    });

    await test.step('Open Create Task from project ellipsis menu', async () => {
      await projectsManagerPage.clickCreateTaskFromProject(projectTitle);
      await projectsManagerPage.waitForTaskForm();
      await tasksManagerPage.verifyTaskFormOpen();
      console.log('✅ Task form opened from project ellipsis menu');
    });

    await test.step('Fill Task Details', async () => {
      const titleInput = page.locator('input[placeholder="Title"]').first();
      await titleInput.fill(taskData.title);
      console.log(`✅ Task Title: "${taskData.title}"`);

      await fillDescription(page, taskData.description);
      await selectRadioPill(page, 'task_priority', taskData.priority);
      await selectRadioPill(page, 'task_status_by_dept', taskData.status);

      if (taskData.ownerType !== 'User') {
        await selectComboboxOption(page, 'Owner Type', taskData.ownerType);
      }

      await selectComboboxOption(page, 'Owner', taskData.owner);
      await selectFirstComboboxOption(page, 'Task Type');
      await setStartDate(page, taskData.startDate);
      await setDueDate(page, taskData.dueDate);

      if (taskData.reminderHours) {
        const reminderInput = page.locator('input[placeholder="0 to disable"]').first();
        if (await reminderInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await reminderInput.fill(taskData.reminderHours);
        }
      }

      if (taskData.estimatedHours) {
        const estimatedInput = page.locator('input[placeholder="Enter hours"]').first();
        if (await estimatedInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await estimatedInput.fill(taskData.estimatedHours);
        }
      }
    });

    await test.step('Add Checklist Items', async () => {
      await page.locator('button[data-id="Checklist"]').click();
      await page.waitForTimeout(500);

      const checklistInput = page.getByPlaceholder('Add new checklist item');
      await expect(checklistInput).toBeVisible({ timeout: 5000 });
      await checklistInput.fill(taskData.checklistItem);

      if (taskData.checklistMandatory) {
        await page.getByLabel('Mandatory').check();
      }
      if (taskData.checklistAttachment) {
        await page.getByLabel('Attachment').check();
      }

      await page.locator('button[data-id="Add"]').click();
      await page.waitForTimeout(500);
      await expect(page.getByText(taskData.checklistItem)).toBeVisible({ timeout: 5000 });
      console.log(`✅ Checklist item added: "${taskData.checklistItem}"`);
    });

    await test.step('Add Assignees', async () => {
      await page.locator('button[data-id="Assignee(s)"]').click();
      await page.waitForTimeout(500);

      const searchAssigneeCombobox = page.locator('button[role="combobox"]:has-text("Search assignee")').first();
      await expect(searchAssigneeCombobox).toBeVisible({ timeout: 5000 });
      await searchAssigneeCombobox.click();
      await page.waitForTimeout(500);

      const searchInput = page.locator('[role="dialog"] input, [data-radix-popper-content-wrapper] input').first();
      await expect(searchInput).toBeVisible({ timeout: 5000 });
      await searchInput.fill(taskData.assigneeName);
      await page.waitForTimeout(1500);

      const assigneeOption = page.locator('[role="option"]').filter({ hasText: taskData.assigneeName }).first();
      await expect(assigneeOption).toBeVisible({ timeout: 10000 });
      await assigneeOption.click();
      await page.waitForTimeout(500);

      const addBtn = page.locator('button[data-id="Add Assignee"]').first();
      await expect(addBtn).toBeEnabled({ timeout: 5000 });
      await addBtn.click();
      await page.waitForTimeout(800);
      console.log(`✅ Assignee added: ${taskData.assigneeName}`);
    });

    await test.step('Submit Task', async () => {
      const createTaskBtn = page.locator('button[data-id="Create Task"]').first();
      await expect(createTaskBtn).toBeVisible({ timeout: 10000 });
      await createTaskBtn.scrollIntoViewIfNeeded();
      await expect(createTaskBtn).toBeEnabled({ timeout: 5000 });
      await createTaskBtn.click();
      console.log('✅ Clicked Create Task button');

      await clickCreateTaskAnywayIfVisible(page);

      await expect(page.getByText(/Task Created Successfully/i)).toBeVisible({ timeout: 30000 });
      console.log('✅ Task created successfully under project');
    });
  });

  test('should create 100 tasks under one project', async ({ page }) => {
    test.setTimeout(3600000); // 60 minutes

    const TOTAL_TASKS = 100;
    const PROJECT_DUE_DATE = '2026-06-16T17:00';
    const TASK_START_DATE = '2026-06-12T09:00';
    const TASK_DUE_DATE = '2026-06-14T17:00';

    const projectsManagerPage = new ProjectsManagerPage(page);
    const tasksManagerPage = new TasksManagerPage(page);

    const projectTitle = `E2E Bulk Task Under Project - ${Date.now()}`;
    const baseTaskData = {
      description: 'Bulk task created under a project via the ellipsis menu in an automated Playwright test.',
      ownerType: 'User',
      owner: 'EHU',
      priority: 'High',
      status: 'To-Do',
      startDate: TASK_START_DATE,
      dueDate: TASK_DUE_DATE,
      reminderHours: '2',
      estimatedHours: '8',
    };

    await test.step('Create project', async () => {
      await projectsManagerPage.goto();
      await projectsManagerPage.clickAddProject();
      await projectsManagerPage.waitForProjectForm();
      await projectsManagerPage.verifyProjectFormOpen();

      const titleInput = page.locator('input[placeholder="Title"]').first();
      await titleInput.fill(projectTitle);
      console.log(`✅ Project Title: "${projectTitle}"`);

      await fillDescription(page, 'Bulk project for creating 100 tasks under one project.');

      await setDateTimeLocalByLabel(page, 'Due Date', PROJECT_DUE_DATE);

      try {
        await selectComboboxOption(page, 'Project Type', 'Technical - Ticket');
      } catch (_error) {
        const projectTypeCombo = page.locator('button[role="combobox"]').filter({ hasText: /select project type/i }).first();
        await expect(projectTypeCombo).toBeVisible({ timeout: 10000 });
        await projectTypeCombo.click();
        const projectTypeOption = page.locator('[role="option"]').filter({ hasText: /technical\s*-\s*ticket/i }).first();
        await expect(projectTypeOption).toBeVisible({ timeout: 10000 });
        await projectTypeOption.click();
        await page.waitForTimeout(500);
      }

      const createProjectBtn = page.locator('button[data-id="Create Project"]').first();
      await expect(createProjectBtn).toBeEnabled({ timeout: 10000 });
      await createProjectBtn.click();

      const createAnywayBtn = page.locator('button:has-text("Create anyway")').first();
      if (await createAnywayBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
        await createAnywayBtn.click();
      }

      await projectsManagerPage.waitForProjectFormClosedAndProjectsManagerScreen();
      await expect(page.getByText(/created|success/i)).toBeVisible({ timeout: 30000 });
      console.log('✅ Project created successfully');
    });

    for (let i = 0; i < TOTAL_TASKS; i++) {
      const index = i + 1;
      const uniqueTitle = `E2E Bulk Task Under Project ${String(index).padStart(3, '0')} - ${Date.now()}`;

      await test.step(`Create task ${index}/${TOTAL_TASKS} under project`, async () => {
        await projectsManagerPage.clickCreateTaskFromProject(projectTitle);
        await projectsManagerPage.waitForTaskForm();
        await tasksManagerPage.verifyTaskFormOpen();

        const titleInput = page.locator('input[placeholder="Title"]').first();
        await titleInput.fill(uniqueTitle);
        console.log(`✅ Task Title: "${uniqueTitle}"`);

        await fillDescription(page, `${baseTaskData.description} Task ${index}/${TOTAL_TASKS}.`);
        await selectRadioPill(page, 'task_priority', baseTaskData.priority);
        await selectRadioPill(page, 'task_status_by_dept', baseTaskData.status);

        if (baseTaskData.ownerType !== 'User') {
          await selectComboboxOption(page, 'Owner Type', baseTaskData.ownerType);
        }

        await selectComboboxOption(page, 'Owner', baseTaskData.owner);
        await selectFirstComboboxOption(page, 'Task Type');
        await setStartDate(page, baseTaskData.startDate);
        await setDueDate(page, baseTaskData.dueDate);

        if (baseTaskData.reminderHours) {
          const reminderInput = page.locator('input[placeholder="0 to disable"]').first();
          if (await reminderInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await reminderInput.fill(baseTaskData.reminderHours);
          }
        }

        if (baseTaskData.estimatedHours) {
          const estimatedInput = page.locator('input[placeholder="Enter hours"]').first();
          if (await estimatedInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await estimatedInput.fill(baseTaskData.estimatedHours);
          }
        }

        const createTaskBtn = page.locator('button[data-id="Create Task"]').first();
        await expect(createTaskBtn).toBeVisible({ timeout: 10000 });
        await createTaskBtn.scrollIntoViewIfNeeded();
        await expect(createTaskBtn).toBeEnabled({ timeout: 5000 });
        await createTaskBtn.click();

        await clickCreateTaskAnywayIfVisible(page);

        await expect(page.getByText(/Task Created Successfully/i)).toBeVisible({ timeout: 30000 });

        const taskFormBtn = page.locator('button[data-id="Create Task"]').first();
        await Promise.race([
          taskFormBtn.waitFor({ state: 'hidden', timeout: 15000 }),
          taskFormBtn.waitFor({ state: 'detached', timeout: 15000 }),
        ]).catch(() => {});

        await expect(page).toHaveURL(/\/dashboard\/projects-manager/, { timeout: 15000 });
        await page.waitForSelector('table tbody tr', { state: 'visible', timeout: 10000 });

        console.log(`✅ Created task ${index}/${TOTAL_TASKS}: ${uniqueTitle}`);
      });
    }
  });
});
