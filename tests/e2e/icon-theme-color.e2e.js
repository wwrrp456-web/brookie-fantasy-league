/* اختبار 001-T011c-2 (قاعدة S57–S60 رقم 6): لون الأيقونة يتبع الوضع. نقيس getComputedStyle(svg).color لأيقونات التبويبات الرئيسية بالوضعين:
 * (1) لا ألوان ثابتة داخل SVG، (2) ألوان الأيقونات تختلف بين الداكن والفاتح (الأيقونات الحيادية)، (3) تباين كل أيقونة مع خلفيتها ≥ 3:1.
 * التشغيل: node tests/e2e/icon-theme-color.e2e.js [--shots]  (يحتاج Playwright؛ ليس جزءًا من tests/run.js). exit 1 لو فشل شيء. */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const ff = require(path.join(ROOT, 'tools/fake-firebase.js'));
const { chromium } = require('playwright');
const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const SHOTS = process.argv.includes('--shots');

let failed = 0;
const check = (name, ok, detail) => { if (!ok) failed++; console.log((ok ? '✅ ' : '❌ ') + name + (ok || !detail ? '' : '\n   ' + detail)); };

const TABS = ['standings', 'participants', 'rounds', 'stats', 'rules'];

// يجمع كل أيقونات .ic المرئية: لونها المحسوب، وخلفيتها الفعلية (أول خلفية غير شفافة صعودًا)، وهل فيها ألوان ثابتة
const measure = () => {
  // أي صيغة لون (rgb/color()/oklch…) تُحوَّل لـRGBA عبر لوحة 1×1 (تتجنب الاعتماد على صيغة getComputedStyle)
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const parse = c => { if (!c || c === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }; cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; const m = c.match(/(?:\/|,)\s*([\d.]+%?)\s*\)$/); let a = 1; if (m && /^(rgba|hsla|color|oklch|oklab)/.test(c)) a = m[1].endsWith('%') ? parseFloat(m[1]) / 100 : parseFloat(m[1]); return { r: d[0], g: d[1], b: d[2], a: d[3] === 0 ? 0 : a }; };
  const lum = ({ r, g, b }) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  // الخلفية الفعلية: أول خلفية معتمة صعودًا؛ وإن لم توجد (خلفية الصفحة تدرّج فوق شفاف) نستعمل لون الصفحة الأساسي --cream
  const bgOf = el => { for (let n = el; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c.a > 0.95) return { c }; } return { c: parse(getComputedStyle(document.body).getPropertyValue('--cream').trim()) }; };
  const out = [];
  document.querySelectorAll('.ic svg').forEach(svg => {
    const r = svg.getBoundingClientRect();
    if (!r.width || !r.height || getComputedStyle(svg).visibility === 'hidden') return;
    const cs = getComputedStyle(svg);
    const col = parse(cs.color), bg = bgOf(svg);
    const fixed = /(?:stroke|fill)="(?!none|currentColor)[^"]+"/.test(svg.outerHTML) || /style="[^"]*(?:stroke|fill|color)/.test(svg.outerHTML);
    const lumv = 0.2126 * col.r + 0.7152 * col.g + 0.0722 * col.b;
    const semantic = !!svg.closest('.ic-semantic');
    const exempt = !!svg.closest('.btn, .sort-mode-btn, .status-msg');
    out.push({ lum: Math.round(lumv), semantic, exempt, name: (svg.parentElement.className || '') + ' @ ' + (svg.closest('[id]') ? svg.closest('[id]').id : '?'), color: cs.color, bg: `rgb(${bg.c.r},${bg.c.g},${bg.c.b})`, ratio: Math.round(ratio(col, bg.c) * 100) / 100, fixed });
  });
  return out;
};

