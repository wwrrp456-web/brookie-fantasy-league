/* مُختار «منافس الجولة» (002-R21a / S49): حتمي بلا عشوائية، من بيانات الجولة فقط.
 * الاعتماد: voice-engine.js (voiceSnapshot) وspotlight-angles.js (الزوايا وشروطها ودرجاتها من Opus) وregistry.js وar-format.js.
 *
 *   spotlightBuildStates(cur, prev, back3)   حالة sp لكل مشارك (حقول spotlight-angles.js)
 *   computeSpotlightCandidates(states, h)     [{sp, angle, score, urgent}] للزوايا المنطبقة (لها عنوان وقصة صالحان)
 *   pickSpotlight(candidates, history)        {sp, angle, ...} أو null
 *   spotlightSeries(upToRound)                يحاكي الجولات بالتسلسل ويرجع [{round, pick, candidates}]
 *   spotlightPlainText(c, h)                  نص إخباري مؤقت بسيط (احتياطي)
 *   spotlightCompose(c, history, len, h)      التقرير بقوالب Opus (S50): {title, paragraphs, text للواتساب, ids, words}
 *   spotlightReportSeries(upToRound)          المنافس وتقريره لكل جولة بالتسلسل · spotlightCurrentReport() للجولة الحالية
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
  const pts = sp.pts === 0 ? 'ما جمع نقاطًا' : 'جمع ' + h.formatCount(sp.pts, 'نقطة', {case: 'acc'});
  return `منافس الجولة ${sp.round}: ${vkN(sp.name)}، والزاوية «${c.angle.label}». ${pts} هذه الجولة ${move}، ورصيده ${h.formatCount(sp.total, 'نقطة')} في المركز ${sp.rank}.`;
}


// ---------- تركيب التقرير بقوالب Opus (002-R21b / S50) ----------
// c: {sp, angle} من pickSpotlight. len: 'long' | 'short' (يختاره spotlightLength حتميًا). history: {مفتاح: [معرّفات]} يحسبه المسلسل.
// الترتيب: العنوان ← القصة + حتى 3 أرقام داعمة ← (الطويلة: سياق الموسم) ← التحفيز ← النكتة (ونكتة ثانية بالطويلة) ← الخاتمة.
function spotlightCompose(c, history, len, h){
  const sp = c.sp, a = c.angle, r = sp.round, ids = [];   // مفاتيح السجل بلا فرق بين الطويلة والقصيرة (نفس القالب ما يتكرر بينهما)
  const pickText = (key, list, st) => { const v = pickVariant(key, r, st || sp, list, history, h); if(!v) return null; ids.push(v.id); return voiceApply(v, st || sp, h); };
  const take = (key, list) => pickText('sp.' + key, list);
  const title = take(a.id + '.title', a.title), story = take(a.id + '.story', a.story);
  // قوالب ما تجتمع (تقول نفس المعلومة) ← SPOTLIGHT_CONFLICTS، والصاروخ ما يكرر الحركة بالرقم الداعم
  const C = SPOTLIGHT_CONFLICTS, clash = id => (C[id] || []).some(x => ids.includes(x)) || Object.keys(C).some(k => ids.includes(k) && C[k].includes(id));
  // sp.fact.1 يُترك لو القصة ذكرت المركز والرصيد (قاعدة موثّقة في spotlight-angles.js)
  const storyHasBoth = story && story.includes('المركز ' + sp.rank) && story.includes(h.formatCount(sp.total, 'نقطة'));
  let facts = SPOTLIGHT_FACTS.filter(t => !(a.id === 'rocket' && t.id === 'sp.fact.8') && !(storyHasBoth && t.id === 'sp.fact.1'));
  const chosen = [];
  for(let i = 0; i < 3; i++){
    const L = facts.filter(t => !clash(t.id));
    const v = pickVariant('sp.fact' + i, r, sp, L, history, h);
    if(!v) break;
    ids.push(v.id); chosen.push(v); facts = facts.filter(t => t.id !== v.id);
  }
  const order = SPOTLIGHT_FACTS.map(t => t.id);
  const factTexts = chosen.sort((x, y) => order.indexOf(x.id) - order.indexOf(y.id)).map(x => voiceApply(x, sp, h));
  const motiv = take('motiv.' + a.mood, SPOTLIGHT_MOTIVATION[a.mood].filter(t => !clash(t.id)));
  const season = [];
  if(len === 'long'){
    let pool = SPOTLIGHT_SEASON;
    for(let i = 0; i < 3; i++){ const x = take('season' + i, pool.filter(t => !clash(t.id))); if(!x) break; season.push(x); pool = pool.filter(t => !ids.includes(t.id)); }
  }
  const joke = take(a.id + '.joke', a.joke);
  const joke2 = len === 'long' ? take(a.id + '.joke', a.joke.filter(t => !ids.includes(t.id))) : null;   // نفس مفتاح السجل: النكتتان لا تتكرران بآخر 3 استعمالات
  const close = take('close.' + a.mood, SPOTLIGHT_CLOSING[a.mood]);
  const paragraphs = [[story, ...factTexts].filter(Boolean).join(' '), season.join(' '), motiv, [joke, joke2].filter(Boolean).join(' '), close].filter(Boolean);
  const text = ['*' + title + '*', ...paragraphs].join('\n\n');   // نص الواتساب: العنوان بخط عريض، بلا إيموجي (R-24)
  return {round: r, id: sp.id, name: sp.name, angle: a.id, angleLabel: a.label, len, title, paragraphs, text, ids, words: text.replace(/\*/g, '').split(/\s+/).filter(Boolean).length};
}

// يحاكي الجولات بالتسلسل: منافس كل جولة مع تقريره المركّب (history القوالب حقيقي). يرجع [{round, pick, report}]
function spotlightReportSeries(upToRound){
  const h = {formatCount, pickForm, formatList};
  const total = upToRound === undefined ? DATA.rounds.length : upToRound;
  const history = [], tplHistory = {}, out = [];
  let prev = voiceSnapshot(0); const snaps = [prev];
  for(let k = 0; k < total; k++){
    const cur = voiceSnapshot(k + 1); snaps.push(cur);
    const states = spotlightBuildStates(cur, prev, k >= 3 ? snaps[k - 2] : null);
    const pick = pickSpotlight(computeSpotlightCandidates(states, h), history);
    let report = null;
    if(pick){
      history.push({id: pick.sp.id, angle: pick.angle.id, round: cur.round});
      report = spotlightCompose(pick, tplHistory, spotlightLength(pick.sp, h), h);
    }
    out.push({round: cur.round, pick, report});
    prev = cur;
  }
  return out;
}

// تقرير الجولة الحالية (للواجهة والواتساب)، أو null لو لا جولات/لا منافس
let _spCache = {key: null, val: null};   // الحساب يحاكي كل الجولات، فنحفظه ما دامت بيانات الجولات نفسها (تُرسم الصفحة مرات كثيرة)
function spotlightCurrentReport(){
  if(!DATA.rounds.length) return null;
  const key = JSON.stringify(DATA.rounds);
  if(_spCache.key === key) return _spCache.val;
  const s = spotlightReportSeries();
  const last = s[s.length - 1];
  const val = last && last.report ? Object.assign({}, last.report) : null;
  _spCache = {key, val};
  return val;
}

if(typeof module !== 'undefined') module.exports = {spotlightBuildStates, computeSpotlightCandidates, pickSpotlight, spotlightSeries, spotlightPlainText, spotlightCompose, spotlightReportSeries, spotlightCurrentReport};
