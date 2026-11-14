/* اختبار 002-R22 (S51): استيراد نتائج الجولة بتبويب المنظّم: روابط الأيام، طلب البحث، لصق عيّنة 365 الأصلية وجدول جواب الذكاء الاصطناعي،
 * المسودة وتقرير الفحص، «عكس» و«حذف»، والاعتماد يعبّئ النموذج ولا يحفظ، وبلا أي طلب شبكة لـ365. التشغيل: node tests/e2e/results-import.e2e.js [--shots dir] */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { chromium } = require('playwright');
const snap = require('../../tools/snap.js');
const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
let failed = 0;
const check = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) failed++; console.log((ok ? '✅ ' : '❌ ') + name + (ok ? '' : `\n   المتوقع: ${JSON.stringify(want)}\n   الفعلي: ${JSON.stringify(got)}`)); };
const shots = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
const NATIVE = fs.readFileSync(path.join(ROOT, 'tests/fixtures/365-native-sample.txt'), 'utf8');
const TABLE = `| النادي | النتيجة | الخصم | التاريخ | الحالة | المصدر |
|---|---|---|---|---|---|
| برشلونة | 3-0 | ريال بيتيس | 2026-05-13 | لُعبت | https://example.com/b |
| ريال مدريد | | | | لم يلعب | |
| أرسنال | 9-5 | ليفربول | 2026-05-30 | لُعبت | |`;

