/* تهيئة Firebase وتحميل/حفظ DATA و PRED_DATA والمزامنة اللحظية وتتبع الزيارات */
async function loadAdminPin(){
  try{
    const res = await window.storage.get('organizer_pin', true);
    if(res && res.value && String(res.value).trim()) CURRENT_ADMIN_PIN = String(res.value).trim();
  }catch(e){ /* يبقى الرمز الافتراضي عند تعذّر القراءة */ }
}

let DATA = {rounds:[]};

// ---------- Storage ----------
let storageAvailable = true;
let _fbDb = null;
function _fbInit(){
  if(_fbDb) return _fbDb;
  if(typeof firebase === 'undefined') throw new Error('مكتبة Firebase لم تُحمَّل بعد');
  if(FIREBASE_CONFIG.apiKey === 'REPLACE_ME') throw new Error('إعدادات Firebase غير مُهيّأة بعد');
  if(!firebase.apps || !firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
  _fbDb = firebase.database();
  return _fbDb;
}
window.storage = {
  async get(key, shared){
    if(shared === false){
      try{
        const raw = localStorage.getItem(key);
        return {value: raw === null ? null : JSON.parse(raw)};
      }catch(e){ return {value: null}; }
    }
    const db = _fbInit();
    const snap = await db.ref('brookie/' + key).get();
    return {value: snap.exists() ? snap.val() : null};
  },
  async set(key, value, shared){
    if(shared === false){
      try{ localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch(e){ return false; }
    }
    const db = _fbInit();
    await db.ref('brookie/' + key).set(value);
    return true;
  }
};

// يطبّق قيمة DATA خام (من قراءة لمرة واحدة أو من مستمع لحظي) وينظّفها —
// مستخرجة لدالة منفصلة عشان تُستخدم في المسارين: القراءة اليدوية (loadData)
// والمزامنة اللحظية (startRealtimeSync) بدون تكرار منطق التصحيح.
function applyLoadedData(raw){
  let loaded = false;
  if(raw !== undefined && raw !== null){
    try{
      DATA = (typeof raw === 'string') ? JSON.parse(raw) : raw;
      loaded = true;
    }catch(e){
      console.warn('تعذّر تفسير البيانات المحفوظة:', e);
    }
  }
  if(!loaded){
    DATA = {rounds:[]};
  }
  // ملاحظة: Firebase Realtime Database لا يخزّن المصفوفات الفارغة (rounds:[])
  // كمفتاح فعلي — يحذفها من الشجرة عند القراءة. لذلك عند غياب rounds فقط
  // (وليس كل الكائن) يجب تصحيح هذا الحقل بمفرده، لا استبدال DATA بالكامل —
  // وإلا نفقد أي حقول أخرى محفوظة معه مثل nextRoundAt (خطأ حقيقي اكتُشف
  // وأُصلح 3 سبتمبر 2026 أثناء اختبار مزامنة العداد بين زائرين حقيقيين).
  if(!DATA || typeof DATA !== 'object'){
    DATA = {rounds:[]};
  }else if(!Array.isArray(DATA.rounds)){
    DATA.rounds = [];
  }
}

async function loadData(){
  try{
    const res = await window.storage.get(STORAGE_KEY, true);
    applyLoadedData(res && res.value);
  }catch(e){
    console.warn('لا توجد بيانات محفوظة بعد أو تعذّر القراءة:', e);
    applyLoadedData(null);
  }
  renderAll();
}

async function saveData(){
  // المحاولة الأولى: تمرير الكائن مباشرة
  try{
    const r = await window.storage.set(STORAGE_KEY, DATA, true);
    if(r) { storageAvailable = true; return true; }
  }catch(e){
    console.warn('فشلت المحاولة الأولى للحفظ:', e);
  }
  // المحاولة الثانية: تمرير نص JSON
  try{
    const r2 = await window.storage.set(STORAGE_KEY, JSON.stringify(DATA), true);
    if(r2) { storageAvailable = true; return true; }
  }catch(e2){
    console.warn('فشلت المحاولة الثانية للحفظ:', e2);
  }
  storageAvailable = false;
  return false;
}
let PRED_DATA = {entries:{}};

// نفس فكرة applyLoadedData أعلاه، لكن لبيانات التوقعات — تُستخدم في القراءة
// اليدوية والمزامنة اللحظية معًا.
function applyLoadedPredictions(raw){
  if(raw !== undefined && raw !== null){
    try{
      PRED_DATA = (typeof raw === 'string') ? JSON.parse(raw) : raw;
    }catch(e){
      console.warn('تعذّر تفسير بيانات التوقعات:', e);
    }
  }
  if(!PRED_DATA || typeof PRED_DATA !== 'object') PRED_DATA = {entries:{}};
  if(!PRED_DATA.entries || typeof PRED_DATA.entries !== 'object') PRED_DATA.entries = {};
  // مفتاح تحكم المنظم بإظهار/إخفاء خانة التوقعات لكل الزوار (بعض الجولات
  // يرغب المنظم بعدم فتح التوقع فيها). افتراضيًا مفعّلة (true) — أي بيانات
  // قديمة محفوظة قبل إضافة هذا الخيار (3 سبتمبر 2026) ما فيها هذا الحقل
  // إطلاقًا، فتُعامَل كمفعّلة حفاظًا على السلوك القديم.
  if(typeof PRED_DATA.enabled !== 'boolean') PRED_DATA.enabled = true;
}

async function loadPredictions(){
  try{
    const res = await window.storage.get(PRED_STORAGE_KEY, true);
    applyLoadedPredictions(res && res.value);
  }catch(e){
    console.warn('تعذّر تحميل التوقعات:', e);
    applyLoadedPredictions(null);
  }
  renderPredictions();
  renderMyDashboard();
}

async function savePredictions(){
  try{
    const r = await window.storage.set(PRED_STORAGE_KEY, PRED_DATA, true);
    if(r) return true;
  }catch(e){ console.warn('فشلت محاولة حفظ التوقعات:', e); }
  try{
    const r2 = await window.storage.set(PRED_STORAGE_KEY, JSON.stringify(PRED_DATA), true);
    if(r2) return true;
  }catch(e2){ console.warn('فشلت المحاولة الثانية لحفظ التوقعات:', e2); }
  return false;
}

// ---------- مزامنة لحظية (بدون زر تحديث) ----------
// بدل الاكتفاء بقراءة واحدة عند فتح الصفحة، نستخدم مستمع Firebase الحي
// (on('value')) على مساري البيانات المشتركة — أي تغيير يحفظه أي شخص (مثلاً
// المنظم يحفظ جولة جديدة) يصل تلقائيًا لكل من فاتح الصفحة الآن، بدون ما
// يحتاج يضغط "تحديث" أو حتى يعيد تحميل الصفحة. لا تمس هذه الدالة نموذج
// إدخال الجولة (roundFormBox) لأن renderAll() لا يعيد بناءه إطلاقًا — فلو
// كان المنظم يملأ نموذجًا حاليًا، وصول تحديث آخر أثناء ذلك لا يمسح ما كتبه.
let _realtimeSyncStarted = false;
function startRealtimeSync(){
  if(_realtimeSyncStarted) return;
  try{
    const db = _fbInit();
    db.ref('brookie/' + STORAGE_KEY).on('value', snap=>{
      applyLoadedData(snap.exists() ? snap.val() : null);
      renderAll();
    }, err=>{ console.warn('انقطعت المزامنة اللحظية لبيانات الجولات:', err); });

    db.ref('brookie/' + PRED_STORAGE_KEY).on('value', snap=>{
      applyLoadedPredictions(snap.exists() ? snap.val() : null);
      renderPredictions();
      renderMyDashboard(); // سطر التوقع باللوحة الشخصية يتبع نفس مفتاح enabled
    }, err=>{ console.warn('انقطعت المزامنة اللحظية للتوقعات:', err); });

    // قسم تكريم البطل — مزامنة لحظية لبطل الموسم الحالي، سجل أبطال المواسم،
    // وأعلام الميزات الـ16 (كلها تصل فورًا لكل الزوار المفتوحين على الصفحة).
    db.ref('brookie/currentChampionId').on('value', snap=>{
      CHAMPION_ID = snap.exists() ? Number(snap.val()) : null;
      renderAll();
      syncChampionAdminUI();
    }, err=>{ console.warn('انقطعت المزامنة اللحظية لبطل الموسم:', err); });

    db.ref('brookie/seasonChampionsArchive').on('value', snap=>{
      let v = snap.exists() ? snap.val() : [];
      SEASON_CHAMPIONS_ARCHIVE = Array.isArray(v) ? v : Object.values(v||{});
      renderAll();
      syncChampionAdminUI();
    }, err=>{ console.warn('انقطعت المزامنة اللحظية لسجل أبطال المواسم:', err); });

    db.ref('brookie/championHonorFeatures').on('value', snap=>{
      const loaded = snap.exists() ? snap.val() : {};
      CHAMPION_FEATURE_KEYS.forEach(k=> CHAMPION_FEATURES[k] = !!loaded[k]);
      renderAll();
      syncChampionAdminUI();
    }, err=>{ console.warn('انقطعت المزامنة اللحظية لميزات تكريم البطل:', err); });

    db.ref('brookie/seasonsArchive').on('value', snap=>{
      SEASONS_ARCHIVE = snap.exists() ? (snap.val() || {}) : {};
      renderSeasonsArchive();
    }, err=>{ console.warn('انقطعت المزامنة اللحظية لأرشيف المواسم:', err); });

    _realtimeSyncStarted = true;
  }catch(e){
    // فشل تفعيل المزامنة اللحظية (مثلاً Firebase لم يُحمَّل بعد) لا يوقف التطبيق —
    // يبقى زر "تحديث" اليدوي يعمل كخط رجعة كما كان قبل هذه الميزة.
    console.warn('تعذّر تفعيل المزامنة اللحظية، زر التحديث اليدوي يبقى متاحًا:', e);
  }
}

// ════════════ عداد الزوار ════════════
async function trackVisit(){
  try{
    const db = _fbInit();
    const isUnique = !localStorage.getItem('brookie-visited');
    if(isUnique){
      localStorage.setItem('brookie-visited','1');
      await db.ref('brookie/visitors/unique').transaction(v=>(v||0)+1);
    }
    await db.ref('brookie/visitors/total').transaction(v=>(v||0)+1);
  }catch(e){}
}
async function renderVisitorCount(){
  const box = document.getElementById('visitorCountBox');
  if(!box) return;
  box.innerHTML='<div style="color:var(--muted);font-size:0.82rem;">⏳ جاري التحميل...</div>';
  try{
    const db = _fbInit();
    const snap = await db.ref('brookie/visitors').get();
    const d = snap.exists() ? snap.val() : {};
    const total  = d.total  || 0;
    const unique = d.unique || 0;
    const avg    = unique > 0 ? (total/unique).toFixed(1) : '—';
    const fmt = n => n.toLocaleString('ar-SA');
    box.innerHTML = '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:12px;">' +
      [['gold',fmt(total),'إجمالي الزيارات'],['sky',fmt(unique),'أجهزة فريدة'],['coral',avg,'متوسط زيارات/جهاز']]
      .map(([c,v,l]) => `<div style="background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:18px 22px;flex:1;min-width:110px;text-align:center;"><div style="font-size:2.2rem;font-weight:900;color:var(--${c});">${v}</div><div style="font-size:0.78rem;color:var(--muted);margin-top:4px;">${l}</div></div>`).join('') +
      '</div><div style="font-size:0.73rem;color:var(--muted);margin-bottom:10px;">⚠️ الجهاز الواحد يُحتسب مرة كزائر فريد.</div>' +
      '<button class="btn ghost" id="refreshVisitorBtn" style="font-size:0.8rem;">🔄 تحديث الأرقام</button>';
    document.getElementById('refreshVisitorBtn').onclick=renderVisitorCount;
  }catch(e){
    box.innerHTML='<div style="color:var(--coral);font-size:0.82rem;">تعذّر تحميل إحصائيات الزوار.</div>';
  }
}
