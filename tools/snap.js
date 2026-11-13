#!/usr/bin/env node
/* لقطات الموقع والكروت بدون إنترنت وبدون Firebase الحي (000-T008، plan.md §3 "tools/snap.js").
 *
 *   node tools/snap.js [--label head] [--root .] [--fixture tests/fixtures/season.json]
 *                      [--overrides tests/fixtures/overrides.json]
 *                      [--now 2026-11-12T00:05:53Z] [--only tabs|cards|pages] [--out snapshots]
 *
 * - خادم ثابت (نفس منطق .claude/static-server.js) على منفذ عشوائي، وكل طلب خارج نفس المنشأ يُحجب.
 * - يحقن: Firebase الوهمي (tools/fake-firebase.js) وبيانات الـfixture، والوقت المجمّد (page.clock.setFixedTime)،
 *   و Math.random ببذرة ثابتة، و brookie-onboarded=1، ووضع الثيم، ويوقف الحركات (animation/transition).
 * - التبويبات: 7 × عرضان (390، 1366) × ثيمان (داكن، فاتح) = 28 لقطة كاملة الطول.
 * - الكروت: 6 دوال بناء × 3 حالات (full، incomplete، long) = 18 لقطة.
 * - الصفحات: لوحة معاينة الأصول assets/preview.html × عرضان × ثيمان = 4 لقطات (001-T010).
 * - المخرجات: <out>/<label>/*.png + report.json (أخطاء الكونسول، والطلبات المحجوبة، والدوال الوهمية الناقصة).
 * - exit 1 لو فيه خطأ JS غير متوقع أو بناء كرت فشل بدون سبب متوقع.
 * القيمة الافتراضية لـ--now = تاريخ تصدير النسخة الاحتياطية (fixture.exportedAt)، فتبقى النتائج ثابتة عبر الأيام. */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');
const fakeFirebase = require('./fake-firebase.js');

const TABS = ['standings', 'participants', 'rounds', 'stats', 'rules', 'about', 'admin'];
const WIDTHS = [390, 1366];
const THEMES = ['dark', 'light'];
const STATES = ['full', 'incomplete', 'long'];
const CARDS = ['championCard', 'championCardLight', 'standingsCard', 'standingsCardLight', 'seasonWrap', 'seasonWrapLight', 'profileCard', 'profileCardLight', 'duelCard', 'duelCardLight', 'certificate'];
const LONGEST_NAME = 'أبو تغريد (زيد) الثاني';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };

function serve(root) {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const file = path.join(root, p);
      if (!file.startsWith(root)) { res.writeHead(403); return res.end('Forbidden'); }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found: ' + p); }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
        res.end(data);
      });
    }).listen(0, '127.0.0.1', () => resolve({ srv, origin: 'http://127.0.0.1:' + srv.address().port }));
  });
}

// يوقف الحركات ويثبّت العشوائية قبل أي سكربت، ويضبط الثيم وعلم الترحيب
const FREEZE_CSS = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}';
function initScript({ light }) {
  return `(() => {
    try { localStorage.setItem('brookie-onboarded', '1'); ${light ? "localStorage.setItem('brookie-light-mode', '1');" : "localStorage.removeItem('brookie-light-mode');"} } catch (e) {}
    let s = 123456789; // mulberry32 ببذرة ثابتة: نفس الأرقام العشوائية في كل تشغيلة
    Math.random = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  })();`;
}

async function openPage(browser, ctx, { width, light, url = '/index.html' }) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, locale: 'ar', timezoneId: 'Asia/Riyadh', reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date(ctx.now));
  await page.addInitScript(initScript({ light }));
  const report = await fakeFirebase.install(page, { fixture: ctx.fixture, overrides: ctx.overrides, allowOrigin: ctx.origin });
  report.consoleErrors.length = 0;
  await page.goto(ctx.origin + url);
  await page.addStyleTag({ content: FREEZE_CSS });
  await page.evaluate(async () => { try { await document.fonts.ready; } catch (e) {} });
  await page.waitForTimeout(700);
  return { page, context, report };
}

