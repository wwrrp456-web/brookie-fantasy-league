/* اختبار شامل لـ001-T021/T022 (بطاقة الترتيب 1080×1920): (أ) مطابقة بكسلية للقالب المرجع، (ب) n=18 و24 وأطول اسم بالوضعين بلا تداخل،
 * (ج) تنزيل الملف بالوضعين باسم إنجليزي وبحجم صحيح، واختيار الوضع يُحفظ والافتراضي يتبع ثيم الموقع، (د) الكرت الناقص ما يُصدَّر برسالة عربية.
 * يخدم الصفحة من خادم محلي (الكانفس ما يتلوّث بـfile://). التشغيل: node tests/e2e/standings-card.e2e.js  (يحتاج Playwright). exit 1 لو فشل شيء. */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { chromium } = require('playwright');
const snap = require('../../tools/snap.js');
const compare = require('../../tools/card-compare.js');
const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));

let failed = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log((ok ? '✅ ' : '❌ ') + name + (ok ? '' : `\n   المتوقع: ${JSON.stringify(want)}\n   الفعلي:  ${JSON.stringify(got)}`));
};

(async () => {
  // (أ)+(ب) مقارنة بكسلية: 8 حالات (20/18/24/أطول اسم × داكن/فاتح)، والفرق المقبول ≤ 1% (حواف النص والأسهم)
  const os = require('os');
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'card-diff-'));
  const code = await compare.main(['--out', out, '--max-pct', '1']);
  const sum = JSON.parse(fs.readFileSync(path.join(out, 'summary.json'), 'utf8'));
  check('بطاقة الترتيب مطابقة للقالب بكسليًا (8 حالات، فرق ≤ 1%)', [code, sum.length, sum.every(s => s.diffPct <= 1)], [0, 8, true]);
  check('كل البطاقات 1080×1920 بحجم المرجع', sum.every(s => s.size === '1080×1920' && s.ref === '1080×1920'), true);

  const fixture = readJson('tests/fixtures/season.json'), overrides = readJson('tests/fixtures/overrides.json');
  const { srv, origin } = await snap.serve(ROOT);
  const browser = await chromium.launch();
  try {
    const ctx = { fixture, overrides, now: fixture.exportedAt, origin, root: ROOT };
    // (ج) التنزيل بالوضعين
    const { page, context } = await snap.openPage(browser, ctx, { width: 390, light: false });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.evaluate(() => { ['dlStandingsBtn', 'shareStandingsBtn'].forEach(i => { document.getElementById(i).style.display = ''; }); localStorage.removeItem('brookie-card-theme'); });
    const round = await page.evaluate(() => getCurrentRoundNumber());
    const dl = async theme => {
      await page.click('#dlStandingsBtn');
      await page.waitForSelector('#cardThemeSheet');
      const pre = await page.evaluate(() => document.querySelector('#cardThemeSheet .card-theme-opt.selected').dataset.theme);
      const [d] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), page.click(`#cardThemeSheet .card-theme-opt[data-theme="${theme}"]`)]);
      const f = path.join(out, d.suggestedFilename());
      await d.saveAs(f);
      const buf = fs.readFileSync(f);
      return { pre, name: d.suggestedFilename(), png: buf.slice(1, 4).toString() === 'PNG', w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), size: buf.length };
    };
    const a = await dl('dark');
    check('تنزيل الداكن: الاسم brookie-standings-round-N-dark.png، PNG 1080×1920', [a.name, a.png, a.w, a.h], [`brookie-standings-round-${round}-dark.png`, true, 1080, 1920]);
    check('الافتراضي يتبع ثيم الموقع (داكن)', a.pre, 'dark');
    const b = await dl('light');
    check('تنزيل الفاتح: brookie-standings-round-N-light.png، PNG 1080×1920', [b.name, b.png, b.w, b.h], [`brookie-standings-round-${round}-light.png`, true, 1080, 1920]);
    check('اختيار المشارك يُحفظ ويظهر محدَّدًا بالمرة الجاية', await (async () => { await page.click('#dlStandingsBtn'); await page.waitForSelector('#cardThemeSheet'); const v = await page.evaluate(() => [localStorage.getItem('brookie-card-theme'), document.querySelector('#cardThemeSheet .card-theme-opt.selected').dataset.theme]); await page.click('#cardThemeSheet .card-theme-cancel'); return v; })(), ['light', 'light']);
    check('الإلغاء ما يصدّر شيئًا ويغلق النافذة', await page.evaluate(() => !document.getElementById('cardThemeSheet')), true);

    // المشاركة: تفتح نفس الخيار وتمرّر ملفًا بالاسم الإنجليزي
    await page.evaluate(() => { window.__shared = null; navigator.canShare = () => true; navigator.share = async d => { window.__shared = d.files[0].name; }; });
    await page.click('#shareStandingsBtn');
    await page.waitForSelector('#cardThemeSheet');
    await page.click('#cardThemeSheet .card-theme-opt[data-theme="dark"]');
    await page.waitForFunction(() => window.__shared !== null, null, { timeout: 20000 });
    check('المشاركة تمرّر ملفًا باسم إنجليزي بالوضع المختار', await page.evaluate(() => window.__shared), `brookie-standings-round-${round}-dark.png`);

    // الافتراضي يتبع ثيم الموقع الفاتح لو ما اختار المشارك سابقًا
    await page.evaluate(() => { localStorage.removeItem('brookie-card-theme'); document.documentElement.classList.add('light-mode'); });
    check('الافتراضي يتبع ثيم الموقع (فاتح) لو ما فيه اختيار محفوظ', await page.evaluate(() => getStandingsCardTheme()), 'light');

    // (د) كرت ناقص ما يُصدَّر
    await page.evaluate(() => { PARTICIPANTS[0].teams = [PARTICIPANTS[0].teams[0]]; });
    let downloaded = false; page.on('download', () => { downloaded = true; });
    await page.click('#dlStandingsBtn');
    await page.waitForSelector('#cardThemeSheet');
    await page.click('#cardThemeSheet .card-theme-opt[data-theme="dark"]');
    await page.waitForFunction(() => /تعذّر تجهيز/.test(document.getElementById('standingsImgBox').textContent), null, { timeout: 15000 });
    const msg = await page.evaluate(() => document.getElementById('standingsImgBox').textContent);
    await page.waitForTimeout(500);
    check('الكرت الناقص: رسالة عربية بالنواقص وبلا تنزيل', [/أندية .* ناقصة/.test(msg), downloaded], [true, false]);
    check('لا أخطاء JS', errors, []);
    await context.close();
  } finally { await browser.close(); srv.close(); }
  console.log(failed ? `\n❌ ${failed} فشل` : '\n✅ كل الفحوص نجحت');
  process.exit(failed ? 1 : 0);
})();
