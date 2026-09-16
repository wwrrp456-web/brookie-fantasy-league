/* الملف الشخصي الكامل لكل مشارك (ميزة 7 من حزمة المحتوى الطازج — أُضيفت
 * 15 سبتمبر 2026). يُفتح/يُطوى تحت كرت المشارك بتبويب "المشاركون" (زر
 * "📋 الملف الكامل" المُضاف بـ participants-tab.js)، ويجمع: تاريخ كل
 * جولة بالتفصيل (بدل السباركلاين المختصر بالكرت)، أوسمته الشخصية من بين
 * أوسمة الموسم العامة (computeBadges/computeExtendedBadges)، وسجل نزال
 * الموسم إن وُجد (من season-duel.js — قراءة فقط، لا تعديل).
 * لا يخزّن أي بيانات جديدة بقاعدة البيانات (كل شيء محسوب من DATA/رونداتها
 * الموجودة أصلاً)، فلا حاجة لأي تعديل بالنسخة الاحتياطية.
 */

let _openParticipantProfiles = new Set();

function toggleParticipantProfile(pid){
  const box = document.getElementById(`profile-detail-${pid}`);
  if(!box) return;
  const isOpen = box.style.display !== 'none';
  if(isOpen){
    box.style.display = 'none';
    _openParticipantProfiles.delete(pid);
  } else {
    renderParticipantProfileInto(box, pid);
    box.style.display = '';
    _openParticipantProfiles.add(pid);
  }
}

// يُستدعى من renderParticipants() بعد كل إعادة رسم عشان يبقى أي ملف مفتوح
// مفتوحًا (بدل ما ينطوي مع كل تحديث بيانات).
function reopenParticipantProfiles(){
  _openParticipantProfiles.forEach(pid=>{
    const box = document.getElementById(`profile-detail-${pid}`);
    if(box){ renderParticipantProfileInto(box, pid); box.style.display=''; }
    else { _openParticipantProfiles.delete(pid); }
  });
}

function _profileSeasonDuelRecord(pid){
  if(typeof _seasonDuels === 'undefined') return null;
  let wins=0, losses=0, ties=0, active=0;
  Object.values(_seasonDuels).forEach(d=>{
    if(d.status !== 'accepted') return;
    if(d.challengerPid !== pid && d.opponentPid !== pid) return;
    const status = computeDuelStatus(d);
    if(status.phase === 'in_progress'){ active++; return; }
    if(status.phase !== 'completed') return;
    if(status.winnerPid === null) ties++;
    else if(status.winnerPid === pid) wins++;
    else losses++;
  });
  if(!wins && !losses && !ties && !active) return null;
  return {wins, losses, ties, active};
}

function renderParticipantProfileInto(box, pid){
  const p = PARTICIPANTS.find(x=>x.id===pid);
  if(!p) return;
  const history = buildParticipantHistory(pid);

  const rowsHTML = history.length
    ? history.map(h=>{
        const cls = h.points===0 ? 'profile-row-mumma' : h.points>=10 ? 'profile-row-great' : '';
        return `<tr class="${cls}">
          <td>ج${h.number}</td>
          <td>${h.points}</td>
          <td>${h.cumulative}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="3" style="text-align:center;color:var(--muted);">لا جولات بعد</td></tr>`;

  const allBadges = [...computeBadges(), ...computeExtendedBadges()];
  const myBadges = allBadges.filter(b=> b.names.split('، ').includes(p.name));

  const duelRecord = _profileSeasonDuelRecord(pid);

  let html = `<div class="profile-detail-inner" id="profileCapture-${pid}">
    <div class="profile-detail-title">📋 ملف ${p.name} الكامل</div>
    <div class="profile-detail-grid">
      <div class="profile-detail-col">
        <div class="profile-col-title">تاريخ الجولات</div>
        <table class="profile-history-table">
          <thead><tr><th>الجولة</th><th>النقاط</th><th>التراكمي</th></tr></thead>
          <tbody>${rowsHTML}</tbody>
        </table>
      </div>
      <div class="profile-detail-col">
        <div class="profile-col-title">🏅 أوسمته الشخصية</div>
        ${myBadges.length
          ? `<div class="profile-badges-list">${myBadges.map(b=>`<div class="profile-badge-row"><span class="profile-badge-icon">${b.icon}</span><span>${b.title} — ${b.detail}</span></div>`).join('')}</div>`
          : `<div class="wall-empty">لا أوسمة شخصية بعد.</div>`}
        ${duelRecord ? `
        <div class="profile-col-title" style="margin-top:12px;">🥊 سجل نزال الموسم</div>
        <div class="profile-duel-record">${duelRecord.wins} فوز · ${duelRecord.losses} خسارة · ${duelRecord.ties} تعادل${duelRecord.active?` · ${duelRecord.active} جارٍ`:''}</div>
        ` : ''}
      </div>
    </div>
    <button type="button" class="btn ghost" id="dlProfileBtn-${pid}" style="margin-top:10px;">⬇️ تحميل الملف كصورة</button>
    <div id="profileMsg-${pid}"></div>
  </div>`;

  box.innerHTML = html;
  const dlBtn = document.getElementById(`dlProfileBtn-${pid}`);
  if(dlBtn){
    dlBtn.addEventListener('click', ()=>{
      downloadElementAsImage(`profileCapture-${pid}`, `ملف-${p.name}.png`, `profileMsg-${pid}`, `dlProfileBtn-${pid}`);
    });
  }
}

document.addEventListener('click', function(e){
  const btn = e.target.closest('.profile-toggle-btn');
  if(btn){ toggleParticipantProfile(Number(btn.dataset.pid)); }
});
