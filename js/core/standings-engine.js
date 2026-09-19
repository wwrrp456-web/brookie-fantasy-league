/* منطق حساب الترتيب والحركة وفواصل التعادل (بدون أي تعامل مع DOM) */

const RESULT_POINTS = {win:3, draw:1, loss:0, no_match:0};
const RESULT_LABEL = {win:'فوز', draw:'تعادل', loss:'خسارة', no_match:'لا توجد مباراة'};
function getCurrentRoundNumber(){
  return DATA.rounds.length ? DATA.rounds[DATA.rounds.length-1].number : CURRENT_BASE_ROUND;
}

// يحسب نقاط/أهداف الجولة 2 الكاملة لمشارك من ROUND2_MATCHES مباشرة (مستقلة
// عن ROUND2_GOALS، ومطابقة لها تمامًا في نتائجها — تحقّقنا آليًا)
function computeRound2ForParticipant(p){
  let points=0, gf=0, ga=0;
  const clubs = p.teams.map(t=>{
    const matches = ROUND2_MATCHES[t] || [];
    let cPts=0, cGf=0, cGa=0;
    matches.forEach(m=>{ cPts += RESULT_POINTS[m.res]||0; cGf += m.gf; cGa += m.ga; });
    points += cPts; gf += cGf; ga += cGa;
    return {name:t, matches, points:cPts, gf:cGf, ga:cGa};
  });
  return {points, gf, ga, clubs};
}

// ---------- Computation ----------
function computeRoundStats(round){
  // returns {pid: {points, gf, ga}}
  const stats = {};
  PARTICIPANTS.forEach(p=>{
    const entries = (round.entries && round.entries[p.id]) || [];
    let points=0, gf=0, ga=0;
    entries.forEach(e=>{
      points += RESULT_POINTS[e.result] || 0;
      gf += Number(e.gf)||0;
      ga += Number(e.ga)||0;
    });
    stats[p.id] = {points, gf, ga};
  });
  return stats;
}

// مشارك "لسه ما دخل فعليًا الموسم" — انضم بعد جولات حقيقية فعلية (لا فقط بعد
// فترة الجسر 1-2) ولم تُكمَل بعد الجولة اللي يبدأ منها. يُستخدم لإخفائه
// بالكامل من كل قوائم/جداول الترتيب والإحصائيات والميداليات والألقاب حتى
// تبدأ جولته الأولى فعليًا، حتى لا يؤثر رصيده الافتتاحي على أرقام مراكز بقية
// المشاركين أو نتائجهم بالجولات اللي لم يشارك فيها (طلب المستخدم صراحة عند
// إضافة لطفي (id:20) — 19 سبتمبر 2026؛ راجع ملف التسليم القسم 9.57).
// ملاحظة: لا يؤثر هذا على أبو صالح/محمد عثمان (كلاهما تجاوز جولته الأولى
// فعليًا منذ زمن)، فيبقيان ظاهرين بلا أي تغيير.
function isParticipantActiveNow(pid){
  return getCurrentRoundNumber() > (JOINED_AFTER_ROUND[pid]||0);
}

