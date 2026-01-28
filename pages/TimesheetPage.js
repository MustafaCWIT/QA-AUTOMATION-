const { expect } = require('@playwright/test');

/**
 * Timesheet Page Object Model
 * Contains all selectors and methods for the timesheet page
 */
class TimesheetPage {
  constructor(page) {
    this.page = page;
    
    // Selectors - Timesheet Modal (using data-id for reliability)
    this.createTimesheetButton = 'button[data-id="Timesheet Add Timesheet"]';
    this.addTimesheetButton = 'button[data-id="Timesheet Add Timesheet"]';
    this.singleModeButton = 'button[data-id="Timesheet Single Mode"]';
    this.weekModeButton = 'button[data-id="Timesheet Week Mode"]';
    this.timesheetCreateSubmit = 'button[data-id="Timesheet Create Submit"]';
    this.timesheetCreateCancel = 'button[data-id="Timesheet Create Cancel"]';
    this.previousWeekButton = 'button[data-id="Timesheet Previous Week"]';
    this.nextWeekButton = 'button[data-id="Timesheet Next Week"]';
    
    // NEW: View mode selectors
    this.myViewButton = 'button[data-id="Timesheet My View"]';
    this.managerViewButton = 'button[data-id="Timesheet Manager View"]';
    
    // Selectors - Activity Modal (using data-id for reliability)
    this.addActivityButton = 'button[data-id="Timesheet Add Activity"]';
    this.projectCombobox = '#project-combobox';
    this.workTypeCombobox = '#work-type-combobox';
    this.activityTypeCombobox = '#activity-type-combobox';
    this.taskCombobox = '#task-combobox';
    this.ticketCombobox = '#ticket-combobox';
    this.workDescriptionTextarea = 'label:has-text("Work Description") + textarea, textarea[placeholder*="description" i]';
    
    // FIXED: Time inputs are type="text", not type="time"
    // More flexible selectors to handle different DOM structures
    this.startTimeInput = 'label:has-text("Start Time") + div input[type="text"], label:has-text("Start Time") ~ input[type="text"], input[type="text"][placeholder*="HH:MM" i]:nth-of-type(1), input[type="text"]:nth-of-type(1)';
    this.endTimeInput = 'label:has-text("End Time") + div input[type="text"], label:has-text("End Time") ~ input[type="text"], input[type="text"][placeholder*="HH:MM" i]:nth-of-type(2), input[type="text"]:nth-of-type(2)';
    
    this.activitySaveButton = 'button[data-id="Timesheet Activity Save"]';
    this.activityAddButton = 'button[data-id="Timesheet Activity Add"]';
    this.activityCancelButton = 'button[data-id="Timesheet Activity Cancel"]';
    
    // Error Messages (case-insensitive with regex)
    this.allDaysExistError = 'text=/All days in this week already have timesheets/i';
    this.noDaySelectedError = 'text=/Please select a day/i';
    this.dayAlreadyExistsError = 'text=/This day already has a timesheet/i';
    this.requiredFieldsError = 'text=/Please fill in all required fields/i';
    this.requiredFieldsDetailsError = 'text=/Project, Work Type, Activity Type, and Work Description/i';
    this.descriptionLimitError = 'text=/Work Description cannot exceed 150 characters/i';
    this.sameTimeError = 'text=/Start time and end time cannot be the same/i';
    this.invalidOvernightError = 'text=/Activity cannot extend into the next day/i';
    this.overlappingTimeError = 'text=/Overlapping Time Range|This time slot is already covered/i';
  }

