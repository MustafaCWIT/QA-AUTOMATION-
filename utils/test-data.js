/**
 * Test Data Configuration
 * Store test credentials and other test data here
 * IMPORTANT: Never commit real credentials to version control
 */

module.exports = {

  credentials: {
    valid: {
      email: process.env.TEST_EMAIL || 'ehu@maxenpower.com',
      password: process.env.TEST_PASSWORD || 'maxen12345',
    },
    // Shared password for bulk login / ticket-replies tests
    bulkPassword: process.env.TEST_PASSWORD || 'maxen12345',
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
    projectsManager: '/dashboard/projects-manager',
  },

  // Project creation test data
  projectData: {
    title: 'E2E Test Project - Automated Playwright Test',
    description: 'This project was created by an automated Playwright test. Please review and process accordingly.',
    ownerType: 'User',
    owner: 'Mohammad Shoaib',
    template: '', // Optional - leave empty to skip
    startDate: '2026-03-06T06:00',
    dueDate: '2026-03-15T17:00',
    estimatedHours: '40',
    estimatedDays: '5',
    priority: 'High',
    status: 'To-Do',
    projectType: 'Technical - Ticket',
    reminderHours: '2',
  },

  taskData: {
    title: 'E2E Test Task - Automated Playwright Test',
    description: 'This task was created by an automated Playwright test.',
    ownerType: 'User',
    owner: 'EHU',
    taskType: 'General',
    status: 'Open',
    priority: 'High',
    startDate: '2026-03-01',
    dueDate: '2026-03-15',
    checklistItem: 'Verify all user inputs are validated',
    checklistMandatory: true,
    checklistAttachment: false,
    assigneeType: 'User',
    assigneeName: 'EHU',
  },

  chatData: {
    searchQuery: process.env.CHAT_USER_SEARCH || 'Faiqa',
    userName: process.env.CHAT_USER_NAME || 'Faiqa Riaz',
    message: process.env.CHAT_MESSAGE || 'E2E automated chat message from Playwright',
    bulkMessageCount: Number(process.env.CHAT_BULK_COUNT) || 200,
  },

  timeouts: {
    short: 2000,
    medium: 5000,
    long: 10000,
  },

  // Users for bulk login and ticket-replies tests (from login.spec.js)
  bulkLoginEmails: [
    'monitor@maxenpower.com',
    'hamza@gmail.com',
    'khurram.naveed@maxenpower.com',
    'rida.mahmood@maxenpower.com',
    'sadia.amjad@maxenpower.com',
    'hamza.sohail@maxenpower.com',
    'wajiha.javed@maxenpower.com',
    'asad.sultan@maxenpower.com',
    'fiaz.mumtaz@maxenpower.com',
    'shahroz.ali@maxenpower.com',
    'abdullah.abbas@maxenpower.com',
    'maria.riaz@maxenpower.com',
    'saqib.ali@maxenpower.com',
    'fareeha.rafaqat@maxenpower.com',
    'haseeb.paracha@maxenpower.com',
    'emaan.ali@maxenpower.com',
    'waseem.akhtar@maxenpower.com',
    'humair.lawrence@maxenpower.com',
    'umar.shaukat@maxenpower.com',
    'amina.mahnoor@maxenpower.com',
    'rashid.ali@maxenpower.com',
    'users123@gmail.com',
    'waiza.jahan@maxenpower.com',
    'amin.butt@maxenpower.com',
    'sadeeq@maxenpower.com',
    'muhammad.sufyan@maxenpower.com',
    'ehu@maxenpower.com',
    'fasih.ahmed@maxenpower.com',
    'laeba.hussain@maxenpower.com',
    'rp@maxenpower.com',
    'nouman@maxenpower.com',
    'bilal@maxenpower.com',
    'muaz.tahir@maxenpower.com',
    'candc@maxenpower.com',
  ],
};

