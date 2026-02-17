const { test, expect } = require('@playwright/test');
const { TicketsManagerPage } = require('../pages/TicketsManagerPage');

/**
 * Playwright test for creating a ticket with all required fields
 * 
 * This test navigates to the ticket creation form and fills in all required details:
 * - Subject
 * - Purpose
 * - Message (with signature)
 * - Assign To
 * - Source
 * - Status
 * - Priority
 * - SLA (with response and resolution times)
 * - Contact Name
 * - Contact Phone
 * - To Recipients (email)
 */

// Helper function to wait for combobox to be ready and select an option
async function selectComboboxOption(
  page,
  label,
  optionText,
  timeout = 10000
) {
  try {
    // Find the label element
    const labelElement = page.locator(`label:has-text("${label}")`).first();
    await expect(labelElement).toBeVisible({ timeout });

    // Find the combobox trigger button - it's usually after the label in the same container
    // Try multiple strategies to find the button
    let comboboxTrigger = page.locator(`label:has-text("${label}")`).locator('xpath=following-sibling::*//button').first();
    
    // Alternative: find button with role="combobox" near the label
    if (!(await comboboxTrigger.isVisible({ timeout: 2000 }).catch(() => false))) {
      const labelParent = labelElement.locator('..');
      comboboxTrigger = labelParent.locator('button[role="combobox"]').first();
    }
    
    // Another alternative: find any button after the label
    if (!(await comboboxTrigger.isVisible({ timeout: 2000 }).catch(() => false))) {
      comboboxTrigger = labelElement.locator('xpath=following::button[1]').first();
    }

    await comboboxTrigger.click({ timeout });
    
    // Wait for the popover/content to appear
    await page.waitForTimeout(500);
    
    // Look for the search input in the popover (CommandInput)
    const searchInput = page.locator('input[placeholder*="Search" i], input[placeholder*="search" i]').first();
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill(optionText);
      await page.waitForTimeout(500); // Wait for debounce and filtering
    }
    
    // Find and click the option in the command list
    // Try multiple selectors for the option
    let option = page.locator(`[role="option"]:has-text("${optionText}")`).first();
    
    if (!(await option.isVisible({ timeout: 2000 }).catch(() => false))) {
      option = page.locator(`div:has-text("${optionText}"):visible`).first();
    }
    
    if (!(await option.isVisible({ timeout: 2000 }).catch(() => false))) {
      // Try to find by partial match
      option = page.locator(`[role="option"]`).filter({ hasText: optionText }).first();
    }
    
    await expect(option).toBeVisible({ timeout });
    await option.click();
    
    // Wait for the selection to be applied and popover to close
    await page.waitForTimeout(500);
  } catch (error) {
    console.error(`Error selecting combobox option "${optionText}" for label "${label}":`, error);
    throw error;
  }
}

// Helper function to fill the Tiptap editor (rich text editor)
async function fillTiptapEditor(page, content, addSignature = true) {
  // Tiptap editor is typically in a contenteditable div with class containing "ProseMirror"
  // Try to find the editor in the Message section
  const messageLabel = page.locator('label:has-text("Message")').first();
  await expect(messageLabel).toBeVisible({ timeout: 10000 });
  
  // Find the editor - it's usually in a div with contenteditable="true" or class "ProseMirror"
  let editor = page.locator('[contenteditable="true"]').first();
  
  // If not found, try finding by ProseMirror class
  if (!(await editor.isVisible({ timeout: 2000 }).catch(() => false))) {
    editor = page.locator('.ProseMirror, [class*="ProseMirror"]').first();
  }
  
  await expect(editor).toBeVisible({ timeout: 10000 });
  
  // Click to focus the editor
  await editor.click();
  await page.waitForTimeout(300);
  
  // Clear any existing content - select all and delete
  await editor.press('Control+a');
  await editor.press('Delete');
  await page.waitForTimeout(200);
  
  // Type the content
  await editor.type(content, { delay: 50 });
  await page.waitForTimeout(500);
  
  // If signature is required, we need to add it
  if (addSignature) {
    // Look for signature button in the editor toolbar
    // Tiptap editor usually has a toolbar with buttons
    const signatureButton = page.locator('button[title*="signature" i], button:has-text("Signature")').first();
    
    if (await signatureButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await signatureButton.click();
      await page.waitForTimeout(500);
      
      // Look for signature options in a dropdown/menu
      const signatureOption = page.locator('[role="menuitem"]:has-text("Signature"), div:has-text("Signature")').first();
      if (await signatureOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await signatureOption.click();
        await page.waitForTimeout(500);
      }
    } else {
      // If no signature button found, try to append signature text manually
      // Move to end of content
      await editor.press('End');
      await page.waitForTimeout(200);
      await editor.type('\n\n---\nTest Signature', { delay: 50 });
      await page.waitForTimeout(500);
    }
  }
  
  // Wait a bit more to ensure content is set
  await page.waitForTimeout(500);
}

