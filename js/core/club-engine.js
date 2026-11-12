/* بيانات الأندية المحسوبة ورسم شعار النادي (SVG) */

function clubInitials(name){
  const st = CLUB_STYLE[name];
  const s = (st && st.short) ? st.short : name;
  return s.slice(0,4);
}

function clubBadgeHTML(name, size){
  const px = size==='sm' ? 30 : 44;
  const cls = size==='sm' ? 'club-mini sm' : 'club-mini';
  return `<div class="${cls}">
    ${crestHTML(name, px)}
    <div class="club-name">${name}</div>
  </div>`;
}

function computeRoundGoals(round, pid){
  const entries = (round.entries && round.entries[pid]) || [];
  let gf=0, ga=0;
  entries.forEach(e=>{ gf += Number(e.gf)||0; ga += Number(e.ga)||0; });
  return {gf, ga};
}

function getRoundHeroes(){
  const roundPoints = getCurrentRoundPointsMap();
  const full = computeStandings();
  const roundNum = getCurrentRoundNumber();

  let top = null, mummat = [], bestStreak = null;
  let maxPts = -Infinity;
  // آخر جولة حقيقية (إن وُجدت) — تُستخدم لاستثناء مشارك بلا مباراة فعلية هذه
  // الجولة (كل أنديته "لا توجد مباراة") من قائمة "ممات الجولة"، بدل عدّه كأنه
  // لعب وسجّل صفرًا (طلب المستخدم 16 سبتمبر 2026).
  const lastRoundForHeroes = DATA.rounds.length ? DATA.rounds[DATA.rounds.length-1] : null;
  PARTICIPANTS.forEach(p=>{
    const pts = roundPoints[p.id];
    if(pts > maxPts) maxPts = pts;
    if((!JOINED_AFTER_ROUND1[p.id] && !JOINED_AFTER_ROUND2[p.id]) || DATA.rounds.length>0){
      const playedThisRound = lastRoundForHeroes ? round_has_entries(lastRoundForHeroes, p.id) : true;
      if(pts===0 && playedThisRound) mummat.push(p.name);
    }
  });

  const tied = PARTICIPANTS.filter(p=> roundPoints[p.id] === maxPts);
  if(tied.length <= 1){
    const w = tied[0];
    top = {id:w.id, name:w.name, points:maxPts, teams:w.teams};
  } else if(ROUND_HERO_OVERRIDE[roundNum]){
    const w = PARTICIPANTS.find(p=> p.id === ROUND_HERO_OVERRIDE[roundNum]);
    top = {id:w.id, name:w.name, points:maxPts, teams:w.teams, tieBreak:true};
  } else if(DATA.rounds.length > 0){
    // كسر تعادل تلقائي لجولات 3+: الأكثر أهدافًا ثم الأقل استقبالًا
    const last = DATA.rounds[DATA.rounds.length-1];
    const sorted = tied.slice().sort((a,b)=>{
      const ga_ = computeRoundGoals(last, a.id), gb_ = computeRoundGoals(last, b.id);
      if(gb_.gf !== ga_.gf) return gb_.gf - ga_.gf;
      if(ga_.ga !== gb_.ga) return ga_.ga - gb_.ga;
      return a.name.localeCompare(b.name,'ar');
    });
    const w = sorted[0];
    top = {id:w.id, name:w.name, points:maxPts, teams:w.teams, tieBreak:true};
  } else {
    const w = tied[0];
    top = {id:w.id, name:w.name, points:maxPts, teams:w.teams, tieBreak:true};
  }

  full.forEach(s=>{
    if(!bestStreak || s.streak > bestStreak.streak) bestStreak = {name:s.name, streak:s.streak};
  });
  return {roundNumber:getCurrentRoundNumber(), top, mummat, bestStreak};
}

