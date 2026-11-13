#!/usr/bin/env node
/* فحص تباين النص بـaxe-core (001-T020، SC-09: ≥ 4.5:1) على التبويبات السبعة بالوضعين الداكن والفاتح.
 *
 *   node tools/axe-contrast.js [--width 390] [--json out.json] [--verbose] [--tabs standings,stats]
 *
 * يفتح index.html بالـfixture (Firebase وهمي، وقت مجمّد) ويشغّل قاعدة `color-contrast` فقط بعد فتح كل الطيّات، على الصفحة كلها (الهيدر والتبويبات واللوحة النشطة).
 * --me: يختار مشاركًا (applyMyId) قبل الفحص فتظهر "حالتي" وغيرها من العناصر الشخصية.
 * exit 1 لو فيه أي مخالفة. الأخطاء المتوقعة (عناصر معطّلة/disabled) axe نفسه يستثنيها. */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const ff = require('./fake-firebase.js');
const { chromium } = require('playwright');
const axeSrc = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));

const TABS = ['standings', 'participants', 'rounds', 'stats', 'rules', 'about', 'admin'];

async function main(argv) {
  const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
  const width = Number(arg('--width', 390));
  const tabs = arg('--tabs', null) ? arg('--tabs').split(',') : TABS;
  const verbose = argv.includes('--verbose');
  const asMe = argv.includes('--me');
  const browser = await chromium.launch();
  const result = { width, themes: {} };
  let total = 0;
  try {
    for (const light of [false, true]) {
      const theme = light ? 'light' : 'dark';
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      await page.addInitScript(l => { try { localStorage.setItem('brookie-onboarded', '1'); l ? localStorage.setItem('brookie-light-mode', '1') : localStorage.removeItem('brookie-light-mode'); } catch (e) {} }, light);
      await ff.install(page, { fixture: readJson('tests/fixtures/season.json'), overrides: readJson('tests/fixtures/overrides.json') });
      await page.goto('file://' + path.join(ROOT, 'index.html'));
      await page.waitForTimeout(1500);
      await page.addStyleTag({ content: '*{animation:none!important;transition:none!important}' });
      if (asMe) { await page.evaluate(() => applyMyId(3)); await page.waitForTimeout(500); }
      await page.evaluate(src => { (0, eval)(src); }, axeSrc);
      result.themes[theme] = {};
      for (const tab of tabs) {
        await page.click(`nav.tabs button[data-tab="${tab}"]`);
        await page.waitForTimeout(250);
        await page.evaluate(() => document.querySelectorAll('section.panel.active details').forEach(d => { d.open = true; }));
        const r = await page.evaluate(async () => {
          // الصفحة كلها (الهيدر وشريط التبويبات واللوحة النشطة)؛ اللوحات غير النشطة مخفية فتُستثنى تلقائيًا
          const res = await axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast'] } });
          const nodes = [];
          res.violations.forEach(v => v.nodes.forEach(n => nodes.push({ target: n.target.join(' ').slice(0, 90), msg: (n.any[0] && n.any[0].message || '').slice(0, 140) })));
          return { violations: nodes.length, nodes, passes: res.passes.reduce((s, p) => s + p.nodes.length, 0) };
        });
        result.themes[theme][tab] = r;
        total += r.violations;
        console.log(`${theme.padEnd(5)} ${tab.padEnd(13)} مخالفات: ${String(r.violations).padStart(3)}  (ناجح: ${r.passes})`);
        if (verbose) r.nodes.slice(0, 12).forEach(n => console.log('      ' + n.target + '  ←  ' + n.msg));
      }
      await page.close();
    }
  } finally { await browser.close(); }
  result.total = total;
  const out = arg('--json', null);
  if (out) fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
  console.log(total ? `\n❌ ${total} مخالفة تباين (SC-09)` : '\n✅ تباين النص ≥ 4.5:1 في كل التبويبات بالوضعين (SC-09)');
  return total ? 1 : 0;
}

if (require.main === module) main(process.argv.slice(2)).then(c => process.exit(c), e => { console.error(e); process.exit(2); });
module.exports = { main };
