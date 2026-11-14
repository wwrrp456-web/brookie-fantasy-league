/* اختبار 002-T009 (S47): لغة المنظّم وتقرير المجتمع. pointsLabelSafe (نقاط من بيانات غير موثوقة) بحالاتها الحدّية، وتاريخ سجل النشاط
 * بأرقام لاتينية، وأقسام المنظّم بالصفحة بلا «المتسابق» ولا «تحدي الجولة» ولا أرقام هندية. التشغيل: node tests/e2e/admin-report-language.e2e.js */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { chromium } = require('playwright');
const snap = require('../../tools/snap.js');
const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
let failed = 0;
const check = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) failed++; console.log((ok ? '✅ ' : '❌ ') + name + (ok ? '' : `\n   المتوقع: ${JSON.stringify(want)}\n   الفعلي: ${JSON.stringify(got)}`)); };

(async () => {
  const fixture = readJson('tests/fixtures/season.json'), overrides = readJson('tests/fixtures/overrides.json');
  const { srv, origin } = await snap.serve(ROOT);
  const browser = await chromium.launch();
  try {
    const { page, context } = await snap.openPage(browser, { fixture, overrides, now: fixture.exportedAt, origin, root: ROOT }, { width: 390, light: false });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const r = await page.evaluate(() => ({
      pts: [0, 1, 2, 3, 10, 11, '6', 7.5, '', null, '<b>x</b>'].map(v => pointsLabelSafe(v)),
      dt: formatDate(1762000000000, {style: 'datetime'}),
      bodyText: document.documentElement.innerText + ' ' + document.documentElement.innerHTML.replace(/<[^>]+>/g, ' ')
    }));
    check('pointsLabelSafe: 0 ← بلا نقاط، 1 ← نقطة واحدة، 2 ← نقطتان، 3–10 ← جمع، 11 ← نقطة', r.pts.slice(0, 6), ['بلا نقاط', 'نقطة واحدة', 'نقطتان', '3 نقاط', '10 نقاط', '11 نقطة']);
    check('pointsLabelSafe: نص رقمي «6» ← 6 نقاط', r.pts[6], '6 نقاط');
    check('pointsLabelSafe: غير صحيح (7.5 وفارغ وnull) يُعرض كما هو بلا انهيار، والوسوم مهرَّبة', [r.pts[7], r.pts[8], r.pts[9], r.pts[10]], ['7.5', '', '', '&lt;b&gt;x&lt;/b&gt;']);
    check('تاريخ سجل النشاط بأرقام لاتينية', /[٠-٩]/.test(r.dt), false);
    check('الصفحة (تبويب المنظّم) بلا «المتسابق» ولا «تحدي الجولة» ولا أرقام هندية', ['المتسابق', 'تحدي الجولة'].some(w => r.bodyText.includes(w)) || /[٠-٩]/.test(r.bodyText), false);
    check('لا أخطاء JS', errors, []);
    await context.close();
  } finally { await browser.close(); srv.close(); }
  console.log(failed ? `\n❌ ${failed} فشل` : '\n✅ كل الفحوص نجحت');
  process.exit(failed ? 1 : 0);
})();
