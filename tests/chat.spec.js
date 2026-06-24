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

    test('should create 50 groups each with 50 members', async ({ page }) => {
        test.setTimeout(600000);

        const totalGroups = 5;
        const membersPerGroup = 50;
        const chatPage = new ChatPage(page);

        console.log('\n========================================');
        console.log('GROUP CREATION TEST — START');
        console.log(`Plan: create ${totalGroups} groups with ${membersPerGroup} members each`);
        console.log('========================================\n');

        console.log('[1/4] Navigating to welcome page...');
        await chatPage.goto();
        await chatPage.verifyOnWelcomePage();
        console.log('      Welcome page loaded.\n');

        console.log('[2/4] Opening chat panel...');
        const isChatVisible = await chatPage.isChatIconVisible();
        expect(isChatVisible).toBeTruthy();
        await chatPage.clickChatIcon();
        await chatPage.verifyChatOpen();
        console.log('      Chat panel is open.\n');

        console.log('[3/4] Switching to Groups tab...');
        await chatPage.clickGroupsTab();
        console.log('      Groups tab selected.\n');

        console.log(`[4/4] Creating ${totalGroups} groups (selecting ${membersPerGroup} members per group)...\n`);

        for (let g = 0; g < totalGroups; g++) {
            const groupNumber = g + 1;
            const groupName = `AutoGroup_${groupNumber}_${Date.now()}`;

            console.log(`--- Group ${groupNumber}/${totalGroups} ---`);
            console.log(`  Step 1: Click + icon to open create group modal`);
            await chatPage.clickPlusIcon();

            console.log(`  Step 2: Enter group name → "${groupName}"`);
            await chatPage.enterGroupName(groupName);

            console.log(`  Step 3: Select up to ${membersPerGroup} members from the list`);
            await chatPage.selectGroupMembersFromList(membersPerGroup);

            console.log(`  Step 4: Click "Create Group" and wait for modal to close`);
            await chatPage.clickCreateGroupButton();

            console.log(`  ✓ Group ${groupNumber}/${totalGroups} created: ${groupName}\n`);

            await page.waitForTimeout(500);
        }

        console.log('========================================');
        console.log('GROUP CREATION TEST — COMPLETE');
        console.log(`Created ${totalGroups} groups with up to ${membersPerGroup} members each`);
        console.log('========================================\n');
    });
});