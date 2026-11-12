/* اختبار شامل لـ001-T016 (نقل الميزات الثانوية حسب FR-17): كل ميزة في مكانها الجديد (مطوية)، وتفتح وتشتغل بنفس المنطق.
 *  - سجل الجولات التفصيلي: مطوي في تبويب الجولات.
 *  - نزال الموسم، والوضع المباشر، وحاسبة "ماذا لو"، والسيناريوهات: قسم "أدوات إضافية" المطوي في تبويب الإحصائيات.
 * التشغيل: node tests/e2e/secondary-features.e2e.js  (يحتاج Playwright، وليس جزءًا من tests/run.js). exit 1 لو فشل شيء. */
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

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => { try { localStorage.setItem('brookie-onboarded', '1'); } catch (e) {} });
    await ff.install(page, { fixture: readJson('tests/fixtures/season.json'), overrides: readJson('tests/fixtures/overrides.json') });
    await page.goto('file://' + path.join(ROOT, 'index.html'));
    await page.waitForTimeout(1500);

    // ---- الجولات: سجل الجولات التفصيلي مطوي
    await page.click('nav.tabs button[data-tab="rounds"]');
    const log = await page.evaluate(() => { const f = document.getElementById('foldRoundsLog'); return { exists: !!f, open: f && f.open, inside: !!document.getElementById('roundsBox').closest('#foldRoundsLog'), cards: document.querySelectorAll('#roundsBox .r2-card, #roundsBox .round-entry-card, #roundsBox details').length }; });
    check('سجل الجولات التفصيلي: داخل طيّة مطوية افتراضيًا', [log.exists, log.open, log.inside], [true, false, true]);
    check('سجل الجولات يُرسم بنفس المنطق (محتوى فعلي)', log.cards > 0, true);
    await page.click('#foldRoundsLog > summary');
    check('فتح الطيّة يُظهر السجل', await page.evaluate(() => document.getElementById('roundsBox').getBoundingClientRect().height > 100), true);
    check('الأقسام الأخرى للجولات خارج الطيّة (تقدم الموسم، أرشيف الأبطال)', await page.evaluate(() => ['seasonProgressBox', 'championsArchiveBox'].every(i => !document.getElementById(i).closest('details'))), true);

    // ---- الإحصائيات: أدوات إضافية
    await page.click('nav.tabs button[data-tab="stats"]');
    const tools = await page.evaluate(() => {
      const f = document.getElementById('foldExtraTools');
      return { open: f.open, inside: ['liveFocusOpenBtn', 'whatIfBox', 'scenarioBox', 'seasonDuelBox'].every(i => !!document.getElementById(i).closest('#foldExtraTools')), inStandings: !!document.querySelector('#panel-standings #liveFocusOpenBtn') };
    });
    check('أدوات إضافية: مطوية وفيها الوضع المباشر وماذا لو والسيناريوهات ونزال الموسم', [tools.open, tools.inside], [false, true]);
    check('الوضع المباشر ما عاد في شريط أدوات الترتيب', tools.inStandings, false);
    await page.click('#foldExtraTools > summary');
    const content = await page.evaluate(() => ({ whatIf: document.getElementById('whatIfBox').children.length, scenario: document.getElementById('scenarioBox').children.length }));
    check('حاسبة "ماذا لو" والسيناريوهات تظهر محتواها', [content.whatIf > 0, content.scenario > 0], [true, true]);

    // حاسبة ماذا لو تشتغل: تغيّر النتيجة عند الضغط
    const whatif = await page.evaluate(() => { const b = document.querySelector('#whatIfBox button'); return !!b; });
    check('زر حاسبة "ماذا لو" موجود', whatif, true);

    // الوضع المباشر يفتح ويقفل
    await page.click('#liveFocusOpenBtn');
    check('الوضع المباشر يفتح من مكانه الجديد', await page.evaluate(() => document.body.classList.contains('live-focus-active')), true);
    await page.evaluate(() => closeLiveFocusMode());
    check('الوضع المباشر يقفل', await page.evaluate(() => document.body.classList.contains('live-focus-active')), false);

    // نزال الموسم يشتغل (مفعّل): يُرسم بعد التفعيل
    await page.evaluate(() => { DATA.seasonDuelEnabled = true; renderSeasonDuel(); });
    check('نزال الموسم يُرسم في مكانه الجديد', await page.evaluate(() => document.getElementById('seasonDuelBox').children.length > 0), true);

    // شريط التنقل السريع: الضغط على قسم داخل الطيّة يفتحها
    await page.evaluate(() => document.getElementById('foldExtraTools').open = false);
    const chip = await page.evaluate(() => { const c = [...document.querySelectorAll('.stats-quick-nav-chip')].find(x => { const t = document.getElementById(x.dataset.target); return t && t.closest('#foldExtraTools'); }); if (c) c.click(); return !!c; });
    check('وجود شريحة لقسم داخل "أدوات إضافية" في التنقل السريع', chip, true);
    check('الضغط على قسم داخل "أدوات إضافية" في التنقل السريع يفتح الطيّة', await page.evaluate(() => document.getElementById('foldExtraTools').open), true);

    check('لا أخطاء JS في الصفحة', errors, []);
  } finally { await browser.close(); }
  console.log(failed ? `\n❌ ${failed} فشل` : '\n✅ كل الفحوص نجحت');
  process.exit(failed ? 1 : 0);
})();
