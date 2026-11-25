/* نسخ كل نتائج الأعضاء إلى نموذج تجهيز الجولة (007-T002، R-29): زر في بطاقة «تقارير الأعضاء» يقرأ نتائج مباريات الجولة القادمة،
 * ويحلّلها (js/core/community-reports-analyze.js: مكرر/مشكوك/تعارض)، والمنظّم يقرر لكل مجموعة «مكررة / ليست مكررة»، ثم يخرج نص بالصيغة التي
 * يقرؤها «لصق نتائج وتحليل تلقائي» (parseResults)، يُنسخ للحافظة أو يُلصق بزر في نموذج التجهيز.
 *
 * للقراءة فقط: الفتح يقرأ بـget() مرة وحدة ولا يكتب شيئًا بـFirebase إطلاقًا (لا set/update/push/remove). القرارات تُتذكَّر محليًا فقط
 * (localStorage بمفتاح الجولة، داخل try/catch) ولا تؤثر على أي بيانات. لا يحفظ الجولة ولا يعتمدها (FR-05).
 * محتوى الزوار (أسماء المُرسِلين والخصوم) يمر على escapeHtml (الدستور 23). تقارير النقاط خارج النطاق (FR-06). */

let _cc = null;   // {round, analysis, decisions}

function _ccDecisionsKey(round){ return `brookie_cc_decisions_${round}`; }
function _ccLoadDecisions(round){
  try{ const v = JSON.parse(localStorage.getItem(_ccDecisionsKey(round)) || '{}'); return (v && typeof v === 'object') ? v : {}; }
  catch(e){ return {}; }
}
function _ccSaveDecisions(){
  if(!_cc) return;
  try{ localStorage.setItem(_ccDecisionsKey(_cc.round), JSON.stringify(_cc.decisions)); }catch(e){}
}

function _ccLine(club, gf, ga, opp){ return `${club} ${gf}-${ga}${opp ? ' ' + opp : ''}`; }
// عدد بالعربية: (واحد، اثنان، 3–10، 11+) — forms: {one, two, few, many} والمعدود بعد الرقم
function _ccCount(n, f){ return n === 1 ? f.one : n === 2 ? f.two : n <= 10 ? `${n} ${f.few}` : `${n} ${f.many}`; }
const _CC_REPORT = {one: 'تقرير واحد', two: 'تقريران', few: 'تقارير', many: 'تقريرًا'};
const _CC_GROUP = {one: 'مجموعة واحدة', two: 'مجموعتان', few: 'مجموعات', many: 'مجموعة'};
const _CC_TYPE_LABEL = {conflict: 'تعارض', suspect: 'مشكوك', mirror: 'من الطرفين', agreed: 'متفقة', single: 'مفرد'};

function _ccMsg(html){ const m = document.getElementById('ccMsg'); if(m) m.innerHTML = html; }

// الاقتراح السريع («اعتمد الكل كاقتراح»): التعارض ← النتيجة الأكثر تقريرًا (والأحدث عند التساوي)، والمشكوك ← «ليست مكررة»
function _ccSuggest(group){
  if(group.type === 'conflict' || group.variants.length > 1 && group.type !== 'suspect'){
    const best = group.variants.slice().sort((a, b) => {
      const ra = group.reports.filter(r => r.variantKey === a.key), rb = group.reports.filter(r => r.variantKey === b.key);
      return rb.length - ra.length || Math.max(...rb.map(r => r.time || 0)) - Math.max(...ra.map(r => r.time || 0));
    })[0];
    return {mode: 'dup', pick: best.key};
  }
  return {mode: 'sep'};
}

function _ccGroupHTML(g, i, decisions){
  const d = effectiveDecision(g, decisions) || (decisions[g.key] && decisions[g.key].mode === 'dup' ? decisions[g.key] : null);
  const first = g.variants[0];
  const title = g.variants.length === 1
    ? `${escapeHtml(first.club)}${first.opp ? ' ضد ' + escapeHtml(first.opp) : ''}`
    : escapeHtml(Array.from(new Set(g.variants.map(v => v.club))).join(' و'));
  const reports = g.reports.map(r => `<li><span class="cc-res">${escapeHtml(_ccLine(r.club, r.gf, r.ga, r.opponent))}</span>
      <span class="cc-by">${r.reporter ? escapeHtml(r.reporter) : 'بدون اسم'}</span><span class="cc-time">${r.time ? escapeHtml(timeAgo(r.time)) : ''}</span></li>`).join('');
  const mode = d ? d.mode : '';
  const radio = (val, label) => `<label class="cc-opt"><input type="radio" name="ccg${i}" value="${val}" data-key="${escapeHtml(g.key)}"${mode === val ? ' checked' : ''}><span>${label}</span></label>`;
  let pick = '';
  if(mode === 'dup' && g.variants.length > 1){
    pick = `<div class="cc-pick" role="radiogroup" aria-label="النتيجة المعتمدة"><div class="cc-pick-title">اعتمد أي نتيجة؟</div>${g.variants.map(v => {
      const n = g.reports.filter(r => r.variantKey === v.key).length;
      return `<label class="cc-opt"><input type="radio" name="ccp${i}" value="${escapeHtml(v.key)}" data-key="${escapeHtml(g.key)}" data-pick="1"${d && d.pick === v.key ? ' checked' : ''}><span>${escapeHtml(_ccLine(v.club, v.gf, v.ga, v.opp))} <span class="cc-by">(${_ccCount(n, _CC_REPORT)})</span></span></label>`;
    }).join('')}</div>`;
  }
  const done = !!effectiveDecision(g, decisions);
  return `<fieldset class="cc-group cc-${g.type}${done ? ' cc-done' : ''}">
    <legend><span class="cc-title">${title}</span> <span class="cc-badge cc-badge-${g.type}">${_CC_TYPE_LABEL[g.type]}</span></legend>
    <p class="cc-reasons">${g.reasons.map(escapeHtml).join('. ')}</p>
    <ul class="cc-reports">${reports}</ul>
    <div class="cc-options" role="radiogroup" aria-label="قرار المجموعة">${radio('dup', 'مكررة (ادمجها في مباراة وحدة)')}${radio('sep', 'ليست مكررة (اتركها مباريات منفصلة)')}</div>
    ${pick}
  </fieldset>`;
}

