const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    deviceScaleFactor: 3, isMobile: true, hasTouch: true
  });
  const page = await ctx.newPage();
  await page.goto('http://localhost:8788/market', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/home/user/webapp/mobile-market-v2.png', fullPage: false });
  
  // Check positions
  const chatFab = await page.$('.chat-fab');
  const navToggle = await page.$('.nw-nav-toggle');
  if (chatFab) console.log('Chat FAB:', JSON.stringify(await chatFab.boundingBox()));
  if (navToggle) console.log('Nav Toggle:', JSON.stringify(await navToggle.boundingBox()));
  
  // Check thumb images
  const imgs = await page.$$eval('img.listing-img', imgs => 
    imgs.map(i => ({ src: i.src.split('/').pop(), loaded: i.complete && i.naturalWidth > 0 }))
  );
  console.log('Images:', JSON.stringify(imgs));
  
  // Scroll to bottom
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/home/user/webapp/mobile-market-bottom.png', fullPage: false });
  
  await browser.close();
})();
