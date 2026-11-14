#!/usr/bin/env node
/* عينات مكتبة الصوت (002-T010، Opus): تقرير الواتساب (R-20) وتقرير «منافس الجولة» (R-21) من بيانات الـfixture.
 *
 *   node tools/voice-samples.js [--rounds 8,9,10] [--out specs/002-language-voice/samples/voice-samples.md]
 *
 * ⚠️ أداة عينات للمراجعة فقط: فيها «بنّاء حالة» و«مختار» و«منتقي صيغ» مبسّطة وحتمية تكفي لقراءة القوالب على
 * بيانات حقيقية. المحرك الفعلي للموقع شغل Sonnet: S48b (تقرير الواتساب) وS49/S50 (المنافس) وS44b (المنتقي).
 * يحمّل نفس ملفات الموقع في سياق vm (بلا DOM)، ويحاكي الجولات بالتسلسل عشان «آخر 3 جولات» تكون حقيقية. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const ENGINE = ['js/data/season-config.js', 'js/data/season-2/participants.js', 'js/data/season-2/clubs.js', 'js/data/season-2/rounds-seed.js',
  'js/core/config.js', 'js/core/dom-utils.js', 'js/core/ar-format.js', 'js/core/storage.js', 'js/core/standings-engine.js', 'js/core/club-engine.js',
  'js/core/insights-engine.js', 'js/voice/voice-kit.js', 'js/voice/whatsapp-report.js', 'js/voice/spotlight-angles.js', 'js/voice/banter.js'];

function loadContext(fixturePath){
  const sb = {console}; sb.window = sb;
  const ctx = vm.createContext(sb);
  vm.runInContext(ENGINE.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n') +
    '\n;this.__lib = {WA_REPORT, WA_REPORT_ORDER, SPOTLIGHT_ANGLES, SPOTLIGHT_FACTS, SPOTLIGHT_MOTIVATION, SPOTLIGHT_CLOSING, SPOTLIGHT_CONFLICTS, VOICE_ROUND_STORY, voiceApply, voiceEligible};',
    ctx, {filename: 'voice-bundle.js'});
  ctx.__allRounds = JSON.parse(fs.readFileSync(fixturePath, 'utf8')).data.rounds;
  return ctx;
}

const BADGES_OK = ['الأكثر ثباتًا', 'أطول سلسلة نقاط', 'أعلى حصاد في جولة واحدة'];

// حالة الجولة رقم k (فهرس في جولات الـfixture) للتقريرين
function buildRound(ctx, k){
  const run = c => vm.runInContext(c, ctx);
  const snap = upto => { ctx.__k = upto; return run(`(() => { DATA.rounds = __allRounds.slice(0, __k);
    const st = computeStandings(); const heroes = st.length ? getRoundHeroes() : null;
    const badges = computeBadges().filter(b => ${JSON.stringify(BADGES_OK)}.includes(b.title));
    const hist = {}; PARTICIPANTS.forEach(p => { hist[p.id] = getAllRoundsHistory(p.id).filter(r => r.round >= 3).map(r => r.points); });
    const heroIds = DATA.rounds.map(r => getRoundChampion(r.number));
    const last = DATA.rounds[DATA.rounds.length - 1];
    const clubs = {}; PARTICIPANTS.forEach(p => { const en = (last && last.entries && last.entries[p.id]) || [];
      const wins = en.map((e, i) => ({e, club: p.teams[e.ti !== undefined ? e.ti : i]})).filter(x => x.e && x.e.result === 'win');
      wins.sort((a, b) => (b.e.gf - b.e.ga) - (a.e.gf - a.e.ga) || b.e.gf - a.e.gf);
      clubs[p.id] = {won: wins.length, played: en.filter(e => e && e.result !== 'no_match').length,
        best: wins[0] ? {club: wins[0].club, opp: wins[0].e.opp, gf: wins[0].e.gf, ga: wins[0].e.ga} : null}; });
    return {round: last ? last.number : 0, st: st.map(s => ({id: s.id, name: s.name, total: s.total})),
      hero: heroes && heroes.top ? {id: heroes.top.id, name: heroes.top.name, pts: heroes.top.points, tieBreak: !!heroes.top.tieBreak} : null,
      mummat: heroes ? heroes.mummat : [], badges, hist, heroIds, clubs, total: SEASON_TOTAL_ROUNDS};
  })()`); };
  const cur = snap(k + 1), prev = snap(k);
  const rankOf = (st, id) => st.findIndex(s => s.id === id) + 1;
  const tailCount = (arr, pred) => { let c = 0; for(let i = arr.length - 1; i >= 0 && pred(arr[i]); i--) c++; return c; };
  const st = cur.st, n = st.length;
  const moves = st.map(s => ({...s, rank: rankOf(st, s.id), prevRank: rankOf(prev.st, s.id) || rankOf(st, s.id)}))
    .map(s => ({...s, move: s.prevRank - s.rank}));
  const best = (sign) => { const v = Math.max(0, ...moves.map(m => sign * m.move)); return v >= 2 ? {names: moves.filter(m => sign * m.move === v).map(m => m.name), val: v} : null; };
  const topTied = st.filter(s => s.total === st[0].total).map(s => s.name);
  const mummaRuns = cur.mummat.map(nm => { const p = st.find(s => s.name === nm); return {name: nm, count: tailCount(cur.hist[p.id], x => x === 0)}; }).sort((a, b) => b.count - a.count);
  const hot = st.map(s => ({name: s.name, count: tailCount(cur.hist[s.id], x => x >= 4)})).filter(x => x.count >= 3).sort((a, b) => b.count - a.count)[0] || null;
  const report = {
    round: cur.round, nextRound: cur.round < cur.total ? cur.round + 1 : null, firstRound: k === 0,
    hero: cur.hero ? {...cur.hero, repeat: !!(prev.hero && prev.hero.id === cur.hero.id), prevRank: rankOf(prev.st, cur.hero.id)} : null,
    leader: st[0], chaser: st[1] || null, gap: st[1] ? st[0].total - st[1].total : 0,
    topTied: topTied.length >= 2 ? topTied : [], leaderChanged: !!(prev.st[0] && prev.st[0].id !== st[0].id), prevLeader: prev.st[0] ? prev.st[0].name : null,
    climbers: best(1), droppers: best(-1), mummat: cur.mummat,
    mummaRepeat: mummaRuns[0] && mummaRuns[0].count >= 2 ? mummaRuns[0] : null, hotStreak: hot, playersCount: n,
  };
  const spots = moves.map(m => {
    const h = cur.hist[m.id], pts = h[h.length - 1] || 0, i = m.rank - 1;
    const newBadge = cur.badges.find(b => b.names.includes(m.name) && !prev.badges.some(pb => pb.title === b.title && pb.names.includes(m.name)));
    return {
      round: cur.round, nextRound: report.nextRound, name: m.name, id: m.id, rank: m.rank, prevRank: m.prevRank, move: m.move,
      total: m.total, pts, played: cur.clubs[m.id].played > 0, playersCount: n,
      above: i > 0 ? {name: st[i - 1].name, gap: st[i - 1].total - m.total} : null,
      below: i < n - 1 ? {name: st[i + 1].name, gap: m.total - st[i + 1].total} : null,
      isHero: !!(cur.hero && cur.hero.id === m.id), heroTieBreak: !!(cur.hero && cur.hero.tieBreak), heroPts: cur.hero ? cur.hero.pts : 0,
      isLeader: i === 0, leaderChanged: i === 0 && report.leaderChanged, second: i === 0 && st[1] ? {name: st[1].name, gap: m.total - st[1].total} : null,
      prevPts: h.length >= 2 ? h[h.length - 2] : null, last5: h.slice(-5),
      hotRun: tailCount(h, x => x >= 4), coldEnded: pts > 0 ? tailCount(h.slice(0, -1), x => x === 0) : 0,
      clubs: cur.clubs[m.id], duel: null, badge: newBadge ? {title: newBadge.title} : null, predictor: null,
      seasonMumma: h.filter(x => x === 0).length, heroCount: cur.heroIds.filter(x => x === m.id).length, bestPts: Math.max(0, ...h),
    };
  });
  return {report, spots, story: {round: cur.round, hero: report.hero, mummat: cur.mummat, climber: report.climbers, dropper: report.droppers}};
}

// منتقي حتمي مبسّط: من القوالب الصالحة، يتجنّب ما استُعمل في آخر 3 جولات، ويدوّر برقم الجولة
function makePicker(){
  const used = {};
  return function pick(key, list, s, h, round){
    const L = ctxLib.voiceEligible(list, s, h);
    if(!L.length) return null;
    const recent = (used[key] || []).slice(-3);
    const fresh = L.filter(t => !recent.includes(t.id));
    const pool = fresh.length ? fresh : L;
    const t = pool[(round * 7 + key.length) % pool.length];
    (used[key] = used[key] || []).push(t.id);
    return {id: t.id, text: ctxLib.voiceApply(t, s, h)};
  };
}
let ctxLib = null;

function composeWhatsApp(pick, s, h){
  const W = ctxLib.WA_REPORT, r = s.round, out = [], ids = [];
  const take = (key) => { const x = pick('wa.' + key, W[key], s, h, r); if(x){ ids.push(x.id); return x.text; } return null; };
  out.push(`*دوري بروكي الفانتازي · بعد الجولة ${r}*`);
  out.push(take('opener'));
  out.push([take('hero'), take('lead')].filter(Boolean).join(' '));
  const moves = [take('climb'), take('drop')].filter(Boolean);
  out.push(moves.length ? moves.join(' ') : take('quiet'));
  out.push([s.mummat.length ? take('mummat') : take('noMummat'), take('streak')].filter(Boolean).join(' '));
  out.push(take('closing'));
  return {text: out.filter(Boolean).join('\n\n'), ids};
}

function chooseSpotlight(spots, history, h){
  const cands = [];
  spots.forEach(sp => {
    ctxLib.SPOTLIGHT_ANGLES.forEach(a => {
      let ok = false; try{ ok = !!a.when(sp); }catch(e){}
      if(!ok || !ctxLib.voiceEligible(a.title, sp, h).length || !ctxLib.voiceEligible(a.story, sp, h).length) return;
      const appear = history.filter(x => x.id === sp.id).length;
      cands.push({sp, a, score: a.score(sp) - 0.5 * appear});
    });
  });
  const recentIds = history.slice(-3).map(x => x.id), lastAngle = history.length ? history[history.length - 1].angle : null;
  let pool = cands.filter(c => !recentIds.includes(c.sp.id));
  if(pool.some(c => c.a.id !== lastAngle)) pool = pool.filter(c => c.a.id !== lastAngle);
  pool.sort((x, y) => y.score - x.score || x.sp.rank - y.sp.rank);
  return pool[0] || null;
}

function composeSpotlight(pick, c, h){
  const {sp, a} = c, r = sp.round, ids = [];
  const take = (key, list) => { const x = pick('sp.' + key, list, sp, h, r); if(x){ ids.push(x.id); return x.text; } return null; };
  const title = take(a.id + '.title', a.title), story = take(a.id + '.story', a.story);
  // حتى 3 أرقام داعمة مختلفة بترتيبها في المكتبة، بلا تعارض مع القصة (SPOTLIGHT_CONFLICTS)، والصاروخ ما يكرر الحركة
  const C = ctxLib.SPOTLIGHT_CONFLICTS, clash = (id) => (C[id] || []).some(x => ids.includes(x)) || Object.keys(C).some(k => ids.includes(k) && C[k].includes(id));
  let facts = ctxLib.SPOTLIGHT_FACTS.filter(t => !(a.id === 'rocket' && t.id === 'sp.fact.8'));
  const chosen = [];
  for(let i = 0; i < 3; i++){ const L = facts.filter(t => !clash(t.id)); const x = pick('sp.fact' + i, L, sp, h, r); if(!x) break; ids.push(x.id); chosen.push(x); facts = facts.filter(t => t.id !== x.id); }
  const order = ctxLib.SPOTLIGHT_FACTS.map(t => t.id);
  const factTexts = chosen.sort((x, y) => order.indexOf(x.id) - order.indexOf(y.id)).map(x => x.text);
  const motiv = take('motiv.' + a.mood, ctxLib.SPOTLIGHT_MOTIVATION[a.mood].filter(t => !clash(t.id)));
  const joke = take(a.id + '.joke', a.joke), close = take('close.' + a.mood, ctxLib.SPOTLIGHT_CLOSING[a.mood]);
  return {text: [`*${title}*`, [story, ...factTexts].filter(Boolean).join(' '), motiv, joke, close].filter(Boolean).join('\n\n'), ids};
}

const words = t => t.replace(/\*/g, '').split(/\s+/).filter(Boolean).length;

