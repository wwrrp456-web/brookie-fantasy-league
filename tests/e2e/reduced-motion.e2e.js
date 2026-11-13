/* اختبار 001-T027: بعد حذف site-polish.css وكل !important، تقليل الحركة (prefers-reduced-motion) يصفّر كل transition وanimation في كل التبويبات
 * بالوضعين، وlint: importants = 0. التشغيل: node tests/e2e/reduced-motion.e2e.js */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { chromium } = require('playwright');
const snap = require('../../tools/snap.js');
const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
let failed = 0;
const check = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) failed++; console.log((ok ? '✅ ' : '❌ ') + name + (ok ? '' : `\n   المتوقع: ${JSON.stringify(want)}\n   الفعلي:  ${JSON.stringify(got)}`)); };

(async () => {
  const css = fs.readdirSync(path.join(ROOT, 'css')).filter(f => f.endsWith('.css')).map(f => fs.readFileSync(path.join(ROOT, 'css', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')).join('\n');
  check('لا !important في أي CSS', /!important/.test(css), false);
  check('site-polish.css محذوف ولا رابط له', [fs.existsSync(path.join(ROOT, 'css/site-polish.css')), /site-polish/.test(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8') + fs.readFileSync(path.join(ROOT, 'report.html'), 'utf8'))], [false, false]);

  const fixture = readJson('tests/fixtures/season.json'), overrides = readJson('tests/fixtures/overrides.json');
  const { srv, origin } = await snap.serve(ROOT);
  const browser = await chromium.launch();
  try {
    for (const light of [false, true]) {
      const { page, context } = await snap.openPage(browser, { fixture, overrides, now: fixture.exportedAt, origin, root: ROOT }, { width: 390, light, freeze: false });
      // ضابط سلبي: بحركة طبيعية لازم يوجد transition (وإلا الفحص أعمى)، ثم نطلب تقليل الحركة
      const live = await page.evaluate(() => [...document.querySelectorAll('*')].filter(el => getComputedStyle(el).transitionDuration.split(',').some(d => parseFloat(d) > 0)).length);
      check(`ضابط (${light ? 'فاتح' : 'داكن'}): بحركة طبيعية توجد عناصر متحركة`, live > 0, true);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      for (const tab of snap.TABS) {
        await page.evaluate(t => { const b = document.querySelector(`nav.tabs button[data-tab="${t}"]`); if (b) b.click(); }, tab);
        await page.waitForTimeout(120);
        const bad = await page.evaluate(() => {
          const out = [];
          document.querySelectorAll('*').forEach(el => {
            const cs = getComputedStyle(el);
            const td = cs.transitionDuration.split(',').some(d => parseFloat(d) > 0 && el.style.transition === '');
            const an = cs.animationName !== 'none' && cs.animationDuration.split(',').some(d => parseFloat(d) > 0);
            if (td || an) out.push(el.tagName + '.' + (el.className && el.className.baseVal === undefined ? el.className : '') + ' ' + cs.transitionDuration + ' ' + cs.animationName);
          });
          return out.slice(0, 8);
        });
        check(`تقليل الحركة (${light ? 'فاتح' : 'داكن'}) تبويب ${tab}: لا transition/animation نشطة`, bad, []);
      }
      await context.close();
    }
  } finally { await browser.close(); srv.close(); }
  console.log(failed ? `\n❌ ${failed} فشل` : '\n✅ كل الفحوص نجحت');
  process.exit(failed ? 1 : 0);
})();