// يحسب الترتيب حتى جولة معيّنة (upTo = عدد الجولات المحتسبة، افتراضياً الكل)
function computeStandings(upTo){
  const limit = (upTo === undefined) ? DATA.rounds.length : upTo;
  const usedRounds = DATA.rounds.slice(0, limit);

  const totals = {};
  PARTICIPANTS.forEach(p=> totals[p.id] = {points:0, mummaCount:0, streak:0, bestStreak:0});

  const roundStatsList = usedRounds.map(r=>computeRoundStats(r));

  usedRounds.forEach((r, idx)=>{
    const stats = roundStatsList[idx];
    PARTICIPANTS.forEach(p=>{
      totals[p.id].points += stats[p.id].points;
      if(round_has_entries(r,p.id) && stats[p.id].points===0){
        totals[p.id].mummaCount++;
        totals[p.id].streak = 0;
      } else if(round_has_entries(r,p.id)){
        totals[p.id].streak++;
        if(totals[p.id].streak > totals[p.id].bestStreak) totals[p.id].bestStreak = totals[p.id].streak;
      }
    });
  });

  const lastStats = roundStatsList.length ? roundStatsList[roundStatsList.length-1] : null;

  // فترة "جسر" الجولة 2: هذا الاستدعاء تحديدًا لا يحتسب أي جولات حقيقية (limit===0)،
  // فـ lastStats فاضية دايمًا وكل التعادلات كانت تسقط مباشرة للاسم الأبجدي (خطأ). هنا
  // نستخدم نقاط الجولة الحالية (getCurrentRoundPointsMap) وأهدافها (ROUND2_GOALS) بدلها،
  // بنفس منطق كسر التعادل المطبّق على بطل الجولة وحركة المراكز.
  // ملاحظة مهمة: الشرط لازم يعتمد على limit (معامل هذا الاستدعاء تحديدًا)، وليس على
  // DATA.rounds.length (الحالة العامة) — لأن getAllMovementsHistory() يستدعي
  // getRankMap(0) دائمًا (حتى بعد دخول جولات 3/4/5...) لحساب "جسر الجولة 2" التاريخي،
  // وربط bridge بالحالة العامة كان يفقد بيانات ROUND2_GOALS فور دخول أول جولة حقيقية
  // (خطأ اكتُشف وأُصلح 3 سبتمبر 2026 قبل دخول الجولة 3 مباشرة).
  const bridge = limit === 0;
  const currentRoundPoints = bridge ? getRound2BridgePointsMap() : null;

  const list = PARTICIPANTS.map(p=>{
    let lastRound;
    if(lastStats){
      lastRound = lastStats[p.id];
    } else if(bridge){
      const g = ROUND2_GOALS[p.id] || {gf:0, ga:0};
      lastRound = {points: currentRoundPoints[p.id] || 0, gf: g.gf, ga: g.ga};
    } else {
      lastRound = {points:0, gf:0, ga:0};
    }
    return {
      id:p.id, name:p.name, teams:p.teams,
      carry: p.carry || 0,
      newPoints: totals[p.id].points,
      total: (p.carry || 0) + totals[p.id].points,
      mummaCount: totals[p.id].mummaCount,
      streak: totals[p.id].streak,
      bestStreak: totals[p.id].bestStreak,
      lastPoints: lastRound.points,
      lastGf: lastRound.gf,
      lastGa: lastRound.ga,
      manualPriority: (DATA.manualPriority && DATA.manualPriority[p.id]) || 0
    };
  });

  // ترتيب كسر التعادل يطابق حرفيًا بند 4 من اللائحة: (أ) الأكثر حصادًا للنقاط
  // في الجولة، ثم (ب) من وصل للنقاط أولًا (manualPriority، يحدده المنظم يدويًا
  // لغياب توقيت آلي للمباريات)، ثم (ج) الأكثر أهدافًا، ثم (د) الأقل استقبالًا
  // للأهداف. كان manualPriority (ب) بالغلط يُفحص بعد ج ود بدل قبلهما مباشرة
  // (صُحّح 10 سبتمبر 2026).
  const eligibleList = list.filter(s=> isParticipantActiveNow(s.id));
  eligibleList.sort((a,b)=>{
    if(b.total !== a.total) return b.total - a.total;
    if(b.lastPoints !== a.lastPoints) return b.lastPoints - a.lastPoints;
    if(a.manualPriority !== b.manualPriority) return a.manualPriority - b.manualPriority;
    if(b.lastGf !== a.lastGf) return b.lastGf - a.lastGf;
    if(a.lastGa !== b.lastGa) return a.lastGa - b.lastGa;
    return a.name.localeCompare(b.name,'ar');
  });
  return eligibleList;
}

