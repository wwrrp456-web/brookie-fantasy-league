/* لوحة الشرف، الأوسمة، الميداليات، سباق الهروب من القاع، المواجهات، بصمة الموسم */

// ==========================================================================
// ---------- ميزات تطوير التنافس بين المتسابقين (4 سبتمبر 2026) ----------
// أربع ميزات جديدة بطلب المستخدم لزيادة الإثارة والمنافسة بين المتسابقين
// أنفسهم (بمعزل عن ميزات "تسهيل الاستخدام" السابقة): تحدي مواجهة أسبوعي
// عشوائي، سباق هروب من القاع، ألقاب لكل جولة، ولوحة أدق المتوقعين.
// كلها للعرض فقط (لا تكتب أي بيانات) ولا تؤثر إطلاقًا على الترتيب الرسمي.
// ==========================================================================

// مولّد أرقام عشوائية بذرة ثابتة (mulberry32) — نفس البذرة تنتج نفس الترتيب
// دائمًا، فكل الزوار يشوفون نفس مواجهات الجولة بدون أي حاجة لتخزينها.
function seededShuffle(arr, seed){
  let s = seed >>> 0;
  function rand(){
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const a = arr.slice();
  for(let i=a.length-1; i>0; i--){
    const j = Math.floor(rand()*(i+1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

// ---------- 1) تحدي مواجهة أسبوعي عشوائي ----------
// بذرة الخلط = رقم الجولة الحالية، فتتغيّر المواجهات تلقائيًا كل جولة جديدة
// وتبقى ثابتة للجميع طوال نفس الجولة. الفائز = نقاط أكثر هذي الجولة فقط —
// مجرد فخر إضافي، بدون أي تأثير على الترتيب العام أو النقاط الرسمية.
function computeWeeklyDuels(){
  const roundNum = getCurrentRoundNumber();
  const seed = (roundNum * 2654435761) >>> 0;
  const shuffled = seededShuffle(PARTICIPANTS, seed);
  const pointsMap = getCurrentRoundPointsMap();
  const duels = [];
  let i = 0;
  for(; i+1 < shuffled.length; i += 2){
    const a = shuffled[i], b = shuffled[i+1];
    const ap = pointsMap[a.id]||0, bp = pointsMap[b.id]||0;
    let winner = null;
    if(ap > bp) winner = a.id; else if(bp > ap) winner = b.id;
    duels.push({a, b, ap, bp, winner});
  }
  if(i < shuffled.length){
    duels.push({bye: shuffled[i]});
  }
  return duels;
}

function renderWeeklyDuels(){
  const box = document.getElementById('weeklyDuelsBox');
  if(!box) return;
  if(DATA.duelsEnabled === false){
    box.innerHTML = '';
    return;
  }
  const duels = computeWeeklyDuels();
  const roundNum = getCurrentRoundNumber();
  let html = `<h2 class="section-title" style="margin-top:22px;">⚔️ تحدي مواجهة الجولة ${roundNum}</h2>`;
  html += `<p class="rounds-subtitle" style="margin-top:0;">مواجهات عشوائية بين المتسابقين هذه الجولة — فوز إضافي وفخر بس، بلا أي تأثير على الترتيب العام 😎</p>`;
  html += '<div class="duels-grid">';
  duels.forEach(d=>{
    if(d.bye){
      html += `<div class="duel-card duel-bye"><div class="duel-bye-text">🛌 ${d.bye.name} بدون خصم هذه الجولة</div></div>`;
      return;
    }
    const aWin = d.winner === d.a.id, bWin = d.winner === d.b.id;
    html += `<div class="duel-card">
      <div class="duel-side ${aWin?'duel-win':''}"><span class="duel-name">${aWin?'🏅 ':''}${d.a.name}</span><span class="duel-pts">${d.ap}</span></div>
      <div class="duel-vs">VS</div>
      <div class="duel-side ${bWin?'duel-win':''}"><span class="duel-name">${bWin?'🏅 ':''}${d.b.name}</span><span class="duel-pts">${d.bp}</span></div>
      ${(!aWin && !bWin) ? '<div class="duel-draw">تعادل</div>' : ''}
    </div>`;
  });
  html += '</div>';
  box.innerHTML = html;
}

// ---------- 2) سباق الهروب من القاع ----------
// ترتيب فرعي لآخر 3 بالترتيب العام — منافسة جانبية على الهروب من منطقة
// الخطر، تتحدّث تلقائيًا مع أي تغيّر بالترتيب العام (بدون أي حساب إضافي).
function renderBottomRace(){
  const box = document.getElementById('bottomRaceBox');
  if(!box) return;
  const standings = computeStandings();
  const n = Math.min(3, standings.length);
  if(n < 2){ box.innerHTML=''; return; }
  const bottom = standings.slice(-n).slice().sort((a,b)=> b.total - a.total);
  let html = `<h2 class="section-title" style="margin-top:22px;">🔥 سباق الهروب من القاع</h2>`;
  html += `<p class="rounds-subtitle" style="margin-top:0;">آخر ${n} بالترتيب العام — مين بيفلت أول من منطقة الخطر؟</p>`;
  html += '<div class="bottom-race-list">';
  bottom.forEach((s,i)=>{
    const gap = bottom[0].total - s.total;
    html += `<div class="bottom-race-row">
      <span class="bottom-race-rank">${i+1}</span>
      <span class="bottom-race-name">${s.name}</span>
      <span class="bottom-race-pts">${s.total} نقطة</span>
      <span class="bottom-race-gap ${i===0?'bottom-race-lead':''}">${i===0 ? '🔻 الأقرب للنجاة' : `-${gap} عن الأقرب للنجاة`}</span>
    </div>`;
  });
  html += '</div>';
  box.innerHTML = html;
}

function renderBadges(){
  const box = document.getElementById('badgesBox');
  if(!box) return;
  const badges = [...computeBadges(), ...computeExtendedBadges()];
  if(!badges.length){ box.innerHTML=''; return; }
  let html = '<h2 class="section-title" style="margin-top:22px;">🏅 أوسمة الموسم</h2>';
  html += '<div class="badges-grid">';
  badges.forEach(b=>{
    html += `<div class="badge-card">
      <div class="badge-icon">${b.icon}</div>
      <div class="badge-title">${b.title}</div>
      <div class="badge-names">${b.names}</div>
      <div class="badge-detail">${b.detail}</div>
    </div>`;
  });
  html += '</div>';
  box.innerHTML = html;
}

// =====================================================================
// ===== 9.47 — الميزات الجديدة: لوحة الشرف، شريط التقدم، ماذا أحتاج؟،
//              جولات أبرز، صفحة عن الدوري، ملخص التحديث، بانر الجولة الجديدة
// =====================================================================

// ---------- لوحة الشرف النهائية ----------
function renderHonorBoard(){
  const box = document.getElementById('honorBoardBox');
  if(!box) return;
  const st = computeStandings();
  if(!st.length){ box.innerHTML=''; return; }
  const histMap = getAllParticipantsRoundsHistory();

  // أعلى نقطة في جولة واحدة
  let bestSingle = {name:'', pts:0};
  PARTICIPANTS.forEach(p=>{
    const rounds = histMap[p.id] || [];
    rounds.forEach(r=>{
      if(r.points > bestSingle.pts) bestSingle = {name:p.name, pts:r.points, round:r.round};
    });
  });

  // أكثر ثباتاً (أقل انحراف معياري — فقط لمن لديه 3 جولات أو أكثر)
  let mostStable = {name:'', std:Infinity};
  PARTICIPANTS.forEach(p=>{
    const rounds = histMap[p.id] || [];
    if(rounds.length < 3) return;
    const pts = rounds.map(r=>r.points);
    const avg = pts.reduce((a,b)=>a+b,0)/pts.length;
    const std = Math.sqrt(pts.reduce((a,b)=>a+(b-avg)**2,0)/pts.length);
    if(std < mostStable.std) mostStable = {name:p.name, std: Math.round(std*10)/10};
  });

  // أقل ممات
  let leastMumma = {name:'', mumma:Infinity};
  st.forEach(s=>{ if(s.mummaCount < leastMumma.mumma) leastMumma = {name:s.name, mumma:s.mummaCount}; });

  // أطول سلسلة
  let longestStreak = {name:'', streak:0};
  st.forEach(s=>{ if(s.bestStreak > longestStreak.streak) longestStreak = {name:s.name, streak:s.bestStreak}; });

  // أعلى نقاط إجمالية (متصدر الآن)
  const leader = st[0];

  const cards = [
    {emoji:'👑', label:'متصدر الترتيب', name:leader.name, val:`${leader.total} نقطة`},
    {emoji:'⚡', label:'أعلى نقطة جولة واحدة', name:bestSingle.name||'—', val:bestSingle.pts ? `${bestSingle.pts} ن. (ج${bestSingle.round})` : '—'},
    {emoji:'💀', label:'أقل ممات', name:leastMumma.name||'—', val:`${leastMumma.mumma===Infinity?'—':leastMumma.mumma} ممة`},
    {emoji:'🔥', label:'أطول سلسلة', name:longestStreak.streak>0?longestStreak.name:'—', val:longestStreak.streak>0?`${longestStreak.streak} جولات متتالية`:'—'},
    {emoji:'🎯', label:'الأكثر ثباتاً', name:mostStable.std===Infinity?'—':mostStable.name, val:mostStable.std===Infinity?'—':`انحراف ±${mostStable.std}`},
  ];

  box.innerHTML = `
    <div class="honor-board">
      <div class="honor-board-title">🎖️ لوحة الشرف</div>
      <div class="honor-cards">
        ${cards.map(c=>`
          <div class="honor-card">
            <span class="honor-card-emoji">${c.emoji}</span>
            <span class="honor-card-label">${c.label}</span>
            <span class="honor-card-name">${c.name}</span>
            <span class="honor-card-val">${c.val}</span>
          </div>`).join('')}
      </div>
    </div>`;
}

// ---------- بصمة الموسم ----------
// sparkline ملوّن داخل كرت المشارك
function buildFingerprintHTML(pid){
  const hist = buildParticipantHistory(pid);
  if(hist.length < 2) return '';
  const color = PARTICIPANT_COLORS[pid] || 'var(--gold)';
  const maxPts = Math.max(...hist.map(h=>h.points), 1);
  const BAR_H = 28; // ارتفاع أقصى للشريط

  const bars = hist.map(h=>{
    const h2 = h.points===0 ? 4 : Math.max(5, Math.round((h.points/maxPts)*BAR_H));
    const clr = h.points===0 ? 'var(--coral)' : color;
    return `<div class="fingerprint-bar" style="height:${h2}px;background:${clr};opacity:0.85;" title="ج${h.number}: ${h.points} ن"></div>`;
  }).join('');

  return `<div style="display:flex;align-items:flex-end;gap:2px;margin-top:8px;padding-top:8px;border-top:1px dashed var(--line);">${bars}</div>`;
}

// ---------- لوحة المفاجآت ----------
// تحسب من آخر جولة: من فاق توقعاته، من تراجع، أكبر مفاجأة
function renderSurprises(){
  const box = document.getElementById('surprisesBox');
  if(!box) return;
  if(DATA.rounds.length < 2){ box.innerHTML=''; return; }

  const histMap = getAllParticipantsRoundsHistory();
  const n = DATA.rounds.length;
  const cards = [];

  // بيانات آخر جولة
  const lastRound = DATA.rounds[n-1];
  const lastStats = {};
  PARTICIPANTS.forEach(p=>{
    const hist = histMap[p.id];
    if(!hist.length) return;
    const last = hist[hist.length-1];
    const prevHist = hist.slice(0,-1);
    const avg = prevHist.length ? prevHist.reduce((a,h)=>a+h.points,0)/prevHist.length : last.points;
    lastStats[p.id] = {name:p.name, last:last.points, avg, diff:last.points-avg};
  });

  // أكبر مفاجأة صعود: أعلى فرق إيجابي عن المتوسط
  const overperformers = Object.values(lastStats).sort((a,b)=>b.diff-a.diff);
  if(overperformers.length && overperformers[0].diff > 1){
    const top = overperformers[0];
    cards.push({emoji:'🚀',title:'تجاوز المتوقع',name:top.name,detail:`+${Math.round(top.diff*10)/10} عن متوسطه`});
  }

  // أكبر خيبة أمل: أعلى فرق سلبي
  const underperformers = Object.values(lastStats).sort((a,b)=>a.diff-b.diff);
  if(underperformers.length && underperformers[0].diff < -1){
    const bot = underperformers[0];
    cards.push({emoji:'😤',title:'تحت المتوقع',name:bot.name,detail:`${Math.round(bot.diff*10)/10} عن متوسطه`});
  }

  // المتصدر المفاجئ: من لم يكن في المركز الأول بالجولة الفائتة لكنه صعد
  if(n >= 2){
    const prevList = computeStandings(n-1);
    const curList = computeStandings(n);
    const prevLeader = prevList[0];
    const curLeader = curList[0];
    if(prevLeader && curLeader && prevLeader.id !== curLeader.id){
      const prevRank = prevList.findIndex(s=>s.id===curLeader.id)+1;
      cards.push({emoji:'👑',title:'انقلاب الصدارة',name:curLeader.name,detail:`صعد من المركز ${prevRank}`});
    }
  }

  // الثابت: أقرب نقطة لمتوسطه الموسمي
  const mostConsistent = Object.values(lastStats)
    .filter(s=>s.avg>0)
    .sort((a,b)=>Math.abs(a.diff)-Math.abs(b.diff));
  if(mostConsistent.length){
    const mc = mostConsistent[0];
    cards.push({emoji:'🎯',title:'الأكثر ثباتًا هذا الأسبوع',name:mc.name,detail:`${mc.last} ن (متوسطه ${Math.round(mc.avg*10)/10})`});
  }

  // الانتعاشة: ممة ثم نقاط هذا الأسبوع
  const bouncebacks = Object.values(lastStats).filter(s=>{
    const hist = histMap[PARTICIPANTS.find(p=>p.name===s.name)?.id];
    return hist && hist.length>=2 && hist[hist.length-2].points===0 && hist[hist.length-1].points>0;
  }).sort((a,b)=>b.last-a.last);
  if(bouncebacks.length){
    cards.push({emoji:'💪',title:'انتعاش بعد الممة',name:bouncebacks[0].name,detail:`${bouncebacks[0].last} نقطة هذا الأسبوع`});
  }

  if(!cards.length){ box.innerHTML=''; return; }
  const roundNum = lastRound.number;
  let html = `<h2 class="section-title" style="margin-top:22px;">🎪 مفاجآت الجولة ${roundNum}</h2>`;
  html += '<div class="surprises-board">';
  cards.forEach(c=>{
    html += `<div class="surprise-card">
      <div class="surprise-emoji">${c.emoji}</div>
      <div class="surprise-title">${c.title}</div>
      <div class="surprise-name">${c.name}</div>
      <div class="surprise-detail">${c.detail}</div>
    </div>`;
  });
  html += '</div>';
  box.innerHTML = html;
}

// ---------- لوحة الميداليات ----------
// تحسب كم مرة حصل كل مشارك على المركز الأول والثاني والثالث عبر الجولات،
// بما فيها الجولتان 1 و2 (أُضيف 10 سبتمبر 2026 بطلب المستخدم — كانتا مستثناتين
// سابقًا لأنهما بلا سجل جولة-بجولة حقيقي بـ`DATA.rounds`).
function renderMedals(){
  const box = document.getElementById('medalsBox');
  if(!box) return;

  const medals = {}; // pid -> {gold, silver, bronze}
  PARTICIPANTS.forEach(p=> medals[p.id]={gold:0, silver:0, bronze:0, name:p.name});

  // الجولة 1: ترتيب مبني على ROUND1_POINTS مباشرة (لا بيانات أهداف/مباريات
  // للجولة 1 لكسر تعادل حقيقي)، باستثناء من لم يكن مشاركًا بعد
  // (JOINED_AFTER_ROUND1). عند التعادل على القمة يُطبَّق نفس اختيار المنظم
  // المعتمد لبطل الجولة الأولى (ROUND_HERO_OVERRIDE[1])، وبقية التعادلات
  // تُحسم أبجديًا (بلا معيار آخر متاح، بنفس منطق أرشيف أبطال الجولات).
  const r1 = PARTICIPANTS.filter(p=> !JOINED_AFTER_ROUND1[p.id]).slice().sort((a,b)=>{
    const pa = ROUND1_POINTS[a.id]||0, pb = ROUND1_POINTS[b.id]||0;
    if(pb !== pa) return pb - pa;
    if(ROUND_HERO_OVERRIDE[1]){
      if(a.id === ROUND_HERO_OVERRIDE[1]) return -1;
      if(b.id === ROUND_HERO_OVERRIDE[1]) return 1;
    }
    return a.name.localeCompare(b.name,'ar');
  });
  if(r1[0]) medals[r1[0].id].gold++;
  if(r1[1]) medals[r1[1].id].silver++;
  if(r1[2]) medals[r1[2].id].bronze++;

  // الجولة 2: نفس لقطة "جسر الجولة 2" المستخدمة بالترتيب العام وأرشيف أبطال
  // الجولات (computeStandings(0) — المجموع = carry فقط، بلا أي جولة حقيقية
  // مُحتسَبة بعد)، مع استثناء من لم يكن مشاركًا وقتها أصلًا (JOINED_AFTER_ROUND2).
  const r2 = computeStandings(0).filter(s=> !JOINED_AFTER_ROUND2[s.id]);
  if(r2[0]) medals[r2[0].id].gold++;
  if(r2[1]) medals[r2[1].id].silver++;
  if(r2[2]) medals[r2[2].id].bronze++;

  // الجولات 3+: نفس المنطق الأصلي — لقطة الترتيب العام عند نهاية كل جولة حقيقية
  const n = DATA.rounds.length;
  for(let i=1; i<=n; i++){
    const list = computeStandings(i);
    if(list[0]) medals[list[0].id].gold++;
    if(list[1]) medals[list[1].id].silver++;
    if(list[2]) medals[list[2].id].bronze++;
  }

  // ترتيب: أكثر ذهبًا، ثم فضة، ثم برونز
  const sorted = PARTICIPANTS.slice().sort((a,b)=>{
    const ma=medals[a.id], mb=medals[b.id];
    if(mb.gold!==ma.gold) return mb.gold-ma.gold;
    if(mb.silver!==ma.silver) return mb.silver-ma.silver;
    return mb.bronze-ma.bronze;
  });

  // عرض من لديه ميدالية واحدة على الأقل
  const withMedals = sorted.filter(p=> medals[p.id].gold+medals[p.id].silver+medals[p.id].bronze > 0);
  if(!withMedals.length){ box.innerHTML=''; return; }

  let html = '<h2 class="section-title" style="margin-top:22px;">🥇 لوحة الميداليات</h2>';
  html += '<div class="medals-grid">';
  withMedals.forEach((p,i)=>{
    const m = medals[p.id];
    const total = m.gold + m.silver + m.bronze;
    let cls = i===0 ? 'medal-gold' : i===1 ? 'medal-silver' : i===2 ? 'medal-bronze' : '';
    const icon = m.gold>0 ? '🥇' : m.silver>0 ? '🥈' : '🥉';
    const medal_text = [
      m.gold > 0 ? `${m.gold}🥇` : '',
      m.silver > 0 ? `${m.silver}🥈` : '',
      m.bronze > 0 ? `${m.bronze}🥉` : ''
    ].filter(Boolean).join(' ');
    html += `<div class="medal-card ${cls}">
      <div class="medal-icon">${icon}</div>
      <div class="medal-name">${p.name}</div>
      <div class="medal-count">${medal_text}</div>
    </div>`;
  });
  html += '</div>';
  box.innerHTML = html;
}

// ---------- تاريخ تبادل المراكز ----------
// يُبيّن كيف تغيّر مركز الصدارة بين المشاركين جولةً بجولة
function renderRankHistory(){
  const box = document.getElementById('rankHistoryBox');
  if(!box) return;
  if(DATA.rounds.length < 2){ box.innerHTML=''; return; }

  const n = DATA.rounds.length;
  // المركز 1 في كل جولة
  const leaders = []; // {round, pid, name}
  for(let i=1; i<=n; i++){
    const list = computeStandings(i);
    if(list[0]) leaders.push({round: DATA.rounds[i-1].number, pid:list[0].id, name:list[0].name, total:list[0].total});
  }

  if(!leaders.length){ box.innerHTML=''; return; }

  // تحديد فترات الصدارة (متى تغيّر القائد)
  const changes = []; // {from, to, pid, name, total}
  let cur = leaders[0];
  leaders.forEach((l,i)=>{
    if(i===0){ changes.push({round:l.round, pid:l.pid, name:l.name, total:l.total, isNew:true}); return; }
    if(l.pid !== cur.pid){
      changes.push({round:l.round, pid:l.pid, name:l.name, total:l.total, isNew:true, prevName:cur.name});
      cur = l;
    } else {
      changes.push({round:l.round, pid:l.pid, name:l.name, total:l.total, isNew:false});
    }
  });

  // حساب عدد جولات الصدارة لكل مشارك
  const leaderRounds = {};
  PARTICIPANTS.forEach(p=> leaderRounds[p.id]=0);
  leaders.forEach(l=> leaderRounds[l.pid]++);

  let html = '<h2 class="section-title" style="margin-top:22px;">🔁 تاريخ الصدارة</h2>';

  // جدول مدة الصدارة
  const topLeaders = PARTICIPANTS.filter(p=>leaderRounds[p.id]>0)
    .sort((a,b)=>leaderRounds[b.id]-leaderRounds[a.id]);

  html += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;">';
  topLeaders.forEach(p=>{
    const rounds = leaderRounds[p.id];
    const pct = Math.round(rounds/n*100);
    html += `<div style="background:var(--paper);border:1px solid var(--line);border-radius:20px;padding:5px 14px;font-size:0.8rem;">
      <b>${p.name}</b> — <span style="color:var(--gold);">${rounds} جولة</span> في الصدارة (${pct}%)
    </div>`;
  });
  html += '</div>';

  // جدول التغييرات
  const changeEvents = changes.filter(c=>c.isNew);
  if(changeEvents.length > 0){
    html += '<div style="font-size:0.8rem;color:var(--muted);margin-bottom:8px;">تاريخ تغييرات الصدارة:</div>';
    html += '<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:16px;">';
    changeEvents.forEach(c=>{
      const prev = c.prevName ? `<span style="color:var(--muted);">← ${c.prevName}</span> ` : '';
      html += `<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--paper);border-radius:8px;border:1px solid var(--line);">
        <span style="font-size:0.75rem;color:var(--muted);min-width:50px;">ج${c.round}</span>
        ${prev}
        <span style="font-weight:700;color:var(--gold);">👑 ${c.name}</span>
        <span style="font-size:0.72rem;color:var(--muted);margin-right:auto;">${c.total} ن</span>
      </div>`;
    });
    html += '</div>';
  }

  box.innerHTML = html;
}

// ---------- لوحة قيادة الترتيب ----------
// تُظهر مركز كل مشارك في كل جولة عبر الموسم — بصريًا وتفاعليًا
function renderRankLeaderboard(){
  const box = document.getElementById('rankLeaderboardBox');
  if(!box) return;
  if(!DATA.rounds.length){ box.innerHTML=''; return; }

  // بناء مصفوفة المراكز لكل جولة
  const rounds = DATA.rounds.slice().sort((a,b)=>a.number-b.number);
  const roundNums = rounds.map(r=>r.number);

  // مرحلة الـ carry (قبل الجولة 1): الترتيب من computeStandings(0)
  const carryRanks = {};
  const carryList = computeStandings(0);
  carryList.forEach((s,i)=> carryRanks[s.id]=i+1);

  // بناء جدول مراكز: pid -> [rank per round 0..n]
  const ranksByRound = {}; // roundIndex (0=carry,1=round1...) -> {pid->rank}
  ranksByRound[0] = carryRanks;
  rounds.forEach((r,i)=>{
    const rm = {};
    const list = computeStandings(i+1);
    list.forEach((s,j)=> rm[s.id]=j+1);
    ranksByRound[i+1] = rm;
  });

  const finalRanks = ranksByRound[rounds.length];
  // ترتيب المشاركين بحسب المركز النهائي
  const sorted = PARTICIPANTS.slice().sort((a,b)=>(finalRanks[a.id]||99)-(finalRanks[b.id]||99));

  let html = '<h2 class="section-title" style="margin-top:22px;">👑 لوحة قيادة الترتيب</h2>';
  html += '<div class="rank-leaderboard"><table>';
  html += '<tr><th>المشارك</th>';
  if(rounds.length > 0) html += '<th>قبل</th>';
  roundNums.forEach(n=> html+=`<th>ج${n}</th>`);
  html += '</tr>';

  sorted.forEach(p=>{
    html += `<tr><td>${p.name}</td>`;
    for(let i=0; i<=rounds.length; i++){
      if(i===0 && rounds.length===0) continue;
      const rm = ranksByRound[i];
      const rank = rm && rm[p.id] ? rm[p.id] : '-';
      let cls = '';
      if(rank===1) cls='rl-cell-1';
      else if(rank===2) cls='rl-cell-2';
      else if(rank===3) cls='rl-cell-3';
      html += `<td class="${cls}">${rank}</td>`;
    }
    html += '</tr>';
  });
  html += '</table></div>';
  box.innerHTML = html;
}
