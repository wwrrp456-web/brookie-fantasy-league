/* مُختار «منافس الجولة» (002-R21a / S49): حتمي بلا عشوائية، من بيانات الجولة فقط.
 * الاعتماد: voice-engine.js (voiceSnapshot) وspotlight-angles.js (الزوايا وشروطها ودرجاتها من Opus) وregistry.js وar-format.js.
 *
 *   spotlightBuildStates(cur, prev, back3)   حالة sp لكل مشارك (حقول spotlight-angles.js)
 *   computeSpotlightCandidates(states, h)     [{sp, angle, score, urgent}] للزوايا المنطبقة (لها عنوان وقصة صالحان)
 *   pickSpotlight(candidates, history)        {sp, angle, ...} أو null
 *   spotlightSeries(upToRound)                يحاكي الجولات بالتسلسل ويرجع [{round, pick, candidates}]
 *   spotlightPlainText(c, h)                  نص إخباري مؤقت بسيط (يستبدله S50 بقوالب Opus)
 * القواعد: لا تكرار للمشارك في آخر 3 جولات، ولا للزاوية نفسها جولتين متتاليتين (لو وُجد بديل)، والتوزيع العادل بخصم 1.5 لكل ظهور سابق وعلاوة 2 لمن لم يظهر بعد،
 * وحد الأحداث العاجلة: تبديل الصدارة أو صعود 5 مراكز فأكثر يتجاوز نافذة الـ3 (بشرط ألا يكون المشارك منافس الجولة السابقة).
 * duel وpredictor = null الآن (مصدراهما season-duel وتوقعات الجولة غير مربوطين بالمحرك بعد؛ الزاويتان تُرفضان تلقائيًا). */

const SPOTLIGHT_WINDOW = 3;

function _spRank(st, id){ return st.findIndex(x => x.id === id) + 1; }
function _spTail(arr, pred){ let c = 0; for(let i = arr.length - 1; i >= 0 && pred(arr[i]); i--) c++; return c; }

function spotlightBuildStates(cur, prev, back3, report){
  const st = cur.st, n = st.length;
  return st.map(x => {
    const rank = _spRank(st, x.id), prevRank = _spRank(prev.st, x.id) || rank, i = rank - 1;
    const hist = cur.hist[x.id], pts = hist[hist.length - 1] || 0;
    const newBadge = cur.badges.find(b => b.names.includes(x.name) && !prev.badges.some(pb => pb.title === b.title && pb.names.includes(x.name)));
    return {
      round: cur.round, nextRound: cur.round < cur.total ? cur.round + 1 : null, name: x.name, id: x.id, rank, prevRank, move: prevRank - rank,
      total: x.total, pts, played: cur.clubs[x.id].played > 0, playersCount: n,
      above: i > 0 ? {name: st[i - 1].name, gap: st[i - 1].total - x.total} : null,
      below: i < n - 1 ? {name: st[i + 1].name, gap: x.total - st[i + 1].total} : null,
      isHero: !!(cur.hero && cur.hero.id === x.id), heroTieBreak: !!(cur.hero && cur.hero.tieBreak), heroPts: cur.hero ? cur.hero.pts : 0,
      isLeader: i === 0, leaderChanged: i === 0 && !!(prev.st[0] && prev.st[0].id !== x.id), second: i === 0 && st[1] ? {name: st[1].name, gap: x.total - st[1].total} : null,
      prevPts: hist.length >= 2 ? hist[hist.length - 2] : null, last5: hist.slice(-5),
      hotRun: _spTail(hist, v => v >= 4), coldEnded: pts > 0 ? _spTail(hist.slice(0, -1), v => v === 0) : 0,
      clubs: cur.clubs[x.id], duel: null, badge: newBadge ? {title: newBadge.title} : null, predictor: null,
      seasonMumma: hist.filter(v => v === 0).length, heroCount: cur.heroIds.filter(v => v === x.id).length, bestPts: Math.max(0, ...hist),
      leaderName: st[0].name, leaderGap: st[0].total - x.total, roundsPlayed: cur.played[x.id], seasonTotal: cur.total,
      rank3: back3 ? (_spRank(back3.st, x.id) || null) : null
    };
  });
}

