const { expect } = require('@playwright/test');

/**
 * Login Page Object Model
 * Contains all selectors and methods for the login page
 */
class LoginPage {
  constructor(page) {
    this.page = page;
    // Selectors - Updated for current login page structure
    // Email field: id="email", type="email"
    this.emailInput = 'input#email, input[type="email"]';
    // Password field: id="password", type="password"
    this.passwordInput = 'input#password, input[type="password"]';
    // Login button: data-id="Log In" (most reliable), fallback to text
    this.loginButton = 'button[data-id="Log In"], button:has-text("Log In"), button:has-text("Login"), button[type="submit"]';
    // Page title/heading (may be "Sign In" or "Login")
    this.signInTitle = 'h1:has-text("Sign In"), h1:has-text("Login"), h2:has-text("Sign In"), h2:has-text("Login"), h3:has-text("Sign In"), h3:has-text("Login"), [role="heading"]:has-text("Sign In"), [role="heading"]:has-text("Login")';
    this.instructionText = 'text=Enter your credentials to access your account';
    this.emailPlaceholder = 'input[placeholder="name@company.com"]';
    this.passwordToggleIcon = '[class*="eye"], [class*="password-toggle"], button[aria-label*="password"], button[aria-label*="Password"]';
    // Left section branding elements
    this.maxenPowerLogo = '[class*="logo"], img[alt*="Maxen"], img[alt*="logo"]';
    this.maxenPowerText = 'text=MAXEN POWER';
    this.copyrightText = 'text=© 2019-2026';
    this.versionText = 'text=V1.3.3';
    this.developerText = 'text=Developed by Clear Wave Information Technology';
  }

