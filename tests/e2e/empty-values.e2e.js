/* اختبار شامل لـ001-T017 (الحالة الفاضية، U-07): ولا "–" أو "—" معروض كقيمة في أي تبويب، بالـfixture الكامل وبجولة فاضية وبعد اختيار الاسم.
 * "كقيمة" = نص ظاهر قيمته الكاملة شرطة (— أو – أو -)، أو ينتهي بها ("جولة —")، أو يتبعها/يسبقها رقم بدل قيمة. الفاصل داخل جملة ("أبو أوس — 6 نقاط") مو قيمة.
 * التشغيل: node tests/e2e/empty-values.e2e.js [--list]  (يحتاج Playwright، وليس جزءًا من tests/run.js). exit 1 لو لقي شيئًا. */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const ff = require(path.join(ROOT, 'tools/fake-firebase.js'));
const { chromium } = require('playwright');
const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));

const TABS = ['standings', 'participants', 'rounds', 'stats', 'rules', 'about', 'admin'];
let failed = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log((ok ? '✅ ' : '❌ ') + name + (ok ? '' : `\n   المتوقع: ${JSON.stringify(want)}\n   الفعلي:  ${JSON.stringify(got)}`));
};

// يرجع كل عقدة نصية ظاهرة تُعرض فيها الشرطة كقيمة
function scanVisible() {
  const DASH = /^[\s]*[—–-][\s]*$/;
  const END = /(^|\s)[—–]\s*$/;           // "جولة —"
  const out = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const t = n.nodeValue;
    if (!t.trim()) continue;
    const el = n.parentElement;
    if (!el || ['SCRIPT', 'STYLE', 'OPTION', 'NOSCRIPT', 'TEXTAREA'].includes(el.tagName)) continue;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden' || cs.display === 'none') continue;
    // مخفي بطيّة <details> مغلقة؟
    const d = el.closest('details:not([open])');
    if (d && !el.closest('summary')) continue;
    // الشرطة "قيمة" لو نص عنصرها كله شرطة، أو كلمة واحدة + شرطة ("جولة —"). الفاصل وسط جملة ("اسم — 6 نقاط") مو قيمة.
    const whole = (el.textContent || '').trim();
    if (DASH.test(t) && (DASH.test(whole) || /^[^\s—–-]+\s+[—–-]$/.test(whole)) || /^[^\s—–-]+\s+[—–-]$/.test(whole) && END.test(t)) out.push({ text: t.trim().slice(0, 60), ctx: el.parentElement ? el.parentElement.outerHTML.replace(/\s+/g, ' ').slice(0, 170) : el.tagName });
  }
  return out;
}

async function open(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript(() => { try { localStorage.setItem('brookie-onboarded', '1'); } catch (e) {} });
  await ff.install(page, { fixture: readJson('tests/fixtures/season.json'), overrides: readJson('tests/fixtures/overrides.json') });
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.waitForTimeout(1500);
  return page;
}

async function scanAllTabs(page) {
  const found = [];
  for (const tab of TABS) {
    await page.click(`nav.tabs button[data-tab="${tab}"]`);
    await page.waitForTimeout(150);
    // نفتح كل الطيّات (ما هو مطوي ما يظهر بلقطة، لكن نتأكد من محتواه بعد الفتح)
    await page.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; }));
    const hits = await page.evaluate(scanVisible);
    hits.forEach(h => found.push(tab + ' · ' + h.text + ' · ' + h.ctx));
  }
  return found;
}

(async () => {
  const browser = await chromium.launch();
  const list = process.argv.includes('--list');
  try {
    // 1) الـfixture الكامل
    const p1 = await open(browser);
    const a = await scanAllTabs(p1);
    if (list) a.forEach(x => console.log('  ' + x));
    check('الـfixture الكامل: ولا شرطة كقيمة ظاهرة في أي تبويب', a, []);
    // 2) بعد اختيار الاسم (حالتي، والملف الشخصي)
    await p1.evaluate(() => applyMyId(3));
    await p1.waitForTimeout(500);
    const b = await scanAllTabs(p1);
    if (list) b.forEach(x => console.log('  ' + x));
    check('بعد اختيار الاسم: ولا شرطة كقيمة', b, []);
    await p1.close();
    // 3) جولة فاضية (بلا جولات مسجّلة)
    const p2 = await open(browser);
    await p2.evaluate(() => { DATA.rounds = []; renderAll(); });
    await p2.waitForTimeout(400);
    const c = await scanAllTabs(p2);
    if (list) c.forEach(x => console.log('  ' + x));
    check('جولة فاضية: ولا شرطة كقيمة', c, []);
    await p2.evaluate(() => applyMyId(3));
    await p2.waitForTimeout(400);
    const d = await scanAllTabs(p2);
    if (list) d.forEach(x => console.log('  ' + x));
    check('جولة فاضية مع اسم مختار: ولا شرطة كقيمة', d, []);
    await p2.close();
  } finally { await browser.close(); }
  console.log(failed ? `\n❌ ${failed} فشل` : '\n✅ كل الفحوص نجحت');
  process.exit(failed ? 1 : 0);
})();
