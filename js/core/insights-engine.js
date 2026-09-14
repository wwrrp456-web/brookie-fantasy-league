/* حساب الأوسمة والأرقام القياسية والألقاب وحاسبة ماذا لو */

// ---------- 3) ألقاب ومفاجآت لكل جولة ----------
// بمعزل عن "أوسمة الموسم" (تراكمية طوال الموسم) — هذي ألقاب طازجة لكل
// جولة على حدة، مبنية على نفس طبقة getAllParticipantsRoundsHistory
// الموجودة أصلاً، فتُحسب صحيحة تلقائيًا لأي جولة جديدة بلا أي تعديل هنا.
function computeRoundTitlesArchive(){
  const histMap = getAllParticipantsRoundsHistory();
  const roundNumbersSet = new Set();
  PARTICIPANTS.forEach(p=> histMap[p.id].forEach(r=> roundNumbersSet.add(r.round)));
  const roundNumbers = Array.from(roundNumbersSet).sort((a,b)=>a-b);
  const titlesByRound = {};
  roundNumbers.forEach((rn, idx)=>{
    if(idx === 0) return; // أول جولة معروفة ما فيها "جولة سابقة" تُقاس التحسّن منها
    const prevRn = roundNumbers[idx-1];
    const cur = {}, prev = {};
    PARTICIPANTS.forEach(p=>{
      const rec = histMap[p.id].find(r=>r.round===rn);
      const prevRec = histMap[p.id].find(r=>r.round===prevRn);
      if(rec) cur[p.id] = rec;
      if(prevRec) prev[p.id] = prevRec;
    });
    titlesByRound[rn] = computeRoundTitles(cur, prev);
  });
  return titlesByRound;
}

function computeRoundTitles(cur, prev){
  const ids = Object.keys(cur).map(Number);
  if(!ids.length) return [];
  const nameOf = id => (PARTICIPANTS.find(p=>p.id===id)||{}).name;
  const titles = [];

  // ⚡ الأكثر تحسّنًا: أكبر فرق موجب بالنقاط مقابل الجولة السابقة مباشرة
  let bestImprove = -Infinity;
  ids.forEach(id=>{
    if(prev[id] === undefined) return;
    const delta = cur[id].points - prev[id].points;
    if(delta > bestImprove) bestImprove = delta;
  });
  if(bestImprove > 0){
    const improveIds = ids.filter(id=> prev[id] !== undefined && (cur[id].points - prev[id].points) === bestImprove);
    if(improveIds.length) titles.push({icon:'⚡', label:'الأكثر تحسّنًا', names: improveIds.map(nameOf), extra:`+${bestImprove}`});
  }

  // 🥅 الأكثر هجومية: أعلى أهداف سجّلها هذي الجولة (يحتاج بيانات أهداف حقيقية)
  let bestGf = -Infinity;
  ids.forEach(id=>{ if(cur[id].gf !== null && cur[id].gf !== undefined && cur[id].gf > bestGf) bestGf = cur[id].gf; });
  if(bestGf > 0){
    const gfIds = ids.filter(id=> cur[id].gf === bestGf);
    titles.push({icon:'🥅', label:'الأكثر هجومية', names: gfIds.map(nameOf), extra:`${bestGf} هدف`});
  }

  // 🧱 الأصلب دفاعًا: أقل أهداف استقبلها هذي الجولة (يحتاج بيانات أهداف حقيقية)
  let bestGa = Infinity;
  ids.forEach(id=>{ if(cur[id].ga !== null && cur[id].ga !== undefined && cur[id].ga < bestGa) bestGa = cur[id].ga; });
  if(bestGa < Infinity){
    const gaIds = ids.filter(id=> cur[id].ga === bestGa);
    titles.push({icon:'🧱', label:'الأصلب دفاعًا', names: gaIds.map(nameOf), extra:`${bestGa} استقبال`});
  }

  return titles;
}

