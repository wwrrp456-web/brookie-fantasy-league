/* اختبار 002-R21b (S50): بطاقة «منافس الجولة» بالصفحة الأولى + زر «نسخ للواتساب» للمنظّم. التشغيل: node tests/e2e/spotlight-card.e2e.js
 * يلتقط لقطات JPEG (390 و1366، داكن وفاتح) إلى مجلد --shots لو مُرّر. */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { chromium } = require('playwright');
const snap = require('../../tools/snap.js');
const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
let failed = 0;
const check = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) failed++; console.log((ok ? '✅ ' : '❌ ') + name + (ok ? '' : `\n   المتوقع: ${JSON.stringify(want)}\n   الفعلي: ${JSON.stringify(got)}`)); };
const shotsDir = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
const EMOJI = /\p{Extended_Pictographic}/u;

(async () => {
  const fixture = readJson('tests/fixtures/season.json'), overrides = readJson('tests/fixtures/overrides.json');
  const { srv, origin } = await snap.serve(ROOT);
  const browser = await chromium.launch();
  try {
    const { page, context } = await snap.openPage(browser, { fixture, overrides, now: fixture.exportedAt, origin, root: ROOT }, { width: 390, light: false });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const info = await page.evaluate(() => {
      _spCache = {key: null, val: null}; const t0 = performance.now(); renderSpotlightCard(); const t1 = performance.now(); renderSpotlightCard(); const t2 = performance.now();
      const card = document.querySelector('.spotlight-card');
      const rep = spotlightCurrentReport();
      return {has: !!card, kicker: card && card.querySelector('.spotlight-kicker').textContent, title: card && card.querySelector('.spotlight-title').textContent,
        paras: card ? card.querySelectorAll('.spotlight-p').length : 0, crests: card ? card.querySelectorAll('.spotlight-crests img.crest').length : 0,
        btnPublic: !!document.getElementById('copySpotlightBtn'), first: Math.round(t1 - t0), cached: Math.round(t2 - t1),
        round: getCurrentRoundNumber(), name: rep && rep.name, cardText: card && card.innerText, repTitle: rep && rep.title,
        same: JSON.stringify(spotlightCurrentReport()) === JSON.stringify(rep), words: rep && rep.words, len: rep && rep.len};
    });
    check('البطاقة تظهر للجميع بالصفحة الأولى بعنوان الجولة الحالية', [info.has, info.kicker], [true, `منافس الجولة ${info.round}`]);
    check('عنوان التقرير هو عنوان القالب، وفيه ≥ 2 فقرة، و3 شعارات أندية للمنافس', [info.title === info.repTitle, info.paras >= 2, info.crests], [true, true, 3]);
    check('زر «نسخ للواتساب» لا يظهر لغير المنظّم', info.btnPublic, false);
    check('بلا إيموجي في البطاقة (الواجهة)', EMOJI.test(info.cardText || ''), false);
    check('حتمي (نفس التقرير عند الإعادة) والرسم الثاني من الذاكرة (أسرع)', [info.same, info.cached <= info.first], [true, true]);
    console.log(`   (الرسم الأول ${info.first}ms، المخبّأ ${info.cached}ms، ${info.words} كلمة، نسخة ${info.len})`);
    check('الرسم الأول < 800ms', info.first < 800, true);

    // المنظّم: الزر يظهر وينسخ نص الواتساب بلا إيموجي ولا HTML
    await page.evaluate(() => { window.__copied = null; Object.defineProperty(navigator, 'clipboard', {value: {writeText: async t => { window.__copied = t; }}, configurable: true}); isAdmin = true; renderSpotlightCard(); });
    const admin = await page.evaluate(async () => {
      const b = document.getElementById('copySpotlightBtn'); if(!b) return {btn: false};
      b.click(); await new Promise(r => setTimeout(r, 50));
      return {btn: true, copied: window.__copied, expect: spotlightCurrentReport().text, msg: document.getElementById('spotlightMsg').innerText};
    });
    check('للمنظّم: الزر يظهر وينسخ نص التقرير نفسه', [admin.btn, admin.copied === admin.expect], [true, true]);
    check('نص الواتساب: عنوان بنجمتين، بلا HTML، وبلا إيموجي (R-24)', [/^\*[^*]+\*\n\n/.test(admin.copied || ''), /<[a-z]/i.test(admin.copied || ''), EMOJI.test(admin.copied || '')], [true, false, false]);
    check('رسالة تأكيد النسخ تظهر', /تم نسخ التقرير/.test(admin.msg || ''), true);
    await page.evaluate(() => { isAdmin = false; renderSpotlightCard(); });
    // R-24: عدد الدوريات بفصل القصة يُحسب من البيانات (لا رقم يدوي)
    const lg = await page.evaluate(() => { renderSeasonStory(); const t = document.getElementById('seasonStoryBox').innerText; return {t, n: new Set(CLUBS.map(c => CLUB_LEAGUE_MAP[c] || 'أخرى')).size}; });
    check('قصة الموسم: عدد الدوريات من البيانات بمعدوده الصحيح', lg.t.includes(`من ${lg.n} دوريًا حول العالم`), true);
    check('لا أخطاء JS', errors, []);

    if (shotsDir) {
      fs.mkdirSync(shotsDir, { recursive: true });
      for (const [w, light] of [[390, false], [390, true], [1366, false], [1366, true]]) {
        const ctx2 = await snap.openPage(browser, { fixture, overrides, now: fixture.exportedAt, origin, root: ROOT }, { width: w, light });
        const el = await ctx2.page.$('.spotlight-card');
        if (el) { await el.scrollIntoViewIfNeeded(); await el.screenshot({ path: path.join(shotsDir, `spotlight-${w}-${light ? 'light' : 'dark'}.jpg`), type: 'jpeg', quality: 72 }); }
        await ctx2.context.close();
      }
    }
    await context.close();
  } finally { await browser.close(); srv.close(); }
  console.log(failed ? `\n❌ ${failed} فشل` : '\n✅ كل الفحوص نجحت');
  process.exit(failed ? 1 : 0);
})();
