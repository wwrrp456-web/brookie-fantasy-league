/* اختبار 001-T011c-4 (S60): تبويبات الإحصائيات والجولات واللائحة (وعن الدوري) بلا إيموجي، وأيقونات `iconHTML` تظهر وتتبع الوضع.
 * المستثنى عمدًا: ردود جدار الجولة (🔥 😂 💀 👑، قيم يختارها الأعضاء، الدستور 10) وعَلَم إنجلترا بخريطة الدوريات (بيانات).
 * التشغيل: node tests/e2e/stats-icons.e2e.js [--shots]  (يحتاج Playwright؛ ليس جزءًا من tests/run.js). exit 1 لو فشل شيء. */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const ff = require(path.join(ROOT, 'tools/fake-firebase.js'));
const { chromium } = require('playwright');
const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const SHOTS = process.argv.includes('--shots');
let failed = 0;
const check = (name, ok, detail) => { if (!ok) failed++; console.log((ok ? '\u2705 ' : '\u274C ') + name + (ok || !detail ? '' : '\n   ' + detail)); };

const measure = scopeSel => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const parse = c => { if (!c || c === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }; cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 }; };
  const lum = ({ r, g, b }) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgOf = el => { for (let n = el; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c.a > 0.95) return c; } return parse(getComputedStyle(document.body).getPropertyValue('--cream').trim()); };
  const out = [];
  document.querySelectorAll((scopeSel || 'body') + ' .ic svg').forEach(svg => {
    const r = svg.getBoundingClientRect();
    if (!r.width || !r.height || getComputedStyle(svg).visibility === 'hidden') return;
    const col = parse(getComputedStyle(svg).color), bg = bgOf(svg);
    out.push({ id: (svg.closest('[id]') || {}).id || '?', cls: svg.parentElement.className, lum: Math.round(0.2126 * col.r + 0.7152 * col.g + 0.0722 * col.b), ratio: Math.round(ratio(col, bg) * 100) / 100,
      exempt: !!svg.closest('.ic-semantic, .btn, .sort-mode-btn, .status-msg, .status-pill') });
  });
  return out;
};

const ALLOWED = new Set(['\u{1F525}', '\u{1F602}', '\u{1F480}', '\u{1F451}', '\u{1F3F4}']);
const TABS = ['stats', 'rounds', 'rules', 'about'];

(async () => {
  const browser = await chromium.launch();
  try {
    for (const light of [false, true]) {
      const mode = light ? 'light' : 'dark';
      const page = await browser.newPage({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
      const errs = [];
      page.on('pageerror', e => errs.push(String(e)));
      await page.addInitScript(l => { try { localStorage.setItem('brookie-onboarded', '1'); l ? localStorage.setItem('brookie-light-mode', '1') : localStorage.removeItem('brookie-light-mode'); } catch (e) {} }, light);
      await ff.install(page, { fixture: readJson('tests/fixtures/season.json'), overrides: readJson('tests/fixtures/overrides.json') });
      await page.goto('file://' + path.join(ROOT, 'index.html'));
      await page.waitForTimeout(1500);
      await page.addStyleTag({ content: '*{animation:none!important;transition:none!important}' });
      const w0 = await page.evaluate(() => (window.__FAKE_FIREBASE__ ? window.__FAKE_FIREBASE__.writes : 0));
      for (const t of TABS) {
        await page.click(`nav.tabs button[data-tab="${t}"]`);
        await page.waitForTimeout(500);
        await page.evaluate(id => { document.querySelectorAll('#panel-' + id + ' details').forEach(d => { d.open = true; }); }, t);
        const emo = await page.evaluate(id => [...document.getElementById('panel-' + id).innerText.matchAll(/\p{Extended_Pictographic}/gu)].map(m => m[0]), t);
        const bad = emo.filter(e => !ALLOWED.has(e.codePointAt(0) ? String.fromCodePoint(e.codePointAt(0)) : e));
        check(`[${mode}] تبويب ${t} بلا إيموجي (عدا المستثنى)`, bad.length === 0, JSON.stringify(bad.slice(0, 10)));
        const m = await page.evaluate(measure, '#panel-' + t);
        check(`[${mode}] ${t}: أيقونات (${m.length}) وتباينها \u2265 3:1`, (t === 'about' || m.length >= 1) && m.filter(x => x.ratio < 3).length === 0, JSON.stringify(m.filter(x => x.ratio < 3).slice(0, 5)));
        if (!light) check(`[dark] ${t}: الأيقونات الزخرفية فاتحة (لمعان > 180)`, m.filter(x => !x.exempt && x.lum <= 180).length === 0, JSON.stringify(m.filter(x => !x.exempt && x.lum <= 180).slice(0, 5)));
        const big = await page.evaluate(id => [...document.querySelectorAll('#panel-' + id + ' button svg')].filter(s => s.getBoundingClientRect().width > 48).length, t);
        check(`[${mode}] ${t}: لا أيقونة داخل زر أكبر من 48px`, big === 0, 'العدد ' + big);
        if (SHOTS) { await page.evaluate(id => document.getElementById('panel-' + id).scrollIntoView(), t); await page.screenshot({ path: path.join(ROOT, `specs/reports/img/001-T011c-4/${t}-390-${mode}.jpg`), type: 'jpeg', quality: 55 }); }
      }
      // أوسمة الجولة (عناوين الجولة) وأوسمة الموسم تُعرض بأيقونة لا نص إيموجي
      await page.click('nav.tabs button[data-tab="rounds"]');
      const chips = await page.evaluate(() => [...document.querySelectorAll('.round-title-chip')].map(c => !!c.querySelector('svg')));
      check(`[${mode}] شارات ألقاب الجولة بأيقونة (${chips.length})`, chips.every(Boolean), JSON.stringify(chips));
      check(`[${mode}] بلا أخطاء JS`, errs.length === 0, errs.join('|'));
      const w1 = await page.evaluate(() => (window.__FAKE_FIREBASE__ ? window.__FAKE_FIREBASE__.writes : 0));
      check(`[${mode}] بلا كتابة على Firebase`, w1 - w0 === 0, `الكتابات ${w1 - w0}`);
      await page.close();
    }
  } finally { await browser.close(); }
  console.log(failed ? `\n\u274C ${failed} فشل` : '\n\u2705 كل الفحوص نجحت');
  process.exit(failed ? 1 : 0);
})();
