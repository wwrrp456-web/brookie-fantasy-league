/* محتوى عن الدوري وقصة الموسم */

// ---------- قصة الموسم ----------
function renderSeasonStory(){
  const box = document.getElementById('seasonStoryBox');
  if(!box) return;

  // n: فهرس داخل DATA.rounds (الجولات الحقيقية 3+ فقط) — يُستخدم فقط لحساب
  // صدارة كل جولة تاريخيًا عبر computeStandings(i)، لأن جولتي 1/2 (فترة
  // الجسر) ليس لهما فرز منفصل جولة-بجولة. totalRoundsSoFar هو العدد الحقيقي
  // للجولات المكتملة شاملًا الجولتين 1 و2 (طلب المستخدم 17 سبتمبر 2026 —
  // بيانات الجولتين 1/2 كانت "تختفي" من قصة الموسم وتُخفي القصة كاملة قبل
  // اكتمال جولتين حقيقيتين رغم توفر بيانات الجسر منذ انطلاق الموسم).
  const n = DATA.rounds.length;
  const totalRoundsSoFar = getCurrentRoundNumber();
  const histMap = getAllParticipantsRoundsHistory();
  const st = computeStandings();
  const leader = st[0];
  const last = st[st.length-1];

  // ---- مساعدات ----
  const hl = t => `<span class="story-highlight">${t}</span>`;
  const name = id => (PARTICIPANTS.find(p=>p.id===id)||{}).name||'—';

  // ---- فصل 1: الافتتاحية ----
  const totalPts = st.reduce((a,s)=>a+s.total,0);
  const totalMum = st.reduce((a,s)=>a+s.mummaCount,0);
  const chap1 = `انطلق <b>دوري بروكي الفانتازي — الموسم الثاني</b> بـ${hl(PARTICIPANTS.length+' مشاركاً')} يتنافسون بـ${hl(CLUBS.length+' نادياً')} من ${hl('13 دوريًا')} حول العالم. حتى الآن أُكملت ${hl(totalRoundsSoFar+' جولات')} أُنتجت فيها ${hl(totalPts+' نقطة')} إجمالية، وشهدت ${hl(totalMum+' ممة')} مؤلمة.`;

  // ---- فصل 2: الصدارة وتاريخها ----
  const leaderRounds = {};
  PARTICIPANTS.forEach(p=>leaderRounds[p.id]=0);
  // فترة جسر الجولتين 1 و2 — كل جولة منهما تُحتسب على حدة (لا كوحدة واحدة)،
  // بنفس منطق "تاريخ الصدارة" المصحَّح بالقسم 9.61: قائد الجولة 1 من
  // getRoundChampion(1) (يعتمد فقط على ROUND1_POINTS، بلا أي رصيد سابق)،
  // وقائد الجولة 2 من computeStandings(0)[0] (اللقطة التراكمية بعد الجولتين).
  // تصحيح 21 سبتمبر 2026: الكود القديم كان يُسند الجولتين معًا لقائد الجولة 2
  // فقط (عبر bridgeLeader واحد += 2)، فبالغ بعدد جولات هيمنته إذا اختلف قائدا
  // الجولتين فعليًا (كما حدث: أبو عبيدة بالجولة 1، أبو أوس بالجولة 2 — كان
  // يُسجَّل أبو أوس مهيمنًا 3 جولات بدل 2 فقط).
  const leaderTimeline = []; // {round, id, name}
  const r1ChampId = getRoundChampion(1);
  if(r1ChampId != null){
    const p1 = PARTICIPANTS.find(p=>p.id===r1ChampId);
    if(p1) leaderTimeline.push({round:1, id:p1.id, name:p1.name});
  }
  const r2Leader = computeStandings(0)[0];
  if(r2Leader) leaderTimeline.push({round:2, id:r2Leader.id, name:r2Leader.name});
  for(let i=1;i<=n;i++){
    const top = computeStandings(i)[0];
    if(top) leaderTimeline.push({round:DATA.rounds[i-1].number, id:top.id, name:top.name});
  }
  leaderTimeline.forEach(entry=>{ leaderRounds[entry.id] = (leaderRounds[entry.id]||0)+1; });
  const topLeader = PARTICIPANTS.slice().sort((a,b)=>(leaderRounds[b.id]||0)-(leaderRounds[a.id]||0))[0];
  const changes = [];
  let prevLeaderId = leaderTimeline.length ? leaderTimeline[0].id : null;
  for(let i=1;i<leaderTimeline.length;i++){
    const entry = leaderTimeline[i];
    if(entry.id !== prevLeaderId){ changes.push({round:entry.round, name:entry.name}); prevLeaderId=entry.id; }
  }
  const gap = st.length>=2 ? leader.total - st[1].total : 0;
  let chap2 = `${hl(topLeader.name)} هيمن على الصدارة في ${hl(leaderRounds[topLeader.id]+' جولات')} من أصل ${totalRoundsSoFar}. `;
  if(changes.length > 1){
    chap2 += `شهد الموسم ${hl(changes.length+' تغييرات')} في قيادة الترتيب — `;
    chap2 += changes.map(c=>`${c.name} (ج${c.round})`).join(' ← ');
    chap2 += '. ';
  } else {
    chap2 += `القيادة لم تتغير — ${hl(changes[0]?.name||leaderTimeline[0]?.name||leader.name)} يقود منذ البداية. `;
  }
  chap2 += `المتصدر الحالي ${hl(leader.name)} يتقدم على منافسه الأقرب بـ${hl(gap+' نقطة')}.`;

  // ---- فصل 3: المعارك الحامية ----
  // أقرب فارق بين مشاركَين بآخر جولة
  let tightestGap=Infinity, tightPair=[];
  for(let i=0;i<st.length-1;i++){
    const g=st[i].total-st[i+1].total;
    if(g<tightestGap){ tightestGap=g; tightPair=[st[i].name,st[i+1].name]; }
  }
  // أكبر فارق في نقاط جولة واحدة — يشمل الآن الجولتين 1 و2 (فترة الجسر) بجانب
  // كل جولة حقيقية لاحقة (طلب المستخدم 21 سبتمبر 2026: "أضف الجولة الأولى
  // والثانية كذلك في قصة الموسم"). كان الحساب يقتصر فقط على DATA.rounds
  // (الجولات الحقيقية 3+)، فيغفل تمامًا عن أي تفاوت بجولتي الجسر رغم توفر
  // بياناتهما — بنفس المصدرين المستخدمين أصلًا بالفصل 2: ROUND1_POINTS
  // (نقاط الجولة 1 حصرًا) وgetRound2BridgePointsMap() (نقاط الجولة 2 حصرًا).
  let biggestRoundGap=0, biggestRound=0;
  [
    {number:1, map:ROUND1_POINTS},
    {number:2, map:getRound2BridgePointsMap()}
  ].forEach(r=>{
    const pts = PARTICIPANTS.map(p=> r.map[p.id]||0);
    const g = Math.max(...pts) - Math.min(...pts);
    if(g>biggestRoundGap){biggestRoundGap=g;biggestRound=r.number;}
  });
  DATA.rounds.forEach(r=>{
    const stats=computeRoundStats(r);
    const pts=PARTICIPANTS.map(p=>stats[p.id]?.points||0).filter(v=>v>=0);
    const g=Math.max(...pts)-Math.min(...pts.filter(v=>v>0||true));
    if(g>biggestRoundGap){biggestRoundGap=g;biggestRound=r.number;}
  });
  let chap3 = `أشرس المعارك كانت بين ${hl(tightPair[0])} و${hl(tightPair[1])} — الفارق بينهما ${hl(tightestGap+' نقطة')} فقط. `;
  chap3 += `الجولة الأكثر تنافسًا كانت ${hl('الجولة '+biggestRound)} بفارق ${hl(biggestRoundGap+' نقطة')} بين الأعلى والأدنى.`;

  // ---- فصل 4: نجوم ومفاجآت ----
  // أعلى نقطة جولة واحدة — histMap (عبر getAllParticipantsRoundsHistory)
  // يشمل أصلًا الجولتين 1 و2 (فترة الجسر) بجانب كل جولة حقيقية، فكان بالإمكان
  // أصلًا أن يكون صاحب أعلى حصاد قد حقّقه بالجولة 1 أو 2 تحديدًا. لكن كل
  // عنصر بـhistMap يحمل رقم الجولة بخاصية `round` لا `number` (تصحيح 21
  // سبتمبر 2026 — طلب المستخدم "أضف الجولة الأولى والثانية كذلك في قصة
  // الموسم": الخطأ كان يجعل رقم الجولة يظهر "undefined" دائمًا لأي جولة،
  // بما فيها 1 و2، لأن `h.number` غير موجود إطلاقًا بعناصر هذا المصدر).
  let bestPts=0, bestRoundN=0, bestPid=null;
  PARTICIPANTS.forEach(p=>{
    histMap[p.id].forEach(h=>{ if(h.points>bestPts){bestPts=h.points;bestPid=p.id;bestRoundN=h.round;} });
  });
  // أكثر صعودًا من الجولة 1 حتى الآن
  const startRanks={}, nowRanks={};
  computeStandings(1).forEach((s,i)=>startRanks[s.id]=i+1);
  st.forEach((s,i)=>nowRanks[s.id]=i+1);
  let bigClimber=null, bigClimb=0;
  PARTICIPANTS.forEach(p=>{
    if(JOINED_AFTER_ROUND1[p.id]||JOINED_AFTER_ROUND2[p.id]) return;
    const d=(startRanks[p.id]||0)-(nowRanks[p.id]||0);
    if(d>bigClimb){bigClimb=d;bigClimber=p.id;}
  });
  let chap4=`أعلى حصاد في جولة واحدة طوال الموسم سجّله ${hl(name(bestPid))} بـ${hl(bestPts+' نقطة')} في الجولة ${bestRoundN}. `;
  if(bigClimber && bigClimb>0){
    chap4 += `أبرز تحسّن في الترتيب عبر الموسم حقّقه ${hl(name(bigClimber))} الذي صعد ${hl(bigClimb+' مراكز')}.`;
  }

  // ---- فصل 5: الممات والثبات ----
  const zeroMum = PARTICIPANTS.filter(p=>histMap[p.id].length>=2 && histMap[p.id].every(h=>h.points>0));
  let mostMumPid=null, mostMumVal=0;
  PARTICIPANTS.forEach(p=>{
    const m=histMap[p.id].filter(h=>h.points===0).length;
    if(m>mostMumVal){mostMumVal=m;mostMumPid=p.id;}
  });
  let chap5='';
  if(zeroMum.length){
    chap5 += `${hl(zeroMum.map(p=>p.name).join(' و'))} ${zeroMum.length>1?'يحافظون':'يحافظ'} على سجل نظيف — بلا ممات حتى الآن 🧊. `;
  }
  if(mostMumPid && mostMumVal>0){
    chap5 += `في المقابل، ${hl(name(mostMumPid))} يحمل ثقل ${hl(mostMumVal+' ممات')} — الأكثر في الموسم.`;
  }

  // ---- فصل 6: نهاية الموسم المتوقعة ----
  const roundsLeft = SEASON_TOTAL_ROUNDS - totalRoundsSoFar;
  const avgByPid={};
  PARTICIPANTS.forEach(p=>{
    const hist=histMap[p.id];
    avgByPid[p.id]=hist.length?hist.reduce((a,h)=>a+h.points,0)/hist.length:0;
  });
  const projected = st.map(s=>({
    id:s.id, name:s.name,
    projected: Math.round(s.total + avgByPid[s.id]*roundsLeft)
  })).sort((a,b)=>b.projected-a.projected);
  const projLeader = projected[0];
  const projSecond = projected[1];
  const projGap = projLeader.projected - projSecond.projected;
  let chap6=`إذا استمر كل مشارك بمتوسطه الحالي وبقيت ${hl(roundsLeft+' جولة')}، يُتوقع أن يُنهي ${hl(projLeader.name)} الموسم أولًا بـ${hl(projLeader.projected+' نقطة')} `;
  chap6 += `متقدمًا على ${hl(projSecond.name)} بـ${hl(projGap+' نقطة')}.`;
  if(projLeader.id !== leader.id){
    chap6 += ` ⚠️ المتصدر الحالي ${hl(leader.name)} في خطر!`;
  }

  // ---- فصل تكريم البطل (قسم تكريم البطل — ميزة 15، معطّل افتراضيًا) ----
  let chapChamp = '';
  if(CHAMPION_FEATURES.smart_summary_highlight && CHAMPION_ID){
    const champRow = st.find(s=>s.id===CHAMPION_ID);
    const champHist = histMap[CHAMPION_ID] || [];
    const lastEntry = champHist[champHist.length-1];
    const champName = (PARTICIPANTS.find(p=>p.id===CHAMPION_ID)||{}).name || '';
    if(champRow && lastEntry && champName){
      if(lastEntry.points === 0){
        chapChamp = `حتى حامل اللقب ${hl(champName)} لم يسلم من الممة في آخر جولة — تذكير أن العرش لا يُحمى بالماضي وحده.`;
      } else {
        const others = st.filter(s=>s.id!==CHAMPION_ID);
        const avgOthersLast = others.length
          ? others.reduce((a,s)=>{ const h=(histMap[s.id]||[]); return a+(h[h.length-1]?.points||0); },0)/others.length
          : 0;
        if(lastEntry.points >= avgOthersLast*1.5 && lastEntry.points > 0){
          chapChamp = `حامل اللقب ${hl(champName)} أكّد جدارته بآخر جولة بحصاد ${hl(lastEntry.points+' نقطة')} — دفاع مقنع عن العرش حتى الآن.`;
        }
      }
    }
  }

  // ---- تجميع الفصول ----
  const chapters = [
    {num:'١', icon:'🏁', title:'الافتتاحية', body:chap1},
    {num:'٢', icon:'👑', title:'معركة الصدارة', body:chap2},
    {num:'٣', icon:'⚔️', title:'المعارك الحامية', body:chap3},
    {num:'٤', icon:'🌟', title:'نجوم ومفاجآت', body:chap4},
    {num:'٥', icon:'💀', title:'الممات والثبات', body:chap5},
    {num:'٦', icon:'🔮', title:'ماذا يُخبئ الموسم؟', body:chap6},
    {num:'٧', icon:'🛡️', title:'دفاع البطل', body:chapChamp},
  ].filter(c=>c.body);

  let html = '<div class="story-wrap">';
  html += '<h2 class="section-title" style="margin-top:22px;">📖 قصة الموسم</h2>';
  html += `<p style="font-size:0.78rem;color:var(--muted);margin-bottom:14px;">سرد تلقائي مُولَّد من البيانات — يتحدّث نفسه مع كل جولة جديدة</p>`;

  chapters.forEach(c=>{
    html += `<div class="story-chapter" data-num="${c.num}">
      <div class="story-chapter-title">${c.icon} الفصل ${c.num}: ${c.title}</div>
      <div class="story-chapter-body">${c.body}</div>
    </div>`;
  });

  // زر مشاركة القصة في الواتساب
  const storyText = chapters.map(c=>`*${c.icon} ${c.title}*\n${c.body.replace(/<[^>]+>/g,'')}`).join('\n\n');
  const waText = encodeURIComponent(`📖 *قصة دوري بروكي الفانتازي — الموسم الثاني*\n\n${storyText}\n\n${SITE_URL}`);
  html += `<a href="https://wa.me/?text=${waText}" target="_blank" class="story-share-btn">📤 شارك القصة في واتساب</a>`;
  html += '</div>';
  box.innerHTML = html;
}