// "لعب فعليًا هذه الجولة" — يستثني تسجيلات "لا توجد مباراة" (no_match) من
// الاحتساب، حتى لا يُعامَل مشارك ناديه (أو كل أنديته) بلا مباراة هذه الجولة
// كأنه لعب وسجّل صفر نقطة (ممة وهمية) أو يُكسر سلسلته بلا سبب حقيقي (طلب
// المستخدم 16 سبتمبر 2026 — خيار "لا توجد مباراة هذه الجولة" بنموذج الجولة).
function round_has_entries(round, pid){
  const es = round.entries && round.entries[pid];
  if(!es || !es.length) return false;
  return es.some(e=> e && e.result !== 'no_match');
}


// ---------- حركة المراكز ----------
function getRankMap(upTo){
  const list = computeStandings(upTo);
  const m = {};
  list.forEach((s,i)=> m[s.id] = i+1);
  return m;
}

// ترتيب الجولة 1 (25 أغسطس) من ROUND1_POINTS — لمقارنته بالترتيب الحالي
// ونحسب منه حركة المركز طالما لسه ما دخلنا جولات حقيقية في DATA.rounds
function getRound1RankMap(){
  const list = PARTICIPANTS.map(p=>({id:p.id, name:p.name, points: ROUND1_POINTS[p.id]||0}));
  list.sort((a,b)=>{
    if(b.points !== a.points) return b.points - a.points;
    return a.name.localeCompare(b.name,'ar');
  });
  const m = {};
  list.forEach((s,i)=> m[s.id] = i+1);
  return m;
}

function getMovements(){
  if(DATA.rounds.length < 1){
    // الجولة 2 (الأساس): حركة المركز = ترتيب الجولة 1 مقابل الترتيب الحالي (carry)
    const now = getRankMap(0);
    const before = getRound1RankMap();
    const mv = {};
    PARTICIPANTS.forEach(p=>{
      // JOINED_AFTER_ROUND2 (محمد عثمان): لا يملك ترتيبًا حقيقيًا بالجولة 1
      // ليُقارَن بترتيبه الحالي — أي فرق هنا وهمي بالكامل (يقارن رتبة افتراضية
      // بصفر نقطة برتبته الفعلية المبنية على رصيده الافتتاحي الحقيقي)، فسهمه
      // يبقى محايدًا (بلا حركة) لحين دخول أول جولة حقيقية فعلية له (7 سبتمبر 2026).
      mv[p.id] = JOINED_AFTER_ROUND2[p.id] ? 0 : (before[p.id] || 0) - (now[p.id] || 0); // موجب = صعود
    });
    return mv;
  }
  const now = getRankMap(DATA.rounds.length);
  const before = getRankMap(DATA.rounds.length - 1);
  const mv = {};
  PARTICIPANTS.forEach(p=>{
    mv[p.id] = (before[p.id] || 0) - (now[p.id] || 0); // موجب = صعود
  });
  return mv;
}

// ---------- أبطال الجولة ----------
// نقاط "الجولة الحالية" لكل متسابق: إذا فيه جولات حقيقية مُدخلة (3 فصاعدًا)
// تُؤخذ من آخر جولة عبر computeRoundStats كالمعتاد؛ وإلا (ولسه على الجولة 2
// الأساس) تُحسب من الفرق carry − ROUND1_POINTS، بنفس منطق جدول تفاصيل المتسابق.
function getCurrentRoundPointsMap(){
  const map = {};
  if(DATA.rounds.length > 0){
    const last = DATA.rounds[DATA.rounds.length-1];
    const stats = computeRoundStats(last);
    PARTICIPANTS.forEach(p=> map[p.id] = stats[p.id].points);
  } else {
    // JOINED_AFTER_ROUND2 (محمد عثمان): لم يكن ضمن المسابقة إطلاقًا خلال جسر
    // الجولة 2، فرصيده الافتتاحي الكامل ليس "نقاط جولة حالية" حقيقية — 0 هنا
    // هو الصحيح (لم يلعب أي جولة فانتازي فعلية بعد)، وإلا كان سيُتوَّج بالغلط
    // "بطل الجولة" حاليًا بمجرد انضمامه (خطأ اكتُشف ومنع 7 سبتمبر 2026).
    PARTICIPANTS.forEach(p=> map[p.id] = JOINED_AFTER_ROUND2[p.id] ? 0 : (p.carry||0) - (ROUND1_POINTS[p.id]||0));
  }
  return map;
}

