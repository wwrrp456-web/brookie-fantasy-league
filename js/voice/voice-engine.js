/* محرك تقرير الواتساب (002-T011 / S48b): يركّب التقرير من قوالب Opus (js/voice/whatsapp-report.js) بلا DOM ولا عشوائية.
 * الاعتماد: voice-kit.js وwhatsapp-report.js وregistry.js (pickVariant) وar-format.js، وللبناء من بيانات الموقع: standings-engine.js وclub-engine.js.
 *
 *   voiceSnapshot(upto)                      لقطة بيانات بعد upto جولة (تحجب DATA.rounds مؤقتًا وتعيدها)
 *   voiceBuildReportState(cur, prev)         حالة الجولة s من لقطتين (الحالية والسابقة) — حقائق من البيانات فقط
 *   voicePickTemplate(key, list, s, h, history)   اختيار حتمي: يرفض القوالب غير المنطبقة ولا يكرر قالبًا بآخر 3 جولات
 *   voiceComposeReport(s, history)           نص التقرير + معرّفات القوالب، وتحدَّث history
 *   voiceReportSeries(upToRound)             يحاكي الجولات بالتسلسل ويرجع تقرير الجولة الأخيرة (history حقيقي)
 * الاختيار: (رقم الجولة × 7 + طول المفتاح) % عدد القوالب الطازجة؛ نفس البيانات تعطي نفس النص لكل من يفتح التقرير. */

const VOICE_REPEAT_WINDOW = 3;
const VOICE_BADGES_OK = ['الأكثر ثباتًا', 'أطول سلسلة نقاط', 'أعلى حصاد في جولة واحدة'];

function _voiceH(){ return {formatCount, pickForm, formatList}; }

// اختيار حتمي لقالب مقطع واحد. history: {مفتاح: [معرّفات بترتيب الجولات]} ويُحدَّث.
function voicePickTemplate(key, list, s, h, history){
  const t = pickVariant(key, s.round, s, list, history, h);   // المنتقي المشترك (registry.js)
  return t ? {id: t.id, text: voiceApply(t, s, h)} : null;
}

// تقرير جولة واحدة. المقاطع بلا قالب صالح تُحذف، والعنوان ثابت.
function voiceComposeReport(s, history){
  const h = _voiceH(), W = WA_REPORT, ids = [];
  const take = key => { const x = voicePickTemplate('wa.' + key, W[key], s, h, history); if(!x) return null; ids.push(x.id); return x.text; };
  const parts = [`*دوري بروكي الفانتازي · بعد الجولة ${s.round}*`];
  parts.push(take('opener'));
  if(s.hero) parts.push([take('hero'), take('lead')].filter(Boolean).join(' '));
  else parts.push(take('lead'));
  const moves = [take('climb'), take('drop')].filter(Boolean);
  parts.push(moves.length ? moves.join(' ') : take('quiet'));
  parts.push([s.mummat.length ? take('mummat') : take('noMummat'), s.hotStreak ? take('streak') : null].filter(Boolean).join(' '));
  parts.push(take('closing'));
  return {text: parts.filter(Boolean).join('\n\n'), ids, round: s.round};
}

// لقطة بعد upto جولة من بيانات الموقع (يحجب DATA.rounds مؤقتًا)
function voiceSnapshot(upto){
  const saved = DATA.rounds;
  try{
    DATA.rounds = saved.slice(0, upto);
    const st = computeStandings();
    const heroes = st.length ? getRoundHeroes() : null;
    const badges = typeof computeBadges === 'function' ? computeBadges().filter(b => VOICE_BADGES_OK.includes(b.title)) : [];
    const hist = {}, played = {};
    PARTICIPANTS.forEach(p => { const all = getAllRoundsHistory(p.id); played[p.id] = all.length; hist[p.id] = all.filter(r => r.round >= 3).map(r => r.points); });
    const heroIds = DATA.rounds.map(r => getRoundChampion(r.number));
    const last = DATA.rounds[DATA.rounds.length - 1];
    // أندية كل مشارك في آخر جولة (لمنافس الجولة): عدد الفوز واللعب وأفضل فوز
    const clubs = {};
    PARTICIPANTS.forEach(p => {
      const en = (last && last.entries && last.entries[p.id]) || [];
      const wins = en.map((e, i) => ({e, club: p.teams[e && e.ti !== undefined ? e.ti : i]})).filter(x => x.e && x.e.result === 'win');
      wins.sort((a, b) => (b.e.gf - b.e.ga) - (a.e.gf - a.e.ga) || b.e.gf - a.e.gf);
      clubs[p.id] = {won: wins.length, played: en.filter(e => e && e.result !== 'no_match').length,
        best: wins[0] ? {club: wins[0].club, opp: wins[0].e.opp, gf: wins[0].e.gf, ga: wins[0].e.ga} : null};
    });
    return {clubs, round: last ? last.number : 0, st: st.map(x => ({id: x.id, name: x.name, total: x.total})),
      hero: heroes && heroes.top ? {id: heroes.top.id, name: heroes.top.name, pts: heroes.top.points, tieBreak: !!heroes.top.tieBreak} : null,
      mummat: heroes ? heroes.mummat : [], badges, hist, played, heroIds, total: SEASON_TOTAL_ROUNDS};
  } finally { DATA.rounds = saved; }
}

