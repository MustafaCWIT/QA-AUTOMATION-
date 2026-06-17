npm install --save-dev @playwright/test
npx playwright install
npx playwright test --grep "should login with all provided email addresses"
npx playwright test --grep "should create 1000 tickets simultaneously"
npx playwright test project-creation -g "should create a new project"
npx playwright test --grep "should create a ticket with all required fields"

npx playwright test tests/project-creation.spec.js -g "should create 100 tasks under one project"
 npx playwright test tests/ticket-creation.spec.js -g "should create 1000 tickets simultaneously"
 npx playwright test tests/project-creation.spec.js -g "should create 100 projects under one test"
 npx playwright test tests/project-creation.spec.js -g "should create task under project" 
 npx playwright test tests/task-creation.spec.js -g "should create 100 tasks"
  npx playwright test tests/task-creation.spec.js -g "should create a new task with all details, checklist, and assignees"
  npx playwright test tests/ticket-creation.spec.js -g "should create a ticket with all required fields"    


  npx playwright test tests/chat.spec.js -g "should select a user"

  $env:CHAT_USER_SEARCH="Aamir"; $env:CHAT_USER_NAME="Aamir Mir (M)"; npx playwright test tests/chat.spec.js -g "search and select"
