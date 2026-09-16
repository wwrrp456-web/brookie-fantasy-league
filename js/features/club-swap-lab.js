/* مختبر سيناريوهات تبديل الأندية (ميزة 12 من حزمة العمق التنافسي —
 * أُضيفت 15 سبتمبر 2026). مختلفة عمدًا عن renderScenario() (منزلق نقاط
 * المتصدر بـrounds-tab.js) وrenderWhatIf()/calcWhatIf() (إضافة نقاط
 * افتراضية بـstats-tab.js/insights-engine.js) — هذي تحديدًا: "لو كان
 * عند فلان نادي X بدل نادي Y طول الموسم، وين كان يكون ترتيبه؟" بإعادة
 * حساب نتائج نادي X الفعلية (لو كان مملوكًا لأحد أصلًا) جولة بجولة محل
 * نتائج ناديه الحالي، ثم إعادة حساب الترتيب العام بالكامل بهذا التبديل.
 * للعرض فقط (سيناريو افتراضي بالمتصفح)، لا تكتب أي بيانات ولا تُغيّر
 * DATA.rounds الحقيقية إطلاقًا.
 */

// نتائج نادٍ معيّن مفهرَسة برقم الجولة — يحتاجها التبديل عشان يعرف بالضبط
// أي جولة يُستبدل نتيجتها (بعكس getClubRoundResults التي تُرجع مصفوفة مسطّحة
// بلا أرقام جولات، وتكفي لإحصاءات الأندية العامة لكن لا تكفي هنا).
function getClubRoundResultsByRoundNumber(clubName){
  const owner = PARTICIPANTS.find(p=> p.teams.includes(clubName));
  if(!owner) return {};
  const idx = owner.teams.indexOf(clubName);
  const map = {};
  DATA.rounds.forEach(r=>{
    const entries = (r.entries && r.entries[owner.id]) || [];
    const es = getTeamRoundEntries(entries, idx);
    if(es.length) map[r.number] = es;
  });
  return map;
}

// يحسب الترتيب الكامل بعد تبديل نادي oldClub (من أندية pid الحالية) بنادي
// newClub — أي نادٍ آخر بالموسم، حتى لو غير مملوك لأحد (عندها نتائجه
// الفرضية = صفر لكل الجولات، بوضوح بالنتيجة).
function simulateClubSwap(pid, oldClub, newClub){
  const p = PARTICIPANTS.find(x=>x.id===pid);
  if(!p) return null;
  const idx = p.teams.indexOf(oldClub);
  if(idx === -1) return null;

  const newClubByRound = getClubRoundResultsByRoundNumber(newClub);

  // computeRoundStats يجمع كل عناصر entries[pid] بلا اعتبار لترتيبها أو
  // وسم .ti (يجمع points/gf/ga لكل عنصر بالمصفوفة مهما كان)، فيكفي هنا:
  // نطرح بالضبط عناصر oldClub الحقيقية (عبر getTeamRoundEntries التي تتعامل
  // صح مع الشكلين القديم والموسوم بـti) ونضيف عناصر newClub لنفس الجولة —
  // بلا حاجة لأي محاذاة بالموضع.
  const simulatedRounds = DATA.rounds.map(r=>{
    const realEntries = (r.entries && r.entries[pid]) || [];
    const oldClubEntries = getTeamRoundEntries(realEntries, idx);
    const otherEntries = realEntries.filter(e=> !oldClubEntries.includes(e));
    const newMatches = newClubByRound[r.number] || [];
    const finalEntries = otherEntries.concat(newMatches);
    return {...r, entries: {...r.entries, [pid]: finalEntries}};
  });

  const origDataRounds = DATA.rounds;
  DATA.rounds = simulatedRounds;
  let simulatedStandings;
  try{
    simulatedStandings = computeStandings();
  } finally {
    DATA.rounds = origDataRounds;
  }

  const realStandings = computeStandings();
  const realRank = realStandings.findIndex(s=>s.id===pid) + 1;
  const realTotal = (realStandings.find(s=>s.id===pid)||{}).total || 0;
  const simRank = simulatedStandings.findIndex(s=>s.id===pid) + 1;
  const simTotal = (simulatedStandings.find(s=>s.id===pid)||{}).total || 0;

  return {realRank, realTotal, simRank, simTotal, rankDelta: realRank - simRank, totalDelta: simTotal - realTotal};
}

