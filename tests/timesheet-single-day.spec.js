const { test, expect } = require('@playwright/test');
const { TimesheetPage } = require('../pages/TimesheetPage');

/**
 * Single Day Timesheet Test
 *
 * Creates a timesheet for a single day, adds check-in + 3 work activities (9h) + check-out,
 * then submits for approval.
 *
 * If Add Activity is disabled for the chosen day, iterates through previous days
 * in the week, creates timesheets / adds activities / submits them as needed,
 * then returns to the original day and continues.
 */

const ACTIVITIES = [
  { type: 'check-in', start: '08:00', end: null, desc: 'Check-in' },
  { type: 'activity', start: '08:00', end: '11:00', desc: 'Morning work block' },
  { type: 'activity', start: '11:00', end: '14:00', desc: 'Midday work block' },
  { type: 'activity', start: '14:00', end: '17:00', desc: 'Afternoon work block' },
  { type: 'check-out', start: null, end: '17:00', desc: 'Check-out' },
];

const ALL_DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Add all standard activities (check-in + 3×3h work blocks + check-out)
 * to whichever day is currently selected on the timesheet page.
 */
async function addActivitiesToDay(page, timesheetPage, dayLabel) {
  for (let i = 0; i < ACTIVITIES.length; i++) {
    const step = ACTIVITIES[i];
    console.log(`  [${dayLabel}] [${i + 1}/${ACTIVITIES.length}] Adding ${step.type} (${step.start || '--'}–${step.end || '--'})...`);

    await timesheetPage.openAddActivityModal();
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    await page.waitForTimeout(1500);

    // ── Work Type ──
    const workTypeBtn = page.locator(timesheetPage.workTypeCombobox).first();
    await expect(workTypeBtn).toBeEnabled({ timeout: 15000 });
    const wtValue = await workTypeBtn.textContent().catch(() => '');
    if (!wtValue || /select work type/i.test(wtValue) || !wtValue.trim()) {
      await workTypeBtn.click();
      await page.waitForTimeout(500);
      await page.waitForSelector('[role="option"]', { timeout: 5000 });
      await page.locator('[role="option"]').first().click();
      await page.waitForTimeout(1000);
      console.log(`    Work Type selected: ${await workTypeBtn.textContent().catch(() => '?')}`);
    }

    // ── Activity Type ──
    const activityTypeBtn = page.locator(timesheetPage.activityTypeCombobox).first();
    await activityTypeBtn.waitFor({ state: 'visible', timeout: 5000 });
    await expect(activityTypeBtn).toBeEnabled({ timeout: 15000 });

    const isExpanded = await activityTypeBtn.getAttribute('aria-expanded');
    if (isExpanded !== 'true') {
      await activityTypeBtn.click();
      await page.waitForTimeout(300);
    }
    await page.locator('[data-slot="command"]').first().waitFor({ state: 'visible', timeout: 3000 });

    let actOption;
    if (step.type === 'check-in') {
      actOption = page.locator('[role="option"]:has-text("Check-in"), [role="option"]:has-text("Check In")').first();
    } else if (step.type === 'check-out') {
      actOption = page.locator('[role="option"]:has-text("Check-out"), [role="option"]:has-text("Check Out")').first();
    } else {
      const allOptions = page.locator('[role="option"]');
      const optCount = await allOptions.count();
      actOption = null;
      for (let oi = 0; oi < optCount; oi++) {
        const optText = (await allOptions.nth(oi).textContent().catch(() => '') || '').trim().toLowerCase();
        if (!optText.includes('check-in') && !optText.includes('check in') &&
            !optText.includes('check-out') && !optText.includes('check out')) {
          actOption = allOptions.nth(oi);
          break;
        }
      }
      if (!actOption) actOption = allOptions.first();
    }

    await actOption.waitFor({ state: 'visible', timeout: 5000 });
    await actOption.click();
    await page.waitForTimeout(1000);

    for (let attempt = 0; attempt < 10; attempt++) {
      const val = (await activityTypeBtn.textContent().catch(() => '') || '').trim();
      if (val && !/select activity type/i.test(val)) {
        console.log(`    Activity Type: ${val}`);
        break;
      }
      await page.waitForTimeout(500);
    }

    await page.waitForTimeout(1000);

    // ── Work Description (150+ chars required) ──
    const descField = page.locator(timesheetPage.workDescriptionTextarea).first();
    if (await descField.isVisible({ timeout: 3000 }).catch(() => false)) {
      const existing = await descField.inputValue().catch(() => '');
      if (!existing || existing.trim().length < 150) {
        const description =
          `${step.desc} — ${dayLabel} timesheet test. ` +
          `Activity type: ${step.type}, scheduled from ${step.start || 'N/A'} to ${step.end || 'N/A'}. ` +
          `This is an automated Playwright test that creates a single day timesheet and verifies all activities.`;
        await descField.fill(description);
      }
    }

    // ── Time inputs ──
    if (step.start) await timesheetPage.setStartTime(step.start);
    if (step.end) await timesheetPage.setEndTime(step.end);

    // ── Save ──
    await timesheetPage.clickActivitySave();
    await page.waitForTimeout(2000);

    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);

    console.log(`  [${dayLabel}] [${i + 1}/${ACTIVITIES.length}] ${step.type} saved.`);
  }
}