// نقاط "جسر" الجولة 2 حصرًا (carry − ROUND1_POINTS) — بدون أي شرط على DATA.rounds.length.
// يُستخدم فقط لحساب لقطة الترتيب التاريخية "قبل أي جولة حقيقية" (bridge داخل
// computeStandings عند limit===0). getCurrentRoundPointsMap لا يصلح هنا لأنه يتحول
// لاستخدام آخر جولة حقيقية بمجرد دخولها — وهو صحيح لاستخداماته الأخرى (نقاط الجولة
// الجارية)، لكنه كان يُفقد بيانات جسر الجولة 2 تحديدًا في هذه اللقطة التاريخية فور
// دخول الجولة 3 (خطأ ثانٍ مرتبط، اكتُشف وأُصلح 3 سبتمبر 2026 أثناء اختبار الإصلاح الأول).
function getRound2BridgePointsMap(){
  const map = {};
  // نفس استثناء JOINED_AFTER_ROUND2 أعلاه — يمنع دخول رصيد محمد عثمان الافتتاحي
  // ضمن أرشيف "بطل الجولة 2" التاريخي أو "أفضل أداء بجولة واحدة" بملخص الموسم
  // (7 سبتمبر 2026).
  PARTICIPANTS.forEach(p=> map[p.id] = JOINED_AFTER_ROUND2[p.id] ? 0 : (p.carry||0) - (ROUND1_POINTS[p.id]||0));
  return map;
}

// ---------- طبقة بيانات موحّدة: تاريخ كل مشارك جولة بجولة ----------
// تجمع الجولة 1 (ROUND1_POINTS، بلا أهداف مفصّلة) + الجولة 2 (جسر
// computeRound2ForParticipter بأهدافها الحقيقية) + أي جولات حقيقية أُدخلت
// لاحقًا من تبويب المنظم (DATA.rounds) — في مصفوفة زمنية واحدة لكل مشارك.
// أساس ميزتي "أوسمة الموسم" و"الأرقام القياسية"، وتتحدّث تلقائيًا مع كل
// جولة جديدة يُدخلها المنظم دون أي تعديل إضافي على هذه الدالة.
function getAllRoundsHistory(pid){
  const p = PARTICIPANTS.find(x=>x.id===pid);
  if(!p) return [];
  const rounds = [];
  // أبو صالح (JOINED_AFTER_ROUND1) لم يشارك في الجولة 1 فعليًا — يُستثنى
  // كي لا تُحتسب له "ممة" وهمية لجولة لم يلعبها أصلاً.
  if(!JOINED_AFTER_ROUND1[pid]){
    rounds.push({round:1, points: ROUND1_POINTS[pid]||0, gf:null, ga:null});
  }
  // محمد عثمان (JOINED_AFTER_ROUND2) لم يشارك في الجولة 2 فعليًا هو الآخر —
  // يُستثنى بنفس منطق استثناء الجولة 1 أعلاه، وإلا احتُسبت له "ممة" وهمية أو
  // رقم قياسي لجولة لم يلعبها أصلاً (7 سبتمبر 2026).
  if(!JOINED_AFTER_ROUND2[pid]){
    const r2 = computeRound2ForParticipant(p);
    rounds.push({round:2, points:r2.points, gf:r2.gf, ga:r2.ga});
  }
  DATA.rounds.forEach(r=>{
    if(!round_has_entries(r, pid)) return;
    const stats = computeRoundStats(r)[pid];
    rounds.push({round:r.number, points:stats.points, gf:stats.gf, ga:stats.ga});
  });
  return rounds;
}

