/* نزال الموسم (ميزة 4 من حزمة التفاعل الاجتماعي — أُضيفت 15 سبتمبر 2026) */
// تحدٍّ بين مشاركَين على 3 جولات قادمة متتالية: إرسال، قبول/رفض، ثم نتيجة
// تُحسب تلقائيًا (لا تُكتب يدويًا) بمجرد اكتمال بيانات الجولات الثلاث في
// DATA.rounds — يتفادى هذا أي تعارض كتابة بين طرفين يحاولان "يقفلوا" النتيجة
// بنفس اللحظة. البنية: brookie/season-duels/<pushKey> =
//   {challengerPid, opponentPid, startRound, status, createdAt, respondedAt}
// status: pending | accepted | declined | cancelled (الفوز/الخسارة محسوبة
// حيًا من status==='accepted' + بيانات الجولات، مو حقلًا مخزَّنًا).

let _seasonDuelsListenerStarted = false;
let _seasonDuels = {}; // { [pushKey]: {...} }

function ensureSeasonDuelsListener(){
  if(_seasonDuelsListenerStarted) return;
  try{
    const db = _fbInit();
    db.ref('brookie/season-duels').on('value', snap=>{
      _seasonDuels = snap.exists() ? (snap.val() || {}) : {};
      renderSeasonDuel();
      renderMySeasonDuels();
    }, err=>{ console.warn('تعذّرت مزامنة نزالات الموسم:', err); });
    _seasonDuelsListenerStarted = true;
  }catch(e){ console.warn('تعذّر تفعيل نزال الموسم:', e); }
}

// نقاط مشارك بجولة معيّنة (rounds 3+ فقط — نزال الموسم يبدأ دائمًا من جولة
// قادمة، فلا حاجة لدعم رصيد الجولتين 1/2 التاريخي هنا)
function getDuelRoundPoints(pid, roundNum){
  const hist = buildParticipantHistory(pid);
  const entry = hist.find(h=>h.number===roundNum);
  return entry ? entry.points : null;
}

function computeDuelStatus(duel){
  if(duel.status !== 'accepted'){
    return {phase: duel.status}; // pending | declined | cancelled
  }
  const rounds = [duel.startRound, duel.startRound+1, duel.startRound+2];
  const aPts = rounds.map(rn=>getDuelRoundPoints(duel.challengerPid, rn));
  const bPts = rounds.map(rn=>getDuelRoundPoints(duel.opponentPid, rn));
  const allPlayed = aPts.every(p=>p!==null) && bPts.every(p=>p!==null);
  const aSum = aPts.reduce((s,p)=>s+(p||0),0);
  const bSum = bPts.reduce((s,p)=>s+(p||0),0);
  if(!allPlayed){
    return {phase:'in_progress', aSum, bSum, played: aPts.filter(p=>p!==null).length, rounds};
  }
  let winnerPid = null;
  if(aSum > bSum) winnerPid = duel.challengerPid;
  else if(bSum > aSum) winnerPid = duel.opponentPid;
  return {phase:'completed', aSum, bSum, winnerPid, rounds};
}

function participantName(pid){
  const p = PARTICIPANTS.find(x=>x.id===Number(pid));
  return p ? p.name : '؟';
}

// هل يوجد بين هذين الطرفين نزال لسه ما خلص (pending أو accepted لم يكتمل)؟
function hasOpenDuelBetween(pidA, pidB){
  return Object.values(_seasonDuels).some(d=>{
    const pair = (d.challengerPid===pidA && d.opponentPid===pidB) || (d.challengerPid===pidB && d.opponentPid===pidA);
    if(!pair) return false;
    if(d.status==='pending' || d.status==='accepted' && computeDuelStatus(d).phase!=='completed') return true;
    return false;
  });
}

async function sendSeasonDuel(opponentPid, myPid){
  const msg = document.getElementById('seasonDuelFormMsg');
  if(hasOpenDuelBetween(myPid, opponentPid)){
    if(msg) msg.innerHTML = '<div class="status-msg err">فيه نزال قائم بينكم أصلًا — أكمله أول.</div>';
    return;
  }
  try{
    const db = _fbInit();
    await db.ref('brookie/season-duels').push({
      challengerPid: myPid, opponentPid,
      startRound: getCurrentRoundNumber()+1,
      status: 'pending', createdAt: Date.now()
    });
    if(msg) msg.innerHTML = '<div class="status-msg ok">أُرسل التحدي — بانتظار قبوله ✅</div>';
  }catch(e){
    if(msg) msg.innerHTML = '<div class="status-msg err">تعذّر إرسال التحدي، حاول مرة ثانية.</div>';
  }
}

async function respondSeasonDuel(key, accept){
  try{
    const db = _fbInit();
    await db.ref(`brookie/season-duels/${key}`).update({
      status: accept ? 'accepted' : 'declined', respondedAt: Date.now()
    });
  }catch(e){ /* المزامنة اللحظية تعكس الحالة الفعلية بأي حال */ }
}

async function cancelSeasonDuel(key){
  try{
    const db = _fbInit();
    await db.ref(`brookie/season-duels/${key}`).update({status:'cancelled', respondedAt:Date.now()});
  }catch(e){ /* تجاهل */ }
}

function duelStatusLabel(duel, status){
  if(status.phase==='pending') return '⏳ بانتظار الرد';
  if(status.phase==='declined') return '❌ مرفوض';
  if(status.phase==='cancelled') return '🚫 مُلغى';
  if(status.phase==='in_progress') return `⚔️ جارٍ (${status.played}/3 جولات)`;
  if(status.phase==='completed'){
    if(status.winnerPid===null) return '🤝 تعادل';
    return `🏆 فاز ${participantName(status.winnerPid)}`;
  }
  return '';
}

