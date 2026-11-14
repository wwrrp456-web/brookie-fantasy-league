/* اختبار 001-T022b (كرت بطل الجولة 1080×1350): (أ) مطابقة بكسلية للقالب (العادي والضغط × داكن/فاتح، فرق ≤ 1%)،
 * (ب) تنزيل الملف بالوضعين باسم brookie-champion-round-<N>-<dark|light>.png، (ج) المشاركة تمرّر الملف، (د) الكرت الناقص ما يُصدَّر برسالة عربية،
 * (هـ) صفر إيموجي في ملف الكرت، (و) لقطة بيانات الموقع الحقيقية (specs/reports/img/001-T022b/). التشغيل: node tests/e2e/champion-card.e2e.js */
const fs = require('fs');
const os = require('os');
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
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'champion-diff-'));
  const code = await compare.main(['--kind', 'champion', '--out', out, '--max-pct', '1']);
  const sum = JSON.parse(fs.readFileSync(path.join(out, 'summary.json'), 'utf8'));
  check('كرت البطل مطابق للقالب بكسليًا (4 حالات، فرق ≤ 1%)', [code, sum.length, sum.every(s => s.diffPct <= 1)], [0, 4, true]);
  check('كل الكروت 1080×1350 بحجم المرجع', sum.every(s => s.size === '1080×1350' && s.ref === '1080×1350'), true);

  const src = fs.readFileSync(path.join(ROOT, 'js/ui/champion-card.js'), 'utf8');
  check('صفر إيموجي في champion-card.js', /\p{Extended_Pictographic}/u.test(src.replace(/[–·—]/g, '')), false);

  const fixture = readJson('tests/fixtures/season.json'), overrides = readJson('tests/fixtures/overrides.json');
  const { srv, origin } = await snap.serve(ROOT);
  const browser = await chromium.launch();
  try {
    const ctx = { fixture, overrides, now: fixture.exportedAt, origin, root: ROOT };
    const { page, context } = await snap.openPage(browser, ctx, { width: 390, light: false });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.evaluate(() => { document.getElementById('champCardBtn').style.display = ''; localStorage.removeItem('brookie-card-theme'); });
    const info = await page.evaluate(() => { const d = getChampionCardData(); return { round: d.round, name: d.name, clubs: d.clubs.length }; });
    await page.click('#champCardBtn');
    await page.waitForSelector('#championCanvas');
    check('المعاينة 1080×1350', await page.evaluate(() => [championCanvas.width, championCanvas.height]), [1080, 1350]);
    // لقطة بيانات الموقع الحقيقية (JPEG مصغّر)
    const shotDir = path.join(ROOT, 'specs/reports/img/001-T022b');
    fs.mkdirSync(shotDir, { recursive: true });
    for (const theme of ['dark', 'light']) {
      const url = await page.evaluate(async t => {
        const cv = await buildChampionCardCanvas({ theme: t });
        const sm = document.createElement('canvas'); sm.width = 540; sm.height = 675;
        sm.getContext('2d').drawImage(cv, 0, 0, 540, 675);
        return sm.toDataURL('image/jpeg', 0.8);
      }, theme);
      fs.writeFileSync(path.join(shotDir, `champion-live-${theme}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
    }

    const dl = async theme => {
      await page.click('#dlCardBtn');
      await page.waitForSelector('#cardThemeSheet');
      const pre = await page.evaluate(() => document.querySelector('#cardThemeSheet .card-theme-opt.selected').dataset.theme);
      const [d] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), page.click(`#cardThemeSheet .card-theme-opt[data-theme="${theme}"]`)]);
      const f = path.join(out, d.suggestedFilename());
      await d.saveAs(f);
      const buf = fs.readFileSync(f);
      return { pre, name: d.suggestedFilename(), png: buf.slice(1, 4).toString() === 'PNG', w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
    };
    const a = await dl('dark');
    check('تنزيل الداكن: brookie-champion-round-N-dark.png، PNG 1080×1350', [a.name, a.png, a.w, a.h], [`brookie-champion-round-${info.round}-dark.png`, true, 1080, 1350]);
    check('الافتراضي يتبع ثيم الموقع (داكن)', a.pre, 'dark');
    const b = await dl('light');
    check('تنزيل الفاتح: brookie-champion-round-N-light.png، PNG 1080×1350', [b.name, b.png, b.w, b.h], [`brookie-champion-round-${info.round}-light.png`, true, 1080, 1350]);

    await page.evaluate(() => { window.__shared = null; navigator.canShare = () => true; navigator.share = async d => { window.__shared = d.files[0].name; }; });
    await page.click('#shareCardBtn');
    await page.waitForSelector('#cardThemeSheet');
    await page.click('#cardThemeSheet .card-theme-opt[data-theme="light"]');
    await page.waitForFunction(() => window.__shared !== null, null, { timeout: 20000 });
    check('المشاركة تمرّر ملفًا باسم إنجليزي بالوضع المختار', await page.evaluate(() => window.__shared), `brookie-champion-round-${info.round}-light.png`);

    // الكرت الناقص ما يُصدَّر: نادٍ واحد فقط للبطل
    await page.evaluate(() => { const id = getRoundHeroes().top.id; PARTICIPANTS.find(p => p.id === id).teams = [PARTICIPANTS.find(p => p.id === id).teams[0]]; });
    let downloaded = false; page.on('download', () => { downloaded = true; });
    await page.click('#dlCardBtn');
    await page.waitForSelector('#cardThemeSheet');
    await page.click('#cardThemeSheet .card-theme-opt[data-theme="dark"]');
    await page.waitForFunction(() => /تعذّر تجهيز/.test(document.querySelector('.champ-msg').textContent), null, { timeout: 15000 });
    const msg = await page.evaluate(() => document.querySelector('.champ-msg').textContent);
    await page.waitForTimeout(500);
    check('الكرت الناقص: رسالة عربية بالنواقص وبلا تنزيل', [/أندية البطل ناقصة/.test(msg), downloaded], [true, false]);
    check('لا أخطاء JS', errors, []);
    await context.close();
  } finally { await browser.close(); srv.close(); }
  console.log(failed ? `\n❌ ${failed} فشل` : '\n✅ كل الفحوص نجحت');
  process.exit(failed ? 1 : 0);
})();
