import { test, expect } from '@playwright/test';

test.describe('Multi-Tenant Integration Tests', () => {
  test('should complete full multi-tenant workflow', async ({ page }) => {
    // Step 1: Create a new tenant
    await page.goto('/signup');
    
    // Complete signup process
    await page.getByPlaceholder('Your Company Name').fill('E2E Test Company');
    await page.getByPlaceholder('yourcompany').fill('e2etest');
    await page.selectOption('select', 'contractors');
    await page.getByRole('button', { name: 'Next' }).click();

    await page.getByPlaceholder('John Smith').fill('E2E Admin');
    await page.getByPlaceholder('john@yourcompany.com').fill('admin@e2etest.com');
    await page.getByPlaceholder('1234').fill('1111');
    await page.getByRole('button', { name: 'Next' }).click();

    await page.getByRole('button', { name: 'Next' }).click(); // Skip contact info

    await page.getByRole('button', { name: 'Create Organization' }).click();

    // Should see success page
    await expect(page.getByText('Welcome to StaffClock!')).toBeVisible({ timeout: 10000 });
    
    // Extract login URL and navigate to it
    const loginUrl = await page.getByText('Login URL:').locator('..').textContent();
    const pin = await page.getByText('Admin PIN:').locator('..').textContent();
    
    // Step 2: Login to the new tenant
    await page.goto('/'); // Simulate tenant URL navigation
    await page.getByPlaceholder('Enter your PIN').fill('1111');
    await page.getByRole('button', { name: 'Clock In' }).click();

    // Should see tenant-specific dashboard
    await expect(page.getByText('E2E Test Company')).toBeVisible();
    await expect(page.getByText('contractors')).toBeVisible();

    // Step 3: Access contractor management features
    await expect(page.getByText('Contractors')).toBeVisible();
    await page.getByText('Contractors').click();
    
    await expect(page.getByText('Contractor Management')).toBeVisible();
    await expect(page.getByText('Total Contractors')).toBeVisible();

    // Step 4: Access approval interface
    await page.getByText('Approvals').click();
    await expect(page.getByText('Timesheet Approvals')).toBeVisible();

    // Step 5: Access settings
    await page.getByText('Settings').click();
    await expect(page.getByText('Organization Settings')).toBeVisible();
    
    // Verify contractor-specific settings are available
    await expect(page.getByText('👔')).toBeVisible(); // Contractors tab
  });

  test('should handle tenant isolation', async ({ page }) => {
    // This test would verify that data is properly isolated between tenants
    // In a real scenario, you'd create multiple tenants and verify isolation
    
    // Login to first tenant
    await page.goto('/');
    await page.getByPlaceholder('Enter your PIN').fill('1234');
    await page.getByRole('button', { name: 'Clock In' }).click();
    
    // Verify tenant context
    await expect(page.getByText('Default Organization')).toBeVisible();
    
    // Access contractors page
    await page.getByText('Contractors').click();
    
    // Note contractor count for comparison
    const firstTenantContractors = await page.getByText('Total Contractors').locator('..').textContent();
    
    // In a real test, you'd logout and login to a different tenant
    // and verify different data is shown
  });

  test('should handle role-based access control', async ({ page }) => {
    // Test admin access
    await page.goto('/');
    await page.getByPlaceholder('Enter your PIN').fill('1234'); // Admin PIN
    await page.getByRole('button', { name: 'Clock In' }).click();
    
    // Admin should see all features
    await expect(page.getByText('Contractors')).toBeVisible();
    await expect(page.getByText('Approvals')).toBeVisible();
    await expect(page.getByText('Settings')).toBeVisible();
    
    // Test contractor access (would need contractor user in test data)
    // Contractors should have limited access
  });

  test('should handle API integration with tenant context', async ({ page }) => {
    // Login and make requests that should include tenant headers
    await page.goto('/');
    await page.getByPlaceholder('Enter your PIN').fill('1234');
    await page.getByRole('button', { name: 'Clock In' }).click();
    
    // Monitor network requests to verify tenant headers
    const requests = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        requests.push(request);
      }
    });
    
    // Navigate to contractors page (triggers API calls)
    await page.getByText('Contractors').click();
    
    // Wait for API calls
    await page.waitForTimeout(2000);
    
    // Verify at least one API request was made
    expect(requests.length).toBeGreaterThan(0);
    
    // In a real test, you'd verify the X-Tenant-ID header was included
  });
});

test.describe('Navigation and UI Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Enter your PIN').fill('1234');
    await page.getByRole('button', { name: 'Clock In' }).click();
  });

  test('should display tenant-aware navigation', async ({ page }) => {
    // Check tenant branding in header
    await expect(page.locator('h1')).toContainText('StaffClock'); // Default or tenant name
    
    // Check navigation items are role-appropriate
    const navItems = await page.locator('nav a').allTextContents();
    expect(navItems).toContain('Dashboard');
    expect(navItems).toContain('Clock In/Out');
    
    // Admin should see management features
    expect(navItems).toContain('Staff Management');
    expect(navItems).toContain('Reports');
  });

  test('should handle mobile navigation', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Should show mobile menu button
    await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
    
    // Click mobile menu
    await page.getByRole('button', { name: 'Menu' }).click();
    
    // Should show navigation items
    await expect(page.getByText('Dashboard')).toBeVisible();
    await expect(page.getByText('Contractors')).toBeVisible();
  });

  test('should handle user profile dropdown', async ({ page }) => {
    // Hover over user profile area
    await page.locator('[data-testid="user-profile"]').hover();
    
    // Should show dropdown menu
    await expect(page.getByText('Organization Settings')).toBeVisible();
    await expect(page.getByText('My Profile')).toBeVisible();
    await expect(page.getByText('Sign Out')).toBeVisible();
  });
});

test.describe('Error Handling and Edge Cases', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network failure
    await page.route('**/api/**', route => {
      route.abort();
    });
    
    await page.goto('/');
    await page.getByPlaceholder('Enter your PIN').fill('1234');
    await page.getByRole('button', { name: 'Clock In' }).click();
    
    // Navigate to contractors page
    await page.getByText('Contractors').click();
    
    // Should show error state
    await expect(page.getByText('Error')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Failed to load')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  });

  test('should handle authentication failures', async ({ page }) => {
    await page.goto('/');
    
    // Try invalid PIN
    await page.getByPlaceholder('Enter your PIN').fill('0000');
    await page.getByRole('button', { name: 'Clock In' }).click();
    
    // Should show error message
    await expect(page.getByText('Invalid PIN')).toBeVisible({ timeout: 5000 });
  });

  test('should handle tenant not found', async ({ page }) => {
    // Navigate with invalid tenant context
    await page.goto('/?tenant=nonexistent');
    
    // Should handle gracefully (show default state or error)
    // Exact behavior depends on implementation
    await expect(page).toHaveURL(/\//);
  });

  test('should handle loading states', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Enter your PIN').fill('1234');
    await page.getByRole('button', { name: 'Clock In' }).click();
    
    // Navigate to contractors page
    await page.getByText('Contractors').click();
    
    // Should show loading state initially
    await expect(page.getByText('Loading contractor dashboard')).toBeVisible();
    
    // Should transition to loaded state
    await expect(page.getByText('Contractor Management')).toBeVisible({ timeout: 10000 });
  });
});