function duelCardHTML(key, duel, myPid){
  const status = computeDuelStatus(duel);
  const isChallenger = duel.challengerPid === myPid;
  const isOpponent = duel.opponentPid === myPid;
  let actions = '';
  if(status.phase==='pending' && isOpponent){
    actions = `<div class="duel-card-actions">
      <button type="button" class="btn secondary sd-accept-btn" data-key="${key}">✅ قبول</button>
      <button type="button" class="btn ghost sd-decline-btn" data-key="${key}">❌ رفض</button>
    </div>`;
  } else if(status.phase==='pending' && isChallenger){
    actions = `<div class="duel-card-actions">
      <button type="button" class="btn ghost sd-cancel-btn" data-key="${key}">🚫 إلغاء الطلب</button>
    </div>`;
  }
  const scoreLine = (status.phase==='in_progress' || status.phase==='completed')
    ? `<div class="duel-card-score">${participantName(duel.challengerPid)} ${status.aSum} — ${status.bSum} ${participantName(duel.opponentPid)}</div>`
    : '';
  return `<div class="duel-card season-duel-card">
    <div class="duel-card-title">${participantName(duel.challengerPid)} ⚔️ ${participantName(duel.opponentPid)}</div>
    <div class="duel-card-sub">يبدأ من الجولة ${duel.startRound} · ${duelStatusLabel(duel, status)}</div>
    ${scoreLine}
    ${actions}
  </div>`;
}

function renderSeasonDuel(){
  const box = document.getElementById('seasonDuelBox');
  if(!box) return;
  if(DATA.seasonDuelEnabled === false){
    box.innerHTML = '';
    return;
  }
  ensureSeasonDuelsListener();

  const myPid = window._verifiedPid || null;
  if(!myPid){
    box.innerHTML = `<h2 class="section-title" style="margin-top:22px;">🥊 نزال الموسم</h2>
      <span class="rc-locked">🔒 اختر اسمك وأدخل رمزك لإرسال أو قبول نزال الموسم</span>`;
    return;
  }

  const opts = PARTICIPANTS.filter(p=>p.id!==myPid).map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
  const myDuels = Object.entries(_seasonDuels)
    .filter(([,d])=> d.challengerPid===myPid || d.opponentPid===myPid)
    .sort((a,b)=> (b[1].createdAt||0)-(a[1].createdAt||0));

  let html = '<h2 class="section-title" style="margin-top:22px;">🥊 نزال الموسم</h2>';
  html += `<p class="rounds-subtitle" style="margin-top:0;">تحدَّ أي مشارك على 3 جولات قادمة — الأعلى مجموع نقاط بالثلاث جولات يفوز.</p>`;
  html += `<div class="duel-picker">
    <select id="seasonDuelOpponentSelect">${opts}</select>
    <button type="button" class="btn" id="sendSeasonDuelBtn">إرسال التحدي ⚔️</button>
  </div>
  <div id="seasonDuelFormMsg"></div>`;

  if(myDuels.length){
    html += '<div class="duels-grid" style="margin-top:12px;">' + myDuels.map(([k,d])=>duelCardHTML(k,d,myPid)).join('') + '</div>';
  } else {
    html += '<div class="wall-empty">لا نزالات لك بعد — كن أول من يبدأ واحدًا!</div>';
  }
  box.innerHTML = html;

  document.getElementById('sendSeasonDuelBtn').addEventListener('click', ()=>{
    const sel = document.getElementById('seasonDuelOpponentSelect');
    if(sel && sel.value) sendSeasonDuel(Number(sel.value), myPid);
  });
}

// ملخص صغير لنزالاتي بلوحتي الشخصية (يسدّ متطلب "نتيجة تظهر بملف كل منهما")
function renderMySeasonDuels(){
  const box = document.getElementById('mySeasonDuelsBox');
  if(!box) return;
  if(DATA.seasonDuelEnabled === false){
    box.innerHTML = '';
    return;
  }
  const myPid = window._verifiedPid || null;
  if(!myPid){ box.innerHTML=''; return; }
  const myDuels = Object.entries(_seasonDuels).filter(([,d])=> d.challengerPid===myPid || d.opponentPid===myPid);
  if(!myDuels.length){ box.innerHTML=''; return; }
  const rows = myDuels.map(([k,d])=>{
    const status = computeDuelStatus(d);
    const opp = d.challengerPid===myPid ? d.opponentPid : d.challengerPid;
    return `<div class="my-duel-row">🥊 ضد ${participantName(opp)} — ${duelStatusLabel(d, status)}</div>`;
  }).join('');
  box.innerHTML = `<div class="my-duels-summary"><div class="my-duels-title">نزالات موسمي</div>${rows}</div>`;
}

document.addEventListener('click', function(e){
  const acceptBtn = e.target.closest('.sd-accept-btn');
  if(acceptBtn){ respondSeasonDuel(acceptBtn.dataset.key, true); return; }
  const declineBtn = e.target.closest('.sd-decline-btn');
  if(declineBtn){ respondSeasonDuel(declineBtn.dataset.key, false); return; }
  const cancelBtn = e.target.closest('.sd-cancel-btn');
  if(cancelBtn){ cancelSeasonDuel(cancelBtn.dataset.key); return; }
});
