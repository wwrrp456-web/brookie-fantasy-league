/* اختبار S64: مشارك بلا ترتيب (مخفي لحد جولته الأولى، أو جولة فاضية) ما يكسر تبويب المشاركين: يُعرض «غير مصنّف» نصًا بلا formatCount على نص.
 * التشغيل: node tests/e2e/participants-unranked.e2e.js  (يحتاج Playwright). exit 1 لو فشل شيء. */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const ff = require(path.join(ROOT, 'tools/fake-firebase.js'));
const { chromium } = require('playwright');
const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
let failed = 0;
const check = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) failed++; console.log((ok ? '✅ ' : '❌ ') + name + (ok ? '' : `\n   المتوقع: ${JSON.stringify(want)}\n   الفعلي:  ${JSON.stringify(got)}`)); };

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => { try { localStorage.setItem('brookie-onboarded', '1'); } catch (e) {} });
    await ff.install(page, { fixture: readJson('tests/fixtures/season.json'), overrides: readJson('tests/fixtures/overrides.json') });
    await page.goto('file://' + path.join(ROOT, 'index.html'));
    await page.waitForTimeout(1500);
    const base = await page.evaluate(() => ({ n: PARTICIPANTS.length, cards: document.querySelectorAll('#participantsBox .participant-card').length }));
    // نخفي مشاركًا من الترتيب (كما يحصل لمن لم تبدأ جولته): computeStandings ما يرجعه
    const r = await page.evaluate(() => {
      const orig = computeStandings;
      const hidden = PARTICIPANTS[2];
      computeStandings = (...a) => orig(...a).filter(s => s.id !== hidden.id);
      let threw = null;
      try { renderParticipants(); } catch (e) { threw = String(e.message || e); }
      computeStandings = orig;
      const card = document.getElementById('participant-card-' + hidden.id);
      return { threw, cards: document.querySelectorAll('#participantsBox .participant-card').length, text: card ? card.textContent.replace(/\s+/g, ' ') : null, otherOk: !!document.querySelector('#participantsBox .participant-card:not(#participant-card-' + hidden.id + ')') };
    });
    check('مشارك بلا ترتيب: ما فيه استثناء، وكل البطاقات تُعرض', [r.threw, r.cards], [null, base.n]);
    check('بطاقته تعرض «غير مصنّف» نصًا (بدل رقم) بدون «نقطة» مضافة للنص', [/غير مصنّف/.test(r.text), /غير مصنّف نقطة|غير مصنّف نقاط/.test(r.text)], [true, false]);
    check('بقية المشاركين ما تأثروا: «غير مصنّف» في بطاقة واحدة فقط، والباقي بأرصدة بالمعدود', await page.evaluate(() => { const cs = [...document.querySelectorAll('#participantsBox .participant-card')]; return [cs.filter(c => /غير مصنّف/.test(c.textContent)).length, cs.filter(c => !/غير مصنّف/.test(c.textContent)).every(c => /\d+ (نقطة|نقاط|نقطة واحدة)/.test(c.textContent.replace(/\s+/g, ' ')))]; }), [1, true]);
    check('لا أخطاء JS بالصفحة', errors, []);
    await page.close();
  } finally { await browser.close(); }
  console.log(failed ? `\n❌ ${failed} فشل` : '\n✅ كل الفحوص نجحت');
  process.exit(failed ? 1 : 0);
})();
