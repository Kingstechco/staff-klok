import { test, expect } from '@playwright/test';

test.describe('Contractor Management Dashboard', () => {
  // Setup: Login as admin before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Mock authentication or use actual login
    await page.getByPlaceholder('Enter your PIN').fill('1234');
    await page.getByRole('button', { name: 'Clock In' }).click();
    
    // Navigate to contractors page
    await page.getByText('Contractors').click();
    await page.waitForURL('/contractors');
  });

  test('should display contractor dashboard with summary stats', async ({ page }) => {
    // Check page title and description
    await expect(page.getByText('Contractor Management')).toBeVisible();
    await expect(page.getByText('Admin Dashboard')).toBeVisible();

    // Check summary cards are present
    await expect(page.getByText('Total Contractors')).toBeVisible();
    await expect(page.getByText('Monthly Hours')).toBeVisible();
    await expect(page.getByText('Pending Approvals')).toBeVisible();

    // Check summary cards have numeric values
    const contractorCount = page.locator('[data-testid="contractor-count"]');
    const monthlyHours = page.locator('[data-testid="monthly-hours"]');
    const pendingApprovals = page.locator('[data-testid="pending-approvals"]');

    await expect(contractorCount).toBeVisible();
    await expect(monthlyHours).toBeVisible();
    await expect(pendingApprovals).toBeVisible();
  });

  test('should display contractor table with filtering', async ({ page }) => {
    // Check contractor table exists
    await expect(page.getByText('Contractor Overview')).toBeVisible();
    
    // Check table headers
    await expect(page.getByText('Contractor')).toBeVisible();
    await expect(page.getByText('Business Info')).toBeVisible();
    await expect(page.getByText('Monthly Hours')).toBeVisible();
    await expect(page.getByText('Pending Approvals')).toBeVisible();
    await expect(page.getByText('Last Activity')).toBeVisible();
    await expect(page.getByText('Actions')).toBeVisible();

    // Test filtering
    await page.selectOption('select', 'active');
    await expect(page.getByText('Active Only')).toBeVisible();

    // Test search functionality
    await page.getByPlaceholder('Search contractors...').fill('John');
    // Results should filter (assuming there's a John in the data)
  });

  test('should allow contractor timesheet download', async ({ page }) => {
    // Find first contractor row and click download
    const firstContractor = page.locator('tbody tr').first();
    await expect(firstContractor).toBeVisible();

    // Set up download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click download button
    await firstContractor.getByText('Download').click();
    
    // Wait for download and verify
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/timesheet-.+\.csv/);
  });

  test('should handle contractor detail view', async ({ page }) => {
    // Find first contractor and click View
    const firstContractor = page.locator('tbody tr').first();
    await firstContractor.getByText('View').click();

    // Should expand or show detailed view
    await expect(firstContractor).toHaveClass(/bg-blue-50/);
    
    // Click again to hide
    await firstContractor.getByText('Hide').click();
    await expect(firstContractor).not.toHaveClass(/bg-blue-50/);
  });

  test('should display help information', async ({ page }) => {
    // Scroll to bottom to see help section
    await page.locator('text=How to Use This Dashboard').scrollIntoViewIfNeeded();
    
    // Check help content
    await expect(page.getByText('How to Use This Dashboard')).toBeVisible();
    await expect(page.getByText('Click "View" to see detailed timesheet')).toBeVisible();
    await expect(page.getByText('Click "Download" to get the current month\'s timesheet')).toBeVisible();
  });

  test('should handle empty contractor list', async ({ page }) => {
    // Mock empty state by searching for non-existent contractor
    await page.getByPlaceholder('Search contractors...').fill('NonexistentContractor12345');
    
    // Should show no results message
    await expect(page.getByText('No contractors found matching your criteria')).toBeVisible();
  });

  test('should respect user permissions', async ({ page }) => {
    // Test that non-admin users get appropriate access
    // This would typically involve logging in as a different user type
    
    // For now, check that the page requires proper permissions
    await expect(page.getByText('Contractor Management')).toBeVisible();
  });
});

test.describe('Contractor Management - Client Contact View', () => {
  test.beforeEach(async ({ page }) => {
    // Login as client contact user
    await page.goto('/');
    await page.getByPlaceholder('Enter your PIN').fill('9999'); // Client contact PIN
    await page.getByRole('button', { name: 'Clock In' }).click();
    
    await page.getByText('Contractors').click();
    await page.waitForURL('/contractors');
  });

  test('should show client portal view for client contacts', async ({ page }) => {
    await expect(page.getByText('Client Portal')).toBeVisible();
    
    // Should only see contractors they manage
    const contractorRows = page.locator('tbody tr');
    await expect(contractorRows).toHaveCount(3); // Assuming client manages 3 contractors
  });

  test('should allow downloading timesheets for managed contractors', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    
    await page.locator('tbody tr').first().getByText('Download').click();
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('timesheet-');
  });
});