// حالة التقرير s (حقول whatsapp-report.js) من لقطتين. firstRound: هل cur أول جولة حقيقية
function voiceBuildReportState(cur, prev, firstRound){
  const rankOf = (st, id) => st.findIndex(x => x.id === id) + 1;
  const tailCount = (arr, pred) => { let c = 0; for(let i = arr.length - 1; i >= 0 && pred(arr[i]); i--) c++; return c; };
  const st = cur.st, n = st.length;
  const moves = st.map(x => ({...x, rank: rankOf(st, x.id), prevRank: rankOf(prev.st, x.id) || rankOf(st, x.id)})).map(x => ({...x, move: x.prevRank - x.rank}));
  const best = sign => { const v = Math.max(0, ...moves.map(m => sign * m.move)); return v >= 2 ? {names: moves.filter(m => sign * m.move === v).map(m => m.name), val: v} : null; };
  const topTied = st.filter(x => x.total === st[0].total).map(x => x.name);
  const runs = cur.mummat.map(nm => { const p = st.find(x => x.name === nm); return {name: nm, count: p ? tailCount(cur.hist[p.id], v => v === 0) : 0}; }).sort((a, b) => b.count - a.count);
  const hot = st.map(x => ({name: x.name, count: tailCount(cur.hist[x.id], v => v >= 4)})).filter(x => x.count >= 3).sort((a, b) => b.count - a.count)[0] || null;
  return {
    round: cur.round, nextRound: cur.round < cur.total ? cur.round + 1 : null, firstRound: !!firstRound,
    hero: cur.hero ? {...cur.hero, repeat: !!(prev.hero && prev.hero.id === cur.hero.id), prevRank: rankOf(prev.st, cur.hero.id)} : null,
    leader: st[0], chaser: st[1] || null, gap: st[1] ? st[0].total - st[1].total : 0,
    topTied: topTied.length >= 2 ? topTied : [], leaderChanged: !!(prev.st[0] && prev.st[0].id !== st[0].id), prevLeader: prev.st[0] ? prev.st[0].name : null,
    climbers: best(1), droppers: best(-1), mummat: cur.mummat,
    mummaRepeat: runs[0] && runs[0].count >= 2 ? runs[0] : null, hotStreak: hot, playersCount: n
  };
}

// يحاكي الجولات 1..upToRound بالتسلسل (history حقيقي لآخر 3 جولات) ويرجع كل التقارير
function voiceReportSeries(upToRound){
  const total = upToRound === undefined ? DATA.rounds.length : upToRound;
  const history = {}, out = [];
  let prev = voiceSnapshot(0);
  for(let k = 0; k < total; k++){
    const cur = voiceSnapshot(k + 1);
    out.push(voiceComposeReport(voiceBuildReportState(cur, prev, k === 0), history));
    prev = cur;
  }
  return out;
}

// تقرير الجولة الحالية للواجهة والواتساب، أو null لو لا جولات
function voiceCurrentReport(){
  if(!DATA.rounds.length) return null;
  const s = voiceReportSeries();
  return s[s.length - 1];
}

if(typeof module !== 'undefined') module.exports = {voicePickTemplate, voiceComposeReport, voiceBuildReportState, voiceReportSeries, voiceSnapshot, voiceCurrentReport};