function ccRender(){
  const panel = document.getElementById('communityCopyPanel');
  if(!panel || !_cc) return;
  const a = _cc.analysis, decisions = _cc.decisions;
  if(!a.stats.reports){
    panel.innerHTML = emptyState({icon: 'clipboard', title: 'لا نتائج من الأعضاء بعد', text: `ما أرسل أحد نتائج مباريات الجولة ${_cc.round} حتى الآن.`});
    return;
  }
  const decide = a.groups.filter(g => g.needsDecision), singles = a.groups.filter(g => !g.needsDecision);
  const pending = pendingGroups(a.groups, decisions);
  const text = pending.length ? '' : buildPasteText(a.groups, decisions);
  const lines = text ? text.split('\n').length : 0;
  let html = `<div class="cc-head"><strong>الجولة ${_cc.round}</strong>: ${_ccCount(a.stats.readable, _CC_REPORT)} في ${_ccCount(a.groups.length, _CC_GROUP)}${decide.length ? '، منها ' + _ccCount(decide.length, _CC_GROUP) + ' تحتاج قرارك' : ''}.</div>`;
  if(a.unreadable.length){
    html += `<details class="cc-unreadable"><summary>${_ccCount(a.unreadable.length, _CC_REPORT)} لم تُقرأ</summary><ul>${a.unreadable.map(u => `<li>${escapeHtml(u.reason)}</li>`).join('')}</ul></details>`;
  }
  if(decide.length){
    html += `<div class="cc-actions cc-top"><button type="button" class="btn ghost" id="ccSuggestBtn"><span class="cc-ic">${ICONS.check}</span> اعتمد الكل كاقتراح</button><button type="button" class="btn ghost" id="ccResetBtn"><span class="cc-ic">${ICONS.refresh}</span> ابدأ من جديد</button></div>`;
    html += decide.map((g, i) => _ccGroupHTML(g, i, decisions)).join('');
  } else {
    html += `<div class="cc-actions cc-top"><button type="button" class="btn ghost" id="ccResetBtn"><span class="cc-ic">${ICONS.refresh}</span> ابدأ من جديد</button></div>`;
  }
  if(singles.length){
    html += `<details class="cc-singles"><summary>${_ccCount(singles.length, {one: 'مباراة واحدة', two: 'مباراتان', few: 'مباريات', many: 'مباراة'})} بلا شك: تنزل مباشرة</summary><ul>${singles.map(g => `<li>${escapeHtml(_ccLine(g.variants[0].club, g.variants[0].gf, g.variants[0].ga, g.variants[0].opp))}</li>`).join('')}</ul></details>`;
  }
  html += `<div class="cc-out">
    ${pending.length ? `<p class="cc-wait" role="status">بقي ${_ccCount(pending.length, _CC_GROUP)} بلا قرار. احسمها لينفتح النسخ.</p>` : `<label class="cc-out-label" for="ccOut">النص الجاهز (${_ccCount(lines, {one: 'سطر واحد', two: 'سطران', few: 'أسطر', many: 'سطرًا'})})</label><textarea id="ccOut" class="cc-textarea" rows="${Math.min(14, lines + 1)}" readonly>${escapeHtml(text)}</textarea>`}
    <div class="cc-actions">
      <button type="button" class="btn" id="ccCopyBtn"${pending.length || !text ? ' disabled' : ''}><span class="cc-ic">${ICONS.clipboard}</span> انسخ النص</button>
      <button type="button" class="btn secondary" id="ccPasteBtn"${pending.length || !text ? ' disabled' : ''}><span class="cc-ic">${ICONS.edit}</span> الصقه في نموذج التجهيز</button>
    </div>
  </div>`;
  const keepY = window.scrollY;
  panel.innerHTML = html;
  if(Math.abs(window.scrollY - keepY) > 1) window.scrollTo(0, keepY);
}

