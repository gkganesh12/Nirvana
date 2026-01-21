import { test, expect } from '@playwright/test';

test.describe('On-call Schedule', () => {
    test('should display the current on-call rotation', async ({ page }) => {
        await page.goto('/dashboard/on-call');

        // Check if the header is present
        await expect(page.locator('h1')).toContainText('On-call Schedule');

        // Verify the primary rotation section
        await expect(page.getByText('Primary Rotation')).toBeVisible();

        // Check if shift rows are present
        const shiftCard = page.locator('div', { hasText: 'Active' });
        await expect(shiftCard).toBeVisible();

        // Verify user name in shift
        await expect(shiftCard).toContainText(/[A-Z]/); // Contains some name
    });

    test('should show escalation policy steps', async ({ page }) => {
        await page.goto('/dashboard/on-call');

        await expect(page.getByText('Escalation Policy')).toBeVisible();
        await expect(page.getByText('Notify Primary On-call')).toBeVisible();
        await expect(page.getByText('Escalate to Admin')).toBeVisible();
    });
});
