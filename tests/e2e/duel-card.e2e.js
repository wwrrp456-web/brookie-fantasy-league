/* اختبار 001-T024 (كرت مواجهة الجولة 1080×1350): (أ) مطابقة بكسلية للقالب (العادي والضغط × داكن/فاتح، فرق ≤ 1%)،
 * (ب) زر "مشاركة المواجهة" بالواجهة: نافذة الوضع، والمشاركة تمرّر الملف، والتنزيل البديل باسم إنجليزي، (ج) الكرت الناقص ما يُصدَّر برسالة عربية،
 * (د) صفر إيموجي، (هـ) لقطات بيانات الموقع الحقيقية. التشغيل: node tests/e2e/duel-card.e2e.js */
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
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'duel-diff-'));
  const code = await compare.main(['--kind', 'duel', '--out', out, '--max-pct', '1']);
  const sum = JSON.parse(fs.readFileSync(path.join(out, 'summary.json'), 'utf8'));
  check('كرت المواجهة مطابق للقالب بكسليًا (4 حالات، فرق ≤ 1%)', [code, sum.length, sum.every(s => s.diffPct <= 1)], [0, 4, true]);
  check('كل الكروت 1080×1350 بحجم المرجع', sum.every(s => s.size === '1080×1350' && s.ref === '1080×1350'), true);
  const src = fs.readFileSync(path.join(ROOT, 'js/ui/duel-card.js'), 'utf8');
  check('صفر إيموجي في duel-card.js', /\p{Extended_Pictographic}/u.test(src.replace(/[–·—]/g, '')), false);

  const fixture = readJson('tests/fixtures/season.json'), overrides = readJson('tests/fixtures/overrides.json');
  const { srv, origin } = await snap.serve(ROOT);
  const browser = await chromium.launch();
  try {
    const ctx = { fixture, overrides, now: fixture.exportedAt, origin, root: ROOT };
    const { page, context } = await snap.openPage(browser, ctx, { width: 390, light: false });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    // ميزة المواجهات العشوائية مطفأة بالـfixture (DATA.duelsEnabled=false): نفعّلها ونفتح القسم المطوي
    await page.evaluate(() => { localStorage.removeItem('brookie-card-theme'); DATA.duelsEnabled = true; renderWeeklyDuels(); const f = document.getElementById('foldDuels'); f.hidden = false; f.open = true; });
    const info = await page.evaluate(() => {
      const d = computeWeeklyDuels().filter(x => !x.bye);
      return { round: getCurrentRoundNumber(), n: d.length, a: d[0].a.id, b: d[0].b.id, buttons: document.querySelectorAll('.duel-share-btn').length };
    });
    check('زر مشاركة المواجهة بكل مواجهة', info.buttons, info.n);

    // لقطات بيانات الموقع الحقيقية (JPEG مصغّر)
    const shotDir = path.join(ROOT, 'specs/reports/img/001-T024');
    fs.mkdirSync(shotDir, { recursive: true });
    for (const theme of ['dark', 'light']) {
      const url = await page.evaluate(async ([t, a, b]) => {
        const cv = await buildDuelCardCanvas({ theme: t, data: getDuelCardData(a, b) });
        const sm = document.createElement('canvas'); sm.width = 540; sm.height = 675;
        sm.getContext('2d').drawImage(cv, 0, 0, 540, 675);
        return sm.toDataURL('image/jpeg', 0.8);
      }, [theme, info.a, info.b]);
      fs.writeFileSync(path.join(shotDir, `duel-live-${theme}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
    }

    const btn = '.duel-share-btn';
    // المشاركة بالوضع الفاتح
    await page.evaluate(() => { window.__shared = null; navigator.canShare = () => true; navigator.share = async d => { window.__shared = d.files[0].name; }; });
    await page.locator(btn).first().scrollIntoViewIfNeeded();
    await page.click(btn);
    await page.waitForSelector('#cardThemeSheet');
    check('الافتراضي يتبع ثيم الموقع (داكن)', await page.evaluate(() => document.querySelector('#cardThemeSheet .card-theme-opt.selected').dataset.theme), 'dark');
    await page.click('#cardThemeSheet .card-theme-opt[data-theme="light"]');
    await page.waitForFunction(() => window.__shared !== null, null, { timeout: 20000 });
    check('المشاركة تمرّر ملفًا باسم brookie-duel-round-N-A-B-light.png', await page.evaluate(() => window.__shared), `brookie-duel-round-${info.round}-${info.a}-${info.b}-light.png`);

    // بدون دعم المشاركة: ينزّل PNG 1080×1350
    await page.evaluate(() => { navigator.canShare = undefined; navigator.share = undefined; });
    await page.click(btn);
    await page.waitForSelector('#cardThemeSheet');
    const [d] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), page.click('#cardThemeSheet .card-theme-opt[data-theme="dark"]')]);
    const f = path.join(out, d.suggestedFilename()); await d.saveAs(f);
    const buf = fs.readFileSync(f);
    check('التنزيل البديل: brookie-duel-round-N-A-B-dark.png، PNG 1080×1350', [d.suggestedFilename(), buf.slice(1, 4).toString(), buf.readUInt32BE(16), buf.readUInt32BE(20)], [`brookie-duel-round-${info.round}-${info.a}-${info.b}-dark.png`, 'PNG', 1080, 1350]);

    // الكرت الناقص ما يُصدَّر
    await page.evaluate(a => { const p = PARTICIPANTS.find(x => x.id === a); p.teams = [p.teams[0]]; }, info.a);
    let downloaded = false; page.on('download', () => { downloaded = true; });
    await page.click(btn);
    await page.waitForSelector('#cardThemeSheet');
    await page.click('#cardThemeSheet .card-theme-opt[data-theme="dark"]');
    await page.waitForFunction(() => /تعذّر تجهيز/.test(document.querySelector('.duel-share-msg').textContent), null, { timeout: 15000 });
    const msg = await page.evaluate(() => document.querySelector('.duel-share-msg').textContent);
    await page.waitForTimeout(500);
    check('الكرت الناقص: رسالة عربية بالنواقص وبلا تنزيل', [/أندية .* ناقصة/.test(msg), downloaded], [true, false]);
    check('لا أخطاء JS', errors, []);
    await context.close();
  } finally { await browser.close(); srv.close(); }
  console.log(failed ? `\n❌ ${failed} فشل` : '\n✅ كل الفحوص نجحت');
  process.exit(failed ? 1 : 0);
})();
