const { test, expect } = require('@playwright/test');
const { ChatPage } = require('../pages/ChatPage');
const testData = require('../utils/test-data');

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

    test('should search, select a user, and send a message', async ({ page }) => {
        const chatPage = new ChatPage(page);
        const { searchQuery, userName, message } = testData.chatData;

        await chatPage.goto();
        await chatPage.verifyOnWelcomePage();
        await chatPage.clickChatIcon();
        await chatPage.verifyChatOpen();

        await chatPage.searchAndSelectUser(searchQuery, userName);
        await chatPage.verifyUserChatOpen(userName);

        await chatPage.sendMessage(message);
        await chatPage.verifyMessageSent(message);
    });

    test('should send bulk numbered messages to a user', async ({ page }) => {
        test.setTimeout(900000);

        const chatPage = new ChatPage(page);
        const { searchQuery, userName, bulkMessageCount } = testData.chatData;

        await chatPage.goto();
        await chatPage.verifyOnWelcomePage();
        await chatPage.clickChatIcon();
        await chatPage.verifyChatOpen();

        await chatPage.searchAndSelectUser(searchQuery, userName);
        await chatPage.verifyUserChatOpen(userName);

        await chatPage.sendBulkMessages(bulkMessageCount);
        await chatPage.verifyMessageSent(String(bulkMessageCount));
    });
});