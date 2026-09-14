/* تعريف "مين أنت؟"، لوحتي الشخصية، التوقعات، إنجازاتي */

// ---------- 4) لوحة أدق المتوقعين (نسخة كاملة بتبويب الإحصائيات) ----------
// ملاحظة مهمة: منطق حساب الدقة نفسه (مقارنة كل توقّع ببطل الجولة الفعلي)
// موجود أصلاً بدالة computePredictionAccuracy()/getRoundChampion() أسفل
// (تُغذّي لوحة "🏆 الأكثر توقعًا صحيحًا" المصغّرة داخل كرت التوقعات بتبويب
// الترتيب العام) — هذي الدالة هنا لا تُعيد نفس المنطق، فقط تُعيد تنسيقه
// كلوحة كاملة (كل من له توقّع محسوم واحد على الأقل، لا أول 5 فقط) بمكان
// مستقل وأوضح ضمن تبويب الإحصائيات، مع نسبة مئوية إضافية للدقة.
function renderPredictionAccuracy(){
  const box = document.getElementById('predictionAccuracyBox');
  if(!box) return;
  const acc = computePredictionAccuracy(); // {pid: {correct, total}} — الدالة الأصلية أسفل
  const list = PARTICIPANTS
    .map(p=>{
      const a = acc[p.id] || {correct:0, total:0};
      return {name:p.name, correct:a.correct, total:a.total, pct: a.total ? Math.round((a.correct/a.total)*100) : 0};
    })
    .filter(r=>r.total>0)
    .sort((a,b)=> b.correct-a.correct || b.pct-a.pct || b.total-a.total || a.name.localeCompare(b.name,'ar'));

  let html = `<h2 class="section-title" style="margin-top:22px;">🔮 لوحة أدق المتوقعين</h2>`;
  if(!list.length){
    html += '<p class="rounds-subtitle" style="margin-top:0;">لسه ما فيه توقعات محسومة بنتيجة — تظهر هنا اللوحة أول ما تنحسم أول جولة فيها توقعات 🔮</p>';
    box.innerHTML = html;
    return;
  }
  html += `<p class="rounds-subtitle" style="margin-top:0;">مين يتوقّع بطل الجولة صح أكثر عبر الموسم؟</p>`;
  html += '<div class="pred-leaderboard">';
  list.forEach((r,i)=>{
    const medal = i===0 ? '🥇' : i===1 ? '🥈' : i===2 ? '🥉' : `${i+1}.`;
    html += `<div class="pred-lb-row">
      <span class="pred-lb-rank">${medal}</span>
      <span class="pred-lb-name">${r.name}</span>
      <span class="pred-lb-score">${r.correct}/${r.total} صح</span>
      <span class="pred-lb-pct">${r.pct}%</span>
    </div>`;
  });
  html += '</div>';
  box.innerHTML = html;
}

// ---------- اختيار "أنت" ----------
// من 4 سبتمبر 2026: اختيار اسم من القائمة ما عاد يكفي وحده — لازم إدخال
// الرمز الخاص بالمشارك (نفس رمز PARTICIPANT_CODES المستخدم أصلاً بصفحة
// "ساهم بالبيانات") قبل ما يتفعّل الاختيار، عشان محد يقدر ينتحل اسم مشارك
// ثاني بمجرد اختياره من القائمة. الرمز يُطلب فقط عند اختيار يدوي فعلي؛
// استرجاع الاختيار المحفوظ مسبقًا بنفس المتصفح (loadMyId، عند فتح الصفحة)
// لا يطلبه ثانية لأنه أصلاً تم التحقق منه سابقًا بهذا المتصفح بالذات.
let MY_ID = null;
let meVerifiedId = ''; // آخر id (كنص) تم التحقق من رمزه فعليًا بهذا المتصفح

// دالتا تحقق/تفعيل موحّدتان — يشترك فيهما منتقي "مين أنت؟" الرئيسي
// (initMePicker) وشاشة الترحيب الجديدة "زائر/متسابق" لأول زيارة
// (initOnboarding أسفل) عشان ما نكرر نفس منطق التحقق بمكانين.
function codeMatchesParticipant(pid, code){
  return !!code && String(PARTICIPANT_CODES[pid]) === String(code).trim();
}
async function applyMyId(id){
  MY_ID = id;
  meVerifiedId = id ? String(id) : '';
  window._verifiedPid = id ? Number(id) : null; // للتعليقات وغيرها
  try{ await window.storage.set('brookie-my-id', MY_ID, false); }catch(e){}
  const mainSel = document.getElementById('mePicker');
  if(mainSel) mainSel.value = id || '';
  renderStandings();
  renderPredictions();
  renderMyDashboard();
  renderRoundComments();
  renderRoundChallenge();
  renderMyAchievements();
  handleChampionIdentityWelcome(id);
}

