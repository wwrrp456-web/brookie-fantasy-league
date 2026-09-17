/* كل أقسام تبويب الإحصائيات (أكثر من 12 قسمًا) */

function renderRecords(){
  const box = document.getElementById('recordsBox');
  if(!box) return;
  const rec = computeRecords();
  let html = '<h2 class="section-title" style="margin-top:22px;">📊 أرقام الموسم القياسية</h2>';
  html += '<div class="badges-grid">';

  if(rec.topRound){
    html += `<div class="badge-card"><div class="badge-icon">💥</div><div class="badge-title">أعلى حصاد في جولة واحدة</div><div class="badge-names">${rec.topRound.name}</div><div class="badge-detail">${rec.topRound.points} نقطة — الجولة ${rec.topRound.round}</div></div>`;
  }
  if(rec.closest){
    html += `<div class="badge-card"><div class="badge-icon">⚔️</div><div class="badge-title">أعنف صراع في الترتيب</div><div class="badge-names">${rec.closest.a.name} و${rec.closest.b.name}</div><div class="badge-detail">يفصل بينهما ${rec.closest.gap} نقطة فقط</div></div>`;
  }
  if(rec.maxUp && rec.maxUp.delta > 0){
    html += `<div class="badge-card"><div class="badge-icon">🚀</div><div class="badge-title">أكبر صعود دفعة واحدة</div><div class="badge-names">${rec.maxUp.name}</div><div class="badge-detail">+${rec.maxUp.delta} مركز — الجولة ${rec.maxUp.round}</div></div>`;
  }
  if(rec.maxDown && rec.maxDown.delta < 0){
    html += `<div class="badge-card"><div class="badge-icon">📉</div><div class="badge-title">أكبر هبوط دفعة واحدة</div><div class="badge-names">${rec.maxDown.name}</div><div class="badge-detail">${rec.maxDown.delta} مركز — الجولة ${rec.maxDown.round}</div></div>`;
  }
  html += '</div>';
  box.innerHTML = html;
}

// ---------- مواجهة مباشرة (فُتحت لواجهة المشارك 15 سبتمبر 2026 — ميزة 3 من
// حزمة التفاعل الاجتماعي؛ كانت خاصة بلوحة المنظم فقط، القسم 9.12-٠) ----------
// أي زائر مُعرَّف (اختار اسمه ورمزه) يقدر يفتحها ويقارن نفسه بأي خصم، وتُختار
// "أنت" تلقائيًا كطرف أول أول مرة فقط (بدون كسر اختياره اليدوي لاحقًا). ما
// زالت متاحة أيضًا للمنظم بلا قيد (كانت كذلك أصلًا)، وأُضيف زر تحميل النتيجة
// كصورة (نفس آلية downloadElementAsImage المستخدمة بتبويبات أخرى).
let h2hA = null, h2hB = null;
let _h2hDefaultedToMe = false;

