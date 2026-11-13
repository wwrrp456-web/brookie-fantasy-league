/* اختبار شامل لـ001-T019 (وضوح الإحصائيات، FR-18، U-09): الأرقام المعروضة هي نفس أرقام الدوال الحالية (ما تغيّرت)،
 * كفاءة الأندية بأشرطة نسبية، والسلاسل مجمّعة ("17 مشاركًا على سلسلة جولتين") مع أبرز 3 بالاسم، والتبويب أقصر بكثير، وما انحذفت ميزة.
 * التشغيل: node tests/e2e/stats-clarity.e2e.js  (يحتاج Playwright، وليس جزءًا من tests/run.js). exit 1 لو فشل شيء. */
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
    const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.addInitScript(() => { try { localStorage.setItem('brookie-onboarded', '1'); } catch (e) {} });
    await ff.install(p, { fixture: readJson('tests/fixtures/season.json'), overrides: readJson('tests/fixtures/overrides.json') });
    await p.goto('file://' + path.join(ROOT, 'index.html'));
    await p.waitForTimeout(1500);
    await p.click('nav.tabs button[data-tab="stats"]');
    await p.waitForTimeout(300);

    // ---- كفاءة الأندية: نفس أرقام getClubStats
    const eff = await p.evaluate(() => {
      const want = getClubStats().filter(c => c.played > 0).sort((a, b) => b.avg - a.avg).map(c => ({ name: c.name, avg: Math.round(c.avg * 10) / 10, v: Math.min(c.avg, 3) }));
      const got = [...document.querySelectorAll('#clubEfficiencyBox .efficiency-row')].map(r => ({ name: r.querySelector('.efficiency-name').textContent, avg: Number(r.querySelector('b').textContent), v: Number(r.querySelector('progress').value) }));
      return { want, got, max: [...document.querySelectorAll('#clubEfficiencyBox progress')].every(g => g.max === 3) };
    });
    check('كفاءة الأندية: نفس الأندية والمتوسطات والترتيب (من getClubStats) بلا حذف', eff.got.map(g => [g.name, g.avg]), eff.want.map(w => [w.name, w.avg]));
    check('الأشرطة نسبية على مقياس ثابت من 3 (value = المتوسط الفعلي)', [eff.max, eff.got.every((g, i) => Math.abs(g.v - eff.want[i].v) < 1e-9)], [true, true]);
    check('أعلى 10 ظاهرة والباقي بطيّة', await p.evaluate(() => [document.querySelectorAll('#clubEfficiencyBox > .club-eff > .efficiency-row').length, !!document.querySelector('#clubEfficiencyBox details.eff-more')]), [10, true]);

    // ---- السلاسل: مجمّعة، الأرقام نفس computeCurrentStreaks
    const st = await p.evaluate(() => {
      DATA.hotColdStreaksEnabled = true; renderHotColdStreaks();
      const raw = computeCurrentStreaks();
      const groups = [...document.querySelectorAll('#hotColdStreaksBox .streak-group')];
      const sum = groups.reduce((n, g) => { const m = g.querySelector('h3').textContent; return n; }, 0);
      return { rawN: raw.length, groups: groups.map(g => ({ h3: g.querySelector('h3').textContent.trim(), cls: g.className, pills: g.querySelectorAll('.pill:not(.pill-more)').length, more: (g.querySelector('.pill-more') || {}).textContent || '' })), rawKeys: [...new Set(raw.map(r => r.type + '|' + r.count))].length };
    });
    check('سلاسل الحظ: مجموعة لكل (نوع، طول) وبالأرقام نفسها', st.groups.length, st.rawKeys);
    check('كل مجموعة: أبرز 3 بالاسم كحد أقصى، و"+N" للباقي', st.groups.every(g => g.pills >= 1 && g.pills <= 3), true);
    check('عنوان المجموعة بصيغة المعجم ("N مشاركًا على سلسلة جولتين/N جولات")', st.groups.every(g => /(مشارك واحد|مشاركان|مشاركين|\d+ مشاركًا|\d+ مشاركين) على سلسلة (جولتين|\d+ جولات|\d+ جولة)/.test(g.h3)), true);
    const total = await p.evaluate(() => {
      const raw = computeCurrentStreaks();
      return [...document.querySelectorAll('#hotColdStreaksBox .streak-group')].every(g => true) && raw.length;
    });
    check('مجموع المشاركين بالمجموعات = عدد من لهم سلسلة', await p.evaluate(() => {
      let n = 0;
      document.querySelectorAll('#hotColdStreaksBox .streak-group').forEach(g => { n += g.querySelectorAll('.pill:not(.pill-more)').length + Number(((g.querySelector('.pill-more') || {}).textContent || '+0').replace('+', '')); });
      return n === computeCurrentStreaks().length;
    }), true);

    // ---- الطول
    const h = await p.evaluate(() => document.documentElement.scrollHeight);
    check('طول تبويب الإحصائيات على 390 أقل من 4000px (كان 13,178px)', h < 4000, true);

    // ---- ما انحذفت ميزة: كل الصناديق موجودة، ولها مكان
    const boxes = ['chartBox', 'recordsBox', 'hotColdStreaksBox', 'h2hBox', 'predictionAccuracyBox', 'clubEfficiencyBox', 'rankLeaderboardBox', 'deathMapBox', 'radarBox', 'smartProfileBox', 'raceBox', 'clubMapBox', 'clubStatsBox', 'clubSwapLabBox', 'hallOfFameBox', 'seasonsArchiveBox', 'subGroupsBox', 'predChallengeBox'];
    check('كل أقسام الإحصائيات موجودة', await p.evaluate(b => b.filter(i => !document.getElementById(i)), boxes), []);
    check('الأقسام الثقيلة داخل طيّات مطوية افتراضيًا', await p.evaluate(() => ['foldStatsPeople', 'foldStatsClubs', 'foldSwapLab'].map(i => { const f = document.getElementById(i); return [!!f, f && f.open]; })), [[true, false], [true, false], [true, false]]);
    await p.evaluate(() => document.querySelectorAll('#statsFolds details').forEach(d => { d.open = true; }));
    check('محتوى الأقسام المطوية يُرسم (خريطة الممات، الرادار، التحليل الذكي، خريطة الأندية)', await p.evaluate(() => ['deathMapBox', 'radarBox', 'smartProfileBox', 'clubMapBox'].map(i => document.getElementById(i).children.length > 0)), [true, true, true, true]);
    await p.evaluate(() => document.querySelectorAll('#statsFolds details').forEach(d => { d.open = false; }));
    // التنقل السريع يفتح الطيّة
    const nav = await p.evaluate(() => { const c = [...document.querySelectorAll('.stats-quick-nav-chip')].find(x => document.getElementById(x.dataset.target).closest('#foldStatsPeople')); if (!c) return false; c.click(); return document.getElementById('foldStatsPeople').open; });
    check('التنقل السريع: شريحة قسم داخل الطيّة تفتحها', nav, true);
    check('لا أخطاء JS', errors, []);
  } finally { await browser.close(); }
  console.log(failed ? `\n❌ ${failed} فشل` : '\n✅ كل الفحوص نجحت');
  process.exit(failed ? 1 : 0);
})();