function initMePicker(){
  const sel = document.getElementById('mePicker');
  if(!sel || sel.options.length > 1) return;
  PARTICIPANTS.forEach(p=>{
    const o = document.createElement('option');
    o.value = p.id; o.textContent = p.name;
    sel.appendChild(o);
  });

  const codeInput = document.getElementById('meCodeInput');
  const confirmBtn = document.getElementById('meCodeConfirmBtn');
  const cancelBtn = document.getElementById('meCodeCancelBtn');
  const msg = document.getElementById('meCodeMsg');

  function hideCodeBox(){
    codeInput.style.display = 'none';
    confirmBtn.style.display = 'none';
    cancelBtn.style.display = 'none';
    codeInput.value = '';
    msg.innerHTML = '';
  }

  function showCodeBox(){
    codeInput.style.display = '';
    confirmBtn.style.display = '';
    cancelBtn.style.display = '';
    codeInput.value = '';
    msg.innerHTML = '';
    codeInput.focus();
  }

  function confirmCode(){
    const pid = Number(sel.value);
    const code = codeInput.value.trim();
    if(!code){
      msg.innerHTML = '<div class="status-msg err">أدخل رمزك الخاص (4 أرقام) اللي أرسله لك المنظم.</div>';
      return;
    }
    if(!codeMatchesParticipant(pid, code)){
      msg.innerHTML = '<div class="status-msg err">الرمز غير مطابق للاسم المختار. تأكد من الرقم اللي أرسلناه لك، أو تواصل مع المنظم.</div>';
      return;
    }
    hideCodeBox();
    applyMyId(pid);
  }

  sel.addEventListener('change', ()=>{
    const chosen = sel.value;
    if(!chosen){
      // رجوع لوضع "زائر" بلا هوية — بلا حاجة لرمز
      hideCodeBox();
      applyMyId(null);
      return;
    }
    if(chosen === meVerifiedId){
      // نفس الاسم المؤكَّد أصلاً بهذا المتصفح — بلا حاجة لإعادة الرمز
      hideCodeBox();
      return;
    }
    showCodeBox();
  });

  confirmBtn.addEventListener('click', confirmCode);
  codeInput.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){ e.preventDefault(); confirmCode(); }
  });
  cancelBtn.addEventListener('click', ()=>{
    sel.value = meVerifiedId;
    hideCodeBox();
  });
}

async function loadMyId(){
  try{
    const r = await window.storage.get('brookie-my-id', false);
    if(r && r.value !== undefined && r.value !== null){
      MY_ID = Number(typeof r.value==='string' ? JSON.parse(r.value) : r.value);
      meVerifiedId = String(MY_ID);
      window._verifiedPid = MY_ID;
      const sel = document.getElementById('mePicker');
      if(sel) sel.value = MY_ID;
      renderPredictions();
      renderMyDashboard();
    }
  }catch(e){}
}

