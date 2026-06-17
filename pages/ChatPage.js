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
        const chatInput = frame.locator('textarea.mention-editor__input, textarea[placeholder="Type a message..."]').first();
        await chatInput.waitFor({ state: 'visible', timeout: 10000 });
        await expect(chatInput).toBeEnabled({ timeout: 5000 });
        await chatInput.click();
        await chatInput.fill(message);
        await this.page.waitForTimeout(300);
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
     * Upload and send an image file in the chat
     * @param {string} filePath - Path to the image file to upload
     */
    async sendImage(filePath) {
        const frame = this.page.frameLocator('iframe').first();
        
        // 1. Click the attachment '+' button using the exact SVG path
        const attachBtn = frame.locator('button:has(svg path[d^="M5 12h14"])').first();
        await attachBtn.waitFor({ state: 'visible', timeout: 10000 });
        await attachBtn.click();
        
        // 2. Click 'Photo' option and intercept the file chooser
        const photoBtn = frame.locator('button:has-text("Photo")').first();
        
        const fileChooserPromise = this.page.waitForEvent('filechooser');
        await photoBtn.click();
        const fileChooser = await fileChooserPromise;
        
        // 3. Select the file
        await fileChooser.setFiles(filePath);
        
        // 4. Wait a little bit for the image to attach/preview before sending
        await this.page.waitForTimeout(2000);
        
        // 5. Click the send button (reusing the existing clickSend method)
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