/* اختبار 001-T025 (كرت نتائج أنديتي 1080×1350): (أ) مطابقة بكسلية للقالب (داكن/فاتح، فرق ≤ 1%)،
 * (ب) كتلة "نتائج أنديتي" داخل "حالتي": زر المشاركة، ونافذة الوضع، والمشاركة والتنزيل البديل باسم إنجليزي،
 * (ج) الحالة الفاضية (empty-state) لو ما فيه نتائج، (د) الكرت الناقص ما يُصدَّر برسالة عربية، (هـ) صفر إيموجي، (و) لقطات بيانات الموقع الحقيقية.
 * التشغيل: node tests/e2e/my-clubs-card.e2e.js */
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
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'myclubs-diff-'));
  const code = await compare.main(['--kind', 'myclubs', '--out', out, '--max-pct', '1']);
  const sum = JSON.parse(fs.readFileSync(path.join(out, 'summary.json'), 'utf8'));
  check('نتائج أنديتي مطابق للقالب بكسليًا (داكن وفاتح، فرق ≤ 1%)', [code, sum.length, sum.every(s => s.diffPct <= 1)], [0, 2, true]);
  check('الحجم 1080×1350 بحجم المرجع', sum.every(s => s.size === '1080×1350' && s.ref === '1080×1350'), true);
  const src = fs.readFileSync(path.join(ROOT, 'js/ui/my-clubs-card.js'), 'utf8');
  check('صفر إيموجي في my-clubs-card.js', /\p{Extended_Pictographic}/u.test(src.replace(/[–·—]/g, '')), false);

  const fixture = readJson('tests/fixtures/season.json'), overrides = readJson('tests/fixtures/overrides.json');
  const { srv, origin } = await snap.serve(ROOT);
  const browser = await chromium.launch();
  try {
    const ctx = { fixture, overrides, now: fixture.exportedAt, origin, root: ROOT };
    const { page, context } = await snap.openPage(browser, ctx, { width: 390, light: false });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const info = await page.evaluate(async () => {
      localStorage.removeItem('brookie-card-theme');
      const pid = getRoundHeroes().top.id;
      await applyMyId(pid);
      document.querySelector('.my-dash-more').open = true;
      return { round: getCurrentRoundNumber(), pid };
    });
    check('زر مشاركة نتائج أنديتي ظاهر لما فيه بيانات', await page.evaluate(() => !!document.getElementById('myClubsCardBtn')), true);

    // لقطات بيانات الموقع الحقيقية (JPEG مصغّر)
    const shotDir = path.join(ROOT, 'specs/reports/img/001-T025');
    fs.mkdirSync(shotDir, { recursive: true });
    for (const theme of ['dark', 'light']) {
      const url = await page.evaluate(async ([t, pid]) => {
        const cv = await buildMyClubsCardCanvas({ theme: t, data: getMyClubsCardData(pid) });
        const sm = document.createElement('canvas'); sm.width = 540; sm.height = 675;
        sm.getContext('2d').drawImage(cv, 0, 0, 540, 675);
        return sm.toDataURL('image/jpeg', 0.8);
      }, [theme, info.pid]);
      fs.writeFileSync(path.join(shotDir, `my-clubs-live-${theme}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
    }

    await page.evaluate(() => { window.__shared = null; navigator.canShare = () => true; navigator.share = async d => { window.__shared = d.files[0].name; }; });
    await page.click('#myClubsCardBtn');
    await page.waitForSelector('#cardThemeSheet');
    check('الافتراضي يتبع ثيم الموقع (داكن)', await page.evaluate(() => document.querySelector('#cardThemeSheet .card-theme-opt.selected').dataset.theme), 'dark');
    await page.click('#cardThemeSheet .card-theme-opt[data-theme="light"]');
    await page.waitForFunction(() => window.__shared !== null, null, { timeout: 20000 });
    check('المشاركة تمرّر brookie-my-clubs-round-N-ID-light.png', await page.evaluate(() => window.__shared), `brookie-my-clubs-round-${info.round}-${info.pid}-light.png`);

    await page.evaluate(() => { navigator.canShare = undefined; navigator.share = undefined; });
    await page.click('#myClubsCardBtn');
    await page.waitForSelector('#cardThemeSheet');
    const [d] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), page.click('#cardThemeSheet .card-theme-opt[data-theme="dark"]')]);
    const f = path.join(out, d.suggestedFilename()); await d.saveAs(f);
    const buf = fs.readFileSync(f);
    check('التنزيل البديل: PNG 1080×1350 باسم إنجليزي', [d.suggestedFilename(), buf.slice(1, 4).toString(), buf.readUInt32BE(16), buf.readUInt32BE(20)], [`brookie-my-clubs-round-${info.round}-${info.pid}-dark.png`, 'PNG', 1080, 1350]);

    // الكرت الناقص ما يُصدَّر
    await page.evaluate(pid => { const p = PARTICIPANTS.find(x => x.id === pid); p.teams = [p.teams[0]]; }, info.pid);
    let downloaded = false; page.on('download', () => { downloaded = true; });
    await page.click('#myClubsCardBtn');
    await page.waitForSelector('#cardThemeSheet');
    await page.click('#cardThemeSheet .card-theme-opt[data-theme="dark"]');
    await page.waitForFunction(() => /تعذّر تجهيز/.test(document.getElementById('myClubsCardMsg').textContent), null, { timeout: 15000 });
    const msg = await page.evaluate(() => document.getElementById('myClubsCardMsg').textContent);
    await page.waitForTimeout(500);
    check('الكرت الناقص: رسالة عربية بالنواقص وبلا تنزيل', [/أندية .* ناقصة/.test(msg), downloaded], [true, false]);

    // الحالة الفاضية: بلا جولات مسجّلة ← مكوّن empty-state وبلا زر
    await page.evaluate(() => { DATA.rounds.length = 0; renderMyDashboard(); });
    const empty = await page.evaluate(() => ({ btn: !!document.getElementById('myClubsCardBtn'), state: !!document.querySelector('.my-clubs-card-empty .empty-state'), text: (document.querySelector('.my-clubs-card-empty .empty-state-title') || {}).textContent }));
    check('بلا نتائج: حالة فاضية (empty-state) بلا زر', [empty.btn, empty.state, empty.text], [false, true, 'لا نتائج بعد']);
    check('لا أخطاء JS', errors, []);
    await context.close();
  } finally { await browser.close(); srv.close(); }
  console.log(failed ? `\n❌ ${failed} فشل` : '\n✅ كل الفحوص نجحت');
  process.exit(failed ? 1 : 0);
})();
