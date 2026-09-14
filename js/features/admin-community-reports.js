/* مراجعة تقارير المجتمع من لوحة المنظم */

// ---------- تقارير الأعضاء (تجريبي) ----------
// صفحة منفصلة (report.html) تسمح لأي عضو بالجروب يسجّل نتيجة مباراة يعرفها
// أو نقاطه المحسوبة بنفسه، بمسار Firebase معزول تمامًا عن بيانات الموسم
// الرسمية (brookie/community-reports بدل brookie/brookie-fantasy-s2-data).
// هذا القسم هنا للمراجعة اليدوية فقط — لا يكتب أي شيء تلقائيًا على DATA،
// المنظم يقارن يدويًا ثم يدخل الرسمي من نموذج "إضافة جولة جديدة" فوق.
const RESULT_LABEL_COMMUNITY = {win:'فوز', draw:'تعادل', loss:'خسارة'};

// نتيجة معكوسة لخصمٍ ما — يستخدمها فحص "المباراة الداخلية" بالأسفل: لو نادٍ
// أ فاز على نادٍ ب، فالمنطقي أن ب سجّل "خسارة" ضد أ (بنفس الأهداف معكوسة).
function invertMatchResult(result){
  if(result === 'win') return 'loss';
  if(result === 'loss') return 'win';
  return 'draw';
}

// شارة "تقارير جديدة" بجانب عنوان القسم بلوحة المنظم (6 سبتمبر 2026) — بدل ما
// يفتح المنظم القسم كل مرة ليكتشف هل وصل شيء جديد. معرّفات التقارير "المُشاهَدة"
// تُخزَّن بـlocalStorage الخاص بجهاز المنظم (لا علاقة له بقاعدة البيانات، فقط
// تذكير محلي)، وتُحدَّث فقط عند فتح القسم فعليًا (details[open]).
let currentReportKeys = [];
function getSeenReportKeys(){
  try{ return new Set(JSON.parse(localStorage.getItem('brookie_admin_seen_reports')||'[]')); }
  catch(e){ return new Set(); }
}
function saveSeenReportKeys(set){
  try{ localStorage.setItem('brookie_admin_seen_reports', JSON.stringify(Array.from(set))); }
  catch(e){}
}
function updateCommunityBadge(){
  const badge = document.getElementById('communityReportsBadge');
  if(!badge) return;
  const seen = getSeenReportKeys();
  const newCount = currentReportKeys.filter(k=>!seen.has(k)).length;
  if(newCount > 0){
    badge.textContent = newCount;
    badge.style.display = 'inline-block';
  }else{
    badge.style.display = 'none';
  }
}
const communityAccordionEl = document.getElementById('communityAccordion');
if(communityAccordionEl){
  communityAccordionEl.addEventListener('toggle', function(){
    if(this.open){
      const seen = getSeenReportKeys();
      currentReportKeys.forEach(k=>seen.add(k));
      saveSeenReportKeys(seen);
      updateCommunityBadge();
    }
  });
}

