/* اختبار شامل لـ007-T002 (نسخ كل نتائج الأعضاء إلى نموذج التجهيز) على fake-firebase ببيانات تقارير مصطنعة.
 * SC-03: لا نسخ قبل حسم كل المجموعات، والقرارات تغيّر الناتج فعلًا (مكررة تدمج، ليست مكررة تفصل). SC-04: «الصقه في نموذج التجهيز» يُظهر مسودة الجولة
 * بتقرير الفحص. SC-05: بدون كتابة في Firebase (عدّاد writes + لا دوال غير مدعومة). والتقارير تُهرَّب (الدستور 23)، وحالة فاضية، وتذكّر القرارات محليًا.
 * التشغيل: node tests/e2e/community-copy.e2e.js [--shots <مجلد>]  (يحتاج Playwright، وليس جزءًا من tests/run.js). exit 1 لو فشل شيء. */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const ff = require(path.join(ROOT, 'tools/fake-firebase.js'));
const { chromium } = require('playwright');
const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const shotsDir = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;

let failed = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log((ok ? '✅ ' : '❌ ') + name + (ok ? '' : `\n   المتوقع: ${JSON.stringify(want)}\n   الفعلي:  ${JSON.stringify(got)}`));
};

const XSS = '<img src=x onerror="window.__xss=(window.__xss||0)+1">';
let t = 1700000000000;
const R = (club, opponent, gf, ga, reporter) => ({ club, opponent, result: gf > ga ? 'win' : gf < ga ? 'loss' : 'draw', gf, ga, reporter, submittedAt: (t += 60000) });
const REPORTS = {
  a1: R('الهلال', 'الخليج', 3, 0, 'سعد'),                       // مفرد
  b1: R('ريال مدريد', 'خيتافي', 5, 0, 'خالد'), b2: R('ريال مدريد', 'خيتافي', 5, 0, 'نورة'),   // متفق
  c1: R('النصر', 'الاتحاد', 2, 1, 'سعد'), c2: R('الاتحاد', 'النصر', 1, 2, 'ماجد'),             // مرآة
  d1: R('تشيلسي', 'برايتون', 1, 0, 'هند'), d2: R('تشيلسي', '', 1, 0, 'وليد'),                  // مشكوك (بلا خصم)
  e1: R('ليفربول', 'إيفرتون', 4, 4, XSS), e2: R('ليفربول', 'إيفرتون', 3, 3, 'فهد'),             // تعارض (والمُرسِل خبيث)
  f1: R('أرسنال', 'أوساسونا', 2, 1, 'سعد'), f2: R('أرسنال', 'إشبيلية', 0, 0, 'سعد')             // مباراتان محتملتان
};
const FULL = ['الاتحاد 1-2 النصر', 'الهلال 3-0 الخليج', 'النصر 2-1 الاتحاد', 'ريال مدريد 5-0 خيتافي'];

