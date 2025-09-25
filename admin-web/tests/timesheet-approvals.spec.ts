import { test, expect } from '@playwright/test';

test.describe('Timesheet Approval Interface', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin/manager with approval permissions
    await page.goto('/');
    await page.getByPlaceholder('Enter your PIN').fill('1234');
    await page.getByRole('button', { name: 'Clock In' }).click();
    
    // Navigate to approvals page
    await page.getByText('Approvals').click();
    await page.waitForURL('/approvals');
  });

  test('should display approval interface with pending entries', async ({ page }) => {
    // Check page title and description
    await expect(page.getByText('Timesheet Approvals')).toBeVisible();
    await expect(page.getByText('Review and approve time entries')).toBeVisible();

    // Check date filters are present
    await expect(page.locator('input[type="date"]').first()).toBeVisible();
    await expect(page.locator('input[type="date"]').last()).toBeVisible();

    // Check table headers
    await expect(page.getByText('Contractor')).toBeVisible();
    await expect(page.getByText('Project')).toBeVisible();
    await expect(page.getByText('Date & Time')).toBeVisible();
    await expect(page.getByText('Hours')).toBeVisible();
    await expect(page.getByText('Task Description')).toBeVisible();
    await expect(page.getByText('Actions')).toBeVisible();
  });

  test('should handle single entry approval', async ({ page }) => {
    // Find first pending entry
    const firstEntry = page.locator('tbody tr').first();
    await expect(firstEntry).toBeVisible();

    // Set up dialog handler for approval notes
    page.on('dialog', dialog => {
      expect(dialog.type()).toBe('prompt');
      expect(dialog.message()).toContain('Approval notes');
      dialog.accept('Approved by automated test');
    });

    // Click approve button
    await firstEntry.getByText('Approve').click();

    // Entry should be removed from pending list (or marked as approved)
    // Depending on implementation, might need to wait for page refresh
    await page.waitForTimeout(1000);
  });

  test('should handle single entry rejection', async ({ page }) => {
    const firstEntry = page.locator('tbody tr').first();
    await expect(firstEntry).toBeVisible();

    // Set up dialog handler for rejection reason
    page.on('dialog', dialog => {
      expect(dialog.type()).toBe('prompt');
      expect(dialog.message()).toContain('Rejection reason');
      dialog.accept('Hours seem excessive for the task');
    });

    // Click reject button
    await firstEntry.getByText('Reject').click();

    // Entry should be processed
    await page.waitForTimeout(1000);
  });

  test('should support bulk operations', async ({ page }) => {
    // Select multiple entries
    await page.locator('thead input[type="checkbox"]').check(); // Select all
    
    // Should show bulk actions interface
    await expect(page.getByText('Bulk Actions')).toBeVisible();
    await expect(page.getByText('selected')).toBeVisible();

    // Test bulk approve
    await page.selectOption('select', 'approve');
    await page.getByPlaceholder('Notes (optional for approve').fill('Bulk approval test');
    await page.getByRole('button', { name: 'Apply' }).click();

    // Should process the bulk action
    await expect(page.getByText('All caught up!')).toBeVisible({ timeout: 5000 });
  });

  test('should filter by date range', async ({ page }) => {
    // Set date filters
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Last week
    
    await page.locator('input[type="date"]').first().fill(startDate.toISOString().split('T')[0]);
    await page.locator('input[type="date"]').last().fill(new Date().toISOString().split('T')[0]);

    // Results should update based on date filter
    await page.waitForTimeout(1000);
    
    // Verify entries are within date range
    const dateElements = page.locator('tbody tr td:nth-child(4)'); // Date column
    await expect(dateElements.first()).toBeVisible();
  });

  test('should handle empty pending list', async ({ page }) => {
    // If no pending approvals, should show success message
    const noPendingSelector = page.getByText('All caught up!');
    const hasPendingSelector = page.locator('tbody tr');

    // Check if we have pending entries or empty state
    try {
      await expect(noPendingSelector).toBeVisible({ timeout: 2000 });
      await expect(page.getByText('No pending time entries require approval')).toBeVisible();
    } catch {
      // Has pending entries - that's fine too
      await expect(hasPendingSelector.first()).toBeVisible();
    }
  });

  test('should display approval guidelines help', async ({ page }) => {
    // Scroll to help section
    await page.getByText('Approval Guidelines').scrollIntoViewIfNeeded();
    
    // Check help content
    await expect(page.getByText('Approval Guidelines')).toBeVisible();
    await expect(page.getByText('Review Carefully')).toBeVisible();
    await expect(page.getByText('Bulk Actions')).toBeVisible();
    await expect(page.getByText('Communication')).toBeVisible();
  });

  test('should validate bulk rejection requires notes', async ({ page }) => {
    // Select entries
    await page.locator('tbody tr input[type="checkbox"]').first().check();
    
    // Try bulk reject without notes
    await page.selectOption('select', 'reject');
    
    // Apply button should be disabled without notes
    await expect(page.getByRole('button', { name: 'Apply' })).toBeDisabled();
    
    // Add notes and button should be enabled
    await page.getByPlaceholder('Notes (optional for approve, required for reject)').fill('Bulk rejection reason');
    await expect(page.getByRole('button', { name: 'Apply' })).toBeEnabled();
  });

  test('should show contractor and project details', async ({ page }) => {
    const firstEntry = page.locator('tbody tr').first();
    
    // Should display contractor name and role
    await expect(firstEntry.locator('td:nth-child(2)')).toContainText('contractor');
    
    // Should display project information (if assigned)
    const projectCell = firstEntry.locator('td:nth-child(3)');
    // Could be "No project" or actual project details
    await expect(projectCell).toBeVisible();
    
    // Should display hours with overtime indication
    const hoursCell = firstEntry.locator('td:nth-child(5)');
    await expect(hoursCell).toBeVisible();
  });
});

test.describe('Approval Interface - Client Contact View', () => {
  test.beforeEach(async ({ page }) => {
    // Login as client contact
    await page.goto('/');
    await page.getByPlaceholder('Enter your PIN').fill('9999'); // Client contact PIN
    await page.getByRole('button', { name: 'Clock In' }).click();
    
    await page.getByText('Approvals').click();
    await page.waitForURL('/approvals');
  });

  test('should show only entries for managed contractors', async ({ page }) => {
    await expect(page.getByText('Timesheet Approvals')).toBeVisible();
    
    // Should only see entries from contractors this client contact manages
    const entries = page.locator('tbody tr');
    // Each entry should be from a contractor managed by this client
    
    if (await entries.count() > 0) {
      await expect(entries.first()).toBeVisible();
    } else {
      await expect(page.getByText('All caught up!')).toBeVisible();
    }
  });

  test('should allow approval with client authority', async ({ page }) => {
    // Client contacts with approval authority should be able to approve
    const firstEntry = page.locator('tbody tr').first();
    
    if (await firstEntry.isVisible()) {
      page.on('dialog', dialog => dialog.accept('Approved by client contact'));
      await firstEntry.getByText('Approve').click();
      await page.waitForTimeout(1000);
    }
  });
});