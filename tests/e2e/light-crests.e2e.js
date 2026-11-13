/* اختبار شامل لـ001-T012b (الشعارات الفاتحة): في الوضع الفاتح تظهر النسخة الفاتحة، وعند تبديل الثيم تتبدّل الشعارات المعروضة بدون إعادة تحميل.
 * التشغيل: node tests/e2e/light-crests.e2e.js  (يحتاج Playwright، وليس جزءًا من tests/run.js). exit 1 لو فشل شيء. */
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

async function open(browser, light) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript(l => { try { localStorage.setItem('brookie-onboarded', '1'); if (l) localStorage.setItem('brookie-light-mode', '1'); } catch (e) {} }, light);
  await ff.install(page, { fixture: readJson('tests/fixtures/season.json'), overrides: readJson('tests/fixtures/overrides.json') });
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.waitForTimeout(1500);
  return page;
}
// نص الـSVG خلف أول شعارات الصفوف: نقرأه من عنوان الـ<img> (blob:) داخل الصفحة
const crestTexts = page => page.evaluate(async () => {
  const imgs = [...document.querySelectorAll('tr.standings-row img.crest[data-crest-club]')].slice(0, 9);
  return Promise.all(imgs.map(async i => ({ club: i.dataset.crestClub, svg: await (await fetch(i.src)).text() })));
});

(async () => {
  const browser = await chromium.launch();
  try {
    // 1) بدء بالداكن: العادية. بعد التبديل للفاتح بدون إعادة تحميل: الفاتحة
    const p = await open(browser, false);
    const navs = []; p.on('framenavigated', f => { if (f === p.mainFrame()) navs.push(f.url()); });
    const dark = await crestTexts(p);
    const expectDark = await p.evaluate(() => dark_ok = [...document.querySelectorAll('tr.standings-row img.crest[data-crest-club]')].slice(0, 9).map(i => i.dataset.crestClub).every(c => crestSource(c).variant === 'dark' || crestSource(c).kind !== 'enhanced'));
    check('الوضع الداكن: الشعارات هي العادية', expectDark, true);
    await p.click('#darkModeToggleBtn');
    await p.waitForTimeout(500);
    const light = await crestTexts(p);
    check('تبديل الثيم يبدّل نصوص الشعارات (الفاتحة غير الداكنة)', dark.map((d, i) => d.svg !== light[i].svg).filter(Boolean).length > 0, true);
    check('الشعارات الفاتحة = CRESTS_LIGHT للنادي', await p.evaluate(() => [...document.querySelectorAll('tr.standings-row img.crest[data-crest-club]')].slice(0, 9).every(i => { const s = crestSource(i.dataset.crestClub); return s.kind !== 'enhanced' || s.variant === 'light'; })), true);
    check('بدون إعادة تحميل للصفحة', navs, []);
    await p.click('#darkModeToggleBtn');
    await p.waitForTimeout(500);
    const back = await crestTexts(p);
    check('الرجوع للداكن يرجّع الشعارات العادية', back.map(b => b.svg), dark.map(d => d.svg));
    await p.close();

    // 2) فتح الصفحة مباشرة بالوضع الفاتح: الفاتحة من البداية
    const q = await open(browser, true);
    check('فتح بالوضع الفاتح: كل الشعارات فاتحة', await q.evaluate(() => [...document.querySelectorAll('tr.standings-row img.crest[data-crest-club]')].every(i => { const s = crestSource(i.dataset.crestClub); return s.kind !== 'enhanced' || s.variant === 'light'; })), true);
    check('الشعارات تحمّلت (بلا صور مكسورة)', await q.evaluate(() => [...document.querySelectorAll('img.crest')].every(i => i.complete && i.naturalWidth > 0)), true);
    await q.close();
  } finally { await browser.close(); }
  console.log(failed ? `\n❌ ${failed} فشل` : '\n✅ كل الفحوص نجحت');
  process.exit(failed ? 1 : 0);
})();
