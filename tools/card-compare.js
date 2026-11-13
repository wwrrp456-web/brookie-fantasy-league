#!/usr/bin/env node
/* مقارنة بطاقة الترتيب (الكانفس) بالقالب المرجع بكسليًا (001-T021، الأدلة (أ)/(ب)).
 *
 *   node tools/card-compare.js [--out card-diff] [--kind standings|champion|wrap|profile|duel|myclubs|certificate] [--only 20-dark,champion-stress-light,wrap-light] [--max-pct 1]
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
['20', '18', '24', 'long-name'].forEach(c => ['dark', 'light'].forEach(t => CASES.push({ kind: 'standings', c, t, name: `${c}-${t}`, ref: `standings-card-${c}-${t}.png` })));
// كرت بطل الجولة (001-T022b): العادي والضغط بالوضعين؛ أسماء لقطات القالب: champion-post{,-light,-stress,-stress-light}.png
['', 'stress'].forEach(v => ['dark', 'light'].forEach(t => CASES.push({ kind: 'champion', c: v || 'normal', t, name: `champion-${v || 'normal'}-${t}`, ref: `champion-post${v ? '-stress' : ''}${t === 'light' ? '-light' : ''}.png` })));

// بيانات كرت بطل الجولة من card-data.json (نفس عينة القالب)، وحالة الضغط: الاسم الطويل والنادي الأول باريس
function championSample(card, stress) {
  const st = card.standings.find(s => s.id === card.champion.id);
  const data = { round: card.round, id: card.champion.id, name: card.champion.name, points: card.champion.points, clubs: card.champion.clubs.map(c => ({ club: c.club, result: c.result, opp: c.opp, gf: c.gf, ga: c.ga })),
    rank: st.rank, total: st.total, move: st.move, tiebreak: { gf: card.champion.gf, ga: card.champion.ga }, date: '29 أكتوبر 2026 · 18 جمادى الأولى 1448 هـ' };
  if (stress) { data.name = 'أبو تغريد (زيد) الثاني'; data.clubs[0].club = 'باريس سان جيرمان'; }
  return data;
}

// ملخص الموسم والملف الشخصي (001-T023): لقطات القالب season-wrap-post{,-light}.png وprofile-square{,-light}.png
['dark', 'light'].forEach(t => {
  CASES.push({ kind: 'wrap', c: 'normal', t, name: `wrap-${t}`, ref: `season-wrap-post${t === 'light' ? '-light' : ''}.png` });
  CASES.push({ kind: 'profile', c: 'normal', t, name: `profile-${t}`, ref: `profile-square${t === 'light' ? '-light' : ''}.png` });
});
// مواجهة الجولة (001-T024): العادي والضغط × داكن/فاتح؛ لقطات القالب duel-post{,-stress}{,-light}.png
['', 'stress'].forEach(v => ['dark', 'light'].forEach(t => CASES.push({ kind: 'duel', c: v || 'normal', t, name: `duel-${v || 'normal'}-${t}`, ref: `duel-post${v ? '-stress' : ''}${t === 'light' ? '-light' : ''}.png` })));
// نتائج أنديتي (001-T025): لقطات القالب my-clubs-post{,-light}.png
['dark', 'light'].forEach(t => CASES.push({ kind: 'myclubs', c: 'normal', t, name: `myclubs-${t}`, ref: `my-clubs-post${t === 'light' ? '-light' : ''}.png` }));
// الشهادة (001-T026، C16): العادي والضغط بالوضعين؛ لقطات القالب certificate-post{,-stress}{,-light}.png
['', 'stress'].forEach(v => ['dark', 'light'].forEach(t => CASES.push({ kind: 'certificate', c: v || 'normal', t, name: `certificate-${v || 'normal'}-${t}`, ref: `certificate-post${v ? '-stress' : ''}${t === 'light' ? '-light' : ''}.png` })));
const CARD_DATE = '29 أكتوبر 2026 · 18 جمادى الأولى 1448 هـ';
function wrapSample(card) {
  return { round: card.round, topTotal: { value: card.standings[0].total, name: card.standings[0].name }, bestRound: { points: card.champion.points, round: card.round }, mummas: card.mummas || [], date: CARD_DATE };
}
function duelSample(card, stress) {
  const side = c => ({ id: c.id, name: c.name, clubs: c.clubs.map(x => x.club), points: c.roundPoints });
  const [a, b] = card.duelCandidates.map(side);
  if (stress) { b.name = 'أبو تغريد (زيد) الثاني'; b.clubs[0] = 'باريس سان جيرمان'; }
  return { round: card.round, a, b, winner: a.points === b.points ? null : a.points > b.points ? 'a' : 'b', date: CARD_DATE };
}
function myClubsSample(card) {
  const m = card.myClubs;
  return { round: card.round, id: m.id, name: m.name, roundPoints: m.roundPoints, clubs: m.clubs.map(c => ({ club: c.club, result: c.result, opp: c.opp, gf: c.gf, ga: c.ga })), date: CARD_DATE };
}
function certificateSample(stress) {
  const d = readJson('assets/cards/certificate-ideas/data.json');
  return { name: stress ? 'أبو تغريد (زيد) الثاني' : d.name, seasonTitle: d.seasonTitle, appreciation: d.appreciation, signature: d.signature, issuedAt: d.issuedAt };
}
function profileSample(card) {
  const st = card.standings.find(s => s.id === card.champion.id);
  return { round: card.round, id: st.id, name: st.name, clubs: st.clubs.slice(), rank: st.rank, total: st.total, roundPoints: st.roundPoints, clubsCount: st.clubs.length, isChampion: true, date: CARD_DATE };
}

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
  const kind = arg('--kind', null);
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
      if (only ? !only.includes(cs.name) : (cs.kind !== (kind || 'standings'))) continue;
      const { page, context } = await snap.openPage(browser, ctx, { width: 1080, light: cs.t === 'light' });
      let res;
      if (cs.kind === 'certificate') {
        const data = certificateSample(cs.c === 'stress');
        res = await page.evaluate(async ([data, theme]) => {
          const cv = await buildChampionCertificateCanvas({ theme, data });
          return { url: cv.toDataURL('image/png'), w: cv.width, h: cv.height };
        }, [data, cs.t]);
      } else if (cs.kind === 'champion') {
        const data = championSample(readJson('specs/001-ui-visual-overhaul/card-data.json'), cs.c === 'stress');
        res = await page.evaluate(async ([data, theme]) => {
          const cv = await buildChampionCardCanvas({ theme, data });
          return { url: cv.toDataURL('image/png'), w: cv.width, h: cv.height };
        }, [data, cs.t]);
      } else if (cs.kind === 'myclubs') {
        const data = myClubsSample(readJson('specs/001-ui-visual-overhaul/card-data.json'));
        res = await page.evaluate(async ([data, theme]) => {
          const cv = await buildMyClubsCardCanvas({ theme, data });
          return { url: cv.toDataURL('image/png'), w: cv.width, h: cv.height };
        }, [data, cs.t]);
      } else if (cs.kind === 'duel') {
        const data = duelSample(readJson('specs/001-ui-visual-overhaul/card-data.json'), cs.c === 'stress');
        res = await page.evaluate(async ([data, theme]) => {
          const cv = await buildDuelCardCanvas({ theme, data });
          return { url: cv.toDataURL('image/png'), w: cv.width, h: cv.height };
        }, [data, cs.t]);
      } else if (cs.kind === 'wrap' || cs.kind === 'profile') {
        const card = readJson('specs/001-ui-visual-overhaul/card-data.json');
        const data = cs.kind === 'wrap' ? wrapSample(card) : profileSample(card);
        res = await page.evaluate(async ([kind, data, theme]) => {
          const cv = kind === 'wrap' ? await buildSeasonWrapCardCanvas({ theme, data }) : await buildParticipantProfileCardCanvas(data.id, { theme, data });
          return { url: cv.toDataURL('image/png'), w: cv.width, h: cv.height };
        }, [cs.kind, data, cs.t]);
      } else {
        const s = sampleFor(refData, cs.c);
        res = await page.evaluate(async ([data, note, theme, countLabel]) => {
          const cv = await buildStandingsCardCanvas({ theme, data, meId: 16, note, countLabel });
          return { url: cv.toDataURL('image/png'), w: cv.width, h: cv.height };
        }, [s.data, s.note, cs.t, s.countLabel]);
      }
      const png = Buffer.from(res.url.split(',')[1], 'base64');
      fs.writeFileSync(path.join(out, cs.name + '.png'), png);
      const a = PNG.sync.read(png), b = PNG.sync.read(fs.readFileSync(path.join(ROOT, 'assets/cards/shots', cs.ref)));
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
