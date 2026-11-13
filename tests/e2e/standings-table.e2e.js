/* اختبار شامل لـ001-T014 (جدول الترتيب المضغوط): الترتيب والنقاط المعروضة = ما يحسبه computeStandings على نفس الـfixture،
 * والصف ≤ 56px، وصف موسّع واحد في وقته، والأعمدة الثانوية مخفية على الجوال ومعروضة على الكمبيوتر.
 * التشغيل: node tests/e2e/standings-table.e2e.js  (يحتاج Playwright، وليس جزءًا من tests/run.js). exit 1 لو فشل شيء. */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const ff = require(path.join(ROOT, 'tools/fake-firebase.js'));
const { chromium } = require('playwright');
const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));

let failed = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log((ok ? '✅ ' : '❌ ') + name + (ok ? '' : `\n   المتوقع: ${JSON.stringify(want)}\n   الفعلي:  ${JSON.stringify(got)}`));
};

async function open(browser, width) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.addInitScript(() => { try { localStorage.setItem('brookie-onboarded', '1'); } catch (e) {} });
  await ff.install(page, { fixture: readJson('tests/fixtures/season.json'), overrides: readJson('tests/fixtures/overrides.json') });
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.waitForTimeout(1500);
  return page;
}

(async () => {
  const browser = await chromium.launch();
  try {
    const m = await open(browser, 390);
    const shown = await m.evaluate(() => [...document.querySelectorAll('tr.standings-row')].map(r => ({
      pid: Number(r.dataset.pid), total: Number(r.querySelector('.stat-strong').textContent)
    })));
    const expected = await m.evaluate(() => computeStandings().map(s => ({ pid: s.id, total: s.total })));
    check('الترتيب والنقاط المعروضة = computeStandings (نفس الـfixture)', shown, expected);
    check('عدد الصفوف = عدد المشاركين', shown.length > 0 && shown.length === expected.length, true);

    const heights = await m.evaluate(() => [...document.querySelectorAll('tr.standings-row')].map(r => r.getBoundingClientRect().height));
    check('كل صف ≤ 56px على 390', Math.max(...heights) <= 56, true);
    check('3 شعارات 24px في كل صف', await m.evaluate(() => [...document.querySelectorAll('tr.standings-row')].every(r => { const c = r.querySelectorAll('.team-cell-clubs .crest'); return c.length === 3 && [...c].every(i => Math.round(i.getBoundingClientRect().width) === 24); })), true);
    check('ممة وجديد مخفيان على الجوال', await m.evaluate(() => [...document.querySelectorAll('.col-sec')].every(e => getComputedStyle(e).display === 'none')), true);
    check('لا عمود "الجولة" الثابت', await m.evaluate(() => [...document.querySelectorAll('.league-table thead th')].some(t => t.textContent.trim() === 'الجولة' && t.closest('table').classList.contains('league-table') && !t.closest('.detail-row')) ), false);

    const rows = await m.$$('tr.standings-row');
    await rows[0].click();
    const afterFirst = await m.evaluate(() => [...document.querySelectorAll('tr.detail-row')].filter(r => r.style.display === 'table-row').length);
    await rows[1].click();
    const afterSecond = await m.evaluate(() => ({
      open: [...document.querySelectorAll('tr.detail-row')].filter(r => r.style.display === 'table-row').map(r => r.id),
      expanded: [...document.querySelectorAll('.detail-toggle')].filter(b => b.getAttribute('aria-expanded') === 'true').length,
      second: document.querySelectorAll('tr.standings-row')[1].dataset.pid
    }));
    check('اللمس على صف يفتح تفاصيله', afterFirst, 1);
    check('فتح صف ثانٍ يطوي الأول (صف موسّع واحد)', [afterSecond.open, afterSecond.expanded], [['expand-' + afterSecond.second], 1]);
    await rows[1].click();
    check('لمس الصف المفتوح يطويه', await m.evaluate(() => [...document.querySelectorAll('tr.detail-row')].filter(r => r.style.display === 'table-row').length), 0);
    await m.close();

    const d = await open(browser, 1366);
    check('ممة وجديد ظاهران على الكمبيوتر', await d.evaluate(() => [...document.querySelectorAll('.col-sec')].every(e => getComputedStyle(e).display !== 'none')), true);
    await d.close();
  } finally { await browser.close(); }
  console.log(failed ? `\n❌ ${failed} فشل` : '\n✅ كل الفحوص نجحت');
  process.exit(failed ? 1 : 0);
})();
