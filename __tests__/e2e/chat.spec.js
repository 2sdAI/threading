// __tests__/e2e/chat.spec.js
import { test, expect } from '@playwright/test';

test.describe('Chat Functionality', () => {
    test.beforeEach(async ({ page }) => {
        // Clear IndexedDB before each test
        await page.goto('/');
        await page.evaluate(() => indexedDB.deleteDatabase('AITeamManagerDB'));
        await page.reload();
        await page.waitForLoadState('networkidle');
    });

    test('should create a new chat', async ({ page }) => {
        // Click new chat button
        await page.click('button:has-text("New Chat")');

        // Wait for chat view
        await expect(page.locator('#chatView')).toBeVisible();

        // Verify chat title
        await expect(page.locator('#chatTitle')).toContainText('New Chat');

        // Verify sidebar updated
        await expect(page.locator('#sidebar-chats')).toContainText('New Chat');
    });

    test('should send and display a message', async ({ page }) => {
        // Create chat first
        await page.click('button:has-text("New Chat")');
        await page.waitForSelector('#chatView');

        // Type and send message
        const input = page.locator('#messageInput');
        await input.fill('Hello, this is a test message');
        await input.press('Enter');

        // Verify message appears
        await expect(page.locator('.message-user')).toContainText('Hello, this is a test message');
    });

    test('should persist chat after page reload', async ({ page }) => {
        // Create chat with message
        await page.click('button:has-text("New Chat")');
        await page.locator('#messageInput').fill('Persistent message');
        await page.locator('#messageInput').press('Enter');

        await expect(page.locator('.message-user')).toBeVisible();

        // Reload page
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Verify chat persisted
        await expect(page.locator('#sidebar-chats')).toContainText('Persistent message');
    });

    test('should delete a chat', async ({ page }) => {
        // Create a chat
        await page.click('button:has-text("New Chat")');
        await page.waitForSelector('#chatView');

        // Open chat settings (assuming there's a settings button)
        await page.click('[data-action="chat-settings"]');

        // Delete chat
        await page.click('button:has-text("Delete")');

        // Confirm deletion
        page.on('dialog', dialog => dialog.accept());

        // Verify chat removed from sidebar
        await expect(page.locator('#sidebar-chats')).not.toContainText('New Chat');
    });
});