function getAllParticipantsRoundsHistory(){
  const map = {};
  PARTICIPANTS.forEach(p=> map[p.id] = getAllRoundsHistory(p.id));
  return map;
}

// ---------- الأرقام القياسية ----------
// كل انتقال معروف بين ترتيبَين متتاليين عبر تاريخ الموسم (الجسر ثم كل جولة
// حقيقية أُدخلت لاحقًا) — نفس منطق getMovements() لكن يُبقي على كامل
// السجل بدل آخر انتقال فقط، ليُستخدم في اكتشاف أكبر صعود/هبوط تاريخي.
function getAllMovementsHistory(){
  const result = [];
  const r1 = getRound1RankMap();
  const rBridge = getRankMap(0);
  PARTICIPANTS.forEach(p=>{
    // نفس استثناء JOINED_AFTER_ROUND2 بـgetMovements() — يمنع دخول فرق مركز
    // وهمي لمحمد عثمان ضمن أرشيف الحركة (يُستخدم لأرقام قياسية كـ"أكبر صعود
    // بجولة واحدة" — كان سيُدرجه بالغلط بسبب مقارنة رتبة لم يملكها أصلاً).
    if(JOINED_AFTER_ROUND2[p.id]) return;
    result.push({round:2, pid:p.id, name:p.name, delta:(r1[p.id]||0)-(rBridge[p.id]||0)});
  });
  for(let i=1;i<=DATA.rounds.length;i++){
    const before = getRankMap(i-1);
    const now = getRankMap(i);
    const roundNum = DATA.rounds[i-1].number;
    PARTICIPANTS.forEach(p=>{
      // مشارك لم يكن قد انضمّ بعد وقت هذه الجولة (مثل لطفي بالجولتين 3 و4)
      // يُستبعد من أرشيف الحركة — رصيده الثابت (carry) يبقى بنفس المرتبة تقريبًا
      // بكل اللقطات قبل انضمامه، فأي فرق مرتبة هنا وهمي بالكامل (ناتج فقط عن
      // حركة بقية المشاركين حوله)، بنفس منطق استثناء JOINED_AFTER_ROUND2
      // بجسر الجولة 2 أعلاه (خطأ اكتُشف ومُنع وقت إضافة لطفي، 18 سبتمبر 2026).
      if(roundNum <= (JOINED_AFTER_ROUND[p.id]||0)) return;
      result.push({round:roundNum, pid:p.id, name:p.name, delta:(before[p.id]||0)-(now[p.id]||0)});
    });
  }
  return result;
}

