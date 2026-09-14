/* دخول المنظم، تغيير الرمز، إعدادات الجولة، النسخ الاحتياطي/التصدير */
let pinChangeUnlocked = false;
let isAdmin = false;

// ---------- سجل نشاط المنظم ----------
// سيُخزَّن في DATA.activityLog = [{time, action}]
function logAdminActivity(action){
  if(!isAdmin) return;
  if(!DATA.activityLog) DATA.activityLog = [];
  DATA.activityLog.unshift({time: new Date().toISOString(), action});
  if(DATA.activityLog.length > 50) DATA.activityLog = DATA.activityLog.slice(0,50);
  renderAdminActivityLog();
}
function renderAdminActivityLog(){
  const box = document.getElementById('adminActivityLog');
  if(!box) return;
  const log = DATA.activityLog || [];
  if(!log.length){
    box.innerHTML = '<div style="color:var(--muted);font-size:0.8rem;">لا يوجد سجل نشاط بعد.</div>';
    return;
  }
  box.innerHTML = log.map(entry=>{
    const d = new Date(entry.time);
    const timeStr = d.toLocaleString('ar-SA',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
    return `<div class="activity-log-row"><span>${entry.action}</span><span class="activity-log-time">${timeStr}</span></div>`;
  }).join('');
}

// شارتا حالة "مفعّل/معطّل" بجانب عنوان "⚙️ إعدادات الجولة الحالية" — تلخّصان
// حالة التوقعات وتحدي المواجهة بنظرة وحدة بدون فتح القسم (6 سبتمبر 2026).
function updateRoundSettingsStatus(){
  const predPill = document.getElementById('predStatusPill');
  if(predPill){
    const on = !!PRED_DATA.enabled;
    predPill.textContent = on ? '🔮 مفعّل' : '🔮 معطّل';
    predPill.className = 'status-pill ' + (on ? 'on' : 'off');
  }
  const duelPill = document.getElementById('duelStatusPill');
  if(duelPill){
    const on = DATA.duelsEnabled !== false;
    duelPill.textContent = on ? '⚔️ مفعّل' : '⚔️ معطّل';
    duelPill.className = 'status-pill ' + (on ? 'on' : 'off');
  }
  const rcPill = document.getElementById('roundChallengeStatusPill');
  if(rcPill){
    const on = DATA.roundChallengeEnabled !== false;
    rcPill.textContent = on ? '🗳️ مفعّل' : '🗳️ معطّل';
    rcPill.className = 'status-pill ' + (on ? 'on' : 'off');
  }
}

// تذكير "آخر نسخة احتياطية" بجانب زر التنزيل — يُخزَّن الوقت محليًا بمتصفح
// المنظم فقط (لا علاقة له بقاعدة البيانات)، بدل الاعتماد على الذاكرة لمعرفة
// هل نزّلها بعد آخر جولة أو نسيها (طلب المستخدم 6 سبتمبر 2026).
function updateLastBackupLabel(){
  const el = document.getElementById('lastBackupLabel');
  if(!el) return;
  try{
    const ts = localStorage.getItem('brookie_last_backup_at');
    el.textContent = ts
      ? 'آخر نسخة نزّلتها من هذا الجهاز: ' + new Date(Number(ts)).toLocaleString('ar')
      : 'لم تُنزَّل أي نسخة بعد من هذا الجهاز.';
  }catch(e){
    el.textContent = '';
  }
}

// فتح/طيّ كل أقسام لوحة المنظم دفعة واحدة — مفيد وقت المراجعة الشاملة
// (طلب المستخدم 6 سبتمبر 2026).
document.getElementById('expandAllAdminBtn').addEventListener('click', ()=>{
  document.querySelectorAll('#adminPanel details.admin-accordion').forEach(d=> d.open = true);
});
document.getElementById('collapseAllAdminBtn').addEventListener('click', ()=>{
  document.querySelectorAll('#adminPanel details.admin-accordion').forEach(d=> d.open = false);
});

document.getElementById('loginBtn').addEventListener('click', ()=>{
  const val = document.getElementById('pinInput').value.trim();
  const msg = document.getElementById('loginMsg');
  if(val === CURRENT_ADMIN_PIN){
    isAdmin = true;
    document.getElementById('loginBox').style.display='none';
    document.getElementById('adminPanel').style.display='block';
    // ملخص الواتساب وكرت بطل الجولة خاصان بالمنظم فقط — يظهران بعد الدخول
    // برمز المنظم (حتى لو المستخدم بتبويب "الترتيب العام" وقتها ما يشوفهم
    // إلا بعد ما يدخل هنا ويرجع لذاك التبويب)
    document.getElementById('copySummaryBtn').style.display='';
    document.getElementById('champCardBtn').style.display='';
    // قسم "المواجهة المباشرة" في تبويب الإحصائيات صار خاصًا بالمنظم فقط
    // بطلب المستخدم (3 سبتمبر 2026) — يظهر فقط بعد تسجيل الدخول هنا.
    const h2hBoxEl = document.getElementById('h2hBox');
    if(h2hBoxEl) h2hBoxEl.style.display='';
    document.getElementById('dlStandingsBtn').style.display='';
    document.getElementById('shareStandingsBtn').style.display='';
    document.getElementById('dlStandingsStoryBtn').style.display='';
    document.getElementById('seasonWrapBtn').style.display='';
    // أزرار تحميل المشاركين/الجولات/الإحصائيات/اللائحة كصور خاصة بالمنظم أيضًا
    document.getElementById('participantsToolbar').style.display='';
    document.getElementById('roundsToolbar').style.display='';
    document.getElementById('statsToolbar').style.display='';
    document.getElementById('rulesToolbar').style.display='';
    const nextInput = document.getElementById('nextRoundAtInput');
    if(nextInput) nextInput.value = isoToDatetimeLocal(DATA.nextRoundAt);
    const predToggle = document.getElementById('predictionsEnabledToggle');
    if(predToggle) predToggle.checked = !!PRED_DATA.enabled;
    const duelsToggle = document.getElementById('duelsEnabledToggle');
    if(duelsToggle) duelsToggle.checked = DATA.duelsEnabled !== false;
    const rcToggle = document.getElementById('roundChallengeEnabledToggle');
    if(rcToggle) rcToggle.checked = DATA.roundChallengeEnabled !== false;
    updateRoundSettingsStatus();
    // تعبئة رقم الجولة تلقائيًا برقم الجولة القادمة — توفّر خطوة يدوية متكررة
    // كل أسبوع (طلب المستخدم 6 سبتمبر 2026). رقاقات "الجولات المحفوظة" تحت
    // الحقل تسمح بتجاوز هذا وفتح جولة سابقة للتعديل بضغطة وحدة.
    const roundNumEl = document.getElementById('roundNumber');
    if(roundNumEl) roundNumEl.value = getCurrentRoundNumber() + 1;
    renderPastRoundsChips();
    updateLastBackupLabel();
    loadCommunityReports();
    renderQuickLinkCodes();
    renderVisitorCount();
    syncChampionAdminUI();
  }else{
    msg.innerHTML = '<div class="status-msg err">رمز غير صحيح.</div>';
  }
});

// ---------- عداد الجولة القادمة (لوحة المنظم) ----------
document.getElementById('saveNextRoundAtBtn').addEventListener('click', async ()=>{
  const input = document.getElementById('nextRoundAtInput');
  const msg = document.getElementById('nextRoundAtMsg');
  if(!input.value){ msg.innerHTML = '<div class="status-msg err">اختر تاريخًا ووقتًا أولاً.</div>'; return; }
  const d = new Date(input.value);
  if(isNaN(d.getTime())){ msg.innerHTML = '<div class="status-msg err">تاريخ غير صالح.</div>'; return; }
  DATA.nextRoundAt = d.toISOString();
  const ok = await saveData();
  renderCountdown();
  msg.innerHTML = ok
    ? '<div class="status-msg ok">تم حفظ موعد الجولة القادمة — العداد ظاهر الآن للجميع ✅</div>'
    : '<div class="status-msg err">تعذّر الحفظ، حاول مرة ثانية.</div>';
});
document.getElementById('clearNextRoundAtBtn').addEventListener('click', async ()=>{
  const msg = document.getElementById('nextRoundAtMsg');
  DATA.nextRoundAt = null;
  document.getElementById('nextRoundAtInput').value = '';
  const ok = await saveData();
  renderCountdown();
  msg.innerHTML = ok
    ? '<div class="status-msg ok">تم إخفاء العداد.</div>'
    : '<div class="status-msg err">تعذّر الحفظ، حاول مرة ثانية.</div>';
});

// ---------- تفعيل/إخفاء خانة توقعات بطل الجولة (لوحة المنظم) ----------
// خيار يتحكم فيه المنظم فقط: بعض الجولات يرغب يفتح فيها توقع بطل الجولة
// للزوار، وبعضها لا. القيمة مشتركة (PRED_DATA.enabled) فتنعكس فورًا على كل
// الزوار عبر المزامنة اللحظية الموجودة أصلاً لمسار التوقعات.
document.getElementById('predictionsEnabledToggle').addEventListener('change', async (e)=>{
  const msg = document.getElementById('predictionsEnabledMsg');
  const newVal = e.target.checked;
  PRED_DATA.enabled = newVal;
  e.target.disabled = true;
  const ok = await savePredictions();
  e.target.disabled = false;
  renderPredictions();
  renderMyDashboard();
  if(ok){
    msg.innerHTML = newVal
      ? '<div class="status-msg ok">تم إظهار خانة التوقعات للجميع ✅</div>'
      : '<div class="status-msg ok">تم إخفاء خانة التوقعات عن الجميع.</div>';
  }else{
    e.target.checked = !newVal;
    PRED_DATA.enabled = !newVal;
    msg.innerHTML = '<div class="status-msg err">تعذّر الحفظ، حاول مرة ثانية.</div>';
  }
  updateRoundSettingsStatus();
});

// ---------- تفعيل/إخفاء قسم "تحدي مواجهة الجولة" (لوحة المنظم) ----------
// نفس فكرة تفعيل/إخفاء التوقعات أعلاه، بس للميزة الجديدة (9.16): خيار
// للمنظم يقدر يفعّل أو يخفي قسم مواجهات الجولة عن كل الزوار بأي وقت —
// مثلاً لو حاب يجرّب ميزات ثانية أول، أو يوقفها مؤقتًا بدون حذف كودها.
// القيمة مشتركة (DATA.duelsEnabled) فتُحفظ وتُقرأ مع بيانات الجولات نفسها
// (saveData/loadData/المزامنة اللحظية) — غيابها (بيانات قديمة من قبل هذا
// الخيار) يُعامَل كـ "مفعّل" افتراضيًا حتى ما تختفي الميزة فجأة عن أحد.
document.getElementById('duelsEnabledToggle').addEventListener('change', async (e)=>{
  const msg = document.getElementById('duelsEnabledMsg');
  const newVal = e.target.checked;
  const prevVal = DATA.duelsEnabled;
  DATA.duelsEnabled = newVal;
  e.target.disabled = true;
  const ok = await saveData();
  e.target.disabled = false;
  renderWeeklyDuels();
  if(ok){
    msg.innerHTML = newVal
      ? '<div class="status-msg ok">تم إظهار قسم مواجهة الجولة للجميع ✅</div>'
      : '<div class="status-msg ok">تم إخفاء قسم مواجهة الجولة عن الجميع.</div>';
  }else{
    e.target.checked = !newVal;
    DATA.duelsEnabled = prevVal;
    msg.innerHTML = '<div class="status-msg err">تعذّر الحفظ، حاول مرة ثانية.</div>';
  }
  updateRoundSettingsStatus();
});

// ---------- تفعيل/إخفاء قسم "🗳️ تحدي الجولة" (لوحة المنظم) ----------
// نفس فكرة تفعيل/إخفاء تحدي مواجهة الجولة أعلاه، بس لميزة التصويت على بطل
// الجولة القادمة (renderRoundChallenge) — لم يكن لها خيار إخفاء/إظهار سابقًا
// رغم وجوده لبقية ميزات "الجولات" المشابهة (9/10 سبتمبر 2026).
document.getElementById('roundChallengeEnabledToggle').addEventListener('change', async (e)=>{
  const msg = document.getElementById('roundChallengeEnabledMsg');
  const newVal = e.target.checked;
  const prevVal = DATA.roundChallengeEnabled;
  DATA.roundChallengeEnabled = newVal;
  e.target.disabled = true;
  const ok = await saveData();
  e.target.disabled = false;
  renderRoundChallenge();
  if(ok){
    msg.innerHTML = newVal
      ? '<div class="status-msg ok">تم إظهار قسم تحدي الجولة للجميع ✅</div>'
      : '<div class="status-msg ok">تم إخفاء قسم تحدي الجولة عن الجميع.</div>';
  }else{
    e.target.checked = !newVal;
    DATA.roundChallengeEnabled = prevVal;
    msg.innerHTML = '<div class="status-msg err">تعذّر الحفظ، حاول مرة ثانية.</div>';
  }
  updateRoundSettingsStatus();
});

// ---------- نسخة احتياطية: تصدير واستيراد ----------
// بما إن قاعدة Firebase مفتوحة الصلاحيات بالكامل (أي شخص يعرف رابطها يقدر
// يكتب فيها)، أي خطأ أو طارئ ممكن يخرّب بيانات الموسم كاملة. هذا الزرّان
// يعطيان المنظم خط رجعة سريع: تنزيل كل البيانات (الجولات + التوقعات) كملف
// JSON واحد بأي وقت، واستعادتها من نفس الملف لو صار خلل.
document.getElementById('exportBackupBtn').addEventListener('click', ()=>{
  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: DATA,
    predictions: PRED_DATA
  };
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0,10);
  a.href = url;
  a.download = `brookie-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 2000);
  const msg = document.getElementById('backupMsg');
  if(msg) msg.innerHTML = '<div class="status-msg ok">تم تنزيل النسخة الاحتياطية ✅</div>';
  try{ localStorage.setItem('brookie_last_backup_at', String(Date.now())); }catch(e){}
  updateLastBackupLabel();
});

document.getElementById('importBackupBtn').addEventListener('click', ()=>{
  document.getElementById('importBackupInput').click();
});

document.getElementById('importBackupInput').addEventListener('change', (e)=>{
  const msg = document.getElementById('backupMsg');
  const file = e.target.files && e.target.files[0];
  e.target.value = ''; // يسمح باختيار نفس الملف مرة ثانية لاحقًا
  if(!file) return;

  const reader = new FileReader();
  reader.onload = async ()=>{
    let parsed;
    try{
      parsed = JSON.parse(reader.result);
    }catch(err){
      msg.innerHTML = '<div class="status-msg err">الملف غير صالح — تأكد إنه ملف نسخة احتياطية JSON صحيح.</div>';
      return;
    }
    if(!parsed || typeof parsed !== 'object' || !parsed.data){
      msg.innerHTML = '<div class="status-msg err">الملف لا يحتوي على بيانات نسخة احتياطية معروفة.</div>';
      return;
    }
    const roundsCount = Array.isArray(parsed.data.rounds) ? parsed.data.rounds.length : 0;
    const exportedLabel = parsed.exportedAt ? new Date(parsed.exportedAt).toLocaleString('ar') : 'غير معروف';
    const sure = await customConfirm(
      `تحذير: هذا الإجراء يستبدل كل بيانات الجولات والتوقعات الحالية على الموقع الحي لكل الزوار بمحتوى هذا الملف.\n\n` +
      `تاريخ تصدير الملف: ${exportedLabel}\nعدد الجولات في الملف: ${roundsCount}\n\n` +
      `هل أنت متأكد إنك تبي تستعيد هذه النسخة الآن؟`,
      {confirmText: 'استعادة النسخة'}
    );
    if(!sure) return;

    applyLoadedData(parsed.data);
    applyLoadedPredictions(parsed.predictions || null);

    const okData = await saveData();
    const okPred = await savePredictions();
    renderAll();
    renderPredictions();
    renderMyDashboard();
    updateRoundSettingsStatus();
    renderPastRoundsChips();
    const roundNumEl2 = document.getElementById('roundNumber');
    if(roundNumEl2) roundNumEl2.value = getCurrentRoundNumber() + 1;

    msg.innerHTML = (okData && okPred)
      ? '<div class="status-msg ok">تم استعادة النسخة الاحتياطية بنجاح ✅</div>'
      : '<div class="status-msg err">تعذّرت الاستعادة كاملة، تحقق من الاتصال وحاول مرة ثانية.</div>';
  };
  reader.onerror = ()=>{
    msg.innerHTML = '<div class="status-msg err">تعذّرت قراءة الملف.</div>';
  };
  reader.readAsText(file);
});

// قفل تغيير رمز المنظم بكود خاص إضافي (SUPER_ADMIN_CODE) — يمنع أي شخص
// يعرف رمز دخول المنظم العادي فقط (لو كان مشتركًا بين عدة أشخاص) من تغيير
// الرمز؛ فقط من يعرف الكود الخاص يقدر يفتح حقول التغيير (طلب المستخدم
// 8 سبتمبر 2026).
document.getElementById('unlockPinChangeBtn').addEventListener('click', ()=>{
  const unlockMsg = document.getElementById('unlockPinMsg');
  const code = document.getElementById('superCodeInput').value.trim();
  if(code === SUPER_ADMIN_CODE){
    pinChangeUnlocked = true;
    document.getElementById('pinChangeFields').style.display = '';
    document.getElementById('pinChangeLock').style.display = 'none';
    document.getElementById('superCodeInput').value = '';
    unlockMsg.innerHTML = '';
  }else{
    unlockMsg.innerHTML = '<div class="status-msg err">كود خاص غير صحيح.</div>';
  }
});

// تغيير رمز دخول المنظم من داخل اللوحة — يُحفظ على Firebase (مفتاح
// "organizer_pin")، فيرفع الأمان شويًا (بدل رمز ثابت بالكود لأي شخص يشوف
// الملف) ويسمح بتغييره لو انتشر بين ناس مو مفروض يشوفونه، بدون أي تعديل كود
// (طلب المستخدم 7 سبتمبر 2026).
document.getElementById('changePinBtn').addEventListener('click', async ()=>{
  const msg = document.getElementById('changePinMsg');
  if(!pinChangeUnlocked){
    msg.innerHTML = '<div class="status-msg err">لازم تدخل الكود الخاص أولاً.</div>';
    return;
  }
  const newPin = document.getElementById('newPinInput').value.trim();
  const confirmPin = document.getElementById('confirmPinInput').value.trim();
  if(newPin.length < 4){
    msg.innerHTML = '<div class="status-msg err">الرمز الجديد لازم يكون 4 أرقام على الأقل.</div>';
    return;
  }
  if(newPin !== confirmPin){
    msg.innerHTML = '<div class="status-msg err">الرمزان غير متطابقين — تأكد من كتابتهما بنفس الشكل.</div>';
    return;
  }
  const sure = await customConfirm(
    `سيتم تغيير رمز دخول المنظم فورًا لكل الأجهزة إلى "${newPin}". تأكد إنك حافظه بمكان آمن قبل المتابعة.`,
    {confirmText: 'تغيير الرمز'}
  );
  if(!sure) return;
  try{
    await window.storage.set('organizer_pin', newPin, true);
    CURRENT_ADMIN_PIN = newPin;
    document.getElementById('newPinInput').value = '';
    document.getElementById('confirmPinInput').value = '';
    pinChangeUnlocked = false;
    document.getElementById('pinChangeFields').style.display = 'none';
    document.getElementById('pinChangeLock').style.display = '';
    msg.innerHTML = '<div class="status-msg ok">تم تغيير رمز الدخول بنجاح ✅ استخدم الرمز الجديد من الآن.</div>';
  }catch(e){
    msg.innerHTML = '<div class="status-msg err">تعذّر الحفظ، تحقق من الاتصال وحاول مرة ثانية.</div>';
  }
});

document.getElementById('toggleCodesBtn').addEventListener('click', ()=>{
  const box = document.getElementById('participantCodesBox');
  const btn = document.getElementById('toggleCodesBtn');
  const showing = box.style.display !== 'none';
  if(showing){
    box.style.display = 'none';
    btn.textContent = '👁️ إظهار الرموز';
    return;
  }
  box.innerHTML = PARTICIPANTS.map(p=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px dotted var(--line);">
      <span>${p.name}</span>
      <span style="display:flex;align-items:center;gap:8px;">
        <span style="font-weight:800;letter-spacing:1px;">${PARTICIPANT_CODES[p.id] || '—'}</span>
        <button type="button" class="btn ghost copy-btn copy-code-btn" data-code="${PARTICIPANT_CODES[p.id] || ''}">📋 نسخ</button>
      </span>
    </div>`).join('');
  box.style.display = '';
  btn.textContent = '🙈 إخفاء الرموز';
});
document.getElementById('participantCodesBox').addEventListener('click', (e)=>{
  const btn = e.target.closest('.copy-code-btn');
  if(!btn) return;
  copyToClipboardWithFeedback(btn.dataset.code, btn);
});
document.querySelectorAll('.copy-link-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const url = btn.dataset.link === 'report' ? REPORT_URL : SITE_URL;
    copyToClipboardWithFeedback(url, btn);
  });
});

