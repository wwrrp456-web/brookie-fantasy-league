/* واجهة استيراد نتائج الجولة (002-R22 / S51): داخل نموذج إدخال الجولة بتبويب المنظّم. كله بالمتصفح، بلا شبكة ولا مفاتيح.
 * التدفق: روابط أيام الفترة (يفتحها المنظّم بنفسه بـ_blank) ← لصق النص المنسوخ ← «حلّل وأضف للمسودة» ← تقرير الفحص + مسودة قابلة للتعديل
 *         ← «اعتمد وعبّئ النموذج» (يعبّئ الحقول فقط ولا يحفظ؛ يبقى «حفظ الجولة» كالمعتاد بعد مراجعة المنظّم).
 * بديل ثانٍ: «انسخ طلب البحث» لـChatGPT أو Claude ثم لصق الجواب (جدول |) بنفس المسودة.
 * الاعتماد: js/core/results-import.js (المحلّل والفحص) وapplyParsedResultsToForm من admin-round-form.js. بلا إيموجي، وبلا style مضمَّن. */

let _riDraft = [];      // صفوف المسودة (تتراكم بين اللصقات حتى الاعتماد أو المسح)
let _riIgnored = [];    // ما تُجاهل (مع الأسباب)
let _riUnknown = [];    // أسطر لم تُفهم
let _riLastWarn = '';

function resultsImportPanelHTML(){
  return `<div class="paste-import-box results-import">
    <button type="button" class="btn ghost" id="togglePasteImportBtn">${ICONS.clipboard} لصق نتائج وتحليل تلقائي</button>
    <div id="pasteImportPanel" class="ri-panel" hidden>
      <p class="ri-note">النتائج تُنسخ من موقع 365Scores بيدك. راجع المسودة قبل الاعتماد.</p>
      <div class="ri-period">
        <label>بداية الجولة <input type="date" id="riStart"></label>
        <label>نهايتها <input type="date" id="riEnd"></label>
      </div>
      <div class="ri-links" id="riLinks"></div>
      <details class="ri-tips">
        <summary>نصائح النسخ</summary>
        <ul>
          <li>افتح الرابط بمتصفحك، حدّد الصفحة كلها وانسخ، ثم ارجع والصقه هنا.</li>
          <li><strong>أوقف «ترجمة الصفحة» بالمتصفح</strong> قبل النسخ، فالترجمة الآلية تشوّه أسماء الفرق.</li>
          <li>لو بقيت الأسماء مشوّهة جرّب <span id="riEnLinks"></span> (أسماء إنجليزية، وهي مدعومة).</li>
        </ul>
      </details>
      <label class="ri-date">تاريخ هذه اللصقة (اختياري، لو لم يظهر بالنص) <input type="date" id="riPasteDate"></label>
      <textarea id="pasteImportInput" class="ri-input" rows="7" placeholder="الصق هنا نص الصفحة المنسوخ، أو جواب الذكاء الاصطناعي (جدول)، أو سطرًا لكل مباراة: الهلال 3-0 الخليج"></textarea>
      <div class="ri-actions">
        <button type="button" class="btn secondary" id="riParseBtn">حلّل وأضف للمسودة</button>
        <button type="button" class="btn ghost" id="riClearBtn">امسح المسودة</button>
        <button type="button" class="btn ghost" id="riPromptBtn">${ICONS.clipboard} انسخ طلب البحث</button>
      </div>
      <p class="ri-help">بديل: افتح ChatGPT أو Claude، الصق «طلب البحث»، انسخ الجواب، وارجع الصقه هنا. <strong>الذكاء الاصطناعي قد يخطئ أو يفوّته مباراة، راجع المصدر.</strong></p>
      <div id="riMsg" class="ri-msg" role="status"></div>
      <div id="riReport"></div>
      <div id="riDraft"></div>
      <details id="riIgnoredBox" class="ri-ignored" hidden><summary id="riIgnoredTitle"></summary><div id="riIgnoredList"></div></details>
      <div class="ri-actions"><button type="button" class="btn" id="riApplyBtn" disabled>اعتمد وعبّئ النموذج</button></div>
      <div id="pasteImportResult" class="ri-result"></div>
    </div>
  </div>`;
}

