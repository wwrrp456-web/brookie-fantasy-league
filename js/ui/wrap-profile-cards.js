/* كرتا ملخص الموسم (1080×1350) والملف الشخصي (1080×1080) بالكانفس، بنسختين ليلية ونهارية (001-T023، R-14..R-17).
 * يحلان محل buildSeasonWrapCard وbuildParticipantProfileCard القديمين. المواصفة الرقمية: assets/cards/cards.layout.md
 * (season-wrap-post وprofile-square). الشهادة خارج النطاق (تنتظر C16) فلا تُلمس هنا.
 * الاعتماد: card-kit.js وstandings-card.js (نافذة الوضع ومفتاح الثيم المحفوظ) وcrests.js وar-format.js ومحركات الموقع. الألوان من card-themes.js فقط. */

const WRAP_CARD_BG = {dark: 'assets/cards/bg-post.webp', light: 'assets/cards/bg-post-light.webp'};
const WRAP_URL = 'wwrrp456-web.github.io/brookie-fantasy-league/';

function _wrapRoundGuard(data, out){ if(!Number.isInteger(data.round) || data.round < 1) out.push('رقم الجولة غير محدد'); }
function validateSeasonWrapData(data){
  const out = [];
  if(!data || typeof data !== 'object') return ['لا توجد بيانات للكرت'];
  _wrapRoundGuard(data, out);
  if(!data.topTotal || !Number.isFinite(data.topTotal.value) || !data.topTotal.name) out.push('أعلى رصيد غير محدد');
  if(!data.bestRound || !Number.isFinite(data.bestRound.points) || !Number.isInteger(data.bestRound.round)) out.push('أعلى نقاط جولة غير محددة');
  if(!Array.isArray(data.mummas)) out.push('ممّات الجولة غير محددة');
  return out;
}
function validateProfileData(data){
  const out = [];
  if(!data || typeof data !== 'object') return ['لا توجد بيانات للكرت'];
  _wrapRoundGuard(data, out);
  if(!data.name) out.push('اسم المشارك ناقص');
  if(!Array.isArray(data.clubs) || data.clubs.length !== 3 || data.clubs.some(c => !c)) out.push(`أندية ${data.name || 'المشارك'} ناقصة (المطلوب ثلاثة)`);
  if(!Number.isFinite(data.rank)) out.push('مركز المشارك غير محدد');
  if(!Number.isFinite(data.total)) out.push('رصيد المشارك غير محدد');
  if(!Number.isFinite(data.roundPoints)) out.push('نقاط الجولة غير محددة');
  return out;
}

// ---------- ملخّص نهاية الموسم القابل للمشاركة (خاص بالمنظم) ----------
// يجمع أبرز أرقام الموسم في كرت واحد بنفس هوية كرت بطل الجولة، على نمط
// "الملخص السنوي" لتطبيقات الموسيقى — مصمم ليُنشر في المجموعة عند نهاية
// الموسم أو أي وقت يرغب فيه المنظم بلمحة شاملة.
function getSeasonWrapStats(){
  const st = computeStandings();
  const leader = st[0] || null;

  // أفضل أداء فردي بجولة واحدة عبر كامل الموسم (تشمل جسر الجولة 2 وكل
  // الجولات الحقيقية 3 فصاعدًا)
  let bestRound = {name:'', points:-Infinity, round:null};
  const bridgePts = getRound2BridgePointsMap();
  PARTICIPANTS.forEach(p=>{
    if(bridgePts[p.id] > bestRound.points) bestRound = {name:p.name, points:bridgePts[p.id], round:2};
  });
  DATA.rounds.forEach(round=>{
    const stats = computeRoundStats(round);
    PARTICIPANTS.forEach(p=>{
      if(stats[p.id].points > bestRound.points) bestRound = {name:p.name, points:stats[p.id].points, round:round.number};
    });
  });

  // الأكثر توقعًا صحيحًا — نفس ترتيب لوحة المتصدرين في قسم التوقعات
  const acc = computePredictionAccuracy();
  const predRanked = PARTICIPANTS
    .map(p=>({name:p.name, correct:acc[p.id].correct, total:acc[p.id].total}))
    .filter(a=>a.total>0)
    .sort((a,b)=> b.correct-a.correct || (b.correct/b.total)-(a.correct/a.total));
  const topPredictor = predRanked[0] || null;

  // أطول سلسلة جولات متتالية بدون ممة (bestStreak محسوبة أصلاً في computeStandings)
  let bestStreakOwner = {name:'', streak:0};
  st.forEach(s=>{
    if(s.bestStreak > bestStreakOwner.streak) bestStreakOwner = {name:s.name, streak:s.bestStreak};
  });

  return {leader, bestRound, topPredictor, bestStreakOwner};
}

