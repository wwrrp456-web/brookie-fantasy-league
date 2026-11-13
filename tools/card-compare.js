#!/usr/bin/env node
/* مقارنة بطاقة الترتيب (الكانفس) بالقالب المرجع بكسليًا (001-T021، الأدلة (أ)/(ب)).
 *
 *   node tools/card-compare.js [--out card-diff] [--only 20-dark,24-light] [--max-pct 1]
 *
 * يبني بطاقة الترتيب بـ`buildStandingsCardCanvas` على بيانات القالب نفسها (assets/cards/standings-card.data.json، مطابقة لـspecs/001-ui-visual-overhaul/card-data.json)
 * بالحالات: 20 (الحقيقي)، 18، 24 (نسخ هندسية)، وأطول اسم (stress) × ليلي/نهاري، ويقارنها بـassets/cards/shots/standings-card-<حالة>-<ثيم>.png بـpixelmatch.
 * يكتب لكل حالة: <out>/<حالة>.png (الكانفس)، و<out>/<حالة>-diff.png (الفرق)، و<out>/summary.json. exit 1 لو نسبة الفرق فوق --max-pct. */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { chromium } = require('playwright');
const snap = require('./snap.js');
const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));

const CASES = [];
['20', '18', '24', 'long-name'].forEach(c => ['dark', 'light'].forEach(t => CASES.push({ c, t, name: `${c}-${t}` })));

// نفس منطق عينات القالب (assets/cards/standings-card.js): n وstress
function sampleFor(data, c) {
  const n = c === '18' ? 18 : c === '24' ? 24 : data.standings.length;
  const stress = c === 'long-name';
  const rows = data.standings.slice(0, n).map(p => ({ ...p, clubs: [...p.clubs] }));
  while (rows.length < n) { const last = data.standings[data.standings.length - 1]; rows.push({ ...last, clubs: [...last.clubs], rank: rows.length + 1 }); }
  if (stress) { const p = rows.find(x => x.id === 1) || rows[0]; p.name = 'أبو تغريد (زيد) الثاني'; p.clubs[0] = 'باريس سان جيرمان'; }
  const fixture = n !== data.standings.length;
  const note = stress ? 'اختبار النص الطويل' : fixture ? 'اختبار التكيّف' : null;
  return { data: { ...data, standings: rows }, note, n, countLabel: n > data.standings.length ? n + ' صفًا' : null };
}

async function main(argv) {
  const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
  const out = path.resolve(arg('--out', 'card-diff'));
  const only = arg('--only', null) ? arg('--only').split(',') : null;
  const maxPct = Number(arg('--max-pct', 100));
  const { PNG } = require('pngjs');
  const pixelmatch = (await import('pixelmatch')).default;
  fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
  const fixture = readJson('tests/fixtures/season.json'), overrides = readJson('tests/fixtures/overrides.json');
  const refData = readJson('assets/cards/standings-card.data.json');
  const { srv, origin } = await snap.serve(ROOT);
  const browser = await chromium.launch();
  const summary = []; let bad = 0;
  try {
    const ctx = { fixture, overrides, now: fixture.exportedAt, origin, root: ROOT };
    for (const cs of CASES) {
      if (only && !only.includes(cs.name)) continue;
      const { page, context } = await snap.openPage(browser, ctx, { width: 1080, light: cs.t === 'light' });
      const s = sampleFor(refData, cs.c);
      const res = await page.evaluate(async ([data, note, theme, countLabel]) => {
        const cv = await buildStandingsCardCanvas({ theme, data, meId: 16, note, countLabel });
        return { url: cv.toDataURL('image/png'), w: cv.width, h: cv.height };
      }, [s.data, s.note, cs.t, s.countLabel]);
      const png = Buffer.from(res.url.split(',')[1], 'base64');
      fs.writeFileSync(path.join(out, cs.name + '.png'), png);
      const a = PNG.sync.read(png), b = PNG.sync.read(fs.readFileSync(path.join(ROOT, 'assets/cards/shots', `standings-card-${cs.name}.png`)));
      let pct = 100, n = null;
      if (a.width === b.width && a.height === b.height) {
        const diff = new PNG({ width: a.width, height: a.height });
        n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1, diffColor: [255, 0, 0] });
        pct = n / (a.width * a.height) * 100;
        fs.writeFileSync(path.join(out, cs.name + '-diff.png'), PNG.sync.write(diff));
      }
      summary.push({ name: cs.name, size: `${res.w}×${res.h}`, ref: `${b.width}×${b.height}`, diffPixels: n, diffPct: Math.round(pct * 1000) / 1000 });
      console.log(`${cs.name.padEnd(16)} ${res.w}×${res.h} (المرجع ${b.width}×${b.height})  فرق: ${n === null ? 'حجم مختلف' : n + ' بكسل = ' + pct.toFixed(3) + '%'}`);
      if (pct > maxPct) bad++;
      await context.close();
    }
  } finally { await browser.close(); srv.close(); }
  fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  return bad ? 1 : 0;
}

if (require.main === module) main(process.argv.slice(2)).then(c => process.exit(c), e => { console.error(e); process.exit(2); });
module.exports = { main, sampleFor };
