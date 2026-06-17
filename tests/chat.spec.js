const { test, expect } = require('@playwright/test');
const { ChatPage } = require('../pages/ChatPage');

// This test uses the saved session from auth.setup.js (storageState: '.auth/user.json')
// No need to login again — the session is already authenticated.

test.describe('Chat - Open Chat from Welcome Page', () => {

  test('should open chat by clicking chat icon on welcome page', async ({ page }) => {
    const chatPage = new ChatPage(page);

    // Navigate directly to welcome page using saved session (already logged in)
    await chatPage.goto();

    // Verify we are on the welcome page (not redirected to login)
    await chatPage.verifyOnWelcomePage();

    // Verify chat icon is visible on the page (bottom-right corner)
    const isChatVisible = await chatPage.isChatIconVisible();
    expect(isChatVisible).toBeTruthy();

    // Click the chat icon to open the chat
    await chatPage.clickChatIcon();

    // Verify chat panel/window opened successfully
    await chatPage.verifyChatOpen();
  });
});
