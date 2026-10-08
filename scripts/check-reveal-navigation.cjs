// Optional local browser QA; requires Playwright and a running server (next start).
//   node scripts/check-reveal-navigation.cjs            (REVEAL_QA_URL, default http://127.0.0.1:3000)
// Scroll reveals must never stay hidden. Arriving at the homepage by client-side navigation on a
// slow CPU used to leave whole sections invisible until a reload: the reveal observer re-runs on
// every route change and dropped elements its previous run had already armed.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.REVEAL_QA_URL || 'http://127.0.0.1:3000';
const ARMED = ['data-reveal', 'data-reveal-img', 'data-headline', 'data-draw', 'data-grow', 'data-bar', 'data-pop'].map((k) => `[${k}="armed"]`).join(',');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    for (const from of [null, '/pricing', '/about']) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await ctx.addInitScript(() => localStorage.setItem('dormscape-cookie-consent', 'rejected'));
      const page = await ctx.newPage();
      await (await ctx.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: 6 });
      if (from) {
        await page.goto(base + from, { waitUntil: 'networkidle' });
        await page.locator('a[aria-label="Dormscape home"]').first().click();
        await page.waitForURL(base + '/');
      } else await page.goto(base + '/', { waitUntil: 'networkidle' });
      // Below-the-fold content still waits to animate in (once the page has hydrated).
      await page.waitForFunction((sel) => document.querySelectorAll(sel).length > 0, ARMED, { timeout: 20000 });
      for (let y = 0; y < 9000; y += 450) { await page.mouse.wheel(0, 450); await page.waitForTimeout(100); }
      await page.waitForTimeout(1200);
      const stuck = await page.evaluate((sel) => [...document.querySelectorAll(sel)].filter((el) => { const r = el.getBoundingClientRect(); return r.height > 0 && r.bottom < innerHeight; }).length, ARMED);
      assert.equal(stuck, 0, `${from ? 'after navigating from ' + from : 'fresh load'}: ${stuck} scrolled-past elements never appeared`);
      await ctx.close();
    }
    console.log('PASS: homepage reveals appear on scroll after a fresh load and after client-side navigation on a slow CPU.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
