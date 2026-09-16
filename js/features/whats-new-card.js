/* بطاقات "اللي فاتك" (ميزة 6 من حزمة المحتوى الطازج — أُضيفت 15 سبتمبر
 * 2026). عند تعريف مشارك نفسه، إذا مرّت جولة أو أكثر منذ آخر مرة تعرّف
 * فيها من هذا الجهاز، تُعرض بطاقة تلخّص ما فاته: عدد الجولات، بطل آخر
 * جولة، وحركة مركزه بجدول الترتيب. "آخر مرة شاهد" محلية بالجهاز فقط
 * (localStorage) — بيانات عرض مؤقتة لا تخص قاعدة البيانات المشتركة،
 * فلا داعي لشمولها بالنسخة الاحتياطية (نفس منطق brookie-my-id بملف
 * my-dashboard.js).
 */

function _wnLastSeenKey(pid){ return 'brookie_last_seen_round_' + pid; }

function getLastSeenRound(pid){
  try{
    const raw = localStorage.getItem(_wnLastSeenKey(pid));
    return raw !== null ? Number(raw) : null;
  }catch(e){ return null; }
}
function setLastSeenRound(pid, roundNum){
  try{ localStorage.setItem(_wnLastSeenKey(pid), String(roundNum)); }catch(e){}
}

// فهرس computeStandings(upTo) المطابق لرقم جولة معيّن (رقم الجولة != فهرس
// DATA.rounds لأن الجولتين 1 و2 جسر تاريخي خارج المصفوفة — نفس النمط
// المستخدم بـ stats-tab.js لحساب بطل جولة سابقة بالضبط).
function _wnRoundIndexFor(roundNum){
  if(roundNum <= CURRENT_BASE_ROUND) return 0;
  const idx = DATA.rounds.findIndex(r=>r.number===roundNum);
  return idx < 0 ? DATA.rounds.length : idx+1;
}
function _wnRankAtRound(pid, roundNum){
  const st = computeStandings(_wnRoundIndexFor(roundNum));
  const i = st.findIndex(s=>s.id===pid);
  return i < 0 ? null : i+1;
}

function renderWhatsNewCard(){
  const box = document.getElementById('whatsNewCardBox');
  if(!box) return;
  if(DATA.whatsNewEnabled === false){ box.innerHTML=''; return; }

  const myPid = window._verifiedPid || null;
  if(!myPid){ box.innerHTML=''; return; }

  const currentRound = getCurrentRoundNumber();
  const lastSeen = getLastSeenRound(myPid);

  // أول مرة يتعرّف فيها هذا المشارك من هذا الجهاز — ما فيه "فاتك" لعرضه بعد،
  // فقط نسجّل نقطة البداية.
  if(lastSeen === null){
    box.innerHTML = '';
    setLastSeenRound(myPid, currentRound);
    return;
  }

  if(lastSeen >= currentRound){
    box.innerHTML = '';
    return;
  }

  const missedRounds = currentRound - lastSeen;
  const heroes = getRoundHeroes();
  const prevRank = _wnRankAtRound(myPid, lastSeen);
  const curRank = _wnRankAtRound(myPid, currentRound);
  const rankDelta = (prevRank !== null && curRank !== null) ? (prevRank - curRank) : null;

  const lines = [];
  lines.push(`⏳ فاتك ${missedRounds} ${missedRounds===1 ? 'جولة' : 'جولات'} من دوري بروكي!`);
  if(heroes && heroes.top){
    lines.push(`👑 بطل آخر جولة: <strong>${heroes.top.name}</strong> بـ ${heroes.top.points} نقطة.`);
  }
  if(rankDelta !== null){
    if(rankDelta > 0) lines.push(`📈 تقدّمت <strong>${rankDelta}</strong> ${rankDelta===1?'مركز':'مراكز'} بجدول الترتيب منذ آخر زيارة لك.`);
    else if(rankDelta < 0) lines.push(`📉 تراجعت <strong>${Math.abs(rankDelta)}</strong> ${Math.abs(rankDelta)===1?'مركز':'مراكز'} بجدول الترتيب منذ آخر زيارة لك.`);
    else lines.push('📊 مركزك بجدول الترتيب ثابت زي ما تركته.');
  }

  box.innerHTML = `
    <div class="whats-new-card">
      <div class="whats-new-title">🎁 اللي فاتك</div>
      <div class="whats-new-body">${lines.map(l=>`<div class="whats-new-line">${l}</div>`).join('')}</div>
      <button type="button" class="btn ghost" id="whatsNewDismissBtn">تمام، فهمت ✅</button>
    </div>`;

  // تُسجَّل هذي الجولة كـ"آخر ما شاهده" فورًا (لا داعي لانتظار ضغط الزر —
  // نفس منطق "قرأتها بمجرد ظهورها" المتّبع ببقية بطاقات الموقع).
  setLastSeenRound(myPid, currentRound);

  const dismissBtn = document.getElementById('whatsNewDismissBtn');
  if(dismissBtn) dismissBtn.addEventListener('click', ()=>{ box.innerHTML=''; });
}