// ---------- لوحتي الشخصية ----------
// صندوق ملخّص فوري يظهر بمجرد اختيار "مين أنت؟": مركزك، نقاطك، حركتك هذه
// الجولة، أقرب منافس فوقك وتحتك، وحالة توقعك للجولة القادمة — بدل ما يدوّر
// الزائر بنفسه بين الجدول والتوقعات عشان يلقى وضعه. يُعاد بناؤه مع كل
// renderAll() (يشمل تحديثات المزامنة اللحظية) وعند تغيير "مين أنت".
function renderMyDashboard(){
  const box = document.getElementById('myDashboardBox');
  if(!box) return;
  if(MY_ID === null){ box.style.display='none'; box.innerHTML=''; return; }
  const me = PARTICIPANTS.find(p=>p.id===MY_ID);
  const st = computeStandings();
  const idx = st.findIndex(x=>x.id===MY_ID);
  if(!me || idx === -1){ box.style.display='none'; box.innerHTML=''; return; }

  const meRow = st[idx];
  const rank = idx+1;
  const mv = getMovements();
  const myMove = mv[MY_ID]||0;
  const moveLabel = myMove>0 ? `▲${myMove}` : myMove<0 ? `▼${Math.abs(myMove)}` : '—';
  const moveColor = myMove>0 ? '#3DD47E' : myMove<0 ? '#FF6B5E' : '#8A8A8A';

  let rivalHtml = '';
  const above = idx>0 ? st[idx-1] : null;
  const below = idx<st.length-1 ? st[idx+1] : null;
  if(above){
    rivalHtml += `<div class="my-dash-rival">🔼 <b>${above.name}</b> يسبقك بفارق ${above.total - meRow.total} نقطة</div>`;
  }
  if(below){
    rivalHtml += `<div class="my-dash-rival">🔽 <b>${below.name}</b> خلفك بفارق ${meRow.total - below.total} نقطة</div>`;
  }
  if(!above && !below){
    rivalHtml = '<div class="my-dash-rival">أنت المشارك الوحيد 🎉</div>';
  }

  // سطر التوقع في اللوحة الشخصية يتبع نفس مفتاح المنظم لإظهار/إخفاء خانة
  // التوقعات — إذا أخفاها المنظم لا يظهر أي ذكر للتوقع هنا أيضًا.
  let predHtml = '';
  if(PRED_DATA.enabled){
    const targetRound = getCurrentRoundNumber() + 1;
    const roundEntries = PRED_DATA.entries[targetRound] || {};
    const myPrediction = roundEntries[MY_ID];
    const predName = myPrediction !== undefined ? (PARTICIPANTS.find(p=>p.id===Number(myPrediction))||{}).name : null;
    predHtml = predName
      ? `<div class="my-dash-pred">توقعك لبطل الجولة ${targetRound}: <b>${predName}</b></div>`
      : `<div class="my-dash-pred">لسه ما توقعت بطل الجولة ${targetRound} 🔮</div>`;
  }

  const whatINeedHtml = buildWhatINeedHTML(meRow, st, idx);

  box.style.display = 'block';
  box.innerHTML = `
    <div class="my-dash-card">
      <div class="my-dash-head">👋 أهلًا ${me.name}</div>
      <div class="my-dash-stats">
        <div class="my-dash-stat"><span class="my-dash-num">${rank}</span><span class="my-dash-label">مركزك</span></div>
        <div class="my-dash-stat"><span class="my-dash-num">${meRow.total}</span><span class="my-dash-label">نقاطك</span></div>
        <div class="my-dash-stat"><span class="my-dash-num" style="color:${moveColor};">${moveLabel}</span><span class="my-dash-label">حركتك</span></div>
      </div>
      ${rivalHtml}
      ${whatINeedHtml}
      ${predHtml}
      <button class="btn secondary" id="shareMyRankBtn" style="width:100%;margin-top:10px;">📤 شارك ترتيبي</button>
    </div>`;
  const shareBtn = document.getElementById('shareMyRankBtn');
  if(shareBtn) shareBtn.addEventListener('click', shareMyRank);
}

// نص شخصي جاهز للمشاركة بالواتساب — منفصل عن ملخص الموسم العام (خاص
// بالمنظم)، متاح لأي زائر اختار اسمه من "مين أنت؟" عشان يشارك وضعه هو بس.
function buildMyRankShareText(){
  if(MY_ID === null) return '';
  const me = PARTICIPANTS.find(p=>p.id===MY_ID);
  const st = computeStandings();
  const idx = st.findIndex(x=>x.id===MY_ID);
  if(!me || idx === -1) return '';
  const meRow = st[idx];
  const rank = idx+1;
  const rn = getCurrentRoundNumber();
  let t = `🏆 *دوري بروكي الفانتازي*\n`;
  t += `أنا ${me.name}، مركزي رقم *${rank}* برصيد *${meRow.total}* نقطة بعد الجولة ${rn} 💪\n`;
  const above = idx>0 ? st[idx-1] : null;
  const below = idx<st.length-1 ? st[idx+1] : null;
  if(above) t += `🔼 ناقصني ${above.total - meRow.total} نقطة أوصل ${above.name}\n`;
  if(below) t += `🔽 متقدم على ${below.name} بفارق ${meRow.total - below.total} نقطة\n`;
  t += `تابع الترتيب كامل: ${SITE_URL}`;
  return t;
}
function shareMyRank(){
  const text = buildMyRankShareText();
  if(!text) return;
  const url = 'https://wa.me/?text=' + encodeURIComponent(text);
  window.open(url, '_blank');
}