async function loadCommunityReports(){
  const msg = document.getElementById('communityMsg');
  const matchesBox = document.getElementById('communityMatchesBox');
  const pointsBox = document.getElementById('communityPointsBox');
  const targetRound = getCurrentRoundNumber() + 1;
  msg.innerHTML = `<div style="color:var(--muted);font-size:0.8rem;">جارٍ تحميل تقارير الجولة ${targetRound}...</div>`;
  currentReportKeys = [];

  try{
    const db = _fbInit();
    const [matchesSnap, pointsSnap] = await Promise.all([
      db.ref(`brookie/community-reports/matches/${targetRound}`).get(),
      db.ref(`brookie/community-reports/points/${targetRound}`).get()
    ]);

    // نتائج المباريات — تُجمَّع حسب (النادي + الخصم) لا النادي وحده (منذ 5
    // سبتمبر 2026)، عشان: (أ) تعارض التقارير يُكتشف فقط بين تقريرين لنفس
    // المباراة الفعلية (نادٍ ضد نفس الخصم)، و(ب) نادٍ لعب أكثر من مباراة
    // بنفس الجولة يظهر كل مباراة له بشكل منفصل بدل تعارض وهمي بينهما.
    if(!matchesSnap.exists()){
      matchesBox.innerHTML = '<div style="color:var(--muted);">لا توجد نتائج مُرسَلة بعد لهذه الجولة.</div>';
    }else{
      // نحافظ على مفتاح push الخاص بكل تقرير (r.id) — لازم لبناء مسار
      // Firebase الدقيق عند التعديل/الحذف بالأسفل (5 سبتمبر 2026).
      const list = Object.entries(matchesSnap.val()).map(([id, r])=>({id, ...r}));
      list.forEach(r=> currentReportKeys.push(`${targetRound}:m:${r.id}`));
      const byMatch = {};
      list.forEach(r=>{
        const key = `${r.club}|${r.opponent||''}`;
        (byMatch[key] = byMatch[key] || {club:r.club, opponent:r.opponent, reports:[]}).reports.push(r);
      });
      let html = '';
      Object.keys(byMatch).sort((a,b)=>a.localeCompare(b,'ar')).forEach(key=>{
        const {club, opponent, reports} = byMatch[key];
        const distinct = new Set(reports.map(r=>`${r.result}|${r.gf}|${r.ga}`));
        const conflict = distinct.size > 1;

        // تمييز مباراة "داخلية" (خصمها نادٍ آخر من ضمن أندية المشاركين الـ27،
        // مثل الاتحاد ضد النصر) عن مباراة "خارجية" (الخصم نادٍ خارج التجمّع) —
        // طلب المستخدم (5 سبتمبر 2026): مباراة داخلية نتيجتها مرآة لتسجيل
        // الطرف الآخر (فوز نادٍ = خسارة الآخر بنفس الأهداف معكوسة)، فنبحث عن
        // تسجيل الطرف الآخر (byMatch[opponent|club]) ونقارنه بدل التعامل مع
        // كل تسجيل كمباراة منفصلة لا علاقة لها بالأخرى.
        let matchBadge = '';
        // hasIssue يجمع كل حالات "يحتاج مراجعة المنظم": تعارض صريح بين تقريرين
        // لنفس المباراة، مباراة داخلية بانتظار تسجيل الطرف الآخر، أو مباراة
        // داخلية لا تُطابق تسجيل الطرف الآخر — يُستخدم بفلتر "عرض التعارضات
        // فقط" أدناه (طلب المستخدم 7 سبتمبر 2026).
        let hasIssue = conflict;
        if(opponent && CLUBS.includes(opponent)){
          const mirror = byMatch[`${opponent}|${club}`];
          if(!mirror){
            matchBadge = `<span class="match-badge match-badge-info">⚔️ داخلية — بانتظار تسجيل ${opponent}</span>`;
            hasIssue = true;
          }else{
            const rep = reports[0];
            const mirrorRep = mirror.reports[0];
            const matches = mirrorRep.result === invertMatchResult(rep.result)
              && Number(mirrorRep.gf) === Number(rep.ga) && Number(mirrorRep.ga) === Number(rep.gf);
            matchBadge = matches
              ? `<span class="match-badge match-badge-ok">⚔️ داخلية — تُطابق تسجيل ${opponent} ✅</span>`
              : `<span class="match-badge match-badge-warn">⚔️ داخلية — ⚠️ لا تُطابق تسجيل ${opponent}</span>`;
            if(!matches) hasIssue = true;
          }
        }else if(opponent){
          matchBadge = `<span class="match-badge match-badge-external">🌍 خصم خارجي</span>`;
        }

        // فحص تناسق تلقائي مع الجولة الرسمية المحفوظة (إن وُجدت) — يقارن كل
        // تقرير مُرسَل من الأعضاء بما حفظه المنظم فعليًا بنموذج الجولة الرسمي
        // لنفس النادي (وبنفس الخصم تحديدًا إن كان له أكثر من مباراة بالجولة)،
        // فيكتشف أي خطأ إدخال يدوي تلقائيًا بدل الاعتماد على مراجعة كل تقرير
        // يدويًا (طلب المستخدم 7 سبتمبر 2026). لا شيء يظهر إن كانت الجولة لسه
        // ما تحفظت رسميًا (الحالة الشائعة، لأن التقارير تُعرض للجولة القادمة
        // تحديدًا) — الفحص يفيد أساسًا بعد ما يحفظ المنظم الجولة ويرجع يراجع
        // التقارير للتأكد من عدم وجود خطأ كتابي بإدخاله.
        const official = getOfficialClubEntry(targetRound, club, opponent);
        const officialNotes = reports.map(r=>{
          if(!official) return '';
          const matchesOfficial = official.result===r.result
            && Number(official.gf)===Number(r.gf) && Number(official.ga)===Number(r.ga);
          if(!matchesOfficial) hasIssue = true;
          return matchesOfficial
            ? `<div class="official-check-note ok">📋 يطابق الجولة الرسمية المحفوظة ✅</div>`
            : `<div class="official-check-note warn">📋 ⚠️ يختلف عن الرسمية المحفوظة: ${RESULT_LABEL_COMMUNITY[official.result]||official.result} (${official.gf}-${official.ga})</div>`;
        });

        html += `<div data-issue="${hasIssue?1:0}" style="padding:8px 0;border-bottom:1px dotted var(--line);">
          <div style="font-weight:800;">${club}${opponent?` ضد ${opponent}`:''} ${conflict ? '<span style="color:var(--coral);">⚠️ تعارض بين التقارير</span>' : ''}</div>
          ${matchBadge ? `<div style="margin:3px 0 2px;">${matchBadge}</div>` : ''}`;
        reports.forEach((r,ri)=>{
          // كل تقرير له وضع عرض (view) ووضع تعديل (edit) — يبدأ العرض فقط
          // ظاهرًا، وزر "✏️ تعديل" يبدّل بينهما (المنظم اكتشف نتيجة خاطئة
          // مُرسَلة من زائر/متسابق ويحتاج يصححها أو يحذفها بلا رجوع للمُرسِل).
          html += `<div class="community-report-row" data-id="${r.id}" data-round="${targetRound}">
            <div class="community-report-view">
              <span>${RESULT_LABEL_COMMUNITY[r.result]||r.result} (${r.gf}-${r.ga}) ${r.reporter ? '— أرسلها: '+r.reporter : ''}</span>
              <span class="actions">
                <button type="button" class="btn ghost edit-report-btn">✏️ تعديل</button>
                <button type="button" class="btn ghost delete-report-btn" style="color:var(--coral);border-color:var(--coral);">🗑️ حذف</button>
              </span>
            </div>
            ${officialNotes[ri] || ''}
            <div class="community-report-edit">
              <input type="text" class="edit-opp-input" placeholder="الخصم" value="${(r.opponent||'').replace(/"/g,'&quot;')}">
              <select class="edit-res-select">
                <option value="win" ${r.result==='win'?'selected':''}>فوز</option>
                <option value="draw" ${r.result==='draw'?'selected':''}>تعادل</option>
                <option value="loss" ${r.result==='loss'?'selected':''}>خسارة</option>
              </select>
              <input type="number" class="edit-gf-input" min="0" placeholder="له" value="${r.gf}">
              <input type="number" class="edit-ga-input" min="0" placeholder="عليه" value="${r.ga}">
              <button type="button" class="btn save-report-btn">💾 حفظ</button>
              <button type="button" class="btn ghost cancel-report-btn">إلغاء</button>
            </div>
          </div>`;
        });
        html += `</div>`;
      });
      matchesBox.innerHTML = html;
      applyConflictFilter();
    }

    // نقاط ذاتية — تُعرض كقائمة بسيطة، ومن لم يُرسل بعد يُذكر بالاسم كتذكير
    if(!pointsSnap.exists()){
      pointsBox.innerHTML = '<div style="color:var(--muted);">لا يوجد أحد أرسل نقاطه بعد لهذه الجولة.</div>';
    }else{
      const entries = pointsSnap.val();
      const reportedIds = Object.keys(entries).map(Number);
      Object.keys(entries).forEach(pid=> currentReportKeys.push(`${targetRound}:p:${pid}`));
      let html = '<div>';
      PARTICIPANTS.forEach(p=>{
        if(entries[p.id]){
          html += `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dotted var(--line);">
            <span>${p.name}</span><span style="font-weight:800;">${entries[p.id].points} نقطة</span></div>`;
        }
      });
      html += '</div>';
      const missing = PARTICIPANTS.filter(p=>!reportedIds.includes(p.id)).map(p=>p.name);
      if(missing.length){
        html += `<div style="margin-top:10px;font-size:0.78rem;color:var(--muted);">لم يُرسل بعد: ${missing.join('، ')}</div>`;
      }
      pointsBox.innerHTML = html;
    }

    msg.innerHTML = `<div class="status-msg ok">تم التحديث — بيانات الجولة ${targetRound} ✅</div>`;
    updateCommunityBadge();
  }catch(e){
    msg.innerHTML = '<div class="status-msg err">تعذّر تحميل التقارير، تحقق من الاتصال وحاول ثانية.</div>';
  }
}