// بطل جولة معيّنة (2 فصاعدًا) — تُستخدم لتصحيح التوقعات القديمة تلقائيًا
// بمجرد أن يصير رقم الجولة معروف النتيجة (سواء الجسر أو جولة حقيقية أدخلها
// المنظم). ترجع null لجولة لسه ما اتلعبت (قادمة).
// ملاحظة: الجولتان 1 و2 لا تملكان إدخالًا حقيقيًا أبدًا في DATA.rounds (الأولى
// من ROUND1_POINTS، والثانية "جسر" من carry−ROUND1_POINTS) — لذلك لازم تُحسما
// هنا بنفس منطق getRoundChampionsArchive() تمامًا، بدل الاعتماد على حالة
// "الجولة الحالية" (DATA.rounds.length) اللي كانت تخليهما يرجعان null للأبد
// بمجرد دخول الجولة 3 (خطأ اكتُشف بتدقيق شامل، أثّر على دقة توقعات الجولتين
// 1 و2). وبكل الحالات لازم تُحترَم ROUND_HERO_OVERRIDE إن وُجدت.
function getRoundChampion(roundNumber){
  if(roundNumber === 1){
    if(ROUND_HERO_OVERRIDE[1]) return ROUND_HERO_OVERRIDE[1];
    let maxR1 = -Infinity;
    PARTICIPANTS.forEach(p=>{
      if(JOINED_AFTER_ROUND1[p.id]) return;
      const pts = ROUND1_POINTS[p.id] || 0;
      if(pts > maxR1) maxR1 = pts;
    });
    if(maxR1 === -Infinity) return null;
    const tied = PARTICIPANTS.filter(p=> !JOINED_AFTER_ROUND1[p.id] && (ROUND1_POINTS[p.id]||0) === maxR1);
    if(!tied.length) return null;
    const sorted = tied.slice().sort((a,b)=>a.name.localeCompare(b.name,'ar'));
    return sorted[0].id;
  }
  if(roundNumber === 2){
    if(ROUND_HERO_OVERRIDE[2]) return ROUND_HERO_OVERRIDE[2];
    const bridgePoints = getRound2BridgePointsMap();
    let maxBridge = -Infinity;
    PARTICIPANTS.forEach(p=>{ if(bridgePoints[p.id] > maxBridge) maxBridge = bridgePoints[p.id]; });
    const tied = PARTICIPANTS.filter(p=>bridgePoints[p.id]===maxBridge);
    if(!tied.length) return null;
    const sorted = tied.slice().sort((a,b)=>a.name.localeCompare(b.name,'ar'));
    return sorted[0].id;
  }
  const round = DATA.rounds.find(r=>r.number===roundNumber);
  if(!round) return null;
  if(ROUND_HERO_OVERRIDE[roundNumber]) return ROUND_HERO_OVERRIDE[roundNumber];
  const stats = computeRoundStats(round);
  // مشارك انضمّ بعد هذه الجولة تحديدًا (JOINED_AFTER_ROUND، مثل لطفي المستثنى
  // من الجولتين الحقيقيتين 3 و4) يُستبعد تمامًا من ترشّح بطولة الجولة، لا
  // يكفي الاعتماد على stats[p.id].points===0 وحده (لو صادف كل المشاركين
  // الفعليين تسجيل صفر بجولة ما لأي سبب، خطأ اكتُشف ومُنع وقت إضافة لطفي).
  const eligible = PARTICIPANTS.filter(p=> roundNumber > (JOINED_AFTER_ROUND[p.id]||0));
  let maxPts = -Infinity;
  eligible.forEach(p=>{ if(stats[p.id].points > maxPts) maxPts = stats[p.id].points; });
  const tied = eligible.filter(p=> stats[p.id].points === maxPts);
  if(tied.length === 1) return tied[0].id;
  const sorted = tied.slice().sort((a,b)=>{
    const ga_ = computeRoundGoals(round, a.id), gb_ = computeRoundGoals(round, b.id);
    if(gb_.gf !== ga_.gf) return gb_.gf - ga_.gf;
    if(ga_.ga !== gb_.ga) return ga_.ga - gb_.ga;
    return a.name.localeCompare(b.name,'ar');
  });
  return sorted[0].id;
}

