const { expect } = require('@playwright/test');

/**
 * Chat Page Object Model
 * Contains all selectors and methods for the chat widget on the welcome/dashboard page.
 * The chat icon (message-circle-plus) appears at the bottom-right corner of the page.
 * Clicking it opens the chat panel/window.
 */
class ChatPage {
    constructor(page) {
        this.page = page;

        // Selectors
        // Chat icon button: SVG with class "lucide-message-circle-plus" wrapped in a clickable element
        // The SVG is: <svg class="lucide lucide-message-circle-plus w-8 h-8" ...>
        // Target the nearest clickable ancestor (button, a, or div) that contains this SVG
        this.chatIconButton = 'svg.lucide-message-circle-plus';
        this.chatIconButtonParent = 'button:has(svg.lucide-message-circle-plus), a:has(svg.lucide-message-circle-plus), div:has(> svg.lucide-message-circle-plus)';

        // Chat panel/window selectors (common patterns for chat widgets)
        this.chatPanel = '[data-id="chat-panel"], [data-id="chat-window"], [role="dialog"]:has-text("Chat"), .chat-panel, .chat-window';
        this.chatInput = 'textarea[placeholder*="message" i], input[placeholder*="message" i], textarea[placeholder*="type" i], input[placeholder*="type" i], [data-id="chat-input"]';
        this.chatSendButton = 'button:has-text("Send"), button[data-id="send-message"], button[type="submit"]:has(svg)';
        this.chatCloseButton = 'button:has-text("Close"), button[aria-label="Close"], button:has(svg.lucide-x)';
        this.chatMessages = '.chat-messages, .messages-container, [data-id="chat-messages"]';
    }

