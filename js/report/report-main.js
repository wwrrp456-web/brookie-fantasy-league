/* منطق صفحة تقارير المجتمع — يعتمد على FIREBASE_CONFIG (من core/config.js)
   و PARTICIPANTS/CLUBS/PARTICIPANT_CODES (من data/season-2/*) بدل نسخ محلية،
   حتى يبقى مصدر واحد للحقيقة مع الصفحة الرئيسية index.html/league.html. */
// نفس مشروع Firebase المستخدم في الموقع الرئيسي (proki-fantasy) — هذه الصفحة
// تكتب في مسار منفصل تمامًا (brookie/community-reports) ولا تلمس بيانات
// الموسم الرسمية (brookie/brookie-fantasy-s2-data) بأي شكل. الهدف منها فقط
// جمع مساهمات الأعضاء ليراجعها المنظم يدويًا قبل الإدخال الرسمي.
firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.database();

let targetRound = null;

// ---------- تبويبات ----------
document.querySelectorAll('.tabs button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-'+btn.dataset.panel).classList.add('active');
  });
});

// ---------- تحديد رقم الجولة المستهدفة (نفس منطق getCurrentRoundNumber+1 في الموقع الرئيسي) ----------
async function loadTargetRound(){
  try{
    const snap = await db.ref('brookie/brookie-fantasy-s2-data').get();
    const data = snap.exists() ? snap.val() : null;
    const rounds = (data && Array.isArray(data.rounds)) ? data.rounds : [];
    const last = rounds.length ? Math.max(...rounds.map(r=>r.number)) : CURRENT_BASE_ROUND;
    targetRound = last + 1;
  }catch(e){
    targetRound = CURRENT_BASE_ROUND + 1; // تقدير احتياطي لو تعذّرت القراءة
  }
  const label = `الجولة ${targetRound}`;
  document.getElementById('targetRoundChip').textContent = label;
  document.getElementById('targetRoundChipPoints').textContent = label;
  startLiveListeners();
}

// ---------- تعبئة القوائم ----------
const clubSelect = document.getElementById('clubSelect');
CLUBS.forEach(c=>{
  const opt = document.createElement('option');
  opt.value = c; opt.textContent = c;
  clubSelect.appendChild(opt);
});

// قائمة الخصم — قائمة أندية المشاركين الـ27 (باستثناء النادي المختار حاليًا،
// نادٍ ما يلعب ضد نفسه) بالإضافة لبند أخير "فريق آخر" يظهر عند اختياره حقل
// نص حر — عشان الخصم الفعلي قد لا يكون من ضمن الأندية الـ27 (خصم خارجي). هذا
// تصميم هجين بطلب المستخدم (5 سبتمبر 2026): سرعة الاختيار من قائمة جاهزة
// للحالة الشائعة، مع إبقاء المرونة للحالة النادرة (خصم خارجي) بلا إجبار كل
// إدخال أن يكون نصًا حرًا بالكامل (كما كان بالتعديل السابق).
const OTHER_OPPONENT_VALUE = '__other__';
const opponentSelect = document.getElementById('opponentSelect');
const opponentOtherInput = document.getElementById('opponentOtherInput');
function refreshOpponentOptions(){
  const selectedClub = clubSelect.value;
  const prevOpponent = opponentSelect.value;
  opponentSelect.innerHTML = '<option value="" disabled selected>اختر الخصم</option>';
  CLUBS.filter(c=>c!==selectedClub).forEach(c=>{
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    opponentSelect.appendChild(opt);
  });
  const otherOpt = document.createElement('option');
  otherOpt.value = OTHER_OPPONENT_VALUE;
  otherOpt.textContent = '✍️ فريق آخر (اكتب الاسم)';
  opponentSelect.appendChild(otherOpt);
  if(prevOpponent && prevOpponent!==selectedClub){
    opponentSelect.value = prevOpponent;
  }
}
clubSelect.addEventListener('change', refreshOpponentOptions);
refreshOpponentOptions();

// إظهار/إخفاء حقل النص الحر حسب اختيار "فريق آخر" من القائمة.
opponentSelect.addEventListener('change', ()=>{
  const isOther = opponentSelect.value === OTHER_OPPONENT_VALUE;
  opponentOtherInput.style.display = isOther ? '' : 'none';
  if(isOther) opponentOtherInput.focus();
  else opponentOtherInput.value = '';
});

// القيمة الفعلية للخصم بغض النظر عن مصدرها (من القائمة أو نص حر).
function getSelectedOpponent(){
  if(opponentSelect.value === OTHER_OPPONENT_VALUE){
    return opponentOtherInput.value.trim();
  }
  return opponentSelect.value || '';
}

const participantSelect = document.getElementById('participantSelect');
const emptyOpt = document.createElement('option');
emptyOpt.value = ''; emptyOpt.textContent = '— اختر اسمك —'; emptyOpt.disabled = true; emptyOpt.selected = true;
participantSelect.appendChild(emptyOpt);
PARTICIPANTS.forEach(p=>{
  const opt = document.createElement('option');
  opt.value = p.id; opt.textContent = p.name;
  participantSelect.appendChild(opt);
});

