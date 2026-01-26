# CRM Automation Testing with Playwright

This project contains automated tests for the CRM application using Playwright.

## Project Structure

```
QA_AUTOMATION/
├── pages/              # Page Object Models (POM)
│   └── LoginPage.js    # Login page object model
├── tests/              # Test files
│   └── login.spec.js   # Login page tests
├── utils/              # Utility files and helpers
│   └── test-data.js    # Test data configuration
├── playwright.config.js # Playwright configuration
├── package.json        # Project dependencies
└── README.md          # This file
```

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## Installation Steps

1. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

2. **Install Playwright browsers:**
   ```bash
   npx playwright install
   ```

   Or install specific browsers:
   ```bash
   npx playwright install chromium
   npx playwright install firefox
   npx playwright install webkit
   ```

## Running Tests

### Run all tests:
```bash
npm test
```

### Run tests in headed mode (see browser):
```bash
npm run test:headed
```

### Run tests in debug mode:
```bash
npm run test:debug
```

### Run tests with UI mode:
```bash
npm run test:ui
```

### Run only login tests:
```bash
npm run test:login
```

### View test report:
```bash
npm run report
```

## Test Configuration

The Playwright configuration is in `playwright.config.js`. Key settings:

- **Base URL**: `https://support.cwit.ae`
- **Test Directory**: `./tests`
- **Browsers**: Chromium, Firefox, WebKit
- **Screenshots**: Captured on failure
- **Videos**: Recorded on failure
- **Traces**: Collected on retry

## Page Object Model (POM)

This project uses the Page Object Model pattern for better maintainability:

- **LoginPage.js**: Contains all selectors and methods for the login page
- Each page has its own class with methods for interactions

## Test Data

Test data is stored in `utils/test-data.js`. For security:

- Never commit real credentials to version control
- Use environment variables for sensitive data:
  ```bash
  export TEST_EMAIL=your-email@example.com
  export TEST_PASSWORD=your-password
  ```

## Writing New Tests

1. Create a page object in `pages/` directory
2. Create test file in `tests/` directory
3. Import and use the page object in your tests

Example:
```javascript
const { test } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');

test('my test', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  // ... your test steps
});
```

## Troubleshooting

### Tests are failing
- Check if selectors are correct (elements may have changed)
- Verify the website is accessible
- Check browser console for errors

### Browsers not installing
- Run `npx playwright install --force`
- Check your internet connection

### Selectors not found
- Use Playwright's codegen tool to generate selectors:
  ```bash
  npx playwright codegen https://support.cwit.ae/auth/login
  ```

## Next Steps

1. Update test credentials in `utils/test-data.js` or use environment variables
2. Run the login tests to verify setup
3. Add more page objects as you expand test coverage
4. Customize selectors in `pages/LoginPage.js` if needed

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Best Practices](https://playwright.dev/docs/best-practices)