function computeSpotlightCandidates(states, h){
  const out = [];
  states.forEach(sp => SPOTLIGHT_ANGLES.forEach(a => {
    let ok = false; try{ ok = !!a.when(sp); }catch(e){}
    if(!ok || !voiceEligible(a.title, sp, h).length || !voiceEligible(a.story, sp, h).length) return;
    out.push({sp, angle: a, score: a.score(sp), urgent: !!(sp.leaderChanged || sp.move >= 5)});
  }));
  return out;
}

// history: [{id, angle, round}] منافسو الجولات السابقة بالترتيب
function pickSpotlight(cands, history){
  if(!cands.length) return null;
  const last = history.length ? history[history.length - 1] : null;
  const recentIds = history.slice(-SPOTLIGHT_WINDOW).map(x => x.id);
  const appear = id => history.filter(x => x.id === id).length;
  let pool = cands.filter(c => !recentIds.includes(c.sp.id) || (c.urgent && !(last && last.id === c.sp.id)));
  if(!pool.length) pool = cands.filter(c => !(last && last.id === c.sp.id));   // لا أحد خارج النافذة: نخفف النافذة ولا نكرر الجولة السابقة
  if(!pool.length) pool = cands;
  if(last && pool.some(c => c.angle.id !== last.angle)) pool = pool.filter(c => c.angle.id !== last.angle);
  const scored = pool.map(c => ({...c, final: c.score - 1.5 * appear(c.sp.id) + (appear(c.sp.id) === 0 ? 2 : 0) + (c.urgent ? 2 : 0)}));
  scored.sort((a, b) => b.final - a.final || a.sp.rank - b.sp.rank || (a.sp.id < b.sp.id ? -1 : 1));
  return scored[0];
}

function spotlightSeries(upToRound){
  const h = {formatCount, pickForm, formatList};
  const total = upToRound === undefined ? DATA.rounds.length : upToRound;
  const history = [], out = [];
  let prev = voiceSnapshot(0), snaps = [prev];
  for(let k = 0; k < total; k++){
    const cur = voiceSnapshot(k + 1); snaps.push(cur);
    const back3 = k >= 3 ? snaps[k - 2] : null;
    const cands = computeSpotlightCandidates(spotlightBuildStates(cur, prev, back3), h);
    const pick = pickSpotlight(cands, history);
    if(pick) history.push({id: pick.sp.id, angle: pick.angle.id, round: cur.round});
    out.push({round: cur.round, pick, candidates: cands.length});
    prev = cur;
  }
  return out;
}

// نص إخباري مؤقت (من هو، وماذا حصل، وكم، ورقم داعم) بالمعجم؛ قوالب Opus تحل محله في S50
function spotlightPlainText(c, h){
  const sp = c.sp;
  const move = sp.move > 0 ? `وصعد ${h.formatCount(sp.move, 'مركز', {case: 'acc'})}` : sp.move < 0 ? `وتراجع ${h.formatCount(-sp.move, 'مركز', {case: 'acc'})}` : 'وثبت مكانه';
  const pts = sp.pts === 0 ? 'بلا نقاط' : vkBi(h, sp.pts);
  return `منافس الجولة ${sp.round}: ${vkN(sp.name)} (${c.angle.label}). جمع ${pts} هذه الجولة ${move}، ورصيده ${h.formatCount(sp.total, 'نقطة')} في المركز ${sp.rank}.`;
}

if(typeof module !== 'undefined') module.exports = {spotlightBuildStates, computeSpotlightCandidates, pickSpotlight, spotlightSeries, spotlightPlainText};