// ---------- صفحة "عن الدوري" ----------
function renderAboutLeague(){
  const box = document.getElementById('aboutLeagueBox');
  if(!box) return;
  const st = computeStandings();
  const histMap = getAllParticipantsRoundsHistory();
  const roundsDone = getCurrentRoundNumber();
  const totalPoints = st.reduce((a,s)=>a+s.total,0);
  const totalMummas = st.reduce((a,s)=>a+s.mummaCount,0);
  let bestSinglePts = 0;
  PARTICIPANTS.forEach(p=>{ (histMap[p.id]||[]).forEach(r=>{ if(r.points>bestSinglePts) bestSinglePts=r.points; }); });
  // إصلاح 19 سبتمبر 2026: كانت تحسب `c.league` على عناصر `CLUBS` (مصفوفة
  // أسماء أندية نصّية بسيطة، لا كائنات بحقل league) فتُرجع دائمًا '' لكل
  // نادٍ — أي أن عدّاد "دوري" بهذا القسم كان يعرض 0 دائمًا بصمت منذ البداية،
  // بصرف النظر عن عدد الدوريات الفعلي. المصدر الصحيح لدوري كل نادٍ هو
  // `CLUB_LEAGUE_MAP` (js/data/season-2/clubs.js)، فيُحسب العدد الفعلي منه
  // مباشرة — يتحدّث تلقائيًا مع أي دوري/نادٍ جديد يُضاف مستقبلاً بلا أي
  // تعديل إضافي هنا.
  const uniqueLeagues = new Set(CLUBS.map(c=>CLUB_LEAGUE_MAP[c]||''));
  uniqueLeagues.delete('');

  box.innerHTML = `
    <div class="about-league">
      <div class="about-section">
        <div class="about-section-title">🏆 دوري بروكي الفانتازي — الموسم الثاني</div>
        <div class="about-stat-grid">
          <div class="about-stat"><span class="about-stat-num">${PARTICIPANTS.length}</span><span class="about-stat-label">مشارك</span></div>
          <div class="about-stat"><span class="about-stat-num">${Object.keys(CLUBS).length}</span><span class="about-stat-label">نادٍ</span></div>
          <div class="about-stat"><span class="about-stat-num">${uniqueLeagues.size}</span><span class="about-stat-label">دوري</span></div>
          <div class="about-stat"><span class="about-stat-num">${roundsDone}</span><span class="about-stat-label">جولة مكتملة</span></div>
          <div class="about-stat"><span class="about-stat-num">${totalPoints}</span><span class="about-stat-label">نقطة إجمالية</span></div>
          <div class="about-stat"><span class="about-stat-num">${totalMummas}</span><span class="about-stat-label">ممة إجمالية</span></div>
          <div class="about-stat"><span class="about-stat-num">${bestSinglePts||'—'}</span><span class="about-stat-label">أعلى نقطة جولة</span></div>
          <div class="about-stat"><span class="about-stat-num">${SEASON_TOTAL_ROUNDS}</span><span class="about-stat-label">جولة متوقعة</span></div>
        </div>
      </div>
      <div class="about-section">
        <div class="about-section-title">📋 معلومات الموسم</div>
        <p style="margin:0;font-size:0.85rem;color:var(--text2);line-height:1.8;">
          🗓️ انطلق الموسم الثاني في أغسطس 2026<br>
          ⚽ كل مشارك لديه 3 أندية من 3 دوريات مختلفة<br>
          📊 نقاط الفوز: 3 · التعادل: 1 · الخسارة: 0<br>
          💀 الممة: صفر نقطة في الجولة كاملة<br>
          🔗 <a href="${SITE_URL}" target="_blank" style="color:var(--gold);">رابط الدوري</a>
        </p>
      </div>
    </div>`;
}
