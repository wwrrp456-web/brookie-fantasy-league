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

  let html = `<h2 class="section-title" style="margin-top:22px;">🔥❄️ سلاسل الحظ</h2>
    <div class="streaks-grid">`;
  streaks.forEach(s=>{
    const isHot = s.type === 'hot';
    html += `<div class="streak-card ${isHot?'streak-hot':'streak-cold'}">
      <span class="streak-icon">${isHot?'🔥':'❄️'}</span>
      <span class="streak-name">${s.name}</span>
      <span class="streak-count">${s.count} ${isHot?'جولات ساخنة متتالية':'جولات باردة متتالية'}</span>
    </div>`;
  });
  html += `</div>`;
  box.innerHTML = html;
}
