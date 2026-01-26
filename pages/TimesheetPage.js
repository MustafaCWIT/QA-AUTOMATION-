const { expect } = require('@playwright/test');

/**
 * Timesheet Page Object Model
 * Contains all selectors and methods for the timesheet page
 */
class TimesheetPage {
  constructor(page) {
    this.page = page;
    
    // Selectors - Timesheet Modal
    this.createTimesheetButton = 'button:has-text("Create Timesheet"), button:has-text("+ Timesheet")';
    this.singleModeButton = '[data-id="Timesheet Single Mode"]';
    this.weekModeButton = '[data-id="Timesheet Week Mode"]';
    this.timesheetCreateSubmit = '[data-id="Timesheet Create Submit"]';
    this.timesheetCreateCancel = '[data-id="Timesheet Create Cancel"]';
    
    // Selectors - Activity Modal
    this.addActivityButton = 'button:has-text("Add Activity"), button:has-text("+ Activity")';
    this.projectCombobox = '#project-combobox';
    this.workTypeCombobox = '#work-type-combobox';
    this.activityTypeCombobox = '#activity-type-combobox';
    this.taskCombobox = '#task-combobox';
    this.ticketCombobox = '#ticket-combobox';
    this.workDescriptionTextarea = 'textarea[placeholder*="description" i], textarea[name*="description" i]';
    this.startTimeInput = 'input[type="time"]:nth-of-type(1), input[type="time"][name*="start" i]';
    this.endTimeInput = 'input[type="time"]:nth-of-type(2), input[type="time"][name*="end" i]';
    this.activitySaveButton = '[data-id="Timesheet Activity Save"]';
    this.activityAddButton = '[data-id="Timesheet Activity Add"]';
    this.activityCancelButton = '[data-id="Timesheet Activity Cancel"]';
    
    // Error Messages
    this.allDaysExistError = 'text=All days in this week already have timesheets';
    this.noDaySelectedError = 'text=Please select a day';
    this.dayAlreadyExistsError = 'text=This day already has a timesheet';
    this.requiredFieldsError = 'text=Please fill in all required fields';
    this.requiredFieldsDetailsError = 'text=Project, Work Type, Activity Type, and Work Description';
    this.descriptionLimitError = 'text=Work Description cannot exceed 150 characters';
    this.sameTimeError = 'text=Start time and end time cannot be the same';
    this.invalidOvernightError = 'text=Activity cannot extend into the next day';
    this.overlappingTimeError = 'text=Overlapping Time Range, text=This time slot is already covered';
  }

  /**
   * Navigate to the timesheet page via direct URL (Recommended - faster and more reliable)
   */
  async goto() {
    // Direct URL navigation is faster and more reliable than clicking through UI
    await this.page.goto('/dashboard/timesheet', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    // Wait for page to be ready instead of networkidle (more reliable)
    await this.page.waitForLoadState('domcontentloaded');
    // Verify we're on the correct page
    await expect(this.page).toHaveURL(/\/dashboard\/timesheet/);
  }

  /**
   * Open create timesheet modal
   */
  async openCreateTimesheetModal() {
    const button = this.page.locator(this.createTimesheetButton).first();
    await button.waitFor({ state: 'visible', timeout: 10000 });
    await button.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Select single day mode
   */
  async selectSingleMode() {
    await this.page.click(this.singleModeButton);
    await this.page.waitForTimeout(300);
  }

  /**
   * Select week mode
   */
  async selectWeekMode() {
    await this.page.click(this.weekModeButton);
    await this.page.waitForTimeout(300);
  }

  /**
   * Click submit button in create timesheet modal
   */
  async clickTimesheetSubmit() {
    await this.page.click(this.timesheetCreateSubmit);
  }

  /**
   * Open add activity modal
   */
  async openAddActivityModal() {
    const button = this.page.locator(this.addActivityButton).first();
    await button.waitFor({ state: 'visible', timeout: 10000 });
    await button.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Select project from combobox
   */
  async selectProject(projectName) {
    await this.page.click(this.projectCombobox);
    await this.page.waitForTimeout(300);
    await this.page.click(`text=${projectName}`);
    await this.page.waitForTimeout(300);
  }

  /**
   * Select work type from combobox
   */
  async selectWorkType(workType) {
    await this.page.click(this.workTypeCombobox);
    await this.page.waitForTimeout(300);
    await this.page.click(`text=${workType}`);
    await this.page.waitForTimeout(300);
  }

  /**
   * Select activity type from combobox
   */
  async selectActivityType(activityType) {
    await this.page.click(this.activityTypeCombobox);
    await this.page.waitForTimeout(300);
    await this.page.click(`text=${activityType}`);
    await this.page.waitForTimeout(300);
  }

  /**
   * Fill work description
   */
  async fillWorkDescription(description) {
    await this.page.fill(this.workDescriptionTextarea, description);
  }

  /**
   * Set start time
   */
  async setStartTime(time) {
    await this.page.fill(this.startTimeInput, time);
  }

  /**
   * Set end time
   */
  async setEndTime(time) {
    await this.page.fill(this.endTimeInput, time);
  }

  /**
   * Click save button in activity modal
   */
  async clickActivitySave() {
    await this.page.click(this.activitySaveButton);
  }

  /**
   * Verify error message is visible
   */
  async verifyErrorVisible(errorSelector) {
    await expect(this.page.locator(errorSelector)).toBeVisible({ timeout: 5000 });
  }

  /**
   * Verify submit button is disabled
   */
  async verifySubmitDisabled() {
    await expect(this.page.locator(this.timesheetCreateSubmit)).toBeDisabled();
  }

  /**
   * Verify day button is disabled (already has timesheet)
   */
  async verifyDayDisabled(dayText) {
    const dayButton = this.page.locator(`button:has-text("${dayText}")`).first();
    await expect(dayButton).toBeDisabled();
  }

  /**
   * Navigate to previous week
   */
  async navigateToPreviousWeek() {
    const prevButton = this.page.locator('button:has-text("Previous"), button[aria-label*="Previous" i]').first();
    if (await prevButton.isVisible()) {
      await prevButton.click();
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Navigate to next week
   */
  async navigateToNextWeek() {
    const nextButton = this.page.locator('button:has-text("Next"), button[aria-label*="Next" i]').first();
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await this.page.waitForTimeout(500);
    }
  }
}

module.exports = { TimesheetPage };

