/* اختبار شامل لـ003-T001 (S-07): محتوى الزوار الخبيث يُعرض نصًا في الأماكن الخمسة.
 * يشتغل بدون شبكة وبدون Firebase الحي، فيحتاج tools/fake-firebase.js (000-T006) وPlaywright.
 * التشغيل: node tests/e2e/escape-html.e2e.js [--shots <مجلد>]
 * ليس جزءًا من tests/run.js (يحتاج متصفحًا). exit 1 لو أي مكان نفّذ الحمولة أو عرضها كوسوم. */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
let ff;
try { ff = require(path.join(ROOT, 'tools/fake-firebase.js')); }
catch (e) { console.error('يحتاج tools/fake-firebase.js (000-T006، PR #19) ليشتغل هذا الاختبار.'); process.exit(2); }
const { chromium } = require('playwright');

const shotsDir = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
// حمولات: وسم صورة بـonerror، وكسر خاصية بـonmouseover، ونص alert حقيقي
const IMG = '<img src=x onerror="window.__xss=(window.__xss||0)+1;alert(1)">';
const ATTR = '" onmouseover="window.__xss=(window.__xss||0)+1" x="';
const PAYLOADS = [IMG, ATTR];

const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));

async function openPage(browser, file, overrides) {
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  const dialogs = [];
  page.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); });
  const ov = Object.assign({}, readJson('tests/fixtures/overrides.json'), overrides || {});
  const report = await ff.install(page, { fixture: readJson('tests/fixtures/season.json'), overrides: ov });
  await page.goto('file://' + path.join(ROOT, file));
  await page.waitForTimeout(1500);
  return { page, dialogs, report };
}

// يتحقق أن الصندوق ما فيه وسوم/خاصيات منفَّذة، وأن الحمولة ظاهرة كنص حرفي
async function inspect(page, dialogs, report, selector, label, expectText) {
  const r = await page.evaluate(([sel, payloads]) => {
    const box = document.querySelector(sel);
    if (!box) return { missing: true };
    const bad = box.querySelectorAll('img[src="x"], [onerror], [onmouseover]').length;
    return { bad, text: box.textContent, xss: window.__xss || 0, html: box.innerHTML.length };
  }, [selector, PAYLOADS]);
  const problems = [];
  if (r.missing) problems.push('الصندوق غير موجود: ' + selector);
  else {
    if (r.bad) problems.push(`${r.bad} عنصر منفَّذ (img/onerror/onmouseover)`);
    if (r.xss) problems.push('نُفّذ كود الحمولة (window.__xss=' + r.xss + ')');
    if (expectText && !r.text.includes(expectText)) problems.push('الحمولة ما ظهرت كنص حرفي');
  }
  if (dialogs.length) problems.push('ظهر alert: ' + dialogs.length);
  if (report.pageErrors.length) problems.push('أخطاء صفحة: ' + report.pageErrors.join(' | '));
  const ok = problems.length === 0;
  console.log(`${ok ? '✅' : '❌'} ${label}${ok ? '' : ': ' + problems.join('؛ ')}`);
  return ok;
}

