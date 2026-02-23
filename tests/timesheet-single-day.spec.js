const { test, expect } = require('@playwright/test');
const { TimesheetPage } = require('../pages/TimesheetPage');

/**
 * Single Day Timesheet Test
 *
 * Creates a timesheet for a single day, adds check-in + 3 work activities (9h) + check-out,
 * then submits for approval.
 */

const ACTIVITIES = [
  { type: 'check-in', start: '08:00', end: null, desc: 'Check-in' },
  { type: 'activity', start: '08:00', end: '11:00', desc: 'Morning work block' },
  { type: 'activity', start: '11:00', end: '14:00', desc: 'Midday work block' },
  { type: 'activity', start: '14:00', end: '17:00', desc: 'Afternoon work block' },
  { type: 'check-out', start: null, end: '17:00', desc: 'Check-out' },
];

test.describe('Single Day Timesheet', () => {
  test.setTimeout(300000); // 5 minutes

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

    // Select single day mode
    const singleModeBtn = page.locator(timesheetPage.singleModeButton).first();
    if (await singleModeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await singleModeBtn.click();
      await page.waitForTimeout(500);
    }

    // Navigate back through weeks until we find one with an available day
    const dialog = page.locator('[role="dialog"]');
    const MAX_WEEKS_BACK = 5;
    let weeksNavigatedBack = 0;
    let chosenDayName = ''; // e.g. "Mon", "Tue", "Sat"

    for (let week = 0; week < MAX_WEEKS_BACK; week++) {
      // Day buttons that already have a timesheet show a checkmark (svg inside).
      // Available days have NO svg child. Also exclude disabled / aria-disabled.
      const availableDays = dialog.locator(
        '.grid-cols-7 button:not([disabled]):not([aria-disabled="true"])'
      ).filter({ hasNot: page.locator('svg') });

      const count = await availableDays.count();
      if (count > 0) {
        // Extract the short day name from the button (first child div text)
        const dayBtn = availableDays.first();
        chosenDayName = await dayBtn.locator('div').first().textContent();
        chosenDayName = chosenDayName.trim(); // "Mon", "Tue", etc.
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
    // Fallback: if dialog is still open, force click
    const dialogStillOpen = await page.locator('[role="dialog"]').isVisible({ timeout: 2000 }).catch(() => false);
    if (dialogStillOpen) {
      await submitBtn.click({ force: true });
    }
    console.log(`  Timesheet created for ${chosenDayName}.`);

    // Wait for modal to close and page to reload
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(3000);

    // ── Step 2b: Navigate to the correct week and select the created day ──
    // The main page resets to the current week, so go back the same number of weeks
    if (weeksNavigatedBack > 0) {
      console.log(`  Navigating back ${weeksNavigatedBack} week(s) on the main page...`);
      for (let i = 0; i < weeksNavigatedBack; i++) {
        await timesheetPage.navigateToPreviousWeek();
        await page.waitForTimeout(1000);
      }
      await page.waitForTimeout(1000);
    }

    // Click the day tab that matches the created day (e.g. "Mon", "Sat")
    console.log(`  Selecting day tab: ${chosenDayName}`);
    const dayTab = page.locator(`div[role="button"]:has(h3:text-is("${chosenDayName}"))`).first();
    await expect(dayTab).toBeVisible({ timeout: 10000 });
    await dayTab.click();
    await page.waitForTimeout(2000);

    // Verify Add Activity button is now enabled
    await expect(page.locator(timesheetPage.addActivityButton).first()).toBeEnabled({ timeout: 15000 });

    // ── Step 3: Add activities ──
    console.log('Step 3: Adding activities...');

    for (let i = 0; i < ACTIVITIES.length; i++) {
      const step = ACTIVITIES[i];
      console.log(`  [${i + 1}/${ACTIVITIES.length}] Adding ${step.type} (${step.start || '--'}–${step.end || '--'})...`);

      // Open add activity modal
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

      // Pick the right option based on activity type
      let actOption;
      if (step.type === 'check-in') {
        actOption = page.locator('[role="option"]:has-text("Check-in"), [role="option"]:has-text("Check In")').first();
      } else if (step.type === 'check-out') {
        actOption = page.locator('[role="option"]:has-text("Check-out"), [role="option"]:has-text("Check Out")').first();
      } else {
        // Regular activity — skip check-in/check-out options
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

      // Verify activity type was selected
      for (let attempt = 0; attempt < 10; attempt++) {
        const val = (await activityTypeBtn.textContent().catch(() => '') || '').trim();
        if (val && !/select activity type/i.test(val)) {
          console.log(`    Activity Type: ${val}`);
          break;
        }
        await page.waitForTimeout(500);
      }

      // Wait for form to reconfigure after activity type selection
      await page.waitForTimeout(1000);

      // ── Work Description (150+ chars required) ──
      const descField = page.locator(timesheetPage.workDescriptionTextarea).first();
      if (await descField.isVisible({ timeout: 3000 }).catch(() => false)) {
        const existing = await descField.inputValue().catch(() => '');
        if (!existing || existing.trim().length < 150) {
          const description =
            `${step.desc} — Single day timesheet test. ` +
            `Activity type: ${step.type}, scheduled from ${step.start || 'N/A'} to ${step.end || 'N/A'}. ` +
            `This is an automated Playwright test that creates a single day timesheet and verifies all activities.`;
          await descField.fill(description);
        }
      }

      // ── Time inputs ──
      if (step.start) {
        await timesheetPage.setStartTime(step.start);
      }
      if (step.end) {
        await timesheetPage.setEndTime(step.end);
      }

      // ── Save ──
      await timesheetPage.clickActivitySave();
      await page.waitForTimeout(2000);

      // Wait for dialog to close
      await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1000);

      console.log(`  [${i + 1}/${ACTIVITIES.length}] ${step.type} saved.`);
    }

    console.log('All activities added.');

    // ── Step 4: Submit for approval ──
    console.log('Step 4: Submitting for approval...');
    await timesheetPage.submitForApproval();
    console.log('Timesheet submitted for approval successfully.');
  });
});