  /**
   * Navigate to the timesheet page via direct URL
   * FIXED: Added retry logic for parallel execution - handles server overload gracefully
   */
  async goto(maxRetries = 3) {
    let lastError;
    
    // Retry logic for handling server overload during parallel execution
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Add small delay between retries to avoid overwhelming server
        if (attempt > 0) {
          const delay = attempt * 2000; // 2s, 4s, 6s delays
          console.log(`Retrying timesheet page load (attempt ${attempt + 1}/${maxRetries}) after ${delay}ms delay...`);
          await this.page.waitForTimeout(delay);
        }
        
        // Navigate with longer timeout for remote server
        await this.page.goto('/dashboard/timesheet', { 
          waitUntil: 'domcontentloaded',
          timeout: 60000 
        });
        
        // Check authentication
        if (this.page.url().includes('/auth/login')) {
          throw new Error('Authentication failed - redirected to login page.');
        }
        
        // Verify we're on the correct page
        await expect(this.page).toHaveURL(/\/dashboard\/timesheet/, { timeout: 10000 });
        
        // Wait for network (with timeout - don't wait forever)
        await Promise.race([
          this.page.waitForLoadState('networkidle'),
          new Promise(resolve => setTimeout(resolve, 15000)) // Max 15s
        ]).catch(() => {});
        
        // Wait for React rendering
        await this.page.waitForTimeout(4000);
        
        // Wait for loading to disappear - be more patient (up to 30 seconds)
        // Try multiple times with increasing delays
        for (let loadingAttempt = 0; loadingAttempt < 6; loadingAttempt++) {
          const loadingText = await this.page.locator('text=/Loading timesheet data/i').isVisible().catch(() => false);
          if (!loadingText) {
            break; // Loading is gone
          }
          await this.page.waitForTimeout(5000); // Wait 5s between checks
        }
        
        // Wait for buttons directly (this is what we need) - with longer timeout
        try {
          await this.page.waitForSelector(
            'button[data-id="Timesheet Add Timesheet"], ' +
            'button[data-id="Timesheet My View"], ' +
            'button[data-id="Timesheet Manager View"]',
            { timeout: 30000 } // Increased to 30s
          );
        } catch (e) {
          // If buttons not found, check what's on the page
          const pageText = await this.page.locator('body').textContent().catch(() => '');
          
          // Check for common issues
          if (pageText?.includes('Loading timesheet data') || pageText?.includes('Loading')) {
            // Still loading - wait a bit more and try once more
            await this.page.waitForTimeout(10000);
            const stillLoading = await this.page.locator('text=/Loading timesheet data/i').isVisible().catch(() => false);
            if (stillLoading) {
              // If still loading, this might be a server issue - retry
              if (attempt < maxRetries - 1) {
                lastError = new Error('Page is still loading. Retrying...');
                continue; // Retry
              }
              throw new Error('Page is still loading after 40+ seconds. Server might be very slow or stuck.');
            }
            // Try buttons again after additional wait
            await this.page.waitForSelector(
              'button[data-id="Timesheet Add Timesheet"], ' +
              'button[data-id="Timesheet My View"], ' +
              'button[data-id="Timesheet Manager View"]',
              { timeout: 10000 }
            ).catch(() => {
              if (attempt < maxRetries - 1) {
                lastError = new Error('Buttons not found. Retrying...');
                throw lastError; // Will be caught and retried
              }
              throw new Error('Page took too long to load. Buttons still not visible after extended wait.');
            });
          } else if (pageText?.includes('error') || pageText?.includes('Error')) {
            throw new Error('Page shows an error. Check page content for details.');
          } else if (!pageText || pageText.length < 50) {
            // Empty page might be temporary - retry
            if (attempt < maxRetries - 1) {
              lastError = new Error('Page appears empty. Retrying...');
              continue; // Retry
            }
            throw new Error('Page appears empty. Check if page loaded correctly.');
          } else {
            // If we have content but no buttons, might be permission issue or temporary state
            if (attempt < maxRetries - 1) {
              lastError = new Error('Buttons not found but page has content. Retrying...');
              continue; // Retry
            }
            throw new Error(
              `Timesheet buttons not found. ` +
              `Page has content (${pageText.length} chars) but buttons missing. ` +
              `User might not have permission to view timesheet.`
            );
          }
        }
        
        await this.page.waitForTimeout(2000);
        await this.ensureMyViewMode();
        
        // Final verification
        await this.page.waitForSelector('button[data-id="Timesheet Add Timesheet"]', {
          timeout: 10000
        });
        
        // Success! Exit retry loop
        return;
        
      } catch (error) {
        lastError = error;
        
        // Don't retry on authentication errors
        if (error.message.includes('Authentication failed')) {
          throw error;
        }
        
        // Don't retry on permission errors
        if (error.message.includes('permission')) {
          throw error;
        }
        
        // If this is the last attempt, throw the error
        if (attempt === maxRetries - 1) {
          throw new Error(
            `Failed to load timesheet page after ${maxRetries} attempts. ` +
            `Last error: ${error.message}`
          );
        }
        
        // Otherwise, continue to next retry
        console.log(`Timesheet page load failed (attempt ${attempt + 1}/${maxRetries}): ${error.message}`);
      }
    }
    
    // Should never reach here, but just in case
    throw lastError || new Error('Failed to load timesheet page');
  }

  /**
   * Ensure we're in "My View" mode (not Manager View)
   * The Add Timesheet button only shows in My View
   */
  async ensureMyViewMode() {
    // Check if we're in Manager View
    const managerViewButton = this.page.locator(this.managerViewButton).first();
    const myViewButton = this.page.locator(this.myViewButton).first();
    
    try {
      // Check if Manager View button is active/selected
      const isManagerViewActive = await managerViewButton.evaluate((el) => {
        return el.classList.contains('bg-primary') || 
               el.getAttribute('aria-pressed') === 'true' ||
               el.classList.contains('data-[state=on]') ||
               el.getAttribute('data-state') === 'on';
      }).catch(() => false);
      
      if (isManagerViewActive) {
        // Click "My View" button to switch
        await myViewButton.waitFor({ state: 'visible', timeout: 5000 });
        await myViewButton.click();
        await this.page.waitForTimeout(1000); // Wait for view to switch
      }
    } catch (e) {
      // If buttons don't exist, assume we're already in My View
    }
    
    // Verify Add Timesheet button is now visible
    await this.page.waitForSelector('button[data-id="Timesheet Add Timesheet"]', { 
      timeout: 10000 
    });
  }

  /**
   * Navigate to previous week in the create timesheet modal
   */
  async navigateToPreviousWeekInModal() {
    const prevButton = this.page.locator(this.previousWeekButton).first();
    try {
      await prevButton.waitFor({ state: 'visible', timeout: 3000 });
      await prevButton.click();
      await this.page.waitForTimeout(1000); // Wait for week to change
    } catch (e) {
      // Button not visible, skip
    }
  }

  /**
   * Navigate to next week in the create timesheet modal
   */
  async navigateToNextWeekInModal() {
    const nextButton = this.page.locator(this.nextWeekButton).first();
    try {
      await nextButton.waitFor({ state: 'visible', timeout: 3000 });
      await nextButton.click();
      await this.page.waitForTimeout(1000); // Wait for week to change
    } catch (e) {
      // Button not visible, skip
    }
  }

  /**
   * Open create timesheet modal
   * FIXED: Better error handling and ensures My View mode
   */
  async openCreateTimesheetModal() {
    // Ensure we're in My View first
    await this.ensureMyViewMode();
    
    const button = this.page.locator(this.createTimesheetButton).first();
    
    // Wait longer and with better error message
    try {
      await button.waitFor({ state: 'visible', timeout: 15000 });
    } catch (e) {
      // Check if page is still loading
      const pageTitle = await this.page.title();
      const currentUrl = this.page.url();
      
      throw new Error(
        `Add Timesheet button not found. ` +
        `URL: ${currentUrl}, ` +
        `Title: ${pageTitle}, ` +
        `Make sure you're in "My View" mode and page is fully loaded.`
      );
    }
    
    await expect(button).toBeEnabled({ timeout: 5000 });
    await button.click();
    await this.page.waitForTimeout(500);
    
    // Wait for modal to appear
    await this.page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    
    // Wait for modal content to load
    await this.page.waitForTimeout(1000);
  }

  /**
   * Check if Add Activity button is enabled (indicates timesheet exists)
   */
  async isAddActivityButtonEnabled() {
    const button = this.page.locator(this.addActivityButton).first();
    try {
      await button.waitFor({ state: 'visible', timeout: 5000 });
      return await button.isEnabled();
    } catch (e) {
      return false;
    }
  }

  /**
   * Create a timesheet if needed (when Add Activity button is disabled)
   * FIXED: Handles all days exist scenario and selects available day
   */
  async createTimesheetIfNeeded() {
    const isEnabled = await this.isAddActivityButtonEnabled();
    
    if (!isEnabled) {
      // Ensure we're in My View
      await this.ensureMyViewMode();
      
      // Open create timesheet modal
      await this.openCreateTimesheetModal();
      
      // Wait for modal content to load
      await this.page.waitForTimeout(1000);
      
      // Select single day mode
      const singleModeButton = this.page.locator(this.singleModeButton).first();
      if (await singleModeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await singleModeButton.click();
        await this.page.waitForTimeout(500);
      }
      
      // NEW: Check if all days exist in current week
      const allDaysExistMessage = this.page.locator(this.allDaysExistError);
      const allDaysExist = await allDaysExistMessage.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (allDaysExist) {
        // Navigate to next week where days might be available
        await this.navigateToNextWeekInModal();
        await this.page.waitForTimeout(1000);
        
        // Check again
        const stillAllExist = await allDaysExistMessage.isVisible({ timeout: 2000 }).catch(() => false);
        if (stillAllExist) {
          // Try previous week
          await this.navigateToPreviousWeekInModal();
          await this.page.waitForTimeout(1000);
        }
      }
      
      // NEW: Select an available day in single mode
      if (await singleModeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Find an available (non-disabled) day button
        const availableDayButton = this.page.locator(
          'button:not([disabled]):has-text("Mon"), button:not([disabled]):has-text("Tue"), button:not([disabled]):has-text("Wed"), button:not([disabled]):has-text("Thu"), button:not([disabled]):has-text("Fri"), button:not([disabled]):has-text("Sat"), button:not([disabled]):has-text("Sun")'
        ).first();
        
        if (await availableDayButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await availableDayButton.click();
          await this.page.waitForTimeout(500);
        }
      }
      
      // Check if submit button is enabled
      const submitButton = this.page.locator(this.timesheetCreateSubmit).first();
      await submitButton.waitFor({ state: 'visible', timeout: 5000 });
      
      // NEW: Wait for button to be enabled (with longer timeout)
      try {
        await expect(submitButton).toBeEnabled({ timeout: 10000 });
      } catch (e) {
        // If still disabled, check why
        const isDisabled = await submitButton.isDisabled();
        const buttonText = await submitButton.textContent().catch(() => '');
        
        // Check for error messages
        const errorMsg = await this.page.locator('text=/All days|No available days/i').first().textContent().catch(() => '');
        throw new Error(`Cannot create timesheet: ${errorMsg || 'Submit button is disabled'}. Button text: ${buttonText}`);
      }
      
      await submitButton.click();
      
      // Wait for timesheet to be created and modal to close
      await this.page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 15000 }).catch(() => {});
      await this.page.waitForTimeout(2000);
      
      // Verify Add Activity button is now enabled
      await expect(this.page.locator(this.addActivityButton).first())
        .toBeEnabled({ timeout: 15000 });
    }
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
   * Close any open modals
   */
  async closeAnyOpenModals() {
    // Check for open modal
    const openModal = this.page.locator('[role="dialog"]').first();
    const isOpen = await openModal.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (isOpen) {
      // Try ESC key first (most reliable)
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(500);
      
      // Check if still open
      const stillOpen = await openModal.isVisible({ timeout: 1000 }).catch(() => false);
      if (stillOpen) {
        // Try close/cancel button
        const closeBtn = this.page.locator(
          '[role="dialog"] button:has-text("Cancel"), ' +
          '[role="dialog"] button[aria-label*="close" i], ' +
          '[role="dialog"] button[data-id*="Cancel"]'
        ).first();
        
        if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await closeBtn.click();
          await this.page.waitForTimeout(500);
        }
      }
      
      // Wait for modal to close
      await this.page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 }).catch(() => {});
    }
    
    // Wait for overlay to disappear
    await this.page.waitForTimeout(500);
  }

  /**
   * Open add activity modal
   * Ensures button is enabled before clicking
   * Closes any open modals first to prevent overlay blocking
   */
  async openAddActivityModal() {
    // FIRST: Close any open modals to prevent overlay blocking
    await this.closeAnyOpenModals();
    
    const button = this.page.locator(this.addActivityButton).first();
    await button.waitFor({ state: 'visible', timeout: 10000 });
    
    // Wait for button to be enabled (it's disabled when no timesheet exists)
    await expect(button).toBeEnabled({ timeout: 5000 });
    
    await button.click();
    await this.page.waitForTimeout(500);
    
    // Wait for modal to appear
    await this.page.waitForSelector('[role="dialog"]', { timeout: 5000 });
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
   * Set start time (FIXED - handles text input and triggers normalization)
   */
  async setStartTime(time) {
    const input = this.page.locator(this.startTimeInput).first();
    await input.waitFor({ state: 'visible', timeout: 5000 });
    await input.fill(time);
    // Trigger blur to normalize the time
    await input.blur();
    await this.page.waitForTimeout(300);
  }

  /**
   * Set end time (FIXED - handles text input and triggers normalization)
   * More flexible - tries multiple selector strategies
   */
  async setEndTime(time) {
    // Try multiple selector strategies
    let input = this.page.locator(this.endTimeInput).first();
    
    try {
      await input.waitFor({ state: 'visible', timeout: 10000 });
    } catch (e) {
      // Try alternative selectors if first one fails
      input = this.page.locator('input[type="text"]:nth-of-type(2)').first();
      try {
        await input.waitFor({ state: 'visible', timeout: 5000 });
      } catch (e2) {
        // Try finding by label text
        const endTimeLabel = this.page.locator('label:has-text("End Time"), label:has-text("End")').first();
        if (await endTimeLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
          input = this.page.locator('label:has-text("End Time") ~ input, label:has-text("End") ~ input').first();
          await input.waitFor({ state: 'visible', timeout: 5000 });
        } else {
          throw new Error('End time input field not found. Check if modal is fully loaded.');
        }
      }
    }
    
    await input.fill(time);
    // Trigger blur to normalize the time
    await input.blur();
    await this.page.waitForTimeout(300);
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
   * Verify day button is disabled (IMPROVED - checks tooltip)
   */
  async verifyDayDisabled(dayText) {
    const dayButton = this.page.locator(`button:has-text("${dayText}")`).first();
    await expect(dayButton).toBeDisabled();
    
    // Verify tooltip indicates timesheet exists
    const tooltip = await dayButton.getAttribute('title');
    if (tooltip) {
      expect(tooltip.toLowerCase()).toContain('already exists');
    }
  }

  /**
   * Navigate to previous week (FIXED - uses data-id)
   */
  async navigateToPreviousWeek() {
    const prevButton = this.page.locator(this.previousWeekButton).first();
    try {
      await prevButton.waitFor({ state: 'visible', timeout: 3000 });
      await prevButton.click();
      await this.page.waitForTimeout(500);
    } catch (e) {
      // Button not visible, skip navigation
    }
  }

  /**
   * Navigate to next week (FIXED - uses data-id)
   */
  async navigateToNextWeek() {
    const nextButton = this.page.locator(this.nextWeekButton).first();
    try {
      await nextButton.waitFor({ state: 'visible', timeout: 3000 });
      await nextButton.click();
      await this.page.waitForTimeout(500);
    } catch (e) {
      // Button not visible, skip navigation
    }
  }
}

module.exports = { TimesheetPage };

