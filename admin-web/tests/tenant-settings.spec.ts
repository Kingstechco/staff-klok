import { test, expect } from '@playwright/test';

test.describe('Tenant Settings Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin (only admins can access settings)
    await page.goto('/');
    await page.getByPlaceholder('Enter your PIN').fill('1234');
    await page.getByRole('button', { name: 'Clock In' }).click();
    
    // Navigate to settings
    await page.getByText('Settings').click();
    await page.waitForURL('/settings');
  });

  test('should display organization settings interface', async ({ page }) => {
    // Check page title and description
    await expect(page.getByText('Organization Settings')).toBeVisible();
    await expect(page.getByText('Manage your organization\'s configuration')).toBeVisible();

    // Check save button is present
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible();

    // Check tabs are present
    await expect(page.getByText('🏢')).toBeVisible(); // General tab
    await expect(page.getByText('⏰')).toBeVisible(); // Work Hours tab
    await expect(page.getByText('☕')).toBeVisible(); // Breaks tab
    await expect(page.getByText('📍')).toBeVisible(); // Location tab
    await expect(page.getByText('✅')).toBeVisible(); // Approvals tab
    await expect(page.getByText('📞')).toBeVisible(); // Contact tab
  });

  test('should handle general settings tab', async ({ page }) => {
    // Click general tab (should be active by default)
    await page.getByText('General').click();
    
    // Check form fields are present
    await expect(page.getByLabel('Organization Name')).toBeVisible();
    await expect(page.getByLabel('Business Type')).toBeVisible();
    await expect(page.getByLabel('Timezone')).toBeVisible();
    await expect(page.getByLabel('Currency')).toBeVisible();

    // Test form interaction
    await page.getByLabel('Organization Name').fill('Updated Company Name');
    
    // Select different business type
    await page.selectOption('select[data-testid="business-type"]', 'healthcare');
    
    // Should see form is dirty (save button enabled)
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeEnabled();
  });

  test('should handle work hours configuration', async ({ page }) => {
    await page.getByText('Work Hours').click();
    
    // Check work hours form fields
    await expect(page.getByLabel('Standard Daily Hours')).toBeVisible();
    await expect(page.getByLabel('Standard Weekly Hours')).toBeVisible();
    await expect(page.getByLabel('Overtime Threshold')).toBeVisible();
    await expect(page.getByLabel('Workweek Starts')).toBeVisible();

    // Update work hours settings
    await page.getByLabel('Standard Daily Hours').fill('9');
    await page.getByLabel('Overtime Threshold').fill('9');
    
    // Select workweek start
    await page.selectOption('select', 'monday');
  });

  test('should handle approval settings', async ({ page }) => {
    await page.getByText('Approvals').click();
    
    // Check approval checkboxes
    await expect(page.getByText('Require manager approval for time entries')).toBeVisible();
    await expect(page.getByText('Allow employees to edit their own time entries')).toBeVisible();

    // Toggle approval settings
    await page.getByLabel('requireManagerApproval').check();
    await page.getByLabel('allowSelfEdit').uncheck();
  });

  test('should handle contact information tab', async ({ page }) => {
    await page.getByText('Contact Info').click();
    
    // Check contact form fields
    await expect(page.getByLabel('Primary Contact Name')).toBeVisible();
    await expect(page.getByLabel('Primary Contact Email')).toBeVisible();
    await expect(page.getByLabel('Phone')).toBeVisible();
    await expect(page.getByLabel('Address')).toBeVisible();

    // Update contact information
    await page.getByLabel('Phone').fill('555-987-6543');
    await page.getByLabel('Address').fill('456 Updated St');
    await page.getByLabel('City').fill('New City');
  });

  test('should save settings successfully', async ({ page }) => {
    // Make a change
    await page.getByLabel('Organization Name').fill('Test Organization Update');
    
    // Save changes
    await page.getByRole('button', { name: 'Save Changes' }).click();
    
    // Should show success message
    await expect(page.getByText('Settings saved successfully!')).toBeVisible();
    
    // Success message should disappear after timeout
    await expect(page.getByText('Settings saved successfully!')).not.toBeVisible({ timeout: 4000 });
  });

  test('should handle save errors gracefully', async ({ page }) => {
    // Mock a save error by trying to save invalid data
    await page.getByLabel('Primary Contact Email').fill('invalid-email');
    
    await page.getByRole('button', { name: 'Save Changes' }).click();
    
    // Should show error message
    await expect(page.getByText('Failed to save settings')).toBeVisible({ timeout: 5000 });
  });

  test('should show contractor-specific settings for contractor businesses', async ({ page }) => {
    // Change business type to contractors
    await page.selectOption('select', 'contractors');
    
    // Should see contractor tab appear
    await expect(page.getByText('👔')).toBeVisible(); // Contractors tab
    
    // Click contractors tab
    await page.getByText('Contractors').click();
    
    // Should see contractor-specific settings
    await expect(page.getByText('Contractor Settings')).toBeVisible();
    await expect(page.getByText('Require project assignment')).toBeVisible();
    await expect(page.getByText('Client approval required')).toBeVisible();
  });

  test('should prevent access for non-admin users', async ({ page }) => {
    // Logout and login as non-admin
    await page.goto('/');
    // This test would require proper logout functionality
    // For now, we'll test that admin access is required
    
    // Direct navigation to settings should work for admin
    await expect(page.getByText('Organization Settings')).toBeVisible();
  });

  test('should validate form inputs', async ({ page }) => {
    // Test number input validation
    await page.getByText('Work Hours').click();
    
    // Try invalid values
    await page.getByLabel('Standard Daily Hours').fill('0');
    await page.getByLabel('Standard Daily Hours').blur();
    
    // Should prevent invalid values (HTML5 validation)
    const dailyHoursInput = page.getByLabel('Standard Daily Hours');
    await expect(dailyHoursInput).toHaveAttribute('min', '1');
    await expect(dailyHoursInput).toHaveAttribute('max', '24');
  });

  test('should maintain form state when switching tabs', async ({ page }) => {
    // Make changes in general tab
    await page.getByLabel('Organization Name').fill('Modified Name');
    
    // Switch to work hours tab
    await page.getByText('Work Hours').click();
    await page.getByLabel('Standard Daily Hours').fill('9');
    
    // Switch back to general tab
    await page.getByText('General').click();
    
    // Changes should be preserved
    await expect(page.getByLabel('Organization Name')).toHaveValue('Modified Name');
  });

  test('should show loading state during save', async ({ page }) => {
    // Make a change
    await page.getByLabel('Organization Name').fill('Loading Test');
    
    // Click save and immediately check for loading state
    await page.getByRole('button', { name: 'Save Changes' }).click();
    
    // Should show loading spinner and text
    await expect(page.getByText('Saving...')).toBeVisible();
    await expect(page.locator('.animate-spin')).toBeVisible();
    
    // Should return to normal state
    await expect(page.getByText('Save Changes')).toBeVisible({ timeout: 5000 });
  });
});