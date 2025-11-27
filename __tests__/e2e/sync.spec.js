// __tests__/e2e/sync.spec.js
import { test, expect } from '@playwright/test';

test.describe('Cross-Window Sync', () => {
    test('should sync chat creation between windows', async ({ browser }) => {
        // Open two pages
        const context = await browser.newContext();
        const page1 = await context.newPage();
        const page2 = await context.newPage();

        // Clear DB and load both pages
        await page1.goto('/');
        await page1.evaluate(() => indexedDB.deleteDatabase('AITeamManagerDB'));

        await page1.reload();
        await page2.goto('/');
        await page2.waitForLoadState('networkidle');

        // Create chat in page1
        await page1.click('button:has-text("New Chat")');
        await page1.waitForSelector('#chatView');

        // Wait for sync (give it a moment)
        await page2.waitForTimeout(1000);

        // Verify chat appears in page2 sidebar
        await expect(page2.locator('#sidebar-chats')).toContainText('New Chat');

        await context.close();
    });

    test('should sync messages between windows', async ({ browser }) => {
        const context = await browser.newContext();
        const page1 = await context.newPage();
        const page2 = await context.newPage();

        await page1.goto('/');
        await page1.evaluate(() => indexedDB.deleteDatabase('AITeamManagerDB'));
        await page1.reload();
        await page2.goto('/');

        // Create chat in page1
        await page1.click('button:has-text("New Chat")');
        await page1.locator('#messageInput').fill('Synced message test');
        await page1.locator('#messageInput').press('Enter');

        // Wait for sync
        await page2.waitForTimeout(1000);

        // Load the same chat in page2
        await page2.click('#sidebar-chats >> .card >> nth=0');

        // Verify message synced
        await expect(page2.locator('.message-user')).toContainText('Synced message test');

        await context.close();
    });
});