// ---------- أوسمة الموسم ----------
// تُحسب بالكامل من getAllParticipantsRoundsHistory + getMovements، وتكبر
// تلقائيًا مع كل جولة حقيقية جديدة يُدخلها المنظم دون أي تعديل هنا.
function computeBadges(){
  const histMap = getAllParticipantsRoundsHistory();
  const badges = [];

  // 1) الأكثر ثباتًا: صفر ممات عبر كل الجولات المعروفة (يحتاج جولتين فأكثر)
  let steadiest = [];
  PARTICIPANTS.forEach(p=>{
    const hist = histMap[p.id];
    if(hist.length < 2) return;
    if(hist.every(r=> r.points > 0)) steadiest.push(p.name);
  });

  // 2) أطول سلسلة نقاط متتالية (points>0)
  let bestStreakVal = 0, bestStreakNames = [];
  PARTICIPANTS.forEach(p=>{
    const hist = histMap[p.id];
    let cur=0, best=0;
    hist.forEach(r=>{ if(r.points>0){ cur++; best=Math.max(best,cur); } else cur=0; });
    if(best > bestStreakVal){ bestStreakVal = best; bestStreakNames = [p.name]; }
    else if(best === bestStreakVal && best > 0){ bestStreakNames.push(p.name); }
  });

  // 3) أعلى حصاد في جولة واحدة عبر تاريخ الموسم
  let bestRoundVal = -1, bestRoundNames = [];
  PARTICIPANTS.forEach(p=>{
    histMap[p.id].forEach(r=>{
      if(r.points > bestRoundVal){ bestRoundVal = r.points; bestRoundNames = [p.name]; }
      else if(r.points === bestRoundVal && !bestRoundNames.includes(p.name)){ bestRoundNames.push(p.name); }
    });
  });

  // 4) الأكثر ممات عبر تاريخ الموسم
  let mostMumVal = -1, mostMumNames = [];
  PARTICIPANTS.forEach(p=>{
    const mumCount = histMap[p.id].filter(r=>r.points===0).length;
    if(mumCount > mostMumVal){ mostMumVal = mumCount; mostMumNames = [p.name]; }
    else if(mumCount === mostMumVal && mumCount > 0){ mostMumNames.push(p.name); }
  });

  // 5) أكبر صعود في المركز هذه الجولة تحديدًا (ديناميكي، يتغيّر كل جولة)
  // ملاحظة: يجمع كل الأسماء المتعادلة على نفس القفزة (بنفس نمط الأوسمة الأخرى أعلاه)
  // بدل الاحتفاظ باسم واحد فقط — تعادل حقيقي بين مشاركين كان يُسقط أحدهما بصمت
  // (خطأ اكتُشف وأُصلح 3 سبتمبر 2026).
  const mv = getMovements();
  let topClimberVal = 0, topClimberNames = [];
  PARTICIPANTS.forEach(p=>{
    const v = mv[p.id]||0;
    if(v > topClimberVal){ topClimberVal = v; topClimberNames = [p.name]; }
    else if(v === topClimberVal && v > 0){ topClimberNames.push(p.name); }
  });

  const fmtNames = (arr)=> arr.length<=3 ? arr.join('، ') : `${arr.length} مشاركين`;

  if(steadiest.length){
    badges.push({icon:'🧊', title:'الأكثر ثباتًا', names: fmtNames(steadiest), detail:'صفر ممات منذ بداية الموسم'});
  }
  if(bestStreakVal >= 2){
    badges.push({icon:'🔥', title:'أطول سلسلة نقاط', names: fmtNames(bestStreakNames), detail:`${bestStreakVal} جولات متتالية بنقاط`});
  }
  if(bestRoundVal > 0){
    badges.push({icon:'💥', title:'أعلى حصاد في جولة واحدة', names: fmtNames(bestRoundNames), detail:`${bestRoundVal} نقطة`});
  }
  if(mostMumVal > 0){
    badges.push({icon:'💀', title:'الأكثر ممات', names: fmtNames(mostMumNames), detail:`${mostMumVal} ممة`});
  }
  if(topClimberNames.length){
    badges.push({icon:'🚀', title:'أكبر صعود هذه الجولة', names: fmtNames(topClimberNames), detail:`+${topClimberVal} مركز`});
  }

  return badges;
}

