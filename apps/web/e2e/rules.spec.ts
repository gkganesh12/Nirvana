import { test, expect } from '@playwright/test';

test.describe('Rule Management', () => {
    test('should allow creating a new routing rule', async ({ page }) => {
        await page.goto('/dashboard/rules');

        // Click "Create Rule" button
        const createBtn = page.getByRole('button', { name: /create rule|new rule/i });
        await expect(createBtn).toBeVisible();
        await createBtn.click();

        // Fill in the rule details
        await page.getByLabel(/name/i).fill('Test Routing Rule');

        // Select a condition (assuming a dropdown)
        const conditionSelect = page.locator('select').first();
        if (await conditionSelect.isVisible()) {
            await conditionSelect.selectOption({ label: 'Severity' });
        }

        // Submit the form
        await page.getByRole('button', { name: /save|create/i }).click();

        // Verify the rule appears in the list
        await expect(page.getByText('Test Routing Rule')).toBeVisible();
    });

    test('should allow deleting a routing rule', async ({ page }) => {
        await page.goto('/dashboard/rules');

        const ruleRow = page.locator('tr', { hasText: 'Test Routing Rule' });
        if (await ruleRow.isVisible()) {
            const deleteBtn = ruleRow.locator('button').filter({ has: page.locator('svg') }); // Assuming trash icon
            await deleteBtn.click();

            // Confirm deletion if there's a dialog
            const confirmBtn = page.getByRole('button', { name: /delete|confirm/i });
            if (await confirmBtn.isVisible()) {
                await confirmBtn.click();
            }

            await expect(page.getByText('Test Routing Rule')).not.toBeVisible();
        }
    });
});
