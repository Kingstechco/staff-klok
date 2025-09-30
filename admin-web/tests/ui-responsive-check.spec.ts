import { test, expect } from '@playwright/test';

// Define viewport sizes to test
const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'wide-screen', width: 1920, height: 1080 }
];

// Pages to test
const pages = [
  { path: '/', name: 'Dashboard' },
  { path: '/clockin', name: 'Clock In' },
  { path: '/schedule', name: 'Schedule' },
  { path: '/contractors', name: 'Contractors' },
  { path: '/approvals', name: 'Approvals' },
  { path: '/reports', name: 'Reports' },
  { path: '/settings', name: 'Settings' }
];

test.describe('UI/UX Responsive Design and Error Check', () => {
  test.beforeEach(async ({ page }) => {
    // Set up console error listener
    page.on('console', message => {
      if (message.type() === 'error') {
        console.log(`Console Error: ${message.text()}`);
      }
    });

    // Set up page error listener
    page.on('pageerror', error => {
      console.log(`Page Error: ${error.message}`);
    });
  });

  for (const viewport of viewports) {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
      });

      for (const pageInfo of pages) {
        test(`Check ${pageInfo.name} page`, async ({ page }) => {
          console.log(`\n=== Testing ${pageInfo.name} on ${viewport.name} ===`);
          
          // Navigate to page
          await page.goto(`http://localhost:3000${pageInfo.path}`);
          
          // Wait for page to load
          await page.waitForLoadState('networkidle');
          
          // Check for navigation visibility
          const nav = await page.locator('nav').first();
          await expect(nav).toBeVisible();
          
          // Check for proper responsive navigation
          if (viewport.width < 768) {
            // Mobile: hamburger menu should be visible
            const hamburger = await page.locator('button[aria-label*="menu"]');
            if (await hamburger.isVisible()) {
              console.log(`✓ Mobile menu button visible`);
            }
          } else {
            // Desktop: full navigation should be visible
            const navItems = await page.locator('nav a').count();
            console.log(`✓ Navigation items visible: ${navItems}`);
          }
          
          // Check for horizontal scroll (should not exist)
          const hasHorizontalScroll = await page.evaluate(() => {
            return document.documentElement.scrollWidth > document.documentElement.clientWidth;
          });
          if (hasHorizontalScroll) {
            console.log(`⚠️ WARNING: Horizontal scroll detected on ${pageInfo.name}`);
          } else {
            console.log(`✓ No horizontal scroll`);
          }
          
          // Check for overlapping elements
          const overlappingElements = await page.evaluate(() => {
            const elements = document.querySelectorAll('*');
            const overlaps: string[] = [];
            
            for (let i = 0; i < elements.length; i++) {
              for (let j = i + 1; j < elements.length; j++) {
                const rect1 = elements[i].getBoundingClientRect();
                const rect2 = elements[j].getBoundingClientRect();
                
                if (rect1.width > 0 && rect1.height > 0 && 
                    rect2.width > 0 && rect2.height > 0) {
                  const overlap = !(rect1.right < rect2.left || 
                                   rect2.right < rect1.left || 
                                   rect1.bottom < rect2.top || 
                                   rect2.bottom < rect1.top);
                  
                  if (overlap && 
                      !elements[i].contains(elements[j]) && 
                      !elements[j].contains(elements[i])) {
                    const selector1 = elements[i].tagName + (elements[i].className ? '.' + elements[i].className.split(' ')[0] : '');
                    const selector2 = elements[j].tagName + (elements[j].className ? '.' + elements[j].className.split(' ')[0] : '');
                    overlaps.push(`${selector1} overlaps with ${selector2}`);
                  }
                }
              }
            }
            
            return overlaps.slice(0, 5); // Return first 5 overlaps
          });
          
          if (overlappingElements.length > 0) {
            console.log(`⚠️ Overlapping elements detected:`);
            overlappingElements.forEach(overlap => console.log(`  - ${overlap}`));
          } else {
            console.log(`✓ No overlapping elements`);
          }
          
          // Check text readability
          const unreadableText = await page.evaluate(() => {
            const elements = document.querySelectorAll('*');
            const issues: string[] = [];
            
            elements.forEach(el => {
              const styles = window.getComputedStyle(el);
              const fontSize = parseFloat(styles.fontSize);
              
              // Check for too small text
              if (fontSize < 12 && el.textContent?.trim()) {
                issues.push(`Small text (${fontSize}px): ${el.tagName}`);
              }
              
              // Check for text overflow
              if (el.scrollWidth > el.clientWidth && styles.overflow === 'visible') {
                issues.push(`Text overflow: ${el.tagName}`);
              }
            });
            
            return issues.slice(0, 5);
          });
          
          if (unreadableText.length > 0) {
            console.log(`⚠️ Text readability issues:`);
            unreadableText.forEach(issue => console.log(`  - ${issue}`));
          } else {
            console.log(`✓ Text is readable`);
          }
          
          // Check for proper tap targets on mobile
          if (viewport.width <= 768) {
            const smallTapTargets = await page.evaluate(() => {
              const clickable = document.querySelectorAll('button, a, input, select, textarea, [role="button"]');
              const small: string[] = [];
              
              clickable.forEach(el => {
                const rect = el.getBoundingClientRect();
                if (rect.width < 44 || rect.height < 44) {
                  small.push(`${el.tagName}: ${rect.width}x${rect.height}px`);
                }
              });
              
              return small.slice(0, 5);
            });
            
            if (smallTapTargets.length > 0) {
              console.log(`⚠️ Small tap targets (< 44px):`);
              smallTapTargets.forEach(target => console.log(`  - ${target}`));
            } else {
              console.log(`✓ All tap targets meet minimum size`);
            }
          }
          
          // Check specific page elements
          if (pageInfo.path === '/settings') {
            // Check form layout
            const formGroups = await page.locator('.oklok-form-group').count();
            console.log(`✓ Form groups found: ${formGroups}`);
            
            // Check tab navigation
            const tabs = await page.locator('button[aria-label*="settings"]').count();
            console.log(`✓ Setting tabs found: ${tabs}`);
          }
          
          if (pageInfo.path === '/clockin') {
            // Check clock-in specific elements
            const clockButton = await page.locator('button:has-text("Clock")').first();
            if (await clockButton.isVisible()) {
              console.log(`✓ Clock button is visible`);
            }
          }
          
          // Take screenshot for visual inspection
          await page.screenshot({ 
            path: `screenshots/${viewport.name}-${pageInfo.name.toLowerCase().replace(' ', '-')}.png`,
            fullPage: true 
          });
          
          console.log(`✓ Screenshot saved`);
        });
      }
    });
  }
  
  test('Check error handling', async ({ page }) => {
    console.log(`\n=== Testing Error Handling ===`);
    
    // Test 404 page
    await page.goto('http://localhost:3000/non-existent-page');
    await page.waitForLoadState('networkidle');
    
    // Check if error boundary catches it
    const errorMessage = await page.locator('text=/error|not found/i').first();
    if (await errorMessage.isVisible()) {
      console.log(`✓ 404 error handling works`);
    }
    
    // Test API error handling on settings page
    await page.goto('http://localhost:3000/settings');
    
    // Check if loading state appears
    const spinner = await page.locator('.oklok-spinner').first();
    if (await spinner.isVisible()) {
      console.log(`✓ Loading state displayed`);
    }
  });
  
  test('Check accessibility', async ({ page }) => {
    console.log(`\n=== Testing Accessibility ===`);
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Check for proper ARIA labels
    const buttonsWithoutLabels = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      const missing: string[] = [];
      
      buttons.forEach(btn => {
        if (!btn.getAttribute('aria-label') && !btn.textContent?.trim()) {
          missing.push(`Button without label at: ${btn.className}`);
        }
      });
      
      return missing;
    });
    
    if (buttonsWithoutLabels.length > 0) {
      console.log(`⚠️ Buttons without labels:`);
      buttonsWithoutLabels.forEach(btn => console.log(`  - ${btn}`));
    } else {
      console.log(`✓ All buttons have proper labels`);
    }
    
    // Check color contrast
    const lowContrastElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const issues: string[] = [];
      
      // Simple contrast check (would need proper library for accurate results)
      elements.forEach(el => {
        const styles = window.getComputedStyle(el);
        if (styles.color === styles.backgroundColor && el.textContent?.trim()) {
          issues.push(`Same color text/background: ${el.tagName}`);
        }
      });
      
      return issues.slice(0, 5);
    });
    
    if (lowContrastElements.length > 0) {
      console.log(`⚠️ Potential contrast issues:`);
      lowContrastElements.forEach(issue => console.log(`  - ${issue}`));
    } else {
      console.log(`✓ No obvious contrast issues`);
    }
  });
});