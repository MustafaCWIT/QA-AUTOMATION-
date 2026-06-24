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

  contactData: {
    searchTerm: 'm',
    name: 'E2E Test Contact',
    emailPrefix: 'e2e.contact',
    emailDomain: 'example.com',
    gender: 'Male',
    contactType: 'Customer',
    designation: 'Business Owner',
    method: 'SMS',
    referenceNo: 'REF-E2E-001',
    phone: '+447712345678',
    addressType: 'Home',
    addressName: 'E2E Address Contact',
    addressEmail: 'e2e.address@example.com',
    address: '123 Test Street, London, UK',
    socialPlatform: 'Fb',
    socialLink: '@e2e_test_contact',
    documentType: 'Passport',
    documentValue: 'AB1234567',
    accountNumber: '521200123456',
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
    'users123@gmail.com'
  ],

  // Dolphin AI questions to ask for each ticket (per agent)
  dolphinQuestions: [
    'Provide complete context of this ticket including customer issue, assignees, project, tasks, comments, sentiment and recommended response.',
    "What is the customer's actual complaint?",
    'Summarize this ticket.',
    'Explain the current priority of this ticket.',
    'Explain the current ticket status and next expected action.',
    'Provide complete assignee analysis.',
    'Who is actively working on this ticket?',
    'Identify delegated assignees.',
    'Identify users who only have visibility access.',
    'Which assigned users have not contributed yet?',
    'Analyze the project associated with this ticket.',
    'How does the project affect this ticket?',
    'Show all linked tasks.',
    'Show all linked subtasks.',
    'Identify dependencies affecting this ticket.',
    'Why is this ticket delayed?',
    'Summarize internal comments.',
    'Summarize all customer communications.',
    'What is the latest important update?',
    'Identify conflicting information in this ticket.',
    'Analyze customer sentiment.',
    'Is this ticket at risk of escalation?',
    'Assess urgency level.',
    'What is the root cause of the issue?',
    'What information is missing?',
    'Generate a customer response.',
    'Generate a technical response.',
    'Generate a response for an escalated customer.',
    'Generate ticket closure response.',
    'Suggest follow-up questions.',
    'Identify related tickets.',
    'Has this issue occurred before?',
    'Identify risks associated with this ticket.',
    'List all pending actions.',
    'Can this ticket be closed?',
    'Provide assignee details.',
    'Provide project details.',
    'Provide task details.',
    'Provide complete analysis.',
    'Provide complete ticket intelligence including summary, complaint, assignees, project, tasks, risks, sentiment, blockers and recommended reply.',
    'Does this ticket contains any attachments?',
    'who send the last reply to this ticket?'
  ],
};

