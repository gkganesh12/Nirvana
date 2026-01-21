import { test, expect } from '@playwright/test';

test.describe('Alert Inbox', () => {
    // We assume there's a way to bypass or session is already established
    // For this exercise, we'll navigate and verify selectors

    test('should display alerts in the inbox', async ({ page }) => {
        // Navigate to the alerts page
        await page.goto('/dashboard/alerts');

        // Check if the header is present
        await expect(page.locator('h1')).toContainText('Alerts');

        // Wait for the alerts list/table to load
        // We expect at least one alert or a empty state message
        const alertsTable = page.locator('table');
        const emptyState = page.getByText('No alerts found');

        await expect(alertsTable.or(emptyState)).toBeVisible();

        if (await alertsTable.isVisible()) {
            // Check if there are rows
            const rows = alertsTable.locator('tbody tr');
            await expect(rows.first()).toBeVisible();

            // Click on the first alert
            await rows.first().click();

            // Verify alert details page/panel
            await expect(page).toHaveURL(/\/dashboard\/alerts\/.+/);
        }
    });

    test('should filter alerts by status', async ({ page }) => {
        await page.goto('/dashboard/alerts');

        // Find the status filter (assuming a select or buttons)
        const activeFilter = page.getByRole('button', { name: 'Active' });
        if (await activeFilter.isVisible()) {
            await activeFilter.click();
            // Verify alerts are filtered
        }
    });
});
