/* مركز تنبيهات موحّد (مرحلة تحسينات 2026) — بدون أي إشعار Push حقيقي ولا
 * Cloud Function (قرار صريح من المستخدم: تحسينات داخل الصفحة فقط، بلا تكلفة
 * أو بنية خادم إضافية). المشكلة اللي يحلّها: كل ميزة عندها "جديد/غير مُشاهَد"
 * خاص بها مبعثر (badge-toast.js، whats-new-card.js، دعوات نزال الموسم، سؤال
 * الجولة) — هذا الملف يجمعها بمكان واحد (جرس 🔔 بأعلى الصفحة) بدون تكرار
 * منطق "مُشاهَد" لكل ميزة: يقرأ نفس مفاتيح localStorage/بيانات Firebase
 * الموجودة أصلًا، ولا يبني تخزين "مُشاهَد" جديدًا خاصًا فيه.
 */

// يجمع كل التنبيهات الحالية للمشارك المُعرَّف حاليًا (window._verifiedPid).
// كل عنصر: {icon, text, kind, onOpen} — onOpen اختيارية: دالة تُنفَّذ عند
// الضغط على العنصر (تنقل لتبويبه المناسب و/أو تُعلّمه "مُشاهَد" بنفس مفتاح
// الميزة الأصلية بدل بناء مفتاح جديد).
function getUnifiedNotifications(){
  const items = [];
  const myPid = window._verifiedPid || null;
  if(!myPid) return items;
  const p = PARTICIPANTS.find(x=>x.id===myPid);
  if(!p) return items;

  // 1) أوسمة جديدة غير مُشاهَدة — نفس بيانات badge-toast.js، بدون تعليمها
  // مُشاهَدة هنا (يبقى ذلك من مسؤولية بطاقة الوسام نفسها عند ظهورها).
  try{
    if(DATA.badgeToastEnabled !== false){
      const allBadges = [...computeBadges(), ...computeExtendedBadges()];
      const myBadges = allBadges.filter(b=> b.names.split('، ').includes(p.name));
      const seen = getSeenBadges(myPid);
      myBadges.filter(b=>!seen.includes(b.title)).forEach(b=>{
        items.push({
          icon: b.icon || '🎖️',
          text: `وسام جديد: ${b.title}`,
          kind: 'badge',
          onOpen: ()=> setSeenBadges(myPid, [...getSeenBadges(myPid), b.title])
        });
      });
    }
  }catch(e){ /* أي خلل بحساب الأوسمة لا يوقف بقية التنبيهات */ }

  // 2) "اللي فاتك" — بنفس مفتاح whats-new-card.js (brookie_last_seen_round_*)
  try{
    if(DATA.whatsNewEnabled !== false){
      const currentRound = getCurrentRoundNumber();
      const lastSeen = getLastSeenRound(myPid);
      if(lastSeen !== null && lastSeen < currentRound){
        const missed = currentRound - lastSeen;
        items.push({
          icon: '🎁',
          text: `فاتك ${missed} ${missed===1?'جولة':'جولات'} — اضغط لعرض التفاصيل`,
          kind: 'whatsnew',
          onOpen: ()=> setLastSeenRound(myPid, currentRound)
        });
      }
    }
  }catch(e){}

  // 3) دعوات نزال موسم بانتظار ردّي — pending فقط، يُحسم تلقائيًا بمجرد
  // القبول/الرفض من تبويب الجولات، فلا حاجة لمفتاح "مُشاهَد" مستقل.
  try{
    if(DATA.seasonDuelEnabled !== false && typeof _seasonDuels === 'object'){
      Object.values(_seasonDuels || {}).forEach(d=>{
        if(d.status === 'pending' && d.opponentPid === myPid){
          items.push({
            icon: '🥊',
            text: `دعوة نزال موسم من ${participantName(d.challengerPid)}`,
            kind: 'duel',
            tab: 'rounds'
          });
        }
      });
    }
  }catch(e){}

  // 4) سؤال الجولة المفتوح ولسه ما صوّتّ فيه — يُحسم تلقائيًا بالتصويت نفسه.
  try{
    if(DATA.roundPollEnabled !== false){
      const poll = getCurrentRoundPoll();
      if(poll){
        const votes = poll.votes || {};
        if(votes[myPid] === undefined){
          items.push({icon:'🗳️', text:'سؤال الجولة بانتظار تصويتك', kind:'poll', tab:'rounds'});
        }
      }
    }
  }catch(e){}

  return items;
}

