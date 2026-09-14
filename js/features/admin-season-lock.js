/* بند ب — قفل الموسم الحالي وبدء موسم جديد
   ═══════════════════════════════════════════════════════════════════════
   ميزة إدارية حسّاسة تُقفَل بـSUPER_ADMIN_CODE بنفس نمط قفل "تغيير رمز دخول
   المنظم" (admin-auth-settings.js: pinChangeUnlocked/pinChangeLock/
   pinChangeFields) — هنا seasonLockUnlocked/seasonLockLock/seasonLockFields.
   عند الضغط على الزر الرئيسي، وبعد تأكيدين صريحين متتاليين عبر customConfirm
   (نفس الدالة المستخدمة باستيراد النسخة الاحتياطية وتغيير رمز الدخول)،
   تُنفَّذ هذه الخطوات بالترتيب:
     ١) تنزيل نسخة احتياطية كاملة (DATA + PRED_DATA) بنفس تنسيق زر "تنزيل
        نسخة احتياطية" في admin-auth-settings.js حرفيًا (exportBackupBtn) —
        فقط اسم الملف هنا يتضمّن اسم الموسم وتاريخ القفل بدل التاريخ فقط.
     ٢) إضافة صف جديد لسجل أبطال المواسم (SEASON_CHAMPIONS_ARCHIVE بمسار
        Firebase "seasonChampionsArchive" — نفس مسار admin-champion-admin.js
        تمامًا) باسم الموسم/البطل/النقاط، مع اقتراح تلقائي للبطل الحالي
        (المركز الأول من computeStandings()) قابل للتعديل اليدوي قبل التأكيد
        (بنفس روح ROUND_HERO_OVERRIDE بـstandings-engine.js لحالات الاستثناء).
     ٣) تصفير DATA.rounds وكل الحقول المشتقة منها مباشرة (nextRoundAt،
        manualPriority) عبر saveData() العادية (لا تجاوز لآلية الحفظ)، وتصفير
        توقعات بطل الجولة (PRED_DATA.entries) عبر savePredictions()، وإلغاء
        بطل الموسم الحالي (currentChampionId). لا تُمس ملفات
        js/data/season-2/* إطلاقًا — تبقى سجلًا تاريخيًا دائمًا كما هي.
   بعدها يظهر قسم منفصل (غير مقفل بالكود الخاص، لأنه لا يعدّل أي بيانات حيّة —
   فقط يولّد نصوص ملفات للتنزيل) لتجهيز محتوى season-3/participants.js
   وseason-3/clubs.js وseason-3/rounds-seed.js بنفس تنسيق ملفات season-2
   حرفيًا (rounds-seed.js بقيم محايدة/فارغة — موسم جديد يبدأ من الجولة 1
   مباشرة بلا حاجة لجسر ترحيل). الخطوتان الأخيرتان
   (رفع الملفين فعليًا على GitHub، وتعديل js/data/season-config.js +
   مسارات <script> بـindex.html/league.html) تبقيان يدويتين دائمًا — لا توجد
   إمكانية كتابة ملفات من طرف هذا التطبيق (لا يوجد خادم خاص به). */

let seasonLockUnlocked = false;

// ---------- فتح القسم بالكود الخاص ----------
document.getElementById('unlockSeasonLockBtn').addEventListener('click', ()=>{
  const msg = document.getElementById('unlockSeasonLockMsg');
  const code = document.getElementById('seasonLockSuperCodeInput').value.trim();
  if(code === SUPER_ADMIN_CODE){
    seasonLockUnlocked = true;
    document.getElementById('seasonLockFields').style.display = '';
    document.getElementById('seasonLockLock').style.display = 'none';
    document.getElementById('seasonLockSuperCodeInput').value = '';
    msg.innerHTML = '';
    prefillSeasonLockChampionSuggestion();
  }else{
    msg.innerHTML = '<div class="status-msg err">كود خاص غير صحيح.</div>';
  }
});

