/**
 * Test Data Configuration
 * Store test credentials and other test data here
 * IMPORTANT: Never commit real credentials to version control
 */

module.exports = {
  // Test credentials - Update with your test account details
  credentials: {
    valid: {
      email: process.env.TEST_EMAIL || 'your-test-email@example.com',
      password: process.env.TEST_PASSWORD || 'your-test-password',
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
    baseUrl: 'https://support.cwit.ae',
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