    /**
     * Navigate to the welcome page where the chat icon is present
     */
    async goto() {
        await this.page.goto('/dashboard/welcome', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Verify we are on the welcome page
     */
    async verifyOnWelcomePage() {
        await expect(this.page).toHaveURL(/.*dashboard\/welcome/);
    }

    /**
     * Click the chat icon button to open the chat panel
     * The icon is an SVG with class "lucide-message-circle-plus" at the bottom-right of the page
     */
    async clickChatIcon() {
        // Wait for the page to be fully loaded
        await this.page.waitForLoadState('networkidle');

        // First try: Click the parent element (button/a/div) that wraps the SVG
        let chatBtn = this.page.locator(this.chatIconButtonParent).first();
        let isVisible = await chatBtn.isVisible({ timeout: 5000 }).catch(() => false);

        if (!isVisible) {
            // Fallback: Click the SVG directly (Playwright can click SVG elements)
            chatBtn = this.page.locator(this.chatIconButton).first();
            isVisible = await chatBtn.isVisible({ timeout: 5000 }).catch(() => false);
        }

        if (!isVisible) {
            // Last fallback: Use a broader selector for any element with the message-circle-plus icon
            chatBtn = this.page.locator('[class*="message-circle-plus"], button:has(svg[class*="message-circle-plus"])').first();
        }

        // Wait for the chat icon to be visible and stable
        await chatBtn.waitFor({ state: 'visible', timeout: 15000 });

        // Scroll into view if needed (it's at the bottom-right, might need scrolling)
        await chatBtn.scrollIntoViewIfNeeded();

        // Small wait for any animations to complete
        await this.page.waitForTimeout(500);

        // Click the chat icon
        await chatBtn.click();

        // Wait for chat panel to open
        await this.page.waitForTimeout(1000);
    }

    /**
     * Verify the chat icon is visible on the page
     * @returns {Promise<boolean>} - true if chat icon is visible
     */
    async isChatIconVisible() {
        const chatBtn = this.page.locator(this.chatIconButton).first();
        return await chatBtn.isVisible({ timeout: 10000 }).catch(() => false);
    }

    /**
     * Verify the chat panel/window is open after clicking the icon
     */
    async verifyChatOpen() {
        // The chat opens inside an iframe (contains "Dolphin AI - NextGen Chat")
        // First check if the iframe itself is visible on the page
        const chatIframe = this.page.locator('iframe').first();
        const isIframeVisible = await chatIframe.isVisible({ timeout: 10000 }).catch(() => false);

        if (isIframeVisible) {
            await expect(chatIframe).toBeVisible({ timeout: 10000 });

            // Verify content inside the iframe using frameLocator
            const frame = this.page.frameLocator('iframe').first();
            // Check for "Dolphin AI - NextGen Chat" title text inside the iframe
            const chatTitle = frame.locator('text=Dolphin AI');
            await expect(chatTitle).toBeVisible({ timeout: 10000 });
            return;
        }

        // Fallback: Check for chat panel/dialog in the main page DOM
        const chatPanel = this.page.locator(this.chatPanel).first();
        const isPanelVisible = await chatPanel.isVisible({ timeout: 5000 }).catch(() => false);

        if (isPanelVisible) {
            await expect(chatPanel).toBeVisible({ timeout: 10000 });
            return;
        }

        throw new Error('Chat panel/window did not open after clicking the chat icon');
    }

    /**
     * Click on a specific user's chat from the list
     * @param {string} userName - The name of the user to click (e.g., 'Faiqa Riaz')
     */
    async clickUserChat(userName) {
        const frame = this.page.frameLocator('iframe').first();
        // Look for a button containing the exact user name text
        const userBtn = frame.locator('button').filter({ hasText: userName }).first();

        await userBtn.waitFor({ state: 'visible', timeout: 15000 });
        await expect(userBtn).toBeEnabled({ timeout: 5000 });

        // Scroll into view if needed
        await userBtn.scrollIntoViewIfNeeded();

        await userBtn.click();

        // Wait for chat to load
        await this.page.waitForTimeout(1000);
    }

    /**
     * Search for a user dynamically and then click on their chat
     * @param {string} userName - The name of the user to search and select
     */
    async searchAndSelectUser(userName) {
        const frame = this.page.frameLocator('iframe').first();

        // Locate the search input field
        const searchInput = frame.locator('input[placeholder*="Search or start a new chat"]');
        await searchInput.waitFor({ state: 'visible', timeout: 10000 });
        await expect(searchInput).toBeEnabled({ timeout: 5000 });

        // Clear and fill the search input with the username
        await searchInput.clear();
        await searchInput.fill(userName);

        // Wait a short moment for the search results to dynamically update/filter
        await this.page.waitForTimeout(1000);

        // Now click on the user's chat from the filtered list
        await this.clickUserChat(userName);
    }

    /**
     * Type a message in the chat input field
     * @param {string} message - The message to type
     */
    async typeMessage(message) {
        const frame = this.page.frameLocator('iframe').first();
        // Wait for the message input (textarea or contenteditable) to become visible
        const chatInput = frame.locator('textarea, div[contenteditable="true"]').first();
        await chatInput.waitFor({ state: 'visible', timeout: 60000 });
        await chatInput.click();
        await chatInput.fill(message);
    }

    /**
     * Click the send button to send the chat message
     */
    async clickSend() {
        const frame = this.page.frameLocator('iframe').first();
        // Uses the exact SVG path provided by the user
        const sendBtn = frame.locator('button:has(svg path[d^="M14.536"])').first();
        await sendBtn.waitFor({ state: 'visible', timeout: 10000 });
        await expect(sendBtn).toBeEnabled({ timeout: 5000 });
        await sendBtn.click();
        await this.page.waitForTimeout(100);
    }

    /**
     * Send a complete message (type + click send)
     * @param {string} message - The message to send
     */
    async sendMessage(message) {
        await this.typeMessage(message);
        await this.clickSend();
    }

    /**
     * Click the Insert Emoji button to open the emoji picker dialog
     */
    async clickEmojiPickerButton() {
        const frame = this.page.frameLocator('iframe').first();
        const emojiBtn = frame.locator('button[aria-label="Insert emoji"]').first();
        await emojiBtn.waitFor({ state: 'visible', timeout: 10000 });
        await expect(emojiBtn).toBeEnabled({ timeout: 5000 });
        await emojiBtn.click();
        await this.page.waitForTimeout(500); // small delay to let picker render
    }

    /**
     * Select a specific number of emojis from the opened emoji picker
     * @param {number} count - Number of emojis to select
     */
    async selectEmojis(count = 4) {
        const frame = this.page.frameLocator('iframe').first();

        // Locate the emoji picker container specifically, filtering out the main chat panel dialog
        const pickerContainer = frame.locator([
            '[class*="emoji-picker" i]',
            '[class*="emoji-container" i]',
            '[aria-label*="emoji" i]:not(button)',
            '[role="dialog"]:not(:has-text("Dolphin AI")):not(:has-text("Chat"))',
            '.emoji-picker',
            '.epr-main',
            'aside[class*="emoji" i]'
        ].join(', ')).first();

        // Wait for the picker container to be visible on the screen
        await pickerContainer.waitFor({ state: 'visible', timeout: 10000 });

        // Target only the button elements representing emojis inside the picker container
        const emojiButtons = pickerContainer.locator('button');

        // Wait for at least the first emoji to become visible/interactive
        await emojiButtons.first().waitFor({ state: 'visible', timeout: 5000 });

        const totalAvailable = await emojiButtons.count();
        if (totalAvailable === 0) {
            throw new Error('No emoji buttons found inside the emoji picker container.');
        }

        // Loop through and click up to the requested count
        const limit = Math.min(count, totalAvailable);
        for (let i = 0; i < limit; i++) {
            const emojiToClick = emojiButtons.nth(i);
            await emojiToClick.scrollIntoViewIfNeeded();
            await emojiToClick.click();
            await this.page.waitForTimeout(200); // Brief pause between clicks to ensure smooth typing sequence
        }
    }

    /**
     * Close the chat panel/window
     */
    async closeChat() {
        const closeBtn = this.page.locator(this.chatCloseButton).first();
        const isVisible = await closeBtn.isVisible({ timeout: 5000 }).catch(() => false);

        if (isVisible) {
            await closeBtn.click();
            await this.page.waitForTimeout(500);
        } else {
            // Try clicking the chat icon again to toggle/close
            const chatBtn = this.page.locator(this.chatIconButtonParent).first();
            if (await chatBtn.isVisible().catch(() => false)) {
                await chatBtn.click();
                await this.page.waitForTimeout(500);
            }
        }
    }

    /**
     * Click on the "Groups" tab button in the chat panel
     */
    async clickGroupsTab() {
        const frame = this.page.frameLocator('iframe').first();
        // Locate button that has text "Groups"
        const groupsBtn = frame.locator('button:has-text("Groups")').first();
        await groupsBtn.waitFor({ state: 'visible', timeout: 10000 });
        await expect(groupsBtn).toBeEnabled({ timeout: 5000 });
        await groupsBtn.click();
        await this.page.waitForTimeout(500); // Wait briefly for transition
    }

    /**
     * Click the plus icon button to create a new group/action
     */
    async clickPlusIcon() {
        const frame = this.page.frameLocator('iframe').first();
        // Target the svg with class lucide-plus or any element wrapping it
        const plusIcon = frame.locator('svg.lucide-plus, button:has(svg.lucide-plus), [class*="lucide-plus"]').first();
        await plusIcon.waitFor({ state: 'visible', timeout: 10000 });
        await plusIcon.click();
        await this.page.waitForTimeout(500);
    }

    /**
     * Enter group name inside the create group modal
     * @param {string} groupName - The name for the group
     */
    async enterGroupName(groupName) {
        const frame = this.page.frameLocator('iframe').first();
        const groupNameInput = frame.locator('input[placeholder="Enter group name..."]').first();
        await groupNameInput.waitFor({ state: 'visible', timeout: 10000 });
        await expect(groupNameInput).toBeEnabled({ timeout: 5000 });
        await groupNameInput.fill(groupName);
        await this.page.waitForTimeout(300);
    }

    /**
     * Search and select a member inside the group creation modal
     * @param {string} userName - Name of the user to select
     */
    async searchAndSelectGroupMember(userName) {
        const frame = this.page.frameLocator('iframe').first();
        const searchInput = frame.locator('input[placeholder="Search members..."]').first();
        await searchInput.waitFor({ state: 'visible', timeout: 10000 });
        await searchInput.fill(userName);
        await this.page.waitForTimeout(1000); // Wait for the list to filter

        // Locate member row button containing the user's name
        const memberRow = frame.locator('button').filter({ hasText: userName }).first();
        await memberRow.waitFor({ state: 'visible', timeout: 5000 });
        await memberRow.click();
        await this.page.waitForTimeout(300);

        // Clear the search field for the next member search
        await searchInput.clear();
        await this.page.waitForTimeout(300);
    }

    /**
     * Click the Create Group button to submit the form
     */
    async clickCreateGroupButton() {
        const frame = this.page.frameLocator('iframe').first();
        // Wait for the Create Group modal to be visible (contains a heading with text "Create Group")
        const modal = frame.locator('div[role="dialog"]:has(h2:has-text("Create Group")), div:has(h2:has-text("Create Group"))').first();
        await modal.waitFor({ state: 'visible', timeout: 15000 });
        // Locate the primary button inside the modal
        const createBtn = modal.locator('button.btn-primary:has-text("Create Group")').first();
        await createBtn.scrollIntoViewIfNeeded();
        await createBtn.waitFor({ state: 'visible', timeout: 10000 });
        await expect(createBtn).toBeEnabled({ timeout: 5000 });
        // Click the Create Group button
        await createBtn.click();
        // Wait for request processing and modal to disappear
        await modal.waitFor({ state: 'detached', timeout: 15000 });
        await this.page.waitForTimeout(500); // short pause after modal closes
    }

    /**
     * Verify the chat panel is closed
     */
    async verifyChatClosed() {
        const chatPanel = this.page.locator(this.chatPanel).first();
        await expect(chatPanel).not.toBeVisible({ timeout: 5000 });
    }
}

module.exports = { ChatPage };