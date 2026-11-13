/* الرموز متاحة بالوضعين (001-T001): يقرأ getComputedStyle(documentElement) في index.html وreport.html،
 * داكن (الافتراضي) وفاتح (html.light-mode). يحتاج Playwright وtools/fake-firebase.js (حجب الشبكة).
 * التشغيل: node tests/e2e/tokens.e2e.js */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const ff = require('../../tools/fake-firebase.js');
const ROOT = path.join(__dirname, '..', '..');

const ALL = ['--c-bg', '--c-surface-1', '--c-surface-2', '--c-border', '--c-border-strong', '--c-text', '--c-text-2', '--c-text-3', '--c-brand', '--c-brand-strong',
  '--c-brand-blue', '--g-brand', '--c-gold', '--c-up', '--c-down', '--c-info', '--font', '--fs-xs', '--fs-sm', '--fs-md', '--fs-lg', '--fs-xl', '--fs-2xl',
  '--sp-1', '--sp-2', '--sp-3', '--sp-4', '--sp-6', '--sp-8', '--r-sm', '--r-md', '--r-lg', '--r-pill'];
// قيم مؤكدة لكل وضع (الأسماء اللي ما يعدّلها شي آخر في الموقع)
const EXPECT = {
  dark:  { '--c-bg': '#0B0D1F', '--c-surface-1': '#12142E', '--c-text': '#F4F5FF', '--c-brand': '#7B5CFF', '--c-brand-blue': '#00B4FF', '--fs-md': '16px', '--sp-4': '16px', '--r-pill': '999px' },
  light: { '--c-bg': '#F3F1FA', '--c-surface-1': '#FDFCFF', '--c-text': '#0B0D1F', '--c-brand': '#7B5CFF', '--c-brand-blue': '#00B4FF', '--fs-md': '16px', '--sp-4': '16px', '--r-pill': '999px' }
};

(async () => {
  const browser = await chromium.launch();
  let ok = true;
  // report.html داكن دائمًا (ما يحمّل سكربت الثيم ولا فيه زر تبديل)، فالفاتح يُختبر في index.html فقط
  for (const [file, modes] of [['index.html', ['dark', 'light']], ['report.html', ['dark']]]) for (const mode of modes) {
    const page = await browser.newPage();
    const rep = await ff.install(page);
    await page.addInitScript(light => { try { localStorage.setItem('brookie-onboarded', '1'); if (light) localStorage.setItem('brookie-light-mode', '1'); } catch (e) {} }, mode === 'light');
    await page.goto('file://' + path.join(ROOT, file));
    await page.waitForTimeout(800);
    const got = await page.evaluate(names => {
      const cs = getComputedStyle(document.documentElement);
      return { light: document.documentElement.classList.contains('light-mode'), v: Object.fromEntries(names.map(n => [n, cs.getPropertyValue(n).trim()])) };
    }, ALL);
    const missing = ALL.filter(n => !got.v[n]);
    const wrong = Object.entries(EXPECT[mode]).filter(([n, want]) => got.v[n].toUpperCase() !== want.toUpperCase());
    const modeOk = got.light === (mode === 'light');
    const good = !missing.length && !wrong.length && modeOk && !rep.pageErrors.length;
    ok = ok && good;
    console.log(`${good ? '✅' : '❌'} ${file} · ${mode}: ${ALL.length - missing.length}/${ALL.length} رمزًا معرّفًا${modeOk ? '' : ' (الوضع لم يُطبَّق!)'}`
      + (missing.length ? ' · ناقص: ' + missing.join('،') : '') + (wrong.length ? ' · خطأ: ' + wrong.map(([n, w]) => `${n}=${got.v[n]} (المتوقع ${w})`).join('،') : ''));
    await page.close();
  }
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
