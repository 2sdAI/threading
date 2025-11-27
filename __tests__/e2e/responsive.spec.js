// __tests__/e2e/responsive.spec.js
import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
    test('should show mobile sidebar toggle on small screens', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
        await page.goto('/');

        // Sidebar should be hidden by default on mobile
        const sidebar = page.locator('#sidebar');
        await expect(sidebar).not.toHaveClass(/active/);

        // Menu toggle should be visible
        await expect(page.locator('#menuToggle, [data-action="toggle-sidebar"]')).toBeVisible();
    });

    test('should toggle sidebar on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');

        // Open sidebar
        await page.click('#menuToggle, [data-action="toggle-sidebar"]');

        const sidebar = page.locator('#sidebar');
        await expect(sidebar).toHaveClass(/active/);

        // Close sidebar
        await page.click('#sidebarOverlay');
        await expect(sidebar).not.toHaveClass(/active/);
    });

    test('should display correctly on desktop', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto('/');

        // Sidebar should be visible
        await expect(page.locator('#sidebar')).toBeVisible();

        // Main content should be visible alongside
        await expect(page.locator('main, #mainContent')).toBeVisible();
    });
});
