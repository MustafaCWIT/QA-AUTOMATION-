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

        // Search for the specific user dynamically and open their chat
        await chatPage.searchAndSelectUser('Amer');

        // Send 200 messages in bulk
        test.setTimeout(300000); // 5 minutes for bulk messaging
        for (let i = 1; i <= 200; i++) {
            await chatPage.sendMessage(`Bulk message ${i}`);
        }
    });

    test('should select multiple emojis with message and send successfully', async ({ page }) => {
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

        // Type the message in the text area
        await chatPage.typeMessage('Hello, Amer here.... ');

        // Click the emoji icon to open the emoji picker
        await chatPage.clickEmojiPickerButton();

        // Select 4 emojis
        await chatPage.selectEmojis(4);

        // Send the message by clicking the arrow (send) element
        await chatPage.clickSend();
    });

    test('should create 50 groups each with 50 members', async ({ page }) => {
        test.setTimeout(600000); // 10 minutes to allow creating many groups
        const chatPage = new ChatPage(page);

        // Navigate to welcome page using saved session
        await chatPage.goto();
        await chatPage.verifyOnWelcomePage();

        // Ensure chat icon is visible
        const isChatVisible = await chatPage.isChatIconVisible();
        expect(isChatVisible).toBeTruthy();
        await chatPage.clickChatIcon();
        await chatPage.verifyChatOpen();

        // Click Groups tab once
        await chatPage.clickGroupsTab();

        // Loop to create 100 groups
        for (let g = 0; g < 50; g++) {
            // Open create group modal
            await chatPage.clickPlusIcon();

            // Enter dynamic group name
            const groupName = `AutoGroup_${g + 1}_${Date.now()}`;
            await chatPage.enterGroupName(groupName);

            // Select first 100 members in the scrollable list without using search
            const frame = page.frameLocator('iframe').first();
            const memberButtons = frame.locator('div.max-h-52.overflow-y-auto button.w-full');
            const total = await memberButtons.count();
            const limit = Math.min(50, total);
            for (let i = 0; i < limit; i++) {
                const btn = memberButtons.nth(i);
                await btn.scrollIntoViewIfNeeded();
                await btn.click();
                await page.waitForTimeout(100); // small pause
            }

            // Click Create Group button
            await chatPage.clickCreateGroupButton();
            // Optional short wait after creation
            await page.waitForTimeout(500);
        }
    });



});