// اقتراح تلقائي للبطل ونقاطه من الترتيب الحالي (المركز الأول فعليًا) — يبقى
// قابلاً للتعديل اليدوي الكامل قبل التأكيد (حالات استثناء يقرّرها المنظم).
function prefillSeasonLockChampionSuggestion(){
  const preview = document.getElementById('seasonLockChampPreview');
  const nameInput = document.getElementById('seasonLockChampNameInput');
  const pointsInput = document.getElementById('seasonLockChampPointsInput');
  const st = computeStandings();
  if(!st.length){
    if(preview) preview.textContent = 'لا يوجد ترتيب محسوب بعد — عبّي اسم البطل ونقاطه يدويًا.';
    return;
  }
  const top = st[0];
  if(preview) preview.textContent = `🥇 المقترح تلقائيًا من الترتيب الحالي: ${top.name} — ${top.total} نقطة (عدّله يدويًا لو مختلف).`;
  if(nameInput && !nameInput.value) nameInput.value = top.name;
  if(pointsInput && !pointsInput.value) pointsInput.value = top.total;
}

// ---------- الزر الرئيسي: تنفيذ التسلسل الكامل ----------
document.getElementById('startSeasonLockBtn').addEventListener('click', async ()=>{
  const msg = document.getElementById('seasonLockMsg');
  if(!seasonLockUnlocked){
    msg.innerHTML = '<div class="status-msg err">لازم تدخل الكود الخاص أولاً.</div>';
    return;
  }
  const seasonName = document.getElementById('seasonLockSeasonNameInput').value.trim();
  const champName = document.getElementById('seasonLockChampNameInput').value.trim();
  const champPoints = Number(document.getElementById('seasonLockChampPointsInput').value);
  if(!seasonName){
    msg.innerHTML = '<div class="status-msg err">عبّي اسم الموسم المنتهي أولاً (مثال: الموسم الثاني).</div>';
    return;
  }
  if(!champName || !Number.isFinite(champPoints)){
    msg.innerHTML = '<div class="status-msg err">عبّي اسم البطل ونقاطه أولاً.</div>';
    return;
  }

  // تأكيد أول: شرح عام للتسلسل قبل البدء
  const sure1 = await customConfirm(
    `سيتم الآن:\n` +
    `١) تنزيل نسخة احتياطية كاملة من بيانات "${seasonName}" تلقائيًا.\n` +
    `٢) إضافة "${champName} — ${champPoints} نقطة" لسجل أبطال المواسم باسم "${seasonName}".\n\n` +
    `هل تبي تكمل؟`,
    {confirmText: 'متابعة'}
  );
  if(!sure1) return;

  // ---------- الخطوة ١: نسخة احتياطية (نفس تنسيق exportBackupBtn حرفيًا) ----------
  const stamp = new Date().toISOString().slice(0,10);
  const safeSeasonName = seasonName.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g,'') || 'season';
  const backupFilename = `brookie-backup-${safeSeasonName}-lock-${stamp}.json`;
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
  a.href = url;
  a.download = backupFilename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 2000);
  try{ localStorage.setItem('brookie_last_backup_at', String(Date.now())); }catch(e){}
  updateLastBackupLabel();

  // ---------- الخطوة ٢: إضافة صف لسجل أبطال المواسم (نفس مسار addArchiveRowBtn) ----------
  SEASON_CHAMPIONS_ARCHIVE.push({season: seasonName, name: champName, points: champPoints});
  await window.storage.set('seasonChampionsArchive', SEASON_CHAMPIONS_ARCHIVE, true);
  logAdminActivity(`🏆 إضافة ${champName} لسجل أبطال المواسم (${seasonName}) — ضمن قفل الموسم`);
  renderChampionArchiveAdmin();
  renderHallOfFame();

  // ---------- تأكيد ثانٍ: تحذير لا رجعة عنه إلا بالنسخة المُنزَّلة ----------
  const sure2 = await customConfirm(
    `تحذير أخير: الخطوة القادمة ستمسح كل جولات "${seasonName}" الحالية (DATA.rounds) وكل ما ` +
    `يُشتَق منها (الأوسمة، الأرقام القياسية، بطل الموسم الحالي، توقعات بطل الجولة) على الموقع ` +
    `الحي لكل الزوار — فورًا وبلا رجعة، إلا باستيراد النسخة الاحتياطية "${backupFilename}" التي ` +
    `تم تنزيلها للتو من قسم "نسخة احتياطية" بإعدادات متقدمة.\n\n` +
    `تأكّد إنك حفظت هذا الملف بمكان آمن قبل المتابعة.\n\n` +
    `هل أنت متأكد إنك تبي تصفّر جولات الموسم الآن؟`,
    {confirmText: 'تصفير الموسم الآن'}
  );
  if(!sure2){
    msg.innerHTML = '<div class="status-msg ok">تم تنزيل النسخة الاحتياطية وإضافة البطل للسجل، لكن لم يُصفَّر شيء بعد — ألغيت الخطوة الأخيرة.</div>';
    return;
  }

  // ---------- الخطوة ٣: تصفير بيانات الموسم الحي (عبر saveData/savePredictions العاديتين) ----------
  DATA.rounds = [];
  DATA.manualPriority = {};
  DATA.nextRoundAt = null;
  const okData = await saveData();

  PRED_DATA.entries = {};
  const okPred = await savePredictions();

  CHAMPION_ID = null;
  await window.storage.set('currentChampionId', null, true);

  logAdminActivity(`🔒 قفل موسم "${seasonName}" وتصفير الجولات لبدء موسم جديد`);

  renderAll();
  renderPredictions();
  renderMyDashboard();
  updateRoundSettingsStatus();
  renderPastRoundsChips();
  syncChampionAdminUI();
  const roundNumEl = document.getElementById('roundNumber');
  if(roundNumEl) roundNumEl.value = getCurrentRoundNumber() + 1;

  // إعادة قفل هذا القسم (نفس سلوك تغيير رمز الدخول بعد نجاح العملية)
  seasonLockUnlocked = false;
  document.getElementById('seasonLockFields').style.display = 'none';
  document.getElementById('seasonLockLock').style.display = '';
  document.getElementById('seasonLockSeasonNameInput').value = '';
  document.getElementById('seasonLockChampNameInput').value = '';
  document.getElementById('seasonLockChampPointsInput').value = '';

  msg.innerHTML = (okData && okPred)
    ? '<div class="status-msg ok">تم قفل الموسم وتصفير الجولات بنجاح ✅ جهّز الآن مشاركي وأندية الموسم الجديد بالقسم أدناه.</div>'
    : '<div class="status-msg err">تم التصفير محليًا لكن تعذّر الحفظ الكامل على الخادم — تحقّق من الاتصال، وإلا استعد من النسخة الاحتياطية.</div>';

  // كشف قسم تجهيز ملفات الموسم الجديد — لا يحتاج الكود الخاص (لا يعدّل أي
  // بيانات حيّة، فقط يولّد نصوص ملفات جاهزة للتنزيل والرفع اليدوي).
  const rosterSection = document.getElementById('newSeasonRosterSection');
  if(rosterSection){
    rosterSection.style.display = '';
    if(!newSeasonRows.length) addNewSeasonParticipantRow();
    // اقتراح اسم مجلد الموسم الجديد تلقائيًا من ACTIVE_SEASON الحالي
    // (season-2 → season-3) — يبقى قابلاً للتعديل اليدوي.
    const idInput = document.getElementById('newSeasonIdInput');
    if(idInput && typeof ACTIVE_SEASON === 'string'){
      const m = ACTIVE_SEASON.match(/^season-(\d+)$/);
      if(m) idInput.value = `season-${Number(m[1])+1}`;
    }
    rosterSection.scrollIntoView({behavior:'smooth', block:'start'});
  }
});