  /**
   * Navigate to the login page
   * FIXED: Added retry logic for parallel execution - handles server overload gracefully
   * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
   */
  async goto(maxRetries = 3) {
    let lastError;
    
    // Retry logic for handling server overload during parallel execution
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Add small delay between retries to avoid overwhelming server
        if (attempt > 0) {
          const delay = attempt * 2000; // 2s, 4s, 6s delays
          await this.page.waitForTimeout(delay);
        }
        
        // Navigate with longer timeout for remote server
        await this.page.goto('/auth/login', { 
          waitUntil: 'domcontentloaded',
          timeout: 60000  // Increased timeout for parallel execution
        });
        
        // Wait a bit for any redirects to complete
        await this.page.waitForTimeout(1000);
        
        // Check if we're still on login page (not redirected)
        const currentUrl = this.page.url();
        if (currentUrl.includes('/auth/login')) {
          // Check for "Service not available" error - if present, this is a retryable error
          const serviceError = await this.page.locator('text=/Service not available|connectivity issues/i').isVisible().catch(() => false);
          if (serviceError) {
            // Service error detected - throw error to trigger retry
            throw new Error('Service not available - server connectivity issue detected');
          }
          
          // Wait for login form to be visible and functional with longer timeout
          // Check if email input is actually visible and enabled (not just present in DOM)
          const emailInput = this.page.locator('input#email, input[type="email"]').first();
          await emailInput.waitFor({ state: 'visible', timeout: 30000 });
          
          // Verify the input is actually enabled (not disabled by error state)
          const isEnabled = await emailInput.isEnabled().catch(() => false);
          if (!isEnabled) {
            throw new Error('Email input field is not enabled - page may be in error state');
          }
          
          // Wait for network (with timeout - don't wait forever)
          await Promise.race([
            this.page.waitForLoadState('networkidle'),
            new Promise(resolve => setTimeout(resolve, 15000)) // Max 15s
          ]).catch(() => {});
          
          // Double-check that error message is gone before proceeding
          const stillHasError = await this.page.locator('text=/Service not available|connectivity issues/i').isVisible().catch(() => false);
          if (stillHasError) {
            throw new Error('Service error still present after waiting - retrying...');
          }
          
          // Success - return early
          return;
        } else {
          // We were redirected (probably already logged in), that's okay
          // The caller can handle this case
          return;
        }
      } catch (error) {
        lastError = error;
        
        // Check if this is a connection error (ERR_CONNECTION_REFUSED, ERR_NETWORK_CHANGED, etc.)
        const isConnectionError = error.message.includes('ERR_CONNECTION_REFUSED') || 
                                  error.message.includes('ERR_NETWORK_CHANGED') ||
                                  error.message.includes('net::ERR') ||
                                  error.message.includes('Connection refused');
        
        // For connection errors, use longer delays between retries
        if (isConnectionError && attempt < maxRetries - 1) {
          const connectionRetryDelay = (attempt + 1) * 5000; // 5s, 10s, 15s for connection errors
          console.log(`Connection error detected, waiting ${connectionRetryDelay}ms before retry ${attempt + 2}/${maxRetries}...`);
          await this.page.waitForTimeout(connectionRetryDelay);
          continue;
        }
        
        // If this is not the last attempt, continue to retry
        if (attempt < maxRetries - 1) {
          continue;
        }
        
        // If this is the last attempt, throw the error with more context
        const errorContext = isConnectionError 
          ? `Connection refused by server - server may be overwhelmed or unavailable. Original error: ${error.message}`
          : `Failed to navigate to login page after ${maxRetries} attempts: ${error.message}`;
        throw new Error(errorContext);
      }
    }
    
    // This should never be reached, but just in case
    if (lastError) {
      throw lastError;
    }
  }

  /**
   * Fill in email address
   * @param {string} email - Email address to enter
   */
  async enterEmail(email) {
    // Ensure we're on the login page
    const currentUrl = this.page.url();
    if (!currentUrl.includes('/auth/login')) {
      // If not on login page, navigate there first
      await this.goto();
    }
    
    // Wait for page to be ready
    await this.page.waitForLoadState('domcontentloaded');
    
    // Wait for email field to be visible
    const emailField = this.page.locator(this.emailInput).first();
    await emailField.waitFor({ state: 'visible', timeout: 15000 });
    
    // Ensure field is enabled before filling
    await expect(emailField).toBeEnabled({ timeout: 5000 });
    
    // Clear any existing value and fill
    await emailField.clear();
    await emailField.fill(email);
  }

  /**
   * Fill in password
   * @param {string} password - Password to enter
   */
  async enterPassword(password) {
    // Wait for password field to be visible
    const passwordField = this.page.locator(this.passwordInput).first();
    await passwordField.waitFor({ state: 'visible', timeout: 15000 });
    
    // Ensure field is enabled before filling
    await expect(passwordField).toBeEnabled({ timeout: 5000 });
    
    // Clear any existing value and fill
    await passwordField.clear();
    await passwordField.fill(password);
  }

  /**
   * Click the login button
   * Updated to use data-id="Log In" selector
   */
  async clickLogin() {
    const loginBtn = this.page.locator(this.loginButton).first();
    await loginBtn.waitFor({ state: 'visible', timeout: 10000 });
    await expect(loginBtn).toBeEnabled({ timeout: 5000 });
    await loginBtn.click();
  }

  /**
   * Toggle password visibility
   */
  async togglePasswordVisibility() {
    await this.page.click(this.passwordToggleIcon);
  }

  /**
   * Perform complete login action
   * @param {string} email - Email address
   * @param {string} password - Password
   */
  async login(email, password) {
    await this.enterEmail(email);
    await this.enterPassword(password);
    await this.clickLogin();
  }

  /**
   * Verify login page is displayed
   */
  async verifyLoginPage() {
    // Verify right section - login form elements
    // Wait for Sign In title - try heading first, then fallback to any text that's not in a button
    const headingWithSignIn = this.page.locator('h1, h2, h3, h4, h5, h6, [role="heading"]').filter({ hasText: /Sign In/i });
    if (await headingWithSignIn.count() > 0) {
      await expect(headingWithSignIn.first()).toBeVisible({ timeout: 10000 });
    } else {
      // Fallback: any text containing "Sign In" that is NOT inside a button
      const signInText = this.page.locator('text=/Sign In/i').filter({ hasNot: this.page.locator('button') });
      await expect(signInText.first()).toBeVisible({ timeout: 10000 });
    }
    await expect(this.page.locator(this.instructionText)).toBeVisible({ timeout: 10000 });
    await expect(this.page.locator(this.emailInput)).toBeVisible({ timeout: 10000 });
    await expect(this.page.locator(this.emailPlaceholder)).toBeVisible({ timeout: 10000 });
    await expect(this.page.locator(this.passwordInput)).toBeVisible({ timeout: 10000 });
    await expect(this.page.locator(this.passwordToggleIcon).first()).toBeVisible({ timeout: 10000 });
    await expect(this.page.locator(this.loginButton)).toBeVisible({ timeout: 10000 });
  }

  /**
   * Verify left section branding elements
   */
  async verifyBrandingSection() {
    // Verify Maxen Power logo (checking for logo element or image)
    const logoExists = await this.page.locator(this.maxenPowerLogo).count() > 0;
    if (logoExists) {
      await expect(this.page.locator(this.maxenPowerLogo).first()).toBeVisible();
    }
    // Verify Maxen Power text
    await expect(this.page.locator(this.maxenPowerText)).toBeVisible();
    // Verify copyright information
    await expect(this.page.locator(this.copyrightText)).toBeVisible();
    await expect(this.page.locator(this.versionText)).toBeVisible();
    await expect(this.page.locator(this.developerText)).toBeVisible();
  }

  /**
   * Verify all login page elements including branding
   */
  async verifyCompleteLoginPage() {
    await this.verifyLoginPage();
    await this.verifyBrandingSection();
  }

  /**
   * Get error message if login fails
   * Excludes instruction text like "Enter your credentials to access your account"
   */
  async getErrorMessage() {
    // Try multiple selectors to find error messages
    // Exclude common instruction/help text that might be mistaken for errors
    const excludeText = /Enter your credentials|access your account|Please|Welcome|Sign In/i;
    
    const errorSelectors = [
      '[role="alert"]',
      '[class*="error"]:not([class*="instruction"])',
      '[class*="alert"]:not([class*="info"])',
      'text=/Invalid|Error|Failed|incorrect|wrong|denied|unauthorized|forbidden/i'
    ];
    
    for (const selector of errorSelectors) {
      try {
        const errorElement = this.page.locator(selector).filter({ 
          hasText: /Invalid|Error|Failed|incorrect|wrong|denied|unauthorized|forbidden|credentials.*invalid|password.*incorrect/i 
        });
        if (await errorElement.count() > 0) {
          const isVisible = await errorElement.first().isVisible().catch(() => false);
          if (isVisible) {
            const text = await errorElement.first().textContent();
            if (text && text.trim().length > 0) {
              // Exclude instruction text
              if (!excludeText.test(text)) {
                return text.trim();
              }
            }
          }
        }
      } catch (e) {
        // Continue to next selector
        continue;
      }
    }
    
    return null;
  }

  /**
   * Wait for successful login redirect to dashboard
   * @param {string} expectedUrl - Expected URL after login (default: dashboard/welcome)
   */
  async waitForLoginSuccess(expectedUrl = '/dashboard/welcome') {
    // Wait for either navigation to dashboard OR error message to appear
    try {
      await this.page.waitForURL(`**${expectedUrl}`, { timeout: 10000 });
    } catch (error) {
      // If navigation didn't happen, check for error message
      const errorMessage = await this.getErrorMessage();
      if (errorMessage) {
        throw new Error(`Login failed: ${errorMessage}`);
      }
      // Re-throw original timeout error if no error message found
      throw new Error(`Login did not redirect to ${expectedUrl} within timeout. Current URL: ${this.page.url()}`);
    }
  }
}

module.exports = { LoginPage };

