/* اختبار 001-T011c-3 (S59): لوحة المنظّم وصفحة الإبلاغ بلا إيموجي، وأيقونات `iconHTML` تظهر وتتبع الوضع.
 * يدخل بالرمز (CURRENT_ADMIN_PIN) ويفتح كل الأقسام، ويفحص: (1) لا إيموجي بنص اللوحة، (2) حبوب الحالة أيقونة + «مفعّل/معطّل» (ليست بلون وحده)،
 * (3) أيقونات اللوحة وصفحة الإبلاغ فاتحة بالليلي وتباينها ≥ 3:1 بالوضعين، (4) بلا كتابة على Firebase (القراءة فقط).
 * التشغيل: node tests/e2e/admin-icons.e2e.js [--shots]  (يحتاج Playwright؛ ليس جزءًا من tests/run.js). exit 1 لو فشل شيء. */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const ff = require(path.join(ROOT, 'tools/fake-firebase.js'));
const { chromium } = require('playwright');
const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const SHOTS = process.argv.includes('--shots');
let failed = 0;
const check = (name, ok, detail) => { if (!ok) failed++; console.log((ok ? '✅ ' : '❌ ') + name + (ok || !detail ? '' : '\n   ' + detail)); };

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
const EMO_TEST = () => /\p{Extended_Pictographic}/u;

(async () => {
  const browser = await chromium.launch();
  try {
    for (const light of [false, true]) {
      const mode = light ? 'light' : 'dark';
      const page = await browser.newPage({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
      await page.addInitScript(l => { try { localStorage.setItem('brookie-onboarded', '1'); l ? localStorage.setItem('brookie-light-mode', '1') : localStorage.removeItem('brookie-light-mode'); } catch (e) {} }, light);
      await ff.install(page, { fixture: readJson('tests/fixtures/season.json'), overrides: readJson('tests/fixtures/overrides.json') });
      await page.goto('file://' + path.join(ROOT, 'index.html'));
      await page.waitForTimeout(1500);
      await page.addStyleTag({ content: '*{animation:none!important;transition:none!important}' });
      const w0 = await page.evaluate(() => (window.__FAKE_FIREBASE__ ? window.__FAKE_FIREBASE__.writes : 0));
      await page.click('nav.tabs button[data-tab="admin"]');
      await page.fill('#pinInput', await page.evaluate(() => CURRENT_ADMIN_PIN));
      await page.click('#loginBtn');
      await page.waitForTimeout(600);
      await page.evaluate(() => { document.querySelectorAll('#adminPanel details').forEach(d => { d.open = true; }); if (typeof updateRoundSettingsStatus === 'function') updateRoundSettingsStatus(); });
      await page.waitForTimeout(300);

      const emo = await page.evaluate(() => { const t = document.getElementById('adminPanel').innerText; return [...t.matchAll(/\p{Extended_Pictographic}/gu)].map(m => m[0]); });
      check(`[${mode}] لوحة المنظّم بلا إيموجي`, emo.length === 0, JSON.stringify(emo.slice(0, 10)));

      const pills = await page.evaluate(() => [...document.querySelectorAll('#adminPanel .status-pill')].map(p => ({ svg: !!p.querySelector('svg'), txt: p.textContent.replace(/\s+/g, ' ').trim(), cls: p.className })));
      check(`[${mode}] حبوب الحالة: أيقونة + نص مفعّل/معطّل (ليست بلون وحده)`, pills.length >= 10 && pills.every(p => p.svg && /مفعّل|معطّل/.test(p.txt) && /\b(on|off)\b/.test(p.cls)), JSON.stringify(pills.filter(p => !(p.svg && /مفعّل|معطّل/.test(p.txt))).slice(0, 3)));

      const m = await page.evaluate(measure, '#adminPanel');
      check(`[${mode}] أيقونات اللوحة موجودة (${m.length})`, m.length >= 20, `العدد ${m.length}`);
      check(`[${mode}] تباين كل أيقونة باللوحة ≥ 3:1`, m.filter(x => x.ratio < 3).length === 0, JSON.stringify(m.filter(x => x.ratio < 3).slice(0, 5)));
      if (!light) check('[dark] أيقونات اللوحة الزخرفية فاتحة (لمعان > 180)', m.filter(x => !x.exempt && x.lum <= 180).length === 0, JSON.stringify(m.filter(x => !x.exempt && x.lum <= 180).slice(0, 5)));
      if (SHOTS) {
        await page.evaluate(() => { document.getElementById('adminPanel').scrollIntoView(); });
        await page.screenshot({ path: path.join(ROOT, `specs/reports/img/001-T011c-3/admin-390-${mode}.jpg`), type: 'jpeg', quality: 60 });
      }
      const w1 = await page.evaluate(() => (window.__FAKE_FIREBASE__ ? window.__FAKE_FIREBASE__.writes : 0));
      check(`[${mode}] بلا كتابة على Firebase`, w1 - w0 === 0, `الكتابات ${w1 - w0}`);
      await page.close();

      // صفحة الإبلاغ
      const rp = await browser.newPage({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
      await rp.addInitScript(l => { try { localStorage.setItem('brookie-onboarded', '1'); l ? localStorage.setItem('brookie-light-mode', '1') : localStorage.removeItem('brookie-light-mode'); } catch (e) {} }, light);
      await ff.install(rp, { fixture: readJson('tests/fixtures/season.json'), overrides: readJson('tests/fixtures/overrides.json') });
      await rp.goto('file://' + path.join(ROOT, 'report.html'));
      await rp.waitForTimeout(1200);
      const remo = await rp.evaluate(() => [...document.body.innerText.matchAll(/\p{Extended_Pictographic}/gu)].map(x => x[0]));
      check(`[${mode}] صفحة الإبلاغ بلا إيموجي`, remo.length === 0, JSON.stringify(remo));
      const rm = await rp.evaluate(measure, 'body');
      check(`[${mode}] صفحة الإبلاغ: أيقونات (${rm.length}) وتباينها ≥ 3:1`, rm.length >= 3 && rm.filter(x => x.ratio < 3).length === 0, JSON.stringify(rm.slice(0, 4)));
      if (SHOTS) await rp.screenshot({ path: path.join(ROOT, `specs/reports/img/001-T011c-3/report-390-${mode}.jpg`), type: 'jpeg', quality: 60 });
      await rp.close();
    }
  } finally { await browser.close(); }
  console.log(failed ? `\n❌ ${failed} فشل` : '\n✅ كل الفحوص نجحت');
  process.exit(failed ? 1 : 0);
})();
