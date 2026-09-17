/* سؤال/استطلاع الجولة (ميزة 8 من حزمة المحتوى الطازج — أُضيفت 15 سبتمبر
 * 2026). المنظم يكتب سؤالًا مخصصًا بخيارات حرة لكل جولة قادمة (مختلف عن
 * "تحدي الجولة" الثابت في rounds-tab.js الذي يسأل تحديدًا "من سيتصدر؟")،
 * والمشاركون يصوّتون. البيانات داخل DATA.roundPolls (مثل نمط
 * DATA.roundComments لتحدي الجولة) فتُحفظ وتُستعاد تلقائيًا مع بقية بيانات
 * الجولات — لا حاجة لأي تعديل إضافي بالنسخة الاحتياطية/الاستيراد.
 * البنية: DATA.roundPolls[roundNumber] = {question, options:[...], votes:{pid:index}}
 */

function _pollTargetRound(){
  // طلب المستخدم 17 سبتمبر 2026 — الاعتماد على DATA.rounds.length مباشرة كان
  // يمنع سؤال أي جولة (حتى الجولة 3) طالما لم تُسجَّل أي جولة حقيقية بعد،
  // رغم أن الجولتين 1 و2 (جسر) منتهيتان فعليًا؛ getCurrentRoundNumber() تحسبهما.
  return getCurrentRoundNumber() + 1;
}

function getCurrentRoundPoll(){
  const rn = _pollTargetRound();
  if(rn === null) return null;
  return (DATA.roundPolls && DATA.roundPolls[rn]) || null;
}

// ---------- أدوات المنظم: نشر/مسح السؤال ----------
async function publishRoundPoll(question, optionsArr){
  const rn = _pollTargetRound();
  if(rn === null) return false;
  if(!DATA.roundPolls) DATA.roundPolls = {};
  DATA.roundPolls[rn] = {question: question.trim(), options: optionsArr.map(o=>o.trim()).filter(Boolean), votes: {}};
  const ok = await saveData();
  renderRoundPoll();
  return ok;
}

async function clearRoundPoll(){
  const rn = _pollTargetRound();
  if(rn === null || !DATA.roundPolls) return false;
  delete DATA.roundPolls[rn];
  const ok = await saveData();
  renderRoundPoll();
  return ok;
}

async function castRoundPollVote(optionIndex){
  const pid = window._verifiedPid;
  const rn = _pollTargetRound();
  if(!pid || rn === null || !DATA.roundPolls || !DATA.roundPolls[rn]) return;
  DATA.roundPolls[rn].votes[pid] = optionIndex;
  await saveData();
  renderRoundPoll();
}

document.getElementById('publishRoundPollBtn')?.addEventListener('click', async ()=>{
  const qEl = document.getElementById('roundPollQuestionInput');
  const oEl = document.getElementById('roundPollOptionsInput');
  const msg = document.getElementById('roundPollAdminMsg');
  const question = (qEl?.value || '').trim();
  const options = (oEl?.value || '').split(',').map(o=>o.trim()).filter(Boolean);
  if(!question || options.length < 2){
    if(msg) msg.innerHTML = '<div class="status-msg err">اكتب سؤالًا وخيارين على الأقل (مفصولة بفواصل).</div>';
    return;
  }
  const ok = await publishRoundPoll(question, options);
  if(msg) msg.innerHTML = ok
    ? '<div class="status-msg ok">تم نشر سؤال الجولة ✅</div>'
    : '<div class="status-msg err">تعذّر النشر، حاول مرة ثانية.</div>';
  if(ok){ if(qEl) qEl.value=''; if(oEl) oEl.value=''; }
});

document.getElementById('clearRoundPollBtn')?.addEventListener('click', async ()=>{
  const msg = document.getElementById('roundPollAdminMsg');
  const ok = await clearRoundPoll();
  if(msg) msg.innerHTML = ok
    ? '<div class="status-msg ok">تم مسح سؤال الجولة.</div>'
    : '<div class="status-msg err">تعذّر المسح.</div>';
});

// ---------- عرض المشاركين ----------
function renderRoundPoll(){
  const box = document.getElementById('roundPollBox');
  if(!box) return;
  if(DATA.roundPollEnabled === false){ box.innerHTML=''; return; }

  const rn = _pollTargetRound();
  const poll = getCurrentRoundPoll();
  if(!poll){ box.innerHTML=''; return; }

  const pid = window._verifiedPid;
  const votes = poll.votes || {};
  const myVoteIdx = pid !== null && pid !== undefined ? votes[pid] : undefined;
  const canVote = pid && myVoteIdx === undefined;

  const counts = new Array(poll.options.length).fill(0);
  Object.values(votes).forEach(idx=>{ if(counts[idx] !== undefined) counts[idx]++; });
  const total = counts.reduce((a,b)=>a+b, 0);

  let html = `<h2 class="section-title" style="margin-top:22px;">🗳️ سؤال الجولة ${rn}</h2>
    <div class="round-poll-card">
      <div class="round-poll-question">${poll.question}</div>
      ${!pid ? '<div class="rc-locked">🔒 سجّل دخولك للتصويت</div>' : ''}`;

  if(canVote){
    html += `<div class="round-poll-options">`;
    poll.options.forEach((opt, i)=>{
      html += `<button type="button" class="btn secondary round-poll-opt-btn" data-idx="${i}">${opt}</button>`;
    });
    html += `</div>`;
  } else if(pid && myVoteIdx !== undefined){
    html += `<div class="round-poll-my-vote">✅ صوّتت لـ: <strong>${poll.options[myVoteIdx] ?? '—'}</strong></div>`;
  }

  if(total > 0){
    html += `<div class="round-poll-results">`;
    poll.options.forEach((opt, i)=>{
      const pct = total ? Math.round(counts[i]/total*100) : 0;
      html += `<div class="round-poll-result-row">
        <div class="round-poll-result-label"><span>${opt}</span><span>${counts[i]} (${pct}%)</span></div>
        <div class="round-poll-bar-track"><div class="round-poll-bar-fill" style="width:${pct}%;"></div></div>
      </div>`;
    });
    html += `</div>`;
  } else {
    html += `<div class="wall-empty">لا تصويتات بعد — كن أول من يصوّت!</div>`;
  }

  html += `</div>`;
  box.innerHTML = html;

  box.querySelectorAll('.round-poll-opt-btn').forEach(btn=>{
    btn.addEventListener('click', ()=> castRoundPollVote(Number(btn.dataset.idx)));
  });
}