// تاريخ ISO بتوقيت الرياض (UTC+3 بلا توقيت صيفي)
function _riIsoRiyadh(ts){ return new Date(Number(ts) + 3 * 3600000).toISOString().slice(0, 10); }
function _riAddDays(iso, n){ const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); }

function _riPeriod(){
  const s = document.getElementById('riStart'), e = document.getElementById('riEnd');
  return {start: s ? s.value : '', end: e ? e.value : ''};
}

function riInitPanel(){
  const s = document.getElementById('riStart'), e = document.getElementById('riEnd');
  if(!s || s.value) { riRenderLinks(); return; }
  const last = DATA.rounds && DATA.rounds.length ? DATA.rounds[DATA.rounds.length - 1] : null;
  const base = last && last.lastModified ? _riIsoRiyadh(last.lastModified) : _riIsoRiyadh(Date.now());
  s.value = base; e.value = _riAddDays(base, 7);
  riRenderLinks();
}

function riRenderLinks(){
  const box = document.getElementById('riLinks'), en = document.getElementById('riEnLinks');
  if(!box) return;
  const {start, end} = _riPeriod();
  const days = resultsDaysInPeriod(start, end);
  const a = (href, text) => `<a class="btn ghost ri-link" href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  box.innerHTML = days.length
    ? days.map(d => a(resultsLinkForDate(d), `افتح 365Scores · ${formatDate(d, {style: 'short'})}`)).join('') + a(RESULTS_LINK_YESTERDAY, 'نتائج أمس')
    : '<span class="ri-hint">حدّد بداية الفترة ونهايتها (حتى ' + formatCount(RESULTS_MAX_DAYS, 'يوم') + ') لتظهر الروابط</span>';
  if(en) en.innerHTML = days.map(d => `<a href="${resultsLinkForDate(d, 'en')}" target="_blank" rel="noopener noreferrer">${formatDate(d, {style: 'short'})}</a>`).join(' · ') || 'الصفحة الإنجليزية';
}

function riRenderDraft(){
  const box = document.getElementById('riDraft'), rep = document.getElementById('riReport'), apply = document.getElementById('riApplyBtn');
  if(!box) return;
  const v = validateDraft(_riDraft, _riPeriod());
  const warnRows = Object.keys(v.byRow).filter(k => k !== '-1' && v.byRow[k].some(x => x.level === 'warn')).length;
  const okRows = _riDraft.length - warnRows;
  rep.innerHTML = _riDraft.length ? `<div class="ri-summary">
      <span class="ri-ok">${ICONS.check} سليم: ${formatCount(okRows, 'سطر')}</span>
      <span class="ri-warn">${ICONS.warning} للمراجعة: ${formatCount(v.issues.filter(x => x.level === 'warn').length, 'تنبيه')}</span>
    </div>
    <ul class="ri-issues">${v.issues.filter(x => x.level === 'warn' || x.row === -1).map(x => `<li class="ri-warn">${ICONS.warning} ${escapeHtml(x.text)}</li>`).join('')}</ul>` : '';
  const statusOpts = (cur) => [['played', 'لُعبت'], ['not_played', 'لم يلعب'], ['postponed', 'مؤجلة']].map(([k, t]) => `<option value="${k}" ${cur === k ? 'selected' : ''}>${t}</option>`).join('');
  box.innerHTML = _riDraft.length ? `<datalist id="riClubs">${CLUBS.map(c => `<option value="${escapeHtml(c)}"></option>`).join('')}</datalist>
    <div class="ri-table" role="table">
    <div class="ri-row ri-head" role="row"><span>النادي</span><span>الخصم</span><span>له</span><span>عليه</span><span>التاريخ</span><span>الحالة</span><span></span></div>
    ${_riDraft.map((r, i) => {
      const bad = (v.byRow[i] || []).some(x => x.level === 'warn');
      return `<div class="ri-row${bad ? ' ri-row-warn' : ''}" role="row" data-i="${i}">
        <span class="ri-club">${crestHTML(r.club, 20)}<b>${escapeHtml(r.club)}</b></span>
        <input class="ri-f" data-f="opp" list="riClubs" value="${escapeHtml(r.opp)}" aria-label="الخصم">
        <input class="ri-f ri-n" data-f="gf" type="number" min="0" value="${r.gf === null ? '' : r.gf}" ${r.status === 'played' ? '' : 'disabled'} aria-label="له">
        <input class="ri-f ri-n" data-f="ga" type="number" min="0" value="${r.ga === null ? '' : r.ga}" ${r.status === 'played' ? '' : 'disabled'} aria-label="عليه">
        <input class="ri-f" data-f="date" type="date" value="${r.date || ''}" aria-label="التاريخ">
        <select class="ri-f" data-f="status" aria-label="الحالة">${statusOpts(r.status)}</select>
        <span class="ri-ctl"><button type="button" class="btn ghost ri-swap" data-i="${i}" title="عكس النتيجة">عكس</button><button type="button" class="btn ghost ri-del" data-i="${i}" aria-label="حذف السطر">${ICONS.close}</button>${/^https?:\/\//.test(r.source || '') ? `<a class="ri-src" href="${escapeHtml(r.source)}" target="_blank" rel="noopener noreferrer">المصدر</a>` : ''}</span>
      </div>`;
    }).join('')}</div>` : '';
  apply.disabled = !_riDraft.length;
  const ib = document.getElementById('riIgnoredBox'), it = document.getElementById('riIgnoredTitle'), il = document.getElementById('riIgnoredList');
  const ignoredAll = _riIgnored.length + _riUnknown.length;
  ib.hidden = !ignoredAll;
  if(ignoredAll){
    it.textContent = `تم تجاهلها (${formatCount(_riIgnored.length, 'مباراة')}${_riUnknown.length ? ' و' + formatCount(_riUnknown.length, 'سطر') + ' لم يُفهم' : ''})`;
    il.innerHTML = '<ul>' + _riIgnored.map((x, i) => `<li>${escapeHtml(x.text)} <span class="ri-why">${escapeHtml(x.reason)}${x.league ? ' · ' + escapeHtml(x.league) : ''}</span>${x.unknownLeague ? ` <button type="button" class="btn ghost ri-accept" data-i="${i}">اعتبرها دوريًا</button>` : ''}</li>`).join('')
      + _riUnknown.map(l => `<li>${escapeHtml(l)} <span class="ri-why">لم يُفهم</span></li>`).join('') + '</ul>';
  }
}

function riParse(){
  const input = document.getElementById('pasteImportInput'), msg = document.getElementById('riMsg');
  const text = input ? input.value : '';
  if(!text.trim()){ msg.innerHTML = '<div class="status-msg err">الصق نصًا أولًا.</div>'; return; }
  const p = _riPeriod(), pd = document.getElementById('riPasteDate');
  const year = p.start ? Number(p.start.slice(0, 4)) : undefined;
  const r = parseResults(text, {year, date: pd && pd.value ? pd.value : null});
  // التراكم: صف جديد بنفس (النادي، الخصم، النتيجة، التاريخ) لا يتكرر
  const key = x => [x.club, arNormalize(x.opp), x.gf, x.ga, x.date, x.status].join('|');
  const have = new Set(_riDraft.map(key));
  const added = r.rows.filter(x => !have.has(key(x)));
  _riDraft = _riDraft.concat(added);
  _riIgnored = _riIgnored.concat(r.ignored);
  _riUnknown = _riUnknown.concat(r.unknown);
  if(r.stats.likelyTranslated) msg.innerHTML = '<div class="status-msg err">لم أتعرّف على أسماء الفرق؛ تأكد أن ترجمة المتصفح مطفأة، أو جرّب الصفحة الإنجليزية.</div>';
  else if(!added.length) msg.innerHTML = '<div class="status-msg err">لم أجد مباراة لأي من الأندية بهذا النص.</div>';
  else msg.innerHTML = `<div class="status-msg ok">أُضيف إلى المسودة ${formatCount(added.length, 'سطر')}. راجعها ثم اعتمدها.</div>`;
  input.value = '';
  riRenderDraft();
}

function riCopyText(text, okMsg){
  const msg = document.getElementById('riMsg');
  navigator.clipboard.writeText(text).then(() => { msg.innerHTML = `<div class="status-msg ok">${okMsg}</div>`; }).catch(() => {
    msg.innerHTML = `<textarea class="ri-input" id="riFallback" rows="8" readonly>${escapeHtml(text)}</textarea><div class="status-msg ok">حدّد النص وانسخه يدويًا</div>`;
    const ta = document.getElementById('riFallback'); if(ta) ta.select();
  });
}

document.addEventListener('click', e => {
  const t = e.target.closest('#togglePasteImportBtn, #riParseBtn, #riClearBtn, #riPromptBtn, #riApplyBtn, .ri-swap, .ri-del, .ri-accept');
  if(!t) return;
  if(t.id === 'togglePasteImportBtn'){
    const panel = document.getElementById('pasteImportPanel');
    if(panel){ panel.hidden = !panel.hidden; if(!panel.hidden) riInitPanel(); }
  } else if(t.id === 'riParseBtn') riParse();
  else if(t.id === 'riClearBtn'){ _riDraft = []; _riIgnored = []; _riUnknown = []; document.getElementById('riMsg').innerHTML = ''; document.getElementById('pasteImportResult').innerHTML = ''; riRenderDraft(); }
  else if(t.id === 'riPromptBtn'){
    const p = _riPeriod();
    if(!resultsDaysInPeriod(p.start, p.end).length){ document.getElementById('riMsg').innerHTML = '<div class="status-msg err">حدّد بداية الفترة ونهايتها أولًا.</div>'; return; }
    riCopyText(buildSearchPrompt(p), 'تم نسخ طلب البحث. الصقه في ChatGPT أو Claude، ثم انسخ الجواب وارجع الصقه هنا.');
  } else if(t.id === 'riApplyBtn'){
    if(!_riDraft.length) return;
    const applied = applyParsedResultsToForm(draftToParsed(_riDraft));
    const box = document.getElementById('pasteImportResult');
    box.innerHTML = applied.length
      ? `<div class="status-msg ok">تمت تعبئة ${formatCount(applied.length, 'نادٍ')} في النموذج: ${applied.map(escapeHtml).join('، ')}. لم يُحفظ شيء بعد: راجع الحقول ثم اضغط «حفظ الجولة».</div>`
      : '<div class="status-msg err">لم يُعبَّأ أي نادٍ (تأكد أن النموذج مفتوح لجولة).</div>';
  } else if(t.classList.contains('ri-swap')){ const i = Number(t.dataset.i); _riDraft[i] = resultsSwapRow(_riDraft[i]); riRenderDraft(); }
  else if(t.classList.contains('ri-del')){ _riDraft.splice(Number(t.dataset.i), 1); riRenderDraft(); }
  else if(t.classList.contains('ri-accept')){
    const x = _riIgnored[Number(t.dataset.i)];
    if(x && x.match){
      const m = x.match, st = m.status === 'not_started' ? 'not_played' : (m.status === 'postponed' ? 'postponed' : 'played');
      _riDraft.push({club: m.club, opp: m.opp || '', oppKnown: !m.opp || CLUBS.includes(m.opp), gf: st === 'played' ? m.gf : null, ga: st === 'played' ? m.ga : null, date: m.date, status: st, source: '', note: 'قُبلت يدويًا (' + (x.league || '') + ')', src: '365', league: x.league || ''});
      _riIgnored.splice(Number(t.dataset.i), 1);
      riRenderDraft();
    }
  }
});

// تعديل حقول المسودة مباشرة + تغيّر الفترة (يحدّث الروابط والفحص)
document.addEventListener('change', e => {
  const f = e.target.closest('.ri-f');
  if(f){
    const row = f.closest('.ri-row'); const i = Number(row.dataset.i), k = f.dataset.f, r = _riDraft[i];
    if(!r) return;
    if(k === 'gf' || k === 'ga') r[k] = f.value === '' ? null : Number(f.value);
    else if(k === 'status'){ r.status = f.value; if(r.status !== 'played'){ r.gf = null; r.ga = null; } }
    else if(k === 'opp'){ r.opp = f.value.trim(); r.oppKnown = !r.opp || CLUBS.includes(r.opp); }
    else if(k === 'date') r.date = f.value || null;
    riRenderDraft();
    return;
  }
  if(e.target.id === 'riStart' || e.target.id === 'riEnd'){ riRenderLinks(); if(_riDraft.length) riRenderDraft(); }
});
