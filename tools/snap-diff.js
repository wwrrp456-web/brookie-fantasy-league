#!/usr/bin/env node
/* مقارنة لقطتين (000-T009، plan.md §3 "tools/snap-diff.js").
 *
 *   node tools/snap-diff.js [--base snapshots/base] [--head snapshots/head] [--out diff] [--threshold 0.1]
 *
 * - يقارن كل صورة PNG موجودة في base وhead بـpixelmatch.
 * - يكتب لكل صورة متغيرة <out>/<الاسم>.png: (قبل | بعد | فرق) جنب بعض، و<out>/summary.md فيه الصور المتغيرة ونسبة التغير.
 * - **لا يفشل على أي فرق** (exit 0)، لأن الفرق المقصود هو هدف أغلب الـPRs، والحكم عليه للمراجعة.
 *   يفشل فقط (exit 2) لو المجلدات غير موجودة أو ما فيها صور.
 * - صورتان بأبعاد مختلفة (تغيّر ارتفاع الصفحة) تُعد متغيرة بالكامل وتُعرض جنب بعض بدون خريطة فرق بكسلية.
 * - صور موجودة في جهة واحدة فقط تُسرد كـ"جديدة" أو "محذوفة". */
const fs = require('fs');
const path = require('path');

const GAP = 16;

function readPng(PNG, file) { return PNG.sync.read(fs.readFileSync(file)); }

// يرسم (قبل | بعد | فرق) في صورة واحدة، بخلفية داكنة، وكل صورة تبدأ من الأعلى
function composite(PNG, a, b, diff) {
  const parts = [a, b, diff].filter(Boolean);
  const w = parts.reduce((s, p) => s + p.width, 0) + GAP * (parts.length - 1);
  const h = Math.max(...parts.map(p => p.height));
  const out = new PNG({ width: w, height: h });
  for (let i = 0; i < out.data.length; i += 4) { out.data[i] = 24; out.data[i + 1] = 24; out.data[i + 2] = 32; out.data[i + 3] = 255; }
  let x = 0;
  for (const p of parts) { PNG.bitblt(p, out, 0, 0, p.width, p.height, x, 0); x += p.width + GAP; }
  return out;
}

async function main(argv) {
  const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
  const baseDir = path.resolve(arg('--base', 'snapshots/base'));
  const headDir = path.resolve(arg('--head', 'snapshots/head'));
  const outDir = path.resolve(arg('--out', 'diff'));
  const threshold = Number(arg('--threshold', '0.1'));
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
      fs.writeFileSync(path.join(outDir, f), PNG.sync.write(composite(PNG, a, b, null)));
      changed.push({ file: f, pct: 100, pixels: null, note: `تغيّر الحجم ${a.width}×${a.height} ← ${b.width}×${b.height}` });
      continue;
    }
    const diff = new PNG({ width: a.width, height: a.height });
    const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold });
    if (n === 0) { same.push(f); continue; }
    fs.writeFileSync(path.join(outDir, f), PNG.sync.write(composite(PNG, a, b, diff)));
    changed.push({ file: f, pct: (n / (a.width * a.height)) * 100, pixels: n, note: '' });
  }
  const added = headFiles.filter(f => !baseFiles.includes(f));
  const removed = baseFiles.filter(f => !headFiles.includes(f));
  changed.sort((x, y) => y.pct - x.pct);

  const rel = p => path.relative(process.cwd(), p) || p;
  let md = `# ملخص فرق اللقطات\n\n- الأساس: \`${rel(baseDir)}\` · الجديد: \`${rel(headDir)}\` · العتبة: ${threshold}\n`;
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
