/* اختبار 002-T007 (S45): لغة الصفحة الأولى. لكل مشارك بالـfixture: نص «مشاركة ترتيبي» وكتلة «حالتي» وشريط الحالة بلا عدد/معدود مكسور
 * (3–10 بجانب مفرد، أو 1 و2 بالأرقام، أو 11+ بجمع)، وبلا «المتسابق/المتسابقين». التشغيل: node tests/e2e/first-page-language.e2e.js */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { chromium } = require('playwright');
const snap = require('../../tools/snap.js');
const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
let failed = 0;
const check = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) failed++; console.log((ok ? '✅ ' : '❌ ') + name + (ok ? '' : `\n   المتوقع: ${JSON.stringify(want)}\n   الفعلي: ${JSON.stringify(got)}`)); };

const BAD = [
  /(?:^|[^\d])(?:[12]|3|4|5|6|7|8|9|10)\s*\**\s(?:نقطة|جولة|مركز)(?![\p{L}])/u,         // 1–10 بالأرقام بجانب مفرد («2 نقطة»، «9 جولة»)
  /(?:^|[^\d])(?:1[1-9]|[2-9]\d)\s*\**\s(?:نقاط|جولات|مراكز)(?![\p{L}])/u,            // 11+ بجمع
  /بفارق بلا|ناقصني بلا|بفارق 0|(?:^|[^\d])0 نقطة/                                                    // الفارق صفر لا يُكتب «بفارق بلا نقاط»
];

(async () => {
  const fixture = readJson('tests/fixtures/season.json'), overrides = readJson('tests/fixtures/overrides.json');
  const { srv, origin } = await snap.serve(ROOT);
  const browser = await chromium.launch();
  try {
    const { page, context } = await snap.openPage(browser, { fixture, overrides, now: fixture.exportedAt, origin, root: ROOT }, { width: 390, light: false });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const out = await page.evaluate(() => PARTICIPANTS.map(p => {
      MY_ID = p.id; renderMyDashboard();
      const box = document.getElementById('myDashboardBox');
      return {id: p.id, share: buildMyRankShareText(), dash: box ? box.textContent : '', rivals: [...document.querySelectorAll('.my-dash-rival')].map(e => e.textContent)};
    }));
    const texts = out.flatMap(o => [o.share, o.dash, ...o.rivals]).filter(Boolean);
    check('كل المشاركين عندهم نص مشاركة وكتلة «حالتي»', out.every(o => o.share && o.dash), true);
    check('بلا عدد/معدود مكسور في الصفحة الأولى (الأرقام 1–10 بمفرد، و11+ بجمع)', texts.filter(t => BAD.some(re => re.test(t))), []);
    check('بلا «المتسابق/المتسابقين» في الصفحة', await page.evaluate(() => /المتسابق/.test(document.body.innerText)), false);
    const rivals = out.flatMap(o => o.rivals).join(' ');
    check('صيغة الفارق: «بفارق نقطة واحدة/نقطتين/N نقاط/N نقطة» إن وُجد', /بفارق (نقطة واحدة|نقطتين|\d+ نقاط|\d+ نقطة)/.test(rivals), true);
    check('لا أخطاء JS', errors, []);
    await context.close();
  } finally { await browser.close(); srv.close(); }
  console.log(failed ? `\n❌ ${failed} فشل` : '\n✅ كل الفحوص نجحت');
  process.exit(failed ? 1 : 0);
})();