// رسالة تذكير جاهزة للواتساب — تنسخ نصًا كاملًا (رقم الجولة القادمة + رابط
// صفحة "ساهم بالبيانات") يقدر المنظم يلصقه مباشرة بجروب الواتساب بدل كتابته
// يدويًا كل أسبوع (طلب المستخدم 7 سبتمبر 2026).
const copyReminderMsgBtnEl = document.getElementById('copyReminderMsgBtn');
if(copyReminderMsgBtnEl){
  copyReminderMsgBtnEl.addEventListener('click', ()=>{
    const nextRound = getCurrentRoundNumber() + 1;
    let msg = `⚽ تذكير دوري بروكي الفانتازي — الجولة ${nextRound}\n\n`
      + `مين عنده نتيجة أي نادٍ من أندية الجولة، يسجّلها من هنا (يستغرق دقيقة):\n${REPORT_URL}\n\n`
      + `يساعدنا نطلع الترتيب أسرع وأدق 🙏`;
    // قسم تكريم البطل — ميزة 8: سطر إضافي عن حامل اللقب برسالة التذكير
    if(CHAMPION_FEATURES.whatsapp_line && CHAMPION_ID){
      const champ = PARTICIPANTS.find(p=>p.id===CHAMPION_ID);
      if(champ) msg += `\n\n🏆 حامل اللقب: ${champ.name}`;
    }
    copyToClipboardWithFeedback(msg, copyReminderMsgBtnEl);
  });
}