// ---------- تذكّر الرمز الخاص لكل مشارك على هذا الجهاز ----------
// بطلب المستخدم: أول ما يتحقق رمز المشارك بنجاح (عند أول إرسال)، يُحفظ محليًا
// (localStorage) بهذا الجهاز/المتصفح تحديدًا، فما يُطلب منه يكتبه ثانية أي جولة
// قادمة طالما مختار نفس اسمه. نخزن قاموس {pid: code} بدل قيمة وحيدة عشان لو
// أكثر من مشارك يستخدمون نفس الجهاز، كل واحد له رمزه المحفوظ تحت اسمه هو بس.
const CODE_STORE_KEY = 'brookie-report-codes';
function loadSavedCodes(){
  try{ return JSON.parse(localStorage.getItem(CODE_STORE_KEY)) || {}; }
  catch(e){ return {}; }
}
function saveCodeForParticipant(pid, code){
  try{
    const all = loadSavedCodes();
    all[pid] = code;
    localStorage.setItem(CODE_STORE_KEY, JSON.stringify(all));
  }catch(e){ /* localStorage غير متاح (وضع خاص مثلاً) — نتجاهل بهدوء، الإرسال نفسه ما يتأثر */ }
}
function forgetCodeForParticipant(pid){
  try{
    const all = loadSavedCodes();
    delete all[pid];
    localStorage.setItem(CODE_STORE_KEY, JSON.stringify(all));
  }catch(e){}
}

const codeFieldBox = document.getElementById('codeFieldBox');
const codeSavedBox = document.getElementById('codeSavedBox');
const codeInput = document.getElementById('codeInput');

// يحدّث شكل الحقل حسب وجود رمز محفوظ لصاحب الاسم المختار حاليًا — يُستدعى عند
// تغيير الاسم، وأيضًا بعد أي حفظ/مسح للرمز حتى تنعكس الحالة فورًا بلا تحديث صفحة.
function refreshCodeFieldState(){
  const pid = participantSelect.value;
  if(!pid){
    codeFieldBox.style.display = '';
    codeSavedBox.style.display = 'none';
    codeInput.value = '';
    return;
  }
  const saved = loadSavedCodes()[pid];
  if(saved){
    codeInput.value = saved;
    codeFieldBox.style.display = 'none';
    codeSavedBox.style.display = '';
  }else{
    codeInput.value = '';
    codeFieldBox.style.display = '';
    codeSavedBox.style.display = 'none';
  }
}
participantSelect.addEventListener('change', refreshCodeFieldState);
document.getElementById('forgetCodeLink').addEventListener('click', (e)=>{
  e.preventDefault();
  const pid = participantSelect.value;
  if(pid){ forgetCodeForParticipant(pid); refreshCodeFieldState(); }
});

// ---------- إرسال نتيجة مباراة ----------
document.getElementById('submitMatchBtn').addEventListener('click', async ()=>{
  const msg = document.getElementById('matchMsg');
  const club = clubSelect.value;
  const opponent = getSelectedOpponent();
  const result = document.getElementById('resultSelect').value;
  const gf = document.getElementById('gfInput').value;
  const ga = document.getElementById('gaInput').value;
  const reporter = document.getElementById('reporterNameMatch').value.trim();

  if(!club || !opponent || !result || gf==='' || ga===''){
    msg.innerHTML = '<div class="status-msg err">أكمل كل الحقول (النادي، الخصم، النتيجة، الأهداف) قبل الإرسال.</div>';
    return;
  }
  if(opponent === club){
    msg.innerHTML = '<div class="status-msg err">الخصم لازم يختلف عن النادي.</div>';
    return;
  }
  if(targetRound===null){
    msg.innerHTML = '<div class="status-msg err">لسه جارٍ تحديد رقم الجولة، حاول بعد ثانية.</div>';
    return;
  }

  const btn = document.getElementById('submitMatchBtn');
  btn.disabled = true; btn.textContent = 'جارٍ الإرسال...';
  try{
    await db.ref(`brookie/community-reports/matches/${targetRound}`).push({
      club, opponent, result,
      gf: Math.max(0, parseInt(gf)||0),
      ga: Math.max(0, parseInt(ga)||0),
      reporter: reporter || null,
      submittedAt: Date.now()
    });
    msg.innerHTML = '<div class="status-msg ok">تم إرسال النتيجة، شكرًا لمساهمتك ✅</div>';
    document.getElementById('resultSelect').value = '';
    document.getElementById('gfInput').value = '';
    document.getElementById('gaInput').value = '';
    opponentOtherInput.value = '';
    opponentOtherInput.style.display = 'none';
    refreshOpponentOptions();
  }catch(e){
    msg.innerHTML = '<div class="status-msg err">تعذّر الإرسال، تحقق من الاتصال وحاول ثانية.</div>';
  }
  btn.disabled = false; btn.textContent = 'إرسال النتيجة';
});

