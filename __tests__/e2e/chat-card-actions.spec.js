// __tests__/e2e/chat-card-actions.spec.js
import { test, expect } from '@playwright/test';

test.describe('Chat Card Actions', () => {

    test.beforeEach(async ({ page }) => {
        // Clear database and load page
        await page.goto('/');
        await page.evaluate(() => indexedDB.deleteDatabase('AITeamManagerDB'));
        await page.reload();
        await page.waitForLoadState('networkidle');
    });

    // ============================================
    // DELETE CHAT TESTS
    // ============================================
    test.describe('Delete Chat', () => {
        test('should show delete confirmation modal', async ({ page }) => {
            // Create a chat first
            await page.click('button:has-text("New Chat")');
            await page.waitForSelector('#chatView');

            // Hover over the chat card to reveal actions
            await page.hover('#sidebar-chats .chat-card');

            // Click delete button
            await page.click('.chat-action-btn-danger');

            // Verify confirm modal appears
            await expect(page.locator('#confirmModal')).toBeVisible();
            await expect(page.locator('#confirmModalTitle')).toHaveText('Delete Chat');
            await expect(page.locator('#confirmModalMessage')).toContainText('Are you sure');
        });

        test('should delete chat when confirmed', async ({ page }) => {
            // Create a chat
            await page.click('button:has-text("New Chat")');
            await page.waitForSelector('#chatView');

            // Get chat count before delete
            const chatsBefore = await page.locator('#sidebar-chats .chat-card').count();
            expect(chatsBefore).toBe(1);

            // Hover and click delete
            await page.hover('#sidebar-chats .chat-card');
            await page.click('.chat-action-btn-danger');

            // Confirm deletion
            await page.click('#confirmModalConfirmBtn');

            // Wait for modal to close
            await page.waitForSelector('#confirmModal', { state: 'hidden' });

            // Verify chat is deleted
            const chatsAfter = await page.locator('#sidebar-chats .chat-card').count();
            expect(chatsAfter).toBe(0);

            // Should show welcome view
            await expect(page.locator('#welcomeView')).toBeVisible();
        });

        test('should cancel delete when cancelled', async ({ page }) => {
            // Create a chat
            await page.click('button:has-text("New Chat")');
            await page.waitForSelector('#chatView');

            // Hover and click delete
            await page.hover('#sidebar-chats .chat-card');
            await page.click('.chat-action-btn-danger');

            // Cancel deletion
            await page.click('button:has-text("Cancel")');

            // Verify chat still exists
            const chats = await page.locator('#sidebar-chats .chat-card').count();
            expect(chats).toBe(1);
        });
    });

    // ============================================
    // CLONE CHAT TESTS
    // ============================================
    test.describe('Clone Chat', () => {
        test('should show clone confirmation modal', async ({ page }) => {
            // Create a chat
            await page.click('button:has-text("New Chat")');
            await page.waitForSelector('#chatView');

            // Hover over chat card
            await page.hover('#sidebar-chats .chat-card');

            // Click clone button (copy icon)
            await page.click('.chat-card-actions button[title="Clone chat"]');

            // Verify confirm modal
            await expect(page.locator('#confirmModal')).toBeVisible();
            await expect(page.locator('#confirmModalTitle')).toHaveText('Clone Chat');
        });

        test('should clone chat with messages when confirmed', async ({ page }) => {
            // Create a chat
            await page.click('button:has-text("New Chat")');
            await page.waitForSelector('#chatView');

            // Add a message (without sending to AI)
            await page.fill('#messageInput', 'Test message for cloning');

            // Get initial chat count
            const chatsBefore = await page.locator('#sidebar-chats .chat-card').count();
            expect(chatsBefore).toBe(1);

            // Hover and click clone
            await page.hover('#sidebar-chats .chat-card');
            await page.click('.chat-card-actions button[title="Clone chat"]');

            // Confirm clone
            await page.click('#confirmModalConfirmBtn');

            // Wait for modal to close
            await page.waitForSelector('#confirmModal', { state: 'hidden' });

            // Verify chat is cloned
            const chatsAfter = await page.locator('#sidebar-chats .chat-card').count();
            expect(chatsAfter).toBe(2);
        });

        test('cloned chat should have "(Copy)" suffix', async ({ page }) => {
            // Create a chat
            await page.click('button:has-text("New Chat")');
            await page.waitForSelector('#chatView');

            // Hover and clone
            await page.hover('#sidebar-chats .chat-card');
            await page.click('.chat-card-actions button[title="Clone chat"]');
            await page.click('#confirmModalConfirmBtn');

            // Wait for clone
            await page.waitForSelector('#confirmModal', { state: 'hidden' });

            // Check for "(Copy)" in title
            await expect(page.locator('#sidebar-chats .chat-card h3')).toContainText(['New Chat', 'New Chat (Copy)']);
        });
    });

    // ============================================
    // PIN/UNPIN CHAT TESTS
    // ============================================
    test.describe('Pin/Unpin Chat', () => {
        test('should pin chat when clicking pin button', async ({ page }) => {
            // Create a chat
            await page.click('button:has-text("New Chat")');
            await page.waitForSelector('#chatView');

            // Initially no pin icon visible in card content
            await expect(page.locator('#sidebar-chats .chat-card .chat-card-content i[data-lucide="pin"]')).not.toBeVisible();

            // Hover and click pin
            await page.hover('#sidebar-chats .chat-card');
            await page.click('.chat-card-actions button[title="Pin chat"]');

            // Pin icon should now be visible in card content
            await expect(page.locator('#sidebar-chats .chat-card .chat-card-content i[data-lucide="pin"]')).toBeVisible();
        });

        test('should unpin chat when clicking pin button on pinned chat', async ({ page }) => {
            // Create and pin a chat
            await page.click('button:has-text("New Chat")');
            await page.waitForSelector('#chatView');

            // Pin the chat
            await page.hover('#sidebar-chats .chat-card');
            await page.click('.chat-card-actions button[title="Pin chat"]');

            // Verify it's pinned
            await expect(page.locator('#sidebar-chats .chat-card .chat-card-content i[data-lucide="pin"]')).toBeVisible();

            // Unpin the chat
            await page.hover('#sidebar-chats .chat-card');
            await page.click('.chat-card-actions button[title="Unpin chat"]');

            // Pin icon should be hidden
            await expect(page.locator('#sidebar-chats .chat-card .chat-card-content i[data-lucide="pin"]')).not.toBeVisible();
        });

        test('pinned chats should appear first in list', async ({ page }) => {
            // Create two chats
            await page.click('button:has-text("New Chat")');
            await page.waitForSelector('#chatView');
            await page.click('button:has-text("New Chat")');

            // Wait for second chat
            await page.waitForTimeout(500);

            // Pin the second (older) chat
            const chatCards = page.locator('#sidebar-chats .chat-card');
            await chatCards.nth(1).hover();
            await chatCards.nth(1).locator('.chat-card-actions button[title="Pin chat"]').click();

            // The pinned chat should now be first
            await expect(chatCards.first().locator('.chat-card-content i[data-lucide="pin"]')).toBeVisible();
        });
    });

    // ============================================
    // ARCHIVE CHAT TESTS
    // ============================================
    test.describe('Archive Chat', () => {
        test('should show archive confirmation modal', async ({ page }) => {
            // Create a chat
            await page.click('button:has-text("New Chat")');
            await page.waitForSelector('#chatView');

            // Hover and click archive
            await page.hover('#sidebar-chats .chat-card');
            await page.click('.chat-card-actions button[title="Archive chat"]');

            // Verify confirm modal
            await expect(page.locator('#confirmModal')).toBeVisible();
            await expect(page.locator('#confirmModalTitle')).toHaveText('Archive Chat');
        });

        test('should archive chat when confirmed', async ({ page }) => {
            // Create a chat
            await page.click('button:has-text("New Chat")');
            await page.waitForSelector('#chatView');

            // Hover and archive
            await page.hover('#sidebar-chats .chat-card');
            await page.click('.chat-card-actions button[title="Archive chat"]');

            // Confirm
            await page.click('#confirmModalConfirmBtn');

            // Wait for modal to close
            await page.waitForSelector('#confirmModal', { state: 'hidden' });

            // Chat should be removed from active list (since getActiveChats filters archived)
            const activeChats = await page.locator('#sidebar-chats .chat-card').count();
            expect(activeChats).toBe(0);
        });

        test('should show welcome view when active chat is archived', async ({ page }) => {
            // Create a chat
            await page.click('button:has-text("New Chat")');
            await page.waitForSelector('#chatView');

            // Archive it
            await page.hover('#sidebar-chats .chat-card');
            await page.click('.chat-card-actions button[title="Archive chat"]');
            await page.click('#confirmModalConfirmBtn');

            // Should show welcome view
            await page.waitForSelector('#confirmModal', { state: 'hidden' });
            await expect(page.locator('#welcomeView')).toBeVisible();
        });
    });

    // ============================================
    // HOVER INTERACTION TESTS
    // ============================================
    test.describe('Hover Interactions', () => {
        test('action buttons should be visible on hover', async ({ page }) => {
            // Create a chat
            await page.click('button:has-text("New Chat")');
            await page.waitForSelector('#chatView');

            // Initially actions should be hidden (opacity 0)
            const actions = page.locator('.chat-card-actions');

            // Hover over card
            await page.hover('#sidebar-chats .chat-card');

            // Actions should now be visible
            await expect(actions).toBeVisible();
        });

        test('clicking card should navigate to chat', async ({ page }) => {
            // Create a chat
            await page.click('button:has-text("New Chat")');
            await page.waitForSelector('#chatView');

            // Navigate away
            await page.click('button:has-text("Settings")');
            await page.waitForSelector('#settingsView');

            // Click on chat card (not on actions)
            await page.click('#sidebar-chats .chat-card .chat-card-content');

            // Should show chat view
            await expect(page.locator('#chatView')).toBeVisible();
        });

        test('action button clicks should not navigate to chat', async ({ page }) => {
            // Create a chat
            await page.click('button:has-text("New Chat")');
            await page.waitForSelector('#chatView');

            // Hover and click pin (should not navigate)
            await page.hover('#sidebar-chats .chat-card');
            await page.click('.chat-card-actions button[title="Pin chat"]');

            // Modal should not appear (pin is instant)
            await expect(page.locator('#confirmModal')).not.toBeVisible();

            // Should still be in chat view
            await expect(page.locator('#chatView')).toBeVisible();
        });
    });

    // ============================================
    // NOTIFICATION TESTS
    // ============================================
    test.describe('Notifications', () => {
        test('should show success notification on delete', async ({ page }) => {
            // Create and delete a chat
            await page.click('button:has-text("New Chat")');
            await page.waitForSelector('#chatView');

            await page.hover('#sidebar-chats .chat-card');
            await page.click('.chat-action-btn-danger');
            await page.click('#confirmModalConfirmBtn');

            // Check for success notification
            await expect(page.locator('.bg-green-500')).toContainText('Chat deleted');
        });

        test('should show success notification on clone', async ({ page }) => {
            // Create and clone a chat
            await page.click('button:has-text("New Chat")');
            await page.waitForSelector('#chatView');

            await page.hover('#sidebar-chats .chat-card');
            await page.click('.chat-card-actions button[title="Clone chat"]');
            await page.click('#confirmModalConfirmBtn');

            // Check for success notification
            await expect(page.locator('.bg-green-500')).toContainText('cloned');
        });

        test('should show success notification on pin', async ({ page }) => {
            // Create and pin a chat
            await page.click('button:has-text("New Chat")');
            await page.waitForSelector('#chatView');

            await page.hover('#sidebar-chats .chat-card');
            await page.click('.chat-card-actions button[title="Pin chat"]');

            // Check for success notification
            await expect(page.locator('.bg-green-500')).toContainText('pinned');
        });
    });
});
