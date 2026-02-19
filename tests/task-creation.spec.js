const { test, expect } = require('@playwright/test');
const { TasksManagerPage } = require('../pages/TasksManagerPage');

/**
 * Playwright test for creating a task.
 *
 * Form structure (from actual HTML):
 *
 * TABS: Details | Checklist | Assignee(s) | Checklist Assignees
 *
 * DETAILS TAB:
 *   - Title: input[placeholder="Title"] (required - Create Task disabled without it)
 *   - Milestone: checkbox (aria-label="Milestone")
 *   - Template: combobox (role="combobox")
 *   - Description: TipTap ProseMirror editor (data-placeholder="Enter task description...")
 *   - Attachment: button[data-id="Add attachment"] + hidden file input
 *   - Priority: radio pills (name="task_priority") - Normal | Low | Medium | High | Critical
 *   - Status: radio pills (name="task_status_by_dept") - To-Do | In Progress | Review
 *   - Owner Type: combobox (label "Owner Type") - defaults to "User"
 *   - Owner: combobox (label "Owner") - defaults to "super admin"
 *   - Task Type: combobox (label "Task Type") - required, defaults to "Technical - Ticket"
 *   - Start Date: input[type="datetime-local"] (auto-populated with current time)
 *   - Due Date: input[type="datetime-local"] (required)
 *   - Reminder (Hours): input[type="number"] (defaults to 1)
 *   - Estimated Hours: input[type="number"]
 *
 * BOTTOM BUTTONS: Close | Reset | Create Task (disabled until Title filled)
 */

