import { test, expect } from '@playwright/test';

test.describe('Oklok Enhanced Features', () => {
  test.describe('Role-Based Dashboard Access', () => {
    test('should show admin dashboard with organization-wide data', async ({ page }) => {
      await page.goto('/');
      
      // Should require authentication first
      await expect(page.getByText('Please sign in')).toBeVisible();
      
      // Mock authentication as admin user
      await page.evaluate(() => {
        localStorage.setItem('token', 'mock-admin-token');
      });
      
      await page.reload();
      
      // Should show admin dashboard with org-wide data
      await expect(page.getByText(/Good (morning|afternoon|evening), admin/)).toBeVisible();
      
      // Should show Staff Overview action (only for admin/manager)
      await expect(page.getByText('Staff Overview')).toBeVisible();
      await expect(page.getByText('View and manage all staff')).toBeVisible();
      
      // Should show organization metrics
      await expect(page.getByText('Active Staff')).toBeVisible();
      await expect(page.getByText('Today Hours')).toBeVisible();
      await expect(page.getByText('Pending Approvals')).toBeVisible();
    });

    test('should show staff personal dashboard only', async ({ page }) => {
      await page.goto('/');
      
      // Mock authentication as staff user
      await page.evaluate(() => {
        localStorage.setItem('token', 'mock-staff-token');
        localStorage.setItem('user', JSON.stringify({
          id: 'staff123',
          role: 'staff',
          name: 'John Doe',
          email: 'john@oklok.com'
        }));
      });
      
      await page.reload();
      
      // Should show personalized greeting
      await expect(page.getByText(/Good (morning|afternoon|evening), John Doe/)).toBeVisible();
      
      // Should NOT show Staff Overview (admin/manager only)
      await expect(page.getByText('Staff Overview')).not.toBeVisible();
      
      // Should show personal metrics only
      await expect(page.getByText('Today Hours')).toBeVisible();
      await expect(page.getByText('Weekly Hours')).toBeVisible();
      await expect(page.getByText('Current Status')).toBeVisible();
    });
  });

  test.describe('Clock-In Authentication & Validation', () => {
    test('should require PIN authentication for clock-in', async ({ page }) => {
      await page.goto('/clockin');
      
      // Should show login form, not clock-in interface
      await expect(page.getByText('Staff Clock-In')).toBeVisible();
      await expect(page.getByText('Enter your staff ID to continue')).toBeVisible();
      await expect(page.getByPlaceholder('••••')).toBeVisible();
    });

    test('should show clock-out confirmation dialog', async ({ page }) => {
      // Mock authenticated user who is clocked in
      await page.goto('/clockin');
      
      // Login first
      await page.getByPlaceholder('••••').fill('1234');
      await page.getByRole('button', { name: 'Sign In' }).click();
      
      // Mock current entry (user is clocked in)
      await page.evaluate(() => {
        // Mock TimeTrackingContext to show user as clocked in
        window.mockCurrentEntry = {
          clockIn: new Date().toISOString(),
          status: 'active'
        };
      });
      
      await page.reload();
      
      // Click clock out button
      const clockOutButton = page.getByRole('button', { name: 'Clock Out' });
      await clockOutButton.click();
      
      // Should show confirmation dialog
      await expect(page.getByText('Confirm Clock Out')).toBeVisible();
      await expect(page.getByText('Are you sure you want to clock out?')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Clock Out' })).toBeVisible();
      
      // Test cancel functionality
      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByText('Confirm Clock Out')).not.toBeVisible();
    });
  });

  test.describe('Modern UI/UX Design', () => {
    test('should load Inter font and modern styling', async ({ page }) => {
      await page.goto('/');
      
      // Check that Inter font is loaded
      const computedStyle = await page.evaluate(() => {
        return window.getComputedStyle(document.body).fontFamily;
      });
      expect(computedStyle).toContain('Inter');
      
      // Check for glassmorphism effects
      const cardElement = page.locator('.oklok-card').first();
      if (await cardElement.count() > 0) {
        const backdropFilter = await cardElement.evaluate((el) => {
          return window.getComputedStyle(el).backdropFilter;
        });
        expect(backdropFilter).toContain('blur');
      }
    });

    test('should have responsive design', async ({ page }) => {
      // Test desktop view
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.goto('/');
      
      // Check for desktop layout elements
      await expect(page.locator('text=Clock In/Out')).toBeVisible();
      
      // Test mobile view
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Should still be visible but potentially in different layout
      await expect(page.locator('text=Clock In/Out')).toBeVisible();
    });

    test('should show Oklok branding consistently', async ({ page }) => {
      await page.goto('/');
      
      // Check page title
      await expect(page).toHaveTitle(/Oklok/);
      
      // Should not show old StaffClock references
      const bodyText = await page.textContent('body');
      expect(bodyText).not.toContain('StaffClock');
      expect(bodyText).not.toContain('staffclock');
    });
  });

  test.describe('Tenant Isolation & Security', () => {
    test('should handle authentication state properly', async ({ page }) => {
      await page.goto('/');
      
      // Should show login prompt when not authenticated
      await expect(page.getByText('Please sign in')).toBeVisible();
      
      // Mock authentication
      await page.evaluate(() => {
        localStorage.setItem('token', 'valid-token');
        localStorage.setItem('user', JSON.stringify({
          id: 'user123',
          role: 'admin',
          name: 'Test Admin',
          tenantId: 'tenant123'
        }));
      });
      
      await page.reload();
      
      // Should show authenticated dashboard
      await expect(page.getByText('Test Admin')).toBeVisible();
      
      // Clear authentication
      await page.evaluate(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      });
      
      await page.reload();
      
      // Should return to unauthenticated state
      await expect(page.getByText('Please sign in')).toBeVisible();
    });

    test('should prevent unauthorized access to restricted pages', async ({ page }) => {
      // Try to access admin-only pages without proper role
      await page.evaluate(() => {
        localStorage.setItem('token', 'staff-token');
        localStorage.setItem('user', JSON.stringify({
          id: 'staff123',
          role: 'staff',
          name: 'John Staff'
        }));
      });
      
      // Try to access staff management page (admin/manager only)
      await page.goto('/staff');
      
      // Should be redirected or show access denied
      // This depends on the RouteGuard implementation
      const hasAccessControl = await page.getByText('Access denied').isVisible({ timeout: 2000 }).catch(() => false) ||
                              await page.url().includes('unauthorized') ||
                              await page.url() === 'http://localhost:3000/';
      
      expect(hasAccessControl).toBeTruthy();
    });
  });

  test.describe('Performance & Loading', () => {
    test('should load dashboard data efficiently', async ({ page }) => {
      // Start measuring load time
      const startTime = Date.now();
      
      // Mock authenticated user
      await page.evaluate(() => {
        localStorage.setItem('token', 'admin-token');
        localStorage.setItem('user', JSON.stringify({
          id: 'admin123',
          role: 'admin',
          name: 'Admin User'
        }));
      });
      
      await page.goto('/');
      
      // Wait for key dashboard elements to load
      await expect(page.getByText('Admin User')).toBeVisible();
      await expect(page.locator('.oklok-card').first()).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time (adjust threshold as needed)
      expect(loadTime).toBeLessThan(5000);
    });

    test('should handle loading states gracefully', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('token', 'admin-token');
        localStorage.setItem('user', JSON.stringify({
          id: 'admin123',
          role: 'admin',
          name: 'Admin User'
        }));
      });
      
      await page.goto('/');
      
      // Check for loading indicators during data fetch
      const loadingIndicator = page.getByText('Loading dashboard...');
      
      // Loading indicator should appear briefly
      if (await loadingIndicator.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Then disappear as content loads
        await expect(loadingIndicator).not.toBeVisible({ timeout: 5000 });
      }
      
      // Final content should be visible
      await expect(page.getByText('Admin User')).toBeVisible();
    });
  });
});

