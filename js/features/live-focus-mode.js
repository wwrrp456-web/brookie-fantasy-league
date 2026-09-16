/* وضع المباراة المباشرة المُركَّز (ميزة 15 من حزمة UX/الشكل — أُضيفت 15
 * سبتمبر 2026). تراكب كامل الشاشة يخفي كل شيء عدا جوهر اللحظة: المتصدر،
 * أعلى 5 بالترتيب مع حركتهم، وبطل الجولة الحالي — يتحدّث تلقائيًا مع كل
 * renderAll() (نفس مزامنة Firebase اللحظية الموجودة أصلًا، بلا أي مصدر
 * بيانات جديد). للعرض فقط، لا يكتب أي بيانات.
 */

let _liveFocusOpen = false;

function openLiveFocusMode(){
  _liveFocusOpen = true;
  document.body.classList.add('live-focus-active');
  renderLiveFocusMode();
}
function closeLiveFocusMode(){
  _liveFocusOpen = false;
  document.body.classList.remove('live-focus-active');
  const box = document.getElementById('liveFocusOverlay');
  if(box) box.innerHTML = '';
}

function renderLiveFocusMode(){
  const box = document.getElementById('liveFocusOverlay');
  if(!box) return;
  if(!_liveFocusOpen || DATA.liveFocusModeEnabled === false){
    box.innerHTML = '';
    document.body.classList.remove('live-focus-active');
    return;
  }

  const standings = computeStandings();
  const top5 = standings.slice(0,5);
  const mv = getMovements();
  const heroes = getRoundHeroes();
  const rn = getCurrentRoundNumber();

  box.innerHTML = `
    <div class="live-focus-inner">
      <button type="button" class="live-focus-close" id="liveFocusCloseBtn" aria-label="إغلاق الوضع المباشر">✖</button>
      <div class="live-focus-badge"><span class="live-focus-dot"></span> مباشر · الجولة ${rn}</div>
      ${heroes && heroes.top ? `<div class="live-focus-hero">👑 ${heroes.top.name} — ${heroes.top.points} نقطة هذي الجولة</div>` : ''}
      <div class="live-focus-list">
        ${top5.map((s,i)=>{
          const d = mv[s.id];
          const arrow = (d===undefined||d===0) ? '' : (d>0 ? `<span class="live-focus-arrow up">▲${d}</span>` : `<span class="live-focus-arrow down">▼${Math.abs(d)}</span>`);
          return `<div class="live-focus-row ${i===0?'first':''}">
            <span class="live-focus-rank">${i+1}</span>
            <span class="live-focus-name">${s.name}</span>
            ${arrow}
            <span class="live-focus-total">${s.total}</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;

  const closeBtn = document.getElementById('liveFocusCloseBtn');
  if(closeBtn) closeBtn.addEventListener('click', closeLiveFocusMode);
}

document.getElementById('liveFocusOpenBtn')?.addEventListener('click', openLiveFocusMode);

// يُخفي زر "وضع مباشر" نفسه لو المنظم عطّل الميزة، ويُغلق التراكب فورًا لو
// كان مفتوحًا وقت التعطيل.
function renderLiveFocusToggleButton(){
  const btn = document.getElementById('liveFocusOpenBtn');
  if(!btn) return;
  const enabled = DATA.liveFocusModeEnabled !== false;
  btn.style.display = enabled ? '' : 'none';
  if(!enabled && _liveFocusOpen) closeLiveFocusMode();
}
