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

const EXPECTED = [
  '🏆 *دوري بروكي الفانتازي · الموسم الثاني*',
  '📅 تحديث بعد الجولة 10',
  '',
  '📝 بعد الجولة 10، *لطفي* يتصدّر جدول الترتيب العام برصيد 92 نقطة بفارق نقطتين عن أيوب. 5 مشاركين صعدوا مركزين دفعة واحدة في جدول الترتيب (أولهم العندليب). بالمقابل، أبو تغريد (زيد) وأبو رمزي تراجعا 4 مراكز في الجدول نفسه.',
  '',
  '👑 بطل الجولة: *أبو أوس* بـ6 نقاط بعد كسر التعادل',
  '',
  'شدّوا الهمّة يا جماعة، فالجولة 11 ما تنتظر أحدًا!'
].join('\n');

(async () => {
  const fixture = readJson('tests/fixtures/season.json'), overrides = readJson('tests/fixtures/overrides.json');
  const { srv, origin } = await snap.serve(ROOT);
  const browser = await chromium.launch();
  try {
    const { page, context } = await snap.openPage(browser, { fixture, overrides, now: fixture.exportedAt, origin, root: ROOT }, { width: 390, light: false });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const text = await page.evaluate(() => buildWhatsAppSummary());
    check('رسالة جولة 10 بنصها الكامل المتوقع', text, EXPECTED);
    check('بلا الإجمالي ولا ▲▼ ولا فوز=3 ولا الفواصل ولا ممة 💀', ['الإجمالي', '▲', '▼', 'فوز=3', '━', 'ممة 💀'].some(w => text.includes(w)), false);
    check('بلا أسماء خارج السرد (مصطفى عبده · أبو عزام · أبو شيخة)', ['مصطفى عبده', 'أبو عزام', 'أبو شيخة'].some(w => text.includes(w)), false);
    check('الطول < 700 حرف', text.length < 700, true);
    // زر النسخ: النص بمربع النسخ هو نفسه
    await page.evaluate(() => renderCopyBox());
    check('مربع النسخ يعرض الرسالة نفسها', await page.evaluate(() => document.getElementById('summaryArea').value), text);
    check('لا أخطاء JS', errors, []);
    await context.close();
  } finally { await browser.close(); srv.close(); }
  console.log(failed ? `\n❌ ${failed} فشل` : '\n✅ كل الفحوص نجحت');
  process.exit(failed ? 1 : 0);
})();
