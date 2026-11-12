#!/usr/bin/env node
/* مقارنة لقطتين (000-T009، plan.md §3 "tools/snap-diff.js").
 *
 *   node tools/snap-diff.js [--base snapshots/base] [--head snapshots/head] [--out diff] [--threshold 0.1] [--crop]
 *
 * - يقارن كل صورة PNG موجودة في base وhead بـpixelmatch.
 * - يكتب لكل صورة متغيرة <out>/<الاسم>.png: (قبل | بعد | فرق) جنب بعض، و<out>/summary.md فيه الصور المتغيرة ونسبة التغير.
 * - `--crop`: يقصّ صورة (قبل | بعد | فرق) حول المنطقة المتغيّرة (±200px، وحد أقصى 4000px ارتفاعًا) عشان ما تضخم
 *   (صفحات الجوال الطويلة تصير عشرات الآلاف من البكسلات). بدونه السلوك كما كان: الصورة كاملة.
 * - **لا يفشل على أي فرق** (exit 0)، لأن الفرق المقصود هو هدف أغلب الـPRs، والحكم عليه للمراجعة.
 *   يفشل فقط (exit 2) لو المجلدات غير موجودة أو ما فيها صور.
 * - صورتان بأبعاد مختلفة (تغيّر ارتفاع الصفحة) تُعد متغيرة بالكامل وتُعرض جنب بعض بدون خريطة فرق بكسلية.
 * - صور موجودة في جهة واحدة فقط تُسرد كـ"جديدة" أو "محذوفة". */
const fs = require('fs');
const path = require('path');

const GAP = 16;
const CROP_MARGIN = 200, CROP_MAX = 4000;
const DIFF_COLOR = [255, 0, 0];

// الصفوف اللي فيها بكسل فرق فعلي (لون الفرق الأحمر الصريح من pixelmatch) ← مجال القص
function changedRange(diff, w, h) {
  let min = -1, max = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (diff.data[o] === 255 && diff.data[o + 1] === 0 && diff.data[o + 2] === 0 && diff.data[o + 3] === 255) { if (min < 0) min = y; max = y; break; }
    }
  }
  return min < 0 ? null : { min, max };
}
// ±200px حول المتغيّر وحد أقصى 4000px ارتفاعًا (لو المتغيّر أطول من ذلك يُقصّ من أوله ويُذكر في الملاحظة)
function cropFor(range, h) {
  const y0 = Math.max(0, range.min - CROP_MARGIN);
  let y1 = Math.min(h, range.max + 1 + CROP_MARGIN);
  let truncated = false;
  if (y1 - y0 > CROP_MAX) { y1 = y0 + CROP_MAX; truncated = true; }
  return { y0, y1, truncated };
}
const cropNote = (c, full) => `قُصّت الصورة: الصفوف ${c.y0}–${c.y1} من ${full}${c.truncated ? ' (حد 4000px، المتغيّر أطول)' : ''}`;

function readPng(PNG, file) { return PNG.sync.read(fs.readFileSync(file)); }

// يرسم (قبل | بعد | فرق) في صورة واحدة، بخلفية داكنة، وكل صورة تبدأ من الأعلى
function composite(PNG, a, b, diff, crop) {
  const parts = [a, b, diff].filter(Boolean);
  const w = parts.reduce((s, p) => s + p.width, 0) + GAP * (parts.length - 1);
  const fullH = Math.max(...parts.map(p => p.height));
  const y0 = crop ? crop.y0 : 0;
  const h = crop ? crop.y1 - crop.y0 : fullH;
  const out = new PNG({ width: w, height: h });
  for (let i = 0; i < out.data.length; i += 4) { out.data[i] = 24; out.data[i + 1] = 24; out.data[i + 2] = 32; out.data[i + 3] = 255; }
  let x = 0;
  for (const p of parts) {
    const hh = Math.max(0, Math.min(h, p.height - y0));
    if (hh > 0) PNG.bitblt(p, out, 0, y0, p.width, hh, x, 0);
    x += p.width + GAP;
  }
  return out;
}

