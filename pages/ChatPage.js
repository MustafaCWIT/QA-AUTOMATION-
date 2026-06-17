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

        // Chat list (inside iframe) — search, filters, and user cards
        this.chatSearchInput = 'input[placeholder="Search or start a new chat"]';
        this.chatRecentSection = 'div.uppercase:has-text("Recent")';
        this.chatUserCardButton = 'button:has(span.font-medium):has(svg.lucide-user)';
        this.chatFilterBar = '.overflow-x-auto.scrollbar-hide';
        this.chatUserCard = (userName) => `button:has(span.font-medium:text("${userName}"))`;
    }

    /**
     * Locate a user card button by display name inside the chat iframe
     * @param {import('@playwright/test').FrameLocator} frame
     * @param {string} userName
     */
    getUserCardLocator(frame, userName) {
        return frame.locator('button').filter({
            has: frame.locator('span.font-medium', { hasText: userName }),
        });
    }

    /**
     * Get the chat iframe frameLocator (chat UI loads inside an iframe)
     * @returns {import('@playwright/test').FrameLocator}
     */
    getChatFrame() {
        return this.page.frameLocator('iframe').first();
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
     * Wait for the chat list screen (search bar + Recent section + user cards)
     */
    async waitForChatList() {
        const frame = this.getChatFrame();
        await expect(frame.locator(this.chatSearchInput)).toBeVisible({ timeout: 15000 });
        await expect(frame.locator(this.chatRecentSection)).toBeVisible({ timeout: 15000 });
        await expect(frame.locator(this.chatUserCardButton).first()).toBeVisible({ timeout: 15000 });
    }

    /**
     * Search for a user or chat in the search bar
     * @param {string} searchText - Text to search for
     */
    async searchChat(searchText) {
        const frame = this.getChatFrame();
        const searchInput = frame.locator(this.chatSearchInput);
        await searchInput.waitFor({ state: 'visible', timeout: 10000 });
        await searchInput.fill(searchText);
        await this.page.waitForTimeout(500);
    }

    /**
     * Click a quick filter tab (All, Unread, Groups, Customers)
     * @param {'All' | 'Unread' | 'Groups' | 'Customers'} filterName
     */
    async selectChatFilter(filterName) {
        const frame = this.getChatFrame();
        const filterBtn = frame
            .locator(this.chatFilterBar)
            .getByRole('button', { name: filterName, exact: true });
        await filterBtn.waitFor({ state: 'visible', timeout: 10000 });
        await filterBtn.click();
        await this.page.waitForTimeout(500);
    }

    /**
     * Click a user card in the chat list to open their conversation
     * @param {string} userName - Display name shown on the user card (e.g. "Aamir Mir (M)")
     */
    async clickUserCard(userName) {
        const frame = this.getChatFrame();
        const userCard = this.getUserCardLocator(frame, userName).first();
        await userCard.waitFor({ state: 'visible', timeout: 15000 });
        await userCard.scrollIntoViewIfNeeded();
        await userCard.click();
        await this.page.waitForTimeout(1000);
    }

    /**
     * Search for a user (optional) and open their chat
     * @param {string} userName - Display name on the user card
     * @param {{ search?: boolean }} [options]
     */
    async selectUser(userName, { search = false } = {}) {
        await this.waitForChatList();

        if (search) {
            await this.searchChat(userName);
        }

        await this.clickUserCard(userName);
    }

    /**
     * Verify a specific user's conversation is open
     * @param {string} userName - Display name of the user whose chat should be open
     */
    async verifyUserChatOpen(userName) {
        const frame = this.getChatFrame();
        const chatHeader = frame.locator(`span.font-medium:has-text("${userName}"), h1:has-text("${userName}"), h2:has-text("${userName}"), h3:has-text("${userName}")`).first();
        await expect(chatHeader).toBeVisible({ timeout: 15000 });
    }

    /**
     * Type a message in the chat input field
     * @param {string} message - The message to type
     */
    async typeMessage(message) {
        const frame = this.getChatFrame();
        const chatInput = frame.locator(this.chatInput).first();
        const isInFrame = await chatInput.isVisible({ timeout: 3000 }).catch(() => false);

        const input = isInFrame
            ? chatInput
            : this.page.locator(this.chatInput).first();

        await input.waitFor({ state: 'visible', timeout: 10000 });
        await expect(input).toBeEnabled({ timeout: 5000 });
        await input.fill(message);
        await this.page.waitForTimeout(300);
    }

    /**
     * Click the send button to send the chat message
     */
    async clickSend() {
        const frame = this.getChatFrame();
        const frameSendBtn = frame.locator(this.chatSendButton).first();
        const isInFrame = await frameSendBtn.isVisible({ timeout: 3000 }).catch(() => false);

        const sendBtn = isInFrame
            ? frameSendBtn
            : this.page.locator(this.chatSendButton).first();

        await sendBtn.waitFor({ state: 'visible', timeout: 10000 });
        await expect(sendBtn).toBeEnabled({ timeout: 5000 });
        await sendBtn.click();
        await this.page.waitForTimeout(500);
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
     * Verify the chat panel is closed
     */
    async verifyChatClosed() {
        const chatPanel = this.page.locator(this.chatPanel).first();
        await expect(chatPanel).not.toBeVisible({ timeout: 5000 });
    }
}

module.exports = { ChatPage };