#!/usr/bin/env node
/* محاكاة مُختار «منافس الجولة» على موسم اصطناعي (002-R21a / S49): 20 مشاركًا × 30 جولة ببذرة ثابتة (حتمية).
 *   node tools/spotlight-sim.js [--rounds 30] [--out specs/reports/002-R21a-distribution.md]
 * يبني لقطات صناعية بنفس شكل voiceSnapshot ويمررها على spotlightBuildStates/computeSpotlightCandidates/pickSpotlight،
 * ويطبع جدول توزيع الظهور لكل مشارك والتحقق من القواعد. للتشغيل من الاختبارات: require('./spotlight-sim').simulate(30). */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const FILES = ['js/core/ar-format.js', 'js/voice/voice-kit.js', 'js/voice/spotlight-angles.js', 'js/voice/voice-engine.js', 'js/voice/registry.js', 'js/voice/spotlight.js'];

function simulate(rounds, seed){
  const sb = {console}; sb.window = sb;
  const ctx = vm.createContext(sb);
  vm.runInContext(FILES.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n') +
    '\n;this.S = {spotlightBuildStates, computeSpotlightCandidates, pickSpotlight, formatCount, pickForm, formatList};', ctx, {filename: 'spotlight-bundle.js'});
  const S = ctx.S, h = {formatCount: S.formatCount, pickForm: S.pickForm, formatList: S.formatList};
  let x = seed || 12345;
  const rnd = () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
  const N = 20, ids = [...Array(N).keys()], names = ids.map(i => 'مشارك ' + (i + 1));
  const hist = ids.map(() => []), totals = ids.map(() => 0);
  const snap = (round, withPts) => {
    if(withPts) ids.forEach(i => { const p = rnd() < 0.12 ? 0 : Math.floor(rnd() * 11); hist[i].push(p); totals[i] += p; });
    const order = ids.slice().sort((a, b) => totals[b] - totals[a] || a - b);
    const rp = ids.map(i => hist[i][hist[i].length - 1] || 0), mx = Math.max(...rp), top = ids.filter(i => rp[i] === mx)[0];
    const clubs = {}; ids.forEach(i => { const w = Math.floor(rnd() * 4); clubs[i] = {won: w, played: 3, best: w ? {club: 'نادي', opp: 'خصم', gf: 3, ga: 0} : null}; });
    return {round, total: rounds, st: order.map(i => ({id: i, name: names[i], total: totals[i]})), hero: withPts ? {id: top, name: names[top], pts: mx, tieBreak: false} : null,
      mummat: [], badges: [], hist: Object.fromEntries(ids.map(i => [i, hist[i].slice()])), played: Object.fromEntries(ids.map(i => [i, round])),
      heroIds: [], clubs};
  };
  const history = [], rows = [], snaps = [snap(0, false)];
  for(let r = 1; r <= rounds; r++){
    const cur = snap(r, true); snaps.push(cur);
    const states = S.spotlightBuildStates(cur, snaps[r - 1], r > 3 ? snaps[r - 3] : null);
    const cands = S.computeSpotlightCandidates(states, h);
    const pick = S.pickSpotlight(cands, history);
    if(pick) history.push({id: pick.sp.id, angle: pick.angle.id, round: r});
    rows.push({round: r, id: pick ? pick.sp.id : null, name: pick ? pick.sp.name : null, angle: pick ? pick.angle.id : null, score: pick ? pick.final : null, urgent: pick ? pick.urgent : false});
  }
  const counts = ids.map(i => rows.filter(r => r.id === i).length);
  return {rows, counts, names, N};
}

if(require.main === module){
  const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
  const R = Number(opt('--rounds', 30)), out = path.resolve(opt('--out', path.join(ROOT, 'specs/reports/002-R21a-distribution.md')));
  const r = simulate(R);
  let md = `# توزيع ظهور «منافس الجولة»: محاكاة ${R} جولة × ${r.N} مشاركًا (بذرة ثابتة)\n\n> مولَّد بـ\`node tools/spotlight-sim.js\`\n\n| المشارك | مرات الظهور |\n|---|---|\n`;
  r.names.forEach((n, i) => { md += `| ${n} | ${r.counts[i]} |\n`; });
  md += `\n**الأدنى:** ${Math.min(...r.counts)} · **الأعلى:** ${Math.max(...r.counts)} · **من ظهر مرة فأكثر:** ${r.counts.filter(c => c > 0).length} من ${r.N}\n\n| الجولة | المنافس | الزاوية | الدرجة |\n|---|---|---|---|\n`;
  r.rows.forEach(x => { md += `| ${x.round} | ${x.name} | ${x.angle}${x.urgent ? ' (عاجل)' : ''} | ${x.score} |\n`; });
  fs.writeFileSync(out, md); console.log(md.split('\n').slice(0, 30).join('\n'));
}
module.exports = {simulate};