// يقرأ تقارير الجولة القادمة (قراءة فقط) ويحلّلها ويعرض لوحة القرار
async function ccOpen(){
  const panel = document.getElementById('communityCopyPanel'), btn = document.getElementById('copyAllReportsBtn');
  if(!panel) return;
  const round = getCurrentRoundNumber() + 1;
  panel.hidden = false;
  _ccMsg('<div class="status-msg">جارٍ قراءة تقارير الجولة ' + round + '…</div>');
  if(btn) btn.disabled = true;
  try{
    const db = _fbInit();
    const snap = await db.ref(`brookie/community-reports/matches/${round}`).get();
    const list = snap.exists() ? Object.entries(snap.val()).map(([id, r]) => Object.assign({id}, r)) : [];
    _cc = {round, analysis: analyzeCommunityReports(list), decisions: _ccLoadDecisions(round)};
    _ccMsg('');
    ccRender();
  }catch(e){
    _ccMsg('<div class="status-msg err">تعذّر قراءة التقارير، تحقق من الاتصال وحاول ثانية.</div>');
  } finally {
    if(btn) btn.disabled = false;
  }
}

function ccCopy(){
  const ta = document.getElementById('ccOut');
  if(!ta) return;
  const done = () => _ccMsg('<div class="status-msg ok">تم نسخ النص. الصقه في «لصق نتائج وتحليل تلقائي» بنموذج الجولة.</div>');
  const fallback = () => { ta.focus(); ta.select(); try{ document.execCommand('copy'); done(); }catch(e){ _ccMsg('<div class="status-msg err">حدّد النص وانسخه يدويًا.</div>'); } };
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(done, fallback);
  else fallback();
}

// يضع النص في خانة اللصق بنموذج التجهيز ويشغّل «حلّل وأضف للمسودة» (فتظهر المسودة وتقرير الفحص). لا يعبّئ الحقول ولا يحفظ.
async function ccPasteToForm(){
  const ta = document.getElementById('ccOut');
  if(!ta || !_cc) return;
  const round = _cc.round;
  const open = document.getElementById('roundForm');
  if(!open || Number(open.dataset.num) !== round){
    if(open){
      const ok = await customConfirm(`نموذج الجولة ${open.dataset.num} مفتوح الحين. فتح نموذج الجولة ${round} يستبدله.\\nتبي تكمل؟`, {confirmText: 'نعم، افتح الجولة ' + round});
      if(!ok) return;
    }
    const rn = document.getElementById('roundNumber'); if(rn) rn.value = round;
    prepareRoundForm(round);
  }
  const acc = document.getElementById('roundFormBox') && document.getElementById('roundFormBox').closest('details');
  if(acc) acc.open = true;
  const panel = document.getElementById('pasteImportPanel');
  if(!panel){ _ccMsg('<div class="status-msg err">ما لقيت لوحة «لصق نتائج وتحليل تلقائي». افتح نموذج الجولة أولًا.</div>'); return; }
  if(panel.hidden){ panel.hidden = false; if(typeof riInitPanel === 'function') riInitPanel(); }
  document.getElementById('pasteImportInput').value = ta.value;
  riParse();
  panel.scrollIntoView({behavior: 'smooth', block: 'start'});
  _ccMsg('<div class="status-msg ok">وُضع النص في نموذج التجهيز وظهرت المسودة. راجع الناقص وكمّله، ثم اعتمد وعبّئ النموذج كالمعتاد.</div>');
}

document.addEventListener('click', e => {
  const t = e.target.closest('#copyAllReportsBtn, #ccSuggestBtn, #ccResetBtn, #ccCopyBtn, #ccPasteBtn');
  if(!t) return;
  if(t.id === 'copyAllReportsBtn') ccOpen();
  else if(!_cc) return;
  else if(t.id === 'ccSuggestBtn'){
    pendingGroups(_cc.analysis.groups, _cc.decisions).forEach(g => { _cc.decisions[g.key] = _ccSuggest(g); });
    _ccSaveDecisions(); ccRender();
  } else if(t.id === 'ccResetBtn'){
    _cc.decisions = {}; _ccSaveDecisions(); _ccMsg(''); ccRender();
  } else if(t.id === 'ccCopyBtn') ccCopy();
  else if(t.id === 'ccPasteBtn') ccPasteToForm();
});

document.addEventListener('change', e => {
  const r = e.target.closest('#communityCopyPanel input[type="radio"]');
  if(!r || !_cc) return;
  const key = r.dataset.key, cur = _cc.decisions[key] || {};
  if(r.dataset.pick) _cc.decisions[key] = {mode: 'dup', pick: r.value};
  else if(r.value === 'sep') _cc.decisions[key] = {mode: 'sep'};
  else {
    // «مكررة»: لو في نتيجة واحدة تنحسم، وإلا تنتظر اختيار النتيجة
    const g = _cc.analysis.groups.find(x => x.key === key);
    _cc.decisions[key] = g && g.variants.length === 1 ? {mode: 'dup', pick: g.variants[0].key} : {mode: 'dup', pick: cur.mode === 'dup' ? cur.pick : undefined};
  }
  _ccSaveDecisions(); ccRender();
});
