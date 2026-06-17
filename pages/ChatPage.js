const { expect } = require('@playwright/test');

/**
 * Escape special regex characters in user display names (e.g. "Aamir Mir (M)")
 * @param {string} value
 */
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
        this.chatMessageInput = 'textarea.mention-editor__input, textarea[placeholder="Type a message..."]';
        this.chatSendButton = 'button.btn-primary:has(svg.lucide-send), button:has(svg.lucide-send)';
        this.chatConversationArea = 'div.chat-bg-pattern';
        this.chatMessageBubble = '[data-message-id]';
        this.chatCloseButton = 'button:has-text("Close"), button[aria-label="Close"], button:has(svg.lucide-x)';

        // Chat list (inside iframe) — search, filters, and user cards
        this.chatSearchInput = 'input[placeholder="Search or start a new chat"]';
        this.chatRecentSection = 'div.uppercase:has-text("Recent")';
        this.chatUserCardButton = 'button:has(span.font-medium):has(svg.lucide-user)';
        this.chatFilterBar = '.overflow-x-auto.scrollbar-hide';
        this.chatUserCard = (userName) => `button:has(span.font-medium:text("${userName}"))`;
    }

    /**
     * Locate a visible user card button by display name inside the chat iframe.
     * Scoped to chat rows (user icon) and filters out hidden duplicates still in the DOM.
     * @param {import('@playwright/test').FrameLocator} frame
     * @param {string} userName
     */
    getUserCardLocator(frame, userName) {
        const namePattern = new RegExp(escapeRegExp(userName), 'i');

        return frame
            .locator('button:has(svg.lucide-user)')
            .filter({
                has: frame.locator('span.font-medium', { hasText: namePattern }),
            })
            .filter({ visible: true });
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
     * Wait for the chat list screen to be ready (search bar visible)
     * @param {{ requireRecent?: boolean }} [options] - When true, also wait for Recent section + user cards
     */
    async waitForChatList({ requireRecent = false } = {}) {
        const frame = this.getChatFrame();
        await expect(frame.locator(this.chatSearchInput)).toBeVisible({ timeout: 15000 });

        if (requireRecent) {
            await expect(frame.locator(this.chatRecentSection)).toBeVisible({ timeout: 15000 });
            await expect(frame.locator(this.chatUserCardButton).first()).toBeVisible({ timeout: 15000 });
        }
    }

    /**
     * Search for a user or chat in the search bar
     * @param {string} searchText - Text to search for
     */
    async searchChat(searchText) {
        const frame = this.getChatFrame();
        const searchInput = frame.locator(this.chatSearchInput);
        await searchInput.waitFor({ state: 'visible', timeout: 10000 });
        await searchInput.click();
        await searchInput.fill('');
        await searchInput.pressSequentially(searchText, { delay: 30 });
        await this.page.waitForTimeout(1200);
    }

    /**
     * Wait for a user card matching the given name to appear in search/list results
     * @param {string} userName - Display name (or partial match) on the user card
     */
    async waitForSearchResults(userName) {
        const frame = this.getChatFrame();
        const userCard = this.getUserCardLocator(frame, userName).first();
        await userCard.waitFor({ state: 'visible', timeout: 20000 });
        await userCard.scrollIntoViewIfNeeded();
        await expect(userCard).toBeVisible({ timeout: 5000 });
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

        await userCard.waitFor({ state: 'visible', timeout: 20000 });
        await userCard.scrollIntoViewIfNeeded();
        await expect(userCard).toBeEnabled({ timeout: 5000 });

        await userCard.click({ timeout: 10000 });

        try {
            await this.waitForConversationView();
        } catch {
            await userCard.click({ force: true });
            await this.waitForConversationView();
        }
    }

    /**
     * Search in the chat bar, then click a user from the filtered results
     * @param {string} searchQuery - Text to type in the search bar
     * @param {string} [userName] - Display name to click (defaults to searchQuery for partial match)
     */
    async searchAndSelectUser(searchQuery, userName = searchQuery) {
        await this.waitForChatList();
        await this.searchChat(searchQuery);
        await this.waitForSearchResults(userName);
        await this.clickUserCard(userName);
    }

    /**
     * Open a user's chat — searches by default; pass search: false to click from Recent list
     * @param {string} userName - Display name on the user card to click
     * @param {{ search?: boolean, searchQuery?: string }} [options]
     */
    async selectUser(userName, { search = true, searchQuery = userName } = {}) {
        if (search) {
            await this.searchAndSelectUser(searchQuery, userName);
            return;
        }

        await this.waitForChatList({ requireRecent: true });
        await this.clickUserCard(userName);
    }

    /**
     * Verify a specific user's conversation is open (message composer visible)
     * @param {string} userName - Display name of the user whose chat should be open
     */
    async verifyUserChatOpen(userName) {
        await this.waitForConversationView();

        const frame = this.getChatFrame();
        const chatHeader = frame.locator(
            `header span.font-medium:has-text("${userName}"), header span.font-semibold:has-text("${userName}"), h1:has-text("${userName}"), h2:has-text("${userName}"), h3:has-text("${userName}")`,
        ).first();
        const headerVisible = await chatHeader.isVisible({ timeout: 5000 }).catch(() => false);

        if (headerVisible) {
            await expect(chatHeader).toBeVisible({ timeout: 15000 });
            return;
        }

        await expect(frame.locator(`span.font-medium:has-text("${userName}")`).first()).toBeVisible({ timeout: 15000 });
    }

    /**
     * Wait for the conversation view (message thread + composer) after selecting a user
     */
    async waitForConversationView() {
        const frame = this.getChatFrame();
        await expect(frame.locator(this.chatMessageInput)).toBeVisible({ timeout: 15000 });
    }

    /**
     * Type a message in the conversation composer
     * @param {string} message - The message to type
     */
    async typeMessage(message) {
        const frame = this.getChatFrame();
        const input = frame.locator(this.chatMessageInput).first();
        await input.waitFor({ state: 'visible', timeout: 15000 });
        await input.click();
        await input.fill(message);
        await expect(frame.locator(this.chatSendButton).first()).toBeVisible({ timeout: 10000 });
    }

    /**
     * Click the send button (appears after typing a message)
     */
    async clickSend() {
        const frame = this.getChatFrame();
        const sendBtn = frame.locator(this.chatSendButton).first();
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
     * Send multiple messages with numbered bodies: "1", "2", "3", ...
     * @param {number} count - How many messages to send
     * @param {{ startAt?: number, logEvery?: number }} [options]
     */
    async sendBulkMessages(count, { startAt = 1, logEvery = 10 } = {}) {
        for (let i = 0; i < count; i++) {
            const messageNumber = startAt + i;
            const body = String(messageNumber);
            await this.sendMessage(body);

            if (logEvery > 0 && (i + 1) % logEvery === 0) {
                console.log(`Sent ${i + 1}/${count} — message body: ${body}`);
            }
        }

        console.log(`Bulk send complete: ${count} messages (${startAt} to ${startAt + count - 1})`);
    }

    /**
     * Verify a sent message appears in the conversation thread
     * @param {string} message - Message text to verify
     */
    async verifyMessageSent(message) {
        const frame = this.getChatFrame();
        const messageBubble = frame.locator(this.chatMessageBubble).filter({
            has: frame.locator('.whitespace-pre-wrap', { hasText: message }),
        }).last();
        await expect(messageBubble).toBeVisible({ timeout: 15000 });
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