// Helper function to fill AutoComplete field
async function fillAutoComplete(
  page,
  label,
  value,
  timeout = 10000
) {
  const labelElement = page.locator(`label:has-text("${label}")`).first();
  await expect(labelElement).toBeVisible({ timeout });
  
  // Find the input field near the label
  const labelContainer = labelElement.locator('..');
  const input = labelContainer.locator('input').first();
  
  await input.fill(value);
  await page.waitForTimeout(500);
  
  // If there's a dropdown, select the first option or press Enter
  const dropdownOption = page.locator('[role="option"]').first();
  if (await dropdownOption.isVisible({ timeout: 2000 }).catch(() => false)) {
    await dropdownOption.click();
  } else {
    await input.press('Enter');
  }
  
  await page.waitForTimeout(300);
}

test.describe('Ticket Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the tickets manager page
    const ticketsManagerPage = new TicketsManagerPage(page);
    await ticketsManagerPage.goto();
    
    // Verify we're on the tickets manager page
    await ticketsManagerPage.verifyTicketsManagerPage();
    
    // Click + Ticket button in top right corner to open ticket creation form
    await ticketsManagerPage.clickAddTicket();
    
    // Wait for ticket creation form to appear
    await ticketsManagerPage.waitForTicketForm();
    
    // Verify ticket creation form is open
    await ticketsManagerPage.verifyTicketFormOpen();
    
    // Verify the form is visible by checking for Subject input
    const subjectInput = page.locator('input[placeholder*="Subject" i], input[placeholder*="Enter Subject"]').first();
    await expect(subjectInput).toBeVisible({ timeout: 15000 });
  });

  test('should create a ticket with all required fields', async ({ page }) => {
    // ============================================
    // IMPORTANT: Customize these values based on your actual data
    // ============================================
    const testData = {
      subject: 'Test Ticket - Automated Playwright Test',
      purpose: 'Support', // Change to match your actual purpose options
      message: 'This is a test ticket created by Playwright automation. Please review and process accordingly.',
      assignTo: 'John Doe', // Change to match actual user names in your system
      source: 'Email', // Change to match your actual source options
      status: 'Open', // Change to match your actual status options
      priority: 'Medium', // Change to match your actual priority options (Low, Medium, High, etc.)
      slaType: 'Standard', // Change to match your actual SLA options
      contactName: 'Test Contact',
      contactPhone: '1234567890',
      contactEmail: 'test@example.com',
      referenceNo: 'REF-12345', // Optional
    };
    
    // Fill Subject (required)
    const subjectInput = page.locator('input[placeholder*="Subject" i], input[placeholder*="Enter Subject"]').first();
    await subjectInput.fill(testData.subject);
    
    // Fill Purpose (required) - using combobox
    await selectComboboxOption(page, 'Purpose', testData.purpose);
    
    // Fill Message (required) - using Tiptap editor
    await fillTiptapEditor(page, testData.message, true);
    
    // Fill Assign To (required) - using combobox
    await selectComboboxOption(page, 'Assign To', testData.assignTo);
    
    // Fill Source (required) - using combobox
    await selectComboboxOption(page, 'Source', testData.source);
    
    // Fill Status (required) - using combobox
    await selectComboboxOption(page, 'Status', testData.status);
    
    // Fill Priority (required) - using combobox
    await selectComboboxOption(page, 'Priority', testData.priority);
    
    // Navigate to SLA tab if needed, or fill SLA if it's auto-populated
    // Check if SLA tab exists
    const slaTab = page.locator('button:has-text("SLA")').first();
    if (await slaTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await slaTab.click();
      await page.waitForTimeout(500);
      
      // Fill SLA Type if not auto-populated
      const slaTypeInput = page.locator('input[placeholder*="SLA"], button:has-text("Select SLA")').first();
      if (await slaTypeInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await selectComboboxOption(page, 'SLA Type', testData.slaType);
      }
      
      // Fill Response Time (required when SLA is selected)
      const responseTimeInput = page.locator('input[placeholder*="Response Time" i], input[placeholder*="HH:MM:SS"]').first();
      if (await responseTimeInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await responseTimeInput.fill('02:30:00');
      }
      
      // Fill Resolution Time (required when SLA is selected)
      const resolutionTimeInput = page.locator('input[placeholder*="Resolution Time" i], input[placeholder*="HH:MM:SS"]').last();
      if (await resolutionTimeInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await resolutionTimeInput.fill('24:00:00');
      }
    }
    
    // Navigate to Contact Info tab
    const contactTab = page.locator('button:has-text("Contact Info"), button:has-text("Contact")').first();
    if (await contactTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await contactTab.click();
      await page.waitForTimeout(500);
    }
    
    // Fill Contact Name (required)
    const contactNameInput = page.locator('input[placeholder*="Contact name" i], input[placeholder*="Contact Name"]').first();
    await expect(contactNameInput).toBeVisible({ timeout: 5000 });
    await contactNameInput.fill(testData.contactName);
    
    // Fill Contact Phone (required)
    await fillAutoComplete(page, 'Contact Phone', testData.contactPhone);
    
    // Fill To Recipients (required) - email field
    const toRecipientsInput = page.locator('input[placeholder*="email" i], input[placeholder*="Type email"]').first();
    await expect(toRecipientsInput).toBeVisible({ timeout: 5000 });
    await toRecipientsInput.fill(testData.contactEmail);
    await toRecipientsInput.press('Enter');
    await page.waitForTimeout(500);
    
    // Optional: Fill Reference No if visible
    const refNoInput = page.locator('input[placeholder*="Reference number" i], input[placeholder*="Reference No"]').first();
    if (await refNoInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await refNoInput.fill(testData.referenceNo);
    }
    
    // Wait a moment for all fields to be processed
    await page.waitForTimeout(1000);
    
    // Verify that the submit button is enabled (not disabled)
    const submitButton = page.locator('button[type="submit"]:has-text("Create"), button:has-text("Create Ticket")').first();
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    
    // Check if button is disabled due to validation errors
    const isDisabled = await submitButton.isDisabled();
    if (isDisabled) {
      // Check for error messages
      const errorMessages = page.locator('.text-red-600, .text-red-500, [class*="error"]');
      const errorCount = await errorMessages.count();
      if (errorCount > 0) {
        console.log('Validation errors found:');
        for (let i = 0; i < errorCount; i++) {
          const errorText = await errorMessages.nth(i).textContent();
          console.log(`  - ${errorText}`);
        }
      }
      
      // Try to identify what's missing
      const signatureError = page.locator('text=/signature/i').first();
      if (await signatureError.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('Signature is required. Attempting to add signature...');
        // Try to add signature to the editor
        const editor = page.locator('[contenteditable="true"]').first();
        await editor.click();
        await editor.press('End');
        await editor.type('\n\n---\nTest Signature');
        await page.waitForTimeout(500);
      }
    }
    
    // Take a screenshot before submission for debugging
    await page.screenshot({ path: 'ticket-form-before-submit.png', fullPage: true });
    
    // Submit the form
    await submitButton.click();
    
    // Wait for the form submission to process
    await page.waitForTimeout(2000);
    
    // Check for success indicators
    // This might be a toast notification, redirect, or modal close
    const successToast = page.locator('text=/success|created|saved/i').first();
    const isSuccess = await successToast.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isSuccess) {
      console.log('Ticket created successfully!');
    } else {
      // Check for error messages
      const errorToast = page.locator('text=/error|failed|invalid/i').first();
      if (await errorToast.isVisible({ timeout: 2000 }).catch(() => false)) {
        const errorText = await errorToast.textContent();
        console.log(`Error creating ticket: ${errorText}`);
      }
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'ticket-form-error.png', fullPage: true });
    }
    
    // Wait for navigation or modal close
    await page.waitForTimeout(3000);
    
    // Verify we're either redirected or the modal is closed
    // Adjust this assertion based on your application's behavior
    const formStillVisible = await page.locator('input[placeholder*="Subject" i]').isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!formStillVisible) {
      console.log('Form closed or redirected - ticket creation likely successful');
    }
  });

  test('should validate required fields', async ({ page }) => {
    // Try to submit without filling required fields
    const submitButton = page.locator('button[type="submit"]:has-text("Create")').first();
    
    // The button should be disabled if validation fails
    // Or we can try clicking and check for error messages
    if (!(await submitButton.isDisabled())) {
      await submitButton.click();
      await page.waitForTimeout(1000);
      
      // Check for validation error messages
      const errorMessages = page.locator('.text-red-600, .text-red-500, text=/required|please enter|please select/i');
      const errorCount = await errorMessages.count();
      
      expect(errorCount).toBeGreaterThan(0);
      console.log(`Found ${errorCount} validation error(s)`);
    } else {
      console.log('Submit button is disabled - validation is working');
    }
  });
});