function computeRecords(){
  const histMap = getAllParticipantsRoundsHistory();

  // أعلى حصاد جولة واحدة عبر كل تاريخ الموسم
  let allRoundEntries = [];
  PARTICIPANTS.forEach(p=>{
    histMap[p.id].forEach(r=> allRoundEntries.push({name:p.name, round:r.round, points:r.points}));
  });
  allRoundEntries.sort((a,b)=> b.points - a.points);
  const topRound = allRoundEntries[0] || null;

  // أعنف صراع في الترتيب الحالي: أقرب فارق نقاط بين مركزين متجاورين
  const standings = computeStandings();
  let minGap = Infinity, minGapPair = null;
  for(let i=0;i<standings.length-1;i++){
    const gap = standings[i].total - standings[i+1].total;
    if(gap < minGap){ minGap = gap; minGapPair = [standings[i], standings[i+1]]; }
  }

  // أكبر صعود/هبوط دفعة واحدة عبر تاريخ الموسم
  const moves = getAllMovementsHistory();
  let maxUp = null, maxDown = null;
  moves.forEach(m=>{
    if(!maxUp || m.delta > maxUp.delta) maxUp = m;
    if(!maxDown || m.delta < maxDown.delta) maxDown = m;
  });

  return {
    topRound,
    closest: minGapPair ? {gap:minGap, a:minGapPair[0], b:minGapPair[1]} : null,
    maxUp, maxDown
  };
}

function calcWhatIf(){
  const pid = Number(document.getElementById('wiPid').value);
  const addPts = Number(document.getElementById('wiPts').value) || 0;
  const result = document.getElementById('wiResult');
  if(!result) return;

  const current = computeStandings();
  // نسخة افتراضية: زوّد نقاط المشارك المختار
  const simulated = current.map(s=>({
    id: s.id, name: s.name,
    total: s.id===pid ? s.total+addPts : s.total
  })).sort((a,b)=>{
    if(b.total!==a.total) return b.total-a.total;
    return a.name.localeCompare(b.name,'ar');
  });

  // ترتيب حالي
  const curRanks = {};
  current.forEach((s,i)=> curRanks[s.id]=i+1);
  const simRanks = {};
  simulated.forEach((s,i)=> simRanks[s.id]=i+1);

  const changedName = (current.find(s=>s.id===pid)||{}).name||'?';
  let html = `<div class="whatif-result">
    <div style="font-size:0.75rem;color:var(--muted);margin-bottom:6px;">
      الترتيب المتوقع لو <b style="color:var(--gold);">${changedName}</b> حصل على <b style="color:var(--gold);">${addPts}</b> نقطة الجولة القادمة:
    </div>`;

  simulated.forEach((s,i)=>{
    const rank = i+1;
    const prev = curRanks[s.id];
    const isChanged = s.id === pid;
    const delta = prev - rank; // موجب = صعود
    let deltaHTML = '';
    if(delta>0) deltaHTML=`<span class="whatif-delta" style="color:#3DD47E;">▲${delta}</span>`;
    else if(delta<0) deltaHTML=`<span class="whatif-delta" style="color:var(--coral);">▼${Math.abs(delta)}</span>`;
    else deltaHTML=`<span class="whatif-delta" style="color:var(--muted);">—</span>`;

    const rankIcon = rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':`${rank}.`;
    html += `<div class="whatif-row${isChanged?' changed':''}">
      <span class="whatif-rank">${rankIcon}</span>
      <span class="whatif-name">${s.name}</span>
      <span class="whatif-pts">${s.total} ن</span>
      ${deltaHTML}
    </div>`;
  });
  html += '</div>';
  result.innerHTML = html;
}

