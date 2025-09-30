const http = require('http');

console.log('=== Manual UI/UX Check Report ===\n');

// Check if server is running
const checkServer = () => {
  return new Promise((resolve) => {
    http.get('http://localhost:3000', (res) => {
      console.log(`✓ Server is running on port 3000 (Status: ${res.statusCode})`);
      resolve(true);
    }).on('error', (err) => {
      console.log(`✗ Server not accessible: ${err.message}`);
      resolve(false);
    });
  });
};

// Pages to check
const pages = [
  { path: '/', name: 'Dashboard' },
  { path: '/clockin', name: 'Clock In' },
  { path: '/schedule', name: 'Schedule' },
  { path: '/contractors', name: 'Contractors' },
  { path: '/approvals', name: 'Approvals' },
  { path: '/reports', name: 'Reports' },
  { path: '/settings', name: 'Settings' }
];

// Check each page
const checkPages = async () => {
  for (const page of pages) {
    await new Promise((resolve) => {
      http.get(`http://localhost:3000${page.path}`, (res) => {
        console.log(`\n${page.name} Page:`);
        console.log(`  Status: ${res.statusCode}`);
        console.log(`  URL: http://localhost:3000${page.path}`);
        
        if (res.statusCode === 200) {
          console.log('  ✓ Page loads successfully');
        } else if (res.statusCode === 404) {
          console.log('  ✗ Page not found');
        } else {
          console.log('  ⚠ Unexpected status code');
        }
        
        resolve();
      }).on('error', (err) => {
        console.log(`\n${page.name} Page:`);
        console.log(`  ✗ Error: ${err.message}`);
        resolve();
      });
    });
  }
};

// Main check
const runCheck = async () => {
  const serverRunning = await checkServer();
  
  if (serverRunning) {
    await checkPages();
    
    console.log('\n=== Responsive Design Checklist ===');
    console.log('\nPlease manually check the following on each screen size:');
    console.log('\n📱 Mobile (375px):');
    console.log('  - [ ] Navigation collapses to hamburger menu');
    console.log('  - [ ] Forms stack vertically');
    console.log('  - [ ] No horizontal scrolling');
    console.log('  - [ ] Buttons are at least 44px tall');
    console.log('  - [ ] Text is readable without zooming');
    
    console.log('\n💻 Tablet (768px):');
    console.log('  - [ ] 2-column layouts where appropriate');
    console.log('  - [ ] Navigation items may abbreviate');
    console.log('  - [ ] Cards arrange in grid');
    console.log('  - [ ] Proper spacing between elements');
    
    console.log('\n🖥️ Desktop (1440px):');
    console.log('  - [ ] 3-4 column layouts maximize space');
    console.log('  - [ ] Full navigation labels visible');
    console.log('  - [ ] Settings form uses multi-column layout');
    console.log('  - [ ] No excessive white space');
    
    console.log('\n📺 Ultra-wide (1920px+):');
    console.log('  - [ ] Content has maximum width constraints');
    console.log('  - [ ] Grid layouts utilize available space');
    console.log('  - [ ] Typography remains readable');
    
    console.log('\n🎨 Design System Check:');
    console.log('  - [ ] Consistent button styles (primary, secondary, danger, success)');
    console.log('  - [ ] Glassmorphism effects on cards');
    console.log('  - [ ] Smooth hover animations');
    console.log('  - [ ] Loading states with spinners');
    console.log('  - [ ] Error states with proper messaging');
    
    console.log('\n♿ Accessibility Check:');
    console.log('  - [ ] Tab navigation works properly');
    console.log('  - [ ] Focus states are visible');
    console.log('  - [ ] ARIA labels on interactive elements');
    console.log('  - [ ] Color contrast meets WCAG standards');
    console.log('  - [ ] Screen reader compatible');
    
    console.log('\n🐛 Known Issues to Verify Fixed:');
    console.log('  - [ ] Settings page uses full width on wide screens');
    console.log('  - [ ] No text misalignment or wrapping issues');
    console.log('  - [ ] Navigation doesn\'t overflow on any screen size');
    console.log('  - [ ] Forms have proper responsive grid layouts');
    
    console.log('\n📸 Test URLs for manual inspection:');
    pages.forEach(page => {
      console.log(`  ${page.name}: http://localhost:3000${page.path}`);
    });
    
    console.log('\n💡 Browser DevTools Testing:');
    console.log('  1. Open Chrome DevTools (F12)');
    console.log('  2. Toggle device toolbar (Ctrl+Shift+M)');
    console.log('  3. Test each responsive breakpoint');
    console.log('  4. Check Console for any errors');
    console.log('  5. Use Lighthouse for performance audit');
  } else {
    console.log('\n⚠️  Please ensure the development server is running:');
    console.log('    npm run dev');
  }
};

runCheck();