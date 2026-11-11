/* تصدير شعارات الأندية الحالية كملفات SVG مستقلة (001-T04).
 * يشغّل clubCrestSVG() الفعلية من index.html في Chromium (Playwright) ويحفظ كل شعار
 * "كما هو" (الصور المضمّنة base64 تبقى مؤقتًا) في assets/crests/<slug>.svg،
 * ثم assets/crests.json (slug ← اسم النادي) وassets/crests/_sheet.html.
 *
 * التشغيل: node tools/export-crests.js
 * (أداة تطوير فقط، لا تدخل وقت تشغيل الموقع. الشبكة تُحجب فلا يُلمس Firebase.)
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'crests');
const PX = 100; // عرض الشعار المصدَّر (viewBox 100×110، فيطلع 100×110)

// slug لاتيني ثابت لكل نادٍ. أي نادٍ جديد في CLUB_STYLE بدون slug يوقف الأداة.
const SLUGS = {
  'الهلال': 'al-hilal', 'برشلونة': 'barcelona', 'مانشستر سيتي': 'manchester-city',
  'ميلان': 'milan', 'باريس سان جيرمان': 'psg', 'تشيلسي': 'chelsea', 'بورتو': 'porto',
  'الاتحاد': 'al-ittihad', 'غلطة سراي': 'galatasaray', 'القادسية': 'al-qadsiah',
  'يوفنتوس': 'juventus', 'دينامو زغرب': 'dinamo-zagreb', 'بنفيكا': 'benfica',
  'ريال مدريد': 'real-madrid', 'بوروسيا دورتموند': 'dortmund', 'أتلتيكو مدريد': 'atletico-madrid',
  'فنربخشة': 'fenerbahce', 'النصر': 'al-nassr', 'أياكس': 'ajax', 'أرسنال': 'arsenal',
  'سلتيك': 'celtic', 'بايرن ميونيخ': 'bayern-munich', 'فاينورد': 'feyenoord', 'رينجرز': 'rangers',
  'سبورتينغ لشبونة': 'sporting-cp', 'آيندهوفن': 'psv', 'روما': 'roma', 'الشباب': 'al-shabab',
  'ليفربول': 'liverpool', 'الأهلي السعودي': 'al-ahli', 'مارسيليا': 'marseille', 'شختار دونيتسك': 'shakhtar',
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.route(/^https?:/, r => r.abort());
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.waitForFunction(() => typeof clubCrestSVG === 'function' && typeof CLUB_STYLE === 'object');

  const clubs = await page.evaluate(() => Object.keys(CLUB_STYLE));
  const missing = clubs.filter(c => !SLUGS[c]);
  if (missing.length) { console.error('أندية بدون slug:', missing.join('، ')); process.exit(1); }

  fs.mkdirSync(OUT, { recursive: true });
  const map = {};
  for (const name of clubs) {
    const svg = await page.evaluate(([n, px]) => clubCrestSVG(n, px), [name, PX]);
    const slug = SLUGS[name];
    fs.writeFileSync(path.join(OUT, slug + '.svg'), '<?xml version="1.0" encoding="UTF-8"?>\n' + svg.trim() + '\n');
    map[slug] = name;
  }
  fs.writeFileSync(path.join(ROOT, 'assets', 'crests.json'), JSON.stringify(map, null, 2) + '\n');

  const cells = Object.entries(map).map(([slug, name]) =>
    `<figure><img src="${slug}.svg" width="${PX}" height="${PX * 1.1}" alt="${name}"><figcaption>${name}<br><code>${slug}</code></figcaption></figure>`).join('\n');
  fs.writeFileSync(path.join(OUT, '_sheet.html'), `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>شعارات الأندية الحالية (${Object.keys(map).length})</title>
<style>body{margin:0;padding:16px;background:#0B0D1F;color:#fff;font-family:Tajawal,Arial,sans-serif}
h1{font-size:18px;margin:0 0 16px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:14px}
figure{margin:0;text-align:center;background:#12142E;border-radius:12px;padding:12px 6px}
figcaption{font-size:13px;margin-top:8px}code{font-size:11px;color:#9C9BC9}</style></head>
<body><h1>شعارات الأندية الحالية، ${Object.keys(map).length} شعارًا مصدَّرًا كما هي من <code>clubCrestSVG()</code></h1>
<div class="grid">
${cells}
</div></body></html>
`);
  await browser.close();
  console.log(`تم تصدير ${Object.keys(map).length} شعارًا إلى assets/crests/`);
})();