(async () => {
  const browser = await chromium.launch();
  const modes = {};
  try {
    for (const light of [false, true]) {
      const mode = light ? 'light' : 'dark';
      const page = await browser.newPage({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
      await page.addInitScript(l => { try { localStorage.setItem('brookie-onboarded', '1'); l ? localStorage.setItem('brookie-light-mode', '1') : localStorage.removeItem('brookie-light-mode'); } catch (e) {} }, light);
      await ff.install(page, { fixture: readJson('tests/fixtures/season.json'), overrides: readJson('tests/fixtures/overrides.json') });
      await page.goto('file://' + path.join(ROOT, 'index.html'));
      await page.waitForTimeout(1500);
      await page.addStyleTag({ content: '*{animation:none!important;transition:none!important}' });
      await page.evaluate(() => applyMyId(3));
      await page.waitForTimeout(500);
      let all = [];
      for (const tab of TABS) {
        await page.click(`nav.tabs button[data-tab="${tab}"]`);
        await page.waitForTimeout(250);
        await page.evaluate(() => document.querySelectorAll('section.panel.active details').forEach(d => { d.open = true; }));
        const m = await page.evaluate(measure);
        all = all.concat(m.map(x => ({ ...x, tab })));
        if (SHOTS && tab === 'standings') await page.screenshot({ path: path.join(ROOT, `specs/reports/img/001-T011c-2/icons-390-${mode}.jpg`), type: 'jpeg', quality: 60, fullPage: false });
      }
      modes[mode] = all;
      await page.close();
    }
  } finally { await browser.close(); }

  for (const mode of ['dark', 'light']) {
    const a = modes[mode];
    check(`[${mode}] وُجدت أيقونات مرئية في التبويبات الرئيسية (${a.length})`, a.length >= 30, `العدد ${a.length}`);
    const fixed = a.filter(x => x.fixed);
    check(`[${mode}] لا أيقونة بلون ثابت داخل الـSVG`, fixed.length === 0, JSON.stringify(fixed.slice(0, 5)));
    const low = a.filter(x => x.ratio < 3);
    check(`[${mode}] تباين كل أيقونة مع خلفيتها ≥ 3:1`, low.length === 0, low.slice(0, 8).map(x => `${x.tab}/${x.name} ${x.color} على ${x.bg} = ${x.ratio}`).join('\n   '));
  }
  // S67: بالوضع الليلي كل أيقونة زخرفية لمعانها > 180. المستثنى صراحةً: الدلالية (.ic-semantic: صعود/هبوط وحالة)، وأيقونات داخل مكوّنات تحدّد لون نصها فوق خلفية مملوءة (.btn و.sort-mode-btn و.status-msg)
  const decorDark = modes.dark.filter(x => !x.semantic && !x.exempt);
  const dim = decorDark.filter(x => x.lum <= 180);
  check(`[dark] كل الأيقونات الزخرفية فاتحة (لمعان > 180)، ${decorDark.length} أيقونة`, dim.length === 0, dim.slice(0, 8).map(x => `${x.tab}/${x.name} ${x.color} (${x.lum})`).join('\n   '));
  const sem = modes.dark.filter(x => x.semantic);
  check('الدلالية موسومة .ic-semantic وموجودة بالصفحة (مستثناة بوسم لا بأسماء)', sem.length >= 1, `العدد ${sem.length}`);
  // النهاري كما هو: الزخرفية غير الدلالية بالنهاري ما صارت بيضاء
  check('[light] لا أيقونة زخرفية بيضاء على الخلفية الفاتحة (لمعان ≤ 180 لغير المستثناة)', modes.light.filter(x => !x.semantic && !x.exempt && x.lum > 180).length === 0, JSON.stringify(modes.light.filter(x => !x.semantic && !x.exempt && x.lum > 180).slice(0, 4)));
  // الأيقونات الحيادية (تأخذ لون النص): لونها بالداكن فاتح وبالفاتح داكن، ويختلفان
  const lumOf = c => { const p = c.match(/\d+/g).map(Number); return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]; };
  const darkSet = new Set(modes.dark.map(x => x.color)), lightSet = new Set(modes.light.map(x => x.color));
  const onlyDark = [...darkSet].filter(c => !lightSet.has(c));
  check('ألوان الأيقونات تختلف بين الوضعين', onlyDark.length > 0 && [...lightSet].some(c => !darkSet.has(c)), `داكن: ${[...darkSet].join(' | ')}\n   فاتح: ${[...lightSet].join(' | ')}`);
  const dMax = Math.max(...modes.dark.map(x => lumOf(x.color))), lMin = Math.min(...modes.light.map(x => lumOf(x.color)));
  check('بالداكن توجد أيقونات فاتحة، وبالفاتح توجد أيقونات داكنة', dMax > 180 && lMin < 100, `أفتح داكن=${Math.round(dMax)} أغمق فاتح=${Math.round(lMin)}`);
  console.log(failed ? `\n❌ ${failed} فشل` : '\n✅ كل الفحوص نجحت');
  process.exit(failed ? 1 : 0);
})();
