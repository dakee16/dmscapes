// Optional local browser QA; requires Playwright. Uses only disposable fixtures.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.CONTROLS_QA_URL || 'http://127.0.0.1:3010';
if (!['127.0.0.1','localhost'].includes(new URL(base).hostname)) throw new Error('Run fixture QA only against a local dev server.');
const shots = '/tmp/dormscape-controls-qa'; fs.mkdirSync(shots, {recursive:true});
(async () => {
  const browser = await chromium.launch({ headless:true, args:['--no-sandbox'] });
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{ localStorage.setItem('dormscape-cookie-consent','rejected'); localStorage.setItem('dormscape-motion-paused','true'); });
    await page.goto(base, {waitUntil:'networkidle'});
    const nav=page.getByRole('navigation',{name:'Main navigation'});
    await nav.getByRole('button',{name:'About',exact:true}).click();
    assert(await nav.getByRole('link',{name:'Privacy policy'}).isVisible());
    assert(await nav.getByRole('link',{name:'Cookie policy'}).isVisible());
    await page.screenshot({path:`${shots}/desktop-nav.png`});
    await page.keyboard.press('Escape');
    assert.equal(await nav.getByRole('button',{name:'About',exact:true}).getAttribute('aria-expanded'),'false');
    await nav.getByRole('button',{name:'Explore',exact:true}).focus(); await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(()=>document.activeElement?.textContent),'How it works↗');
    await page.keyboard.press('End'); assert.equal(await page.evaluate(()=>document.activeElement?.textContent),'Frequently asked↗');
    await page.keyboard.press('Escape');
    await nav.getByRole('button',{name:'About',exact:true}).click();
    await nav.getByRole('button',{name:'Feedback',exact:false}).click();
    assert(await page.getByRole('dialog').isVisible());
    await page.keyboard.press('Escape'); assert.equal(await page.getByRole('dialog').count(),0);
    await page.locator('#room-in-3d').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('#room-in-3d').count(),1);
    assert.equal(await page.locator('#room-in-3d-end').count(),1);
    await page.screenshot({path:`${shots}/desktop-3d.png`});
    await page.goto(`${base}/report?from=%2Frooms%2Fexample%3Ftoken%3Dsecret%23invite`,{waitUntil:'networkidle'});
    assert.equal(await page.locator('#report-page').inputValue(),'/rooms/example');
    await page.locator('#report-description').fill('The furniture disappears when I move the desk.');
    await page.route('**/api/reports',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Your report has not been sent. Please retry.'})}));
    await page.getByRole('button',{name:'Send report'}).click();
    await page.getByRole('alert').waitFor(); assert((await page.getByRole('alert').innerText()).includes('not been sent'));
    assert((await page.locator('#report-description').inputValue()).includes('furniture'));
    await page.unroute('**/api/reports');
    await page.route('**/api/reports',route=>route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,reference:'1234abcd'})}));
    await page.getByRole('button',{name:'Send report'}).click();
    await page.getByRole('heading',{name:'Report received.'}).waitFor();

    await page.addInitScript(()=>{ sessionStorage.setItem('dormscape-dev-auth',JSON.stringify({email:'qa@example.test',username:'qa_user',plan:'pro',auth_provider:'email'})); sessionStorage.setItem('dormscape-plus-welcome-seen','1'); });
    await page.goto(`${base}/account/settings`,{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'Delete my account'}).click();
    const dialog=page.getByRole('dialog',{name:'Delete your account?'});
    await dialog.waitFor();
    assert(await dialog.getByRole('button',{name:'Permanently delete'}).isDisabled());
    await page.screenshot({path:`${shots}/delete-dialog.png`});
    await dialog.getByLabel('Type DELETE to confirm').fill('DELETE');
    await dialog.getByRole('checkbox').check();
    assert(await dialog.getByRole('button',{name:'Permanently delete'}).isEnabled());
    await dialog.getByRole('button',{name:'Keep my account'}).click();
    assert.equal(await page.getByRole('dialog').count(),0);

    for(const width of [390,320]) {
      await page.setViewportSize({width,height:844});
      await page.goto(base,{waitUntil:'networkidle'});
      await nav.getByRole('button',{name:'Navigation menu'}).click();
      await nav.getByRole('button',{name:'About',exact:true}).click();
      assert(await nav.getByRole('link',{name:'Report a problem'}).isVisible());
      await page.screenshot({path:`${shots}/mobile-nav-${width}.png`});
      await nav.getByRole('button',{name:'Feedback',exact:false}).click();
      await page.getByRole('dialog').waitFor(); await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Navigation menu');
      await page.goto(`${base}/report`,{waitUntil:'networkidle'});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Report should not overflow');
      await page.screenshot({path:`${shots}/mobile-report-${width}.png`,fullPage:true});
      await page.goto(`${base}/account/settings`,{waitUntil:'networkidle'});
      await page.getByRole('button',{name:'Delete my account'}).click();
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Deletion dialog should not overflow');
      await page.screenshot({path:`${shots}/mobile-deletion-${width}.png`});
      await page.keyboard.press('Escape');
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: desktop/mobile dropdowns, keyboard navigation, feedback focus, 3D anchors, report success/failure and account confirmation.');
    console.log(`Screenshots: ${shots}`);
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