test.describe('Oklok Navigation & Routing', () => {
  test('should navigate between pages correctly', async ({ page }) => {
    // Mock authentication
    await page.evaluate(() => {
      localStorage.setItem('token', 'admin-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'admin123',
        role: 'admin',
        name: 'Admin User'
      }));
    });
    
    await page.goto('/');
    
    // Navigate to clock-in page
    await page.getByRole('link', { name: /Clock In\/Out/ }).click();
    await expect(page.url()).toContain('/clockin');
    
    // Navigate back to dashboard
    await page.goBack();
    await expect(page.url()).toBe('http://localhost:3000/');
  });

  test('should show appropriate navigation items based on role', async ({ page }) => {
    // Test admin navigation
    await page.evaluate(() => {
      localStorage.setItem('token', 'admin-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'admin123',
        role: 'admin',
        name: 'Admin User'
      }));
    });
    
    await page.goto('/');
    
    // Admin should see Staff Overview
    await expect(page.getByText('Staff Overview')).toBeVisible();
    
    // Test staff navigation
    await page.evaluate(() => {
      localStorage.setItem('user', JSON.stringify({
        id: 'staff123',
        role: 'staff',
        name: 'Staff User'
      }));
    });
    
    await page.reload();
    
    // Staff should NOT see Staff Overview
    await expect(page.getByText('Staff Overview')).not.toBeVisible();
  });
});

test.describe('Error Handling & Edge Cases', () => {
  test('should handle API errors gracefully', async ({ page }) => {
    // Mock network error
    await page.route('**/api/**', (route) => {
      route.abort('failed');
    });
    
    await page.evaluate(() => {
      localStorage.setItem('token', 'admin-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'admin123',
        role: 'admin',
        name: 'Admin User'
      }));
    });
    
    await page.goto('/');
    
    // Should handle network errors without crashing
    // This might show error messages or fallback content
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle invalid authentication tokens', async ({ page }) => {
    // Mock invalid token
    await page.evaluate(() => {
      localStorage.setItem('token', 'invalid-token');
    });
    
    await page.goto('/');
    
    // Should handle gracefully and show login
    await expect(page.getByText('Please sign in')).toBeVisible();
  });
});