function renderH2H(){
  const box = document.getElementById('h2hBox');
  if(!box) return;

  const myPid = window._verifiedPid || null;
  if(!myPid && !isAdmin){
    box.innerHTML = `<h2 class="section-title" style="margin-top:22px;">⚔️ مواجهة مباشرة</h2>
      <span class="rc-locked">🔒 اختر اسمك وأدخل رمزك لفتح المواجهة المباشرة مع أي خصم</span>`;
    return;
  }

  if(h2hA===null) h2hA = PARTICIPANTS[0].id;
  if(h2hB===null) h2hB = PARTICIPANTS[1].id;
  if(myPid && !_h2hDefaultedToMe){
    h2hA = myPid;
    h2hB = PARTICIPANTS.find(p=>p.id!==myPid).id;
    _h2hDefaultedToMe = true;
  }

  const options = PARTICIPANTS.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
  let html = '<h2 class="section-title" style="margin-top:22px;">⚔️ مواجهة مباشرة</h2>';
  html += `<div id="h2hCapture">
    <div class="h2h-picker">
      <select id="h2hSelectA">${options}</select>
      <span class="h2h-vs">ضد</span>
      <select id="h2hSelectB">${options}</select>
    </div>
    <div id="h2hResult"></div>
  </div>`;
  html += `<div class="toolbar" style="margin-top:8px;">
    <button class="btn secondary" id="dlH2HBtn">⬇️ تحميل النتيجة كصورة</button>
  </div>
  <div id="h2hImgMsg"></div>`;
  box.innerHTML = html;

  const selA = document.getElementById('h2hSelectA');
  const selB = document.getElementById('h2hSelectB');
  selA.value = h2hA;
  selB.value = h2hB;
  selA.addEventListener('change', ()=>{ h2hA = Number(selA.value); renderH2HResult(); });
  selB.addEventListener('change', ()=>{ h2hB = Number(selB.value); renderH2HResult(); });
  document.getElementById('dlH2HBtn').addEventListener('click', ()=>{
    downloadElementAsImage('h2hCapture', `brookie-h2h-${h2hA}-vs-${h2hB}.png`, 'h2hImgMsg', 'dlH2HBtn');
  });

  renderH2HResult();
}

function renderH2HResult(){
  const box = document.getElementById('h2hResult');
  if(!box) return;
  const standings = computeStandings();
  const rankMap = {};
  standings.forEach((s,i)=> rankMap[s.id]=i+1);
  const sA = standings.find(s=>s.id===h2hA);
  const sB = standings.find(s=>s.id===h2hB);
  if(!sA || !sB){ box.innerHTML=''; return; }

  const histA = getAllRoundsHistory(h2hA);
  const histB = getAllRoundsHistory(h2hB);
  const bestA = histA.reduce((m,r)=>Math.max(m,r.points),0);
  const bestB = histB.reduce((m,r)=>Math.max(m,r.points),0);
  const mumA = histA.filter(r=>r.points===0).length;
  const mumB = histB.filter(r=>r.points===0).length;

  const rows = [
    {label:'المركز الحالي', a:rankMap[h2hA], b:rankMap[h2hB], lowerBetter:true},
    {label:'إجمالي النقاط', a:sA.total, b:sB.total},
    {label:'أفضل جولة', a:bestA, b:bestB},
    {label:'عدد الممات', a:mumA, b:mumB, lowerBetter:true},
  ];

  let html = '<div class="h2h-table">';
  rows.forEach(r=>{
    let aWin=false, bWin=false;
    if(r.a !== r.b){
      if(r.lowerBetter){ aWin = r.a<r.b; bWin = r.b<r.a; }
      else { aWin = r.a>r.b; bWin = r.b>r.a; }
    }
    html += `<div class="h2h-row">
      <div class="h2h-val ${aWin?'h2h-win':''}">${r.a}</div>
      <div class="h2h-label">${r.label}</div>
      <div class="h2h-val ${bWin?'h2h-win':''}">${r.b}</div>
    </div>`;
  });
  html += '</div>';
  box.innerHTML = html;
}

