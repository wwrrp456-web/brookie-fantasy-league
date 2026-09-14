/* التحكم الإداري في بطل الموسم من لوحة المنظم */

// ════════ لوحة المنظم: تعبئة القائمة المنسدلة، سجل الأبطال، ومفاتيح الميزات ════════
function populateChampionSelect(){
  const sel = document.getElementById('championSelect');
  if(!sel) return;
  sel.innerHTML = '<option value="">بدون بطل حاليًا</option>' + PARTICIPANTS.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
  sel.value = CHAMPION_ID ? String(CHAMPION_ID) : '';
}
function renderChampionArchiveAdmin(){
  const box = document.getElementById('championArchiveRows');
  if(!box) return;
  if(!SEASON_CHAMPIONS_ARCHIVE.length){ box.innerHTML = '<div style="color:var(--muted);font-size:0.8rem;">لا يوجد أي موسم مسجّل بعد.</div>'; return; }
  box.innerHTML = SEASON_CHAMPIONS_ARCHIVE.map((row,i)=>`
    <div class="hof-row">
      <span><b>${row.season}</b> — ${row.name} (${row.points} نقطة)</span>
      <button type="button" class="btn ghost archive-del-btn" data-idx="${i}" style="font-size:0.7rem;padding:4px 10px;">🗑️ حذف</button>
    </div>`).join('');
}
function syncChampionAdminUI(){
  populateChampionSelect();
  renderChampionArchiveAdmin();
  CHAMPION_FEATURE_KEYS.forEach(k=>{
    const cb = document.getElementById('cf_'+k);
    if(cb) cb.checked = !!CHAMPION_FEATURES[k];
  });
}

const championSelectEl = document.getElementById('championSelect');
if(championSelectEl){
  championSelectEl.addEventListener('change', async ()=>{
    const val = championSelectEl.value;
    CHAMPION_ID = val ? Number(val) : null;
    await window.storage.set('currentChampionId', CHAMPION_ID, true);
    logAdminActivity(CHAMPION_ID ? `تعيين ${(PARTICIPANTS.find(p=>p.id===CHAMPION_ID)||{}).name||''} بطلًا للموسم الحالي` : 'إلغاء تعيين بطل الموسم الحالي');
    await saveData();
    renderAll();
  });
}

const addArchiveRowBtnEl = document.getElementById('addArchiveRowBtn');
if(addArchiveRowBtnEl){
  addArchiveRowBtnEl.addEventListener('click', async ()=>{
    const seasonInput = document.getElementById('archiveSeasonInput');
    const nameInput = document.getElementById('archiveNameInput');
    const pointsInput = document.getElementById('archivePointsInput');
    const msg = document.getElementById('archiveMsg');
    const season = seasonInput.value.trim();
    const name = nameInput.value.trim();
    const pts = Number(pointsInput.value);
    if(!season || !name || !Number.isFinite(pts)){
      msg.innerHTML = '<div class="status-msg err">عبّي اسم الموسم واسم البطل والنقاط أولاً.</div>';
      return;
    }
    SEASON_CHAMPIONS_ARCHIVE.push({season, name, points:pts});
    await window.storage.set('seasonChampionsArchive', SEASON_CHAMPIONS_ARCHIVE, true);
    logAdminActivity(`إضافة ${name} لسجل أبطال المواسم (${season})`);
    seasonInput.value=''; nameInput.value=''; pointsInput.value='';
    msg.innerHTML = '<div class="status-msg ok">أُضيف بنجاح.</div>';
    renderChampionArchiveAdmin();
    renderHallOfFame();
  });
}

const championArchiveRowsEl = document.getElementById('championArchiveRows');
if(championArchiveRowsEl){
  championArchiveRowsEl.addEventListener('click', async (e)=>{
    const btn = e.target.closest('.archive-del-btn');
    if(!btn) return;
    const idx = Number(btn.dataset.idx);
    const row = SEASON_CHAMPIONS_ARCHIVE[idx];
    if(!row) return;
    const ok = await customConfirm(`حذف "${row.name} — ${row.season}" من سجل أبطال المواسم؟`, {confirmText:'حذف'});
    if(!ok) return;
    SEASON_CHAMPIONS_ARCHIVE.splice(idx,1);
    await window.storage.set('seasonChampionsArchive', SEASON_CHAMPIONS_ARCHIVE, true);
    logAdminActivity('حذف صف من سجل أبطال المواسم');
    renderChampionArchiveAdmin();
    renderHallOfFame();
  });
}

document.querySelectorAll('.champion-feature-toggle').forEach(cb=>{
  cb.addEventListener('change', async ()=>{
    const key = cb.dataset.key;
    CHAMPION_FEATURES[key] = cb.checked;
    await window.storage.set('championHonorFeatures', CHAMPION_FEATURES, true);
    logAdminActivity(`${cb.checked?'تفعيل':'تعطيل'} ميزة تكريم البطل: ${cb.dataset.label||key}`);
    renderAll();
  });
});