// ---------- بيانات من محركات الموقع ----------
function getSeasonWrapCardData(){
  const stats = getSeasonWrapStats();
  const h = getRoundHeroes();
  if(!stats.leader) return null;
  return {
    round: getCurrentRoundNumber(),
    topTotal: {value: stats.leader.total, name: stats.leader.name},
    bestRound: {points: stats.bestRound.points, round: stats.bestRound.round},
    mummas: h ? h.mummat.slice() : [],
    date: formatDate(new Date(), {style: 'full'})
  };
}
function getProfileCardData(pid){
  const p = PARTICIPANTS.find(x => x.id === pid);
  if(!p) return null;
  const st = computeStandings();
  const idx = st.findIndex(s => s.id === pid);
  const rp = getCurrentRoundPointsMap();
  const h = getRoundHeroes();
  return {
    round: getCurrentRoundNumber(), id: pid, name: p.name, clubs: (p.teams || []).slice(),
    rank: idx + 1, total: idx >= 0 ? st[idx].total : NaN, roundPoints: rp[pid] === undefined ? NaN : rp[pid],
    clubsCount: (p.teams || []).length, isChampion: !!(h && h.top && h.top.id === pid),
    date: formatDate(new Date(), {style: 'full'})
  };
}

// ---------- ملخص الموسم 1080×1350 ----------
async function buildSeasonWrapCardCanvas(opts){
  const o = opts || {};
  const theme = cardResolveTheme(o.theme);
  const data = o.data || getSeasonWrapCardData();
  const problems = validateSeasonWrapData(data);
  if(problems.length) throw new CardDataError(problems);

  const W = 1080, H = 1350;
  await cardFontsReady([[24, 400], [32, 400], [32, 700], [48, 800], [64, 700]]);
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  await cardDrawBackground(ctx, theme, W, H, WRAP_CARD_BG);

  const text = cardColor(theme, 'text'), text2 = cardColor(theme, 'text-2'), brand = cardColor(theme, 'brand');

  await cardDrawLogo(ctx, theme, 808, 96, 176);
  cardTextBase(ctx, `الموسم الثاني · حتى الجولة ${data.round}`, 776, 168.921875, {size: 24, weight: 400, color: text2, align: 'right'});
  cardTextBase(ctx, 'الموسم بالأرقام', 776, 221.921875, {size: 48, weight: 800, color: text, align: 'right'});
  cardDrawImage(ctx, await cardIconImage('chart-bar', brand, 48), 96, 173.109375, 48, 48);
  cardHRule(ctx, theme, 64, 330, 952);

  const mum = data.mummas;
  const mumValue = mum.length ? String(mum.length) : '0';
  const mumSub = !mum.length ? 'لا أحد' : (mum.length <= 3 ? formatList(mum) : formatCount(mum.length, 'مشارك'));
  const tiles = [
    {x: 552, y: 339.25, icon: 'calendar', b: String(data.round), p: 'الجولات المنجزة', s: `حتى الجولة ${data.round}`},
    {x: 64, y: 339.25, icon: 'crown', b: String(data.topTotal.value), p: 'أعلى رصيد', s: data.topTotal.name},
    {x: 552, y: 633.4375, icon: 'bolt', b: String(data.bestRound.points), p: 'أعلى نقاط جولة', s: `في الجولة ${data.bestRound.round}`},
    {x: 64, y: 633.4375, icon: 'skull-zero', b: mumValue, p: 'ممّات الجولة', s: mumSub}
  ];
  for(const t of tiles){
    cardDrawPanel(ctx, theme, t.x, t.y, 464, 270.1875);
    const right = t.x + 439;
    cardDrawImage(ctx, await cardIconImage(t.icon, brand, 40), right - 40, t.y + 25, 40, 40);
    cardTextBase(ctx, t.b, right, t.y + 121, {size: 64, weight: 700, color: text, align: 'right', dir: 'ltr'});
    cardTextBase(ctx, t.p, right, t.y + 186.390625, {size: 32, weight: 400, color: text, align: 'right'});
    const sub = cardFitText(ctx, t.s, 414, {size: 24, weight: 400, maxLines: 1, minSize: 16});
    cardTextBase(ctx, sub.lines[0], right, t.y + 233.1875, {size: sub.size, weight: 400, color: text2, align: 'right'});
  }

  // شريط الممّات: أيقونة 48 يمينًا، والنص يمينه عند 927
  cardDrawPanel(ctx, theme, 64, 919.625, 952, 121);
  cardDrawImage(ctx, await cardIconImage('skull-zero', brand, 48), 943, 956.125, 48, 48);
  const bar = mum.length
    ? {b: mum.length <= 3 ? formatList(mum) : formatCount(mum.length, 'مشارك'), s: `${pickForm(mum.length, {one: 'لم يسجّل', two: 'لم يسجّلا', many: 'لم يسجّلوا'})} نقاطًا في الجولة ${data.round}.`}
    : {b: 'لا أحد', s: `الجميع سجّل نقاطًا في الجولة ${data.round}.`};
  const barFit = cardFitText(ctx, bar.b, 860, {size: 32, weight: 700, maxLines: 1, minSize: 18});
  cardTextBase(ctx, barFit.lines[0], 927, 968.625, {size: barFit.size, weight: 700, color: text, align: 'right'});
  cardTextBase(ctx, bar.s, 927, 1003.625, {size: 24, weight: 400, color: text2, align: 'right'});

  cardTextBase(ctx, data.date, 540, 1175, {size: 24, weight: 400, color: text2, align: 'center'});
  cardDrawFooter(ctx, theme, {y: 1254, centerY: 1302.5, right: 'فوز 3 · تعادل 1 · خسارة 0', left: WRAP_URL});
  return cv;
}

