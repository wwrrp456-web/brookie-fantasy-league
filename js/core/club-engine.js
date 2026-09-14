/* بيانات الأندية المحسوبة ورسم شعار النادي (SVG) */

function clubInitials(name){
  const st = CLUB_STYLE[name];
  const s = (st && st.short) ? st.short : name;
  return s.slice(0,4);
}

// عدّاد عام يضمن أن يكون معرّف clipPath فريدًا لكل شعار يُرسم بالصفحة، حتى لو
// تكرر نفس النادي عشرات المرّات (زي "الهلال" اللي يظهر بأغلب فرق المشاركين).
// قبل هذا العدّاد كان المعرّف مبنيًا فقط من hash اسم النادي، فكل الشعارات
// لنفس النادي بكل الصفحة كانت تتشارك نفس id="shXXXX" (تكرار id غير صالح
// بمواصفات HTML/SVG) — وبعض المتصفحات (خصوصًا متصفحات الجوال) تفشل بحل
// مرجع clip-path لما يتكرر الـ id عشرات المرات بنفس الصفحة (245 شعار من
// حوالي 29 ناديًا فقط)، فيتجاهل المتصفح القص بالكامل ويظهر الشعار كمربّع
// مصمت بدون حواف الدرع ولا الإطار الذهبي (بلاغ المستخدم 4 سبتمبر 2026 —
// المشكلة ما ظهرت بمتصفح الفحص لأنه اختبر شعارًا واحدًا منعزلًا في كل مرة).
let __crestUidSeq = 0;

// يبني درع SVG بهوية بصرية لكل نادي (نمط + ألوان + الحرف الأول)
function clubCrestSVG(name, px){
  const st = CLUB_STYLE[name] || {bg:'#1A1A1A', fg:'#E7C158', pattern:'solid', accent:'#E7C158'};
  const uid = 'c' + Math.abs(hashStr(name)).toString(36) + '_' + (__crestUidSeq++);
  const bg = st.bg, ac = st.accent || st.fg, fg = st.fg;
  const label = (st.short || name).slice(0,2);

  let pattern = '';
  if(st.pattern === 'stripes'){
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      <rect x="16" y="0" width="16" height="110" fill="${ac}"/>
      <rect x="48" y="0" width="16" height="110" fill="${ac}"/>
      <rect x="80" y="0" width="16" height="110" fill="${ac}"/>
    </g>`;
  } else if(st.pattern === 'halves'){
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="50" height="110" fill="${bg}"/>
      <rect x="50" y="0" width="50" height="110" fill="${ac}"/>
    </g>`;
  } else if(st.pattern === 'sash'){
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      <polygon points="0,32 100,0 100,34 0,66" fill="${ac}"/>
    </g>`;
  } else if(st.pattern === 'hoops'){
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      <rect x="0" y="14" width="100" height="15" fill="${ac}"/>
      <rect x="0" y="44" width="100" height="15" fill="${ac}"/>
      <rect x="0" y="74" width="100" height="15" fill="${ac}"/>
    </g>`;
  } else if(st.pattern === 'diag'){
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      <polygon points="0,0 46,0 0,58" fill="${ac}"/>
      <polygon points="100,110 54,110 100,52" fill="${ac}"/>
    </g>`;
  } else {
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      <path d="M50 18 L64 44 L50 58 L36 44 Z" fill="${ac}" opacity="0.28"/>
    </g>`;
  }

  // إطار الدرع: يُرسم أولًا درع كامل معبأ بالذهبي (لون افتراضي/مخصص قديم
  // بـ strokeCol، لكن قاعدة CSS أعلاه .crest .crest-border تطغى عليه دائمًا
  // بالذهبي الموحّد)، وفوقه درع أصغر (مُصغَّر من المنتصف) فيه ألوان النادي
  // الفعلية (خلفية + نمط) مقصوصة بـ clip-path على مقاس الدرع الأصغر نفسه —
  // فيبقى هامش ذهبي واضح ومضمون هندسيًا حول كل الألوان بأي حجم عرض (حتى
  // أصغر مقاس مستخدم بأي قائمة)، بدل الاعتماد على خط حد رفيع فوق قص قد
  // يترك شعرة بكسل من لون الخلفية خارج الإطار بالأحجام الصغيرة جدًا.
  const strokeCol = st.border || 'rgba(0,0,0,0.55)';
  const fontPx = label.length > 2 ? 28 : 33;
  const INSET = 'translate(50,56) scale(0.82) translate(-50,-56)';

  return `<svg class="crest" width="${px}" height="${px*1.1}" viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${name}">
    <defs>
      <clipPath id="sh${uid}">
        <path d="M6 6 H94 V58 C94 84 74 99 50 106 C26 99 6 84 6 58 Z" transform="${INSET}"/>
      </clipPath>
    </defs>
    <path class="crest-border" d="M6 6 H94 V58 C94 84 74 99 50 106 C26 99 6 84 6 58 Z" fill="${strokeCol}"/>
    ${pattern}
    <text x="50" y="60" text-anchor="middle"
          font-family="Tajawal, Arial, sans-serif" font-size="${fontPx}" font-weight="800"
          fill="${fg}" stroke="rgba(0,0,0,0.35)" stroke-width="0.8" paint-order="stroke">${label}</text>
  </svg>`;
}

function clubBadgeHTML(name, size){
  const px = size==='sm' ? 30 : 44;
  const cls = size==='sm' ? 'club-mini sm' : 'club-mini';
  return `<div class="${cls}">
    ${clubCrestSVG(name, px)}
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
  PARTICIPANTS.forEach(p=>{
    const pts = roundPoints[p.id];
    if(pts > maxPts) maxPts = pts;
    if((!JOINED_AFTER_ROUND1[p.id] && !JOINED_AFTER_ROUND2[p.id]) || DATA.rounds.length>0){
      if(pts===0) mummat.push(p.name);
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
      if(e && e.result) results.push(e.result);
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
