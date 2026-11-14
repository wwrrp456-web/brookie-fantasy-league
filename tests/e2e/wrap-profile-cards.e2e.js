/* اختبار 001-T023 (كرتا ملخص الموسم 1080×1350 والملف الشخصي 1080×1080): (أ) مطابقة بكسلية للقالب (داكن/فاتح، فرق ≤ 1%)،
 * (ب) تنزيل الملف بالوضعين باسم إنجليزي، (ج) المشاركة تمرّر الملف، (د) الكرت الناقص ما يُصدَّر برسالة عربية، (هـ) صفر إيموجي، (و) لقطات بيانات الموقع الحقيقية.
 * التشغيل: node tests/e2e/wrap-profile-cards.e2e.js */
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
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'wrap-profile-'));
  for (const [kind, size] of [['wrap', '1080×1350'], ['profile', '1080×1080']]) {
    const code = await compare.main(['--kind', kind, '--out', path.join(out, kind), '--max-pct', '1']);
    const sum = JSON.parse(fs.readFileSync(path.join(out, kind, 'summary.json'), 'utf8'));
    check(`${kind}: مطابق للقالب بكسليًا (داكن وفاتح، فرق ≤ 1%)`, [code, sum.length, sum.every(s => s.diffPct <= 1)], [0, 2, true]);
    check(`${kind}: الحجم ${size} بحجم المرجع`, sum.every(s => s.size === size && s.ref === size), true);
  }
  const src = fs.readFileSync(path.join(ROOT, 'js/ui/wrap-profile-cards.js'), 'utf8');
  check('صفر إيموجي في wrap-profile-cards.js', /\p{Extended_Pictographic}/u.test(src.replace(/[–·—]/g, '')), false);

  const fixture = readJson('tests/fixtures/season.json'), overrides = readJson('tests/fixtures/overrides.json');
  const { srv, origin } = await snap.serve(ROOT);
  const browser = await chromium.launch();
  try {
    const ctx = { fixture, overrides, now: fixture.exportedAt, origin, root: ROOT };
    const { page, context } = await snap.openPage(browser, ctx, { width: 390, light: false });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.evaluate(() => { document.getElementById('seasonWrapBtn').style.display = ''; localStorage.removeItem('brookie-card-theme'); });
    const info = await page.evaluate(() => ({ round: getCurrentRoundNumber(), pid: getRoundHeroes().top.id }));

    // لقطات بيانات الموقع الحقيقية (JPEG مصغّر)
    const shotDir = path.join(ROOT, 'specs/reports/img/001-T023');
    fs.mkdirSync(shotDir, { recursive: true });
    for (const theme of ['dark', 'light']) for (const kind of ['wrap', 'profile']) {
      const url = await page.evaluate(async ([k, t, pid]) => {
        const cv = k === 'wrap' ? await buildSeasonWrapCardCanvas({ theme: t }) : await buildParticipantProfileCardCanvas(pid, { theme: t });
        const sm = document.createElement('canvas'); sm.width = 540; sm.height = cv.height / 2;
        sm.getContext('2d').drawImage(cv, 0, 0, sm.width, sm.height);
        return sm.toDataURL('image/jpeg', 0.8);
      }, [kind, theme, info.pid]);
      fs.writeFileSync(path.join(shotDir, `${kind}-live-${theme}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
    }

    // ملخص الموسم: المعاينة + تنزيل ومشاركة
    await page.click('#seasonWrapBtn');
    await page.waitForSelector('#seasonWrapCanvas');
    check('معاينة الملخص 1080×1350', await page.evaluate(() => [seasonWrapCanvas.width, seasonWrapCanvas.height]), [1080, 1350]);
    const dl = async (btn, theme) => {
      await page.click(btn);
      await page.waitForSelector('#cardThemeSheet');
      const [d] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), page.click(`#cardThemeSheet .card-theme-opt[data-theme="${theme}"]`)]);
      const f = path.join(out, d.suggestedFilename());
      await d.saveAs(f);
      const buf = fs.readFileSync(f);
      return { name: d.suggestedFilename(), png: buf.slice(1, 4).toString() === 'PNG', w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
    };
    let r = await dl('#dlWrapBtn', 'dark');
    check('ملخص الموسم داكن: brookie-season-wrap-round-N-dark.png 1080×1350', [r.name, r.png, r.w, r.h], [`brookie-season-wrap-round-${info.round}-dark.png`, true, 1080, 1350]);
    r = await dl('#dlWrapBtn', 'light');
    check('ملخص الموسم فاتح: brookie-season-wrap-round-N-light.png 1080×1350', [r.name, r.png, r.w, r.h], [`brookie-season-wrap-round-${info.round}-light.png`, true, 1080, 1350]);
    await page.evaluate(() => { window.__shared = null; navigator.canShare = () => true; navigator.share = async d => { window.__shared = d.files[0].name; }; });
    await page.click('#shareWrapBtn');
    await page.waitForSelector('#cardThemeSheet');
    await page.click('#cardThemeSheet .card-theme-opt[data-theme="dark"]');
    await page.waitForFunction(() => window.__shared !== null, null, { timeout: 20000 });
    check('مشاركة الملخص تمرّر ملفًا باسم إنجليزي', await page.evaluate(() => window.__shared), `brookie-season-wrap-round-${info.round}-dark.png`);

    // الملف الشخصي: يُفتح من تبويب المشاركين
    await page.click('nav.tabs button[data-tab="participants"]');
    await page.evaluate(pid => { toggleParticipantProfile(pid); }, info.pid);
    await page.waitForSelector(`#dlProfileBtn-${info.pid}`);
    r = await dl(`#dlProfileBtn-${info.pid}`, 'light');
    check('الملف الشخصي فاتح: brookie-profile-ID-light.png 1080×1080', [r.name, r.png, r.w, r.h], [`brookie-profile-${info.pid}-light.png`, true, 1080, 1080]);
    r = await dl(`#dlProfileBtn-${info.pid}`, 'dark');
    check('الملف الشخصي داكن: brookie-profile-ID-dark.png 1080×1080', [r.name, r.png, r.w, r.h], [`brookie-profile-${info.pid}-dark.png`, true, 1080, 1080]);

    // الكرت الناقص ما يُصدَّر: أندية المشارك ناقصة
    await page.evaluate(pid => { const p = PARTICIPANTS.find(x => x.id === pid); p.teams = [p.teams[0]]; }, info.pid);
    let downloaded = false; page.on('download', () => { downloaded = true; });
    await page.click(`#dlProfileBtn-${info.pid}`);
    await page.waitForSelector('#cardThemeSheet');
    await page.click('#cardThemeSheet .card-theme-opt[data-theme="dark"]');
    await page.waitForFunction(pid => /تعذّر تجهيز/.test(document.getElementById(`profileMsg-${pid}`).textContent), info.pid, { timeout: 15000 });
    const msg = await page.evaluate(pid => document.getElementById(`profileMsg-${pid}`).textContent, info.pid);
    await page.waitForTimeout(500);
    check('الملف الناقص: رسالة عربية بالنواقص وبلا تنزيل', [/أندية .* ناقصة/.test(msg), downloaded], [true, false]);
    check('لا أخطاء JS', errors, []);
    await context.close();
  } finally { await browser.close(); srv.close(); }
  console.log(failed ? `\n❌ ${failed} فشل` : '\n✅ كل الفحوص نجحت');
  process.exit(failed ? 1 : 0);
})();