function main(argv){
  const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
  const want = opt('--rounds', '8,9,10').split(',').map(Number);
  const outFile = path.resolve(opt('--out', path.join(ROOT, 'specs/002-language-voice/samples/voice-samples.md')));
  const ctx = loadContext(path.join(ROOT, 'tests/fixtures/season.json'));
  ctxLib = ctx.__lib;
  const h = {formatCount: ctx.formatCount, pickForm: ctx.pickForm, formatList: ctx.formatList};
  const pick = makePicker(), history = [], samples = [];
  for(let k = 0; k < ctx.__allRounds.length; k++){
    const b = buildRound(ctx, k);
    const wa = composeWhatsApp(pick, b.report, h);
    const c = chooseSpotlight(b.spots, history, h);
    const spot = c ? composeSpotlight(pick, c, h) : null;
    if(c) history.push({id: c.sp.id, angle: c.a.id});
    if(want.includes(b.report.round)) samples.push({round: b.report.round, wa, spot, c});
  }
  let md = `# عينات مكتبة الصوت: تقرير الواتساب و«منافس الجولة» (002-T010)\n\n` +
    `> مولَّد بـ\`node tools/voice-samples.js\` من \`tests/fixtures/season.json\` (بيانات حقيقية معقّمة) والقوالب في \`js/voice/\`.\n` +
    `> المختار والمنتقي هنا مبسّطان للمراجعة فقط، والمحرك الفعلي في S48b وS49/S50. **للمنظّم:** اقرأ وعلّق على أي جملة (رقم القالب بين القوسين).\n`;
  samples.forEach(x => {
    md += `\n---\n\n## الجولة ${x.round}\n\n### تقرير الواتساب (${words(x.wa.text)} كلمة)\n\n\`\`\`\n${x.wa.text}\n\`\`\`\n\n<sub>القوالب: ${x.wa.ids.join(' · ')}</sub>\n`;
    if(x.spot) md += `\n### منافس الجولة: ${x.c.sp.name} · زاوية «${x.c.a.label}» (${words(x.spot.text)} كلمة)\n\n\`\`\`\n${x.spot.text}\n\`\`\`\n\n<sub>القوالب: ${x.spot.ids.join(' · ')}</sub>\n`;
  });
  // مقاطع ما ظهرت في الجولات المطلوبة (ممّات، وتعادل الصدارة، وزاوية الممة): حالة الجولة الأخيرة بعد تعديل مُعلَن
  const lastB = buildRound(ctx, ctx.__allRounds.length - 1);
  const W = ctxLib.WA_REPORT, demo = [];
  const show = (label, list, st) => { const L = ctxLib.voiceEligible(list, st, h).slice(0, 3); if(L.length) demo.push(`**${label}**\n` + L.map(t => `- ${ctxLib.voiceApply(t, st, h)} <sub>(${t.id})</sub>`).join('\n')); };
  const names = lastB.report.leader ? lastB.spots.slice(-3).map(x => x.name) : [];
  show('ممة لمشارك واحد', W.mummat, {...lastB.report, mummat: names.slice(0, 1)});
  show('ممّات لثلاثة', W.mummat, {...lastB.report, mummat: names});
  show('ممة ثانية على التوالي', [W.mummat.find(t => t.id === 'wa.mumma.6')], {...lastB.report, mummat: names.slice(0, 1), mummaRepeat: {name: names[0], count: 2}});
  const tie = lastB.spots.slice(0, 2).map(x => x.name);
  show('تعادل على الصدارة', W.lead, {...lastB.report, topTied: tie, gap: 0});
  const mSp = {...lastB.spots[lastB.spots.length - 1], pts: 0, played: true, coldEnded: 0, hotRun: 0};
  const mA = ctxLib.SPOTLIGHT_ANGLES.find(a => a.id === 'mummaHonor');
  ['title', 'story', 'joke'].forEach(k => show(`زاوية «ممة بشرف»: ${({title: 'العنوان', story: 'القصة', joke: 'النكتة'})[k]}`, mA[k], mSp));
  show('زاوية «ممة بشرف»: الخاتمة', ctxLib.SPOTLIGHT_CLOSING.down, mSp);
  md += `\n---\n\n## مقاطع ما ظهرت في الجولات الثلاث (حالة مصطنعة للمراجعة فقط)\n\n> بيانات الجولة ${lastB.report.round} بعد تعديل مُعلَن (أسماء أصحاب الممة أو المتعادلين مختارة للعرض، **مو حقيقية**)، عشان المنظّم يقرأ صيغ المقاطع النادرة.\n\n` + demo.join('\n\n') + '\n';
  fs.mkdirSync(path.dirname(outFile), {recursive: true});
  fs.writeFileSync(outFile, md);
  console.log(`✅ ${path.relative(process.cwd(), outFile)} · الجولات ${samples.map(x => x.round).join('، ')}`);
  return samples;
}

if(require.main === module) main(process.argv.slice(2));
module.exports = {main, loadContext, buildRound};
