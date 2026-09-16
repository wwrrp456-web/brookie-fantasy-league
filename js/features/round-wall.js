/* جدار الجولة (ميزة 1 من حزمة التفاعل الاجتماعي — أُضيفت 15 سبتمبر 2026) */
// تعليقات عامة متعددة مربوطة برقم الجولة الحالية، منفصلة تمامًا عن ميزة
// "تعليق المشارك على جولته" القديمة (DATA.roundComments — تعليق واحد لكل
// شخص، مُخزَّن مع بيانات الموسم الرئيسية). هذي الميزة تسمح بعدة رسائل لكل
// شخص، بردود فعل، وحذف من المنظم — حجم كتابة أعلى بكثير، فتُخزَّن بمسار
// Firebase منفصل (brookie/wall/<roundNumber>/<pushKey>) بدل DATA الرئيسية،
// حتى لا تتصادم كتاباتها مع saveData()/loadData() لبقية بيانات الموسم.
//
// بنية كل رسالة: {pid, name, text, time, reactions:{ "🔥":{ "<pid>":true }, ... }}
//
// التحقق من الهوية: يعتمد بالكامل على window._verifiedPid (نفس آلية
// applyMyId/codeMatchesParticipant المستخدمة بكل الموقع) — لا نظام تحقق جديد.
// الزوار غير المُعرَّفين يقرأون فقط (بلا نموذج كتابة ولا أزرار ردود فعل فعّالة).
//
// مفتاح الإظهار/الإخفاء: DATA.roundWallEnabled (غيابه = مفعّل، نفس نمط
// DATA.duelsEnabled/roundChallengeEnabled — بيانات قديمة بلا الحقل تبقى تعمل).

const WALL_REACTIONS = ['🔥', '😂', '💀', '👑'];
const WALL_MAX_CHARS = 200;
const WALL_RATE_LIMIT_MS = 20000; // 20 ثانية بين رسالتين من نفس الجهاز

let _wallListenerRoundNum = null;
let _wallListenerRef = null;
let _wallMessages = {};

// تهرب من HTML عشان نص أي مشارك ما يقدر يحقن وسوم بالصفحة — الميزات
// القديمة المشابهة (roundComments) ما كانت تعمل هذا، لكن حجم الكتابة هنا
// أكبر بكثير (رسائل متعددة من الجميع) فأضفناها احترازيًا لميزة جديدة.
function escapeWallHtml(str){
  const div = document.createElement('div');
  div.textContent = String(str == null ? '' : str);
  return div.innerHTML;
}

function getWallLastPostAt(){
  try{ return Number(localStorage.getItem('brookie_wall_last_post') || 0); }
  catch(e){ return 0; }
}
function setWallLastPostAt(){
  try{ localStorage.setItem('brookie_wall_last_post', String(Date.now())); }catch(e){}
}

// يربط/يبدّل مستمع المزامنة اللحظية لجولة الجدار الحالية فقط (يفصل مستمع
// الجولة القديمة تلقائيًا عند تغيّر رقم الجولة الحالية، حتى لا نتراكم عدة
// مستمعين لجولات قديمة بلا داعٍ).
function ensureWallListener(roundNum){
  if(_wallListenerRoundNum === roundNum) return;
  try{
    const db = _fbInit();
    if(_wallListenerRoundNum !== null && _wallListenerRef){
      db.ref('brookie/wall/' + _wallListenerRoundNum).off('value', _wallListenerRef);
    }
    _wallListenerRef = function(snap){
      _wallMessages = snap.exists() ? (snap.val() || {}) : {};
      renderRoundWallList(roundNum);
    };
    db.ref('brookie/wall/' + roundNum).on('value', _wallListenerRef, function(err){
      console.warn('تعذّرت مزامنة جدار الجولة:', err);
    });
    _wallListenerRoundNum = roundNum;
    _wallMessages = {};
  }catch(e){ console.warn('تعذّر تفعيل جدار الجولة:', e); }
}

