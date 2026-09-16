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
  const wallPill = document.getElementById('roundWallStatusPill');
  if(wallPill){
    const on = DATA.roundWallEnabled !== false;
    wallPill.textContent = on ? '🧱 مفعّل' : '🧱 معطّل';
    wallPill.className = 'status-pill ' + (on ? 'on' : 'off');
  }
  const nrPill = document.getElementById('nameReactionsStatusPill');
  if(nrPill){
    const on = DATA.nameReactionsEnabled !== false;
    nrPill.textContent = on ? '👏 مفعّل' : '👏 معطّل';
    nrPill.className = 'status-pill ' + (on ? 'on' : 'off');
  }
  const sdPill = document.getElementById('seasonDuelStatusPill');
  if(sdPill){
    const on = DATA.seasonDuelEnabled !== false;
    sdPill.textContent = on ? '🥊 مفعّل' : '🥊 معطّل';
    sdPill.className = 'status-pill ' + (on ? 'on' : 'off');
  }
  const rsPill = document.getElementById('roundStoryStatusPill');
  if(rsPill){
    const on = DATA.roundStoryEnabled !== false;
    rsPill.textContent = on ? '🎙️ مفعّل' : '🎙️ معطّل';
    rsPill.className = 'status-pill ' + (on ? 'on' : 'off');
  }
  const wnPill = document.getElementById('whatsNewStatusPill');
  if(wnPill){
    const on = DATA.whatsNewEnabled !== false;
    wnPill.textContent = on ? '🎁 مفعّل' : '🎁 معطّل';
    wnPill.className = 'status-pill ' + (on ? 'on' : 'off');
  }
  const ppPill = document.getElementById('participantProfileStatusPill');
  if(ppPill){
    const on = DATA.participantProfileEnabled !== false;
    ppPill.textContent = on ? '📋 مفعّل' : '📋 معطّل';
    ppPill.className = 'status-pill ' + (on ? 'on' : 'off');
  }
  const rpPill = document.getElementById('roundPollStatusPill');
  if(rpPill){
    const on = DATA.roundPollEnabled !== false;
    rpPill.textContent = on ? '🗳️ مفعّل' : '🗳️ معطّل';
    rpPill.className = 'status-pill ' + (on ? 'on' : 'off');
  }
  const sgPill = document.getElementById('subGroupsStatusPill');
  if(sgPill){
    const on = DATA.subGroupsEnabled !== false;
    sgPill.textContent = on ? '👥 مفعّل' : '👥 معطّل';
    sgPill.className = 'status-pill ' + (on ? 'on' : 'off');
  }
  const hcPill = document.getElementById('hotColdStreaksStatusPill');
  if(hcPill){
    const on = DATA.hotColdStreaksEnabled !== false;
    hcPill.textContent = on ? '🔥 مفعّل' : '🔥 معطّل';
    hcPill.className = 'status-pill ' + (on ? 'on' : 'off');
  }
  const btPill = document.getElementById('badgeToastStatusPill');
  if(btPill){
    const on = DATA.badgeToastEnabled !== false;
    btPill.textContent = on ? '🏅 مفعّل' : '🏅 معطّل';
    btPill.className = 'status-pill ' + (on ? 'on' : 'off');
  }
  const cslPill = document.getElementById('clubSwapLabStatusPill');
  if(cslPill){
    const on = DATA.clubSwapLabEnabled !== false;
    cslPill.textContent = on ? '🔬 مفعّل' : '🔬 معطّل';
    cslPill.className = 'status-pill ' + (on ? 'on' : 'off');
  }
  const sbPill = document.getElementById('statusBarStatusPill');
  if(sbPill){
    const on = DATA.statusBarEnabled !== false;
    sbPill.textContent = on ? '📌 مفعّل' : '📌 معطّل';
    sbPill.className = 'status-pill ' + (on ? 'on' : 'off');
  }
  const saPill = document.getElementById('standingsAnimationStatusPill');
  if(saPill){
    const on = DATA.standingsAnimationEnabled !== false;
    saPill.textContent = on ? '🎞️ مفعّل' : '🎞️ معطّل';
    saPill.className = 'status-pill ' + (on ? 'on' : 'off');
  }
  const lfPill = document.getElementById('liveFocusModeStatusPill');
  if(lfPill){
    const on = DATA.liveFocusModeEnabled !== false;
    lfPill.textContent = on ? '🔴 مفعّل' : '🔴 معطّل';
    lfPill.className = 'status-pill ' + (on ? 'on' : 'off');
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
    // قسم "المواجهة المباشرة" فُتح لواجهة المشارك بتاريخ 15 سبتمبر 2026
    // (ميزة 3 من حزمة التفاعل الاجتماعي) — لم يعد مقيّدًا بتسجيل دخول
    // المنظم؛ renderH2H() نفسها تتحكم بظهوره حسب هوية الزائر.
    renderH2H();
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
    const wallToggle = document.getElementById('roundWallEnabledToggle');
    if(wallToggle) wallToggle.checked = DATA.roundWallEnabled !== false;
    const nrToggle = document.getElementById('nameReactionsEnabledToggle');
    if(nrToggle) nrToggle.checked = DATA.nameReactionsEnabled !== false;
    const sdToggle = document.getElementById('seasonDuelEnabledToggle');
    if(sdToggle) sdToggle.checked = DATA.seasonDuelEnabled !== false;
    const rsToggle = document.getElementById('roundStoryEnabledToggle');
    if(rsToggle) rsToggle.checked = DATA.roundStoryEnabled !== false;
    const wnToggle = document.getElementById('whatsNewEnabledToggle');
    if(wnToggle) wnToggle.checked = DATA.whatsNewEnabled !== false;
    const ppToggle = document.getElementById('participantProfileEnabledToggle');
    if(ppToggle) ppToggle.checked = DATA.participantProfileEnabled !== false;
    const rpToggle = document.getElementById('roundPollEnabledToggle');
    if(rpToggle) rpToggle.checked = DATA.roundPollEnabled !== false;
    const sgToggle = document.getElementById('subGroupsEnabledToggle');
    if(sgToggle) sgToggle.checked = DATA.subGroupsEnabled !== false;
    renderSubGroupMemberCheckboxes();
    renderAdminSubGroupsList();
    const hcToggle = document.getElementById('hotColdStreaksEnabledToggle');
    if(hcToggle) hcToggle.checked = DATA.hotColdStreaksEnabled !== false;
    const btToggle = document.getElementById('badgeToastEnabledToggle');
    if(btToggle) btToggle.checked = DATA.badgeToastEnabled !== false;
    const cslToggle = document.getElementById('clubSwapLabEnabledToggle');
    if(cslToggle) cslToggle.checked = DATA.clubSwapLabEnabled !== false;
    const sbToggle = document.getElementById('statusBarEnabledToggle');
    if(sbToggle) sbToggle.checked = DATA.statusBarEnabled !== false;
    const saToggle = document.getElementById('standingsAnimationEnabledToggle');
    if(saToggle) saToggle.checked = DATA.standingsAnimationEnabled !== false;
    const lfToggle = document.getElementById('liveFocusModeEnabledToggle');
    if(lfToggle) lfToggle.checked = DATA.liveFocusModeEnabled !== false;
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

// ---------- تفعيل/إخفاء "🧱 جدار الجولة" (لوحة المنظم) ----------
// نفس نمط بقية مفاتيح إظهار/إخفاء أقسام الجولة أعلاه، لميزة جدار الجولة
// الاجتماعي الجديدة (تعليقات متعددة + ردود فعل — راجع js/features/round-wall.js).
// القيمة (DATA.roundWallEnabled) مشتركة وتُحفظ مع بقية بيانات الجولات، لكن
// رسائل الجدار نفسها منفصلة تمامًا بمسار Firebase خاص بها (لا تتأثر بهذا
// المفتاح سوى بالظهور/الاختفاء عن الزوار).
document.getElementById('roundWallEnabledToggle').addEventListener('change', async (e)=>{
  const msg = document.getElementById('roundWallEnabledMsg');
  const newVal = e.target.checked;
  const prevVal = DATA.roundWallEnabled;
  DATA.roundWallEnabled = newVal;
  e.target.disabled = true;
  const ok = await saveData();
  e.target.disabled = false;
  renderRoundWall();
  if(ok){
    msg.innerHTML = newVal
      ? '<div class="status-msg ok">تم إظهار جدار الجولة للجميع ✅</div>'
      : '<div class="status-msg ok">تم إخفاء جدار الجولة عن الجميع.</div>';
  }else{
    e.target.checked = !newVal;
    DATA.roundWallEnabled = prevVal;
    msg.innerHTML = '<div class="status-msg err">تعذّر الحفظ، حاول مرة ثانية.</div>';
  }
  updateRoundSettingsStatus();
});

// ---------- تفعيل/إخفاء "👏 ردود فعل الأسماء بالترتيب" (لوحة المنظم) ----------
document.getElementById('nameReactionsEnabledToggle').addEventListener('change', async (e)=>{
  const msg = document.getElementById('nameReactionsEnabledMsg');
  const newVal = e.target.checked;
  const prevVal = DATA.nameReactionsEnabled;
  DATA.nameReactionsEnabled = newVal;
  e.target.disabled = true;
  const ok = await saveData();
  e.target.disabled = false;
  renderNameReactions();
  if(ok){
    msg.innerHTML = newVal
      ? '<div class="status-msg ok">تم إظهار ردود فعل الأسماء للجميع ✅</div>'
      : '<div class="status-msg ok">تم إخفاء ردود فعل الأسماء عن الجميع.</div>';
  }else{
    e.target.checked = !newVal;
    DATA.nameReactionsEnabled = prevVal;
    msg.innerHTML = '<div class="status-msg err">تعذّر الحفظ، حاول مرة ثانية.</div>';
  }
  updateRoundSettingsStatus();
});

// ---------- تفعيل/إخفاء "🥊 نزال الموسم" (لوحة المنظم) ----------
// نفس النمط تمامًا؛ نزالات الموسم نفسها بمسار Firebase منفصل
// (brookie/season-duels) — هذا المفتاح يتحكم فقط بظهور القسم عن الزوار.
document.getElementById('seasonDuelEnabledToggle').addEventListener('change', async (e)=>{
  const msg = document.getElementById('seasonDuelEnabledMsg');
  const newVal = e.target.checked;
  const prevVal = DATA.seasonDuelEnabled;
  DATA.seasonDuelEnabled = newVal;
  e.target.disabled = true;
  const ok = await saveData();
  e.target.disabled = false;
  renderSeasonDuel();
  renderMySeasonDuels();
  if(ok){
    msg.innerHTML = newVal
      ? '<div class="status-msg ok">تم إظهار نزال الموسم للجميع ✅</div>'
      : '<div class="status-msg ok">تم إخفاء نزال الموسم عن الجميع.</div>';
  }else{
    e.target.checked = !newVal;
    DATA.seasonDuelEnabled = prevVal;
    msg.innerHTML = '<div class="status-msg err">تعذّر الحفظ، حاول مرة ثانية.</div>';
  }
  updateRoundSettingsStatus();
});

// ---------- تفعيل/إخفاء "🎙️ قصة الجولة الساخرة" (لوحة المنظم) ----------
document.getElementById('roundStoryEnabledToggle').addEventListener('change', async (e)=>{
  const msg = document.getElementById('roundStoryEnabledMsg');
  const newVal = e.target.checked;
  const prevVal = DATA.roundStoryEnabled;
  DATA.roundStoryEnabled = newVal;
  e.target.disabled = true;
  const ok = await saveData();
  e.target.disabled = false;
  renderRoundStoryCard();
  if(ok){
    msg.innerHTML = newVal
      ? '<div class="status-msg ok">تم إظهار قصة الجولة الساخرة للجميع ✅</div>'
      : '<div class="status-msg ok">تم إخفاء قصة الجولة الساخرة عن الجميع.</div>';
  }else{
    e.target.checked = !newVal;
    DATA.roundStoryEnabled = prevVal;
    msg.innerHTML = '<div class="status-msg err">تعذّر الحفظ، حاول مرة ثانية.</div>';
  }
  updateRoundSettingsStatus();
});

// ---------- تفعيل/إخفاء "🎁 اللي فاتك" (لوحة المنظم) ----------
document.getElementById('whatsNewEnabledToggle').addEventListener('change', async (e)=>{
  const msg = document.getElementById('whatsNewEnabledMsg');
  const newVal = e.target.checked;
  const prevVal = DATA.whatsNewEnabled;
  DATA.whatsNewEnabled = newVal;
  e.target.disabled = true;
  const ok = await saveData();
  e.target.disabled = false;
  renderWhatsNewCard();
  if(ok){
    msg.innerHTML = newVal
      ? '<div class="status-msg ok">تم تفعيل بطاقة "اللي فاتك" ✅</div>'
      : '<div class="status-msg ok">تم إخفاء بطاقة "اللي فاتك".</div>';
  }else{
    e.target.checked = !newVal;
    DATA.whatsNewEnabled = prevVal;
    msg.innerHTML = '<div class="status-msg err">تعذّر الحفظ، حاول مرة ثانية.</div>';
  }
  updateRoundSettingsStatus();
});

// ---------- تفعيل/إخفاء "📋 الملف الشخصي الكامل" (لوحة المنظم) ----------
document.getElementById('participantProfileEnabledToggle').addEventListener('change', async (e)=>{
  const msg = document.getElementById('participantProfileEnabledMsg');
  const newVal = e.target.checked;
  const prevVal = DATA.participantProfileEnabled;
  DATA.participantProfileEnabled = newVal;
  e.target.disabled = true;
  const ok = await saveData();
  e.target.disabled = false;
  renderParticipants();
  if(ok){
    msg.innerHTML = newVal
      ? '<div class="status-msg ok">تم إظهار الملف الكامل بكروت المشاركين ✅</div>'
      : '<div class="status-msg ok">تم إخفاء زر الملف الكامل.</div>';
  }else{
    e.target.checked = !newVal;
    DATA.participantProfileEnabled = prevVal;
    msg.innerHTML = '<div class="status-msg err">تعذّر الحفظ، حاول مرة ثانية.</div>';
  }
  updateRoundSettingsStatus();
});

// ---------- تفعيل/إخفاء "🗳️ سؤال الجولة" (لوحة المنظم) ----------
document.getElementById('roundPollEnabledToggle').addEventListener('change', async (e)=>{
  const msg = document.getElementById('roundPollEnabledMsg');
  const newVal = e.target.checked;
  const prevVal = DATA.roundPollEnabled;
  DATA.roundPollEnabled = newVal;
  e.target.disabled = true;
  const ok = await saveData();
  e.target.disabled = false;
  renderRoundPoll();
  if(ok){
    msg.innerHTML = newVal
      ? '<div class="status-msg ok">تم إظهار سؤال الجولة للجميع ✅</div>'
      : '<div class="status-msg ok">تم إخفاء سؤال الجولة عن الجميع.</div>';
  }else{
    e.target.checked = !newVal;
    DATA.roundPollEnabled = prevVal;
    msg.innerHTML = '<div class="status-msg err">تعذّر الحفظ، حاول مرة ثانية.</div>';
  }
  updateRoundSettingsStatus();
});

// ---------- تفعيل/إخفاء "👥 المجموعات الفرعية" (لوحة المنظم) ----------
document.getElementById('subGroupsEnabledToggle').addEventListener('change', async (e)=>{
  const msg = document.getElementById('subGroupsEnabledMsg');
  const newVal = e.target.checked;
  const prevVal = DATA.subGroupsEnabled;
  DATA.subGroupsEnabled = newVal;
  e.target.disabled = true;
  const ok = await saveData();
  e.target.disabled = false;
  renderSubGroups();
  if(ok){
    msg.innerHTML = newVal
      ? '<div class="status-msg ok">تم إظهار المجموعات الفرعية للجميع ✅</div>'
      : '<div class="status-msg ok">تم إخفاء المجموعات الفرعية عن الجميع.</div>';
  }else{
    e.target.checked = !newVal;
    DATA.subGroupsEnabled = prevVal;
    msg.innerHTML = '<div class="status-msg err">تعذّر الحفظ، حاول مرة ثانية.</div>';
  }
  updateRoundSettingsStatus();
});

// ---------- تفعيل/إخفاء "🔥❄️ سلاسل الحظ" (لوحة المنظم) ----------
document.getElementById('hotColdStreaksEnabledToggle').addEventListener('change', async (e)=>{
  const msg = document.getElementById('hotColdStreaksEnabledMsg');
  const newVal = e.target.checked;
  const prevVal = DATA.hotColdStreaksEnabled;
  DATA.hotColdStreaksEnabled = newVal;
  e.target.disabled = true;
  const ok = await saveData();
  e.target.disabled = false;
  renderHotColdStreaks();
  if(ok){
    msg.innerHTML = newVal
      ? '<div class="status-msg ok">تم إظهار سلاسل الحظ للجميع ✅</div>'
      : '<div class="status-msg ok">تم إخفاء سلاسل الحظ عن الجميع.</div>';
  }else{
    e.target.checked = !newVal;
    DATA.hotColdStreaksEnabled = prevVal;
    msg.innerHTML = '<div class="status-msg err">تعذّر الحفظ، حاول مرة ثانية.</div>';
  }
  updateRoundSettingsStatus();
});

// ---------- تفعيل/إخفاء "🏅 أوسمة تلقائية" (لوحة المنظم) ----------
document.getElementById('badgeToastEnabledToggle').addEventListener('change', async (e)=>{
  const msg = document.getElementById('badgeToastEnabledMsg');
  const newVal = e.target.checked;
  const prevVal = DATA.badgeToastEnabled;
  DATA.badgeToastEnabled = newVal;
  e.target.disabled = true;
  const ok = await saveData();
  e.target.disabled = false;
  renderBadgeToast();
  if(ok){
    msg.innerHTML = newVal
      ? '<div class="status-msg ok">تم تفعيل تنبيه الأوسمة الجديدة ✅</div>'
      : '<div class="status-msg ok">تم إخفاء تنبيه الأوسمة الجديدة.</div>';
  }else{
    e.target.checked = !newVal;
    DATA.badgeToastEnabled = prevVal;
    msg.innerHTML = '<div class="status-msg err">تعذّر الحفظ، حاول مرة ثانية.</div>';
  }
  updateRoundSettingsStatus();
});

// ---------- تفعيل/إخفاء "🔬 مختبر تبديل الأندية" (لوحة المنظم) ----------
document.getElementById('clubSwapLabEnabledToggle').addEventListener('change', async (e)=>{
  const msg = document.getElementById('clubSwapLabEnabledMsg');
  const newVal = e.target.checked;
  const prevVal = DATA.clubSwapLabEnabled;
  DATA.clubSwapLabEnabled = newVal;
  e.target.disabled = true;
  const ok = await saveData();
  e.target.disabled = false;
  renderClubSwapLab();
  if(ok){
    msg.innerHTML = newVal
      ? '<div class="status-msg ok">تم إظهار مختبر تبديل الأندية للجميع ✅</div>'
      : '<div class="status-msg ok">تم إخفاء مختبر تبديل الأندية عن الجميع.</div>';
  }else{
    e.target.checked = !newVal;
    DATA.clubSwapLabEnabled = prevVal;
    msg.innerHTML = '<div class="status-msg err">تعذّر الحفظ، حاول مرة ثانية.</div>';
  }
  updateRoundSettingsStatus();
});

// ---------- تفعيل/إخفاء "📌 شريط الحالة الشخصية" (لوحة المنظم) ----------
document.getElementById('statusBarEnabledToggle').addEventListener('change', async (e)=>{
  const msg = document.getElementById('statusBarEnabledMsg');
  const newVal = e.target.checked;
  const prevVal = DATA.statusBarEnabled;
  DATA.statusBarEnabled = newVal;
  e.target.disabled = true;
  const ok = await saveData();
  e.target.disabled = false;
  renderPersonalStatusBar();
  if(ok){
    msg.innerHTML = newVal
      ? '<div class="status-msg ok">تم تفعيل شريط الحالة الشخصية ✅</div>'
      : '<div class="status-msg ok">تم إخفاء شريط الحالة الشخصية.</div>';
  }else{
    e.target.checked = !newVal;
    DATA.statusBarEnabled = prevVal;
    msg.innerHTML = '<div class="status-msg err">تعذّر الحفظ، حاول مرة ثانية.</div>';
  }
  updateRoundSettingsStatus();
});

// ---------- تفعيل/إخفاء "🎞️ حركة إعادة ترتيب الجدول" (لوحة المنظم) ----------
document.getElementById('standingsAnimationEnabledToggle').addEventListener('change', async (e)=>{
  const msg = document.getElementById('standingsAnimationEnabledMsg');
  const newVal = e.target.checked;
  const prevVal = DATA.standingsAnimationEnabled;
  DATA.standingsAnimationEnabled = newVal;
  e.target.disabled = true;
  const ok = await saveData();
  e.target.disabled = false;
  if(ok){
    msg.innerHTML = newVal
      ? '<div class="status-msg ok">تم تفعيل حركة إعادة الترتيب ✅</div>'
      : '<div class="status-msg ok">تم إيقاف حركة إعادة الترتيب.</div>';
  }else{
    e.target.checked = !newVal;
    DATA.standingsAnimationEnabled = prevVal;
    msg.innerHTML = '<div class="status-msg err">تعذّر الحفظ، حاول مرة ثانية.</div>';
  }
  updateRoundSettingsStatus();
});

// ---------- تفعيل/إخفاء "🔴 وضع المباشر المُركَّز" (لوحة المنظم) ----------
document.getElementById('liveFocusModeEnabledToggle').addEventListener('change', async (e)=>{
  const msg = document.getElementById('liveFocusModeEnabledMsg');
  const newVal = e.target.checked;
  const prevVal = DATA.liveFocusModeEnabled;
  DATA.liveFocusModeEnabled = newVal;
  e.target.disabled = true;
  const ok = await saveData();
  e.target.disabled = false;
  renderLiveFocusToggleButton();
  if(ok){
    msg.innerHTML = newVal
      ? '<div class="status-msg ok">تم إتاحة وضع المباشر للزوار ✅</div>'
      : '<div class="status-msg ok">تم إخفاء زر وضع المباشر عن الزوار.</div>';
  }else{
    e.target.checked = !newVal;
    DATA.liveFocusModeEnabled = prevVal;
    msg.innerHTML = '<div class="status-msg err">تعذّر الحفظ، حاول مرة ثانية.</div>';
  }
  updateRoundSettingsStatus();
});

// ---------- نسخة احتياطية: تصدير واستيراد ----------
// بما إن قاعدة Firebase مفتوحة الصلاحيات بالكامل (أي شخص يعرف رابطها يقدر
// يكتب فيها)، أي خطأ أو طارئ ممكن يخرّب بيانات الموسم كاملة. هذا الزرّان
// يعطيان المنظم خط رجعة سريع: تنزيل كل البيانات (الجولات + التوقعات) كملف
// JSON واحد بأي وقت، واستعادتها من نفس الملف لو صار خلل.
// مسارات فايربيس خارج DATA (جدار الجولة، ردود فعل الأسماء، نزال الموسم —
// ميزات 1، 2، 4 من حزمة التفاعل الاجتماعي) — أُبقيت خارج DATA عمدًا لتفادي
// تعارض الكتابة مع saveData() التي تكتب DATA كاملة دفعة واحدة، لكن هذا يعني
// أنها لا تُشمل تلقائيًا بالنسخة الاحتياطية القديمة. نضيفها هنا صراحة تحت
// مفتاح "extra" بالملف المُصدَّر (طلب المستخدم صراحة عند حزمة الـ15 ميزة:
// "اشمل كل البيانات الجديدة بالنسخة الاحتياطية والاستيراد" — 15 سبتمبر 2026).
const BACKUP_EXTRA_PATHS = {
  wall: 'brookie/wall',
  nameReactions: 'brookie/name-reactions',
  seasonDuels: 'brookie/season-duels'
};

async function fetchBackupExtras(){
  const extra = {};
  try{
    const db = _fbInit();
    await Promise.all(Object.entries(BACKUP_EXTRA_PATHS).map(async ([key, path])=>{
      try{
        const snap = await db.ref(path).get();
        extra[key] = snap.exists() ? snap.val() : null;
      }catch(e){ extra[key] = null; }
    }));
  }catch(e){ /* لا يوجد اتصال فايربيس — تُصدَّر النسخة بدون extra، أفضل من فشل التصدير كله */ }
  return extra;
}

document.getElementById('exportBackupBtn').addEventListener('click', async ()=>{
  const msg = document.getElementById('backupMsg');
  const btn = document.getElementById('exportBackupBtn');
  btn.disabled = true;
  if(msg) msg.innerHTML = '<div style="color:var(--muted);font-size:0.82rem;">جارٍ تجهيز النسخة الاحتياطية…</div>';

  const extra = await fetchBackupExtras();
  const backup = {
    version: 2,
    exportedAt: new Date().toISOString(),
    data: DATA,
    predictions: PRED_DATA,
    extra
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
  btn.disabled = false;
  if(msg) msg.innerHTML = '<div class="status-msg ok">تم تنزيل النسخة الاحتياطية (شاملة الجدار وردود الفعل ونزال الموسم) ✅</div>';
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
    const hasExtra = parsed.extra && typeof parsed.extra === 'object';
    const extraNote = hasExtra
      ? '\nيشمل الملف أيضًا: جدار الجولة وردود فعل الأسماء ونزال الموسم — سيُستبدل محتواها الحالي أيضًا.'
      : '\n(ملف قديم بلا جدار الجولة/ردود الفعل/نزال الموسم — هذه البيانات لن تتأثر بالاستعادة.)';
    const sure = await customConfirm(
      `تحذير: هذا الإجراء يستبدل كل بيانات الجولات والتوقعات الحالية على الموقع الحي لكل الزوار بمحتوى هذا الملف.\n\n` +
      `تاريخ تصدير الملف: ${exportedLabel}\nعدد الجولات في الملف: ${roundsCount}${extraNote}\n\n` +
      `هل أنت متأكد إنك تبي تستعيد هذه النسخة الآن؟`,
      {confirmText: 'استعادة النسخة'}
    );
    if(!sure) return;

    applyLoadedData(parsed.data);
    applyLoadedPredictions(parsed.predictions || null);

    const okData = await saveData();
    const okPred = await savePredictions();

    let okExtra = true;
    if(hasExtra){
      try{
        const db = _fbInit();
        await Promise.all(Object.entries(BACKUP_EXTRA_PATHS).map(([key, path])=>
          db.ref(path).set(parsed.extra[key] === undefined ? null : parsed.extra[key])
        ));
      }catch(e){ okExtra = false; }
    }

    renderAll();
    renderPredictions();
    renderMyDashboard();
    updateRoundSettingsStatus();
    renderPastRoundsChips();
    const roundNumEl2 = document.getElementById('roundNumber');
    if(roundNumEl2) roundNumEl2.value = getCurrentRoundNumber() + 1;

    msg.innerHTML = (okData && okPred && okExtra)
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
