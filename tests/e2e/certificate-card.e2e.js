/* اختبار 001-T026 (شهادة البطل 1080×1350 + حذف canvas-cards.js): (أ) مطابقة بكسلية للقالب (العادي والضغط × داكن/فاتح، فرق ≤ 1%)،
 * (ب) زرا المشاركة والتنزيل بتبويب البطل: نافذة الوضع، والاسم brookie-champion-certificate-<id>-<theme>.png، (ج) الشهادة الناقصة ما تُصدَّر برسالة عربية،
 * (د) أرقام التاريخ لاتينية، (هـ) لا مرجع لـcanvas-cards.js ولا للدوال المحذوفة ولا إيموجي، (و) لقطات بيانات الموقع الحقيقية.
 * التشغيل: node tests/e2e/certificate-card.e2e.js */
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
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'cert-diff-'));
  const code = await compare.main(['--kind', 'certificate', '--out', out, '--max-pct', '1']);
  const sum = JSON.parse(fs.readFileSync(path.join(out, 'summary.json'), 'utf8'));
  check('الشهادة مطابقة للقالب بكسليًا (4 حالات، فرق ≤ 1%)', [code, sum.length, sum.every(s => s.diffPct <= 1)], [0, 4, true]);
  check('كل الصور 1080×1350 بحجم المرجع', sum.every(s => s.size === '1080×1350' && s.ref === '1080×1350'), true);

  const src = fs.readFileSync(path.join(ROOT, 'js/ui/certificate-card.js'), 'utf8');
  check('صفر إيموجي في certificate-card.js', /\p{Extended_Pictographic}/u.test(src.replace(/[–·—]/g, '')), false);
  const all = ['index.html', 'tools/snap.js', 'tools/card-compare.js', 'tests/run.js'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).concat(fs.readdirSync(path.join(ROOT, 'js/ui')).concat(fs.readdirSync(path.join(ROOT, 'js/features')).map(f => '../features/' + f)).map(f => fs.readFileSync(path.join(ROOT, 'js/ui', f), 'utf8'))).join('\n');
  check('canvas-cards.js محذوف ولا مرجع له', [fs.existsSync(path.join(ROOT, 'js/ui/canvas-cards.js')), /canvas-cards\.js/.test(all.replace(/\/\*[\s\S]*?\*\//g, ''))], [false, false]);
  check('computeStoryLayout محذوفة', /computeStoryLayout/.test(all), false);

  const fixture = readJson('tests/fixtures/season.json'), overrides = readJson('tests/fixtures/overrides.json');
  const { srv, origin } = await snap.serve(ROOT);
  const browser = await chromium.launch();
  try {
    const ctx = { fixture, overrides, now: fixture.exportedAt, origin, root: ROOT };
    const { page, context } = await snap.openPage(browser, ctx, { width: 390, light: false });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const setup = () => page.evaluate(() => { CHAMPION_ID = 16; CHAMPION_FEATURES.certificate = true; CHAMPION_FEATURES.hero_card = true; localStorage.removeItem('brookie-card-theme'); renderChampionHero(); const b = document.getElementById('championCertBtn'); return !!b; });
    check('زر شهادة البطل موجود', await setup(), true);

    // لقطات بيانات الموقع الحقيقية
    const shotDir = path.join(ROOT, 'specs/reports/img/001-T026');
    fs.mkdirSync(shotDir, { recursive: true });
    for (const theme of ['dark', 'light']) {
      const url = await page.evaluate(async t => {
        const cv = await buildChampionCertificateCanvas({ theme: t, data: getCertificateCardData() });
        const sm = document.createElement('canvas'); sm.width = 540; sm.height = 675;
        sm.getContext('2d').drawImage(cv, 0, 0, 540, 675);
        return sm.toDataURL('image/jpeg', 0.8);
      }, theme);
      fs.writeFileSync(path.join(shotDir, `certificate-live-${theme}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
    }
    // أرقام التاريخ لاتينية
    check('التاريخ بأرقام لاتينية', await page.evaluate(() => /^[^٠-٩]*$/.test(formatDate(new Date(), { style: 'full' })) && /\d/.test(formatDate(new Date(), { style: 'full' }))), true);

    await page.click('#championCertBtn');
    await page.waitForSelector('#championCertCanvas');
    check('المعاينة 1080×1350', await page.evaluate(() => [championCertCanvas.width, championCertCanvas.height]), [1080, 1350]);

    const dl = async theme => {
      await page.click('#dlCertBtn');
      await page.waitForSelector('#cardThemeSheet');
      const pre = await page.evaluate(() => document.querySelector('#cardThemeSheet .card-theme-opt.selected').dataset.theme);
      const [d] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), page.click(`#cardThemeSheet .card-theme-opt[data-theme="${theme}"]`)]);
      const f = path.join(out, d.suggestedFilename()); await d.saveAs(f);
      const buf = fs.readFileSync(f);
      return { pre, name: d.suggestedFilename(), png: buf.slice(1, 4).toString(), w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
    };
    let r = await dl('dark');
    check('تنزيل الداكن: brookie-champion-certificate-16-dark.png، PNG 1080×1350', [r.name, r.png, r.w, r.h], ['brookie-champion-certificate-16-dark.png', 'PNG', 1080, 1350]);
    check('الافتراضي يتبع ثيم الموقع (داكن)', r.pre, 'dark');
    r = await dl('light');
    check('تنزيل الفاتح: brookie-champion-certificate-16-light.png', [r.name, r.png, r.w, r.h], ['brookie-champion-certificate-16-light.png', 'PNG', 1080, 1350]);

    await page.evaluate(() => { window.__shared = null; navigator.canShare = () => true; navigator.share = async d => { window.__shared = d.files[0].name; }; });
    await page.click('#shareCertBtn');
    await page.waitForSelector('#cardThemeSheet');
    await page.click('#cardThemeSheet .card-theme-opt[data-theme="light"]');
    await page.waitForFunction(() => window.__shared !== null, null, { timeout: 20000 });
    check('المشاركة تمرّر الملف بالاسم الإنجليزي', await page.evaluate(() => window.__shared), 'brookie-champion-certificate-16-light.png');

    // الشهادة الناقصة: بلا بطل ← رسالة عربية وبلا كانفس ولا تنزيل
    let downloaded = false; page.on('download', () => { downloaded = true; });
    await page.evaluate(() => { CHAMPION_ID = null; renderChampionHero(); });
    const none = await page.evaluate(async () => { try { await showChampionCertificate(); return { err: false }; } catch (e) { return { err: e.name }; } });
    const built = await page.evaluate(async () => { try { await buildChampionCertificateCanvas({ theme: 'dark' }); return 'built'; } catch (e) { return e.name + ':' + e.problems.join('|'); } });
    check('الشهادة بلا بطل ما تُبنى (CardDataError بالعربية)', built, 'CardDataError:لم يُحدَّد بطل الموسم السابق من تبويب المنظّم');
    // اسم فارغ ← نقص
    check('بيانات بلا اسم ما تُرسم', await page.evaluate(async () => { try { await buildChampionCertificateCanvas({ theme: 'dark', data: { name: ' ', seasonTitle: 'x', appreciation: 'x', signature: 'x', issuedAt: '2026-11-13T00:00:00Z' } }); return 'built'; } catch (e) { return e.problems.join('|'); } }), 'اسم البطل ناقص');
    check('بلا تنزيل ولا أخطاء JS', [downloaded, none.err, errors], [false, false, []]);
    await context.close();
  } finally { await browser.close(); srv.close(); }
  console.log(failed ? `\n❌ ${failed} فشل` : '\n✅ كل الفحوص نجحت');
  process.exit(failed ? 1 : 0);
})();