async function main(argv) {
  const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
  const baseDir = path.resolve(arg('--base', 'snapshots/base'));
  const headDir = path.resolve(arg('--head', 'snapshots/head'));
  const outDir = path.resolve(arg('--out', 'diff'));
  const threshold = Number(arg('--threshold', '0.1'));
  const doCrop = argv.includes('--crop');
  const list = d => fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith('.png')).sort() : null;
  const baseFiles = list(baseDir), headFiles = list(headDir);
  if (!baseFiles || !headFiles || !baseFiles.length || !headFiles.length) {
    console.error(`❌ لازم يكون فيه صور PNG في الطرفين: base=${baseDir} (${baseFiles ? baseFiles.length : 'غير موجود'}) head=${headDir} (${headFiles ? headFiles.length : 'غير موجود'})`);
    return 2;
  }
  const { PNG } = require('pngjs');
  const pixelmatch = (await import('pixelmatch')).default;

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const changed = [], same = [];
  const common = baseFiles.filter(f => headFiles.includes(f));
  for (const f of common) {
    const a = readPng(PNG, path.join(baseDir, f)), b = readPng(PNG, path.join(headDir, f));
    if (a.width !== b.width || a.height !== b.height) {
      const fullH = Math.max(a.height, b.height);
      const c = (doCrop && fullH > CROP_MAX) ? { y0: 0, y1: CROP_MAX, truncated: true } : null;
      fs.writeFileSync(path.join(outDir, f), PNG.sync.write(composite(PNG, a, b, null, c)));
      changed.push({ file: f, pct: 100, pixels: null, note: `تغيّر الحجم ${a.width}×${a.height} ← ${b.width}×${b.height}` + (c ? '؛ ' + cropNote(c, fullH) : '') });
      continue;
    }
    const diff = new PNG({ width: a.width, height: a.height });
    const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold, diffColor: DIFF_COLOR });
    if (n === 0) { same.push(f); continue; }
    let c = null;
    if (doCrop) { const r = changedRange(diff, a.width, a.height); if (r) c = cropFor(r, a.height); }
    fs.writeFileSync(path.join(outDir, f), PNG.sync.write(composite(PNG, a, b, diff, c)));
    changed.push({ file: f, pct: (n / (a.width * a.height)) * 100, pixels: n, note: c ? cropNote(c, a.height) : '' });
  }
  const added = headFiles.filter(f => !baseFiles.includes(f));
  const removed = baseFiles.filter(f => !headFiles.includes(f));
  changed.sort((x, y) => y.pct - x.pct);

  const rel = p => path.relative(process.cwd(), p) || p;
  let md = `# ملخص فرق اللقطات\n\n- الأساس: \`${rel(baseDir)}\` · الجديد: \`${rel(headDir)}\` · العتبة: ${threshold}${doCrop ? ' · القص: مفعّل (±200px، حد أقصى 4000px)' : ''}\n`;
  md += `- المقارَن: ${common.length} صورة · **المتغيّر: ${changed.length}** · المطابق: ${same.length} · جديدة: ${added.length} · محذوفة: ${removed.length}\n\n`;
  if (changed.length) {
    md += `## الصور المتغيّرة\n\n| الصورة | نسبة التغيّر | البكسلات | ملاحظة |\n|---|---|---|---|\n`;
    md += changed.map(c => `| \`${c.file}\` | ${c.pct === 100 && c.pixels === null ? '100%' : c.pct.toFixed(3) + '%'} | ${c.pixels === null ? '—' : c.pixels} | ${c.note} |`).join('\n') + '\n\n';
    md += `صور الفرق (قبل | بعد | فرق) في \`${rel(outDir)}/<الاسم>.png\`.\n\n`;
  } else {
    md += `لا فروق بين اللقطتين. ✅\n\n`;
  }
  if (added.length) md += `## جديدة (في الجديد فقط)\n${added.map(f => `- \`${f}\``).join('\n')}\n\n`;
  if (removed.length) md += `## محذوفة (في الأساس فقط)\n${removed.map(f => `- \`${f}\``).join('\n')}\n\n`;
  fs.writeFileSync(path.join(outDir, 'summary.md'), md);

  console.log(`مقارنة ${common.length} صورة: متغيّر ${changed.length}، مطابق ${same.length}، جديد ${added.length}، محذوف ${removed.length} ← ${rel(path.join(outDir, 'summary.md'))}`);
  changed.slice(0, 15).forEach(c => console.log(`  ${c.pct === 100 && c.pixels === null ? '100%' : c.pct.toFixed(3) + '%'}  ${c.file}${c.note ? '  (' + c.note + ')' : ''}`));
  return 0;
}

if (require.main === module) main(process.argv.slice(2)).then(c => process.exit(c), e => { console.error(e); process.exit(2); });
module.exports = { main };
