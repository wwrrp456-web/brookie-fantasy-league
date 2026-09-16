/* أوسمة تلقائية — تنبيه فوري عند كسب وسام جديد (ميزة 11 من حزمة العمق
 * التنافسي — أُضيفت 15 سبتمبر 2026). أوسمة الموسم (computeBadges/
 * computeExtendedBadges) موجودة أصلاً وتُعرض بلوحة "أوسمة الموسم"
 * (standings-widgets.js)، لكنها محسوبة حيًا بلا أي إشعار عند أول مرة
 * يكسب فيها مشارك وسامًا — هذي الميزة تضيف بالضبط تلك اللحظة الاحتفالية.
 * "الأوسمة المشاهَدة" مخزَّنة محليًا بالجهاز فقط (localStorage)، بلا حاجة
 * لقاعدة بيانات مشتركة — نفس منطق whats-new-card.js تمامًا. فقدان وسام
 * واستعادته لاحقًا لا يُعيد التنبيه (تبسيط متعمّد لتفادي إزعاج تنبيهات
 * متكررة لأوسمة متذبذبة مثل "أكبر صعود هذه الجولة").
 */

function _seenBadgesKey(pid){ return 'brookie_seen_badges_' + pid; }

function getSeenBadges(pid){
  try{
    const raw = localStorage.getItem(_seenBadgesKey(pid));
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}
function setSeenBadges(pid, titles){
  try{ localStorage.setItem(_seenBadgesKey(pid), JSON.stringify(titles)); }catch(e){}
}

function renderBadgeToast(){
  const box = document.getElementById('badgeToastBox');
  if(!box) return;
  if(DATA.badgeToastEnabled === false){ box.innerHTML=''; return; }

  const myPid = window._verifiedPid || null;
  if(!myPid){ box.innerHTML=''; return; }
  const p = PARTICIPANTS.find(x=>x.id===myPid);
  if(!p){ box.innerHTML=''; return; }

  const allBadges = [...computeBadges(), ...computeExtendedBadges()];
  const myBadges = allBadges.filter(b=> b.names.split('، ').includes(p.name));
  const myTitles = myBadges.map(b=>b.title);

  const seen = getSeenBadges(myPid);
  const newOnes = myBadges.filter(b=> !seen.includes(b.title));

  if(!newOnes.length){
    box.innerHTML = '';
  } else {
    box.innerHTML = `<div class="badge-toast-wrap">
      ${newOnes.map(b=>`<div class="badge-toast">
        <span class="badge-toast-icon">${b.icon}</span>
        <div class="badge-toast-text">
          <div class="badge-toast-title">🎉 وسام جديد: ${b.title}!</div>
          <div class="badge-toast-detail">${b.detail}</div>
        </div>
      </div>`).join('')}
      <button type="button" class="btn ghost" id="badgeToastDismissBtn">تمام 🎉</button>
    </div>`;
    const dismissBtn = document.getElementById('badgeToastDismissBtn');
    if(dismissBtn) dismissBtn.addEventListener('click', ()=>{ box.innerHTML=''; });
  }

  // نسجّل كل أوسمتي الحالية كـ"مشاهَدة" فورًا (نفس منطق "قرأتها بمجرد
  // ظهورها" المتّبع ببطاقة "اللي فاتك").
  setSeenBadges(myPid, myTitles);
}
