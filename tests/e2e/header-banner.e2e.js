/* اختبار 001-P1: الهيدر على 360 و390 و1366 بالوضعين: العنوان «دوري بروكي الفانتازي» كامل بلا قص ولا تغطية بأزرار الإجراءات (قياس نص العنوان الفعلي)،
 * بلا تمرير أفقي، وشريط «حامل اللقب» سطر واحد ≤ 36px بفاصل ≥ 8px عن الهيدر بأيقونة درع لا إيموجي. التشغيل: node tests/e2e/header-banner.e2e.js */
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
      await page.evaluate(() => { CHAMPION_ID = 16; CHAMPION_FEATURES.top_banner = true; CHAMPION_FEATURES.animated_crown = true; renderChampionBanner(); renderChampionCrown(); });
      await page.waitForTimeout(150);
      const m = await page.evaluate(() => {
        const h1 = document.querySelector('header.app-header h1');
        const range = document.createRange(); range.selectNodeContents(h1);
        const t = range.getBoundingClientRect();                       // مستطيل النص الفعلي لا الصندوق
        const acts = document.querySelector('.header-actions').getBoundingClientRect();
        const hd = document.querySelector('header.app-header').getBoundingClientRect();
        const bn = document.querySelector('.champion-banner'), br = bn.getBoundingClientRect(), span = bn.querySelector('span') || bn;
        const inViewport = t.left >= 0 && t.right <= innerWidth;
        return {
          fullTitle: h1.textContent.trim() === 'دوري بروكي الفانتازي',
          textOverlapsActions: t.left < acts.right && t.right > acts.left && t.top < acts.bottom && t.bottom > acts.top,
          titleInViewport: inViewport,
          hOverflow: document.documentElement.scrollWidth - innerWidth,
          bannerH: Math.round(br.height), bannerGap: Math.round(br.top - hd.bottom),
          bannerOneLine: span.scrollHeight <= span.clientHeight + 1,
          bannerEmoji: /\p{Extended_Pictographic}/u.test(bn.textContent), bannerIcon: !!bn.querySelector('svg')
        };
      });
      const tag = `${w} ${light ? 'فاتح' : 'داكن'}`;
      check(`${tag}: العنوان كامل ولا يغطيه أي زر ولا يخرج عن الشاشة`, [m.fullTitle, m.textOverlapsActions, m.titleInViewport], [true, false, true]);
      check(`${tag}: بلا تمرير أفقي`, m.hOverflow <= 0, true);
      check(`${tag}: الشريط ≤ 36px بسطر واحد وفاصل ≥ 8px وأيقونة بلا إيموجي`, [m.bannerH <= 36, m.bannerOneLine, m.bannerGap >= 8, m.bannerIcon, m.bannerEmoji], [true, true, true, true, false]);
      await context.close();
    }
  } finally { await browser.close(); srv.close(); }
  console.log(failed ? `\n❌ ${failed} فشل` : '\n✅ كل الفحوص نجحت');
  process.exit(failed ? 1 : 0);
})();
