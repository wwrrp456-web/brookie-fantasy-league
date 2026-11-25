/* اختبار S68 (قاعدة الممة الموحّدة): كل العروض تتفق. جولة «كلهم بلا مباراة» = «بلا مباراة» محايدة (لا ممة ولا لون ممة)،
 * وجولة «خسارة نادٍ + الباقي بلا مباراة» = ممة. نحقن جولتين لمشارك واحد داخل الصفحة (بلا كتابة على Firebase).
 * التشغيل: node tests/e2e/mumma-rule.e2e.js [--shots]  (يحتاج Playwright؛ ليس جزءًا من tests/run.js). exit 1 لو فشل شيء. */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const ff = require(path.join(ROOT, 'tools/fake-firebase.js'));
const { chromium } = require('playwright');
const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const SHOTS = process.argv.includes('--shots');
let failed = 0;
const check = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) failed++; console.log((ok ? '✅ ' : '❌ ') + name + (ok ? '' : `\n   المتوقع: ${JSON.stringify(want)}\n   الفعلي:  ${JSON.stringify(got)}`)); };

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
    await page.addInitScript(() => { try { localStorage.setItem('brookie-onboarded', '1'); } catch (e) {} });
    await ff.install(page, { fixture: readJson('tests/fixtures/season.json'), overrides: readJson('tests/fixtures/overrides.json') });
    await page.goto('file://' + path.join(ROOT, 'index.html'));
    await page.waitForTimeout(1500);
    const w0 = await page.evaluate(() => (window.__FAKE_FIREBASE__ ? window.__FAKE_FIREBASE__.writes : 0));

    // نحقن: جولة 901 «خسارة نادٍ + الباقي بلا مباراة» (ممة)، وجولة 902 «كلهم بلا مباراة» (ليست ممة) لأول مشارك
    const info = await page.evaluate(() => {
      const p = PARTICIPANTS[0];
      const mk = (n, res) => ({ number: n, entries: { [p.id]: res.map((result, ti) => ({ ti, result, gf: 0, ga: 0 })) } });
      const before = computeStandings().find(s => s.id === p.id);
      DATA.rounds.push(mk(901, ['loss', 'no_match', 'no_match']), mk(902, ['no_match', 'no_match', 'no_match']));
      const after = computeStandings().find(s => s.id === p.id);
      const hist = buildParticipantHistory(p.id).slice(-2).map(h => [h.number, h.played, h.points]);
      renderStandings(); renderParticipants();
      return { pid: p.id, name: p.name, mumDelta: after.mummaCount - before.mummaCount, streakAfter: after.streak, hist };
    });
    check('المحرك: جولة الخسارة تضيف ممة واحدة فقط (وجولة «بلا مباراة» لا تضيف)', info.mumDelta, 1);
    check('buildParticipantHistory: played لكل جولة', info.hist, [[901, true, 0], [902, false, 0]]);

    // جدول الترتيب: صف التفاصيل (جدول الجولات)
    const rows = await page.evaluate(pid => {
      const tbl = document.querySelector(`#expand-${pid}`);
      const trs = [...tbl.querySelectorAll('tbody tr')].filter(tr => /الجولة 90[12]/.test(tr.textContent));
      const pills = [...tbl.querySelectorAll('.quick-hist-pill')].slice(-2).map(e => e.className.replace('quick-hist-pill', '').trim());
      return { rows: trs.map(tr => tr.cells[1].textContent.replace(/\s+/g, ' ').trim()), pills };
    }, info.pid);
    check('جدول الترتيب: جولة الخسارة «0 ممة»، وجولة بلا مباراة «بلا مباراة» بلا كلمة ممة', rows.rows, ['0 ممة', 'بلا مباراة']);
    check('حبوب آخر الجولات: mumma ثم no-match (بلا لون ممة للثانية)', rows.pills, ['mumma', 'no-match']);

    // تبويب المشاركين: بطاقة المشارك (الشريط والإحصاءات)
    const card = await page.evaluate(pid => {
      const c = document.getElementById(`participant-card-${pid}`);
      const bars = [...c.querySelectorAll('span[title^="الجولة 90"]')].map(e => e.title);
      return { bars, hasNoMatchTitle: bars.some(t => /بلا مباراة/.test(t)) };
    }, info.pid);
    check('تبويب المشاركين: عنوان شريط الجولة 902 «بلا مباراة» والـ901 بنقاطها', [card.bars.length, card.hasNoMatchTitle, /^الجولة 901: /.test(card.bars[0]) && !/بلا مباراة/.test(card.bars[0])], [2, true, true]);

    // ملف المشارك
    const prof = await page.evaluate(pid => {
      const box = document.createElement('div'); document.body.appendChild(box);
      renderParticipantProfileInto(box, pid);
      const trs = [...box.querySelectorAll('tbody tr')].filter(tr => /الجولة 90[12]/.test(tr.textContent));
      return trs.map(tr => [tr.className, tr.cells[1].textContent.trim()]);
    }, info.pid);
    check('ملف المشارك: 901 صف ممة، و902 «بلا مباراة» بصنف محايد', prof, [['profile-row-mumma', '0'], ['profile-row-nomatch', 'بلا مباراة']]);

    if (SHOTS) {
      await page.evaluate(pid => { document.querySelector('nav.tabs button[data-tab="participants"]').click(); document.getElementById(`participant-card-${pid}`).scrollIntoView(); }, info.pid);
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(ROOT, 'specs/reports/img/S68/participants-390-dark.jpg'), type: 'jpeg', quality: 60 });
      await page.evaluate(pid => { document.querySelector('nav.tabs button[data-tab="standings"]').click(); const r = document.getElementById(`expand-${pid}`); r.style.display = ''; r.scrollIntoView(); }, info.pid);
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(ROOT, 'specs/reports/img/S68/standings-390-dark.jpg'), type: 'jpeg', quality: 60 });
    }
    const w1 = await page.evaluate(() => (window.__FAKE_FIREBASE__ ? window.__FAKE_FIREBASE__.writes : 0));
    check('بلا أي كتابة على Firebase', w1 - w0, 0);
    await page.close();
  } finally { await browser.close(); }
  console.log(failed ? `\n❌ ${failed} فشل` : '\n✅ كل الفحوص نجحت');
  process.exit(failed ? 1 : 0);
})();
