/* منطق نموذج إدخال الجولة (أكبر قسم في لوحة المنظم) */

function renderPastRoundsChips(){
  const box = document.getElementById('pastRoundsChips');
  if(!box) return;
  if(!DATA.rounds || !DATA.rounds.length){
    box.innerHTML = '<div style="font-size:0.78rem;color:var(--muted);">لا توجد جولات محفوظة بعد.</div>';
    return;
  }
  // تاريخ آخر تعديل لكل جولة محفوظة بجانب رقاقتها — يساعد المنظم يميّز الجولات
  // اللي عُدِّلت مؤخرًا (طلب المستخدم 7 سبتمبر 2026). r.lastModified غير متوفر
  // للجولات المحفوظة قبل هذا التحديث، فتظهر بدون تاريخ.
  box.innerHTML = DATA.rounds.slice().sort((a,b)=>b.number-a.number).map(r=>{
    const modLabel = r.lastModified
      ? `<span style="font-size:0.68rem;opacity:0.75;">— آخر تعديل ${timeAgoLabel(r.lastModified)}</span>`
      : '';
    return `<button type="button" class="btn ghost past-round-chip" data-round="${r.number}">✏️ الجولة ${r.number} ${modLabel}</button>`;
  }).join('');
}
document.getElementById('pastRoundsChips').addEventListener('click', (e)=>{
  const chip = e.target.closest('.past-round-chip');
  if(!chip) return;
  const num = Number(chip.dataset.round);
  document.getElementById('roundNumber').value = num;
  prepareRoundForm(num);
});

// ---------- Round form ----------
// يرجع كل مباريات نادٍ معيّن (بموضعه ti ضمن أندية المشارك) خلال جولة، بدعم
// أكثر من مباراة لنفس النادي بنفس الجولة (منذ 5 سبتمبر 2026). العناصر الجديدة
// تُحفظ بخاصية .ti صريحة؛ الجولات القديمة المحفوظة قبل هذا التحديث لا تحمل
// هذه الخاصية، فنرجع لموضعها المباشر entries[ti] كما كان الحال دائمًا (مباراة
// واحدة بالضبط لكل نادٍ) — توافق كامل مع كل الجولات المحفوظة سابقًا.
function getTeamRoundEntries(entries, ti){
  const tagged = entries.filter(e => e && typeof e.ti === 'number');
  if(tagged.length) return tagged.filter(e=>e.ti===ti);
  return entries[ti] ? [entries[ti]] : [];
}

// يرجع تسجيل نادٍ معيّن كما حفظه المنظم فعليًا بنموذج الجولة الرسمي (إن كانت
// الجولة محفوظة أصلًا)، بحث عن أول مشارك يملك هذا النادي ويملك تسجيلًا له
// بتلك الجولة — تُستخدم لمقارنة تقارير الأعضاء بالبيانات الرسمية تلقائيًا
// (لوحة المنظم، قسم "تقارير الأعضاء" — 7 سبتمبر 2026). النادي المشترك بين
// عدة مشاركين تُضمن نتيجته موحّدة بينهم عبر syncSharedClub() أصلًا، فيكفي
// إيجاد أول تسجيل موجود. يرجع null إن لم تكن الجولة محفوظة بعد أو لا يوجد
// تسجيل لهذا النادي فيها.
function getOfficialClubEntry(roundNumber, club, opponent){
  const r = DATA.rounds.find(rr=>rr.number===roundNumber);
  if(!r) return null;
  for(const p of PARTICIPANTS){
    const ti = p.teams.indexOf(club);
    if(ti===-1) continue;
    const entries = (r.entries && r.entries[p.id]) || [];
    const es = getTeamRoundEntries(entries, ti);
    if(!es.length) continue;
    const match = (opponent && es.length>1) ? es.find(e=>e.opp===opponent) : es[0];
    if(match) return match;
  }
  return null;
}

// عدد المشاركين المالكين لنفس النادي — يُستخدم لعرض شارة "مشترك" وتفعيل
// مزامنة نموذج إدخال الجولة (5 سبتمبر 2026): نادٍ واحد بالواقع = مباراة واحدة
// فعلية، فمهما كان عدد المشاركين المالكين له، نتيجتها يجب أن تكون واحدة لكل
// الجميع بنفس الجولة.
function clubParticipantCount(club){
  return PARTICIPANTS.filter(p=>p.teams.includes(club)).length;
}