// ============================================================
// HELPER: Select an option from a custom Combobox component
// ============================================================
async function selectComboboxOption(page, label, optionText, timeout = 10000) {
  try {
    console.log(`Attempting to select "${optionText}" for "${label}"`);

    // --- Find the combobox trigger button near the label ---
    // Use exact text matching to avoid "Owner" matching "Owner Type"
    let comboboxTrigger = null;

    // Try finding by label element first
    const labelElement = page.locator('label').filter({ hasText: new RegExp(`^${label}\\s*\\*?\\s*$`) }).first();
    const labelVisible = await labelElement.isVisible({ timeout: 3000 }).catch(() => false);

    if (labelVisible) {
      // Approach 1: Sibling combobox in same parent container
      const parentDiv = labelElement.locator('..');
      comboboxTrigger = parentDiv.locator('button[role="combobox"]').first();

      if (!(await comboboxTrigger.isVisible({ timeout: 2000 }).catch(() => false))) {
        // Approach 2: Following sibling
        comboboxTrigger = labelElement.locator('xpath=following-sibling::button[@role="combobox"]').first();
      }
      if (!(await comboboxTrigger.isVisible({ timeout: 2000 }).catch(() => false))) {
        // Approach 3: Any following combobox
        comboboxTrigger = labelElement.locator('xpath=following::button[@role="combobox"][1]').first();
      }
    }

    if (!comboboxTrigger || !(await comboboxTrigger.isVisible({ timeout: 2000 }).catch(() => false))) {
      throw new Error(`Could not find combobox trigger for "${label}"`);
    }

    await expect(comboboxTrigger).toBeVisible({ timeout });
    await comboboxTrigger.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    // --- Open the combobox if not already expanded ---
    const isExpanded = await comboboxTrigger.getAttribute('aria-expanded');
    if (isExpanded !== 'true') {
      await comboboxTrigger.click({ timeout });
      await page.waitForTimeout(500);
    }

    // --- Wait for popover/dialog to appear ---
    const popoverSelectors = [
      '[role="dialog"]',
      '[role="listbox"]',
      '[data-radix-popper-content-wrapper]',
    ];
    for (const selector of popoverSelectors) {
      if (await page.locator(selector).first().isVisible({ timeout: 2000 }).catch(() => false)) {
        break;
      }
    }

    // --- Type in the search input if available ---
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

    // --- Click the matching option ---
    await page.waitForTimeout(500);
    let option = page.locator(`[role="option"]:has-text("${optionText}")`).first();
    if (!(await option.isVisible({ timeout: 3000 }).catch(() => false))) {
      option = page.locator('[role="option"]').filter({ hasText: optionText }).first();
    }
    if (!(await option.isVisible({ timeout: 3000 }).catch(() => false))) {
      option = page.locator('[role="option"]').filter({ hasText: new RegExp(optionText, 'i') }).first();
    }

    if (!(await option.isVisible({ timeout: 3000 }).catch(() => false))) {
      await page.screenshot({ path: `combobox-error-${label.replace(/\s+/g, '-')}.png` });
      const allOptions = page.locator('[role="option"]');
      const count = await allOptions.count();
      console.log(`Found ${count} options for "${label}":`);
      for (let i = 0; i < Math.min(count, 10); i++) {
        console.log(`  Option ${i + 1}: "${await allOptions.nth(i).textContent()}"`);
      }
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
// HELPER: Select a radio pill option (Priority / Status)
// Radio inputs are sr-only, wrapped in styled <label> pills
// ============================================================
async function selectRadioPill(page, radioName, optionText) {
  // The radio inputs use name="task_priority" or name="task_status_by_dept"
  // They are sr-only inside <label> elements styled as pills
  // Click the label containing the option text
  const label = page.locator(`label:has(input[name="${radioName}"])`).filter({ hasText: optionText }).first();
  await expect(label).toBeVisible({ timeout: 5000 });
  await label.click();
  await page.waitForTimeout(300);
  console.log(`✅ Selected "${optionText}" for ${radioName}`);
}

// ============================================================
// HELPER: Fill TipTap / ProseMirror rich text editor
// ============================================================
async function fillDescription(page, content) {
  const editor = page.locator('div[data-field="description"] .ProseMirror').first();
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
test.describe('Task Creation', () => {
  test.beforeEach(async ({ page }) => {
    const tasksManagerPage = new TasksManagerPage(page);
    await tasksManagerPage.goto();

    // Click "+ Task" button to open the task creation form
    await tasksManagerPage.clickAddTask();

    // Wait for the task form to load
    await tasksManagerPage.waitForTaskForm();
    await tasksManagerPage.verifyTaskFormOpen();
  });

  test('should create a new task with all details, checklist, and assignees', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes

    // ============================================
    // CUSTOMIZE THESE VALUES for your environment
    // ============================================
    const taskData = {
      title: 'E2E Test Task - Automated Playwright Test',
      description: 'This task was created by an automated Playwright test. Please review and process accordingly.',
      ownerType: 'User',                     // Combobox - defaults to "User"
      owner: 'EHU',                           // Combobox - search for user
      taskType: 'Technical - Ticket',         // Combobox - defaults to this
      priority: 'High',                       // Radio pill: Normal | Low | Medium | High | Critical
      status: 'In Progress',                  // Radio pill: To-Do | In Progress | Review
      dueDate: '2026-03-15T17:00',            // datetime-local format (required)
      reminderHours: '2',
      estimatedHours: '8',
      // Checklist
      checklistItem: 'Verify all user inputs are validated',
      checklistMandatory: true,
      checklistAttachment: false,
      // Assignee
      assigneeType: 'User',
      assigneeName: 'EHU',
    };

    // =============================================
    // 1. DETAILS TAB (default active tab)
    // =============================================
    await test.step('Fill Task Details', async () => {
      // Title (required - enables the Create Task button)
      const titleInput = page.locator('input[placeholder="Title"]').first();
      await titleInput.fill(taskData.title);
      console.log(`✅ Title: "${taskData.title}"`);

      // Description (TipTap ProseMirror editor)
      await fillDescription(page, taskData.description);

      // Priority (radio pills - name="task_priority")
      // Options: Normal (default) | Low | Medium | High | Critical
      await selectRadioPill(page, 'task_priority', taskData.priority);

      // Status (radio pills - name="task_status_by_dept")
      // Options: To-Do (default) | In Progress | Review
      await selectRadioPill(page, 'task_status_by_dept', taskData.status);

      // Owner Type (combobox - already defaults to "User")
      // Only change if different from default
      if (taskData.ownerType !== 'User') {
        await selectComboboxOption(page, 'Owner Type', taskData.ownerType);
      } else {
        console.log('✅ Owner Type already set to "User" (default)');
      }

      // Owner (combobox - search and select)
      await selectComboboxOption(page, 'Owner', taskData.owner);

      // Task Type (combobox - already defaults to "Technical - Ticket")
      if (taskData.taskType !== 'Technical - Ticket') {
        await selectComboboxOption(page, 'Task Type', taskData.taskType);
      } else {
        console.log('✅ Task Type already set to "Technical - Ticket" (default)');
      }

      // Due Date (required - input[type="datetime-local"])
      const dueDateInput = page.locator('label:has-text("Due Date")').locator('..').locator('input[type="datetime-local"]').first();
      await expect(dueDateInput).toBeVisible({ timeout: 5000 });
      await dueDateInput.fill(taskData.dueDate);
      console.log(`✅ Due Date: "${taskData.dueDate}"`);

      // Reminder Hours (optional - defaults to 1)
      if (taskData.reminderHours) {
        const reminderInput = page.locator('input[placeholder="0 to disable"]').first();
        if (await reminderInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await reminderInput.fill(taskData.reminderHours);
          console.log(`✅ Reminder: ${taskData.reminderHours} hours`);
        }
      }

      // Estimated Hours (optional)
      if (taskData.estimatedHours) {
        const estimatedInput = page.locator('input[placeholder="Enter hours"]').first();
        if (await estimatedInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await estimatedInput.fill(taskData.estimatedHours);
          console.log(`✅ Estimated Hours: ${taskData.estimatedHours}`);
        }
      }
    });

    // =============================================
    // 2. CHECKLIST TAB
    // =============================================
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

    // =============================================
    // 3. ASSIGNEE(S) TAB
    // =============================================
    await test.step('Add Assignees', async () => {
      await page.locator('button[data-id="Assignee(s)"]').click();
      await page.waitForTimeout(500);

      // Open the "Add New Assignee" sub-form
      const addAssigneeBtn = page.locator('button:has-text("Add New Assignee"), button[data-id="Add New Assignee"]').first();
      if (await addAssigneeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addAssigneeBtn.click();
        await page.waitForTimeout(500);
      }

      // Select Assignee Type
      await selectComboboxOption(page, 'Assignee Type', taskData.assigneeType);

      // Select Assignee Name
      await selectComboboxOption(page, 'Assignee', taskData.assigneeName);

      // Save the assignee
      const saveAssigneeBtn = page.locator('button[data-id="Create New Assignee"]').first();
      await expect(saveAssigneeBtn).toBeVisible({ timeout: 5000 });
      await saveAssigneeBtn.click();
      await page.waitForTimeout(800);

      console.log(`✅ Assignee added: ${taskData.assigneeType} - ${taskData.assigneeName}`);
    });

    // =============================================
    // 4. SUBMIT THE TASK
    // =============================================
    await test.step('Submit Task', async () => {
      const createTaskBtn = page.locator('button[data-id="Create Task"]').first();
      await expect(createTaskBtn).toBeVisible({ timeout: 10000 });
      await createTaskBtn.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);

      // Verify button is enabled (Title must be filled)
      await expect(createTaskBtn).toBeEnabled({ timeout: 5000 });

      await page.screenshot({ path: 'task-form-before-submit.png', fullPage: true });

      await createTaskBtn.click();
      console.log('Clicked Create Task button, waiting for success...');

      // Verify success toast
      await expect(page.getByText(/Created Task/i)).toBeVisible({ timeout: 30000 });
      console.log('✅ Task created successfully!');
    });
  });

  test('should create a task with only required fields', async ({ page }) => {
    test.setTimeout(90000);

    await test.step('Fill minimum required fields', async () => {
      // Title (required - enables Create Task button)
      await page.locator('input[placeholder="Title"]').first().fill('Minimal Task - Required Fields Only');

      // Due Date (required - datetime-local)
      const dueDateInput = page.locator('label:has-text("Due Date")').locator('..').locator('input[type="datetime-local"]').first();
      await dueDateInput.fill('2026-03-15T17:00');

      // Priority defaults to "Normal", Status defaults to "To-Do"
      // Owner Type defaults to "User", Task Type defaults to "Technical - Ticket"
      // These defaults should be enough to submit
    });

    await test.step('Submit Task', async () => {
      const createTaskBtn = page.locator('button[data-id="Create Task"]').first();
      await expect(createTaskBtn).toBeVisible({ timeout: 10000 });
      await expect(createTaskBtn).toBeEnabled({ timeout: 5000 });
      await createTaskBtn.click();

      await expect(page.getByText(/Created Task/i)).toBeVisible({ timeout: 30000 });
      console.log('✅ Minimal task created successfully!');
    });
  });

  test('should validate that Title is required', async ({ page }) => {
    // Create Task button should be disabled when Title is empty
    // (HTML shows: disabled="" title="Title is required")
    const createTaskBtn = page.locator('button[data-id="Create Task"]').first();
    await expect(createTaskBtn).toBeVisible({ timeout: 5000 });
    await expect(createTaskBtn).toBeDisabled();
    console.log('✅ Create Task button is disabled when Title is empty');

    // Verify the tooltip/title attribute
    await expect(createTaskBtn).toHaveAttribute('title', 'Title is required');
    console.log('✅ Button shows "Title is required" tooltip');

    // Fill Title and verify button becomes enabled
    await page.locator('input[placeholder="Title"]').first().fill('Test Title');
    await page.waitForTimeout(500);

    // Due Date is also required, fill it
    const dueDateInput = page.locator('label:has-text("Due Date")').locator('..').locator('input[type="datetime-local"]').first();
    await dueDateInput.fill('2026-03-15T17:00');
    await page.waitForTimeout(500);

    await expect(createTaskBtn).toBeEnabled({ timeout: 5000 });
    console.log('✅ Create Task button becomes enabled after filling Title + Due Date');
  });
});