function computePredictionAccuracy(){
  const totals = {};
  PARTICIPANTS.forEach(p=> totals[p.id] = {correct:0, total:0});
  Object.keys(PRED_DATA.entries).forEach(roundNumStr=>{
    const champion = getRoundChampion(Number(roundNumStr));
    if(champion === null) return; // جولة قادمة لسه ما اتحسمت
    const roundEntries = PRED_DATA.entries[roundNumStr] || {};
    Object.keys(roundEntries).forEach(voterIdStr=>{
      const voterId = Number(voterIdStr);
      if(!totals[voterId]) return;
      totals[voterId].total++;
      if(Number(roundEntries[voterIdStr]) === champion) totals[voterId].correct++;
    });
  });
  return totals;
}

function renderPredictions(){
  const box = document.getElementById('predictionBox');
  if(!box) return;
  if(!PRED_DATA.enabled){
    // المنظم أخفى خانة التوقعات لهذه الفترة — تختفي تمامًا لكل الزوار.
    box.style.display = 'none';
    box.innerHTML = '';
    return;
  }
  box.style.display = '';
  const targetRound = getCurrentRoundNumber() + 1;
  const roundEntries = PRED_DATA.entries[targetRound] || {};
  const myPrediction = (MY_ID !== null) ? roundEntries[MY_ID] : undefined;

  let html = '<div class="predict-card">';
  html += `<div class="predict-title">🔮 توقّع بطل الجولة ${targetRound}</div>`;

  if(MY_ID === null){
    html += '<div class="predict-hint">اختر اسمك من "مين أنت؟" بالأعلى عشان تقدر تتوقّع</div>';
  } else {
    const options = PARTICIPANTS.map(p=>`<option value="${p.id}" ${Number(myPrediction)===p.id?'selected':''}>${p.name}</option>`).join('');
    html += `<div class="predict-row">
      <select id="predictSelect"><option value="">— اختر بطل الجولة القادمة —</option>${options}</select>
      <button class="btn" id="predictSubmitBtn">${myPrediction!==undefined?'تحديث توقعي':'أرسل توقعي'}</button>
    </div>`;
    if(myPrediction !== undefined){
      const predName = (PARTICIPANTS.find(p=>p.id===Number(myPrediction))||{}).name || '';
      html += `<div class="predict-current">توقعك الحالي: <b>${predName}</b></div>`;
    }
  }

  const totalVotes = Object.keys(roundEntries).length;
  if(totalVotes > 0){
    html += `<div class="predict-count">${totalVotes} ${totalVotes===1?'شخص توقّع':'أشخاص توقّعوا'} حتى الآن</div>`;
  }

  const acc = computePredictionAccuracy();
  const ranked = PARTICIPANTS
    .map(p=>({name:p.name, correct:acc[p.id].correct, total:acc[p.id].total}))
    .filter(a=>a.total>0)
    .sort((a,b)=> b.correct-a.correct || (b.correct/b.total)-(a.correct/a.total));
  if(ranked.length){
    html += '<div class="predict-leader-title">🏆 الأكثر توقعًا صحيحًا</div><div class="predict-leaderboard">';
    ranked.slice(0,5).forEach((r,i)=>{
      html += `<div class="predict-leader-row"><span>${i+1}. ${r.name}</span><span>${r.correct}/${r.total}</span></div>`;
    });
    html += '</div>';
  }

  html += '</div>';
  box.innerHTML = html;

  const sel = document.getElementById('predictSelect');
  const btn = document.getElementById('predictSubmitBtn');
  if(sel && btn){
    btn.addEventListener('click', async ()=>{
      if(MY_ID === null || !sel.value) return;
      if(!PRED_DATA.entries[targetRound]) PRED_DATA.entries[targetRound] = {};
      PRED_DATA.entries[targetRound][MY_ID] = Number(sel.value);
      btn.disabled = true;
      btn.textContent = 'جارٍ الحفظ...';
      const ok = await savePredictions();
      renderPredictions();
      if(!ok){
        const box2 = document.getElementById('predictionBox');
        if(box2) box2.insertAdjacentHTML('beforeend', '<div class="status-msg err">تعذّر حفظ التوقع، حاول مرة ثانية.</div>');
      }
    });
  }
}

