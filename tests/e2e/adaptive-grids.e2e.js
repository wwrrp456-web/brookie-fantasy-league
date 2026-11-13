/* اختبار شامل لـ001-T018 (الشبكات المتكيفة، U-08): بدون تمرير أفقي في أي عرض بين 360 و1440 للتبويبات الأربعة المزدحمة،
 * وأعمدة بطاقات المشاركين تزيد مع العرض (1 على الجوال، ثم 2، ثم 3)، وكل بطاقة داخل حدود الشاشة.
 * التشغيل: node tests/e2e/adaptive-grids.e2e.js  (يحتاج Playwright، وليس جزءًا من tests/run.js). exit 1 لو فشل شيء. */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const ff = require(path.join(ROOT, 'tools/fake-firebase.js'));
const { chromium } = require('playwright');
const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));

const WIDTHS = [360, 390, 600, 768, 1024, 1366, 1440];
const TABS = ['standings', 'participants', 'rounds', 'stats'];
let failed = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log((ok ? '✅ ' : '❌ ') + name + (ok ? '' : `\n   المتوقع: ${JSON.stringify(want)}\n   الفعلي:  ${JSON.stringify(got)}`));
};

(async () => {
  const browser = await chromium.launch();
  try {
    const cols = {};
    const overflow = [];
    const outside = [];
    for (const w of WIDTHS) {
      const page = await browser.newPage({ viewport: { width: w, height: 900 } });
      await page.addInitScript(() => { try { localStorage.setItem('brookie-onboarded', '1'); } catch (e) {} });
      await ff.install(page, { fixture: readJson('tests/fixtures/season.json'), overrides: readJson('tests/fixtures/overrides.json') });
      await page.goto('file://' + path.join(ROOT, 'index.html'));
      await page.waitForTimeout(1500);
      for (const tab of TABS) {
        await page.click(`nav.tabs button[data-tab="${tab}"]`);
        await page.waitForTimeout(150);
        await page.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; }));
        const r = await page.evaluate(() => {
          const cw = document.documentElement.clientWidth;
          const panel = document.querySelector('section.panel.active');
          // بطاقات (مو عناصر داخل شريط تمرير مقصود) تتجاوز عرض الشاشة
          const bad = [...panel.querySelectorAll('.participant-card, .badge-card, .club-eff-card, .radar-card, .hero-card, .r2-card, .my-dash-card, .medal-card')].filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.right > cw + 1 || b.left < -1); }).length;
          return { x: document.documentElement.scrollWidth > cw, bad };
        });
        if (r.x) overflow.push(`${w}/${tab}`);
        if (r.bad) outside.push(`${w}/${tab}:${r.bad}`);
        if (tab === 'participants') cols[w] = await page.evaluate(() => getComputedStyle(document.getElementById('participantsBox')).gridTemplateColumns.split(' ').length);
      }
      await page.close();
    }
    check('بدون تمرير أفقي بين 360 و1440 (4 تبويبات × 7 عروض)', overflow, []);
    check('كل البطاقات داخل حدود الشاشة', outside, []);
    check('أعمدة المشاركين: 1 على الجوال', [cols[360], cols[390]], [1, 1]);
    check('أعمدة المشاركين تزيد مع العرض (768: 2، 1366/1440: 3)', [cols[768], cols[1366], cols[1440]], [2, 3, 3]);
    check('أعمدة المشاركين لا تنقص مع زيادة العرض', WIDTHS.every((w, i) => i === 0 || cols[w] >= cols[WIDTHS[i - 1]]), true);
  } finally { await browser.close(); }
  console.log(failed ? `\n❌ ${failed} فشل` : '\n✅ كل الفحوص نجحت');
  process.exit(failed ? 1 : 0);
})();
