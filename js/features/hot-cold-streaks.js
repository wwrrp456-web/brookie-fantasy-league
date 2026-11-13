/* سلاسل الحظ الساخن/البارد (ميزة 10 من حزمة العمق التنافسي — أُضيفت
 * 15 سبتمبر 2026). مختلفة عن s.streak/bestStreak بـcomputeStandings
 * (تلك أطول سلسلة نقاط متتالية عبر كل التاريخ) — هذي "الحالة الآن":
 * كم جولة متتالية ينهيها المشارك بنقاط (ساخن 🔥) أو بصفر/ممة (بارد ❄️)
 * حتى آخر جولة فعلية مباشرة. للعرض فقط، لا تكتب أي بيانات.
 */

function computeCurrentStreaks(){
  const histMap = getAllParticipantsRoundsHistory();
  const result = [];
  PARTICIPANTS.forEach(p=>{
    const hist = histMap[p.id];
    if(!hist.length) return;
    let hot = 0, cold = 0;
    for(let i=hist.length-1; i>=0; i--){
      if(hist[i].points > 0){ if(cold>0) break; hot++; }
      else { if(hot>0) break; cold++; }
    }
    if(hot >= 2) result.push({id:p.id, name:p.name, type:'hot', count:hot});
    else if(cold >= 2) result.push({id:p.id, name:p.name, type:'cold', count:cold});
  });
  result.sort((a,b)=> b.count - a.count);
  return result;
}

function renderHotColdStreaks(){
  const box = document.getElementById('hotColdStreaksBox');
  if(!box) return;
  if(DATA.hotColdStreaksEnabled === false){ box.innerHTML=''; return; }

  const streaks = computeCurrentStreaks();
  if(!streaks.length){ box.innerHTML=''; return; }

  // تجميع حسب النوع وطول السلسلة: "17 مشاركًا على سلسلة جولتين" + أبرز 3 بالاسم (حسب مركزهم) (FR-18، U-09)
  const rank = {}; computeStandings().forEach((s, i) => { rank[s.id] = i; });
  const groups = {};
  streaks.forEach(s=>{
    const k = s.type + '|' + s.count;
    (groups[k] = groups[k] || {type: s.type, count: s.count, list: []}).list.push(s);
  });
  const ordered = Object.values(groups).sort((a,b)=> (a.type === b.type ? b.count - a.count : (a.type === 'hot' ? -1 : 1)));
  let html = '<h2 class="section-title" style="margin-top:22px;">🔥❄️ سلاسل الحظ</h2><div class="streak-groups">';
  ordered.forEach(g=>{
    const isHot = g.type === 'hot';
    const names = g.list.slice().sort((a,b)=> (rank[a.id] ?? 99) - (rank[b.id] ?? 99));
    const top = names.slice(0, 3).map(n=>`<span class="pill">${n.name}</span>`).join('');
    const more = names.length > 3 ? `<span class="pill pill-more">+${names.length - 3}</span>` : '';
    html += `<div class="streak-group ${isHot?'streak-hot':'streak-cold'}">
      <h3>${formatCount(g.list.length, 'مشارك')} على سلسلة ${formatCount(g.count, 'جولة', {case:'acc'})}</h3>
      <p class="muted">${isHot ? 'جولات متتالية بالنقاط' : 'جولات متتالية بلا نقاط'}</p>
      <div class="streak-names">${top}${more}</div>
    </div>`;
  });
  html += '</div>';
  box.innerHTML = html;
}