// ---------- الملف الشخصي 1080×1080 ----------
async function buildParticipantProfileCardCanvas(pid, opts){
  const o = opts || {};
  const theme = cardResolveTheme(o.theme);
  const data = o.data || getProfileCardData(pid);
  const problems = validateProfileData(data);
  if(problems.length) throw new CardDataError(problems);

  const W = 1080, H = 1080;
  await cardFontsReady([[24, 400], [24, 700], [32, 400], [48, 700], [60, 800]]);
  await cardPreloadClubs(data.clubs, theme);
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  await cardDrawBackground(ctx, theme, W, H, WRAP_CARD_BG);

  const text = cardColor(theme, 'text'), text2 = cardColor(theme, 'text-2'), gold = cardAccent(theme, 'gold');

  await cardDrawLogo(ctx, theme, 848, 88, 144);
  // العنوان بمحاذاة اليمين عند 816 (`.square .brand-heading .center{text-align:start}`)
  cardTextBase(ctx, 'الملف الشخصي · الموسم الثاني', 816, 134.734375, {size: 24, weight: 400, color: text2, align: 'right'});
  const nm = cardFitText(ctx, data.name, 728, {size: 60, weight: 800, maxLines: 1, minSize: 30});
  cardTextBase(ctx, nm.lines[0], 816, 197.734375 - (60 - nm.size) * 0.3, {size: nm.size, weight: 800, color: text, align: 'right'});
  cardHRule(ctx, theme, 64, 277, 952);

  // الأندية: ثلاثة أعمدة بعرض 180، الأول يمينًا (مراكز 732 / 540 / 348)
  data.clubs.forEach((club, i) => {
    const cx = 732 - i * 192;
    drawCrest(ctx, club, cx - 24, 294.46875, 48, 52.796875, {theme});
    const f = cardFitText(ctx, club, 176, {size: 24, weight: 700, maxLines: 1, minSize: 14});
    cardTextBase(ctx, f.lines[0], cx, 382.265625, {size: f.size, weight: 700, color: text, align: 'center'});
  });

  const tiles = [
    {x: 552, y: 412.859375, b: data.rank, p: 'المركز'},
    {x: 64, y: 412.859375, b: data.total, p: 'الرصيد'},
    {x: 552, y: 572.859375, b: data.roundPoints, p: 'نقاط الجولة'},
    {x: 64, y: 572.859375, b: data.clubsCount, p: 'الأندية'}
  ];
  tiles.forEach(t => {
    cardDrawPanel(ctx, theme, t.x, t.y, 464, 136);
    cardTextBase(ctx, t.b, t.x + 232, t.y + 50, {size: 48, weight: 700, color: text, align: 'center', dir: 'ltr'});
    cardTextBase(ctx, t.p, t.x + 232, t.y + 92.796875, {size: 24, weight: 400, color: text, align: 'center'});
  });

  if(data.isChampion){
    const label = `بطل الجولة ${data.round}`;
    const lw = cardTextWidth(ctx, label, 32, 400), gw = 32 + 12 + lw, gx = 540 - gw / 2;
    cardDrawImage(ctx, await cardIconImage('trophy', gold, 32), gx + gw - 32, 727.859375, 32, 32);
    cardTextBase(ctx, label, gx + lw, 748.859375, {size: 32, weight: 400, color: text, align: 'right'});
  }
  cardTextBase(ctx, data.date, 540, 905, {size: 24, weight: 400, color: text2, align: 'center'});
  cardDrawFooter(ctx, theme, {y: 984, centerY: 1032.5, right: 'فوز 3 · تعادل 1 · خسارة 0', left: WRAP_URL});
  return cv;
}

