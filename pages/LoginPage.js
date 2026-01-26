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
    this.loginButton = 'button:has-text("Log In")';
    this.welcomeText = 'text=Welcome';
    this.signInText = 'text=Sign in to access your account';
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
    await expect(this.page.locator(this.welcomeText)).toBeVisible();
    await expect(this.page.locator(this.signInText)).toBeVisible();
    await expect(this.page.locator(this.emailInput)).toBeVisible();
    await expect(this.page.locator(this.passwordInput)).toBeVisible();
    await expect(this.page.locator(this.loginButton)).toBeVisible();
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