// ---------- إرسال نقاط شخصية ----------
document.getElementById('submitPointsBtn').addEventListener('click', async ()=>{
  const msg = document.getElementById('pointsMsg');
  const pid = participantSelect.value;
  const points = document.getElementById('pointsInput').value;
  const code = document.getElementById('codeInput').value.trim();

  if(!pid){
    msg.innerHTML = '<div class="status-msg err">اختر اسمك أولاً.</div>';
    return;
  }
  if(!code){
    msg.innerHTML = '<div class="status-msg err">أدخل رمزك الخاص (4 أرقام) اللي أرسله لك المنظم.</div>';
    return;
  }
  if(String(PARTICIPANT_CODES[pid]) !== code){
    msg.innerHTML = '<div class="status-msg err">الرمز غير مطابق للاسم المختار. تأكد من الرقم اللي أرسلناه لك، أو تواصل مع المنظم.</div>';
    // لو كان في رمز محفوظ سابقًا لنفس الاسم وصار غير مطابق (مثلاً المنظم غيّره)،
    // نمسحه ونعيد إظهار حقل الرمز عشان يقدر يكتب الرمز الصحيح الجديد.
    forgetCodeForParticipant(pid);
    refreshCodeFieldState();
    return;
  }
  // الرمز مطابق — يُحفظ على هذا الجهاز فورًا (حتى لو فشل الإرسال بعدين لسبب شبكة)
  // عشان ما يُطلب من المشارك يكتبه ثانية طالما مختار نفس اسمه لاحقًا.
  saveCodeForParticipant(pid, code);
  refreshCodeFieldState();
  if(points===''){
    msg.innerHTML = '<div class="status-msg err">أدخل عدد نقاطك.</div>';
    return;
  }
  if(targetRound===null){
    msg.innerHTML = '<div class="status-msg err">لسه جارٍ تحديد رقم الجولة، حاول بعد ثانية.</div>';
    return;
  }

  const p = PARTICIPANTS.find(x=>String(x.id)===String(pid));
  const btn = document.getElementById('submitPointsBtn');
  btn.disabled = true; btn.textContent = 'جارٍ الإرسال...';
  try{
    await db.ref(`brookie/community-reports/points/${targetRound}/${pid}`).set({
      name: p.name,
      points: Math.max(0, parseInt(points)||0),
      submittedAt: Date.now()
    });
    msg.innerHTML = '<div class="status-msg ok">تم إرسال نقاطك، تقدر تعدّلها وترسلها ثانية أي وقت ✅</div>';
  }catch(e){
    msg.innerHTML = '<div class="status-msg err">تعذّر الإرسال، تحقق من الاتصال وحاول ثانية.</div>';
  }
  btn.disabled = false; btn.textContent = 'إرسال نقاطي';
});

// ---------- عرض حي لما وصل حتى الآن (يشجّع المشاركة ويمنع التكرار) ----------
const RESULT_LABEL = {win:'فوز', draw:'تعادل', loss:'خسارة'};
const RESULT_CLASS = {win:'res-win', draw:'res-draw', loss:'res-loss'};

function startLiveListeners(){
  db.ref(`brookie/community-reports/matches/${targetRound}`).on('value', snap=>{
    const box = document.getElementById('matchesLiveList');
    if(!snap.exists()){ box.innerHTML = '<div class="empty-hint">لا توجد نتائج مسجّلة بعد</div>'; return; }
    const rows = Object.values(snap.val()).sort((a,b)=>(b.submittedAt||0)-(a.submittedAt||0));
    box.innerHTML = rows.map(r=>{
      // شارة "داخلية" لو الخصم نفسه نادٍ من ضمن أندية المشاركين الـ27 —
      // مباراة كهذي (مثل الاتحاد ضد النصر) نتيجتها تلقائيًا مرآة لتسجيل
      // الطرف الآخر، تُفحص مقابل بعضها بلوحة المنظم.
      const isInternal = r.opponent && CLUBS.includes(r.opponent);
      return `
      <div class="live-row">
        <span>${r.club}${r.opponent?` ضد ${r.opponent}`:''}${isInternal?' <span class="match-tag">⚔️ داخلية</span>':''}</span>
        <span class="${RESULT_CLASS[r.result]||''}">${RESULT_LABEL[r.result]||r.result} (${r.gf}-${r.ga})</span>
      </div>`;
    }).join('');
  });

  db.ref(`brookie/community-reports/points/${targetRound}`).on('value', snap=>{
    const box = document.getElementById('pointsLiveList');
    if(!snap.exists()){ box.innerHTML = '<div class="empty-hint">ما أحد سجّل نقاطه بعد</div>'; return; }
    const rows = Object.values(snap.val()).sort((a,b)=>(b.submittedAt||0)-(a.submittedAt||0));
    box.innerHTML = rows.map(r=>`
      <div class="live-row"><span>${r.name}</span><span style="font-weight:800;">${r.points} نقطة</span></div>`).join('');
  });
}

loadTargetRound();