async function open(browser, reports, width) {
  const page = await browser.newPage({ viewport: { width: width || 390, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { try { localStorage.setItem('brookie-onboarded', '1'); } catch (e) {} });
  const ov = Object.assign({}, readJson('tests/fixtures/overrides.json'), reports ? { 'community-reports': { matches: { '11': reports } } } : {});
  const report = await ff.install(page, { fixture: readJson('tests/fixtures/season.json'), overrides: ov });
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.waitForTimeout(1500);
  const pin = await page.evaluate(() => CURRENT_ADMIN_PIN);
  await page.click('nav.tabs button[data-tab="admin"]');
  await page.fill('#pinInput', pin);
  await page.click('#loginBtn');
  await page.evaluate(() => { document.getElementById('communityAccordion').open = true; });
  await page.waitForTimeout(300);
  return { page, errors, report };
}
const writes = page => page.evaluate(() => window.__FAKE_FIREBASE__.writes);
const pickRadio = (page, groupIdx, value) => page.evaluate(([i, v]) => { const el = document.querySelectorAll('#communityCopyPanel fieldset.cc-group')[i].querySelector(`input[value="${v}"]:not([data-pick])`); el.click(); }, [groupIdx, value]);
const outText = page => page.evaluate(() => { const o = document.getElementById('ccOut'); return o ? o.value.split('\n') : null; });

(async () => {
  const browser = await chromium.launch();
  try {
    const { page, errors, report } = await open(browser, REPORTS);
    const w0 = await writes(page);
    await page.click('#copyAllReportsBtn');
    await page.waitForSelector('#communityCopyPanel fieldset.cc-group');

    // ---- المجموعات والتصنيف
    const info = await page.evaluate(() => ({
      groups: [...document.querySelectorAll('#communityCopyPanel fieldset.cc-group')].map(g => ({ badge: g.querySelector('.cc-badge').textContent.trim(), checked: [...g.querySelectorAll('.cc-options input:checked')].map(i => i.value) })),
      singles: document.querySelector('.cc-singles') ? document.querySelector('.cc-singles li').textContent.trim() : null
    }));
    check('لوحة القرار: 5 مجموعات تحتاج قرارًا (تعارض ومشكوكان ومرآة ومتفقة)', info.groups.map(g => g.badge), ['تعارض', 'مشكوك', 'مشكوك', 'من الطرفين', 'متفقة']);
    check('الافتراضي «مكررة» للمتفقة والمرآة فقط، ولا اختيار مسبق للتعارض والمشكوك', info.groups.map(g => g.checked.join()), ['', '', '', 'dup', 'dup']);
    check('المفرد ينزل مباشرة (بلا سؤال) ويظهر بقائمته', info.singles, 'الهلال 3-0 الخليج');

    // ---- SC-03: لا نسخ قبل الحسم
    check('قبل الحسم: بلا نص، وزرا النسخ واللصق معطّلان، وتنبيه "بقي 3 مجموعات"', await page.evaluate(() => [!!document.getElementById('ccOut'), document.getElementById('ccCopyBtn').disabled, document.getElementById('ccPasteBtn').disabled, /بقي 3 مجموعات/.test(document.querySelector('.cc-wait').textContent)]), [false, true, true, true]);
    // التعارض: «مكررة» بلا اختيار نتيجة ما يحسم
    await pickRadio(page, 0, 'dup');
    check('التعارض: اختيار «مكررة» وحده ما يحسم (لازم اختيار النتيجة)', await page.evaluate(() => [document.querySelectorAll('.cc-pick input').length, document.getElementById('ccCopyBtn').disabled]), [2, true]);
    await page.evaluate(() => { const r = [...document.querySelectorAll('.cc-pick label')].find(l => /3-3/.test(l.textContent)).querySelector('input'); r.click(); });
    check('اختيار نتيجة التعارض (3-3) ← تبقى مجموعتان', await page.evaluate(() => /بقي مجموعتان/.test(document.querySelector('.cc-wait').textContent)), true);
    await pickRadio(page, 1, 'sep');
    await pickRadio(page, 2, 'sep');
    check('بعد حسم الكل: يظهر النص ويفتح النسخ واللصق', await page.evaluate(() => [!!document.getElementById('ccOut'), document.getElementById('ccCopyBtn').disabled, document.getElementById('ccPasteBtn').disabled]), [true, false, false]);
    const sepLines = await outText(page);
    const SEP = ['أرسنال 0-0 إشبيلية', 'أرسنال 2-1 أوساسونا', 'الاتحاد 1-2 النصر', 'الهلال 3-0 الخليج', 'ليفربول 3-3 إيفرتون', 'النصر 2-1 الاتحاد', 'تشيلسي 1-0', 'تشيلسي 1-0 برايتون', 'ريال مدريد 5-0 خيتافي'];
    check('الناتج: ليست مكررة تفصل (تشيلسي وأرسنال سطران لكل)، والتعارض بنتيجة 3-3، والمرآة سطران، والمتفقة سطر', sepLines.slice().sort(), SEP.slice().sort());
    // قرار «مكررة» للمشكوك (تشيلسي) يدمج مباراة وحدة باختيار النتيجة، فيقل الناتج سطرًا
    await pickRadio(page, 2, 'dup');
    await page.evaluate(() => { [...document.querySelectorAll('.cc-pick label')].find(l => /برايتون/.test(l.textContent)).querySelector('input').click(); });
    const dupLines = await outText(page);
    check('القرار يغيّر الناتج: «مكررة» لتشيلسي تدمج (8 أسطر بدل 9، ويبقى سطر برايتون)', [sepLines.length, dupLines.length, dupLines.includes('تشيلسي 1-0 برايتون'), dupLines.includes('تشيلسي 1-0')], [9, 8, true, false]);

    // ---- تقرير الزائر الخبيث يُعرض نصًا (الدستور 23)
    check('اسم المُرسِل الخبيث يظهر كنص حرفي بلا تنفيذ', await page.evaluate(() => [document.querySelectorAll('#communityCopyPanel img[src="x"]').length, window.__xss || 0, document.querySelector('#communityCopyPanel').textContent.includes('<img src=x')]), [0, 0, true]);

    // ---- «اعتمد الكل كاقتراح» و«ابدأ من جديد»
    await page.click('#ccResetBtn');
    check('ابدأ من جديد: تعود القرارات للافتراضي (3 بلا قرار) ويمسح التذكّر', await page.evaluate(() => [/بقي 3 مجموعات/.test(document.querySelector('.cc-wait').textContent), localStorage.getItem('brookie_cc_decisions_11')]), [true, '{}']);
    await page.click('#ccSuggestBtn');
    check('اعتمد الكل كاقتراح: يحسم الثلاث (النص ظاهر)', await page.evaluate(() => [!!document.getElementById('ccOut'), document.getElementById('ccOut').value.split('\n').length]), [true, 9]);

    const wA = await writes(page);   // بعد فتح اللوحة وكل القرارات (قبل إعادة التحميل)

    // ---- تذكّر القرارات محليًا: بعد إعادة التحميل ترجع
    await page.reload();
    await page.waitForTimeout(1500);
    const pin = await page.evaluate(() => CURRENT_ADMIN_PIN);
    await page.click('nav.tabs button[data-tab="admin"]'); await page.fill('#pinInput', pin); await page.click('#loginBtn');
    await page.evaluate(() => { document.getElementById('communityAccordion').open = true; });
    const wB = await writes(page);   // أساس الصفحة بعد إعادة التحميل
    await page.click('#copyAllReportsBtn');
    await page.waitForSelector('#ccOut');
    check('القرارات المحفوظة ترجع بعد إعادة فتح الصفحة (النص جاهز بلا إعادة قرار)', (await outText(page)).length, 9);

    // ---- SC-04: الصقه في نموذج التجهيز
    await page.click('#ccPasteBtn');
    await page.waitForSelector('#riDraft .ri-row:not(.ri-head)', { state: 'attached', timeout: 5000 });
    if (process.env.CC_DEBUG) console.log(await page.evaluate(() => { let e = document.querySelector('#riDraft .ri-row'), o = []; while (e && e !== document.body) { const cs = getComputedStyle(e); o.push(e.tagName + '#' + e.id + '.' + e.className + ' disp=' + cs.display + ' hid=' + e.hidden + (e.tagName === 'DETAILS' ? ' open=' + e.open : '')); e = e.parentElement; } return o.join('\n'); }));
    const form = await page.evaluate(() => ({
      round: document.getElementById('roundForm') && document.getElementById('roundForm').dataset.num,
      panelOpen: !document.getElementById('pasteImportPanel').hidden,
      draft: _riDraft.map(r => `${r.club} ${r.gf}-${r.ga}${r.opp ? ' ' + r.opp : ''}`).sort(),
      hasReport: document.getElementById('riReport').textContent.trim().length > 0,
      inputCleared: document.getElementById('pasteImportInput').value === '',
      saved: DATA.rounds.some(r => r.number === 11)
    }));
    check('الصقه في نموذج التجهيز: يفتح نموذج الجولة 11 ولوحة اللصق، ومسودة بـ9 صفوف بنفس الأسطر', [form.round, form.panelOpen, form.draft.length, form.draft], ['11', true, 9, SEP.slice().sort()]);
    check('ويظهر تقرير الفحص، والجولة ما تحفظت (DATA.rounds بلا الجولة 11)', [form.hasReport, form.saved], [true, false]);

    // ---- SC-05: بلا كتابة في Firebase
    if (shotsDir) {
      fs.mkdirSync(shotsDir, { recursive: true });
      for (const light of [false, true]) {
        await page.evaluate(l => { document.documentElement.classList.toggle('light-mode', l); }, light);
        const el = await page.$('#pasteImportPanel'); await el.scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(shotsDir, `draft-390-${light ? 'light' : 'dark'}.png`), fullPage: true, clip: { x: 0, y: (await el.boundingBox()).y + await page.evaluate(() => window.scrollY) - 10, width: 390, height: Math.min((await el.boundingBox()).height + 20, 2400) } });
      }
      await page.evaluate(() => document.documentElement.classList.remove('light-mode'));
    }
    const wC = await writes(page);
    check('SC-05: عدّاد الكتابة في Firebase ما تحرك: بعد فتح اللوحة وكل القرارات، وبعد إعادة الفتح واللصق في النموذج', [wA - w0, wC - wB], [0, 0]);
    check('SC-05: لا دوال Firebase غير مدعومة (set/update/push/remove) ولا أخطاء JS', [await report.unsupported(), errors], [[], []]);

    if (shotsDir) {
      fs.mkdirSync(shotsDir, { recursive: true });
      await page.click('#copyAllReportsBtn'); await page.waitForSelector('.cc-group');
      for (const light of [false, true]) {
        await page.evaluate(l => { document.documentElement.classList.toggle('light-mode', l); }, light);
        await page.click('#ccResetBtn');
        await page.evaluate(() => document.getElementById('communityCopyBox').scrollIntoView());
        await page.screenshot({ path: path.join(shotsDir, `panel-390-${light ? 'light' : 'dark'}.png`) });
        const box = await (await page.$('#communityCopyBox')).boundingBox(), sy = await page.evaluate(() => window.scrollY);
        await page.screenshot({ path: path.join(shotsDir, `panel-full-390-${light ? 'light' : 'dark'}.png`), fullPage: true, clip: { x: 0, y: Math.max(0, box.y + sy - 10), width: 390, height: Math.min(box.height + 20, 2600) } });
      }
    }
    await page.close();

    // ---- حالة فاضية (لا تقارير)
    const e = await open(browser, null);
    await e.page.click('#copyAllReportsBtn');
    await e.page.waitForSelector('#communityCopyPanel .empty-state');
    check('لا تقارير ← حالة فاضية بمكوّن emptyState وبدون أزرار نسخ', await e.page.evaluate(() => [document.querySelector('#communityCopyPanel .empty-state-title').textContent, !!document.getElementById('ccCopyBtn')]), ['لا نتائج من الأعضاء بعد', false]);
    await e.page.close();
  } finally { await browser.close(); }
  console.log(failed ? `\n❌ ${failed} فشل` : '\n✅ كل الفحوص نجحت');
  process.exit(failed ? 1 : 0);
})();