// مزامنة صفوف نادٍ مشترك بين المشاركين: لما يعدّل المنظم أي حقل (خصم/نتيجة/
// أهداف) أو يضيف/يحذف صف مباراة داخل صندوق نادٍ معيّن (team-block)، نأخذ حالة
// صفوفه الحالية كاملة (rowsData) وننشرها حرفيًا على كل صناديق نفس النادي عند
// بقية المشاركين — بدل ما كان المنظم يفتح كل مشارك يملك نفس النادي ويسجّل له
// نفس النتيجة يدويًا (طلب المستخدم 5 سبتمبر 2026، بعد ملاحظته إنه نادي مثل
// "ريال مدريد" مشترك بين 6 مشاركين ويحتاج تكرار الإدخال 6 مرات لكل جولة).
// آخر صندوق عدّله المنظم فعليًا هو "مصدر الحقيقة" لحظة التعديل — لو عدّل صندوق
// آخر لنفس النادي بعدها (تصحيح مثلاً) ينعكس هو الآخر على البقية بنفس الطريقة.
// ---------- مسودة تلقائية لنموذج الجولة (localStorage) ----------
// تُحفظ أثناء التعبئة لكل رقم جولة على حدة، حتى لا تُفقد البيانات لو انغلق
// المتصفح أو حدث عطل قبل الضغط على "حفظ الجولة" (طلب المستخدم 7 سبتمبر 2026).
// roundFormDirty يتتبّع وجود بيانات غير محفوظة رسميًا حاليًا بالنموذج، ويُستخدم
// أيضًا لتحذير إغلاق الصفحة (beforeunload) بالأسفل. suppressDraftTracking يمنع
// تسجيل تغييرات "برمجية" (كإعادة بناء النموذج نفسه أو مزامنة الأندية المشتركة
// عند فتح جولة محفوظة) كأنها تعديل حقيقي من المنظم.
let roundFormDirty = false;
let suppressDraftTracking = false;
let _draftSaveTimer = null;
function roundDraftKey(num){ return `brookie_round_draft_${num}`; }
function collectRoundFormEntries(){
  const entries = {};
  document.querySelectorAll('#roundForm .team-input-row').forEach(row=>{
    const teamBlock = row.closest('.team-block');
    if(!teamBlock) return;
    const pid = Number(teamBlock.dataset.pid);
    const ti = Number(teamBlock.dataset.ti);
    const result = row.querySelector('.res-select').value;
    const isNoMatch = result === 'no_match';
    // "لا توجد مباراة": لا معنى لخصم أو أهداف، فتُحفظ صفرًا/فارغة دائمًا بصرف
    // النظر عمّا تبقّى بحقول معطّلة قد تحمل قيمًا سابقة قبل اختيار هذا الخيار.
    const gf = isNoMatch ? 0 : Math.max(0, parseInt(row.querySelector('.gf-input').value) || 0);
    const ga = isNoMatch ? 0 : Math.max(0, parseInt(row.querySelector('.ga-input').value) || 0);
    const opp = isNoMatch ? '' : getOppValue(row);
    if(!entries[pid]) entries[pid] = [];
    entries[pid].push({ti, opp: opp || null, result, gf, ga});
  });
  return entries;
}
function saveRoundDraft(num){
  if(!num) return;
  try{
    localStorage.setItem(roundDraftKey(num), JSON.stringify({entries: collectRoundFormEntries(), savedAt: Date.now()}));
  }catch(e){}
}
function loadRoundDraft(num){
  try{
    const raw = localStorage.getItem(roundDraftKey(num));
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}
function clearRoundDraft(num){
  try{ localStorage.removeItem(roundDraftKey(num)); }catch(e){}
}

// ---------- مسودة مشتركة عبر Firebase (زر يدوي، طلب المستخدم 7 سبتمبر 2026) ----------
// بخلاف المسودة التلقائية أعلاه (localStorage، تحمي من إغلاق نفس المتصفح
// بالغلط فقط)، هذه تُحفظ يدويًا بضغطة زر إلى قاعدة البيانات المشتركة — تصل
// لأي جهاز/متصفح يفتح المنظم منه لاحقًا، ولا تُفقد بمسح بيانات المتصفح.
// طلب المستخدم: "مستحيل أسجّل بيانات كل المتسابقين بجلسة واحدة" — فيحتاج
// يحفظ تقدّمه الجزئي (حتى لو ناقصًا) ويكمل لاحقًا من أي مكان. تُخزَّن بمسار
// Firebase منفصل تمامًا عن DATA.rounds العلنية (لا تصل للزوار ولا تدخل حسابات
// الترتيب أبدًا مهما كانت ناقصة) — عبر window.storage نفسها المستخدمة لبقية
// بيانات الموقع (shared:true).
function organizerDraftKey(num){ return `organizer_draft_round_${num}`; }
async function saveSharedRoundDraft(num){
  try{
    const ok = await window.storage.set(organizerDraftKey(num), {entries: collectRoundFormEntries(), savedAt: Date.now()}, true);
    return !!ok;
  }catch(e){
    console.warn('تعذّر حفظ المسودة المشتركة:', e);
    return false;
  }
}
async function loadSharedRoundDraft(num){
  try{
    const res = await window.storage.get(organizerDraftKey(num), true);
    return (res && res.value) ? res.value : null;
  }catch(e){ return null; }
}
async function clearSharedRoundDraft(num){
  try{ await window.storage.set(organizerDraftKey(num), null, true); }catch(e){}
}

function scheduleDraftSave(num){
  if(!num || suppressDraftTracking) return;
  roundFormDirty = true;
  clearTimeout(_draftSaveTimer);
  _draftSaveTimer = setTimeout(()=> saveRoundDraft(num), 600);
}
// تحذير قبل إغلاق الصفحة لو فيه بيانات جولة غير محفوظة (طلب المستخدم 7
// سبتمبر 2026) — يمنع فقدان تعديلات لم تُحفَظ بعد بسبب إغلاق التبويب بالغلط.
window.addEventListener('beforeunload', function(e){
  if(roundFormDirty){
    e.preventDefault();
    e.returnValue = '';
  }
});

function syncSharedClub(sourceTeamBlock){
  const club = sourceTeamBlock.dataset.team;
  if(!club) return;
  const rowsData = Array.from(sourceTeamBlock.querySelectorAll('.match-rows .team-input-row')).map(row=>({
    opp: getOppValue(row),
    result: row.querySelector('.res-select').value,
    gf: row.querySelector('.gf-input').value,
    ga: row.querySelector('.ga-input').value,
  }));
  document.querySelectorAll('#roundForm .team-block').forEach(tb=>{
    if(tb === sourceTeamBlock || tb.dataset.team !== club) return;
    tb.querySelector('.match-rows').innerHTML = rowsData.map(r=>matchRowHTML(r, club)).join('');
    refreshRemoveButtons(tb);
  });
  recomputeRoundCompletion();
  const formEl = document.getElementById('roundForm');
  if(formEl) scheduleDraftSave(Number(formEl.dataset.num));
}

// مزامنة "المباراة الداخلية" تلقائيًا: لو خصم نادٍ ما (بصندوق مشارك) هو نادٍ
// آخر من ضمن أندية المشاركين نفسها (وليس فريقًا خارجيًا بنص حر)، فتسجيل نتيجة
// طرف هو فعليًا نفس المباراة من الطرف الآخر — فنعكس النتيجة والأهداف تلقائيًا
// بصندوق ذلك الخصم عند كل من يملكه من المشاركين، بدل ما يحتاج المنظم يفتح
// صندوق الخصم يدويًا ويسجّل نفس المباراة معكوسة بنفسه (طلب المستخدم 7 سبتمبر
// 2026: "الاتحاد والنصر لعبوا، سجّلت نتيجة الاتحاد، أبى النصر يتسجّل تلقائي
// أنه خسر ضد الاتحاد"). تعمل بالاتجاهين: تعديل صندوق الاتحاد يحدّث النصر،
// وتعديل صندوق النصر مباشرة يحدّث الاتحاد بنفس الطريقة، لأنها تُستدعى من كل
// تعديل بأي صندوق (انظر مستمعي input/change بالأسفل).
function mirrorInternalOpponent(sourceTeamBlock){
  const club = sourceTeamBlock.dataset.team;
  if(!club) return;
  const rows = Array.from(sourceTeamBlock.querySelectorAll('.match-rows .team-input-row'));
  rows.forEach(row=>{
    const opp = getOppValue(row);
    if(!opp || opp === club || !CLUBS.includes(opp)) return;
    const result = row.querySelector('.res-select').value;
    // "لا توجد مباراة" ليست مباراة حقيقية بين طرفين، فلا تُعكَس/تُنسخ على أي
    // خصم — تسجيل مستقل بحت لكل صندوق نادٍ (طلب المستخدم 16 سبتمبر 2026).
    if(!result || result === 'no_match') return;
    const gf = row.querySelector('.gf-input').value;
    const ga = row.querySelector('.ga-input').value;
    const invResult = invertMatchResult(result);
    const targets = Array.from(document.querySelectorAll('#roundForm .team-block')).filter(tb=>tb.dataset.team===opp);
    if(!targets.length) return;
    // صندوق واحد يكفي كمصدر تحديث لنادي الخصم — مزامنة الأندية المشتركة
    // (syncSharedClub) بالأسفل تتكفّل بنشره على بقية المشاركين المالكين لنفس
    // ذلك النادي، فلا داعٍ لتكرار المنطق لكل صندوق مطابق على حدة.
    const primaryTarget = targets[0];
    const targetRows = Array.from(primaryTarget.querySelectorAll('.match-rows .team-input-row'));
    const targetRow = targetRows.find(r=>getOppValue(r)===club) || targetRows[0];
    if(!targetRow) return;
    // حارس ضد التكرار اللانهائي: لو الصف الهدف مطابق أصلًا للقيمة المطلوبة
    // (حالة شائعة لأن syncSharedClub الداخلية بالأسفل تستدعي نفسها لاحقًا على
    // الطرف الآخر)، لا داعٍ لإعادة الكتابة ولا لإعادة النشر.
    const already = getOppValue(targetRow)===club
      && targetRow.querySelector('.res-select').value===invResult
      && String(targetRow.querySelector('.gf-input').value)===String(ga)
      && String(targetRow.querySelector('.ga-input').value)===String(gf);
    if(already) return;
    setOppValue(targetRow, club);
    targetRow.querySelector('.res-select').value = invResult;
    targetRow.querySelector('.gf-input').value = ga;
    targetRow.querySelector('.ga-input').value = gf;
    syncSharedClub(primaryTarget);
  });
}

// مؤشر اكتمال حيّ لكل مشارك بنموذج إدخال الجولة + عداد إجمالي أعلى النموذج —
// بدل ما يكتشف المنظم النواقص كلها دفعة وحدة بعد الضغط على "حفظ الجولة" فقط
// (طلب المستخدم 6 سبتمبر 2026). يُستدعى من syncSharedClub() فيغطي كل الأحداث
// اللي ممكن تغيّر نتيجة مباراة (تعديل مباشر، إضافة/حذف صف، أو مزامنة نادٍ
// مشترك تغيّر نتائج مشاركين آخرين لم يلمسوا هم أنفسهم شيئًا)، ومن prepareRoundForm
// مباشرة عند فتح النموذج أول مرة.
function recomputeRoundCompletion(){
  const box = document.getElementById('roundFormBox');
  if(!box) return;
  const cards = box.querySelectorAll('.round-entry-card');
  // فلتر "عرض الناقص فقط" — يخفي المشاركين المكتملين مؤقتًا أثناء تعبئة جولة
  // طويلة بدل التمرير بينهم للوصول للناقص (طلب المستخدم 7 سبتمبر 2026).
  const filterEl = document.getElementById('showIncompleteOnlyToggle');
  const hideComplete = !!(filterEl && filterEl.checked);
  let completeCount = 0;
  cards.forEach(card=>{
    const selects = card.querySelectorAll('.res-select');
    const missing = Array.from(selects).filter(s=>!s.value).length;
    const isComplete = selects.length > 0 && missing === 0;
    if(isComplete) completeCount++;
    const badge = card.querySelector('.completion-badge');
    if(badge){
      badge.textContent = isComplete ? '✅ مكتمل' : (missing > 0 ? `⚠️ ${missing} ناقصة` : '');
      badge.className = 'completion-badge ' + (isComplete ? 'complete' : 'incomplete');
    }
    card.style.display = (hideComplete && isComplete) ? 'none' : '';
  });
  const summaryText = cards.length ? `${completeCount} من ${cards.length} مشارك مكتمل` : '';
  const summaryEl = document.getElementById('roundCompletionSummary');
  if(summaryEl) summaryEl.textContent = summaryText;
  // نسخة من نفس العداد داخل الشريط السفلي الثابت (طلب المستخدم 7 سبتمبر 2026)
  const stickyEl = document.getElementById('roundStickyCounter');
  if(stickyEl) stickyEl.textContent = summaryText;
}

// صف مباراة واحدة داخل نموذج إدخال الجولة — يشمل الخصم والنتيجة والأهداف،
// وزر حذف الصف (يظهر فقط إذا كان أكثر من صف واحد لنفس النادي).
// الخصم أصبح قائمة منسدلة بأندية التطبيق (CLUBS) بدل نص حر بالكامل (طلب
// المستخدم 7 سبتمبر 2026: كان يكتب اسم الخصم يدويًا في كل مرة رغم أن أغلب
// الخصوم أصلاً من ضمن أندية المشاركين) — مع خيار أخير "غير ذلك" يكشف حقل نص
// حر لخصم من خارج القائمة (فرق ليست ضمن أندية المشاركين الـ31). اختيار خصم
// من القائمة هو ما يُفعّل مزامنة "المباراة الداخلية" التلقائية (mirrorInternalOpponent
// بالأسفل) — خصم بنص حر لا يمكن مطابقته بنادٍ آخر فلا يُشغّلها.
// ---------- لصق نتائج وتحليل تلقائي ----------
// 365Scores ما عنده API عام، فهذا بديل عملي أسرع من الكتابة اليدوية لكل
// نادٍ من الـ27+: المنظم يلصق نصًا (منسوخًا من أي مصدر أو مكتوبًا يدويًا)،
// سطر واحد لكل مباراة: اسم نادٍ (من CLUBS) + نتيجة أرقامًا (مثال 3-0) + اسم
// خصم اختياري. لا يحفظ شيئًا مباشرة — فقط يعبّئ حقول النموذج الحالية بنفس
// شكلها العادي (matchRowHTML)، والمنظم يراجع ويضغط "حفظ الجولة" كالمعتاد.
function parsePastedResults(text){
  const scoreRe = /(\d+)\s*[-–—:]\s*(\d+)/;
  // الأطول أولًا لتفادي تطابق جزئي بين أسماء أندية متشابهة
  const sortedClubs = CLUBS.slice().sort((a,b)=>b.length-a.length);
  const byClub = new Map();
  const unrecognized = [];
  text.split('\n').map(l=>l.trim()).filter(Boolean).forEach(line=>{
    const club = sortedClubs.find(c => line.includes(c));
    const scoreMatch = line.match(scoreRe);
    if(!club || !scoreMatch){ unrecognized.push(line); return; }
    const gf = Number(scoreMatch[1]), ga = Number(scoreMatch[2]);
    const afterScoreIdx = line.indexOf(scoreMatch[0]) + scoreMatch[0].length;
    const opp = line.slice(afterScoreIdx).trim();
    const result = gf > ga ? 'win' : (gf < ga ? 'loss' : 'draw');
    if(!byClub.has(club)) byClub.set(club, []);
    byClub.get(club).push({gf, ga, opp, result});
  });
  const recognized = [];
  byClub.forEach((matches, club)=> recognized.push({club, matches}));
  return {recognized, unrecognized};
}

// يعبّئ صناديق الأندية المتعرَّف عليها بنتائج parsePastedResults، عبر نفس
// آلية المزامنة الموجودة أصلًا (syncSharedClub/mirrorInternalOpponent) بدل
// تكرار منطق النشر لكل مشارك مالك لنفس النادي يدويًا. يرجع أسماء الأندية
// اللي فعلًا تعبّت (لعرضها بالرسالة).
function applyParsedResultsToForm(parsed){
  const applied = [];
  const blocks = Array.from(document.querySelectorAll('#roundForm .team-block'));
  parsed.recognized.forEach(({club, matches})=>{
    const tb = blocks.find(b => b.dataset.team === club);
    if(!tb) return;
    tb.querySelector('.match-rows').innerHTML = matches.map(m=>matchRowHTML(m, club)).join('');
    refreshRemoveButtons(tb);
    syncSharedClub(tb);
    mirrorInternalOpponent(tb);
    applied.push(club);
  });
  recomputeRoundCompletion();
  return applied;
}

function matchRowHTML(prev, club){
  const selResult = prev ? prev.result : '';
  const isNoMatch = selResult === 'no_match';
  const gf = prev ? prev.gf : '';
  const ga = prev ? prev.ga : '';
  const opp = prev && prev.opp ? prev.opp : '';
  const isCustomOpp = !!(opp && !CLUBS.includes(opp));
  const oppOptions = CLUBS.filter(c=>c!==club).map(c=>
    `<option value="${c}" ${opp===c?'selected':''}>${c}</option>`
  ).join('');
  // خيار "لا توجد مباراة هذه الجولة": لبعض الأندية بعض الجولات بلا أي مباراة
  // فعلية (استراحة/تأجيل)، فيحتاج المنظم طريقة لتسجيل ذلك صراحة بدل ترك النتيجة
  // فارغة (يمنع حفظ الجولة) أو اختيار نتيجة غير حقيقية (يُفسد الترتيب/الممات/
  // السلاسل وإحصائيات النادي) — طلب المستخدم 16 سبتمبر 2026. حقول الأهداف
  // تُعطَّل وتُصفَّر تلقائيًا عند اختياره لأنها بلا معنى بلا مباراة فعلية.
  return `<div class="team-input-row">
    <div class="opp-field">
      <select class="opp-select" ${isNoMatch?'disabled':''}>
        <option value="" ${!opp?'selected':''}>اختر الخصم (اختياري)</option>
        ${oppOptions}
        <option value="__other__" ${isCustomOpp?'selected':''}>غير ذلك (فريق خارج القائمة)</option>
      </select>
      <input type="text" class="opp-custom-input" placeholder="اكتب اسم الفريق" value="${isCustomOpp ? opp.replace(/"/g,'&quot;') : ''}" style="${isCustomOpp ? '' : 'display:none;'}">
    </div>
    <select class="res-select">
      <option value="" ${selResult===''?'selected':''} disabled>اختر النتيجة</option>
      <option value="win" ${selResult==='win'?'selected':''}>فوز</option>
      <option value="draw" ${selResult==='draw'?'selected':''}>تعادل</option>
      <option value="loss" ${selResult==='loss'?'selected':''}>خسارة</option>
      <option value="no_match" ${isNoMatch?'selected':''}>⏸️ لا توجد مباراة هذه الجولة</option>
    </select>
    <input type="number" class="gf-input" placeholder="له" min="0" value="${isNoMatch?0:gf}" ${isNoMatch?'disabled':''}>
    <input type="number" class="ga-input" placeholder="عليه" min="0" value="${isNoMatch?0:ga}" ${isNoMatch?'disabled':''}>
    <button type="button" class="remove-match-btn" title="حذف هذه المباراة">✕</button>
  </div>`;
}

// يفعّل/يعطّل حقول الخصم والأهداف بصفّ مباراة تبعًا لاختيار "لا توجد مباراة
// هذه الجولة" — تُستدعى عند بناء الصف (matchRowHTML يضبط الحالة الابتدائية
// فقط) وعند أي تغيير حيّ لاحق بقائمة النتيجة.
function applyNoMatchRowState(row){
  const isNoMatch = row.querySelector('.res-select').value === 'no_match';
  const oppSelect = row.querySelector('.opp-select');
  const gfInput = row.querySelector('.gf-input');
  const gaInput = row.querySelector('.ga-input');
  if(oppSelect) oppSelect.disabled = isNoMatch;
  if(gfInput){ gfInput.disabled = isNoMatch; if(isNoMatch) gfInput.value = 0; }
  if(gaInput){ gaInput.disabled = isNoMatch; if(isNoMatch) gaInput.value = 0; }
}

// قيمة الخصم الفعلية لصفّ ما: اسم النادي من القائمة، أو نص الحقل الحر لو
// اختار المنظم "غير ذلك"، أو فارغ لو لم يُحدَّد خصم بعد.
function getOppValue(row){
  const sel = row.querySelector('.opp-select');
  if(!sel) return '';
  if(sel.value === '__other__'){
    const custom = row.querySelector('.opp-custom-input');
    return custom ? custom.value.trim() : '';
  }
  return sel.value;
}
// يضبط خصم صفّ برمجيًا (تستخدمها مزامنة الأندية المشتركة ومزامنة المباراة
// الداخلية بالأسفل) — يختار من القائمة لو القيمة نادٍ معروف، وإلا يفعّل
// "غير ذلك" ويعبّئ الحقل الحر.
function setOppValue(row, value){
  const sel = row.querySelector('.opp-select');
  const custom = row.querySelector('.opp-custom-input');
  if(!sel) return;
  const isKnown = value && Array.from(sel.options).some(o=>o.value===value);
  if(isKnown){
    sel.value = value;
    if(custom){ custom.style.display='none'; custom.value=''; }
  }else if(value){
    sel.value = '__other__';
    if(custom){ custom.style.display=''; custom.value=value; }
  }else{
    sel.value = '';
    if(custom){ custom.style.display='none'; custom.value=''; }
  }
}

// إظهار/إخفاء زر حذف الصف: يظهر فقط عند وجود أكثر من مباراة واحدة لنفس النادي
// (لا نسمح بحذف الصف الأخير — كل نادٍ لازم له صف واحد على الأقل بالنموذج).
function refreshRemoveButtons(teamBlock){
  const rows = teamBlock.querySelectorAll('.match-rows .team-input-row');
  rows.forEach(row=>{
    const btn = row.querySelector('.remove-match-btn');
    if(btn) btn.style.visibility = rows.length > 1 ? 'visible' : 'hidden';
  });
}

// تفويض الأحداث (event delegation) لأزرار "+ إضافة مباراة أخرى" و"✕ حذف" —
// لازم delegation لأن الصفوف تُبنى ديناميكيًا وقد تُضاف/تُحذف بعد أول رسم.
document.getElementById('roundFormBox').addEventListener('click', (e)=>{
  const addBtn = e.target.closest('.add-match-btn');
  if(addBtn){
    const teamBlock = addBtn.closest('.team-block');
    teamBlock.querySelector('.match-rows').insertAdjacentHTML('beforeend', matchRowHTML(null, teamBlock.dataset.team));
    refreshRemoveButtons(teamBlock);
    syncSharedClub(teamBlock);
    mirrorInternalOpponent(teamBlock);
    return;
  }
  const removeBtn = e.target.closest('.remove-match-btn');
  if(removeBtn){
    const teamBlock = removeBtn.closest('.team-block');
    removeBtn.closest('.team-input-row').remove();
    refreshRemoveButtons(teamBlock);
    syncSharedClub(teamBlock);
    mirrorInternalOpponent(teamBlock);
    return;
  }
  // طيّ/فتح كل بطاقات المشاركين (details.round-entry-card) داخل نموذج الجولة
  // نفسه فقط — منفصل عن أزرار طيّ/فتح كل أقسام لوحة المنظم (طلب المستخدم 7
  // سبتمبر 2026).
  const expandAllP = e.target.closest('#expandAllParticipantsBtn');
  if(expandAllP){
    document.querySelectorAll('#roundForm .round-entry-card').forEach(d=> d.open = true);
    return;
  }
  const collapseAllP = e.target.closest('#collapseAllParticipantsBtn');
  if(collapseAllP){
    document.querySelectorAll('#roundForm .round-entry-card').forEach(d=> d.open = false);
    return;
  }
  // بانر المسودة التلقائية: "استخدامها" يعيد بناء النموذج ببيانات المسودة غير
  // المحفوظة، و"تجاهل" يمسحها ويعيد البناء من آخر بيانات محفوظة رسميًا
  // (طلب المستخدم 7 سبتمبر 2026).
  const applyDraftBtn = e.target.closest('#applyDraftBtn');
  if(applyDraftBtn){
    const formEl = document.getElementById('roundForm');
    const n = formEl ? Number(formEl.dataset.num) : null;
    if(n) prepareRoundForm(n, {useDraft:true});
    return;
  }
  const discardDraftBtn = e.target.closest('#discardDraftBtn');
  if(discardDraftBtn){
    const formEl = document.getElementById('roundForm');
    const n = formEl ? Number(formEl.dataset.num) : null;
    if(n){ clearRoundDraft(n); prepareRoundForm(n, {ignoreDraft:true}); }
    return;
  }
  // بانر المسودة المشتركة (Firebase) — "استخدامها" يعيد بناء النموذج ببياناتها
  // (طلب المستخدم 7 سبتمبر 2026: متابعة تجهيز الجولة من جهاز آخر).
  const applySharedDraftBtn = e.target.closest('#applySharedDraftBtn');
  if(applySharedDraftBtn){
    const formEl = document.getElementById('roundForm');
    const n = formEl ? Number(formEl.dataset.num) : null;
    if(n){
      applySharedDraftBtn.disabled = true;
      loadSharedRoundDraft(n).then(shared=>{
        if(shared) prepareRoundForm(n, {useSharedDraft:true, sharedEntries: shared.entries});
      });
    }
    return;
  }
  const togglePasteImportBtn = e.target.closest('#togglePasteImportBtn');
  if(togglePasteImportBtn){
    const panel = document.getElementById('pasteImportPanel');
    if(panel) panel.style.display = panel.style.display === 'none' ? '' : 'none';
    return;
  }
  const applyPasteImportBtn = e.target.closest('#applyPasteImportBtn');
  if(applyPasteImportBtn){
    const input = document.getElementById('pasteImportInput');
    const resultBox = document.getElementById('pasteImportResult');
    const parsed = parsePastedResults(input ? input.value : '');
    const applied = applyParsedResultsToForm(parsed);
    if(resultBox){
      const okLine = applied.length
        ? `<div class="status-msg ok">تم تعبئة ${applied.length} نادٍ تلقائيًا: ${applied.join('، ')} — راجعها قبل الحفظ.</div>`
        : '<div class="status-msg err">لم يتعرّف التحليل على أي نادٍ بالنص الملصق.</div>';
      const unrecLine = parsed.unrecognized.length
        ? `<div style="color:var(--muted);margin-top:6px;">⚠️ أسطر لم يُتعرَّف عليها تلقائيًا (أكملها يدويًا):<br>${parsed.unrecognized.map(l=>`— ${l}`).join('<br>')}</div>`
        : '';
      resultBox.innerHTML = okLine + unrecLine;
    }
    return;
  }
});

// مزامنة حيّة أثناء الكتابة/الاختيار: أي تغيير بحقل خصم (اختيار من القائمة أو
// كتابة بالحقل الحر عند "غير ذلك") أو أهداف (input)، أو نتيجة (change، لأنه
// <select>) داخل أي صندوق نادٍ يُنشر فورًا على صناديق نفس النادي عند بقية
// المشاركين (syncSharedClub)، وعلى صندوق الخصم لو كان نفس المباراة "داخلية"
// (mirrorInternalOpponent) — انظر تعليقات الدالتين أعلاه.
document.getElementById('roundFormBox').addEventListener('input', (e)=>{
  if(e.target.matches('.opp-custom-input, .gf-input, .ga-input')){
    const teamBlock = e.target.closest('.team-block');
    if(teamBlock){ syncSharedClub(teamBlock); mirrorInternalOpponent(teamBlock); }
  }
});
document.getElementById('roundFormBox').addEventListener('change', (e)=>{
  if(e.target.matches('.opp-select')){
    // إظهار/إخفاء حقل "اسم الفريق" الحر عند اختيار/إلغاء "غير ذلك".
    const row = e.target.closest('.team-input-row');
    const custom = row ? row.querySelector('.opp-custom-input') : null;
    if(custom){
      if(e.target.value === '__other__'){ custom.style.display=''; custom.focus(); }
      else{ custom.style.display='none'; custom.value=''; }
    }
    const teamBlock = e.target.closest('.team-block');
    if(teamBlock){ syncSharedClub(teamBlock); mirrorInternalOpponent(teamBlock); }
    return;
  }
  if(e.target.matches('.res-select')){
    const row = e.target.closest('.team-input-row');
    if(row) applyNoMatchRowState(row);
    const teamBlock = e.target.closest('.team-block');
    if(teamBlock){ syncSharedClub(teamBlock); mirrorInternalOpponent(teamBlock); }
    return;
  }
  // فلتر "عرض الناقص فقط" — إعادة تطبيقه فورًا عند تبديل الخانة (طلب المستخدم
  // 7 سبتمبر 2026).
  if(e.target.id === 'showIncompleteOnlyToggle'){
    recomputeRoundCompletion();
  }
});

// جهّز نموذج جولة (جديدة أو موجودة مسبقًا للتعديل) — دالة مستقلة بدل كودها
// مباشرة داخل مستمع النقر، عشان تُستدعى أيضًا من رقاقات "الجولات المحفوظة"
// (renderPastRoundsChips) بضغطة وحدة بدل الحاجة لكتابة رقم الجولة يدويًا
// بالحقل (طلب المستخدم 6 سبتمبر 2026: أحيانًا يُكتشف خطأ بحسابات جولة ماضية
// ويحتاج تصحيحها بعد إدخالها بفترة — الإمكانية كانت موجودة أصلًا (كتابة رقم
// جولة محفوظة تفتحها للتعديل) لكن غير واضحة، فهذي الرقاقات تكشفها).
function prepareRoundForm(num, opts={}){
  let existing = DATA.rounds.find(r=>r.number===num);
  const box = document.getElementById('roundFormBox');

  // مسودة تلقائية غير محفوظة لنفس رقم الجولة (إن وُجدت) — تُعرض كخيار للمنظم
  // بدل استخدامها تلقائيًا، حتى لا تُستبدَل بيانات محفوظة رسميًا ببيانات
  // مسودة قديمة دون علمه (طلب المستخدم 7 سبتمبر 2026).
  const draft = opts.ignoreDraft ? null : loadRoundDraft(num);
  const useDraftData = !!(opts.useDraft && draft);
  const useSharedDraftData = !!(opts.useSharedDraft && opts.sharedEntries);
  const sourceEntries = useDraftData
    ? draft.entries
    : useSharedDraftData
      ? opts.sharedEntries
      : (existing && existing.entries ? existing.entries : null);

  let html = `<div id="roundForm" data-num="${num}">`;
  if(draft && !opts.useDraft && !opts.ignoreDraft){
    html += `<div class="draft-banner">
      🕒 فيه مسودة محفوظة تلقائيًا لهذه الجولة (${timeAgoLabel(draft.savedAt)}) لم تُحفظ نهائيًا بعد.
      <div class="row" style="margin-top:8px;">
        <button type="button" class="btn secondary" id="applyDraftBtn">استخدام المسودة</button>
        <button type="button" class="btn ghost" id="discardDraftBtn">تجاهل والبدء من المحفوظ</button>
      </div>
    </div>`;
  }
  html += `<div class="round-form-toolbar">
    <label><input type="checkbox" id="showIncompleteOnlyToggle"> عرض الناقص فقط</label>
    <button type="button" class="btn ghost" id="expandAllParticipantsBtn">⬇️ فتح كل المشاركين</button>
    <button type="button" class="btn ghost" id="collapseAllParticipantsBtn">⬆️ طيّ كل المشاركين</button>
  </div>`;
  // لصق وتحليل نتائج تلقائي — بديل أسرع للكتابة اليدوية لكل نادٍ على حدة
  // (طلب المستخدم: تسريع إدخال الجولة بدل بحث/كتابة يدوية لـ27+ ناديًا).
  // لا يحفظ شيئًا مباشرة، فقط يعبّئ حقول النموذج الحالية ليراجعها المنظم.
  html += `<div class="paste-import-box">
    <button type="button" class="btn ghost" id="togglePasteImportBtn">📋 لصق نتائج وتحليل تلقائي</button>
    <div id="pasteImportPanel" style="display:none;">
      <div style="font-size:0.78rem;color:var(--muted);margin:8px 0;">
        الصق نتائج الأندية هنا، سطر واحد لكل مباراة: اسم النادي، ثم النتيجة أرقامًا (مثال 3-0)، ثم اسم الخصم اختياريًا. أي نادٍ لعب أكثر من مباراة بنفس الجولة يُكتب بسطر مستقل لكل مباراة.
      </div>
      <textarea id="pasteImportInput" rows="6" style="width:100%;font-family:inherit;" placeholder="الهلال 3-0 الخليج
برشلونة 2-0
ريال مدريد 4-1 ريال سوسيادد"></textarea>
      <div class="row" style="margin-top:8px;">
        <button type="button" class="btn secondary" id="applyPasteImportBtn">تحليل وتعبئة الحقول</button>
      </div>
      <div id="pasteImportResult" style="margin-top:8px;font-size:0.8rem;"></div>
    </div>
  </div>`;
  PARTICIPANTS.forEach(p=>{
    html += `<details class="round-entry-card"><summary>${p.name}<span class="completion-badge" data-pid="${p.id}"></span></summary>`;
    p.teams.forEach((team, ti)=>{
      const prevEntries = sourceEntries && sourceEntries[p.id]
        ? getTeamRoundEntries(sourceEntries[p.id], ti)
        : [];
      // لو النادي لعب أكثر من مباراة بنفس الجولة (منذ 5 سبتمبر 2026) تُعرض كل
      // مبارياته كصف مستقل — وإلا صف فارغ واحد افتراضيًا كالسابق.
      const rowsData = prevEntries.length ? prevEntries : [null];
      // data-team يحمل اسم النادي (مو فهرس ti الشخصي لكل مشارك) عشان تقدر ميزة
      // "المزامنة بين المشاركين المشتركين بنفس النادي" تجمع كل صناديق نفس النادي
      // عبر كل المشاركين بغض النظر عن ترتيبه بقائمة أندية كل واحد منهم.
      const sharedCount = clubParticipantCount(team);
      const sharedBadge = sharedCount > 1
        ? `<span class="shared-club-badge" title="هذا النادي مشترك بين ${sharedCount} مشاركين — أي تعديل هنا ينعكس تلقائيًا على الجميع">🔗 مشترك (${sharedCount})</span>`
        : '';
      html += `<div class="team-block" data-pid="${p.id}" data-ti="${ti}" data-team="${team}">
        <div class="team-block-head">${clubCrestSVG(team, 22)}<span>${team}</span>${sharedBadge}</div>
        <div class="match-rows">${rowsData.map(prev=>matchRowHTML(prev, team)).join('')}</div>
        <button type="button" class="btn ghost add-match-btn">+ إضافة مباراة أخرى لهذا النادي</button>
      </div>`;
    });
    html += `</details>`;
  });
  html += `<div class="round-sticky-bar">
    <span id="roundStickyCounter"></span>
    <span style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn ghost" id="savePartialRoundBtn" title="يحفظ تقدّمك الحالي (حتى لو ناقصًا) على قاعدة البيانات المشتركة فقط، دون نشره للزوار — تقدر تكمله لاحقًا من أي جهاز">☁️ حفظ التقدّم كمسودة مشتركة</button>
      <button class="btn" id="saveRoundBtn">حفظ الجولة</button>
      ${existing ? `<button class="btn ghost" id="deleteRoundBtn" style="color:var(--coral);border-color:var(--coral);">🗑️ حذف الجولة ${num} بالكامل</button>` : ''}
    </span>
    </div>
    <div id="saveRoundMsg"></div></div>`;
  box.innerHTML = html;
  box.querySelectorAll('.team-block').forEach(refreshRemoveButtons);

  // بناء النموذج وأي مزامنة أولية لأندية مشتركة هو تغيير "برمجي" وليس تعديلاً
  // حقيقيًا من المنظم — suppressDraftTracking يمنع اعتباره كذلك (لا يُعلَّم
  // النموذج "غير محفوظ" ولا يُنشئ مسودة فورًا لمجرد فتح جولة محفوظة أصلاً).
  suppressDraftTracking = true;
  // عند فتح جولة محفوظة مسبقًا للتعديل: لو نادٍ مشترك كان له بيانات مختلفة
  // قليلاً بين مشاركين (بيانات قديمة من قبل ميزة المزامنة أعلاه) نوحّدها فورًا
  // بأخذ أول صندوق فيه نتيجة مختارة فعليًا كمصدر ونشرها على البقية — بدل ما
  // تظهر متضاربة بالنموذج رغم أنها بالواقع مباراة واحدة.
  (function syncExistingSharedClubs(){
    const seenClubs = new Set();
    box.querySelectorAll('.team-block').forEach(tb=>{
      const club = tb.dataset.team;
      if(!club || seenClubs.has(club)) return;
      const hasData = Array.from(tb.querySelectorAll('.res-select')).some(s=>s.value);
      if(hasData){
        seenClubs.add(club);
        syncSharedClub(tb);
        mirrorInternalOpponent(tb);
      }
    });
  })();
  recomputeRoundCompletion();
  suppressDraftTracking = false;
  // لو استخدمنا بيانات مسودة (محلية أو مشتركة) غير محفوظة رسميًا لتعبئة
  // النموذج، فهو فعليًا "غير محفوظ" منذ اللحظة الأولى (حتى لو المنظم لم يعدّل
  // شيئًا بعد فتحه).
  roundFormDirty = useDraftData || useSharedDraftData;

  // تحقّق (غير متزامن) من وجود مسودة مشتركة سحابيًا لهذه الجولة — تُعرض كبانر
  // إضافي إن وُجدت، بلا استبدال تلقائي لبيانات النموذج الحالية (طلب المستخدم
  // 7 سبتمبر 2026). لا تُستخدَم تلقائيًا حتى لا تُفاجئ المنظم ببيانات من جهاز
  // آخر تحل محل ما يراه أمامه الآن.
  if(!useSharedDraftData){
    loadSharedRoundDraft(num).then(shared=>{
      if(!shared) return;
      const formEl = document.getElementById('roundForm');
      if(!formEl || Number(formEl.dataset.num) !== num) return; // المنظم بدّل الجولة بالأثناء
      if(document.getElementById('sharedDraftBanner')) return;
      const banner = document.createElement('div');
      banner.className = 'draft-banner';
      banner.id = 'sharedDraftBanner';
      banner.innerHTML = `☁️ فيه مسودة محفوظة سحابيًا لهذه الجولة (${timeAgoLabel(shared.savedAt)}) — يمكنك المتابعة منها من هنا أو من أي جهاز آخر.
        <div class="row" style="margin-top:8px;">
          <button type="button" class="btn secondary" id="applySharedDraftBtn">استخدام المسودة السحابية</button>
        </div>`;
      box.insertBefore(banner, box.firstChild);
    });
  }

  // زر حذف الجولة بالكامل — يظهر فقط عند تعديل جولة موجودة أصلاً (خطأ بالإدخال
  // مثلاً)، ويحتاج تأكيدًا صريحًا لأنه إجراء لا رجعة فيه على بيانات مشتركة مع
  // الجميع. أُضيف بطلب المستخدم (3 سبتمبر 2026) كخط رجعة سريع بدل التعديل اليدوي.
  const deleteBtn = document.getElementById('deleteRoundBtn');
  if(deleteBtn){
    deleteBtn.addEventListener('click', async ()=>{
      const sure = await customConfirm(`هل أنت متأكد إنك تبي تحذف الجولة ${num} بالكامل؟ هذا الإجراء يحذفها من بيانات كل الزوار فورًا — يمكن التراجع عنه لاحقًا من "📅 سجل نشاط المنظم" (زر ↩️ تراجع) أو باستعادة نسخة احتياطية.`, {confirmText: '🗑️ حذف الجولة'});
      if(!sure) return;
      const preSnapshot = JSON.parse(JSON.stringify(DATA));
      DATA.rounds = DATA.rounds.filter(r=>r.number!==num);
      DATA.updatedAt = Date.now();
      logAdminActivity(`🗑️ حذف الجولة ${num}`, {snapshot: preSnapshot});
      deleteBtn.disabled = true;
      const ok = await saveData();
      renderAll();
      renderPastRoundsChips();
      const saveMsg = document.getElementById('saveRoundMsg');
      if(saveMsg) saveMsg.innerHTML = ok
        ? `<div class="status-msg ok">تم حذف الجولة ${num} بنجاح ✅</div>`
        : '<div class="status-msg err">تعذّر الحذف، حاول مرة ثانية.</div>';
      if(ok){
        clearRoundDraft(num);
        clearSharedRoundDraft(num);
        roundFormDirty = false;
        setTimeout(()=>{
          box.innerHTML = '';
          const numInput = document.getElementById('roundNumber');
          if(numInput) numInput.value = getCurrentRoundNumber() + 1;
        }, 1500);
      }
    });
  }

  // "حفظ التقدّم كمسودة مشتركة" — يحفظ الحالة الحالية للنموذج (حتى لو ناقصة)
  // على قاعدة البيانات المشتركة مباشرة، بدون شرط اكتمال كل المباريات (بخلاف
  // زر "حفظ الجولة" الرسمي بالأسفل). لا تلمس DATA.rounds العلنية إطلاقًا —
  // فلا تصل للزوار ولا تدخل حسابات الترتيب مهما كانت ناقصة (طلب المستخدم 7
  // سبتمبر 2026: "مستحيل أسجّل كل المتسابقين بجلسة واحدة").
  document.getElementById('savePartialRoundBtn').addEventListener('click', async ()=>{
    const btn = document.getElementById('savePartialRoundBtn');
    btn.disabled = true;
    const ok = await saveSharedRoundDraft(num);
    btn.disabled = false;
    const msgEl = document.getElementById('saveRoundMsg');
    if(msgEl) msgEl.innerHTML = ok
      ? '<div class="status-msg ok">تم حفظ تقدّمك الحالي سحابيًا ✅ — تقدر تكمل لاحقًا من أي جهاز (لن يظهر للزوار حتى تضغط "حفظ الجولة" لاحقًا).</div>'
      : '<div class="status-msg err">تعذّر الحفظ السحابي، حاول مرة ثانية.</div>';
    if(ok){
      // محفوظ الآن سحابيًا فلا خطر من فقدانه — إغلاق الصفحة آمن حتى لو الجولة
      // نفسها لم تُحفَظ رسميًا بعد (لا تحذير beforeunload).
      roundFormDirty = false;
      const banner = document.getElementById('sharedDraftBanner');
      if(banner) banner.remove();
    }
  });

  document.getElementById('saveRoundBtn').addEventListener('click', async ()=>{
    // تحقق قبل الحفظ: أي مباراة بدون نتيجة مختارة تمنع الحفظ بالكامل — بدل ما كانت
    // تُسجَّل "تعادل" بصمت لأي صف نسي المنظم يلمسه (خطأ اكتُشف ومنع 3 سبتمبر 2026).
    const missing = document.querySelectorAll('#roundForm .res-select').length
      - Array.from(document.querySelectorAll('#roundForm .res-select')).filter(s=>s.value).length;
    if(missing > 0){
      document.getElementById('saveRoundMsg').innerHTML =
        `<div class="status-msg err">فيه ${missing} مباراة بدون نتيجة محددة — اختر فوز/تعادل/خسارة لكل مباراة قبل الحفظ.</div>`;
      // القفز التلقائي لأول مشارك ناقص — بدل ترك المنظم يمرّر يدويًا على الـ18
      // مشاركًا بحثًا عن الناقص وسط عدد كبير من العدّاد النصّي فقط (طلب
      // المستخدم 7 سبتمبر 2026).
      const firstMissingSelect = Array.from(document.querySelectorAll('#roundForm .res-select')).find(s=>!s.value);
      if(firstMissingSelect){
        const card = firstMissingSelect.closest('.round-entry-card');
        if(card){
          card.open = true;
          card.style.display = '';
          card.scrollIntoView({behavior:'smooth', block:'center'});
        }
      }
      return;
    }
    const entries = collectRoundFormEntries();
    const preSnapshot = JSON.parse(JSON.stringify(DATA));

    let round = DATA.rounds.find(r=>r.number===num);
    if(round){
      round.entries = entries;
    }else{
      round = {number:num, entries};
      DATA.rounds.push(round);
      DATA.rounds.sort((a,b)=>a.number-b.number);
    }
    // تاريخ آخر تعديل لهذه الجولة — يُعرض بجانب رقاقتها بالجولات المحفوظة
    // (طلب المستخدم 7 سبتمبر 2026).
    round.lastModified = Date.now();
    DATA.updatedAt = Date.now();
    logAdminActivity(`💾 حفظ الجولة ${num}`, {snapshot: preSnapshot});
    const ok = await saveData();
    document.getElementById('saveRoundMsg').innerHTML = ok
      ? '<div class="status-msg ok">تم حفظ الجولة ومشاركتها مع الجميع ✅</div>'
      : '<div class="status-msg err">تعذّر الحفظ المشترك. النتائج ظاهرة عندك الآن لكنها لن تصل للآخرين — أعد المحاولة.</div>';
    if(ok){
      clearRoundDraft(num);
      clearSharedRoundDraft(num);
      roundFormDirty = false;
    }
    renderAll();
    renderPastRoundsChips();
  });
}

document.getElementById('startRoundBtn').addEventListener('click', ()=>{
  const rawNum = document.getElementById('roundNumber').value;
  const num = parseInt(rawNum);
  // لازم رقم صحيح أكبر من CURRENT_BASE_ROUND (=2، وهي الجولتان المدمجتان في carry).
  // بدون هذا الشرط كان ممكن يكتب المنظم بالغلط "2" أو "1" أو رقمًا سالبًا فيُنشأ
  // كسجل جولة جديد فوق نقاط carry المدمجة أصلاً — يضاعف نقاط تلك الجولة على كل
  // الـ18 مشاركًا ويكسر منطق "فترة الجسر" في الترتيب وحركة المراكز (خطأ اكتُشف
  // ومنع 3 سبتمبر 2026).
  if(!Number.isInteger(num) || num <= CURRENT_BASE_ROUND){
    alert(`رقم الجولة لازم يكون رقمًا صحيحًا أكبر من ${CURRENT_BASE_ROUND} (الجولة القادمة هي رقم ${CURRENT_BASE_ROUND+1} فأعلى).`);
    return;
  }
  prepareRoundForm(num);
});
