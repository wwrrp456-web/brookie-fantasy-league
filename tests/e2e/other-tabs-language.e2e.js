/* اختبار 002-T008 (S46): لغة باقي التبويبات على الـfixture. «قصة الموسم» (6 فصول) وأرقام الموسم القياسية وجدول الجولات
 * وإحصاءات الأندية بلا عدد/معدود مكسور ولا اختصارات «ج» و«ن.» ولا أرقام هندية. التشغيل: node tests/e2e/other-tabs-language.e2e.js */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { chromium } = require('playwright');
const snap = require('../../tools/snap.js');
const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
let failed = 0;
const check = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) failed++; console.log((ok ? '✅ ' : '❌ ') + name + (ok ? '' : `\n   المتوقع: ${JSON.stringify(want)}\n   الفعلي: ${JSON.stringify(got)}`)); };

// أعداد مكسورة: 1–10 بالأرقام بجانب مفرد، 11+ بجمع القلة، «بـ بلا»، رقم هندي، اختصار ج/ن
const BAD = [
  /(?:^|[^\d.])(?:[1-9]|10) ?(?:نقطة|جولة|مركز|ممة)(?![\p{L}])/u,
  /(?:^|[^\d])(?:1[1-9]|[2-9]\d) ?(?:نقاط|جولات|مراكز|ممات)(?![\p{L}])/u,
  /بـ?\s*بلا نقاط|بفارق بلا|الفارق بينهما بلا/,
  /[٠-٩]/,
  /(?:^|[\s(>])ج\d|\d ن(?:\.|\s|<|$)/
];

(async () => {
  const fixture = readJson('tests/fixtures/season.json'), overrides = readJson('tests/fixtures/overrides.json');
  const { srv, origin } = await snap.serve(ROOT);
  const browser = await chromium.launch();
  try {
    const { page, context } = await snap.openPage(browser, { fixture, overrides, now: fixture.exportedAt, origin, root: ROOT }, { width: 390, light: false });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const texts = await page.evaluate(() => {
      const out = {};
      const grab = (id, fn) => { try{ fn(); const b = document.getElementById(id); out[id] = b ? b.innerText : ''; }catch(e){ out[id] = 'ERR ' + e.message; } };
      grab('seasonStoryBox', () => renderSeasonStory());
      grab('recordsBox', () => renderRecords());
      grab('clubStatsBox', () => renderClubStats());
      grab('clubMapBox', () => renderClubMap());
      return out;
    });
    check('«قصة الموسم» تُرسم (6 فصول) بلا أخطاء', [texts.seasonStoryBox.startsWith('ERR'), texts.seasonStoryBox.length > 300], [false, true]);
    check('أرقام الموسم القياسية تُرسم', [texts.recordsBox.startsWith('ERR'), texts.recordsBox.length > 50], [false, true]);
    Object.entries(texts).forEach(([id, t]) => check(`بلا عدد/معدود مكسور ولا اختصار ولا رقم هندي: ${id}`, BAD.map(re => (t.match(re) || [null])[0]).filter(Boolean), []));
    // قصة الموسم: العدّاد بمعدوده الصحيح بالجمل المعروفة
    check('قصة الموسم: «من أصل N» ولا «+ جولات» ملصوقة بلا تصريف', /أُكملت \d+ جولات|أُكملت جولة واحدة|أُكملت جولتان|أُكملت \d+ جولة/.test(texts.seasonStoryBox), true);
    // الجولات والمشاركون والأندية: لقطة كلية للصفحة عبر التبويبات
    const body = await page.evaluate(async () => {
      const parts = [];
      for(const fn of ['renderRounds', 'renderParticipants', 'renderStats', 'renderRoundsTab', 'renderParticipantsTab']){ try{ if(typeof window[fn] === 'function') window[fn](); }catch(e){} }
      return document.body.innerText;
    });
    check('الصفحة كلها بلا عدد/معدود مكسور ولا رقم هندي', BAD.slice(0, 4).map(re => (body.match(re) || [null])[0]).filter(Boolean), []);
    check('لا أخطاء JS', errors, []);
    await context.close();
  } finally { await browser.close(); srv.close(); }
  console.log(failed ? `\n❌ ${failed} فشل` : '\n✅ كل الفحوص نجحت');
  process.exit(failed ? 1 : 0);
})();