// لقطة كاملة الطول: نضبط الـviewport على ارتفاع الصفحة الفعلي ثم نلتقط (بدل fullPage)، لأن fullPage يقلب
// الـviewport مؤقتًا فتتذبذب حواف بعض العناصر بين لقطة ولقطة. ونعتمد اللقطة لو تطابقت مع اللي بعدها.
async function fullShot(page, width, tries = 4) {
  let h = 0;
  for (let i = 0; i < 4; i++) {
    const cur = await page.evaluate(() => document.documentElement.scrollHeight);
    if (cur === h) break;
    h = cur;
    await page.setViewportSize({ width, height: Math.max(h, 400) });
    await page.waitForTimeout(250);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  let prev = await page.screenshot();
  for (let i = 0; i < tries; i++) {
    await page.waitForTimeout(120);
    const cur = await page.screenshot();
    if (cur.equals(prev)) return cur;
    prev = cur;
  }
  throw new Error('اللقطة غير مستقرة بعد ' + tries + ' محاولات');
}

async function snapTabs(browser, ctx, outDir, files, reports) {
  for (const width of WIDTHS) for (const theme of THEMES) {
    const { page, context, report } = await openPage(browser, ctx, { width, light: theme === 'light' });
    for (const tab of TABS) {
      await page.evaluate(t => { const b = document.querySelector(`nav.tabs button[data-tab="${t}"]`); if (b) b.click(); }, tab);
      await page.waitForTimeout(250);
      await page.evaluate(() => window.scrollTo(0, 0));
      const name = `tab-${tab}-${width}-${theme}.png`;
      fs.writeFileSync(path.join(outDir, name), await fullShot(page, width));
      files.push(name);
    }
    reports.push(report);
    await context.close();
  }
}

// صفحات مستقلة غير index.html (لوحة معاينة الأصول): عرضان × ثيمان
const PAGES = [{ name: 'preview', url: '/assets/preview.html' }];
// صفحة ملفها غير موجود تحت --root (مثل صفحة جديدة في الـPR والأساس ما فيه) تُتخطّى وتُسجَّل في report.json
// (skippedPages) ولا تُعدّ خطأ (F2)؛ وsnap-diff يعرضها تلقائيًا "جديدة". هذا يخلّي أدوات الـPR تشتغل على كود الأساس.
async function snapPages(browser, ctx, outDir, files, reports, skipped) {
  for (const pg of PAGES) {
    if (!fs.existsSync(path.join(ctx.root, pg.url))) {
      skipped.push({ page: pg.name, file: pg.url.replace(/^\//, ''), reason: 'غير موجودة تحت --root' });
      console.log(`تخطّي الصفحة «${pg.name}»: ${pg.url} غير موجودة تحت ${ctx.root}`);
      continue;
    }
    await snapPage(browser, ctx, outDir, files, reports, pg);
  }
}
async function snapPage(browser, ctx, outDir, files, reports, pg) {
  for (const width of WIDTHS) for (const theme of THEMES) {
    const { page, context, report } = await openPage(browser, ctx, { width, light: theme === 'light', url: pg.url });
    const name = `page-${pg.name}-${width}-${theme}.png`;
    fs.writeFileSync(path.join(outDir, name), await fullShot(page, width));
    files.push(name);
    reports.push(report);
    await context.close();
  }
}

// حالة الكرت: تعدّل بيانات الصفحة نفسها (بدون لمس الريبو)
async function prepareState(page, state) {
  return page.evaluate(([st, longName]) => {
    const champ = PARTICIPANTS.find(p => p.id === 1) || PARTICIPANTS[0];
    let pid = champ.id;
    if (st === 'full') { CHAMPION_ID = champ.id; }
    if (st === 'incomplete') {
      // بلا بطل، ومشارك بلا أي نقاط (حذف مشاركاته من كل الجولات)
      CHAMPION_ID = null;
      const victim = PARTICIPANTS[PARTICIPANTS.length - 1];
      DATA.rounds.forEach(r => { if (r && Array.isArray(r.entries)) r.entries[victim.id] = null; });
      pid = victim.id;
    }
    if (st === 'long') {
      // الاسم الأطول لمتصدّر الترتيب (يظهر في كروت الترتيب والستوري) وهو أيضًا البطل (كرت البطل والشهادة وملفه)
      const leader = PARTICIPANTS.find(p => p.id === computeStandings()[0].id);
      leader.name = longName; CHAMPION_ID = leader.id; pid = leader.id;
    }
    return pid;
  }, [state, LONGEST_NAME]);
}

async function snapCards(browser, ctx, outDir, files, reports, cardErrors, skippedCards, label) {
  for (const state of STATES) {
    const { page, context, report } = await openPage(browser, ctx, { width: 1080, light: false });
    const pid = await prepareState(page, state);
    await page.evaluate(() => { try { renderAll(); } catch (e) {} });
    for (const card of CARDS) {
      const res = await page.evaluate(async ([c, p]) => {
        try {
          const build = { championCard: () => buildChampionCardCanvas({theme: 'dark'}), championCardLight: () => buildChampionCardCanvas({theme: 'light'}), standingsCard: () => buildStandingsCardCanvas({theme: 'dark'}), standingsCardLight: () => buildStandingsCardCanvas({theme: 'light'}),
            seasonWrap: () => buildSeasonWrapCardCanvas({theme: 'dark'}), seasonWrapLight: () => buildSeasonWrapCardCanvas({theme: 'light'}), profileCard: id => buildParticipantProfileCardCanvas(id, {theme: 'dark'}), profileCardLight: id => buildParticipantProfileCardCanvas(id, {theme: 'light'}), duelCard: () => { const d = computeWeeklyDuels().find(x => !x.bye); return buildDuelCardCanvas({theme: 'dark', data: getDuelCardData(d.a.id, d.b.id)}); }, duelCardLight: () => { const d = computeWeeklyDuels().find(x => !x.bye); return buildDuelCardCanvas({theme: 'light', data: getDuelCardData(d.a.id, d.b.id)}); }, certificate: () => buildChampionCertificateCanvas() }[c];
          if (typeof build !== 'function') return { ok: false, error: 'نوع الكرت غير معروف' };
          const cv = await build(p);
          return { ok: true, url: cv.toDataURL('image/png'), w: cv.width, h: cv.height };
        } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
      }, [card, pid]);
      if (res.ok) {
        const name = `card-${card}-${state}.png`;
        fs.writeFileSync(path.join(outDir, name), Buffer.from(res.url.split(',')[1], 'base64'));
        files.push(name);
      } else {
        // كود الأساس (--label base) قد يسبق دوال الكروت الجديدة: تُسجَّل مُتجاوَزة لا خطأ. وفي head تبقى خطأً.
        if (label === 'base' && /is not defined|is not a function/.test(res.error)) skippedCards.push({ card, state, reason: res.error });
        else cardErrors.push({ card, state, error: res.error });
      }
    }
    reports.push(report);
    await context.close();
  }
}

async function main(argv) {
  const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
  const t0 = Date.now();
  const root = path.resolve(arg('--root', path.join(__dirname, '..')));
  const label = arg('--label', 'head');
  const only = arg('--only', null);
  if (only && !['tabs', 'cards', 'pages'].includes(only)) { console.error('--only لازم يكون tabs أو cards أو pages'); return 2; }
  const outDir = path.resolve(arg('--out', 'snapshots'), label);
  const fixture = JSON.parse(fs.readFileSync(path.resolve(arg('--fixture', path.join(__dirname, '../tests/fixtures/season.json'))), 'utf8'));
  const overrides = JSON.parse(fs.readFileSync(path.resolve(arg('--overrides', path.join(__dirname, '../tests/fixtures/overrides.json'))), 'utf8'));
  const now = arg('--now', fixture.exportedAt);
  if (!now || isNaN(new Date(now).getTime())) { console.error('--now غير صالح ولا يوجد exportedAt في الـfixture'); return 2; }

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const { srv, origin } = await serve(root);
  const browser = await chromium.launch();
  const ctx = { fixture, overrides, now, origin, root };
  const files = [], reports = [], cardErrors = [], skippedPages = [], skippedCards = [];
  try {
    if (!only || only === 'tabs') await snapTabs(browser, ctx, outDir, files, reports);
    if (!only || only === 'pages') await snapPages(browser, ctx, outDir, files, reports, skippedPages);
    if (!only || only === 'cards') await snapCards(browser, ctx, outDir, files, reports, cardErrors, skippedCards, label);
  } finally {
    await browser.close();
    srv.close();
  }

  const uniq = a => [...new Set(a)];
  const unsupported = [];
  for (const r of reports) unsupported.push(...(await r.unsupported().catch(() => [])));
  const report = {
    label, root, now, seconds: Math.round((Date.now() - t0) / 100) / 10,
    files: files.length, tabs: files.filter(f => f.startsWith('tab-')).length, pages: files.filter(f => f.startsWith('page-')).length, cards: files.filter(f => f.startsWith('card-')).length,
    consoleErrors: uniq([].concat(...reports.map(r => r.consoleErrors))),
    pageErrors: uniq([].concat(...reports.map(r => r.pageErrors))),
    blockedRequests: uniq([].concat(...reports.map(r => r.blocked))).sort(),
    unsupportedFirebase: uniq(unsupported),
    cardErrors,
    skippedCards,
    skippedPages
  };
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`لقطات: ${report.tabs} تبويب + ${report.pages} صفحة + ${report.cards} كرت = ${report.files} ملف في ${path.relative(process.cwd(), outDir) || outDir} (${report.seconds} ث)`);
  const fatal = report.pageErrors.length + report.consoleErrors.length + report.unsupportedFirebase.length + cardErrors.length;
  if (report.consoleErrors.length) console.error('أخطاء كونسول:\n  ' + report.consoleErrors.join('\n  '));
  if (report.pageErrors.length) console.error('أخطاء صفحة:\n  ' + report.pageErrors.join('\n  '));
  if (report.unsupportedFirebase.length) console.error('دوال Firebase غير مدعومة: ' + report.unsupportedFirebase.join('، '));
  if (cardErrors.length) console.error('فشل بناء كروت:\n  ' + cardErrors.map(c => `${c.card}/${c.state}: ${c.error}`).join('\n  '));
  return fatal ? 1 : 0;
}

if (require.main === module) main(process.argv.slice(2)).then(c => process.exit(c), e => { console.error(e); process.exit(2); });
module.exports = { main, serve, openPage, TABS, WIDTHS, THEMES, STATES, CARDS };
