const { expect } = require('@playwright/test');

/**
 * Login Page Object Model
 * Contains all selectors and methods for the login page
 */
class LoginPage {
  constructor(page) {
    this.page = page;
    // Selectors
    this.emailInput = 'input[type="email"]';
    this.passwordInput = 'input[type="password"]';
    this.loginButton = 'button:has-text("Sign In")';
    this.signInTitle = 'h1:has-text("Sign In"), h2:has-text("Sign In"), h3:has-text("Sign In"), [role="heading"]:has-text("Sign In"), text="Sign In"';
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
   */
  async goto() {
    await this.page.goto('/auth/login');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Fill in email address
   * @param {string} email - Email address to enter
   */
  async enterEmail(email) {
    await this.page.fill(this.emailInput, email);
  }

  /**
   * Fill in password
   * @param {string} password - Password to enter
   */
  async enterPassword(password) {
    await this.page.fill(this.passwordInput, password);
  }

  /**
   * Click the login button
   */
  async clickLogin() {
    await this.page.click(this.loginButton);
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
   */
  async getErrorMessage() {
    // Adjust selector based on actual error message element
    const errorElement = this.page.locator('alert, [role="alert"]').filter({ hasText: /Invalid|Error|Failed/i });
    if (await errorElement.count() > 0 && await errorElement.first().isVisible()) {
      return await errorElement.first().textContent();
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