function renderNotificationCenter(){
  const box = document.getElementById('notificationCenterBox');
  if(!box) return;
  const items = getUnifiedNotifications();
  const wasOpen = box.querySelector('.notif-dropdown')?.dataset.open === '1';

  box.innerHTML = `
    <button type="button" id="notifBellBtn" class="notif-bell-btn" aria-label="مركز التنبيهات">
      🔔${items.length ? `<span class="notif-count">${items.length}</span>` : ''}
    </button>
    <div class="notif-dropdown" data-open="${wasOpen ? '1':'0'}" style="display:${wasOpen?'block':'none'};">
      ${items.length ? items.map((it,i)=>`
        <div class="notif-item" data-idx="${i}">
          <span class="notif-item-icon">${it.icon}</span>
          <span class="notif-item-text">${it.text}</span>
        </div>`).join('')
      : '<div class="notif-empty">لا تنبيهات جديدة 👍</div>'}
    </div>`;

  const bellBtn = document.getElementById('notifBellBtn');
  const dropdown = box.querySelector('.notif-dropdown');
  bellBtn.addEventListener('click', (e)=>{
    e.stopPropagation();
    const open = dropdown.dataset.open === '1';
    dropdown.dataset.open = open ? '0' : '1';
    dropdown.style.display = open ? 'none' : 'block';
  });
  dropdown.querySelectorAll('.notif-item').forEach(el=>{
    el.addEventListener('click', ()=>{
      const it = items[Number(el.dataset.idx)];
      if(!it) return;
      if(it.onOpen) it.onOpen();
      if(it.tab){
        const tabBtn = document.querySelector(`nav.tabs button[data-tab="${it.tab}"]`);
        if(tabBtn) tabBtn.click();
      }
      renderNotificationCenter();
    });
  });

  maybeNotifyNewRound();
  maybeShowNotifyPermissionPrompt();
}

// إغلاق القائمة عند الضغط خارجها
document.addEventListener('click', (e)=>{
  const box = document.getElementById('notificationCenterBox');
  if(!box || box.contains(e.target)) return;
  const dropdown = box.querySelector('.notif-dropdown');
  if(dropdown && dropdown.dataset.open === '1'){
    dropdown.dataset.open = '0';
    dropdown.style.display = 'none';
  }
});

// ---------- إشعار متصفح محلي عند نشر جولة جديدة والتبويب بالخلفية ----------
// بدون أي Cloud Function أو خادم — يعمل فقط طالما التبويب مفتوح فعليًا (حتى
// لو بالخلفية)، عبر Notification API القياسية بعد إذن صريح من المستخدم.
let _notifLastKnownRound = null;
function maybeNotifyNewRound(){
  try{
    if(typeof Notification === 'undefined') return;
    if(Notification.permission !== 'granted') return;
    const myPid = window._verifiedPid || null;
    if(!myPid) return;
    const current = getCurrentRoundNumber();
    if(_notifLastKnownRound === null){ _notifLastKnownRound = current; return; }
    if(current > _notifLastKnownRound && document.hidden){
      new Notification('دوري بروكي الفانتازي', {
        body: `نُشرت الجولة ${current} — افتح الموقع لمعرفة ترتيبك!`,
        icon: 'icon-192.png'
      });
    }
    _notifLastKnownRound = current;
  }catch(e){ /* أي خلل بواجهة الإشعارات لا يوقف بقية الموقع */ }
}

// زر تفعيل اختياري داخل الجرس نفسه — يظهر فقط لو المتصفح يدعم Notification
// ولم يُطلَب الإذن بعد، ويختفي بعد أول طلب (سواء وافق المستخدم أو رفض).
function maybeShowNotifyPermissionPrompt(){
  const box = document.getElementById('notificationCenterBox');
  if(!box || typeof Notification === 'undefined') return;
  if(Notification.permission !== 'default') return;
  if(document.getElementById('notifPermBtn')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'notifPermBtn';
  btn.className = 'notif-perm-btn';
  btn.title = 'فعّل تنبيه المتصفح عند نشر جولة جديدة';
  btn.textContent = '🔕';
  btn.addEventListener('click', (e)=>{
    e.stopPropagation();
    Notification.requestPermission().then(()=> btn.remove());
  });
  box.appendChild(btn);
}
