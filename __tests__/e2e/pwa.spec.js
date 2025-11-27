// __tests__/e2e/pwa.spec.js
import { test, expect } from '@playwright/test';

test.describe('PWA Functionality', () => {
    test('should register service worker', async ({ page }) => {
        await page.goto('/');

        const swRegistered = await page.evaluate(async () => {
            if (!('serviceWorker' in navigator)) return false;
            const registrations = await navigator.serviceWorker.getRegistrations();
            return registrations.length > 0;
        });

        expect(swRegistered).toBe(true);
    });

    test('should work offline after initial load', async ({ page, context }) => {
        // Load page online first
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Wait for service worker to cache assets
        await page.waitForTimeout(2000);

        // Go offline
        await context.setOffline(true);

        // Reload - should work from cache
        await page.reload();

        // Verify page still works
        await expect(page.locator('body')).toBeVisible();
        await expect(page.locator('#welcomeView, #sidebar')).toBeVisible();

        // Re-enable network
        await context.setOffline(false);
    });

    test('should have valid manifest', async ({ page }) => {
        await page.goto('/');

        const manifest = await page.evaluate(async () => {
            const link = document.querySelector('link[rel="manifest"]');
            if (!link) return null;
            const response = await fetch(link.href);
            return response.json();
        });

        expect(manifest).toBeDefined();
        expect(manifest.name).toBeDefined();
        expect(manifest.icons).toBeDefined();
        expect(manifest.start_url).toBeDefined();
    });
});
