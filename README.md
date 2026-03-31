npm install --save-dev @playwright/test
npx playwright install
npx playwright test --grep "should login with all provided email addresses"
npx playwright test --grep "should create 1000 tickets simultaneously"
npx playwright test project-creation -g "should create a new project"
npx playwright test --grep "should create a ticket with all required fields"