// نسخ كل رموز المشاركين دفعة وحدة كنص واحد منسّق (اسم: رمز بكل سطر) — بدل
// نسخ كل رمز على حدة عند الحاجة لإرسالها كلها لجهة ما (طلب المستخدم 7 سبتمبر
// 2026).
const copyAllCodesBtnEl = document.getElementById('copyAllCodesBtn');
if(copyAllCodesBtnEl){
  copyAllCodesBtnEl.addEventListener('click', ()=>{
    const text = PARTICIPANTS.map(p=>`${p.name}: ${PARTICIPANT_CODES[p.id] || '—'}`).join('\n');
    copyToClipboardWithFeedback(text, copyAllCodesBtnEl);
  });
}

// ---------- رموز QR لرابطي الموقع وصفحة المساهمة ----------
// تُولَّد مرة واحدة فقط (guard بمتغيّر) عند أول تسجيل دخول ناجح — إعادة توليدها
// مع كل دخول كانت ستكرّر عناصر canvas داخل نفس الصندوق.
let _qrCodesRendered = false;
function renderQuickLinkCodes(){
  if(_qrCodesRendered) return;
  if(typeof QRCode === 'undefined') return; // تعذّر تحميل المكتبة (مثلاً بدون إنترنت) — نتجاهل بصمت
  const siteBox = document.getElementById('qrSite');
  const reportBox = document.getElementById('qrReport');
  if(!siteBox || !reportBox) return;
  new QRCode(siteBox, { text: SITE_URL, width: 120, height: 120, colorDark: '#040421', colorLight: '#ffffff' });
  new QRCode(reportBox, { text: REPORT_URL, width: 120, height: 120, colorDark: '#040421', colorLight: '#ffffff' });
  _qrCodesRendered = true;
}

// تنزيل كود QR كصورة PNG — مكتبة qrcodejs ترسم بـ canvas ثم تولّد فوقه <img>
// بنفس المحتوى (بديل توافق لأجهزة قديمة)، فنفضّل الـ img.src الجاهز (data
// URL) ونرجع لـ canvas.toDataURL لو ما وُجد (طلب المستخدم 7 سبتمبر 2026).
function downloadQrPng(boxId, filename){
  const box = document.getElementById(boxId);
  if(!box) return;
  const img = box.querySelector('img');
  const canvas = box.querySelector('canvas');
  let dataUrl = null;
  if(img && img.src) dataUrl = img.src;
  else if(canvas) dataUrl = canvas.toDataURL('image/png');
  if(!dataUrl) return;
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
document.querySelectorAll('.download-qr-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const isReport = btn.dataset.qr === 'report';
    downloadQrPng(isReport ? 'qrReport' : 'qrSite', isReport ? 'brookie-report-qr.png' : 'brookie-site-qr.png');
  });
});
