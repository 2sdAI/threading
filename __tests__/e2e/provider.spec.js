// __tests__/e2e/provider.spec.js
import { test, expect } from '@playwright/test';

test.describe('Provider Management', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => indexedDB.deleteDatabase('AITeamManagerDB'));
        await page.reload();
    });

    test('should open settings modal', async ({ page }) => {
        await page.click('button:has-text("Settings")');

        await expect(page.locator('#settingsModal, #settingsView')).toBeVisible();
    });

    test('should add a new provider', async ({ page }) => {
        await page.click('button:has-text("Settings")');
        await page.click('button:has-text("Add Provider")');

        // Fill provider form
        await page.selectOption('#providerType', 'openai');
        await page.fill('#providerName', 'Test OpenAI');
        await page.fill('#providerApiKey', 'sk-test-key-12345');

        // Save
        await page.click('button:has-text("Save")');

        // Verify provider appears in list
        await expect(page.locator('.provider-list, #providersList')).toContainText('Test OpenAI');
    });

    test('should toggle provider enabled state', async ({ page }) => {
        // First add a provider
        await page.click('button:has-text("Settings")');
        await page.click('button:has-text("Add Provider")');
        await page.selectOption('#providerType', 'openai');
        await page.fill('#providerName', 'Toggle Test');
        await page.fill('#providerApiKey', 'sk-test');
        await page.click('button:has-text("Save")');

        // Find and toggle the provider
        const providerCard = page.locator('.provider-card:has-text("Toggle Test")');
        await providerCard.locator('[data-action="toggle"]').click();

        // Verify visual change
        await expect(providerCard).toHaveClass(/disabled|inactive/);
    });
});
