const { test, expect } = require('@playwright/test');
const { ChatPage } = require('../pages/ChatPage');
const fs = require('fs');
const path = require('path');

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

        // Search for the specific user dynamically and open their chat
        await chatPage.searchAndSelectUser('Amer');

        // Type and send a message to the selected user
        await chatPage.sendMessage('Hi, Amer here....');

        // Create a dummy image for testing if it doesn't exist
        const dummyImagePath = path.join(__dirname, '../utils/test-image.png');
        if (!fs.existsSync(dummyImagePath)) {
            // A 1x1 transparent PNG pixel
            const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
            fs.writeFileSync(dummyImagePath, Buffer.from(base64Data, 'base64'));
        }

        // Upload and send the image
        await chatPage.sendImage(dummyImagePath);
    });
});