/**
 * Create a timesheet for a specific day via the create-timesheet modal.
 * The modal always opens at the current week, so we navigate back `weeksBack` weeks.
 * Returns true if the timesheet was created successfully.
 */
async function createTimesheetForDay(page, timesheetPage, dayName, weeksBack) {
  console.log(`  Creating timesheet for ${dayName}...`);

  await timesheetPage.openCreateTimesheetModal();
  await page.waitForTimeout(1000);

  const singleModeBtn = page.locator(timesheetPage.singleModeButton).first();
  if (await singleModeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await singleModeBtn.click();
    await page.waitForTimeout(500);
  }

  for (let i = 0; i < weeksBack; i++) {
    await timesheetPage.navigateToPreviousWeekInModal();
    await page.waitForTimeout(1000);
  }

  const dialog = page.locator('[role="dialog"]');
  const dayButtons = dialog.locator(
    '.grid-cols-7 button:not([disabled]):not([aria-disabled="true"])'
  ).filter({ hasNot: page.locator('svg') });
  const count = await dayButtons.count();

  let found = false;
  for (let i = 0; i < count; i++) {
    const btn = dayButtons.nth(i);
    const text = (await btn.locator('div').first().textContent().catch(() => '')).trim();
    if (text === dayName) {
      await btn.click();
      await page.waitForTimeout(500);
      found = true;
      break;
    }
  }

  if (!found) {
    console.log(`  ${dayName}: Day button not available in modal (may already have a timesheet).`);
    await page.keyboard.press('Escape');
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    return false;
  }

  const submitBtn = page.locator(timesheetPage.timesheetCreateSubmit).first();
  await submitBtn.scrollIntoViewIfNeeded();
  await expect(submitBtn).toBeEnabled({ timeout: 10000 });
  await page.waitForTimeout(500);
  await submitBtn.dispatchEvent('click');
  await page.waitForTimeout(1000);

  const dialogStillOpen = await page.locator('[role="dialog"]').isVisible({ timeout: 2000 }).catch(() => false);
  if (dialogStillOpen) {
    await submitBtn.click({ force: true });
  }

  await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);

  console.log(`  Timesheet created for ${dayName}.`);
  return true;
}

/**
 * Navigate to the correct week on the main timesheet page.
 */
async function navigateToWeek(page, timesheetPage, weeksBack) {
  if (weeksBack > 0) {
    for (let w = 0; w < weeksBack; w++) {
      await timesheetPage.navigateToPreviousWeek();
      await page.waitForTimeout(1000);
    }
    await page.waitForTimeout(1000);
  }
}