// ═══════════════════════════════════════════════════════════════════════
// قسم تجهيز ملفات الموسم الجديد: نموذج مشاركين ديناميكي → يولّد نصوص ملفات
// participants.js وclubs.js وrounds-seed.js بنفس تنسيق ملفات season-2
// حرفيًا (البنية، أسماء المتغيرات، شكل التعليق العلوي) — جاهزة للتنزيل والرفع
// اليدوي على GitHub. لا علاقة له بـFirebase إطلاقًا؛ كل شيء هنا محلي بمتصفح
// المنظم فقط حتى لحظة التنزيل.
// ═══════════════════════════════════════════════════════════════════════
let newSeasonRows = []; // [{id, name, carry, team1, team2, team3}]
let _newSeasonNextRowId = 1;

function addNewSeasonParticipantRow(){
  const rowId = _newSeasonNextRowId++;
  newSeasonRows.push({id: rowId, name:'', carry:'0', team1:'', team2:'', team3:''});
  renderNewSeasonRows();
}

function renderNewSeasonRows(){
  const box = document.getElementById('newSeasonParticipantsRows');
  if(!box) return;
  box.innerHTML = newSeasonRows.map(r=>`
    <div class="new-season-participant-row" data-row-id="${r.id}">
      <input type="text" class="ns-name" placeholder="اسم المشارك" value="${r.name.replace(/"/g,'&quot;')}">
      <input type="number" class="ns-carry" placeholder="رصيد افتتاحي" value="${r.carry}">
      <input type="text" class="ns-team1" placeholder="النادي الأول" value="${r.team1.replace(/"/g,'&quot;')}">
      <input type="text" class="ns-team2" placeholder="النادي الثاني" value="${r.team2.replace(/"/g,'&quot;')}">
      <input type="text" class="ns-team3" placeholder="النادي الثالث" value="${r.team3.replace(/"/g,'&quot;')}">
      <button type="button" class="remove-participant-btn" data-idx="${r.id}">🗑️ حذف</button>
    </div>`).join('');
}

