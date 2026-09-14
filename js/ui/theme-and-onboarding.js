/* تبديل الوضع الداكن/الفاتح + شاشة الترحيب لأول زيارة */
function applyLightModePref(){
  const btn = document.getElementById('darkModeToggleBtn');
  let on = false;
  try{ on = localStorage.getItem(LIGHT_MODE_KEY) === '1'; }catch(e){}
  document.documentElement.classList.toggle('light-mode', on);
  // الشعار يتبدّل مع الوضع بطلب صريح من المستخدم: الوضع الداكن = الشعار الأبيض
  // الأحادي (النسخة الرسمية لخلفية داكنة، صفحة 2 بدليل العلامة). الوضع الفاتح =
  // الشعار الكامل بالألوان الرسمي لخلفية داكنة (أيقونة ملوّنة + نص PROKI أبيض +
  // "FANTASY LEAGUE" بنفسجي + العبارة العربية بيضاء، صفحة 1 بدليل العلامة) —
  // وليس نسخة "الألوان على الأبيض" (نص أسود، صفحة 3) لأن خلفية الهيدر داكنة
  // ثابتة بكل الأوضاع، فالنسخة المصمَّمة أصلًا لخلفية داكنة هي الأنسب تباينًا،
  // وهذا ما أكّده المستخدم برفع صورة توضّح الشعار الملوّن الصحيح المطلوب.
  const logoEl = document.getElementById('logoImg');
  if(logoEl) logoEl.src = on ? LOGO_BASE64_LIGHT : LOGO_BASE64;
  if(btn){
    // النص يعكس الوضع الحالي فعليًا (لا الوضع اللي بيتحول له عند الضغط) —
    // تفاديًا لالتباس "يقول فاتح وهو داكن" الذي أبلغ عنه المستخدم.
    btn.textContent = on ? '☀️ الوضع الفاتح' : '🌙 الوضع الداكن';
    btn.setAttribute('aria-pressed', String(on));
    btn.title = on ? 'اضغط للتبديل إلى الوضع الداكن' : 'اضغط للتبديل إلى الوضع الفاتح';
  }
}
const darkModeToggleBtn = document.getElementById('darkModeToggleBtn');
function initOnboarding(){
  let seen = false;
  try{ seen = localStorage.getItem(ONBOARD_KEY) === '1'; }catch(e){}
  if(seen) return;
  const overlay = document.getElementById('onboardOverlay');
  if(!overlay) return;
  overlay.hidden = false;

  const stepRole = document.getElementById('onboardStepRole');
  const stepId = document.getElementById('onboardStepId');
  const nameSelect = document.getElementById('onboardNameSelect');
  const codeInput = document.getElementById('onboardCodeInput');
  const confirmBtn = document.getElementById('onboardCodeConfirmBtn');
  const backBtn = document.getElementById('onboardBackBtn');
  const msg = document.getElementById('onboardCodeMsg');

  if(nameSelect && nameSelect.options.length <= 1){
    PARTICIPANTS.forEach(p=>{
      const o = document.createElement('option');
      o.value = p.id; o.textContent = p.name;
      nameSelect.appendChild(o);
    });
  }

  const dismiss = ()=>{
    overlay.hidden = true;
    try{ localStorage.setItem(ONBOARD_KEY, '1'); }catch(e){}
  };

  document.getElementById('onboardRoleVisitor').addEventListener('click', dismiss);

  document.getElementById('onboardRoleParticipant').addEventListener('click', ()=>{
    stepRole.hidden = true;
    stepId.hidden = false;
    nameSelect.focus();
  });

  backBtn.addEventListener('click', ()=>{
    stepId.hidden = true;
    stepRole.hidden = false;
    msg.innerHTML = '';
    codeInput.value = '';
  });

  function confirmOnboardCode(){
    if(!nameSelect.value){
      msg.innerHTML = '<div class="status-msg err">اختر اسمك أولاً.</div>';
      return;
    }
    const pid = Number(nameSelect.value);
    const code = codeInput.value.trim();
    if(!code){
      msg.innerHTML = '<div class="status-msg err">أدخل رمزك الخاص (4 أرقام) اللي أرسله لك المنظم.</div>';
      return;
    }
    if(!codeMatchesParticipant(pid, code)){
      msg.innerHTML = '<div class="status-msg err">الرمز غير مطابق للاسم المختار. تأكد من الرقم اللي أرسلناه لك، أو تواصل مع المنظم.</div>';
      return;
    }
    applyMyId(pid);
    dismiss();
  }

  confirmBtn.addEventListener('click', confirmOnboardCode);
  codeInput.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){ e.preventDefault(); confirmOnboardCode(); }
  });

  overlay.addEventListener('click', (e)=>{ if(e.target === overlay) dismiss(); });
}