(async () => {
  const browser = await chromium.launch();
  let allOk = true;
  // لقطة للصندوق: يُظهر التبويب المخفي وسلسلة الآباء ويخفي النوافذ الثابتة (الترحيب) عشان تبان النتيجة
  const shot = async (page, sel, name) => {
    if (!shotsDir) return;
    fs.mkdirSync(shotsDir, { recursive: true });
    await page.evaluate(s => {
      const box = document.querySelector(s);
      document.querySelectorAll('body *').forEach(e => { if (getComputedStyle(e).position === 'fixed' && !e.contains(box) && !box.contains(e)) e.style.display = 'none'; });
      for (let e = box; e && e !== document.documentElement; e = e.parentElement) { if (e.tagName === 'DETAILS') e.open = true; if (getComputedStyle(e).display === 'none') e.style.display = 'block'; }
      box.scrollIntoView();
    }, sel);
    try { await page.locator(sel).first().screenshot({ path: path.join(shotsDir, name + '.jpg'), type: 'jpeg', quality: 80, timeout: 8000, animations: 'disabled' }); } catch (e) { console.log('   (تعذّرت اللقطة ' + name + ': ' + e.message.split('\n')[0] + ')'); }
  };

  // ── الصفحة الرئيسية: الجدار ونزال الموسم وردود فعل الأسماء وتقارير المجتمع (لوحة المنظّم) ──
  {
    const { page, dialogs, report } = await openPage(browser, 'index.html');
    const round = await page.evaluate(() => getCurrentRoundNumber());
    await page.evaluate(async ({ round, IMG, ATTR }) => {
      const db = firebase.database();
      window._verifiedPid = 1;
      // 1) الجدار: الاسم والنص ومفتاح الرسالة خبيثة
      await db.ref('brookie/wall/' + round).set({
        '"><img src=x onerror="window.__xss=(window.__xss||0)+1">': { pid: 1, name: IMG, text: IMG + ' ' + ATTR, time: Date.now(), reactions: {} }
      });
      // 2) نزال الموسم: مفتاح وبداية الجولة خبيثان (من DB مفتوحة)
      await db.ref('brookie/season-duels').set({
        '"><img src=x onerror="window.__xss=(window.__xss||0)+1">': { challengerPid: 2, opponentPid: 1, startRound: IMG, status: 'pending', createdAt: Date.now() }
      });
      // 3) رد فعل اسم: الإيموجي خبيث
      await db.ref('brookie/name-reactions/' + round).set({ '1': { targetPid: 2, emoji: IMG, time: Date.now() } });
      // 4) تقارير المجتمع في لوحة المنظّم
      const t = round + 1;
      await db.ref('brookie/community-reports/matches/' + t).set({
        '"><img src=x onerror="window.__xss=(window.__xss||0)+1">': { club: IMG, opponent: ATTR, result: IMG, gf: IMG, ga: ATTR, reporter: IMG, submittedAt: 1 }
      });
      await db.ref('brookie/community-reports/points/' + t).set({ '1': { name: IMG, points: IMG, submittedAt: 1 } });
    }, { round, IMG, ATTR });
    // نزال الموسم وردود الأسماء معطّلان في بيانات الاختبار، نفعّلهما هنا لنختبر عرضهما
    await page.evaluate(() => { DATA.seasonDuelEnabled = true; DATA.nameReactionsEnabled = true; renderRoundWall(); renderSeasonDuel(); renderNameReactions(); paintNameReactionSlots(); });
    await page.waitForTimeout(500);
    allOk = (await inspect(page, dialogs, report, '#roundWallBox', 'الجدار (round-wall.js): الاسم والنص ومفتاح الرسالة', IMG)) && allOk;
    await shot(page, '#roundWallBox', 'wall');
    allOk = (await inspect(page, dialogs, report, '#seasonDuelBox', 'نزال الموسم (season-duel.js): المفتاح وبداية الجولة', IMG)) && allOk;
    await shot(page, '#seasonDuelBox', 'season-duel');
    allOk = (await inspect(page, dialogs, report, 'body', 'ردود فعل الأسماء (name-reactions.js): الإيموجي', null)) && allOk;
    const nrBad = await page.evaluate(() => [...document.querySelectorAll('.name-reaction-slot')].some(s => s.querySelector('img[src="x"],[onerror]')));
    console.log(`${nrBad ? '❌' : '✅'} ردود فعل الأسماء: لا وسوم منفَّذة داخل .name-reaction-slot`); allOk = !nrBad && allOk;
    await page.evaluate(async () => { await loadCommunityReports(); });
    await page.waitForTimeout(300);
    allOk = (await inspect(page, dialogs, report, '#communityMatchesBox', 'تقارير المجتمع في لوحة المنظّم (admin-community-reports.js): المباريات', IMG)) && allOk;
    await shot(page, '#communityMatchesBox', 'admin-matches');
    allOk = (await inspect(page, dialogs, report, '#communityPointsBox', 'تقارير المجتمع في لوحة المنظّم: النقاط', IMG)) && allOk;
    await page.close();
  }

  // ── report.html: القوائم الحية (report-main.js) ──
  {
    const m = {}, p = {};
    for (let t = 1; t <= 40; t++) {
      m[t] = { '-k1': { club: IMG, opponent: ATTR, result: IMG, gf: IMG, ga: ATTR, submittedAt: 1 } };
      p[t] = { '1': { name: IMG, points: IMG, submittedAt: 1 } };
    }
    const { page, dialogs, report } = await openPage(browser, 'report.html', { 'community-reports': { matches: m, points: p } });
    await page.waitForTimeout(800);
    allOk = (await inspect(page, dialogs, report, '#matchesLiveList', 'report.html (report-main.js): قائمة المباريات الحية', IMG)) && allOk;
    await shot(page, '#matchesLiveList', 'report-matches');
    allOk = (await inspect(page, dialogs, report, '#pointsLiveList', 'report.html (report-main.js): قائمة النقاط الحية', IMG)) && allOk;
    await page.close();
  }

  await browser.close();
  console.log(allOk ? '\nكل الأماكن تعرض المحتوى الخبيث كنص ✅' : '\nفيه مكان ينفّذ محتوى الزوار ❌');
  process.exit(allOk ? 0 : 1);
})();