// ---------- الرسم البياني ----------
function renderChart(){
  const box = document.getElementById('chartBox');
  const n = DATA.rounds.length;
  if(n < 1){
    box.innerHTML = '<p style="color:var(--muted);font-size:0.85rem;">يظهر الرسم البياني بعد تسجيل أول جولة.</p>';
    return;
  }
  const top = computeStandings().slice(0,6);
  const colors = ['#16A6EA','#3B9EFF','#3DD47E','#FF6B5E','#C77DFF','#FFA45B'];
  const W = Math.max(300, 60 + n*70), H = 240, pad = {t:16,r:14,b:26,l:38};

  const series = top.map(s=>{
    const pts = [];
    for(let k=0;k<=n;k++){
      const list = computeStandings(k);
      const rank = list.findIndex(x=>x.id===s.id) + 1;
      pts.push(rank);
    }
    return {id:s.id, name:s.name, pts};
  });

  const maxRank = PARTICIPANTS.length;
  const xFor = i => pad.l + (i*(W-pad.l-pad.r)/Math.max(1,n));
  const yFor = r => pad.t + ((r-1)*(H-pad.t-pad.b)/Math.max(1,maxRank-1));

  let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
  [1,5,10,15,18].filter(r=>r<=maxRank).forEach(r=>{
    svg += `<line x1="${pad.l}" y1="${yFor(r)}" x2="${W-pad.r}" y2="${yFor(r)}" stroke="rgba(255,255,255,0.09)" stroke-width="1"/>`;
    svg += `<text x="${pad.l-7}" y="${yFor(r)+4}" fill="#7A7A7A" font-size="10" text-anchor="end" font-family="Tajawal,sans-serif">${r}</text>`;
  });
  for(let i=0;i<=n;i++){
    const lbl = i===0 ? 'البداية' : DATA.rounds[i-1].number;
    svg += `<text x="${xFor(i)}" y="${H-8}" fill="#7A7A7A" font-size="10" text-anchor="middle" font-family="Tajawal,sans-serif">${lbl}</text>`;
  }
  series.forEach((s,si)=>{
    const d = s.pts.map((r,i)=>`${i?'L':'M'}${xFor(i)},${yFor(r)}`).join(' ');
    svg += `<path d="${d}" fill="none" stroke="${colors[si]}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    s.pts.forEach((r,i)=>{
      svg += `<circle cx="${xFor(i)}" cy="${yFor(r)}" r="3" fill="${colors[si]}"/>`;
    });
  });
  svg += '</svg>';

  let legend = '<div class="chart-legend">';
  series.forEach((s,si)=> legend += `<span><i style="background:${colors[si]}"></i>${s.name}</span>`);
  legend += '</div>';

  box.innerHTML = `<div class="chart-wrap">${svg}</div>${legend}
    <p style="font-size:0.72rem;color:var(--muted);margin-top:8px;">الرسم يوضّح مركز أفضل 6 لاعبين عبر الجولات — كلما ارتفع الخط كان المركز أفضل.</p>`;
}

// ---------- إحصائيات الأندية ----------
function renderClubStats(){
  const box = document.getElementById('clubStatsBox');
  const list = getClubStats().filter(c=>c.played>0);
  if(list.length === 0){
    box.innerHTML = '<p style="color:var(--muted);font-size:0.85rem;">تظهر إحصائيات الأندية بعد تسجيل أول جولة.</p>';
    return;
  }
  let html = '<div style="overflow-x:auto;"><table class="club-stats-table"><thead><tr>' +
    '<th>#</th><th style="text-align:start;">النادي</th><th>لعب</th><th>ف</th><th>ت</th><th>خ</th><th>نقاط</th><th>ملاك</th>' +
    '</tr></thead><tbody>';
  list.forEach((cst,i)=>{
    html += `<tr>
      <td style="color:#8A8A8A;">${i+1}</td>
      <td class="cs-name"><div class="cs-name-inner">${clubCrestSVG(cst.name,20)}<span class="cs-club-label">${cst.name}</span></div></td>
      <td style="color:#8A8A8A;">${cst.played}</td>
      <td style="color:#3DD47E;">${cst.w}</td>
      <td style="color:#16A6EA;">${cst.d}</td>
      <td style="color:#FF6B5E;">${cst.l}</td>
      <td style="font-weight:800;color:#fff;">${cst.pts}</td>
      <td style="color:#8A8A8A;">${cst.ownersCount}</td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  box.innerHTML = html;
}

// ---------- حاسبة "ماذا لو؟" ----------
let _whatifRendered = false;
function renderWhatIf(){
  const box = document.getElementById('whatIfBox');
  if(!box) return;
  // طلب المستخدم 17 سبتمبر 2026 — الحاسبة تعتمد فقط على computeStandings()
  // الجاهزة أصلًا منذ جسر الجولة 2، فبوابة DATA.rounds.length القديمة كانت
  // تخفيها بلا داعٍ قبل تسجيل أول جولة حقيقية.
  const st = computeStandings();
  const opts = st.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');

  // نحتاج نرندر مرة واحدة فقط، ثم نحدّث النتيجة عند الضغط
  if(!_whatifRendered){
    box.innerHTML = `<div class="whatif-box">
      <div class="whatif-title">🧮 حاسبة "ماذا لو؟" — تخيّل الجولة القادمة</div>
      <div class="whatif-controls">
        <span class="whatif-label">لو حصل</span>
        <select class="whatif-select" id="wiPid">${opts}</select>
        <span class="whatif-label">على</span>
        <input type="number" class="whatif-input" id="wiPts" min="0" max="9" value="3" placeholder="نقاط">
        <span class="whatif-label">نقطة الجولة القادمة</span>
        <button class="whatif-btn" onclick="calcWhatIf()">احسب ▶</button>
      </div>
      <div id="wiResult"></div>
    </div>`;
    _whatifRendered = true;
  }
}

function renderClubMap(){
  const box = document.getElementById('clubMapBox');
  if(!box) return;

  // حساب أصحاب كل ناد
  const clubOwners = {};
  PARTICIPANTS.forEach(p=>{
    p.teams.forEach(t=>{
      if(!clubOwners[t]) clubOwners[t]=[];
      clubOwners[t].push(p.name);
    });
  });

  // تجميع حسب الدوري
  const byLeague = {};
  const allClubs = Array.from(new Set(PARTICIPANTS.flatMap(p=>p.teams)));
  allClubs.forEach(club=>{
    const league = CLUB_LEAGUE_MAP[club] || 'أخرى';
    if(!byLeague[league]) byLeague[league]=[];
    byLeague[league].push(club);
  });

  // ترتيب الدوريات: السعودي أولًا ثم ألفبائي
  const leagueOrder = ['الدوري السعودي','الدوري الإسباني','الدوري الإنجليزي','الدوري الإيطالي','الدوري الألماني','الدوري الفرنسي','الدوري البرتغالي','الدوري الهولندي','الدوري التركي','الدوري الأسكتلندي','الدوري الكرواتي','أخرى'];
  const leagueFlags = {'الدوري السعودي':'🇸🇦','الدوري الإسباني':'🇪🇸','الدوري الإنجليزي':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','الدوري الإيطالي':'🇮🇹','الدوري الألماني':'🇩🇪','الدوري الفرنسي':'🇫🇷','الدوري البرتغالي':'🇵🇹','الدوري الهولندي':'🇳🇱','الدوري التركي':'🇹🇷','الدوري الأسكتلندي':'🏴󠁧󠁢󠁳󠁣󠁴󠁿','الدوري الكرواتي':'🇭🇷'};

  let html = '<h2 class="section-title" style="margin-top:22px;">🗺️ خريطة الأندية بالدوريات</h2>';
  html += '<div class="club-map">';

  leagueOrder.forEach(league=>{
    if(!byLeague[league]) return;
    const flag = leagueFlags[league]||'🌍';
    html += `<div class="club-map-league">
      <div class="club-map-league-name">${flag} ${league} (${byLeague[league].length} أندية)</div>
      <div class="club-map-clubs">`;
    byLeague[league].sort().forEach(club=>{
      const owners = clubOwners[club]||[];
      const isOwned = owners.length>0;
      const ownersStr = isOwned ? owners.join('، ') : '';
      html += `<div class="club-map-chip${isOwned?' owned':''}">
        ${clubCrestSVG(club,18)}
        <span>${club}</span>
        ${isOwned?`<span class="club-map-owners">(${ownersStr})</span>`:''}
      </div>`;
    });
    html += '</div></div>';
  });

  html += '</div>';
  box.innerHTML = html;
}

// ---------- تحدي التوقعات الموسعي ----------
// يُظهر سجل توقعات كل مشارك جولةً بجولة مع ✅/❌
function renderPredChallenge(){
  const box = document.getElementById('predChallengeBox');
  if(!box) return;
  if(!DATA.rounds || !DATA.predictions || !Object.keys(DATA.predictions).length){
    box.innerHTML=''; return;
  }

  // اجمع أرقام الجولات التي فيها توقعات محسومة
  const roundsWithPred = DATA.rounds.filter(r=>{
    const entries = DATA.predictions[r.number];
    return entries && Object.keys(entries).length>0;
  }).sort((a,b)=>a.number-b.number);

  if(!roundsWithPred.length){ box.innerHTML=''; return; }

  // لكل جولة، من هو البطل الفعلي؟
  function getRoundChampionId(roundNum){
    const idx = DATA.rounds.findIndex(r=>r.number===roundNum);
    if(idx<0) return null;
    const stats = computeRoundStats(DATA.rounds[idx]);
    let best=-1, champ=null;
    PARTICIPANTS.forEach(p=>{
      const s=stats[p.id];
      if(s && s.points>best){ best=s.points; champ=p.id; }
    });
    // يتحقق من ROUND_HERO_OVERRIDE
    return (typeof ROUND_HERO_OVERRIDE!=='undefined' && ROUND_HERO_OVERRIDE[roundNum]) || champ;
  }

  // بناء جدول: مشارك × جولة
  const scores = {}; // pid -> {correct,total}
  PARTICIPANTS.forEach(p=>scores[p.id]={correct:0,total:0});

  let html = '<h2 class="section-title" style="margin-top:22px;">🎲 تحدي التوقعات — السجل الكامل</h2>';
  html += '<div style="overflow-x:auto;"><table class="pred-challenge-table">';
  html += '<tr><th>المشارك</th>';
  roundsWithPred.forEach(r=> html+=`<th>ج${r.number}</th>`);
  html += '<th>صح</th><th>إجمالي</th><th>نسبة</th></tr>';

  PARTICIPANTS.forEach(p=>{
    const row = [''];
    let correct=0, total=0;
    roundsWithPred.forEach(r=>{
      const pred = DATA.predictions[r.number];
      if(!pred || pred[p.id]===undefined){
        row.push(`<td class="pred-ch-miss">—</td>`);
        return;
      }
      total++;
      scores[p.id].total++;
      const champId = getRoundChampionId(r.number);
      const isCorrect = champId && Number(pred[p.id])===champId;
      if(isCorrect){ correct++; scores[p.id].correct++; }
      const predName = (PARTICIPANTS.find(x=>x.id===Number(pred[p.id]))||{}).name||'?';
      const short = predName.split(' ')[0];
      row.push(`<td class="${isCorrect?'pred-ch-correct':'pred-ch-wrong'}" title="${predName}">${isCorrect?'✅':'❌'} ${short}</td>`);
    });
    const pct = total>0?Math.round(correct/total*100):0;
    html += `<tr>
      <td>${p.name}</td>
      ${row.slice(1).join('')}
      <td class="pred-ch-correct">${correct}</td>
      <td>${total}</td>
      <td style="font-weight:800;color:${pct>=50?'#3DD47E':'var(--coral)'};">${pct}%</td>
    </tr>`;
  });

  html += '</table></div>';
  box.innerHTML = html;
}

// ---------- رادار الموسم الكامل ----------
// SVG spider/radar chart لكل مشارك يُظهر 5 أبعاد
function buildRadarSVG(pid, color){
  const hist = buildParticipantHistory(pid);
  if(!hist.length) return '';

  const allHist = getAllParticipantsRoundsHistory();
  const allPoints = Object.values(allHist).flat().map(h=>h.points);
  const maxTotal = computeStandings()[0]?.total || 1;
  const myTotal = computeStandings().find(s=>s.id===pid)?.total || 0;

  // 5 أبعاد: نسبة 0–1 لكل واحد
  const n = hist.length;
  const avg = n ? hist.reduce((a,h)=>a+h.points,0)/n : 0;
  const globalAvg = allPoints.length ? allPoints.reduce((a,b)=>a+b,0)/allPoints.length : 1;
  const maxPts = Math.max(...allPoints, 1);
  const myBest = Math.max(...hist.map(h=>h.points), 0);
  const mumCount = hist.filter(h=>h.points===0).length;
  const mumRate = n ? mumCount/n : 0;

  // سلسلة أطول بلا ممات
  let streak=0, bestStreak=0;
  hist.forEach(h=>{ if(h.points>0){ streak++; bestStreak=Math.max(bestStreak,streak); } else streak=0; });

  const dims = [
    Math.min(1, myTotal/maxTotal),          // نقاط الموسم
    Math.min(1, avg/globalAvg/2),            // معدل الجولة
    Math.min(1, myBest/maxPts),              // أعلى جولة
    Math.max(0, 1-mumRate*2),               // خلو من الممات
    Math.min(1, bestStreak/n)               // أطول سلسلة
  ];
  const labels = ['نقاط','معدل','ذروة','ثبات','سلسلة'];

  const cx=60, cy=60, r=44, N=5;
  const pts = dims.map((v,i)=>{
    const angle = (i/N)*2*Math.PI - Math.PI/2;
    const rv = r*v;
    return [cx+rv*Math.cos(angle), cy+rv*Math.sin(angle)];
  });

  // شبكة خلفية
  let gridLines = '';
  [0.25,0.5,0.75,1].forEach(scale=>{
    const gPts = Array.from({length:N},(_,i)=>{
      const angle=(i/N)*2*Math.PI-Math.PI/2;
      return `${cx+r*scale*Math.cos(angle)},${cy+r*scale*Math.sin(angle)}`;
    }).join(' ');
    gridLines += `<polygon points="${gPts}" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>`;
  });

  // محاور
  let axes = '';
  labels.forEach((_,i)=>{
    const angle=(i/N)*2*Math.PI-Math.PI/2;
    axes += `<line x1="${cx}" y1="${cy}" x2="${cx+r*Math.cos(angle)}" y2="${cy+r*Math.sin(angle)}" stroke="rgba(255,255,255,0.15)" stroke-width="0.5"/>`;
  });

  // تسميات
  let labelsHTML = '';
  labels.forEach((lbl,i)=>{
    const angle=(i/N)*2*Math.PI-Math.PI/2;
    const lx = cx+(r+10)*Math.cos(angle);
    const ly = cy+(r+10)*Math.sin(angle);
    labelsHTML += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-size="6" fill="rgba(255,255,255,0.5)" font-family="inherit">${lbl}</text>`;
  });

  const polyPts = pts.map(([x,y])=>`${x},${y}`).join(' ');

  return `<svg viewBox="0 0 120 120" width="100%" style="max-width:140px;">
    ${gridLines}${axes}
    <polygon points="${polyPts}" fill="${color}" fill-opacity="0.25" stroke="${color}" stroke-width="1.5"/>
    ${labelsHTML}
    ${pts.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2" fill="${color}"/>`).join('')}
  </svg>`;
}

function renderRadar(){
  const box = document.getElementById('radarBox');
  if(!box) return;
  if(DATA.rounds.length < 2){ box.innerHTML=''; return; }

  const st = computeStandings();
  let html = '<h2 class="section-title" style="margin-top:22px;">🕸️ رادار الموسم الكامل</h2>';
  html += '<div style="font-size:0.75rem;color:var(--muted);margin-bottom:10px;">5 أبعاد: نقاط الموسم · معدل الجولة · أعلى جولة · الثبات · أطول سلسلة</div>';
  html += '<div class="radar-wrap">';
  st.forEach(s=>{
    const color = PARTICIPANT_COLORS[s.id] || 'var(--gold)';
    const svg = buildRadarSVG(s.id, color);
    html += `<div class="radar-card">
      <div class="radar-name"><span class="p-color-dot" style="background:${color};"></span>${s.name}</div>
      ${svg}
    </div>`;
  });
  html += '</div>';
  box.innerHTML = html;
}

// ---------- سباق الترتيب المتحرك ----------
// شريط تقدمي تفاعلي — المستخدم يسحب السلايدر لمشاهدة الترتيب جولةً بجولة
let _raceInit = false;
function renderRace(){
  const box = document.getElementById('raceBox');
  if(!box) return;
  if(DATA.rounds.length < 2){ box.innerHTML=''; return; }

  const n = DATA.rounds.length;
  const maxTotal = computeStandings(n)[0]?.total || 1;

  if(!_raceInit){
    box.innerHTML = `<h2 class="section-title" style="margin-top:22px;">🏎️ سباق الترتيب المتحرك</h2>
      <div class="race-slider">
        <label>الجولة:</label>
        <input type="range" id="raceSlider" min="0" max="${n}" value="${n}" step="1">
        <span class="race-round-label" id="raceLabel">ج${DATA.rounds[n-1].number}</span>
      </div>
      <div id="raceBars"></div>`;
    document.getElementById('raceSlider').addEventListener('input', updateRaceBars);
    _raceInit = true;
  } else {
    // تحديث الحد الأقصى إذا أُضيفت جولات
    const sl = document.getElementById('raceSlider');
    if(sl){ sl.max = n; if(Number(sl.value)>n) sl.value=n; }
  }
  updateRaceBars();
}

function updateRaceBars(){
  const sl = document.getElementById('raceSlider');
  const label = document.getElementById('raceLabel');
  const barsBox = document.getElementById('raceBars');
  if(!sl||!barsBox) return;

  const idx = Number(sl.value);
  const st = computeStandings(idx);
  const maxTotal = st[0]?.total || 1;

  if(label){
    if(idx===0) label.textContent='البداية';
    else{ const r=DATA.rounds[idx-1]; label.textContent = r ? `ج${r.number}` : `${idx}`; }
  }

  let html = '';
  st.forEach((s,i)=>{
    const pct = Math.round((s.total/maxTotal)*100);
    const color = PARTICIPANT_COLORS[s.id] || 'var(--gold)';
    const rankIcon = i===0?'👑':i===1?'🥈':i===2?'🥉':'';
    html += `<div class="race-row">
      <span class="race-name">${rankIcon}${s.name}</span>
      <div class="race-bar-wrap">
        <div class="race-bar" style="width:${pct}%;background:${color};">
          <span class="race-pts">${s.total} ن</span>
        </div>
      </div>
    </div>`;
  });
  barsBox.innerHTML = html;
}

// ---------- كفاءة الاستفادة من الأندية ----------
// لكل ناد: متوسط نقاطه بكل مباراة عبر كامل الموسم. كانت هذي الدالة تبني
// أرقامها من جديد (buildParticipantHistory) بالاعتماد على DATA.rounds فقط —
// أي أنها تتجاهل تمامًا الأساس الثابت (CLUB_SEASON_STATS، الجولتان 1-2)
// وتعرض فقط مباريات الجولة 3 فصاعدًا، بينما جدول "أداء الأندية" (getClubStats())
// يجمع الأساس + الجولات الحقيقية معًا — فكان يظهر تناقض بالأرقام بين
// الجدولين لنفس النادي (مثال: سلتيك 6 مباريات بجدول، و2 فقط بالآخر). أُصلح
// 10 سبتمبر 2026 باستخدام نفس المصدر الموحّد getClubStats() لكلا الجدولين،
// فلا يمكن يصير تناقض بينهما مهما تغيّرت البيانات مستقبلاً.
function renderClubEfficiency(){
  const box = document.getElementById('clubEfficiencyBox');
  if(!box) return;

  const list = getClubStats().filter(c=>c.played>0);
  if(!list.length){ box.innerHTML=''; return; }

  const entries = list.slice().sort((a,b)=> b.avg - a.avg);
  const maxAvg = Math.max(...entries.map(c=>c.avg), 1);

  let html = '<h2 class="section-title" style="margin-top:22px;">⚽ كفاءة الأندية في الدوري</h2>';
  html += '<div style="font-size:0.75rem;color:var(--muted);margin-bottom:10px;">مرتبة حسب متوسط النقاط لكل مباراة — نفس أرقام جدول "أداء الأندية" أعلاه بالضبط</div>';
  html += '<div class="club-eff-grid">';
  entries.slice(0,18).forEach(c=>{
    const pct = Math.round((c.avg/maxAvg)*100);
    html += `<div class="club-eff-card">
      <div class="club-eff-name">${c.name}</div>
      <div class="club-eff-bar-wrap"><div class="club-eff-bar" style="width:${pct}%;"></div></div>
      <div class="club-eff-stats">
        <span>معدل ${Math.round(c.avg*10)/10} ن/مباراة</span>
        <span>${c.w}ف ${c.d}ت ${c.l}خ</span>
      </div>
    </div>`;
  });
  html += '</div>';
  box.innerHTML = html;
}

// ---------- خريطة الممات ----------
// جدول يُبيّن كل مشارك × كل جولة: ✅ أو ☠️
function renderDeathMap(){
  const box = document.getElementById('deathMapBox');
  if(!box) return;
  if(!DATA.rounds.length){ box.innerHTML=''; return; }

  const histMap = getAllParticipantsRoundsHistory();
  const rounds = DATA.rounds.slice().sort((a,b)=>a.number-b.number);
  const roundNums = rounds.map(r=>r.number);

  // ترتيب المشاركين بحسب عدد الممات تصاعديًا (الأقل ممات أولًا)
  const sorted = PARTICIPANTS.slice().sort((a,b)=>{
    const ma = histMap[a.id].filter(r=>r.points===0).length;
    const mb = histMap[b.id].filter(r=>r.points===0).length;
    return ma - mb;
  });

  let html = '<h2 class="section-title" style="margin-top:22px;">💀 خريطة الممات</h2>';
  html += '<div class="death-map"><table>';
  html += '<tr><th>المشارك</th>';
  roundNums.forEach(n=> html+=`<th>ج${n}</th>`);
  html += '<th>المجموع</th></tr>';

  sorted.forEach(p=>{
    const hist = histMap[p.id];
    const histByRound = {};
    hist.forEach(h=> histByRound[h.number]=h.points);
    const mumCount = hist.filter(h=>h.points===0).length;

    html += `<tr><td>${p.name}</td>`;
    roundNums.forEach(n=>{
      const pts = histByRound[n];
      if(pts === undefined){
        html += `<td class="dm-none">-</td>`;
      } else if(pts === 0){
        html += `<td class="dm-dead">☠️</td>`;
      } else {
        html += `<td class="dm-alive">✓</td>`;
      }
    });
    const totCls = mumCount===0 ? 'dm-zero-cell' : 'dm-total-cell';
    html += `<td class="${totCls}">${mumCount===0?'🧊':mumCount}</td>`;
    html += '</tr>';
  });

  // صف المجموع
  html += '<tr style="border-top:2px solid var(--line);"><td style="color:var(--muted);font-size:0.72rem;">ممات الجولة</td>';
  roundNums.forEach(n=>{
    const count = PARTICIPANTS.filter(p=>{
      const hist = histMap[p.id];
      const h = hist.find(x=>x.number===n);
      return h && h.points===0;
    }).length;
    html += `<td style="font-size:0.72rem;color:${count>0?'var(--coral)':'var(--muted)'}">${count||'-'}</td>`;
  });
  html += '<td></td></tr>';
  html += '</table></div>';
  box.innerHTML = html;
}
