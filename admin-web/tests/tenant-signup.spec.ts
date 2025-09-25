import { test, expect } from '@playwright/test';

test.describe('Tenant Signup Flow', () => {
  test('should complete full tenant signup process', async ({ page }) => {
    // Navigate to signup page
    await page.goto('/signup');
    
    // Verify we're on the signup page
    await expect(page.getByText('Create Your Organization')).toBeVisible();
    await expect(page.getByText('Step 1 of 4')).toBeVisible();

    // Step 1: Organization Information
    await page.getByPlaceholder('Your Company Name').fill('Test Contractor Company');
    await page.getByPlaceholder('yourcompany').fill('testcontractor');
    await page.selectOption('[data-testid="business-type-select"]', 'contractors');
    await page.getByPlaceholder('e.g., Technology, Healthcare, Manufacturing').fill('Construction');
    
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 2: Admin User Setup
    await expect(page.getByText('Step 2 of 4')).toBeVisible();
    await page.getByPlaceholder('John Smith').fill('Test Admin');
    await page.getByPlaceholder('john@yourcompany.com').fill('admin@testcontractor.com');
    await page.getByPlaceholder('1234').fill('5678');
    await page.getByPlaceholder('+1 (555) 123-4567').fill('555-123-4567');
    
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 3: Contact Information (optional)
    await expect(page.getByText('Step 3 of 4')).toBeVisible();
    await page.getByPlaceholder('123 Business St').fill('123 Construction Ave');
    await page.getByPlaceholder('New York').fill('Chicago');
    await page.getByPlaceholder('NY').fill('IL');
    await page.getByPlaceholder('10001').fill('60601');
    
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 4: Subscription Plan
    await expect(page.getByText('Step 4 of 4')).toBeVisible();
    await expect(page.getByText('Choose Your Plan')).toBeVisible();
    
    // Select contractor plan (should be pre-selected or available)
    await page.getByText('contractor').first().click();
    
    // Submit the form
    await page.getByRole('button', { name: 'Create Organization' }).click();

    // Wait for success page
    await expect(page.getByText('Welcome to StaffClock!')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Your organization has been created successfully')).toBeVisible();
    
    // Check that setup instructions are provided
    await expect(page.getByText('Login URL:')).toBeVisible();
    await expect(page.getByText('Admin PIN:')).toBeVisible();
    await expect(page.getByText('Trial Period:')).toBeVisible();
  });

  test('should validate form fields', async ({ page }) => {
    await page.goto('/signup');

    // Try to proceed without filling required fields
    const nextButton = page.getByRole('button', { name: 'Next' });
    await expect(nextButton).toBeDisabled();

    // Fill organization name and check subdomain auto-generation
    await page.getByPlaceholder('Your Company Name').fill('My Test Company');
    await expect(page.getByPlaceholder('yourcompany')).toHaveValue('my-test-company');

    // Select business type to enable next button
    await page.selectOption('select', 'office');
    await expect(nextButton).toBeEnabled();
  });

  test('should handle invalid subdomain', async ({ page }) => {
    await page.goto('/signup');

    await page.getByPlaceholder('Your Company Name').fill('Test Company');
    await page.getByPlaceholder('yourcompany').fill('www'); // Reserved subdomain
    await page.selectOption('select', 'office');
    
    await page.getByRole('button', { name: 'Next' }).click();

    // Should show validation error
    await expect(page.getByText('reserved subdomain')).toBeVisible();
  });
});

test.describe('Multi-tenant Authentication', () => {
  test('should handle tenant-specific login', async ({ page }) => {
    // Mock a tenant context by navigating to a tenant subdomain
    // In real testing, this would be testcontractor.localhost:3000
    await page.goto('/?tenant=testcontractor');
    
    // Should show tenant-specific branding
    await expect(page.getByText('Test Contractor Company')).toBeVisible();
    
    // Login with admin PIN
    await page.getByPlaceholder('Enter your PIN').fill('5678');
    await page.getByRole('button', { name: 'Clock In' }).click();
    
    // Should redirect to tenant dashboard
    await expect(page.getByText('Test Contractor Company')).toBeVisible();
    await expect(page.getByText('contractors')).toBeVisible();
  });

  test('should show contractor navigation for eligible users', async ({ page }) => {
    // Login as admin user who can manage contractors
    await page.goto('/');
    await page.getByPlaceholder('Enter your PIN').fill('1234'); // Admin PIN
    await page.getByRole('button', { name: 'Clock In' }).click();

    // Should see contractor management in navigation
    await expect(page.getByText('Contractors')).toBeVisible();
    await expect(page.getByText('Approvals')).toBeVisible();
  });
});