/**
 * Check whether the "Overdue" alert banner is visible on the page.
 * The alert reads: "Submit overdue timesheets before adding current or future dates."
 */
async function isOverdueAlertVisible(page, timesheetPage) {
  return page.locator(timesheetPage.overdueAlert).isVisible({ timeout: 3000 }).catch(() => false);
}

/**
 * Collect every day tab visible on the current week view.
 * Returns an ordered array of { name, tab } for days that appear before `chosenDayName`.
 */
async function getPreviousDayTabs(page, chosenDayName) {
  const chosenIdx = ALL_DAY_NAMES.indexOf(chosenDayName);
  const result = [];

  for (let i = 0; i < chosenIdx; i++) {
    const dayName = ALL_DAY_NAMES[i];
    const tab = page.locator(`div[role="button"]:has(h3:text-is("${dayName}"))`).first();
    const visible = await tab.isVisible({ timeout: 2000 }).catch(() => false);
    if (visible) result.push({ name: dayName, tab });
  }
  return result;
}

/**
 * Handle unsubmitted previous days.
 *
 * Triggered when the "Overdue" alert is visible or the Add Activity button is
 * disabled.  Iterates through every day tab before `chosenDayName`:
 *
 *  - Already submitted / approved → skip
 *  - Draft with no activities     → add all activities, then submit
 *  - Draft with activities        → submit directly
 *  - No timesheet at all          → create one, add activities, submit
 *
 * After processing, reloads the page and navigates back to the chosen day so
 * the overdue alert is cleared and Add Activity becomes enabled.
 */