document.getElementById('refreshCommunityBtn').addEventListener('click', loadCommunityReports);

// فلتر "عرض التعارضات فقط" بتقارير الأعضاء — يخفي المباريات المؤكدة/المتطابقة
// ويُبقي فقط ما يحتاج مراجعة المنظم (تعارض، أو مباراة داخلية بانتظار الطرف
// الآخر أو غير مطابقة له) — بدل التمرير بكل القائمة بحثًا عنها (طلب المستخدم
// 7 سبتمبر 2026). لا يعيد تحميل البيانات، فقط يبدّل ظهور العناصر المُعلَّمة
// مسبقًا بـ data-issue أثناء البناء بالأعلى.
function applyConflictFilter(){
  const cb = document.getElementById('showConflictsOnlyToggle');
  const onlyConflicts = !!(cb && cb.checked);
  document.querySelectorAll('#communityMatchesBox [data-issue]').forEach(el=>{
    el.style.display = (onlyConflicts && el.dataset.issue === '0') ? 'none' : '';
  });
}
const showConflictsOnlyToggleEl = document.getElementById('showConflictsOnlyToggle');
if(showConflictsOnlyToggleEl){
  showConflictsOnlyToggleEl.addEventListener('change', applyConflictFilter);
}

// تعديل/حذف تقرير مباراة فردي مُرسَل من زائر أو متسابق (5 سبتمبر 2026) — بطلب
// المستخدم بعد ما لاحظ نتيجة خاطئة بتقارير المجتمع وما كان عنده وسيلة لتصحيحها
// أو حذفها غير التواصل يدويًا مع من أرسلها. delegation ثابت على communityMatchesBox
// نفسه (العنصر لا يُستبدَل، فقط innerHTML يتغيّر بكل loadCommunityReports()).
document.getElementById('communityMatchesBox').addEventListener('click', async (e)=>{
  const editBtn = e.target.closest('.edit-report-btn');
  if(editBtn){
    const row = editBtn.closest('.community-report-row');
    row.querySelector('.community-report-edit').classList.add('open');
    return;
  }
  const cancelBtn = e.target.closest('.cancel-report-btn');
  if(cancelBtn){
    const row = cancelBtn.closest('.community-report-row');
    row.querySelector('.community-report-edit').classList.remove('open');
    return;
  }
  const saveBtn = e.target.closest('.save-report-btn');
  if(saveBtn){
    const row = saveBtn.closest('.community-report-row');
    const { id, round } = row.dataset;
    const opponent = row.querySelector('.edit-opp-input').value.trim();
    const result = row.querySelector('.edit-res-select').value;
    // نمنع الأهداف السالبة كما بنموذج الجولة الرسمي (نفس السبب: min="0" مجرد
    // تلميح للمتصفح وليس تحققًا فعليًا).
    const gf = Math.max(0, parseInt(row.querySelector('.edit-gf-input').value) || 0);
    const ga = Math.max(0, parseInt(row.querySelector('.edit-ga-input').value) || 0);
    saveBtn.disabled = true;
    saveBtn.textContent = 'جارٍ الحفظ...';
    try{
      const db = _fbInit();
      await db.ref(`brookie/community-reports/matches/${round}/${id}`).update({opponent: opponent || null, result, gf, ga});
      await loadCommunityReports();
    }catch(err){
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 حفظ';
      document.getElementById('communityMsg').innerHTML = '<div class="status-msg err">تعذّر حفظ التعديل، تحقق من الاتصال وحاول ثانية.</div>';
    }
    return;
  }
  const deleteBtn = e.target.closest('.delete-report-btn');
  if(deleteBtn){
    const row = deleteBtn.closest('.community-report-row');
    const { id, round } = row.dataset;
    const sure = await customConfirm('هل أنت متأكد إنك تبي تحذف هذا التقرير نهائيًا؟ هذا الإجراء لا يمكن التراجع عنه.', {confirmText: '🗑️ حذف'});
    if(!sure) return;
    deleteBtn.disabled = true;
    try{
      const db = _fbInit();
      await db.ref(`brookie/community-reports/matches/${round}/${id}`).remove();
      await loadCommunityReports();
    }catch(err){
      deleteBtn.disabled = false;
      document.getElementById('communityMsg').innerHTML = '<div class="status-msg err">تعذّر الحذف، تحقق من الاتصال وحاول ثانية.</div>';
    }
  }
});
