/* تبويب المشاركين بالكامل + رابط مشارك مباشر + بحث المشاركين */

// ---------- رابط مباشر لكل مشارك (#participant-N) ----------
function handleParticipantHash(){
  const hash = window.location.hash;
  const m = hash.match(/^#participant-(\d+)$/);
  if(!m) return;
  const pid = Number(m[1]);
  if(!PARTICIPANTS.find(p=>p.id===pid)) return;
  // الانتقال لتبويب المشاركين
  document.querySelectorAll('nav.tabs button').forEach(b=>{
    b.classList.toggle('active', b.dataset.tab==='participants');
  });
  document.querySelectorAll('section.panel').forEach(p=>{
    p.classList.toggle('active', p.id==='panel-participants');
  });
  // فتح بروفايل المشارك (scroll into view)
  setTimeout(()=>{
    const card = document.getElementById(`participant-card-${pid}`);
    if(card){ card.scrollIntoView({behavior:'smooth',block:'center'}); card.style.outline='2px solid var(--gold)'; setTimeout(()=>card.style.outline='',2000); }
  }, 400);
}

function buildParticipantHistory(pid){
  const p = PARTICIPANTS.find(x=>x.id===pid);
  let cum = 0;
  return DATA.rounds.map(r=>{
    const stats = computeRoundStats(r);
    const s = stats[pid];
    cum += s.points;
    const entries = (r.entries && r.entries[pid]) || [];
    // نادٍ قد يلعب أكثر من مباراة بنفس الجولة (منذ 5 سبتمبر 2026) — results
    // تحمل كل نتائجه بدل نتيجة واحدة فقط؛ result تبقى للتوافق (أول نتيجة).
    const teamResults = p.teams.map((t,i)=>{
      const es = getTeamRoundEntries(entries, i);
      return {team:t, result: es.length?es[0].result:null, results: es.map(e=>e.result)};
    });
    return {number:r.number, points:s.points, cumulative:cum, teamResults};
  });
}

function renderParticipants(){
  const box = document.getElementById('participantsBox');
  const standings = computeStandings();
  const rankMap = {};
  standings.forEach((s, i) => {
    rankMap[s.id] = { rank: i+1, total: s.total, mummaCount: s.mummaCount, bestStreak: s.bestStreak, lastPoints: s.lastPoints };
  });
  const totalCount = standings.length;

  // حفظ وضع الفرز واستعادته بعد إعادة الرسم
  const sortMode = box.dataset.sortMode || 'rank';

  const sorted = [...PARTICIPANTS].sort((a, b) => {
    if(sortMode === 'alpha') return a.name.localeCompare(b.name, 'ar');
    if(sortMode === 'round') return (rankMap[b.id]?.lastPoints||0) - (rankMap[a.id]?.lastPoints||0);
    return (rankMap[a.id]?.rank||99) - (rankMap[b.id]?.rank||99);
  });

  const sortLabels = {rank:'🏆 بالترتيب', alpha:'🔤 بالاسم', round:'⚡ آخر جولة'};
  let html = `<div style="display:flex;gap:7px;margin-bottom:14px;">
    ${['rank','alpha','round'].map(mode => {
      const active = sortMode === mode;
      return `<button onclick="document.getElementById('participantsBox').dataset.sortMode='${mode}';renderParticipants();"
        style="flex:1;padding:8px 4px;border-radius:8px;border:1.5px solid ${active?'var(--gold)':'var(--line)'};
               background:${active?'var(--gold)':'var(--paper)'};color:${active?'#fff':'var(--text2)'};
               font-family:inherit;font-size:0.75rem;font-weight:800;cursor:pointer;transition:all 0.15s;">${sortLabels[mode]}</button>`;
    }).join('')}
  </div>`;

  sorted.forEach(p => {
    const s = rankMap[p.id] || {};
    const rank = s.rank !== undefined ? s.rank : '—';
    const total = s.total !== undefined ? s.total : '—';
    const mumma = s.mummaCount || 0;
    const bestStreak = s.bestStreak || 0;
    const lastPts = s.lastPoints;

    // لون شارة الترتيب
    const isTop = rank <= 3;
    const isDanger = typeof rank === 'number' && rank > totalCount - 3;
    const rankBg = rank === 1 ? 'var(--gold)' : isTop ? 'var(--sky)' : isDanger ? 'var(--coral)' : 'rgba(123,92,255,0.18)';
    const rankClr = (isTop || isDanger) ? '#fff' : 'var(--text2)';

    // sparkline — شريط نقاط كل جولة
    const history = buildParticipantHistory(p.id);
    const maxPts = history.length ? Math.max(...history.map(h=>h.points), 1) : 1;
    const sparkHTML = history.map(h => {
      const pct = h.points / maxPts;
      const barH = Math.max(6, Math.round(pct * 28) + 4);
      const barBg = h.points === 0 ? 'var(--coral)' :
                    pct >= 0.8 ? 'var(--gold)' :
                    pct >= 0.5 ? 'var(--sky)' : 'var(--muted)';
      return `<span title="ج${h.number}: ${h.points} نقطة"
        style="display:inline-flex;flex-direction:column;align-items:center;gap:2px;cursor:default;">
        <span style="display:block;width:20px;background:${barBg};border-radius:3px 3px 2px 2px;height:${barH}px;opacity:0.85;"></span>
        <span style="font-size:0.58rem;color:var(--muted);font-weight:700;line-height:1;">ج${h.number}</span>
      </span>`;
    }).join('');

    // إحصائيات سريعة
    const quickStats = [];
    if(mumma > 0) quickStats.push(`💀 ${mumma} ممة`);
    if(bestStreak >= 2) quickStats.push(`🔥 سلسلة ${bestStreak}`);
    if(mumma === 0 && history.length > 0) quickStats.push(`✅ بلا ممات`);
    // قسم تكريم البطل — ميزة 16: تنبيه لمن سجّل نقاط جولة أعلى من حامل اللقب
    if(CHAMPION_FEATURES.weekly_challenge_notice && CHAMPION_ID && p.id !== CHAMPION_ID && history.length > 0){
      const champInfo = rankMap[CHAMPION_ID];
      if(champInfo && (lastPts||0) > (champInfo.lastPoints||0)){
        quickStats.push(`<span class="weekly-beat-badge">🔥 تفوقت على حامل اللقب هالجولة</span>`);
      }
    }

    // آخر جولة
    const lastBadge = (lastPts !== undefined && history.length > 0)
      ? `<span style="font-size:0.72rem;color:var(--sky);font-weight:700;white-space:nowrap;">${lastPts>0?'+':''}${lastPts} آخر جولة</span>`
      : '';

    const pColor = PARTICIPANT_COLORS[p.id] || 'var(--gold)';
    const fingerprintHTML = buildFingerprintHTML(p.id);
    // قسم تكريم البطل — ميزة 3: كرت ذهبي مميّز للبطل الحالي بتبويب المشاركين
    const isGoldenChamp = CHAMPION_FEATURES.golden_card && CHAMPION_ID && p.id === CHAMPION_ID;
    html += `<div class="participant-card${isGoldenChamp ? ' champion-golden' : ''}" data-name="${p.name.toLowerCase()}" data-pid="${p.id}" id="participant-card-${p.id}" data-pcolor="${p.id}" style="--pcolor:${pColor};border-right:3px solid ${pColor};">
      <div style="display:flex;align-items:flex-start;gap:10px;">
        <div style="min-width:36px;height:36px;border-radius:9px;background:${rankBg};color:${rankClr};
                    font-size:0.95rem;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${rank}</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:baseline;justify-content:space-between;gap:6px;flex-wrap:wrap;margin-bottom:6px;">
            <span style="display:flex;align-items:center;gap:5px;font-size:0.98rem;font-weight:800;color:var(--text);">
              <span class="p-color-dot" style="background:${pColor};"></span>${p.name}
            </span>
            <span style="font-size:1rem;font-weight:900;color:var(--gold);">${total} نقطة ${lastBadge}</span>
          </div>
          <div class="teams-row" style="margin-bottom:${history.length?'10px':'6px'};">${p.teams.map(t=>clubBadgeHTML(t)).join('')}</div>
          ${history.length ? `<div style="display:flex;align-items:flex-end;gap:3px;margin-bottom:8px;">${sparkHTML}</div>` : ''}
          ${quickStats.length ? `<div style="display:flex;gap:10px;font-size:0.78rem;color:var(--muted);">${quickStats.map(x=>`<span>${x}</span>`).join('')}</div>` : ''}
          ${fingerprintHTML}
        </div>
      </div>
    </div>`;
  });

  box.innerHTML = html;
  box.dataset.sortMode = sortMode; // استعادة وضع الفرز بعد innerHTML

  // إعادة تطبيق البحث الحالي (إن وُجد) بعد أي إعادة رسم للقائمة
  const searchInput = document.getElementById('participantsSearchInput');
  if(searchInput && searchInput.value.trim()){
    searchInput.dispatchEvent(new Event('input'));
  }
}

// ---------- بحث سريع بالاسم في تبويب المشاركين ----------
document.getElementById('participantsSearchInput').addEventListener('input', (e)=>{
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll('#participantsBox .participant-card').forEach(card=>{
    const name = (card.dataset.name || '').toLowerCase();
    card.style.display = (!q || name.includes(q)) ? '' : 'none';
  });
});