async function handlePreviousDays(page, timesheetPage, chosenDayName, weeksBack) {
  const chosenIdx = ALL_DAY_NAMES.indexOf(chosenDayName);
  if (chosenIdx <= 0) {
    console.log('No previous days to check (chosen day is Mon or not found).');
    return;
  }

  // Log the overdue alert if present
  const overdueVisible = await isOverdueAlertVisible(page, timesheetPage);
  if (overdueVisible) {
    console.log('Overdue alert detected: "Submit overdue timesheets before adding current or future dates."');
  }

  console.log(`\n── Handling ${chosenIdx} previous day(s) before ${chosenDayName} ──`);

  const previousDays = await getPreviousDayTabs(page, chosenDayName);

  for (const { name: prevDayName, tab: prevDayTab } of previousDays) {
    console.log(`\n  Checking ${prevDayName}...`);

    await prevDayTab.click();
    await page.waitForTimeout(2000);

    // ── Check current status ──
    const isSubmitted = await page.locator(
      'div:text-is("Submitted"), div:text-is("Approved"), div:text-is("Pending Approval")'
    ).first().isVisible({ timeout: 3000 }).catch(() => false);

    if (isSubmitted) {
      console.log(`  ${prevDayName}: Already submitted, skipping.`);
      continue;
    }

    const isDraft = await page.locator('div:text-is("Draft")').first()
      .isVisible({ timeout: 3000 }).catch(() => false);

    if (!isDraft) {
      // No timesheet exists — try to create one
      console.log(`  ${prevDayName}: No timesheet found. Creating one...`);
      const created = await createTimesheetForDay(page, timesheetPage, prevDayName, weeksBack);
      if (!created) {
        console.log(`  ${prevDayName}: Could not create timesheet, skipping.`);
        continue;
      }

      // Page may reset to current week after creation — navigate back
      await navigateToWeek(page, timesheetPage, weeksBack);

      // Re-select the day tab after page refresh
      const refreshedTab = page.locator(`div[role="button"]:has(h3:text-is("${prevDayName}"))`).first();
      await refreshedTab.click();
      await page.waitForTimeout(2000);
    }

    // ── We now have a Draft timesheet for this day ──
    console.log(`  ${prevDayName}: Draft timesheet found. Processing...`);

    const addActBtn = page.locator(timesheetPage.addActivityButton).first();
    const isAddEnabled = await addActBtn.isEnabled({ timeout: 5000 }).catch(() => false);

    if (!isAddEnabled) {
      console.log(`  ${prevDayName}: Add Activity is also disabled, skipping.`);
      continue;
    }

    // Check whether activities already exist
    const noActivities = await page.locator('text=/No activities/i').first()
      .isVisible({ timeout: 3000 }).catch(() => false);

    if (noActivities) {
      console.log(`  ${prevDayName}: No activities found. Adding standard set...`);
      try {
        await addActivitiesToDay(page, timesheetPage, prevDayName);
        console.log(`  ${prevDayName}: All activities added.`);
      } catch (err) {
        console.log(`  ${prevDayName}: Error adding activities: ${err.message}`);
        await page.screenshot({
          path: `test-results/previous-day-${prevDayName}-activity-error.png`,
          fullPage: true,
        }).catch(() => {});
        await timesheetPage.closeAnyOpenModals().catch(() => {});
        continue;
      }
    } else {
      console.log(`  ${prevDayName}: Activities already exist.`);
    }

    // ── Submit for approval ──
    console.log(`  ${prevDayName}: Submitting for approval...`);
    try {
      await timesheetPage.submitForApproval();
      console.log(`  ${prevDayName}: Submitted successfully.`);
    } catch (err) {
      console.log(`  ${prevDayName}: Failed to submit: ${err.message}`);
      await page.screenshot({
        path: `test-results/previous-day-${prevDayName}-submit-error.png`,
        fullPage: true,
      }).catch(() => {});
    }

    await page.waitForTimeout(1000);
  }

  // ── Reload page and navigate back to the chosen day ──
  console.log(`\n  Reloading page and navigating back to ${chosenDayName}...`);
  await timesheetPage.goto();
  await page.waitForTimeout(2000);
  await navigateToWeek(page, timesheetPage, weeksBack);

  const dayTab = page.locator(`div[role="button"]:has(h3:text-is("${chosenDayName}"))`).first();
  await expect(dayTab).toBeVisible({ timeout: 10000 });
  await dayTab.click();
  await page.waitForTimeout(2000);

  // Verify overdue alert is gone
  const stillOverdue = await isOverdueAlertVisible(page, timesheetPage);
  if (stillOverdue) {
    console.log('WARNING: Overdue alert is still visible after handling all previous days.');
  } else {
    console.log('Overdue alert cleared.');
  }
}

// ═══════════════════════════════════════════════════════════
// Test
// ═══════════════════════════════════════════════════════════