// ---------- إحصائيات الأندية ----------
// الأساس: بيانات الموسم الحقيقية حتى 2 سبتمبر 2026 (CLUB_SEASON_STATS)،
// وتُضاف عليها أي جولات فانتازي حقيقية أُدخلت لاحقًا من تبويب المنظم
// (من الجولة 3 فصاعدًا) حتى تبقى الإحصائيات محدَّثة ودقيقة دائمًا.
// نادٍ مشترك بين عدة مشاركين تُضمن نتيجته موحّدة بينهم عبر syncSharedClub()
// (نفس المباراة الحقيقية تُنسخ حرفيًا لكل مالك). لذا عند تجميع إحصائيات نادٍ
// عبر كل الجولات يكفي أخذ تسجيل أول مالك له بكل جولة فقط — وإلا تُحتسب نفس
// المباراة N مرة (بعدد الملاك)، وهذا سبب خطأ "الهلال خسر 7 مرات" المُبلَّغ
// عنه رغم أن الهلال خاض مباريات أقل بكثير (7 سبتمبر 2026).
function getClubRoundResults(clubName){
  const owner = PARTICIPANTS.find(p=> p.teams.includes(clubName));
  if(!owner) return [];
  const idx = owner.teams.indexOf(clubName);
  const results = [];
  DATA.rounds.forEach(r=>{
    const entries = (r.entries && r.entries[owner.id]) || [];
    // نادٍ قد يلعب أكثر من مباراة بنفس الجولة (منذ 5 سبتمبر 2026) — هذه مباريات
    // حقيقية متعددة لنفس المالك، فتُحتسب كلها (ليست تكرارًا).
    getTeamRoundEntries(entries, idx).forEach(e=>{
      // "لا توجد مباراة" (no_match) ليست مباراة فعلية لهذا النادي — تُستثنى من
      // عدّاد "لعب X مباراة" وإحصائيات الأداء، وإلا احتُسب النادي كأنه خسر/تعادل
      // في جولة لم يخض فيها أصلًا (طلب المستخدم 16 سبتمبر 2026).
      if(e && e.result && e.result !== 'no_match') results.push(e.result);
    });
  });
  return results;
}

function getClubStats(){
  const map = {};
  PARTICIPANTS.forEach(p=>{
    p.teams.forEach(t=>{
      if(!map[t]){
        const base = CLUB_SEASON_STATS[t] || {played:0, w:0, d:0, l:0, pts:0};
        map[t] = {name:t, played:base.played, pts:base.pts, w:base.w, d:base.d, l:base.l, owners:new Set()};
      }
      map[t].owners.add(p.name);
    });
  });
  Object.keys(map).forEach(t=>{
    getClubRoundResults(t).forEach(result=>{
      map[t].played++;
      map[t].pts += RESULT_POINTS[result] || 0;
      if(result==='win') map[t].w++;
      else if(result==='draw') map[t].d++;
      else map[t].l++;
    });
  });
  return Object.values(map)
    .map(c=>({...c, ownersCount:c.owners.size, avg: c.played? (c.pts/c.played):0}))
    .sort((a,b)=> b.pts - a.pts || b.avg - a.avg);
}

// نص مختصر لبيانات لعب نادٍ واحد (لعب/فاز/تعادل/خسر) لعرضه في القوائم المنسدلة
// — يجمع قاعدة الجسر الثابتة (CLUB_SEASON_STATS، جولتا 1-2) مع كل جولات
// DATA.rounds الفعلية (3+)، بنفس منطق إزالة التكرار في getClubStats أعلاه.
function clubPlayLine(name){
  const base = CLUB_SEASON_STATS[name] || {played:0, w:0, d:0, l:0, pts:0};
  let played = base.played, w = base.w, d = base.d, l = base.l, pts = base.pts;
  getClubRoundResults(name).forEach(result=>{
    played++;
    pts += RESULT_POINTS[result] || 0;
    if(result==='win') w++;
    else if(result==='draw') d++;
    else l++;
  });
  if(!played) return 'لم تبدأ مبارياته بعد';
  return `لعب ${played} · فاز ${w} · تعادل ${d} · خسر ${l} · ${pts} نقطة`;
}
