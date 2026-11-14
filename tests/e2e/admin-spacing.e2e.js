/* اختبار 001-P2: تباعد كتل لوحة المنظّم وهو مسجّل الدخول على 360 و390 و1366 بالوضعين: فراغ ≥ 12px بين حالة الدخول وصف الطيّ/الفتح وبين الصف وأول بطاقة وبين البطاقات،
 * وزرّا الطيّ/الفتح بعرض متساوٍ وبينهما فاصل ≥ 12px، وبلا تمرير أفقي، وأن الوظيفة سليمة (الطيّ والفتح يعملان). التشغيل: node tests/e2e/admin-spacing.e2e.js */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { chromium } = require('playwright');
const snap = require('../../tools/snap.js');
const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
let failed = 0;
const check = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) failed++; console.log((ok ? '✅ ' : '❌ ') + name + (ok ? '' : `\n   المتوقع: ${JSON.stringify(want)}\n   الفعلي:  ${JSON.stringify(got)}`)); };

(async () => {
  const fixture = readJson('tests/fixtures/season.json'), overrides = readJson('tests/fixtures/overrides.json');
  const { srv, origin } = await snap.serve(ROOT);
  const browser = await chromium.launch();
  try {
    for (const light of [false, true]) for (const w of [360, 390, 1366]) {
      const { page, context } = await snap.openPage(browser, { fixture, overrides, now: fixture.exportedAt, origin, root: ROOT }, { width: w, light });
      await page.click('nav.tabs button[data-tab="admin"]');
      await page.fill('#pinInput', '2580'); await page.click('#loginBtn');
      await page.waitForSelector('#adminPanel .status-msg', { state: 'visible' });
      const m = await page.evaluate(() => {
        const g = s => document.querySelector(s).getBoundingClientRect();
        const st = g('#adminPanel .status-msg'), ex = g('#expandAllAdminBtn'), co = g('#collapseAllAdminBtn');
        const accs = [...document.querySelectorAll('#adminPanel > details.admin-accordion')].map(e => e.getBoundingClientRect());
        const left = ex.left < co.left ? ex : co, right = ex.left < co.left ? co : ex;
        return { s2b: Math.round(Math.min(ex.top, co.top) - st.bottom), b2c: Math.round(accs[0].top - Math.max(ex.bottom, co.bottom)),
          gaps: accs.slice(1).map((r, i) => Math.round(r.top - accs[i].bottom)), eq: Math.abs(ex.width - co.width) < 1, btnGap: Math.round(right.left - left.right),
          hOverflow: document.documentElement.scrollWidth - innerWidth, n: accs.length };
      });
      const tag = `${w} ${light ? 'فاتح' : 'داكن'}`;
      check(`${tag}: فراغ ≥ 12px بين حالة الدخول والأزرار وبين الأزرار وأول بطاقة وبين البطاقات`, [m.s2b >= 12, m.b2c >= 12, m.gaps.length > 3 && m.gaps.every(x => x >= 12)], [true, true, true]);
      check(`${tag}: زرّا الطيّ/الفتح بعرض متساوٍ وفاصل ≥ 12px وبلا تمرير أفقي`, [m.eq, m.btnGap >= 12, m.hOverflow <= 0], [true, true, true]);
      if (w === 390 && !light) {
        await page.click('#collapseAllAdminBtn');
        const closed = await page.evaluate(() => [...document.querySelectorAll('#adminPanel > details.admin-accordion')].every(d => !d.open));
        await page.click('#expandAllAdminBtn');
        const opened = await page.evaluate(() => [...document.querySelectorAll('#adminPanel > details.admin-accordion')].every(d => d.open));
        check('الوظيفة سليمة: الطيّ يغلق كل الأقسام والفتح يفتحها', [closed, opened], [true, true]);
      }
      await context.close();
    }
  } finally { await browser.close(); srv.close(); }
  console.log(failed ? `\n❌ ${failed} فشل` : '\n✅ كل الفحوص نجحت');
  process.exit(failed ? 1 : 0);
})();
