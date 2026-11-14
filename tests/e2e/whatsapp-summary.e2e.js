/* اختبار 002-R20a: رسالة الواتساب لجولة 10 من الـfixture: تقرير سردي بلا جدول ولا مفتاح ولا فواصل ولا سطر «فوز=3»، بنصها الكامل المتوقع، وأقل من 700 حرف،
 * وزر النسخ يعرض النص نفسه. التشغيل: node tests/e2e/whatsapp-summary.e2e.js */
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
    const { page, context } = await snap.openPage(browser, { fixture, overrides, now: fixture.exportedAt, origin, root: ROOT }, { width: 390, light: false });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const text = await page.evaluate(() => buildWhatsAppSummary());
    // التقرير من محرك الصوت (S48b): حتمي، وحقائقه من الـfixture، وبلا جدول ولا مفتاح ولا فواصل
    const text2 = await page.evaluate(() => buildWhatsAppSummary());
    check('رسالة جولة 10: حتمية (نفس النص عند إعادة الاستدعاء)', text, text2);
    check('رسالة جولة 10: العنوان وبعده سطر فاضٍ', text.startsWith('*دوري بروكي الفانتازي · بعد الجولة 10*\n\n'), true);
    check('رسالة جولة 10: الحقائق من البيانات (بطل الجولة أبو أوس بـ6 نقاط، لطفي 92 نقطة، فارق نقطتين عن أيوب)',
      ['أبو أوس', '6 نقاط', 'لطفي', '92 نقطة', 'أيوب', 'نقطتين'].every(w => text.includes(w)), true);
    check('رسالة جولة 10: خاتمة تربط بالجولة 11', /الجولة 11/.test(text.split('\n\n').pop()), true);
    check('بلا الإجمالي ولا ▲▼ ولا فوز=3 ولا الفواصل', ['الإجمالي', '▲', '▼', 'فوز=3', '━', 'undefined', 'NaN'].some(w => text.includes(w)), false);
    check('بلا أسماء خارج السرد (أبو عزام)', text.includes('أبو عزام'), false);
    const words = text.replace(/\*/g, '').split(/\s+/).filter(Boolean).length;
    check('الطول 60 إلى 170 كلمة', words >= 60 && words <= 170, true);
    // زر النسخ: النص بمربع النسخ هو نفسه
    await page.evaluate(() => renderCopyBox());
    check('مربع النسخ يعرض الرسالة نفسها', await page.evaluate(() => document.getElementById('summaryArea').value), text);
    check('لا أخطاء JS', errors, []);
    await context.close();
  } finally { await browser.close(); srv.close(); }
  console.log(failed ? `\n❌ ${failed} فشل` : '\n✅ كل الفحوص نجحت');
  process.exit(failed ? 1 : 0);
})();
