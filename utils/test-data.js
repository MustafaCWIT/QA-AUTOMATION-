/**
 * Test Data Configuration
 * Store test credentials and other test data here
 * IMPORTANT: Never commit real credentials to version control
 */

module.exports = {
  // Test credentials - Update with your test account details
  credentials: {
    valid: {
      email: process.env.TEST_EMAIL || 'testreads@maxenpower.com',
      password: process.env.TEST_PASSWORD || 'maxen12345',
    },
    invalid: {
      email: 'invalid@example.com',
      password: 'wrongpassword',
    },
    empty: {
      email: '',
      password: '',
    },
  },

  // URLs
  urls: {
    baseUrl: 'http://46.62.211.210:4003',
    loginPage: '/auth/login',
    dashboard: '/dashboard/welcome',
    ticketsManager: '/dashboard/tickets-manager',
  },

  // Timeouts (in milliseconds)
  timeouts: {
    short: 2000,
    medium: 5000,
    long: 10000,
  },
};

