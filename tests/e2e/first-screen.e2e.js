/* اختبار شامل لـ001-T015 (ترتيب الشاشة الأولى): ترتيب الأقسام حسب FR-16، ولوحة الميداليات ظاهرة بلا زر طي (R-07)،
 * والأقسام المطوية (لوحة الشرف والأوسمة، وسباق القاع، وغيرها) مطوية افتراضيًا، وSC-05 (حالتي + أول 5 صفوف داخل 844px على 390).
 * التشغيل: node tests/e2e/first-screen.e2e.js  (يحتاج Playwright، وليس جزءًا من tests/run.js). exit 1 لو فشل شيء. */
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
  const page = await browser.newPage({ viewport: { width, height: 844 } });
  await page.addInitScript(() => { try { localStorage.setItem('brookie-onboarded', '1'); } catch (e) {} });
  await ff.install(page, { fixture: readJson('tests/fixtures/season.json'), overrides: readJson('tests/fixtures/overrides.json') });
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.waitForTimeout(1500);
  return page;
}

(async () => {
  const browser = await chromium.launch();
  try {
    const p = await open(browser, 390);

    // ترتيب الأقسام في الـDOM (بصرف النظر عن الفاضي منها): حالتي ← الجدول ← أنديتي ← بطل الجولة/ممّاتها ← القصة ← الميداليات ← الأقسام المطوية
    const order = await p.evaluate(() => {
      const ids = ['myDashboardBox', 'standingsBox', 'myClubsWeekBox', 'championHeroBox', 'heroesBox', 'roundStoryCardBox', 'medalsBox', 'standingsFolds'];
      const els = ids.map(i => document.getElementById(i));
      return els.every((e, i) => i === 0 || (els[i - 1].compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0);
    });
    check('ترتيب الأقسام حسب FR-16', order, true);
    check('"أنديتي هذا الأسبوع": مكان محجوز مخفي', await p.evaluate(() => { const e = document.getElementById('myClubsWeekBox'); return !!e && e.hidden; }), true);

    // الميداليات: ظاهرة، وبلا زر/عنصر طي، وخارج أي <details>
    const med = await p.evaluate(() => {
      const b = document.getElementById('medalsBox');
      const r = b.getBoundingClientRect();
      return { visible: r.height > 0 && getComputedStyle(b).display !== 'none', cards: b.querySelectorAll('.medal-card').length, collapse: b.querySelectorAll('details, summary, [aria-expanded], [data-collapse], .collapse-btn').length, inFold: !!b.closest('details') };
    });
    check('لوحة الميداليات ظاهرة وفيها بطاقات', [med.visible, med.cards > 0], [true, true]);
    check('لوحة الميداليات بلا زر طي ولا <details> (R-07)', [med.collapse, med.inFold], [0, false]);

    // الأقسام المطوية مطوية افتراضيًا ولوحة الشرف والأوسمة وسباق القاع ضمنها
    const folds = await p.evaluate(() => [...document.querySelectorAll('#standingsFolds details.fold')].map(f => ({ id: f.id, open: f.open })));
    check('كل الأقسام المطوية مطوية افتراضيًا', folds.every(f => !f.open), true);
    check('لوحة الشرف والأوسمة وسباق القاع في أقسام مطوية', await p.evaluate(() => ['honorBoardBox', 'badgesBox', 'bottomRaceBox', 'weeklyDuelsBox', 'predictionBox'].every(i => !!document.getElementById(i).closest('details.fold'))), true);

    // SC-05 للزائر: أول 5 صفوف داخل 844px
    const vis = await p.evaluate(() => { const r = document.querySelectorAll('tr.standings-row')[4]; return r ? r.getBoundingClientRect().bottom : null; });
    check('SC-05 (زائر): الصف الخامس داخل أول 844px', vis !== null && vis <= 844, true);

    // SC-05 بعد اختيار الاسم: "حالتي" + أول 5 صفوف داخل 844px
    await p.evaluate(() => applyMyId(3));
    await p.waitForTimeout(600);
    const me = await p.evaluate(() => {
      const d = document.querySelector('#myDashboardBox .my-dash-card');
      const r5 = document.querySelectorAll('tr.standings-row')[4];
      return { dash: !!d, labels: d ? [...d.querySelectorAll('.my-dash-label')].map(l => l.textContent.trim()) : [], dashTop: d ? d.getBoundingClientRect().top : null, row5: r5 ? r5.getBoundingClientRect().bottom : null, pickerHidden: getComputedStyle(document.getElementById('mePickerBox')).display === 'none' };
    });
    check('"حالتي": المركز والرصيد والحركة ونقاط الجولة', me.labels, ['المركز', 'الرصيد', 'الحركة', 'نقاط الجولة']);
    check('SC-05: "حالتي" + أول 5 صفوف داخل أول 844px', me.dash && me.row5 !== null && me.row5 <= 844, true);
    check('منتقي "مين أنت؟" يتطوّى بعد التعريف', me.pickerHidden, true);
    await p.click('#meChangeBtn');
    check('زر "تغيير" يعيد منتقي الاسم', await p.evaluate(() => getComputedStyle(document.getElementById('mePickerBox')).display !== 'none'), true);
    await p.close();
  } finally { await browser.close(); }
  console.log(failed ? `\n❌ ${failed} فشل` : '\n✅ كل الفحوص نجحت');
  process.exit(failed ? 1 : 0);
})();