// ---------- "ماذا أحتاج؟" مُضافة لـ renderMyDashboard ----------
function buildWhatINeedHTML(meRow, st, idx){
  if(!DATA.rounds.length) return '';
  const above = idx>0 ? st[idx-1] : null;
  const below = idx<st.length-1 ? st[idx+1] : null;
  const myLast = meRow.lastPoints || 0;

  let rows = '';
  if(above){
    const gap = above.total - meRow.total;
    const needed = gap + 1;
    rows += `<div class="my-dash-need-row"><span>للتقدم فوق <b>${above.name}</b></span><span class="my-dash-need-badge">+${needed} ن. على الأقل</span></div>`;
  }
  if(below){
    const gap = meRow.total - below.total;
    rows += `<div class="my-dash-need-row"><span>للبقاء أمام <b>${below.name}</b></span><span class="my-dash-need-badge">+${gap} ن. كافية</span></div>`;
  }
  if(!rows) return '';
  return `<div class="my-dash-need"><b>🎯 الجولة القادمة:</b>${rows}</div>`;
}

// ---------- إنجازاتي الشخصية (ميزة 6) ----------
function renderMyAchievements(){
  const box = document.getElementById('myAchievementsBox');
  if(!box) return;
  const pid = window._verifiedPid;
  if(!pid || !DATA.rounds.length){ box.innerHTML=''; return; }
  const hist = buildParticipantHistory(pid);
  if(!hist.length){ box.innerHTML=''; return; }
  const pts = hist.map(h=>h.points);
  const best = Math.max(...pts);
  const worst = Math.min(...pts);
  const bestRound = hist.find(h=>h.points===best);
  const worstRound = hist.find(h=>h.points===worst);
  const avg = pts.reduce((a,b)=>a+b,0)/pts.length;
  let streak=0, maxStreak=0;
  pts.forEach(p=>{ if(p>=avg){streak++;maxStreak=Math.max(maxStreak,streak);}else{streak=0;} });
  const stands = DATA.rounds.map((_,i)=>{
    const s = computeStandings(i+1);
    return s.findIndex(x=>x.id===pid)+1;
  });
  const bestRank = Math.min(...stands);
  const worstRank = Math.max(...stands);
  const timesFirst = stands.filter(r=>r===1).length;
  const p = PARTICIPANTS.find(x=>x.id===pid);
  const clubCount = {};
  DATA.rounds.forEach(r=>{
    const entries = r.entries&&r.entries[pid]?r.entries[pid]:[];
    entries.forEach(e=>{
      const c = (p && e && e.ti!==undefined) ? p.teams[e.ti] : null;
      if(c) clubCount[c]=(clubCount[c]||0)+1;
    });
  });
  const favClub = Object.entries(clubCount).sort((a,b)=>b[1]-a[1])[0];
  const pc = PARTICIPANT_COLORS[pid]||'var(--gold)';
  const tiles = [
    ['🔥','أفضل جولة',`${best} نقطة`,`جولة ${bestRound?.number||'–'}`],
    ['📉','أضعف جولة',`${worst} نقطة`,`جولة ${worstRound?.number||'–'}`],
    ['📊','معدلك',`${avg.toFixed(1)}`,`نقطة/جولة`],
    ['🏆','أفضل مركز',`#${bestRank}`,''],
    ['😓','أسوأ مركز',`#${worstRank}`,''],
    ['👑','مرات في الصدارة',`${timesFirst}`,timesFirst===0?'لم تتصدر بعد':'مرة'],
    ['💪','أطول سلسلة ≥ معدل',`${maxStreak}`,'جولة متتالية'],
    ['⚽','ناديك المفضل',favClub?favClub[0]:'—',favClub?`${favClub[1]} مرات`:''],
  ];
  box.innerHTML=`<h2 class="section-title" style="margin-top:22px;">⭐ إنجازاتي الشخصية</h2>
    <div style="background:var(--paper);border-radius:14px;padding:16px;border:2px solid ${pc}44;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <span style="width:12px;height:12px;border-radius:50%;background:${pc};display:inline-block;"></span>
        <strong style="color:${pc};">${p?.name||''}</strong>
        <span style="color:var(--muted);font-size:0.82rem;">— ${DATA.rounds.length} جولات</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:9px;">
        ${tiles.map(([ic,label,val,sub])=>`<div style="background:var(--cream);border-radius:10px;padding:10px 8px;text-align:center;">
          <div style="font-size:1.3rem;">${ic}</div>
          <div style="font-size:0.7rem;color:var(--muted);margin:2px 0;">${label}</div>
          <div style="font-size:0.98rem;font-weight:800;color:var(--gold);">${val}</div>
          ${sub?`<div style="font-size:0.68rem;color:var(--muted);">${sub}</div>`:''}
        </div>`).join('')}
      </div>
    </div>`;
}