(async () => {
  const fixture = readJson('tests/fixtures/season.json'), overrides = readJson('tests/fixtures/overrides.json');
  const { srv, origin } = await snap.serve(ROOT);
  const browser = await chromium.launch();
  try {
    for (const light of shots ? [false, true] : [false]) {
      const { page, context } = await snap.openPage(browser, { fixture, overrides, now: fixture.exportedAt, origin, root: ROOT }, { width: 390, light });
      const errors = [], outside = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('request', r => { if (!r.url().startsWith(origin) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) outside.push(r.url()); });
      await page.click('nav.tabs button[data-tab="admin"]');
      await page.fill('#pinInput', '2580'); await page.click('#loginBtn');
      await page.waitForSelector('#adminPanel .status-msg', { state: 'visible' });
      const next = await page.evaluate(() => DATA.rounds[DATA.rounds.length - 1].number + 1);
      await page.evaluate(n => { prepareRoundForm(n); }, next);
      await page.waitForSelector('#togglePasteImportBtn', { state: 'attached' });
      const roundsBefore = await page.evaluate(() => DATA.rounds.length);
      await page.evaluate(() => { window.__clip = null; Object.defineProperty(navigator, 'clipboard', { value: { writeText: async t => { window.__clip = t; } }, configurable: true }); });

      await page.evaluate(() => document.getElementById('togglePasteImportBtn').click());
      const links = await page.evaluate(() => ({
        hidden: document.getElementById('pasteImportPanel').hidden,
        a: [...document.querySelectorAll('#riLinks a')].map(a => ({ href: a.href, target: a.target, rel: a.rel, t: a.textContent.trim() })),
        start: document.getElementById('riStart').value, end: document.getElementById('riEnd').value,
        note: document.querySelector('.ri-note').textContent
      }));
      check('اللوحة تُفتح وفيها حقلا الفترة (النهاية = البداية + 7 أيام) وتنبيه «النتائج تُنسخ بيدك»', [links.hidden, !!links.start && !!links.end, /بيدك/.test(links.note)], [false, true, true]);
      check('9 روابط: 8 أيام + «نتائج أمس»، كلها _blank + noopener noreferrer، وصيغة التاريخ بعد #', [links.a.length, links.a.every(a => a.target === '_blank' && /noopener/.test(a.rel) && /noreferrer/.test(a.rel)),
        links.a.slice(0, 8).every(a => /^https:\/\/www\.365scores\.com\/ar\/football\/match-results#date=\d{4}-\d{2}-\d{2}$/.test(a.href)), links.a[8].href], [9, true, true, 'https://www.365scores.com/ar/football/yesterdays-matches']);
      check('نص الرابط بالمعجم: «افتح 365Scores · 5 مايو»', /^افتح 365Scores · \d{1,2} \S+$/.test(links.a[0].t), true);

      // طلب البحث
      await page.evaluate(() => document.getElementById('riPromptBtn').click()); await page.waitForTimeout(100);
      const prompt = await page.evaluate(() => ({ clip: window.__clip, clubs: CLUBS, start: document.getElementById('riStart').value }));
      check('«انسخ طلب البحث»: كل الأندية الـ32 وتاريخ البداية، والدوري المحلي فقط، وشكل الجواب', [prompt.clubs.every(c => (prompt.clip || '').includes(c)), /الدوري المحلي فقط/.test(prompt.clip || ''), /النادي \| النتيجة/.test(prompt.clip || '')], [true, true, true]);

      // لصق عيّنة 365 الأصلية
      await page.fill('#riStart', '2026-05-10'); await page.fill('#riEnd', '2026-05-17'); await page.dispatchEvent('#riEnd', 'change');
      await page.fill('#pasteImportInput', NATIVE);
      await page.click('#riParseBtn');
      const d1 = await page.evaluate(() => ({ rows: [...document.querySelectorAll('.ri-row[data-i]')].map(r => r.querySelector('.ri-club b').textContent), msg: document.getElementById('riMsg').textContent, apply: !document.getElementById('riApplyBtn').disabled, report: document.getElementById('riReport').innerText }));
      check('لصق عيّنة 365 الأصلية ← مسودة بـ3 أسطر (الهلال والنصر وأتلتيكو) وزر الاعتماد يتفعّل', [d1.rows.sort(), d1.apply], [['أتلتيكو مدريد', 'النصر', 'الهلال'].sort(), true]);
      check('تقرير الفحص يظهر: «سطر سليم» و«تنبيه» (خصم غير معروف + أندية بلا سطر)', [/سليم/.test(d1.report), /تنبيه/.test(d1.report), /أندية بلا سطر/.test(d1.report), /أوساسونا/.test(d1.report)], [true, true, true, true]);

      // لصق جدول الذكاء الاصطناعي: يتراكم، ويظهر تنبيه التاريخ خارج الفترة والنتيجة الغريبة
      await page.fill('#pasteImportInput', TABLE); await page.click('#riParseBtn');
      const d2 = await page.evaluate(() => ({ n: document.querySelectorAll('.ri-row[data-i]').length, report: document.getElementById('riReport').innerText, warnRows: document.querySelectorAll('.ri-row-warn').length }));
      check('جدول الذكاء الاصطناعي يتراكم مع المسودة (3 + 3 = 6) ويُعلَّم: تاريخ خارج الفترة ونتيجة غريبة', [d2.n, /خارج فترة الجولة/.test(d2.report), /نتيجة غريبة/.test(d2.report), d2.warnRows >= 1], [6, true, true, true]);
      await page.fill('#pasteImportInput', TABLE); await page.click('#riParseBtn');
      check('إعادة لصق نفس الجدول لا يكرّر الأسطر', await page.evaluate(() => document.querySelectorAll('.ri-row[data-i]').length), 6);

      // تعديل مباشر + عكس + حذف
      const swapOK = await page.evaluate(() => {
        const idx = [...document.querySelectorAll('.ri-row[data-i]')].findIndex(r => r.querySelector('.ri-club b').textContent === 'أتلتيكو مدريد');
        const before = [_riDraft[idx].gf, _riDraft[idx].ga];
        document.querySelectorAll('.ri-swap')[idx].click();
        const after = [_riDraft[idx].gf, _riDraft[idx].ga];
        return {before, after};
      });
      check('«عكس» يقلب له/عليه (2-1 ← 1-2)', [swapOK.before, swapOK.after], [[2, 1], [1, 2]]);
      await page.evaluate(() => { const i = _riDraft.findIndex(r => r.club === 'أتلتيكو مدريد'); document.querySelectorAll('.ri-swap')[i].click(); });   // نرجعه
      await page.evaluate(() => { const i = _riDraft.findIndex(r => r.club === 'أرسنال'); document.querySelectorAll('.ri-del')[i].click(); });
      check('«حذف» يزيل السطر (6 ← 5)', await page.evaluate(() => _riDraft.length), 5);

      // اللقطات
      if (shots) {
        fs.mkdirSync(shots, { recursive: true });
        const el = await page.$('#pasteImportPanel'); await el.scrollIntoViewIfNeeded();
        await el.screenshot({ path: path.join(shots, `import-draft-390-${light ? 'light' : 'dark'}.jpg`), type: 'jpeg', quality: 70 });
      }

      // الاعتماد: يعبّئ النموذج ولا يحفظ
      await page.click('#riApplyBtn');
      const ap = await page.evaluate(() => {
        const g = club => { const tb = document.querySelector(`#roundForm .team-block[data-team="${club}"]`); if(!tb) return null; return {gf: tb.querySelector('.gf-input, input.gf') ? 1 : null, html: tb.querySelector('.match-rows').innerText.slice(0, 80), res: tb.querySelector('.res-select').value, inputs: [...tb.querySelectorAll('.match-rows input[type=number]')].map(i => i.value)}; };
        return { hilal: g('الهلال'), real: g('ريال مدريد'), roundsAfter: DATA.rounds.length, msg: document.getElementById('pasteImportResult').textContent, hasSaved: /تم حفظ/.test(document.getElementById('roundFormBox').innerText) };
      });
      check('الاعتماد: الهلال تعادل 1-1 معبّأ بالنموذج، وريال مدريد «لا مباراة»', [ap.hilal && ap.hilal.res, ap.hilal && ap.hilal.inputs.join(','), ap.real && ap.real.res], ['draw', '1,1', 'no_match']);
      check('الاعتماد لا يحفظ: عدد الجولات ثابت، والرسالة تقول «لم يُحفظ شيء بعد»', [ap.roundsAfter === roundsBefore, ap.hasSaved, /لم يُحفظ شيء/.test(ap.msg)], [true, false, true]);

      // أسماء مترجَمة
      await page.click('#riClearBtn');
      const trans = Array.from({ length: 6 }, (_, i) => `الدوري الإسباني, إسبانيا\nالدوري الإسباني\nإسبانيا\nطعام${i}\nطعام${i}\nانتهت\n1\n-\n0\nميناء${i}\nميناء${i}\n`).join('');
      await page.fill('#pasteImportInput', trans); await page.click('#riParseBtn');
      check('أسماء مشوّهة (ترجمة المتصفح): تنبيه واضح', /ترجمة المتصفح مطفأة/.test(await page.evaluate(() => document.getElementById('riMsg').textContent)), true);
      check('بلا أي طلب شبكة خارج الموقع أثناء الاستيراد (لا جلب من 365)', outside, []);
      check('لا أخطاء JS', errors, []);
      await context.close();
    }
  } finally { await browser.close(); srv.close(); }
  console.log(failed ? `\n❌ ${failed} فشل` : '\n✅ كل الفحوص نجحت');
  process.exit(failed ? 1 : 0);
})();
