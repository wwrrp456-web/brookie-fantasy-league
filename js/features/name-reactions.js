/* ردود فعل على الأسماء بجدول الترتيب (ميزة 2 من حزمة التفاعل الاجتماعي — 15 سبتمبر 2026) */
// كل مشارك مُعرَّف (window._verifiedPid) يقدر يرسل رد فعل واحد فقط على أي
// اسم بالترتيب لكل جولة (تغيير اختياره يستبدل رده السابق، ما يضيف رد ثانٍ).
// البنية: brookie/name-reactions/<roundNumber>/<pidReactor> = {targetPid, emoji, time}
// العداد الظاهر بجانب كل اسم = مجموع كل الردود (من كل المتفاعلين) على ذلك
// المشارك بالذات، بغض النظر عن نوع الإيموجي.
//
// القرار التصميمي المهم: البادج + قائمة الاختيار عنصر واحد صغير (زر) داخل
// خلية الاسم، والقائمة المنسدلة `position:absolute` (لا تدفع عرض/ارتفاع
// الصف) — تحديدًا عشان جدول الترتيب سبق وانكسر على الجوالات الضعيفة بسبب
// تضييق عمود اللاعب (راجع ملف التسليم، إصلاح 15 سبتمبر 2026)، فأي إضافة هنا
// يجب أن تبقى بلا أي أثر على عرض/ارتفاع الصف الأصلي.
//
// مفتاح الإظهار/الإخفاء: DATA.nameReactionsEnabled (غيابه = مفعّل).

const NAME_REACTIONS = ['🔥', '😂', '💀', '👑'];

let _nrListenerRoundNum = null;
let _nrListenerRef = null;
let _nrData = {}; // { [reactorPid]: {targetPid, emoji, time} }
let _nrOpenPickerPid = null;

function ensureNameReactionsListener(roundNum){
  if(_nrListenerRoundNum === roundNum) return;
  try{
    const db = _fbInit();
    if(_nrListenerRoundNum !== null && _nrListenerRef){
      db.ref('brookie/name-reactions/' + _nrListenerRoundNum).off('value', _nrListenerRef);
    }
    _nrListenerRef = function(snap){
      _nrData = snap.exists() ? (snap.val() || {}) : {};
      paintNameReactionSlots();
    };
    db.ref('brookie/name-reactions/' + roundNum).on('value', _nrListenerRef, function(err){
      console.warn('تعذّرت مزامنة ردود فعل الأسماء:', err);
    });
    _nrListenerRoundNum = roundNum;
    _nrData = {};
  }catch(e){ console.warn('تعذّر تفعيل ردود فعل الأسماء:', e); }
}

function renderNameReactions(){
  const slots = document.querySelectorAll('.name-reaction-slot');
  if(!slots.length) return;
  if(DATA.nameReactionsEnabled === false){
    slots.forEach(s=> s.innerHTML='');
    return;
  }
  const roundNum = getCurrentRoundNumber();
  ensureNameReactionsListener(roundNum);
  paintNameReactionSlots();
}

// يحسب عدد الردود على كل pid مستهدف من _nrData الحالية
function countReactionsFor(targetPid){
  return Object.values(_nrData).filter(r=>r && Number(r.targetPid)===Number(targetPid)).length;
}

function paintNameReactionSlots(){
  if(DATA.nameReactionsEnabled === false) return;
  const myPid = window._verifiedPid || null;
  const myReaction = myPid ? _nrData[myPid] : null;
  document.querySelectorAll('.name-reaction-slot').forEach(slot=>{
    const pid = Number(slot.dataset.pid);
    const count = countReactionsFor(pid);
    const isOpen = _nrOpenPickerPid === pid;
    const badgeEmoji = (myReaction && Number(myReaction.targetPid)===pid) ? myReaction.emoji : '👏';
    let html = `<button type="button" class="name-reaction-badge${count>0?' has-count':''}" data-pid="${pid}">
      <span>${badgeEmoji}</span>${count>0 ? `<span class="nr-count">${count}</span>` : ''}
    </button>`;
    if(isOpen){
      html += `<div class="name-reaction-picker">
        ${NAME_REACTIONS.map(e=>`<button type="button" class="nr-pick-btn" data-target="${pid}" data-emoji="${e}">${e}</button>`).join('')}
      </div>`;
    }
    slot.innerHTML = html;
  });
}

async function submitNameReaction(targetPid, emoji, myPid){
  try{
    const db = _fbInit();
    await db.ref(`brookie/name-reactions/${_nrListenerRoundNum}/${myPid}`).set({
      targetPid, emoji, time: Date.now()
    });
  }catch(e){ /* فشل صامت — المزامنة اللحظية تعكس الحالة الفعلية */ }
}

document.addEventListener('click', function(e){
  const badge = e.target.closest('.name-reaction-badge');
  if(badge){
    if(DATA.nameReactionsEnabled === false) return;
    const myPid = window._verifiedPid || null;
    if(!myPid){
      // زائر غير مُعرَّف — ما نقدر نحدد هوية المتفاعل ولا نطبّق "رد واحد لكل
      // شخص"، فنطلب منه يعرّف نفسه أولًا بدل فتح قائمة الاختيار.
      return;
    }
    const pid = Number(badge.dataset.pid);
    _nrOpenPickerPid = (_nrOpenPickerPid === pid) ? null : pid;
    paintNameReactionSlots();
    return;
  }
  const pickBtn = e.target.closest('.nr-pick-btn');
  if(pickBtn){
    const myPid = window._verifiedPid || null;
    if(!myPid) return;
    const targetPid = Number(pickBtn.dataset.target);
    const emoji = pickBtn.dataset.emoji;
    _nrOpenPickerPid = null;
    submitNameReaction(targetPid, emoji, myPid);
    return;
  }
  // نقرة خارج أي بادج/قائمة تغلق أي قائمة مفتوحة
  if(_nrOpenPickerPid !== null && !e.target.closest('.name-reaction-slot')){
    _nrOpenPickerPid = null;
    paintNameReactionSlots();
  }
});
