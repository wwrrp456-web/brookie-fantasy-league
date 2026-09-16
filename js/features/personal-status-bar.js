/* شريط الحالة الشخصية الثابت (ميزة 13 من حزمة UX/الشكل — أُضيفت 15
 * سبتمبر 2026). شريط مثبّت بأسفل الشاشة يبقى ظاهرًا بكل التبويبات (مو
 * بس تبويب الترتيب العام) طالما المستخدم عرّف نفسه: مركزه الحالي،
 * إجماليه، ونقاط آخر جولة. حالة الطيّ (مطوي/مفتوح) مخزَّنة محليًا
 * بالجهاز فقط (localStorage) — تفضيل عرض شخصي لا يخص قاعدة البيانات.
 */

function _statusBarCollapsedKey(){ return 'brookie_status_bar_collapsed'; }
function isStatusBarCollapsed(){
  try{ return localStorage.getItem(_statusBarCollapsedKey()) === '1'; }catch(e){ return false; }
}
function setStatusBarCollapsed(val){
  try{ localStorage.setItem(_statusBarCollapsedKey(), val ? '1' : '0'); }catch(e){}
}

function renderPersonalStatusBar(){
  const box = document.getElementById('statusBarBox');
  if(!box) return;

  const myPid = window._verifiedPid || null;
  if(DATA.statusBarEnabled === false || !myPid){
    box.innerHTML = '';
    document.body.classList.remove('has-status-bar');
    return;
  }

  const p = PARTICIPANTS.find(x=>x.id===myPid);
  if(!p){ box.innerHTML=''; document.body.classList.remove('has-status-bar'); return; }

  const standings = computeStandings();
  const idx = standings.findIndex(s=>s.id===myPid);
  if(idx === -1){ box.innerHTML=''; document.body.classList.remove('has-status-bar'); return; }
  const s = standings[idx];
  const rank = idx + 1;
  const roundPointsMap = getCurrentRoundPointsMap();
  const lastPts = roundPointsMap[myPid];
  const lastLabel = (lastPts===undefined) ? '' : (lastPts>0 ? `+${lastPts}` : `${lastPts}`);

  const collapsed = isStatusBarCollapsed();
  document.body.classList.add('has-status-bar');
  document.body.classList.toggle('status-bar-collapsed', collapsed);

  box.innerHTML = `
    <div class="status-bar-inner ${collapsed?'collapsed':''}">
      <button type="button" class="status-bar-toggle" id="statusBarToggleBtn" aria-label="طيّ/فتح الشريط">${collapsed?'▲':'▼'}</button>
      <div class="status-bar-content">
        <span class="status-bar-name">${p.name}</span>
        <span class="status-bar-sep">·</span>
        <span class="status-bar-rank">🏆 #${rank}</span>
        <span class="status-bar-sep">·</span>
        <span class="status-bar-total">${s.total} نقطة</span>
        ${lastLabel ? `<span class="status-bar-sep">·</span><span class="status-bar-last ${lastPts>0?'pos':'neg'}">${lastLabel} آخر جولة</span>` : ''}
      </div>
    </div>`;

  const toggleBtn = document.getElementById('statusBarToggleBtn');
  if(toggleBtn){
    toggleBtn.addEventListener('click', ()=>{
      const next = !isStatusBarCollapsed();
      setStatusBarCollapsed(next);
      renderPersonalStatusBar();
    });
  }
}