const newSeasonParticipantsRowsEl = document.getElementById('newSeasonParticipantsRows');
if(newSeasonParticipantsRowsEl){
  // نقرأ القيم من الحقول مباشرة عند أي تغيير بدل ربط كل حقل بمستمع منفصل —
  // أبسط ويكفي تمامًا لحجم هذا النموذج الصغير (استخدام تفويض الأحداث event
  // delegation، نفس أسلوب communityMatchesBox وchampionArchiveRowsEl).
  newSeasonParticipantsRowsEl.addEventListener('input', (e)=>{
    const rowEl = e.target.closest('.new-season-participant-row');
    if(!rowEl) return;
    const rowId = Number(rowEl.dataset.rowId);
    const row = newSeasonRows.find(r=>r.id===rowId);
    if(!row) return;
    if(e.target.classList.contains('ns-name')) row.name = e.target.value;
    else if(e.target.classList.contains('ns-carry')) row.carry = e.target.value;
    else if(e.target.classList.contains('ns-team1')) row.team1 = e.target.value;
    else if(e.target.classList.contains('ns-team2')) row.team2 = e.target.value;
    else if(e.target.classList.contains('ns-team3')) row.team3 = e.target.value;
  });
  newSeasonParticipantsRowsEl.addEventListener('click', (e)=>{
    const btn = e.target.closest('.remove-participant-btn');
    if(!btn) return;
    const rowId = Number(btn.dataset.idx);
    newSeasonRows = newSeasonRows.filter(r=>r.id!==rowId);
    renderNewSeasonRows();
  });
}

const addNewSeasonParticipantBtnEl = document.getElementById('addNewSeasonParticipantBtn');
if(addNewSeasonParticipantBtnEl){
  addNewSeasonParticipantBtnEl.addEventListener('click', addNewSeasonParticipantRow);
}