// ---------- التصدير (تحميل/مشاركة) بالوضع المختار؛ الاختيار محفوظ ومشترك مع باقي الكروت ----------
function seasonWrapFilename(round, theme){ return `brookie-season-wrap-round-${round}-${theme}.png`; }
function profileCardFilename(pid, theme){ return `brookie-profile-${pid}-${theme}.png`; }

// عام: يبني ويصدّر كرتًا. spec {subject, build(theme) → {cv, filename, shareTitle, shareText}, say(html)}
async function exportThemedCard(action, forcedTheme, spec){
  const theme = forcedTheme || await askStandingsCardTheme(action, spec.subject);
  if(!theme) return false;
  setStandingsCardTheme(theme);
  try{
    const r = await spec.build(theme);
    if(action === 'share'){
      const shared = await tryShareCanvas(r.cv, r.filename, r.shareTitle, r.shareText);
      if(shared){ spec.say('<div class="status-msg ok">تم فتح المشاركة</div>'); return true; }
      downloadCanvasPNG(r.cv, r.filename);
      spec.say('<div class="status-msg ok">جهازك لا يدعم المشاركة المباشرة، فتم تحميل الصورة. أرسلها في المجموعة.</div>');
      return true;
    }
    downloadCanvasPNG(r.cv, r.filename);
    spec.say(`<div class="status-msg ok">تم تحميل صورة ${spec.subject}. أرسلها في المجموعة.</div>`);
    return true;
  }catch(e){
    if(e && e.name === 'CardDataError') spec.say(`<div class="status-msg err">تعذّر تجهيز صورة ${spec.subject}: ${e.problems.join('، ')}.</div>`);
    else spec.say('<div class="status-msg err">تعذّر تجهيز الصورة، حاول مرة أخرى.</div>');
    return false;
  }
}

async function showSeasonWrapCard(){
  const box = document.getElementById('copyBox');
  if(!box) return;
  box.innerHTML = '<p class="status-msg">جارٍ تجهيز ملخص الموسم…</p>';
  try{
    const cv = await buildSeasonWrapCardCanvas({theme: getStandingsCardTheme()});
    box.innerHTML = '';
    cv.id = 'seasonWrapCanvas';
    box.appendChild(cv);
    const acts = document.createElement('div');
    acts.className = 'champ-actions';
    acts.innerHTML = `
      <button class="btn" id="shareWrapBtn">${ICONS.share} مشاركة الملخص</button>
      <button class="btn secondary" id="dlWrapBtn">${ICONS.download} تحميل الصورة</button>
      <button class="btn ghost" id="closeWrapBtn">إغلاق</button>`;
    box.appendChild(acts);
    const msg = document.createElement('div'); msg.className = 'wrap-msg'; box.appendChild(msg);
    const spec = {
      subject: 'ملخص الموسم',
      say: html => { msg.innerHTML = html; },
      build: async theme => {
        const data = getSeasonWrapCardData();
        const c = await buildSeasonWrapCardCanvas({theme, data});
        return {cv: c, filename: seasonWrapFilename(data.round, theme), shareTitle: 'ملخص الموسم', shareText: `ملخص دوري بروكي الفانتازي حتى الجولة ${data.round}`};
      }
    };
    document.getElementById('dlWrapBtn').onclick = () => exportThemedCard('download', null, spec);
    document.getElementById('shareWrapBtn').onclick = () => exportThemedCard('share', null, spec);
    document.getElementById('closeWrapBtn').onclick = () => { box.innerHTML = ''; };
  }catch(e){
    if(e && e.name === 'CardDataError') box.innerHTML = `<div class="status-msg err">تعذّر تجهيز ملخص الموسم: ${e.problems.join('، ')}.</div>`;
    else box.innerHTML = '<div class="status-msg err">تعذّر تجهيز الملخص، حاول مرة أخرى.</div>';
  }
}

// زر "تحميل الملف كصورة" بالملف الشخصي: يسأل عن الوضع ثم يشارك أو ينزّل
function exportProfileCard(pid){
  const msgBox = document.getElementById(`profileMsg-${pid}`);
  return exportThemedCard('download', null, {
    subject: 'الملف الشخصي',
    say: html => { if(msgBox) msgBox.innerHTML = html; },
    build: async theme => {
      const data = getProfileCardData(pid);
      const c = await buildParticipantProfileCardCanvas(pid, {theme, data});
      return {cv: c, filename: profileCardFilename(pid, theme), shareTitle: 'الملف الشخصي', shareText: 'تعرّف على ملفي في دوري بروكي الفانتازي'};
    }
  });
}
