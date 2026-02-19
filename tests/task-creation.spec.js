const { test, expect } = require('@playwright/test');
const { TasksManagerPage } = require('../pages/TasksManagerPage');

/**
 * Playwright test for creating a task with all fields across three tabs:
 * - Details: Title, Description, Owner Type, Owner, Task Type, Status, Priority, Dates
 * - Checklist: Add checklist items with Mandatory/Attachment flags
 * - Assignee(s): Add assignees with type and name
 */

// ============================================================
// HELPER: Select an option from a custom Combobox component
// ============================================================
async function selectComboboxOption(page, label, optionText, timeout = 10000) {
  try {
    console.log(`Attempting to select "${optionText}" for "${label}"`);

    // --- Find the combobox trigger button near the label ---
    let comboboxTrigger = null;
    const labelElement = page.locator(`label:has-text("${label}")`).first();
    const labelVisible = await labelElement.isVisible({ timeout: 3000 }).catch(() => false);

    if (labelVisible) {
      // Approach 1: Following sibling with combobox role
      comboboxTrigger = labelElement.locator('xpath=following-sibling::*//button[@role="combobox"]').first();
      if (!(await comboboxTrigger.isVisible({ timeout: 2000 }).catch(() => false))) {
        // Approach 2: Parent container
        comboboxTrigger = labelElement.locator('..').locator('button[role="combobox"]').first();
      }
      if (!(await comboboxTrigger.isVisible({ timeout: 2000 }).catch(() => false))) {
        // Approach 3: Any following combobox
        comboboxTrigger = labelElement.locator('xpath=following::button[@role="combobox"][1]').first();
      }
    }

    // Fallback: Find by placeholder text in trigger
    if (!comboboxTrigger || !(await comboboxTrigger.isVisible({ timeout: 2000 }).catch(() => false))) {
      comboboxTrigger = page.locator(`button[role="combobox"]:has-text("Select")`).first();
    }

    if (!comboboxTrigger) {
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

    // --- Wait for popover to appear ---
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
// HELPER: Fill TipTap / ProseMirror rich text editor
// ============================================================
async function fillDescription(page, content) {
  // Try TipTap ProseMirror editor first
  let editor = page.locator('.ProseMirror, [contenteditable="true"]').first();
  if (!(await editor.isVisible({ timeout: 3000 }).catch(() => false))) {
    // Fallback to textarea
    editor = page.locator('textarea[data-field="description"]').first();
  }
  await expect(editor).toBeVisible({ timeout: 10000 });
  await editor.click();
  await editor.press('Control+a');
  await editor.press('Delete');
  await editor.type(content, { delay: 30 });
  await page.waitForTimeout(500);
  console.log('✅ Description filled');
}

// ============================================================
// HELPER: Fill a date input (DateTime component)
// ============================================================
async function fillDateInput(page, label, dateValue) {
  try {
    // Find input near the label
    const labelElement = page.locator(`label:has-text("${label}")`).first();
    let dateInput = null;

    if (await labelElement.isVisible({ timeout: 3000 }).catch(() => false)) {
      dateInput = labelElement.locator('xpath=following::input[1]').first();
    }

    // Fallback: try placeholder
    if (!dateInput || !(await dateInput.isVisible({ timeout: 2000 }).catch(() => false))) {
      dateInput = page.locator(`input[placeholder*="${label}" i], input[placeholder="Select date..."]`).first();
    }

    if (dateInput && await dateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dateInput.scrollIntoViewIfNeeded();
      await dateInput.click();
      await page.waitForTimeout(300);
      await dateInput.fill(dateValue);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      console.log(`✅ Filled "${label}" with "${dateValue}"`);
    } else {
      console.log(`⚠️ Date input "${label}" not found, skipping`);
    }
  } catch (error) {
    console.log(`⚠️ Could not fill date "${label}": ${error.message}`);
  }
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
      ownerType: 'User',
      owner: 'EHU',                // Change to match an actual user in your system
      taskType: 'General',         // Change to match your task type options
      status: 'Open',              // Change to match your status options
      priority: 'High',            // Change to match your priority options
      startDate: '2026-03-01',     // Adjust format to match your DateTime component
      dueDate: '2026-03-15',
      // Checklist
      checklistItem: 'Verify all user inputs are validated',
      checklistMandatory: true,
      checklistAttachment: false,
      // Assignee
      assigneeType: 'User',
      assigneeName: 'EHU',        // Change to match an actual user
    };

    // =============================================
    // 1. DETAILS TAB (default active tab)
    // =============================================
    await test.step('Fill Task Details', async () => {
      // Title
      const titleInput = page.locator('input[placeholder="Title"]').first();
      await titleInput.fill(taskData.title);
      console.log(`✅ Title: "${taskData.title}"`);

      // Description (TipTap editor)
      await fillDescription(page, taskData.description);

      // Owner Type (Combobox)
      await selectComboboxOption(page, 'Owner Type', taskData.ownerType);

      // Owner (Combobox - options load based on Owner Type)
      await selectComboboxOption(page, 'Owner', taskData.owner);

      // Task Type (Combobox)
      await selectComboboxOption(page, 'Task Type', taskData.taskType);

      // Status (Combobox or Radio)
      const statusRadio = page.locator(`label:has-text("${taskData.status}") input[type="radio"]`).first();
      if (await statusRadio.isVisible({ timeout: 2000 }).catch(() => false)) {
        await statusRadio.check();
        console.log(`✅ Status (radio): "${taskData.status}"`);
      } else {
        await selectComboboxOption(page, 'Status', taskData.status);
      }

      // Priority (Combobox or Radio)
      const priorityRadio = page.locator(`label:has-text("${taskData.priority}") input[type="radio"]`).first();
      if (await priorityRadio.isVisible({ timeout: 2000 }).catch(() => false)) {
        await priorityRadio.check();
        console.log(`✅ Priority (radio): "${taskData.priority}"`);
      } else {
        await selectComboboxOption(page, 'Priority', taskData.priority);
      }

      // Start Date
      await fillDateInput(page, 'Start Date', taskData.startDate);

      // Due Date
      await fillDateInput(page, 'Due Date', taskData.dueDate);
    });

    // =============================================
    // 2. CHECKLIST TAB
    // =============================================
    await test.step('Add Checklist Items', async () => {
      // Switch to Checklist tab
      await page.locator('button[data-id="Checklist"]').click();
      await page.waitForTimeout(500);

      // Fill checklist item text
      const checklistInput = page.getByPlaceholder('Add new checklist item');
      await expect(checklistInput).toBeVisible({ timeout: 5000 });
      await checklistInput.fill(taskData.checklistItem);

      // Toggle Mandatory checkbox
      if (taskData.checklistMandatory) {
        await page.getByLabel('Mandatory').check();
      }

      // Toggle Attachment checkbox
      if (taskData.checklistAttachment) {
        await page.getByLabel('Attachment').check();
      }

      // Click Add button
      await page.locator('button[data-id="Add"]').click();
      await page.waitForTimeout(500);

      // Verify the item was added
      await expect(page.getByText(taskData.checklistItem)).toBeVisible({ timeout: 5000 });
      console.log(`✅ Checklist item added: "${taskData.checklistItem}"`);
    });

    // =============================================
    // 3. ASSIGNEE(S) TAB
    // =============================================
    await test.step('Add Assignees', async () => {
      // Switch to Assignee(s) tab
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

      // Verify button is enabled before clicking
      await expect(createTaskBtn).toBeEnabled({ timeout: 5000 });

      // Take screenshot before submission
      await page.screenshot({ path: 'task-form-before-submit.png', fullPage: true });

      // Click Create Task
      await createTaskBtn.click();
      console.log('Clicked Create Task button, waiting for success...');

      // Verify success toast
      await expect(page.getByText(/Created Task/i)).toBeVisible({ timeout: 30000 });
      console.log('✅ Task created successfully!');
    });
  });

  test('should create a task with only required fields (Details tab)', async ({ page }) => {
    test.setTimeout(90000);

    await test.step('Fill minimum required fields', async () => {
      // Title (always required)
      await page.locator('input[placeholder="Title"]').first().fill('Minimal Task - Required Fields Only');

      // Owner Type
      await selectComboboxOption(page, 'Owner Type', 'User');

      // Owner
      await selectComboboxOption(page, 'Owner', 'EHU');
    });

    await test.step('Submit Task', async () => {
      const createTaskBtn = page.locator('button[data-id="Create Task"]').first();
      await expect(createTaskBtn).toBeVisible({ timeout: 10000 });
      await expect(createTaskBtn).toBeEnabled({ timeout: 5000 });
      await createTaskBtn.click();

      // Verify success
      await expect(page.getByText(/Created Task/i)).toBeVisible({ timeout: 30000 });
      console.log('✅ Minimal task created successfully!');
    });
  });

  test('should validate that Title is required', async ({ page }) => {
    // Try to submit without filling the Title
    const createTaskBtn = page.locator('button[data-id="Create Task"]').first();

    if (await createTaskBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      const isDisabled = await createTaskBtn.isDisabled();
      if (isDisabled) {
        console.log('✅ Create button is disabled when Title is empty - validation working');
      } else {
        // Click and check for error messages
        await createTaskBtn.click();
        await page.waitForTimeout(1000);

        const errorMessages = page.locator('.text-red-600, .text-red-500, [class*="error"]');
        const errorCount = await errorMessages.count();
        expect(errorCount).toBeGreaterThan(0);
        console.log(`✅ Found ${errorCount} validation error(s) when Title is empty`);
      }
    }
  });
});