test.describe('Single Day Timesheet', () => {
  test.setTimeout(600000); // 10 min — allows time for handling previous days

  test('should create a single day timesheet, add activities, and submit', async ({ page }) => {
    const timesheetPage = new TimesheetPage(page);

    // ── Step 1: Navigate to timesheet page ──
    console.log('Step 1: Navigating to timesheet page...');
    await timesheetPage.goto();
    await page.waitForTimeout(2000);

    // ── Step 2: Open create timesheet modal and select single mode ──
    console.log('Step 2: Creating single day timesheet...');
    await timesheetPage.openCreateTimesheetModal();
    await page.waitForTimeout(1000);

    const singleModeBtn = page.locator(timesheetPage.singleModeButton).first();
    if (await singleModeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await singleModeBtn.click();
      await page.waitForTimeout(500);
    }

    // Navigate back through weeks until we find one with an available day
    const dialog = page.locator('[role="dialog"]');
    const MAX_WEEKS_BACK = 5;
    let weeksNavigatedBack = 0;
    let chosenDayName = '';

    for (let week = 0; week < MAX_WEEKS_BACK; week++) {
      const availableDays = dialog.locator(
        '.grid-cols-7 button:not([disabled]):not([aria-disabled="true"])'
      ).filter({ hasNot: page.locator('svg') });

      const count = await availableDays.count();
      if (count > 0) {
        const dayBtn = availableDays.first();
        chosenDayName = await dayBtn.locator('div').first().textContent();
        chosenDayName = chosenDayName.trim();
        console.log(`  Found ${count} available day(s). Selecting: ${chosenDayName}`);
        await dayBtn.click();
        await page.waitForTimeout(500);
        weeksNavigatedBack = week;
        break;
      }

      console.log(`  No available days in this week, navigating to previous week...`);
      await timesheetPage.navigateToPreviousWeekInModal();
      await page.waitForTimeout(1000);

      if (week === MAX_WEEKS_BACK - 1) {
        throw new Error(`No available day found after checking ${MAX_WEEKS_BACK} weeks`);
      }
    }

    // Submit to create the timesheet
    const submitBtn = page.locator(timesheetPage.timesheetCreateSubmit).first();
    await submitBtn.scrollIntoViewIfNeeded();
    await expect(submitBtn).toBeEnabled({ timeout: 10000 });
    await page.waitForTimeout(500);
    await submitBtn.dispatchEvent('click');
    await page.waitForTimeout(1000);
    const dialogStillOpen = await page.locator('[role="dialog"]').isVisible({ timeout: 2000 }).catch(() => false);
    if (dialogStillOpen) {
      await submitBtn.click({ force: true });
    }
    console.log(`  Timesheet created for ${chosenDayName}.`);

    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(3000);

    // ── Step 2b: Navigate to the correct week and select the created day ──
    if (weeksNavigatedBack > 0) {
      console.log(`  Navigating back ${weeksNavigatedBack} week(s) on the main page...`);
      await navigateToWeek(page, timesheetPage, weeksNavigatedBack);
    }

    console.log(`  Selecting day tab: ${chosenDayName}`);
    const dayTab = page.locator(`div[role="button"]:has(h3:text-is("${chosenDayName}"))`).first();
    await expect(dayTab).toBeVisible({ timeout: 10000 });
    await dayTab.click();
    await page.waitForTimeout(2000);

    // ── Step 2c: Detect overdue alert or disabled Add Activity → handle previous days ──
    const overdueDetected = await isOverdueAlertVisible(page, timesheetPage);
    let addActivityEnabled = await page.locator(timesheetPage.addActivityButton).first()
      .isEnabled({ timeout: 5000 }).catch(() => false);

    if (overdueDetected || !addActivityEnabled) {
      if (overdueDetected) {
        console.log('Overdue alert detected: "Submit overdue timesheets before adding current or future dates."');
      }
      if (!addActivityEnabled) {
        console.log('Add Activity button is disabled.');
      }
      console.log('Handling previous days to clear overdue timesheets...');

      await handlePreviousDays(page, timesheetPage, chosenDayName, weeksNavigatedBack);

      addActivityEnabled = await page.locator(timesheetPage.addActivityButton).first()
        .isEnabled({ timeout: 15000 }).catch(() => false);

      if (!addActivityEnabled) {
        await page.screenshot({
          path: 'test-results/add-activity-still-disabled.png',
          fullPage: true,
        }).catch(() => {});
        throw new Error(
          `Add Activity button is still disabled for ${chosenDayName} after handling all previous days. ` +
          `The overdue alert may still be present — check screenshot for details.`
        );
      }
    }

    await expect(page.locator(timesheetPage.addActivityButton).first()).toBeEnabled({ timeout: 15000 });

    // ── Step 3: Add activities ──
    console.log('Step 3: Adding activities...');
    await addActivitiesToDay(page, timesheetPage, chosenDayName);
    console.log('All activities added.');

    // ── Step 4: Submit for approval ──
    console.log('Step 4: Submitting for approval...');
    await timesheetPage.submitForApproval();
    console.log('Timesheet submitted for approval successfully.');
  });
});
