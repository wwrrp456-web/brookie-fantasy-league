/* مجموعات فرعية بلوحة صدارة مصغّرة (ميزة 9 من حزمة العمق التنافسي —
 * أُضيفت 15 سبتمبر 2026). المنظم يُنشئ مجموعات (مثال: "شباب الحارة" /
 * "زملاء الشغل") ويحدد أعضاءها من المشاركين، وتُعرض لكل مجموعة لوحة
 * صدارة مصغّرة (نفس نقاط الترتيب العام computeStandings لكن مُعاد ترقيمها
 * 1..ن داخل المجموعة فقط). البيانات DATA.subGroups = [{id,name,memberPids}]
 * — جزء من DATA فتُحفظ وتُستعاد تلقائيًا مع النسخة الاحتياطية الحالية.
 * تعديل الأعضاء بعد الإنشاء يكون بحذف المجموعة وإعادة إنشائها (تبسيط
 * متعمّد لتفادي واجهة تعديل معقّدة لحالة استخدام نادرة).
 */

async function createSubGroup(name, memberPids){
  if(!DATA.subGroups) DATA.subGroups = [];
  const id = 'sg_' + Date.now();
  DATA.subGroups.push({id, name: name.trim(), memberPids: memberPids.slice()});
  const ok = await saveData();
  renderSubGroups();
  renderAdminSubGroupsList();
  return ok;
}

async function deleteSubGroup(id){
  if(!DATA.subGroups) return false;
  DATA.subGroups = DATA.subGroups.filter(g=>g.id!==id);
  const ok = await saveData();
  renderSubGroups();
  renderAdminSubGroupsList();
  return ok;
}

// ---------- عرض المشاركين: لوحات الصدارة المصغّرة ----------
function renderSubGroups(){
  const box = document.getElementById('subGroupsBox');
  if(!box) return;
  if(DATA.subGroupsEnabled === false){ box.innerHTML=''; return; }
  const groups = DATA.subGroups || [];
  if(!groups.length){ box.innerHTML=''; return; }

  const standings = computeStandings();
  const totalMap = {};
  standings.forEach(s=> totalMap[s.id] = s.total);

  let html = `<h2 class="section-title" style="margin-top:22px;">👥 المجموعات الفرعية</h2>
    <div class="sub-groups-grid">`;
  groups.forEach(g=>{
    const members = g.memberPids
      .map(pid=> PARTICIPANTS.find(p=>p.id===pid))
      .filter(Boolean)
      .map(p=> ({id:p.id, name:p.name, total: totalMap[p.id]||0}))
      .sort((a,b)=> b.total - a.total);
    html += `<div class="sub-group-card">
      <div class="sub-group-title">${g.name}</div>
      <div class="sub-group-list">
        ${members.map((m,i)=>`<div class="sub-group-row">
          <span class="sub-group-rank">${i+1}</span>
          <span class="sub-group-name">${m.name}</span>
          <span class="sub-group-total">${m.total}</span>
        </div>`).join('')}
      </div>
    </div>`;
  });
  html += `</div>`;
  box.innerHTML = html;
}

// ---------- لوحة المنظم: إنشاء/حذف المجموعات ----------
function renderAdminSubGroupsList(){
  const box = document.getElementById('subGroupsAdminList');
  if(!box) return;
  const groups = DATA.subGroups || [];
  if(!groups.length){
    box.innerHTML = '<div style="color:var(--muted);font-size:0.8rem;">لا مجموعات بعد.</div>';
    return;
  }
  box.innerHTML = groups.map(g=>{
    const names = g.memberPids.map(pid=> (PARTICIPANTS.find(p=>p.id===pid)||{}).name).filter(Boolean).join('، ');
    return `<div class="sub-group-admin-row">
      <div><strong>${g.name}</strong><br><span style="font-size:0.75rem;color:var(--muted);">${names}</span></div>
      <button type="button" class="btn ghost sub-group-delete-btn" data-id="${g.id}">🗑️ حذف</button>
    </div>`;
  }).join('');
}

function renderSubGroupMemberCheckboxes(){
  const box = document.getElementById('subGroupMembersCheckboxes');
  if(!box) return;
  box.innerHTML = PARTICIPANTS.map(p=>`
    <label class="sub-group-member-check">
      <input type="checkbox" value="${p.id}"> ${p.name}
    </label>`).join('');
}

document.getElementById('createSubGroupBtn')?.addEventListener('click', async ()=>{
  const nameEl = document.getElementById('subGroupNameInput');
  const msg = document.getElementById('subGroupsAdminMsg');
  const name = (nameEl?.value || '').trim();
  const checked = Array.from(document.querySelectorAll('#subGroupMembersCheckboxes input:checked')).map(c=>Number(c.value));
  if(!name || checked.length < 2){
    if(msg) msg.innerHTML = '<div class="status-msg err">اكتب اسمًا واختر عضوين على الأقل.</div>';
    return;
  }
  const ok = await createSubGroup(name, checked);
  if(msg) msg.innerHTML = ok
    ? '<div class="status-msg ok">تم إنشاء المجموعة ✅</div>'
    : '<div class="status-msg err">تعذّر الحفظ، حاول مرة ثانية.</div>';
  if(ok){
    if(nameEl) nameEl.value='';
    document.querySelectorAll('#subGroupMembersCheckboxes input:checked').forEach(c=>c.checked=false);
  }
});

document.addEventListener('click', function(e){
  const delBtn = e.target.closest('.sub-group-delete-btn');
  if(delBtn){
    deleteSubGroup(delBtn.dataset.id);
  }
});