function renderRoundWall(){
  const box = document.getElementById('roundWallBox');
  if(!box) return;
  if(DATA.roundWallEnabled === false){
    box.innerHTML = '';
    return;
  }
  const roundNum = getCurrentRoundNumber();
  ensureWallListener(roundNum);

  const myPid = window._verifiedPid || null;
  const myName = myPid ? (PARTICIPANTS.find(p=>p.id===myPid)||{}).name : null;

  let formHTML;
  if(myPid && myName){
    formHTML = `<div class="wall-add-form">
      <textarea class="wall-input" id="wallInput_${roundNum}" maxlength="${WALL_MAX_CHARS}" rows="2" placeholder="شارك رأيك عن الجولة... (حتى ${WALL_MAX_CHARS} حرف)"></textarea>
      <div class="wall-form-row">
        <span class="wall-char-count" id="wallCharCount_${roundNum}">0/${WALL_MAX_CHARS}</span>
        <button class="btn wall-submit-btn" id="wallSubmitBtn_${roundNum}" type="button">إرسال</button>
      </div>
      <div id="wallFormMsg_${roundNum}"></div>
    </div>`;
  } else {
    formHTML = `<span class="rc-locked">🔒 اختر اسمك وأدخل رمزك للكتابة بجدار الجولة</span>`;
  }

  box.innerHTML = `<div class="round-wall-section">
    <div class="round-wall-title">🧱 جدار الجولة ${roundNum}</div>
    <p class="rounds-subtitle" style="margin-top:0;">اكتب رأيك، رد بإيموجي على أي رسالة — بس تذكّر إن الكل يشوف كلامك 😅</p>
    ${formHTML}
    <div class="wall-messages-list" id="wallMessagesList_${roundNum}"></div>
  </div>`;

  const input = document.getElementById(`wallInput_${roundNum}`);
  const countEl = document.getElementById(`wallCharCount_${roundNum}`);
  if(input && countEl){
    input.addEventListener('input', ()=>{
      countEl.textContent = `${input.value.length}/${WALL_MAX_CHARS}`;
    });
  }
  const submitBtn = document.getElementById(`wallSubmitBtn_${roundNum}`);
  if(submitBtn){
    submitBtn.addEventListener('click', ()=> submitWallMessage(roundNum, myPid, myName));
  }

  renderRoundWallList(roundNum);
}