// ---------- إنجازات موسمية موسّعة ----------
// تُضاف إضافات على computeBadges الموجودة أو تُوسّع renderBadges
function computeExtendedBadges(){
  const histMap = getAllParticipantsRoundsHistory();
  const extra = [];

  // أعلى متوسط في الموسم (يحتاج جولتين فأكثر)
  let bestAvgVal = -1, bestAvgNames = [];
  PARTICIPANTS.forEach(p=>{
    const hist = histMap[p.id];
    if(hist.length < 2) return;
    const avg = hist.reduce((a,h)=>a+h.points,0) / hist.length;
    if(avg > bestAvgVal){ bestAvgVal=avg; bestAvgNames=[p.name]; }
    else if(Math.abs(avg-bestAvgVal)<0.01 && bestAvgVal>0){ bestAvgNames.push(p.name); }
  });
  if(bestAvgVal > 0){
    extra.push({icon:'📈', title:'أعلى متوسط في الموسم', names: bestAvgNames.join('، '), detail:`${Math.round(bestAvgVal*10)/10} نقطة كمعدل`});
  }

  // أطول سلسلة صعود (نقاط أعلى من الجولة السابقة)
  let bestRisingVal = 0, bestRisingNames = [];
  PARTICIPANTS.forEach(p=>{
    const hist = histMap[p.id];
    if(hist.length < 3) return;
    let cur=0, best=0;
    for(let i=1;i<hist.length;i++){
      if(hist[i].points > hist[i-1].points){ cur++; best=Math.max(best,cur); }
      else cur=0;
    }
    if(best > bestRisingVal){ bestRisingVal=best; bestRisingNames=[p.name]; }
    else if(best===bestRisingVal && best>0){ bestRisingNames.push(p.name); }
  });
  if(bestRisingVal >= 2){
    extra.push({icon:'⬆️', title:'أطول صعود متواصل', names: bestRisingNames.join('، '), detail:`${bestRisingVal} جولات متتالية`});
  }

  // أكبر انتعاشة (أعلى نقطة بعد ممة مباشرة)
  let bestBouncePts = 0, bestBounceNames = [];
  PARTICIPANTS.forEach(p=>{
    const hist = histMap[p.id];
    for(let i=1;i<hist.length;i++){
      if(hist[i-1].points===0 && hist[i].points>bestBouncePts){
        bestBouncePts=hist[i].points; bestBounceNames=[p.name];
      } else if(hist[i-1].points===0 && hist[i].points===bestBouncePts && bestBouncePts>0){
        if(!bestBounceNames.includes(p.name)) bestBounceNames.push(p.name);
      }
    }
  });
  if(bestBouncePts > 0){
    extra.push({icon:'💪', title:'أقوى انتعاشة بعد الممة', names: bestBounceNames.join('، '), detail:`${bestBouncePts} نقطة بعد ممة`});
  }

  // المنتج الأكثر استمرارية: أعلى حد أدنى للنقاط في أي جولة (min across rounds)
  let bestFloorVal = -1, bestFloorNames = [];
  PARTICIPANTS.forEach(p=>{
    const hist = histMap[p.id];
    if(hist.length < 2) return;
    const floor = Math.min(...hist.map(h=>h.points));
    if(floor > bestFloorVal){ bestFloorVal=floor; bestFloorNames=[p.name]; }
    else if(floor===bestFloorVal && floor>=0){ bestFloorNames.push(p.name); }
  });
  if(bestFloorVal > 0){
    extra.push({icon:'🛡️', title:'الأكثر استمرارية', names: bestFloorNames.join('، '), detail:`لم ينزل عن ${bestFloorVal} نقطة`});
  }

  return extra;
}