function renderClubSwapLab(){
  const box = document.getElementById('clubSwapLabBox');
  if(!box) return;
  if(DATA.clubSwapLabEnabled === false){ box.innerHTML=''; return; }
  if(!DATA.rounds.length){ box.innerHTML=''; return; }

  const pOpts = PARTICIPANTS.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
  box.innerHTML = `<h2 class="section-title" style="margin-top:22px;">🔬 مختبر سيناريوهات تبديل الأندية</h2>
    <div class="club-swap-card">
      <p class="rounds-subtitle" style="margin-top:0;">لو كان عند مشارك نادٍ غير ناديه الحالي طول الموسم، وين كان يكون ترتيبه؟</p>
      <div class="club-swap-controls">
        <select id="clubSwapParticipantSelect">${pOpts}</select>
        <select id="clubSwapOldClubSelect"></select>
        <span class="club-swap-arrow">⇄</span>
        <select id="clubSwapNewClubSelect">${CLUBS.map(c=>`<option value="${c}">${c}</option>`).join('')}</select>
        <button type="button" class="btn secondary" id="runClubSwapBtn">شغّل السيناريو 🔬</button>
      </div>
      <div id="clubSwapResultBox"></div>
    </div>`;

  function refreshOldClubOptions(){
    const pid = Number(document.getElementById('clubSwapParticipantSelect').value);
    const p = PARTICIPANTS.find(x=>x.id===pid);
    const sel = document.getElementById('clubSwapOldClubSelect');
    if(sel && p) sel.innerHTML = p.teams.map(t=>`<option value="${t}">${t}</option>`).join('');
  }
  refreshOldClubOptions();
  document.getElementById('clubSwapParticipantSelect').addEventListener('change', refreshOldClubOptions);

  document.getElementById('runClubSwapBtn').addEventListener('click', ()=>{
    const pid = Number(document.getElementById('clubSwapParticipantSelect').value);
    const oldClub = document.getElementById('clubSwapOldClubSelect').value;
    const newClub = document.getElementById('clubSwapNewClubSelect').value;
    const resBox = document.getElementById('clubSwapResultBox');
    if(oldClub === newClub){
      resBox.innerHTML = '<div class="status-msg err">اختر ناديًا مختلفًا عن الحالي.</div>';
      return;
    }
    const r = simulateClubSwap(pid, oldClub, newClub);
    if(!r){ resBox.innerHTML = '<div class="status-msg err">تعذّر حساب السيناريو.</div>'; return; }
    const pName = PARTICIPANTS.find(x=>x.id===pid).name;
    const rankArrow = r.rankDelta > 0 ? `📈 يتقدّم ${r.rankDelta} مركز` : r.rankDelta < 0 ? `📉 يتراجع ${Math.abs(r.rankDelta)} مركز` : '📊 نفس المركز';
    const ptsArrow = r.totalDelta > 0 ? `+${r.totalDelta}` : `${r.totalDelta}`;
    resBox.innerHTML = `<div class="club-swap-result">
      <div class="club-swap-result-row"><span>ترتيبه الحقيقي:</span><strong>#${r.realRank} — ${r.realTotal} نقطة</strong></div>
      <div class="club-swap-result-row"><span>ترتيبه لو كان عنده ${newClub} بدل ${oldClub}:</span><strong>#${r.simRank} — ${r.simTotal} نقطة (${ptsArrow})</strong></div>
      <div class="club-swap-result-summary">${pName}: ${rankArrow}</div>
    </div>`;
  });
}