// ألوان مشاركين موزّعة تلقائيًا على دائرة hue كاملة (نفس فكرة PARTICIPANT_COLORS
// بseason-2 لكن بتوليد آلي بدل اختيار يدوي — كافٍ لموسم جديد لسه ما بدأ)
function generateParticipantColor(idx, total){
  const hue = Math.round((360/Math.max(total,1)) * idx);
  return hslToHex(hue, 65, 55);
}
function hslToHex(h,s,l){
  s/=100; l/=100;
  const k = n => (n + h/30) % 12;
  const a = s * Math.min(l, 1-l);
  const f = n => l - a*Math.max(-1, Math.min(k(n)-3, Math.min(9-k(n), 1)));
  const toHex = x => Math.round(255*x).toString(16).padStart(2,'0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}
// كود دخول عشوائي من 4 أرقام لكل مشارك جديد — فريد ضمن الموسم الجديد فقط
function generateParticipantCode(usedCodes){
  let code;
  do{ code = String(Math.floor(1000 + Math.random()*9000)); }while(usedCodes.has(code));
  usedCodes.add(code);
  return code;
}

function buildSeasonParticipantsJs(seasonLabel, participants){
  const idsLine = participants.map((p,i)=>{
    const teams = [p.team1,p.team2,p.team3].filter(Boolean).map(t=>`'${t.replace(/'/g,"\\'")}'`).join(',');
    return `  {id:${i+1}, name:'${p.name.replace(/'/g,"\\'")}', carry:${Number(p.carry)||0}, teams:[${teams}]},`;
  }).join('\n');

  const usedCodes = new Set();
  const colorsLines = participants.map((p,i)=>`  ${i+1}:'${generateParticipantColor(i, participants.length)}'`).join(',\n');
  const codesLines = participants.map((p,i)=>`  ${i+1}:'${generateParticipantCode(usedCodes)}'`).join(',\n');

  return `/* المشاركون في ${seasonLabel}: القائمة + أكواد الدخول + ألوان الهوية */

// وُلِّد تلقائيًا عبر أداة "قفل الموسم وبدء موسم جديد" بلوحة المنظم —
// رصيد كل مشارك (carry) يبدأ من الرقم المُدخَل هنا (عادة صفر لموسم جديد
// تمامًا)؛ الجولات القادمة (تبدأ من الجولة 1) تُدخل من تبويب المنظم فوق هذا
// الرصيد بالضبط بنفس آلية الموسم السابق.
const PARTICIPANTS = [
${idsLine}
];

// ---------- ألوان المشاركين ----------
// وُلِّدت تلقائيًا (توزيع متساوٍ على دائرة الألوان) — عدّلها يدويًا بالملف
// بعد الرفع لو حبيت ألوانًا مخصّصة لكل مشارك.
const PARTICIPANT_COLORS = {
${colorsLines}
};

// ---------- رموز المشاركين ----------
// وُلِّدت عشوائيًا وفريدة ضمن هذا الملف فقط — أرسل لكل مشارك رمزه الخاص
// عبر واتساب (لا تنشرها بالجروب العام). نفس آلية التحقق بـ"مين أنت؟"
// المستخدمة بالموسم السابق دون أي تعديل كود.
const PARTICIPANT_CODES = {
${codesLines}
};
`;
}

function buildSeasonClubsJs(seasonLabel, participants){
  const clubNames = Array.from(new Set(participants.flatMap(p=>[p.team1,p.team2,p.team3]).filter(Boolean)))
    .sort((a,b)=>a.localeCompare(b,'ar'));
  const stylePalette = ['#1C39BB','#A50044','#034694','#FFC700','#DC052D','#00693E','#8E1F2F','#00285E'];
  const styleLines = clubNames.map((name,i)=>{
    const bg = stylePalette[i % stylePalette.length];
    return `  '${name.replace(/'/g,"\\'")}': {bg:'${bg}', fg:'#fff', pattern:'solid', short:'${name.replace(/'/g,"\\'")}', accent:'#fff'},`;
  }).join('\n');
  const statsLines = clubNames.map(name=>`  '${name.replace(/'/g,"\\'")}': {played:0, w:0, d:0, l:0, pts:0},`).join('\n');

  return `/* الأندية في ${seasonLabel}: القائمة + الأنماط + إحصاءات الموسم + خريطة الدوريات */

// قائمة الأندية — مُشتقّة تلقائيًا من قائمة أندية المشاركين (PARTICIPANTS)
// بنفس أسلوب الموسم السابق حرفيًا.
const CLUBS = Array.from(new Set(PARTICIPANTS.flatMap(p=>p.teams))).sort((a,b)=>a.localeCompare(b,'ar'));

// ألوان تقريبية للأندية — قيم افتراضية مولَّدة تلقائيًا (لون واحد موحّد لكل
// ناد كبداية)، عدّلها يدويًا بالملف بعد الرفع بألوان الأندية الحقيقية إن رغبت
// (pattern: stripes | halves | sash | solid | hoops | cross | diag).
const CLUB_STYLE = {
${styleLines}
};

// بيانات موسم كل نادٍ الحقيقية — تبدأ من صفر لموسم جديد تمامًا (لا يوجد
// أساس سابق قبل الجولة الأولى بخلاف "جسر" الموسم الماضي). عدّلها يدويًا لو
// رغبت بإضافة رصيد افتتاحي حقيقي من الدوريات المحلية، بنفس منطق الموسم
// السابق تمامًا.
const CLUB_SEASON_STATS = {
${statsLines}
};

// ---------- خريطة الأندية بالدوريات ----------
// فارغة افتراضيًا — عبّها يدويًا بالملف بعد الرفع (اسم_النادي: 'اسم الدوري')
// لو رغبت باستخدام ميزة "خريطة الأندية" بتبويب الإحصائيات لهذا الموسم.
const CLUB_LEAGUE_MAP = {};
`;
}

// بيانات الجولات الافتتاحية لموسم جديد لم تُلعب فيه أي جولة بعد — بنفس تنسيق
// season-2/rounds-seed.js حرفيًا (نفس أسماء الثوابت التي يعتمد عليها
// standings-engine.js كمتغيرات عامة)، لكن بقيم محايدة/فارغة تمامًا: لا يوجد
// "جسر" ترحيل بين جولتين افتتاحيتين كما في الموسم الثاني (ذاك كان استثناءً
// لأن الموسم الثاني بدأ من رصيد متراكم فعلي قبل أن يُبنى نظام الجولات).
// موسم جديد تمامًا يبدأ جولاته من الجولة 1 مباشرة عبر نموذج إدخال الجولة
// العادي بتبويب المنظم (admin-round-form.js)، فلا حاجة لأي قيمة هنا إطلاقًا.
function buildSeasonRoundsSeedJs(seasonLabel){
  return `/* بيانات الجولات المصدرية لـ${seasonLabel} */

// وُلِّد تلقائيًا عبر أداة "قفل الموسم وبدء موسم جديد" بلوحة المنظم.
// هذه قيم بداية/محايدة لموسم لم تُلعب فيه أي جولة بعد — لا يوجد "جسر" ترحيل
// من رصيد متراكم سابق كما في الموسم الثاني (ذاك كان استثناءً خاصًا بتاريخ
// نشأة الموسم الثاني قبل بناء نظام الجولات، وموثّق بالكامل بملف تسليمه).
// موسم جديد تمامًا يبدأ جولاته من الجولة 1 مباشرة عبر نموذج إدخال الجولة
// العادي بتبويب المنظم (admin-round-form.js)، فلا حاجة لتعبئة أي من الثوابت
// أدناه بقيم حقيقية إلا لو احتجت لاحقًا نفس أسلوب "جسر" الموسم الثاني (رصيد
// افتتاحي حقيقي قبل أول جولة رسمية) — عندها عدّلها يدويًا بنفس منطق ملف
// season-2/rounds-seed.js تمامًا.
const CURRENT_BASE_ROUND = 0;

// نقاط "الجولة 1" لكل متسابق (تُستخدم فقط لو وُجد جسر ترحيل قبل الجولة
// الأولى الحقيقية) — فارغة لأن هذا الموسم يبدأ من الجولة 1 مباشرة.
const ROUND1_POINTS = {};
const JOINED_AFTER_ROUND1 = {};
const JOINED_AFTER_ROUND2 = {};

// أهداف/مباريات "جسر" الجولة 2 (لو وُجد) — فارغة لنفس السبب أعلاه.
const ROUND2_GOALS = {};
const ROUND2_MATCHES = {};

// كسر تعادل "بطل الجولة" اليدوي لحالات استثنائية فقط — فارغ افتراضيًا.
const ROUND_HERO_OVERRIDE = {};

// ---------- شريط تقدم الموسم ----------
const SEASON_TOTAL_ROUNDS = 30; // عدد الجولات الإجمالي المتوقع للموسم — عدّله يدويًا لو يختلف عدد جولات هذا الموسم عن الافتراضي
`;
}

function downloadTextFile(filename, content){
  const blob = new Blob([content], {type:'text/javascript;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 2000);
}

const generateSeasonFilesBtnEl = document.getElementById('generateSeasonFilesBtn');
if(generateSeasonFilesBtnEl){
  generateSeasonFilesBtnEl.addEventListener('click', ()=>{
    const msg = document.getElementById('newSeasonMsg');
    const seasonId = (document.getElementById('newSeasonIdInput').value.trim() || 'season-3').replace(/[^a-z0-9-]/gi,'');
    const seasonLabel = document.getElementById('newSeasonLabelInput').value.trim() || seasonId;
    const cleanRows = newSeasonRows
      .map(r=>({name:r.name.trim(), carry:r.carry, team1:r.team1.trim(), team2:r.team2.trim(), team3:r.team3.trim()}))
      .filter(r=>r.name);
    if(!cleanRows.length){
      msg.innerHTML = '<div class="status-msg err">أضف مشاركًا واحدًا على الأقل باسم صحيح قبل التوليد.</div>';
      return;
    }
    const incomplete = cleanRows.some(r=>!r.team1 || !r.team2 || !r.team3);
    if(incomplete){
      msg.innerHTML = '<div class="status-msg err">كل مشارك لازم يملك أنديته الثلاثة كاملة قبل التوليد.</div>';
      return;
    }
    const participantsJs = buildSeasonParticipantsJs(seasonLabel, cleanRows);
    const clubsJs = buildSeasonClubsJs(seasonLabel, cleanRows);
    const roundsSeedJs = buildSeasonRoundsSeedJs(seasonLabel);
    downloadTextFile('participants.js', participantsJs);
    downloadTextFile('clubs.js', clubsJs);
    downloadTextFile('rounds-seed.js', roundsSeedJs);
    document.getElementById('newSeasonParticipantsPath').textContent = `js/data/${seasonId}/participants.js`;
    document.getElementById('newSeasonClubsPath').textContent = `js/data/${seasonId}/clubs.js`;
    const roundsSeedPathEl = document.getElementById('newSeasonRoundsSeedPath');
    if(roundsSeedPathEl) roundsSeedPathEl.textContent = `js/data/${seasonId}/rounds-seed.js`;
    msg.innerHTML = `<div class="status-msg ok">تم تنزيل ثلاثة ملفات ✅ ارفعها يدويًا لمجلد <b>js/data/${seasonId}/</b> على GitHub (participants.js، clubs.js، rounds-seed.js)، ثم عدّل ACTIVE_SEASON ومسارات &lt;script&gt; كما هو موضّح أعلاه.</div>`;
  });
}
