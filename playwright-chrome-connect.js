const { chromium } = require('playwright');

async function connectToExistingChrome() {
  try {
    console.log('Attempting to connect to existing Chrome instance...');
    
    // Connect to existing Chrome instance on debugging port 9222
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    
    // Get the default context (existing browser context)
    const context = browser.contexts()[0];
    
    // Create a new page or use existing one
    const page = await context.newPage();
    
    console.log('Successfully connected to Chrome!');
    
    // Navigate to a test page
    await page.goto('https://example.com');
    console.log('Navigated to example.com');
    
    // Take a screenshot
    await page.screenshot({ path: 'screenshot.png' });
    console.log('Screenshot saved as screenshot.png');
    
    // Get the page title
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
    // Navigate to your local development server
    await page.goto('http://localhost:3000');
    console.log('Navigated to localhost:3000');
    
    // Take another screenshot
    await page.screenshot({ path: 'localhost-screenshot.png' });
    console.log('Screenshot of localhost saved as localhost-screenshot.png');
    
    // Example: Click a button (if it exists)
    try {
      await page.click('text=Connect & Play', { timeout: 5000 });
      console.log('Clicked Connect & Play button');
    } catch (error) {
      console.log('Connect & Play button not found or not clickable');
    }
    
    // Wait for 3 seconds to see the result
    await page.waitForTimeout(3000);
    
    // Don't close the browser - leave it running
    console.log('Script completed. Browser remains open.');
    
  } catch (error) {
    console.error('Error connecting to Chrome:', error.message);
    console.log('\nTroubleshooting steps:');
    console.log('1. Make sure Chrome is running with debugging enabled');
    console.log('2. Start Chrome with: /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug');
    console.log('3. Check that port 9222 is available: lsof -i :9222');
  }
}

// Run the connection
connectToExistingChrome();