#!/usr/bin/env node
/* يولّد js/generated/assets.js من ملفات SVG في assets/** (001-T010، plan.md D1 وD4).
 *
 *   node tools/build-assets.js [--root .] [--out js/generated/assets.js]
 *   node tools/build-assets.js --check      يفشل (exit 1) لو الملف المرفوع ما يطابق ناتج التوليد الحالي
 *
 * المدخلات:
 *   assets/icons/*.svg            ← ICONS        { اسم-الأيقونة: svg }
 *   assets/crests/*.svg           ← CRESTS       { slug: svg }  + CREST_NAMES { slug: اسم النادي } من assets/crests.json
 *   assets/crests/motifs/*.svg    ← MOTIFS       { اسم: svg }
 *   assets/brand/proki-*.svg      ← LOGO_SVG     { mark, logo, logoLight }
 *   assets/crests/official/*.svg  ← CRESTS_OFFICIAL { slug: svg }  (لو المجلد غير موجود ← {})
 *
 * التوليد **حتمي**: نفس المدخلات ← نفس الملف حرفيًا (مفاتيح مرتبة بترتيب نقاط الترميز، بلا تواريخ ولا مسارات مطلقة).
 * الـSVG يُحفظ كما هو بعد حذف سطر <?xml?> والمسافات الطرفية فقط. الملف المولَّد مرفوع في git (الموقع بدون بناء وقت التشغيل). */
const fs = require('fs');
const path = require('path');

const ROOT_DEFAULT = path.join(__dirname, '..');

const byCodepoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const cleanSvg = s => s.replace(/^﻿/, '').replace(/^\s*<\?xml[^>]*\?>\s*/, '').replace(/\r\n/g, '\n').trim();

// كل ملفات .svg مباشرة داخل مجلد → {اسم-الملف-بدون-الامتداد: svg}. مجلد غير موجود ← {}
function readSvgDir(dir) {
  const out = {};
  if (!fs.existsSync(dir)) return out;
  fs.readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isFile() && e.name.endsWith('.svg') && !e.name.startsWith('_'))
    .map(e => e.name).sort(byCodepoint)
    .forEach(f => {
      const svg = cleanSvg(fs.readFileSync(path.join(dir, f), 'utf8'));
      if (!/^<svg[\s>/]/.test(svg)) throw new Error(`${path.join(dir, f)}: الملف ما يبدأ بوسم <svg>`);
      out[f.slice(0, -4)] = svg;
    });
  return out;
}

const sortedObject = o => Object.fromEntries(Object.keys(o).sort(byCodepoint).map(k => [k, o[k]]));

function renderObject(name, obj, comment) {
  const keys = Object.keys(obj).sort(byCodepoint);
  const body = keys.length ? '\n' + keys.map(k => `  ${JSON.stringify(k)}: ${JSON.stringify(obj[k])}`).join(',\n') + '\n' : '';
  return `// ${comment}\nconst ${name} = {${body}};\n`;
}

function build(root) {
  root = root || ROOT_DEFAULT;
  const assets = path.join(root, 'assets');
  const icons = readSvgDir(path.join(assets, 'icons'));
  const crests = readSvgDir(path.join(assets, 'crests'));
  const motifs = readSvgDir(path.join(assets, 'crests', 'motifs'));
  const official = readSvgDir(path.join(assets, 'crests', 'official'));

  let names = {};
  const namesFile = path.join(assets, 'crests.json');
  if (fs.existsSync(namesFile)) names = sortedObject(JSON.parse(fs.readFileSync(namesFile, 'utf8')));
  // كل شعار لازم له اسم في crests.json والعكس (يمنع ملفًا يتيمًا)
  const orphanFiles = Object.keys(crests).filter(k => !(k in names));
  const orphanNames = Object.keys(names).filter(k => !(k in crests));
  if (Object.keys(names).length && (orphanFiles.length || orphanNames.length)) {
    throw new Error('crests.json لا يطابق ملفات assets/crests: ' + [orphanFiles.length ? 'ملفات بلا اسم: ' + orphanFiles.join('،') : '', orphanNames.length ? 'أسماء بلا ملف: ' + orphanNames.join('،') : ''].filter(Boolean).join(' · '));
  }

  const logos = {};
  [['mark', 'proki-mark'], ['logo', 'proki-logo'], ['logoLight', 'proki-logo-light']].forEach(([k, f]) => {
    const p = path.join(assets, 'brand', f + '.svg');
    if (fs.existsSync(p)) logos[k] = cleanSvg(fs.readFileSync(p, 'utf8'));
  });

  const header = `/* ⚠️ مولَّد آليًا من assets/** بـ tools/build-assets.js. لا تعدّله يدويًا: عدّل ملفات SVG ثم شغّل \`node tools/build-assets.js\`.
 * التوليد حتمي (نفس المدخلات ← نفس الملف). 001-T010، D1. */
`;
  return header + '\n' + [
    renderObject('ICONS', icons, 'أيقونات الواجهة (assets/icons/*.svg): viewBox 24، وcurrentColor'),
    renderObject('CRESTS', crests, 'شعارات الأندية المحسّنة (assets/crests/*.svg)، المفتاح = slug'),
    renderObject('CREST_NAMES', names, 'slug ← اسم النادي (assets/crests.json)'),
    renderObject('MOTIFS', motifs, 'رموز الشعارات (assets/crests/motifs/*.svg)'),
    renderObject('LOGO_SVG', logos, 'شعار PROKI المتجهي (assets/brand/proki-*.svg): mark وlogo وlogoLight'),
    renderObject('CRESTS_OFFICIAL', official, 'الشعارات الرسمية (assets/crests/official/*.svg) لو وضعها المنظّم، وإلا فاضي (D4، R-04)')
  ].join('\n');
}

function main(argv) {
  const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
  const root = path.resolve(arg('--root', ROOT_DEFAULT));
  const out = path.resolve(root, arg('--out', 'js/generated/assets.js'));
  let text;
  try { text = build(root); } catch (e) { console.error('❌ ' + e.message); return 1; }
  if (argv.includes('--check')) {
    const cur = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : null;
    if (cur !== text) { console.error(`❌ ${path.relative(root, out)} غير محدَّث. شغّل: node tools/build-assets.js`); return 1; }
    console.log(`✅ ${path.relative(root, out)} محدَّث`);
    return 0;
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, text);
  const count = n => (text.match(new RegExp(`\\nconst ${n} = \\{([\\s\\S]*?)\\n\\};`)) || [, ''])[1].split('\n  "').length - 1;
  console.log(`✅ ${path.relative(root, out)} (${(Buffer.byteLength(text) / 1024).toFixed(1)}KB) · أيقونات: ${count('ICONS')} · شعارات: ${count('CRESTS')} · رموز: ${count('MOTIFS')} · شعار PROKI: ${count('LOGO_SVG')} · رسمية: ${count('CRESTS_OFFICIAL')}`);
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { build, main };
