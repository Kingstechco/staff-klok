import { test, expect } from '@playwright/test';

// Test user credentials
const TEST_PIN = '1234';

// Viewport sizes to test
const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'ultra-wide', width: 1920, height: 1080 }
];

test.describe('Visual UI/UX Check', () => {
  test('Check Clock-In Page Responsiveness', async ({ page }) => {
    for (const viewport of viewports) {
      console.log(`\n=== Testing Clock-In Page on ${viewport.name} (${viewport.width}x${viewport.height}) ===`);
      
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('http://localhost:3000/clockin');
      await page.waitForLoadState('networkidle');
      
      // Take screenshot of login state
      await page.screenshot({ 
        path: `screenshots/clockin-login-${viewport.name}.png`,
        fullPage: true 
      });
      
      // Check for PIN input
      const pinInput = await page.locator('input[type="password"]').first();
      if (await pinInput.isVisible()) {
        console.log('✓ PIN input is visible');
        
        // Check PIN input size
        const inputBox = await pinInput.boundingBox();
        if (inputBox) {
          console.log(`  Input size: ${inputBox.width}x${inputBox.height}px`);
          if (inputBox.height >= 44) {
            console.log('  ✓ Input meets minimum tap target (44px)');
          } else {
            console.log('  ⚠️ Input below minimum tap target');
          }
        }
      }
      
      // Check for logo
      const logo = await page.locator('svg').first();
      if (await logo.isVisible()) {
        console.log('✓ Oklok logo is visible');
      }
      
      // Enter PIN and login
      await pinInput.fill(TEST_PIN);
      await page.locator('button:has-text("Sign In")').click();
      
      // Wait for navigation or error
      await page.waitForTimeout(2000);
      
      // Check if we're logged in
      const clockButton = await page.locator('button:has-text("Clock")').first();
      if (await clockButton.isVisible()) {
        console.log('✓ Successfully logged in - Clock button visible');
        
        // Take screenshot of logged-in state
        await page.screenshot({ 
          path: `screenshots/clockin-dashboard-${viewport.name}.png`,
          fullPage: true 
        });
        
        // Check clock button size
        const buttonBox = await clockButton.boundingBox();
        if (buttonBox) {
          console.log(`  Clock button size: ${buttonBox.width}x${buttonBox.height}px`);
          if (buttonBox.height >= 44) {
            console.log('  ✓ Button meets minimum tap target');
          }
        }
        
        // Check weekly progress visibility
        const weeklyProgress = await page.locator('text=/Weekly Progress/i').first();
        if (await weeklyProgress.isVisible()) {
          console.log('✓ Weekly progress section visible');
        }
      } else {
        console.log('⚠️ Login failed or clock button not visible');
      }
      
      // Check for horizontal scroll
      const hasHScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      console.log(hasHScroll ? '⚠️ Horizontal scroll detected!' : '✓ No horizontal scroll');
    }
  });

  test('Check Settings Page Responsiveness', async ({ page }) => {
    // First, let's mock being logged in as admin
    await page.goto('http://localhost:3000');
    
    // Set admin user in localStorage
    await page.evaluate(() => {
      const adminUser = {
        id: 'test-admin',
        name: 'Test Admin',
        role: 'admin',
        email: 'admin@test.com'
      };
      localStorage.setItem('currentUser', JSON.stringify(adminUser));
    });
    
    for (const viewport of viewports) {
      console.log(`\n=== Testing Settings Page on ${viewport.name} ===`);
      
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('http://localhost:3000/settings');
      await page.waitForLoadState('networkidle');
      
      // Take screenshot
      await page.screenshot({ 
        path: `screenshots/settings-${viewport.name}.png`,
        fullPage: true 
      });
      
      // Check for settings tabs
      const tabs = await page.locator('button[aria-label*="settings"]');
      const tabCount = await tabs.count();
      console.log(`✓ Found ${tabCount} setting tabs`);
      
      // Check tab wrapping on mobile
      if (viewport.width <= 768) {
        const tabsWrapped = await page.evaluate(() => {
          const tabs = document.querySelectorAll('button[aria-label*="settings"]');
          if (tabs.length < 2) return false;
          
          const firstTab = tabs[0].getBoundingClientRect();
          const lastTab = tabs[tabs.length - 1].getBoundingClientRect();
          
          return firstTab.top !== lastTab.top;
        });
        console.log(tabsWrapped ? '✓ Tabs properly wrap on mobile' : '✓ Tabs on single line');
      }
      
      // Check form layout
      const formGroups = await page.locator('.oklok-form-group');
      const formCount = await formGroups.count();
      console.log(`✓ Found ${formCount} form groups`);
      
      // Check grid layout responsiveness
      if (formCount > 0) {
        const gridColumns = await page.evaluate(() => {
          const grid = document.querySelector('[class*="grid-cols-"]');
          if (!grid) return 0;
          
          const styles = window.getComputedStyle(grid);
          const columns = styles.gridTemplateColumns.split(' ').length;
          return columns;
        });
        console.log(`  Grid columns: ${gridColumns}`);
      }
      
      // Check for content overflow
      const hasOverflow = await page.evaluate(() => {
        const elements = document.querySelectorAll('.oklok-card');
        let overflow = false;
        
        elements.forEach(el => {
          if (el.scrollWidth > el.clientWidth) {
            overflow = true;
          }
        });
        
        return overflow;
      });
      console.log(hasOverflow ? '⚠️ Content overflow detected' : '✓ No content overflow');
    }
  });

  test('Check Navigation Responsiveness', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    console.log('\n=== Testing Navigation ===');
    
    // Mobile navigation
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState('networkidle');
    
    const mobileMenu = await page.locator('button[aria-label*="menu"]').first();
    if (await mobileMenu.isVisible()) {
      console.log('✓ Mobile menu button visible');
      
      // Click menu
      await mobileMenu.click();
      await page.waitForTimeout(500);
      
      // Check if menu opened
      const mobileNav = await page.locator('.md\\:hidden').last();
      if (await mobileNav.isVisible()) {
        console.log('✓ Mobile navigation menu opens');
        await page.screenshot({ path: 'screenshots/nav-mobile-open.png' });
      }
    }
    
    // Desktop navigation
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForLoadState('networkidle');
    
    const desktopNav = await page.locator('nav a').count();
    console.log(`✓ Desktop navigation items: ${desktopNav}`);
    
    // Check navigation spacing
    const navOverlap = await page.evaluate(() => {
      const navItems = document.querySelectorAll('nav a');
      for (let i = 0; i < navItems.length - 1; i++) {
        const rect1 = navItems[i].getBoundingClientRect();
        const rect2 = navItems[i + 1].getBoundingClientRect();
        
        if (rect1.right > rect2.left && rect1.top === rect2.top) {
          return true;
        }
      }
      return false;
    });
    console.log(navOverlap ? '⚠️ Navigation items overlap' : '✓ Navigation items properly spaced');
  });
  
  test('Console Error Check', async ({ page }) => {
    console.log('\n=== Checking Console Errors ===');
    
    const errors: string[] = [];
    page.on('console', message => {
      if (message.type() === 'error') {
        errors.push(message.text());
      }
    });
    
    page.on('pageerror', error => {
      errors.push(`Page error: ${error.message}`);
    });
    
    // Visit main pages
    const pages = ['/', '/clockin', '/settings'];
    
    for (const path of pages) {
      await page.goto(`http://localhost:3000${path}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }
    
    if (errors.length > 0) {
      console.log('⚠️ Console errors detected:');
      errors.forEach(err => console.log(`  - ${err}`));
    } else {
      console.log('✓ No console errors detected');
    }
  });
});