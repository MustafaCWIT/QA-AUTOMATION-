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
    console.log(`Attempting to select "${optionText}" for "${label}"`);
    
    // Strategy 1: Find combobox by label text - most reliable
    let comboboxTrigger = null;
    
    // First, try to find the label
    const labelElement = page.locator(`label:has-text("${label}")`).first();
    const labelVisible = await labelElement.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (labelVisible) {
      // Find combobox button near the label - try multiple approaches
      // Approach 1: Following sibling with combobox
      comboboxTrigger = labelElement.locator('xpath=following-sibling::*//button[role="combobox"]').first();
      
      if (!(await comboboxTrigger.isVisible({ timeout: 2000 }).catch(() => false))) {
        // Approach 2: Parent container
        const labelParent = labelElement.locator('..');
        comboboxTrigger = labelParent.locator('button[role="combobox"]').first();
      }
      
      if (!(await comboboxTrigger.isVisible({ timeout: 2000 }).catch(() => false))) {
        // Approach 3: Any following combobox button
        comboboxTrigger = labelElement.locator('xpath=following::button[@role="combobox"][1]').first();
      }
    }
    
    // Strategy 2: Find by placeholder text (for Purpose: "Select purpose...")
    if (!comboboxTrigger || !(await comboboxTrigger.isVisible({ timeout: 2000 }).catch(() => false))) {
      const placeholderMap = {
        'Purpose': 'Select purpose',
        'Assign To': 'Select',
        'Source': 'Select',
        'Status': 'Select',
        'Priority': 'Select'
      };
      
      const placeholder = placeholderMap[label] || `Select ${label.toLowerCase()}`;
      comboboxTrigger = page.locator(`button[role="combobox"]:has-text("${placeholder}")`).first();
    }
    
    // Strategy 3: Find any combobox button and filter by context
    if (!comboboxTrigger || !(await comboboxTrigger.isVisible({ timeout: 2000 }).catch(() => false))) {
      // Get all combobox buttons and find the one near the label
      const allComboboxes = page.locator('button[role="combobox"]');
      const count = await allComboboxes.count();
      
      if (labelVisible) {
        // Find the combobox closest to the label
        for (let i = 0; i < count; i++) {
          const cb = allComboboxes.nth(i);
          const cbText = await cb.textContent().catch(() => '');
          if (cbText.includes('Select') || cbText.includes(label)) {
            comboboxTrigger = cb;
            break;
          }
        }
      }
    }

    // Ensure we found the combobox trigger
    if (!comboboxTrigger) {
      throw new Error(`Could not find combobox trigger for "${label}"`);
    }
    
    await expect(comboboxTrigger).toBeVisible({ timeout });
    console.log(`Found combobox for "${label}"`);
    
    // Scroll into view if needed
    await comboboxTrigger.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    
    // Check if combobox is already open (aria-expanded="true")
    const isExpanded = await comboboxTrigger.getAttribute('aria-expanded');
    console.log(`Combobox expanded state: ${isExpanded}`);
    
    // Click to open the combobox if not already open
    if (isExpanded !== 'true') {
      await comboboxTrigger.click({ timeout });
      await page.waitForTimeout(500);
    }
    
    // Wait for the popover/dialog to appear - try multiple selectors
    const popoverSelectors = [
      '[role="dialog"]',
      '[role="listbox"]',
      '[data-radix-popper-content-wrapper]',
      '[data-radix-select-content]',
      '.popover-content',
      '[class*="popover"]'
    ];
    
    let popoverVisible = false;
    for (const selector of popoverSelectors) {
      const popover = page.locator(selector).first();
      if (await popover.isVisible({ timeout: 2000 }).catch(() => false)) {
        popoverVisible = true;
        console.log(`Popover found with selector: ${selector}`);
        break;
      }
    }
    
    if (!popoverVisible) {
      // Wait a bit more - sometimes the popover takes time to render
      await page.waitForTimeout(1000);
    }
    
    // Look for the search input in the popover (CommandInput)
    // Different dropdowns have different placeholders:
    // - Purpose: "Search purposes..."
    // - Assign To: "Q Type to search..."
    // - Priority: "Search..." or "Type to search..."
    // - Status, Source: Similar patterns
    const searchInputSelectors = [
      // Label-specific placeholders
      `input[placeholder*="Search ${label.toLowerCase()}" i]`,
      `input[placeholder*="search ${label.toLowerCase()}" i]`,
      // Common patterns
      `input[placeholder*="Search purposes" i]`,
      `input[placeholder*="Type to search" i]`,
      `input[placeholder*="type to search" i]`,
      `input[placeholder*="Q Type to search" i]`,
      `input[placeholder*="q type to search" i]`,
      // Generic search patterns
      'input[placeholder*="Search" i]',
      'input[placeholder*="search" i]',
      // Any input in the popover/dialog
      '[role="dialog"] input[type="text"]',
      '[role="dialog"] input[type="search"]',
      '[role="listbox"] input[type="text"]',
      '[role="listbox"] input[type="search"]',
      // Fallback: any text input in visible popover
      'input[type="text"]:visible',
      'input[type="search"]:visible'
    ];
    
    let searchInput = null;
    let searchInputFound = false;
    
    // Try to find search input with multiple strategies
    for (const selector of searchInputSelectors) {
      try {
        const inputs = page.locator(selector);
        const count = await inputs.count();
        
        // Check all matching inputs to find the one in the popover
        for (let i = 0; i < count; i++) {
          const input = inputs.nth(i);
          if (await input.isVisible({ timeout: 1000 }).catch(() => false)) {
            // Verify it's actually in a popover/dialog (not in the main form)
            const isInPopover = await input.evaluate((el) => {
              let parent = el.parentElement;
              let depth = 0;
              while (parent && depth < 10) {
                const role = parent.getAttribute('role');
                const classes = parent.className || '';
                if (role === 'dialog' || role === 'listbox' || 
                    classes.includes('popover') || classes.includes('dropdown') ||
                    parent.hasAttribute('data-radix-popper-content-wrapper')) {
                  return true;
                }
                parent = parent.parentElement;
                depth++;
              }
              return false;
            }).catch(() => false);
            
            if (isInPopover) {
              searchInput = input;
              searchInputFound = true;
              console.log(`Found search input with selector: ${selector} (input ${i + 1})`);
              break;
            }
          }
        }
        
        if (searchInputFound) break;
      } catch (e) {
        // Continue to next selector
        continue;
      }
    }
    
    // If still not found, try a more aggressive approach - find any visible input in popover
    if (!searchInputFound) {
      console.log('Trying more aggressive search input detection...');
      const allInputs = page.locator('input[type="text"], input[type="search"]');
      const inputCount = await allInputs.count();
      
      for (let i = 0; i < inputCount; i++) {
        const input = allInputs.nth(i);
        if (await input.isVisible({ timeout: 1000 }).catch(() => false)) {
          // Check if it's in a popover
          const isInPopover = await input.evaluate((el) => {
            let parent = el.parentElement;
            let depth = 0;
            while (parent && depth < 10) {
              const role = parent.getAttribute('role');
              const classes = parent.className || '';
              if (role === 'dialog' || role === 'listbox' || 
                  classes.includes('popover') || classes.includes('dropdown') ||
                  parent.hasAttribute('data-radix-popper-content-wrapper')) {
                return true;
              }
              parent = parent.parentElement;
              depth++;
            }
            return false;
          }).catch(() => false);
          
          if (isInPopover) {
            searchInput = input;
            searchInputFound = true;
            console.log(`Found search input (input ${i + 1} in page)`);
            break;
          }
        }
      }
    }
    
    // If search input is found, use it to filter options
    if (searchInput && searchInputFound && await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log(`Search input found for "${label}", clearing and typing option text`);
      // Click to focus the search input
      await searchInput.click();
      await page.waitForTimeout(300);
      
      // Clear any existing text (select all and delete)
      await searchInput.press('Control+a');
      await searchInput.press('Delete');
      await page.waitForTimeout(300);
      
      // Type the option text to filter
      await searchInput.fill(optionText);
      await page.waitForTimeout(1200); // Wait for debounce and filtering to complete
      
      // Verify text was typed
      const typedValue = await searchInput.inputValue().catch(() => '');
      console.log(`Typed "${optionText}" in search input (actual value: "${typedValue}"), waiting for filtered options...`);
      
      if (!typedValue || !typedValue.includes(optionText.split(' ')[0])) {
        // Retry typing if it didn't work
        console.log('Retrying to type in search input...');
        await searchInput.click();
        await searchInput.fill(optionText);
        await page.waitForTimeout(1000);
      }
    } else {
      console.log(`⚠️ No search input found for "${label}", proceeding to find options directly`);
    }
    
    // Find and click the option in the command list
    // Wait a bit more for options to render after search filtering
    await page.waitForTimeout(500);
    
    // Try multiple selectors for the option
    let option = null;
    
    // Strategy 1: Exact text match with role="option" (most reliable)
    option = page.locator(`[role="option"]:has-text("${optionText}")`).first();
    if (!(await option.isVisible({ timeout: 3000 }).catch(() => false))) {
      console.log('Strategy 1 failed, trying partial match...');
      // Strategy 2: Partial match
      option = page.locator(`[role="option"]`).filter({ hasText: optionText }).first();
    }
    
    if (!(await option.isVisible({ timeout: 2000 }).catch(() => false))) {
      console.log('Strategy 2 failed, trying case-insensitive match...');
      // Strategy 3: Case-insensitive match
      option = page.locator(`[role="option"]`).filter({ hasText: new RegExp(optionText, 'i') }).first();
    }
    
    if (!(await option.isVisible({ timeout: 2000 }).catch(() => false))) {
      console.log('Strategy 3 failed, trying div with text...');
      // Strategy 4: Div with text (no role) - sometimes options don't have role="option"
      option = page.locator(`div:has-text("${optionText}"):visible`).first();
    }
    
    if (!(await option.isVisible({ timeout: 2000 }).catch(() => false))) {
      console.log('Strategy 4 failed, trying any element with text...');
      // Strategy 5: Any clickable element with the text
      option = page.locator(`*:has-text("${optionText}"):visible`).first();
    }
    
    if (!(await option.isVisible({ timeout: 2000 }).catch(() => false))) {
      // Strategy 6: Try to find by partial text match (for cases like "General - Customer Service")
      const partialMatch = optionText.split(' ')[0]; // Get first word
      option = page.locator(`[role="option"]`).filter({ hasText: partialMatch }).first();
      console.log(`Trying partial match with first word: "${partialMatch}"`);
    }
    
    // Ensure option is visible before clicking
    if (!option || !(await option.isVisible({ timeout: 3000 }).catch(() => false))) {
      // Take screenshot for debugging
      await page.screenshot({ path: `combobox-${label.replace(/\s+/g, '-')}-options.png` }).catch(() => {});
      
      // Try to get all available options for debugging
      const allOptions = page.locator('[role="option"]');
      const optionCount = await allOptions.count();
      console.log(`Found ${optionCount} options in dropdown`);
      for (let i = 0; i < Math.min(optionCount, 10); i++) {
        const optText = await allOptions.nth(i).textContent().catch(() => '');
        console.log(`  Option ${i + 1}: "${optText}"`);
      }
      
      throw new Error(`Could not find option "${optionText}" in dropdown for "${label}". Found ${optionCount} options.`);
    }
    
    console.log(`Found option "${optionText}", checking if already selected...`);
    await option.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    
    // Check if the option is already selected (has a tick icon)
    // First, check what's currently selected in the combobox
    const currentComboboxValue = await comboboxTrigger.textContent().catch(() => '');
    console.log(`Current combobox value for "${label}": "${currentComboboxValue}"`);
    
    // If combobox shows "Select..." it means nothing is selected, so we must click
    const needsSelection = currentComboboxValue.includes('Select') || currentComboboxValue.includes('...') || !currentComboboxValue.trim();
    
    let isSelected = false;
    
    // Only check for selection indicators if there's already a value in the combobox (not "Select...")
    if (!needsSelection && currentComboboxValue.trim()) {
      // Check if this specific option matches what's already selected
      if (currentComboboxValue.includes(optionText) || optionText.includes(currentComboboxValue.split(' ')[0])) {
        // Check for visual indicators (tick icon)
        isSelected = await option.evaluate((el) => {
          // Check for aria-selected
          if (el.getAttribute('aria-selected') === 'true') return true;
          if (el.getAttribute('data-selected') === 'true') return true;
          
          // Check for selected/checked classes (but be more specific)
          const classes = el.className || '';
          if (classes.includes('selected') || classes.includes('checked')) {
            return true;
          }
          
          // Check for checkmark icon inside - look for lucide-check or similar
          const checkIcon = el.querySelector('svg[class*="lucide-check"], svg[class*="check"], [class*="check-icon"]');
          if (checkIcon) {
            // Verify it's actually visible
            const style = window.getComputedStyle(checkIcon);
            if (style.display !== 'none' && style.visibility !== 'hidden') {
              return true;
            }
          }
          
          return false;
        }).catch(() => false);
      }
    }
    
    if (isSelected && !needsSelection) {
      console.log(`Option "${optionText}" is already selected (has tick icon), skipping click to avoid unselecting`);
      
      // Close the dropdown by clicking outside or pressing Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      
      // Verify the selection is still there
      const selectedValue = await comboboxTrigger.textContent();
      console.log(`Current selected value after escape: "${selectedValue}"`);
      
      if (selectedValue && (selectedValue.includes(optionText) || (!selectedValue.includes('Select') && !selectedValue.includes('...')))) {
        console.log(`✅ Option "${optionText}" is already selected for "${label}"`);
        return; // Exit early since it's already selected
      } else {
        // If verification failed, proceed to click anyway
        console.log(`⚠️ Verification failed, proceeding to click option anyway`);
        isSelected = false;
      }
    }
    
    // If not selected or needs selection, click to select it
    if (!isSelected || needsSelection) {
      console.log(`Clicking option "${optionText}" to select it...`);
      await option.click();
    }
    
    // Wait for the selection to be applied and popover to close
    await page.waitForTimeout(800);
    
    // Verify the selection was applied
    const selectedValue = await comboboxTrigger.textContent();
    console.log(`Selected value after click: "${selectedValue}"`);
    
    if (selectedValue && (selectedValue.includes(optionText) || (!selectedValue.includes('Select') && !selectedValue.includes('...')))) {
      console.log(`✅ Successfully selected "${optionText}" for "${label}"`);
    } else {
      console.log(`⚠️ Selection may not have worked. Current value: "${selectedValue}"`);
    }
  } catch (error) {
    console.error(`❌ Error selecting combobox option "${optionText}" for label "${label}":`, error);
    // Take a screenshot for debugging
    await page.screenshot({ path: `combobox-error-${label.replace(/\s+/g, '-')}.png` }).catch(() => {});
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
    console.log('Adding signature to message...');
    
    // Move to end of content first
    await editor.press('End');
    await page.waitForTimeout(300);
    
    // Look for signature button in the editor toolbar
    // Try multiple selectors for signature button
    const signatureButtonSelectors = [
      'button[title*="signature" i]',
      'button:has-text("Signature")',
      'button[aria-label*="signature" i]',
      '[data-tooltip*="signature" i]',
      'button svg[class*="signature"]',
      'button:has(svg) + button', // Try buttons near editor
    ];
    
    let signatureButton = null;
    for (const selector of signatureButtonSelectors) {
      signatureButton = page.locator(selector).first();
      if (await signatureButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`Found signature button with selector: ${selector}`);
        break;
      }
      signatureButton = null;
    }
    
    if (signatureButton && await signatureButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('Clicking signature button...');
      await signatureButton.click();
      await page.waitForTimeout(800);
      
      // Look for signature options in a dropdown/menu
      const signatureOptionSelectors = [
        '[role="menuitem"]:has-text("Signature")',
        'div:has-text("Signature"):visible',
        '[role="option"]:has-text("Signature")',
        'button:has-text("Signature"):visible'
      ];
      
      let signatureOption = null;
      for (const selector of signatureOptionSelectors) {
        signatureOption = page.locator(selector).first();
        if (await signatureOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log(`Found signature option with selector: ${selector}`);
          break;
        }
        signatureOption = null;
      }
      
      if (signatureOption && await signatureOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await signatureOption.click();
        await page.waitForTimeout(1000);
        console.log('✅ Signature added via button');
      } else {
        console.log('Signature option not found, trying alternative method...');
        // Fallback: try to insert signature manually
        await editor.press('End');
        await page.waitForTimeout(200);
        await editor.type('\n\n---\nTest Signature', { delay: 50 });
        await page.waitForTimeout(500);
      }
    } else {
      // If no signature button found, try to append signature text manually
      console.log('No signature button found, adding signature text manually...');
      await editor.press('End');
      await page.waitForTimeout(200);
      await editor.type('\n\n---\nTest Signature', { delay: 50 });
      await page.waitForTimeout(500);
    }
    
    // Verify signature was added by checking editor content
    const editorContent = await editor.textContent().catch(() => '');
    if (editorContent.includes('Signature') || editorContent.includes('signature')) {
      console.log('✅ Signature appears to be in editor content');
    } else {
      console.log('⚠️ Signature may not have been added, but continuing...');
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
  try {
    console.log(`Filling autocomplete "${label}" with value: "${value}"`);
    
    // Strategy 1: Find input by placeholder (most reliable)
    const placeholderMap = {
      'Contact Phone': 'Search by name or phone',
      'To Recipients': 'Type email'
    };
    const placeholder = placeholderMap[label] || label;
    
    let input = page.locator(`input[placeholder*="${placeholder}" i]`).first();
    
    // Strategy 2: Find by label if placeholder doesn't work
    if (!(await input.isVisible({ timeout: 2000 }).catch(() => false))) {
      const labelElement = page.locator(`label:has-text("${label}")`).first();
      if (await labelElement.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Find input near the label
        const labelParent = labelElement.locator('..');
        input = labelParent.locator('input').first();
        
        if (!(await input.isVisible({ timeout: 2000 }).catch(() => false))) {
          input = labelElement.locator('xpath=following::input[1]').first();
        }
      }
    }
    
    // Strategy 3: Try generic phone/email input
    if (!(await input.isVisible({ timeout: 2000 }).catch(() => false))) {
      if (label.includes('Phone')) {
        input = page.locator('input[placeholder*="phone" i]').first();
      } else if (label.includes('email') || label.includes('Recipients')) {
        input = page.locator('input[placeholder*="email" i]').first();
      }
    }
    
    await expect(input).toBeVisible({ timeout });
    await input.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    
    // Clear and fill the input
    console.log(`Clicking and filling input for "${label}"...`);
    await input.click();
    await page.waitForTimeout(200);
    
    // Clear any existing value
    await input.clear();
    await page.waitForTimeout(200);
    
    // Fill the value
    await input.fill(value);
    await page.waitForTimeout(800); // Wait for autocomplete suggestions to appear
    
    // If there's a dropdown with options, select the first one or press Enter
    const dropdownOption = page.locator('[role="option"]').first();
    if (await dropdownOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Found dropdown option, clicking...');
      await dropdownOption.click();
      await page.waitForTimeout(500);
    } else {
      // Press Enter to confirm the input
      console.log('No dropdown option found, pressing Enter...');
      await input.press('Enter');
      await page.waitForTimeout(500);
    }
    
    // Verify the value was set
    const inputValue = await input.inputValue().catch(() => '');
    console.log(`Input value after fill: "${inputValue}"`);
    
    console.log(`✅ Filled autocomplete "${label}"`);
  } catch (error) {
    console.error(`❌ Error filling autocomplete "${label}":`, error);
    await page.screenshot({ path: `autocomplete-error-${label.replace(/\s+/g, '-')}.png` }).catch(() => {});
    throw error;
  }
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
    
    // Click the "Create" button to view the ticket creation form
    // This button has data-id="Create" and contains the text "Create"
    const createButton = page.locator('button[data-id="Create"]').first();
    await expect(createButton).toBeVisible({ timeout: 10000 });
    await createButton.click();
    
    // Wait for the form to fully load after clicking Create
    await page.waitForTimeout(1000);
    
    // Verify the form is visible by checking for Subject input
    const subjectInput = page.locator('input[placeholder*="Subject" i], input[placeholder*="Enter Subject"]').first();
    await expect(subjectInput).toBeVisible({ timeout: 15000 });
  });

  test('should create a ticket with all required fields', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes - form filling + submission + redirect takes time
    // ============================================
    // IMPORTANT: Customize these values based on your actual data
    // ============================================
    const testData = {
      subject: 'Test Ticket - Automated Playwright Test',
      purpose: 'General - Customer Service', // Change to match your actual purpose options (e.g., "General - Customer Service", "Meter Reading Dispute - Customer Service")
      message: 'This is a test ticket created by Playwright automation. Please review and process accordingly.',
      assignTo: 'Reads', // Change to match actual user names in your system (can use just the name, e.g., "Reads" or full format "Reads (testreads@maxenpower.com)")
      source: 'Email', // Change to match your actual source options
      status: 'Assigned', // Change to match your actual status options
      priority: 'Medium', // Change to match your actual priority options (Low, Medium, High, etc.)
      slaType: 'Higher', // Change to match your actual SLA options
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
    
    // Navigate to Contact Info tab after SLA
    console.log('Navigating to Contact Info tab after SLA...');
    
    // Find Contact Info tab using multiple strategies
    const contactTabSelectors = [
      'button:has-text("Contact Info"):has(svg.lucide-user)',
      'button:has-text("Contact Info")',
      'button:has-text("Contact")',
      'button[type="button"]:has-text("Contact Info")'
    ];
    
    let contactTab = null;
    for (const selector of contactTabSelectors) {
      contactTab = page.locator(selector).first();
      if (await contactTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`Found Contact Info tab with selector: ${selector}`);
        break;
      }
      contactTab = null;
    }
    
    if (!contactTab) {
      throw new Error('Contact Info tab not found');
    }
    
    await expect(contactTab).toBeVisible({ timeout: 5000 });
    
    // Check if tab is already active by checking for the selected styles
    const isActive = await contactTab.evaluate((el) => {
      const classes = el.className || '';
      const bgColor = window.getComputedStyle(el).backgroundColor;
      const borderColor = window.getComputedStyle(el).borderBottomColor;
      
      // Check for active indicators
      return classes.includes('bg-[#4540a6]') || 
             classes.includes('bg-blue') ||
             el.getAttribute('aria-selected') === 'true' ||
             bgColor.includes('70') || // rgb(69, 64, 166) = #4540a6
             borderColor.includes('70');
    }).catch(() => false);
    
    if (!isActive) {
      console.log('Clicking Contact Info tab...');
      await contactTab.click();
      await page.waitForTimeout(500);
      
      // Verify tab is now active
      const isNowActive = await contactTab.evaluate((el) => {
        const classes = el.className || '';
        return classes.includes('bg-[#4540a6]') || 
               classes.includes('bg-blue') ||
               el.getAttribute('aria-selected') === 'true';
      }).catch(() => false);
      
      if (isNowActive) {
        console.log('✅ Contact Info tab is now active');
      } else {
        console.log('⚠️ Contact Info tab clicked but may not be active');
      }
    } else {
      console.log('Contact Info tab is already active');
    }
    
    // Wait for tab content to load
    await page.waitForTimeout(1500);
    
    // Wait for Contact Info fields to be visible - try multiple selectors
    console.log('Waiting for Contact Info fields...');
    const contactNameSelectors = [
      'input[placeholder*="Contact name" i]',
      'input[placeholder*="Contact Name" i]',
      'label:has-text("Contact Name") + * input',
      'label:has-text("Contact Name") ~ * input'
    ];
    
    let contactNameInput = null;
    for (const selector of contactNameSelectors) {
      contactNameInput = page.locator(selector).first();
      if (await contactNameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`Found Contact Name input with selector: ${selector}`);
        break;
      }
      contactNameInput = null;
    }
    
    if (!contactNameInput) {
      // Fallback: find by label and then input
      const contactNameLabel = page.locator('label:has-text("Contact Name")').first();
      if (await contactNameLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
        const labelParent = contactNameLabel.locator('..');
        contactNameInput = labelParent.locator('input').first();
        if (!(await contactNameInput.isVisible({ timeout: 2000 }).catch(() => false))) {
          contactNameInput = contactNameLabel.locator('xpath=following::input[1]').first();
        }
      }
    }
    
    await expect(contactNameInput).toBeVisible({ timeout: 10000 });
    
    // Fill Contact Name (required)
    console.log('Filling Contact Name...');
    await contactNameInput.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await contactNameInput.click();
    await page.waitForTimeout(200);
    await contactNameInput.fill(testData.contactName);
    await page.waitForTimeout(500);
    
    // Verify Contact Name was filled
    const contactNameValue = await contactNameInput.inputValue();
    console.log(`Contact Name value after fill: "${contactNameValue}"`);
    if (contactNameValue !== testData.contactName) {
      // Retry filling
      await contactNameInput.clear();
      await contactNameInput.fill(testData.contactName);
      await page.waitForTimeout(300);
    }
    
    // Fill Contact Phone (required) - autocomplete field
    console.log('Filling Contact Phone...');
    await fillAutoComplete(page, 'Contact Phone', testData.contactPhone);
    
    // Fill To Recipients (required) - email field
    console.log('Filling To Recipients...');
    const toRecipientsSelectors = [
      'input[placeholder*="Type email" i]',
      'input[placeholder*="email" i]',
      'label:has-text("To Recipients") + * input',
      'label:has-text("To Recipients") ~ * input'
    ];
    
    let toRecipientsInput = null;
    for (const selector of toRecipientsSelectors) {
      toRecipientsInput = page.locator(selector).first();
      if (await toRecipientsInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`Found To Recipients input with selector: ${selector}`);
        break;
      }
      toRecipientsInput = null;
    }
    
    if (!toRecipientsInput) {
      // Fallback: find by label
      const toRecipientsLabel = page.locator('label:has-text("To Recipients")').first();
      if (await toRecipientsLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
        const labelParent = toRecipientsLabel.locator('..');
        toRecipientsInput = labelParent.locator('input').first();
        if (!(await toRecipientsInput.isVisible({ timeout: 2000 }).catch(() => false))) {
          toRecipientsInput = toRecipientsLabel.locator('xpath=following::input[1]').first();
        }
      }
    }
    
    await expect(toRecipientsInput).toBeVisible({ timeout: 10000 });
    await toRecipientsInput.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    
    // Click to focus the input field
    await toRecipientsInput.click();
    await page.waitForTimeout(200);
    
    // Clear any existing value
    await toRecipientsInput.clear();
    await page.waitForTimeout(200);
    
    // Fill the email address
    console.log(`Entering email: "${testData.contactEmail}"`);
    await toRecipientsInput.fill(testData.contactEmail);
    await page.waitForTimeout(300);
    
    // Verify email was typed
    const emailValueBeforeEnter = await toRecipientsInput.inputValue().catch(() => '');
    console.log(`Email value before pressing Enter: "${emailValueBeforeEnter}"`);
    
    if (!emailValueBeforeEnter || !emailValueBeforeEnter.includes(testData.contactEmail)) {
      // Retry if email wasn't entered
      console.log('Retrying to enter email...');
      await toRecipientsInput.clear();
      await toRecipientsInput.fill(testData.contactEmail);
      await page.waitForTimeout(300);
    }
    
    // Press Enter to confirm/add the email
    console.log('Pressing Enter to confirm email entry...');
    await toRecipientsInput.press('Enter');
    await page.waitForTimeout(800); // Wait for email to be processed/added
    
    // Verify To Recipients was filled/processed
    const toRecipientsValue = await toRecipientsInput.inputValue().catch(() => '');
    console.log(`To Recipients value after pressing Enter: "${toRecipientsValue}"`);
    
    // Check if email was added (might be in a tag/chip format, so input might be cleared)
    const emailAdded = toRecipientsValue === '' || toRecipientsValue.includes(testData.contactEmail);
    if (emailAdded) {
      console.log('✅ Email entered and Enter pressed successfully');
    } else {
      console.log('⚠️ Email may not have been processed, but continuing...');
    }
    
    // Optional: Fill Reference No if visible
    console.log('Checking for Reference No field...');
    const refNoInput = page.locator('input[placeholder*="Reference number" i], input[placeholder*="Reference No"]').first();
    if (await refNoInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await refNoInput.fill(testData.referenceNo);
      console.log('Filled Reference No');
    }
    
    // Wait a moment for all fields to be processed
    await page.waitForTimeout(1000);
    
    // Find the Create button at the bottom of the form
    // Button structure: type="submit", class contains "bg-[#4540a6]", text "Create"
    console.log('Looking for Create button at the bottom of the form...');
    
    // Try multiple strategies to find the Create button
    let submitButton = null;
    
    // Strategy 1: Find by type="submit" and text
    const submitButtonSelectors = [
      'button[type="submit"]:has-text("Create")',
      'button[type="submit"]',
      'button:has-text("Create")[type="submit"]',
      'button:has-text("Create")',
      'button:has-text("Create Ticket")'
    ];
    
    for (const selector of submitButtonSelectors) {
      try {
        const buttons = page.locator(selector);
        const count = await buttons.count();
        
        for (let i = 0; i < count; i++) {
          const btn = buttons.nth(i);
          if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
            const text = await btn.textContent().catch(() => '');
            const btnType = await btn.getAttribute('type').catch(() => '');
            
            // Check if it's the Create button we want
            if ((text.includes('Create') || btnType === 'submit') && 
                !text.includes('Contact') && 
                !text.includes('Ticket') || text.trim() === 'Create') {
              submitButton = btn;
              console.log(`Found Create button with selector: ${selector} (button ${i + 1})`);
              console.log(`Button text: "${text}", type: "${btnType}"`);
              break;
            }
          }
        }
        if (submitButton) break;
      } catch (e) {
        continue;
      }
    }
    
    // Strategy 2: Find by class containing bg-[#4540a6]
    if (!submitButton) {
      console.log('Trying to find button by background color...');
      const allButtons = page.locator('button');
      const buttonCount = await allButtons.count();
      
      for (let i = 0; i < buttonCount; i++) {
        const btn = allButtons.nth(i);
        if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
          const text = await btn.textContent().catch(() => '');
          const classes = await btn.getAttribute('class').catch(() => '');
          const bgColor = await btn.evaluate((el) => {
            return window.getComputedStyle(el).backgroundColor;
          }).catch(() => '');
          
          if (text.includes('Create') && 
              (classes.includes('#4540a6') || bgColor.includes('70'))) {
            submitButton = btn;
            console.log(`Found Create button by background color (button ${i + 1})`);
            break;
          }
        }
      }
    }
    
    // Strategy 3: Find submit button at the bottom of the form
    if (!submitButton) {
      console.log('Trying to find submit button at bottom of form...');
      submitButton = page.locator('button[type="submit"]').last();
      if (!(await submitButton.isVisible({ timeout: 2000 }).catch(() => false))) {
        submitButton = null;
      }
    }
    
    if (!submitButton) {
      // Take screenshot for debugging
      await page.screenshot({ path: 'create-button-not-found.png', fullPage: true });
      throw new Error('Create button not found. Please check the selector.');
    }
    
    await expect(submitButton).toBeVisible({ timeout: 10000 });
    console.log('✅ Create button found and visible');
    
    // Scroll to button to ensure it's visible
    await submitButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
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
    
    // Click the Create button at the bottom to submit the form
    console.log('Clicking Create button to submit the ticket...');
    
    // Verify button is still visible and enabled
    const isStillVisible = await submitButton.isVisible();
    const isStillEnabled = !(await submitButton.isDisabled());
    
    console.log(`Button visible: ${isStillVisible}, enabled: ${isStillEnabled}`);
    
    if (!isStillVisible) {
      await submitButton.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
    }
    
    // Try multiple click strategies
    try {
      // Strategy 1: Regular click
      await submitButton.click({ timeout: 5000 });
      console.log('✅ Create button clicked (regular click)');
    } catch (error) {
      console.log('Regular click failed, trying force click...');
      try {
        // Strategy 2: Force click
        await submitButton.click({ force: true, timeout: 5000 });
        console.log('✅ Create button clicked (force click)');
      } catch (error2) {
        console.log('Force click failed, trying JavaScript click...');
        // Strategy 3: JavaScript click
        await submitButton.evaluate((el) => el.click());
        console.log('✅ Create button clicked (JavaScript click)');
      }
    }
    
    // Wait for redirection back to tickets manager page after ticket creation
    console.log('Waiting for redirection to tickets manager page...');
    await page.waitForURL('http://46.62.211.210:4003/dashboard/tickets-manager', { timeout: 30000 });
    console.log('✅ Redirected to tickets manager page.');

    // Wait for the "created successfully" toast to appear on the tickets manager screen
    console.log('Waiting for "created successfully" toast message...');
    await expect(page.getByText('created successfully')).toBeVisible({ timeout: 30000 });
    console.log('✅ Ticket created successfully!');
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