function renderRoundWallList(roundNum){
  const list = document.getElementById(`wallMessagesList_${roundNum}`);
  if(!list) return; // القسم مش مفتوح حاليًا (تبويب آخر) — نتجاهل التحديث
  if(_wallListenerRoundNum !== roundNum) return; // رسائل جولة قديمة وصلت متأخرة

  const myPid = window._verifiedPid || null;
  const entries = Object.entries(_wallMessages)
    .sort((a,b)=> (a[1].time||0) - (b[1].time||0));

  if(!entries.length){
    list.innerHTML = '<div class="wall-empty">لا رسائل بعد — كن أول من يكتب على الجدار!</div>';
    return;
  }

  list.innerHTML = entries.map(([key, msg])=>{
    const t = msg.time ? new Date(msg.time).toLocaleString('ar',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '';
    const reactionsHTML = WALL_REACTIONS.map(emoji=>{
      const reactors = (msg.reactions && msg.reactions[emoji]) || {};
      const count = Object.keys(reactors).length;
      const mine = myPid && reactors[myPid];
      return `<button type="button" class="wall-reaction-btn${mine ? ' mine' : ''}" data-emoji="${emoji}" data-key="${key}">
        <span>${emoji}</span>${count > 0 ? `<span class="wall-reaction-count">${count}</span>` : ''}
      </button>`;
    }).join('');
    const deleteBtn = isAdmin
      ? `<button type="button" class="wall-delete-btn" data-key="${key}" title="حذف الرسالة">🗑️</button>`
      : '';
    return `<div class="wall-message-item">
      <div class="wall-message-head">
        <span class="wall-message-author">${escapeWallHtml(msg.name)}</span>
        <span class="wall-message-time">${t}</span>
        ${deleteBtn}
      </div>
      <div class="wall-message-text">${escapeWallHtml(msg.text)}</div>
      <div class="wall-message-reactions">${reactionsHTML}</div>
    </div>`;
  }).join('');
}

async function submitWallMessage(roundNum, pid, name){
  const input = document.getElementById(`wallInput_${roundNum}`);
  const msgBox = document.getElementById(`wallFormMsg_${roundNum}`);
  if(!input) return;
  const text = input.value.trim();
  if(!text){ input.focus(); return; }
  if(text.length > WALL_MAX_CHARS){
    if(msgBox) msgBox.innerHTML = `<div class="status-msg err">الرسالة أطول من ${WALL_MAX_CHARS} حرف.</div>`;
    return;
  }
  const elapsed = Date.now() - getWallLastPostAt();
  if(elapsed < WALL_RATE_LIMIT_MS){
    const waitSec = Math.ceil((WALL_RATE_LIMIT_MS - elapsed) / 1000);
    if(msgBox) msgBox.innerHTML = `<div class="status-msg err">تمهّل شوي — حاول بعد ${waitSec} ثانية.</div>`;
    return;
  }
  const submitBtn = document.getElementById(`wallSubmitBtn_${roundNum}`);
  if(submitBtn) submitBtn.disabled = true;
  try{
    const db = _fbInit();
    await db.ref('brookie/wall/' + roundNum).push({
      pid, name, text, time: Date.now(), reactions: {}
    });
    setWallLastPostAt();
    input.value = '';
    const countEl = document.getElementById(`wallCharCount_${roundNum}`);
    if(countEl) countEl.textContent = `0/${WALL_MAX_CHARS}`;
    if(msgBox) msgBox.innerHTML = '';
  }catch(e){
    if(msgBox) msgBox.innerHTML = '<div class="status-msg err">تعذّر إرسال الرسالة، حاول مرة ثانية.</div>';
  }
  if(submitBtn) submitBtn.disabled = false;
}

async function toggleWallReaction(roundNum, key, emoji, pid){
  if(!pid) return;
  try{
    const db = _fbInit();
    const ref = db.ref(`brookie/wall/${roundNum}/${key}/reactions/${emoji}/${pid}`);
    const existing = (_wallMessages[key] && _wallMessages[key].reactions && _wallMessages[key].reactions[emoji] && _wallMessages[key].reactions[emoji][pid]);
    if(existing) await ref.remove();
    else await ref.set(true);
  }catch(e){ /* فشل صامت — المزامنة اللحظية ستعكس الحالة الفعلية بأي حال */ }
}

async function deleteWallMessage(roundNum, key){
  const ok = await customConfirm('حذف هذي الرسالة من جدار الجولة نهائيًا؟', {confirmText:'حذف'});
  if(!ok) return;
  try{
    const db = _fbInit();
    await db.ref(`brookie/wall/${roundNum}/${key}`).remove();
  }catch(e){ /* تجاهل — لو فشل الحذف تبقى الرسالة ظاهرة والمنظم يعيد المحاولة */ }
}

// تفويض نقر واحد على القائمة (بدل onclick لكل زر) — أبسط وأأمن مع نصوص/إيموجي
// ديناميكية داخل data-attributes بدل تضمينها بسلسلة onclick نصية.
document.addEventListener('click', function(e){
  const reactBtn = e.target.closest('.wall-reaction-btn');
  if(reactBtn){
    const myPid = window._verifiedPid || null;
    if(!myPid) return;
    const roundNum = _wallListenerRoundNum;
    if(roundNum === null) return;
    toggleWallReaction(roundNum, reactBtn.dataset.key, reactBtn.dataset.emoji, myPid);
    return;
  }
  const delBtn = e.target.closest('.wall-delete-btn');
  if(delBtn){
    const roundNum = _wallListenerRoundNum;
    if(roundNum === null) return;
    deleteWallMessage(roundNum, delBtn.dataset.key);
  }
});