// ---------- أرشيف أبطال الجولات ----------
// يعيد قائمة {round, champions:[أسماء], points} من الأحدث للأقدم. الجولة 2
// (فترة الجسر) تُحسب دائمًا من ROUND2 الثابتة بمعزل عن أي جولات لاحقة —
// حتى تبقى صحيحة تاريخيًا مهما دخلت جولات جديدة (نفس مبدأ إصلاح 9.9).
// الجولات 3 فصاعدًا تُحسب من بياناتها الفعلية مع كسر تعادل بالأهداف، وتجمع
// كل الأسماء المتعادلة فعليًا بدل اختيار واحد بالغلط (نفس نمط إصلاح الأوسمة).
function getRoundChampionsArchive(){
  const archive = [];

  // الجولة 1: نقاط فقط من ROUND1_POINTS — لا تتوفر تفاصيل مباريات/أهداف لكسر
  // تعادل حقيقي (نفس القيد الموثَّق بملف التسليم، القسم 7). بعد تصحيح
  // سلتيك/رينجرز (10 سبتمبر 2026) صار ثلاثة متعادلين تمامًا على القمة، فحُسم
  // بطل الجولة الأولى عبر ROUND_HERO_OVERRIDE[1] (اختيار المنظم المباشر).
  // بدون Override كانت ستُدرَج كل الأسماء المتعادلة كأبطال مشتركين.
  // JOINED_AFTER_ROUND1 يُستثنى (لم يكونوا بالمسابقة أصلًا بالجولة 1).
  let maxR1 = -Infinity;
  PARTICIPANTS.forEach(p=>{
    if(JOINED_AFTER_ROUND1[p.id]) return;
    const pts = ROUND1_POINTS[p.id] || 0;
    if(pts > maxR1) maxR1 = pts;
  });
  let r1Names;
  if(ROUND_HERO_OVERRIDE[1]){
    const w = PARTICIPANTS.find(p=>p.id===ROUND_HERO_OVERRIDE[1]);
    r1Names = w ? [w.name] : [];
  } else {
    r1Names = maxR1 === -Infinity ? [] : PARTICIPANTS
      .filter(p=> !JOINED_AFTER_ROUND1[p.id] && (ROUND1_POINTS[p.id]||0) === maxR1)
      .map(p=>p.name);
  }
  archive.push({round:1, champions:r1Names, points: maxR1 === -Infinity ? 0 : maxR1});

  const bridgePoints = getRound2BridgePointsMap();
  let maxBridge = -Infinity;
  PARTICIPANTS.forEach(p=>{ if(bridgePoints[p.id] > maxBridge) maxBridge = bridgePoints[p.id]; });
  let bridgeNames;
  if(ROUND_HERO_OVERRIDE[2]){
    const w = PARTICIPANTS.find(p=>p.id===ROUND_HERO_OVERRIDE[2]);
    bridgeNames = w ? [w.name] : [];
  } else {
    bridgeNames = PARTICIPANTS.filter(p=>bridgePoints[p.id]===maxBridge).map(p=>p.name);
  }
  archive.push({round:2, champions:bridgeNames, points:maxBridge});

  DATA.rounds.forEach(round=>{
    const stats = computeRoundStats(round);
    // نفس استثناء JOINED_AFTER_ROUND بـgetRoundChampion() أعلاه — مشارك انضمّ
    // بعد هذه الجولة (مثل لطفي بالجولتين 3 و4) لا يظهر بأرشيف أبطال الجولات.
    const eligible = PARTICIPANTS.filter(p=> round.number > (JOINED_AFTER_ROUND[p.id]||0));
    let maxPts = -Infinity;
    eligible.forEach(p=>{ if(stats[p.id].points > maxPts) maxPts = stats[p.id].points; });
    const tied = eligible.filter(p=>stats[p.id].points===maxPts);
    let champNames;
    if(ROUND_HERO_OVERRIDE[round.number]){
      const w = PARTICIPANTS.find(p=>p.id===ROUND_HERO_OVERRIDE[round.number]);
      champNames = w ? [w.name] : [];
    } else if(tied.length <= 1){
      champNames = tied.length ? [tied[0].name] : [];
    } else {
      let bestGf = -Infinity, bestGa = Infinity;
      tied.forEach(p=>{
        const g = computeRoundGoals(round, p.id);
        if(g.gf > bestGf || (g.gf===bestGf && g.ga < bestGa)){ bestGf = g.gf; bestGa = g.ga; }
      });
      champNames = tied.filter(p=>{
        const g = computeRoundGoals(round, p.id);
        return g.gf === bestGf && g.ga === bestGa;
      }).map(p=>p.name);
      if(!champNames.length) champNames = [tied[0].name];
    }
    archive.push({round:round.number, champions:champNames, points:maxPts});
  });

  return archive.sort((a,b)=>b.round-a.round);
}
