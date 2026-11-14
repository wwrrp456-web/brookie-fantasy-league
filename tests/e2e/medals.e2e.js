/* اختبار R-23 (S52): الميداليات صور SVG ثابتة بشكل Noto بدل الإيموجي. التشغيل: node tests/e2e/medals.e2e.js [--shots dir]
 * يفحص medalHTML وmedalImage (الكانفس)، ولوحة الميداليات وغيرها بلا رموز 🥇🥈🥉 معروضة، ومطابقة الصورة للإيموجي بصريًا (لقطة مقارنة). */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { chromium } = require('playwright');
const snap = require('../../tools/snap.js');
const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
let failed = 0;
const check = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) failed++; console.log((ok ? '✅ ' : '❌ ') + name + (ok ? '' : `\n   المتوقع: ${JSON.stringify(want)}\n   الفعلي: ${JSON.stringify(got)}`)); };
const shots = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;

(async () => {
  const fixture = readJson('tests/fixtures/season.json'), overrides = readJson('tests/fixtures/overrides.json');
  const { srv, origin } = await snap.serve(ROOT);
  const browser = await chromium.launch();
  try {
    const { page, context } = await snap.openPage(browser, { fixture, overrides, now: fixture.exportedAt, origin, root: ROOT }, { width: 390, light: false });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const r = await page.evaluate(async () => {
      const imgs = {};
      for(const k of [1, 2, 3]){ const im = await medalImage(k); imgs[k] = [im.naturalWidth, im.naturalHeight]; }
      renderMedals(); renderStandings();
      const mb = document.getElementById('medalsBox');
      const doc = document.body.innerText + document.body.innerHTML.replace(/<img[^>]*>/g, '');
      return {
        h: [medalHTML(1), medalHTML(2, {size: 24}), medalHTML(3), medalHTML(4), medalHTML(0)],
        imgs, panelImgs: mb.querySelectorAll('img.medal').length, panelCards: mb.querySelectorAll('.medal-card').length,
        panelAlts: [...new Set([...mb.querySelectorAll('img.medal')].map(i => i.alt))].sort(),
        emojiShown: /[\u{1F947}-\u{1F949}]/u.test(doc.replace(/<script[\s\S]*?<\/script>/g, '')),
        broken: [...document.querySelectorAll('img.medal')].filter(i => !i.complete || i.naturalWidth === 0).length,
        slot: document.querySelector('.medal-slot') ? document.querySelector('.medal-slot').innerHTML.includes('class="medal"') : null,
        svgSizes: Object.fromEntries(Object.entries(MEDAL_SVGS).map(([k, v]) => [k, v.length]))
      };
    });
    check('medalHTML: 1/2/3 ← <img class="medal"> بـalt عربي، وغيرها نص فاضي', [r.h[0].startsWith('<img class="medal"'), /alt="ميدالية فضية"/.test(r.h[1]) && /width="24"/.test(r.h[1]), /alt="ميدالية برونزية"/.test(r.h[2]), r.h[3], r.h[4]], [true, true, true, '', '']);
    check('medalImage (الكانفس): تُحمَّل بحجم الأصل 128×128 للثلاث', r.imgs, {1: [128, 128], 2: [128, 128], 3: [128, 128]});
    check('لوحة الميداليات: صور لا إيموجي، وكل بطاقة فيها صورة، وبالنصوص البديلة العربية', [r.panelImgs >= r.panelCards, r.panelAlts.every(a => /^ميدالية (ذهبية|فضية|برونزية)$/.test(a))], [true, true]);
    check('لا رموز 🥇🥈🥉 معروضة بالصفحة (نصًا)', r.emojiShown, false);
    check('كل صور الميداليات تُحمَّل بلا كسر', r.broken, 0);
    check('موضع ثابت بـHTML (medal-slot) يُملأ بالصورة', r.slot, true);
    check('حجم كل ميدالية SVG ≤ 4KB', Object.values(r.svgSizes).every(n => n <= 4096), true);
    console.log('   أحجام المضمَّنة بالبايت:', JSON.stringify(r.svgSizes));
    check('لا أخطاء JS', errors, []);

    if (shots) {
      fs.mkdirSync(shots, { recursive: true });
      // مقارنة بصرية: إيموجي Noto بالخط (إن وُجد) جنب الصورة، بحجم 96
      await page.evaluate(() => {
        document.body.style.cssText = 'margin:0;background:#fff;padding:16px';
        document.body.innerHTML = '<div style="display:flex;gap:16px;align-items:center;font-size:96px;line-height:1;direction:ltr"><span style="font-family:\'Noto Color Emoji\'">\u{1F947}\u{1F948}\u{1F949}</span><span id="svgs" style="display:flex;gap:8px"></span></div>';
        document.getElementById('svgs').innerHTML = [1, 2, 3].map(k => medalHTML(k, {size: 96})).join('');
      });
      await page.setViewportSize({width: 900, height: 200}); await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(shots, 'emoji-vs-svg.jpg'), type: 'jpeg', quality: 80, clip: { x: 0, y: 0, width: 900, height: 140 } });
    }
    await context.close();
  } finally { await browser.close(); srv.close(); }
  console.log(failed ? `\n❌ ${failed} فشل` : '\n✅ كل الفحوص نجحت');
  process.exit(failed ? 1 : 0);
})();
