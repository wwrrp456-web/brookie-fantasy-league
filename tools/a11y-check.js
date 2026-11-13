#!/usr/bin/env node
/* فحص الوصول الشامل (001-T028): (1) axe بقواعد WCAG 2 A/AA (وWCAG 2.1 AA) على التبويبات السبعة بالوضعين، مع عدّ المخالفات لكل قاعدة؛
 * (2) تكبير 200%: عرض الشاشة المكافئ (390 ← 195، و1366 ← 683) بلا تمرير أفقي للصفحة ولا قصّ لنص (عنصر نصّه أعرض من صندوقه بتجاوز مخفي).
 *
 *   node tools/a11y-check.js [--me] [--json out.json] [--axe-only] [--zoom-only] [--allow rule1,rule2] [--verbose]
 *
 * يفشل (exit 1) لو فيه مخالفة تباين (color-contrast) أو تمرير أفقي أو قصّ نص بالتكبير. بقية قواعد axe تُعدّ وتُسجَّل، وتفشل فقط لو ما كانت بـ--allow. */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const ff = require('./fake-firebase.js');
const { chromium } = require('playwright');
const axeSrc = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const TABS = ['standings', 'participants', 'rounds', 'stats', 'rules', 'about', 'admin'];

async function openPage(browser, { width, light, asMe }) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  await page.addInitScript(l => { try { localStorage.setItem('brookie-onboarded', '1'); l ? localStorage.setItem('brookie-light-mode', '1') : localStorage.removeItem('brookie-light-mode'); } catch (e) {} }, light);
  await ff.install(page, { fixture: readJson('tests/fixtures/season.json'), overrides: readJson('tests/fixtures/overrides.json') });
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.waitForTimeout(1500);
  await page.addStyleTag({ content: '*{animation:none!important;transition:none!important}' });
  if (asMe) { await page.evaluate(() => applyMyId(3)); await page.waitForTimeout(500); }
  return page;
}
async function openTab(page, tab) {
  await page.click(`nav.tabs button[data-tab="${tab}"]`);
  await page.waitForTimeout(250);
  await page.evaluate(() => document.querySelectorAll('section.panel.active details').forEach(d => { d.open = true; }));
}

async function main(argv) {
  const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
  const asMe = argv.includes('--me'), verbose = argv.includes('--verbose');
  const allow = new Set((arg('--allow', '') || '').split(',').filter(Boolean));
  const report = { axe: {}, zoom: {} };
  let failed = 0;
  const browser = await chromium.launch();
  try {
    if (!argv.includes('--zoom-only')) {
      for (const light of [false, true]) {
        const theme = light ? 'light' : 'dark';
        const page = await openPage(browser, { width: 390, light, asMe });
        await page.evaluate(src => { (0, eval)(src); }, axeSrc);
        report.axe[theme] = {};
        for (const tab of TABS) {
          await openTab(page, tab);
          const r = await page.evaluate(async () => {
            const res = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
            const byRule = {};
            res.violations.forEach(v => { byRule[v.id] = { impact: v.impact, count: v.nodes.length, sample: v.nodes.slice(0, 3).map(n => n.target.join(' ').slice(0, 80)) }; });
            return byRule;
          });
          report.axe[theme][tab] = r;
          const rules = Object.keys(r);
          const bad = rules.filter(id => id === 'color-contrast' || !allow.has(id));
          console.log(`axe ${theme.padEnd(5)} ${tab.padEnd(13)} ${rules.length ? rules.map(id => `${id}:${r[id].count}`).join(' ') : 'بلا مخالفات'}`);
          if (verbose) rules.forEach(id => console.log('      ' + id + ' (' + r[id].impact + ') ' + r[id].sample.join(' | ')));
          failed += bad.reduce((s, id) => s + r[id].count, 0);
        }
        await page.close();
      }
    }
    if (!argv.includes('--axe-only')) {
      for (const [width, eq] of [[390, 195], [1366, 683]]) for (const light of [false, true]) {
        const theme = light ? 'light' : 'dark';
        const page = await openPage(browser, { width: eq, light, asMe });
        for (const tab of TABS) {
          await openTab(page, tab);
          const r = await page.evaluate(() => {
            const de = document.documentElement;
            const overflowX = de.scrollWidth - window.innerWidth;
            const clipped = [];
            document.querySelectorAll('body *').forEach(el => {
              if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return;
              const cs = getComputedStyle(el);
              if (!(el.textContent || '').trim() || el.children.length > 0 && !/^(P|SPAN|H1|H2|H3|H4|LABEL|A|BUTTON|TD|TH|B|SMALL|DIV)$/.test(el.tagName)) return;
              const hidden = ['hidden', 'clip'].includes(cs.overflowX);
              const hasOwnText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
              if (hidden && hasOwnText && el.scrollWidth > el.clientWidth + 1 && cs.textOverflow !== 'ellipsis' && el.clientWidth > 0) clipped.push(el.tagName + '.' + (typeof el.className === 'string' ? el.className.split(' ')[0] : '') + ' ' + el.scrollWidth + '>' + el.clientWidth);
            });
            return { overflowX, clipped: clipped.slice(0, 6), nClipped: clipped.length };
          });
          const key = `${width}-${theme}-${tab}`;
          report.zoom[key] = r;
          const bad = r.overflowX > 1 || r.nClipped > 0;
          if (bad) failed++;
          console.log(`تكبير 200% (${width}) ${theme.padEnd(5)} ${tab.padEnd(13)} تمرير أفقي: ${Math.max(0, r.overflowX)}px  نصوص مقصوصة: ${r.nClipped}${verbose && r.clipped.length ? '  ' + r.clipped.join(' | ') : ''}`);
        }
        await page.close();
      }
    }
  } finally { await browser.close(); }
  const out = arg('--json', null);
  if (out) fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
  console.log(failed ? `\n❌ ${failed} مخالفة` : '\n✅ الوصول: axe بلا مخالفات (أو مسموحة)، والتكبير 200% بلا تمرير أفقي ولا قصّ نص');
  return failed ? 1 : 0;
}

if (require.main === module) main(process.argv.slice(2)).then(c => process.exit(c), e => { console.error(e); process.exit(2); });
module.exports = { main };
