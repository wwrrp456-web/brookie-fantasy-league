/* جدول الترتيب + قصة الجولة + ملخص واتساب + ملخص التحديث الذكي */

function movementHTML(delta){
  if(delta === undefined || delta === 0) return '<span class="mv mv-same">—</span>';
  if(delta > 0) return `<span class="mv mv-up">▲${delta}</span>`;
  return `<span class="mv mv-down">▼${Math.abs(delta)}</span>`;
}

// ---------- ملخص الواتساب ----------
// قصة الجولة التلقائية: فقرة عربية قصيرة مبنية بالكامل من بيانات محسوبة —
// تتحدّث تحديدًا عن **جدول الترتيب العام** (الصدارة، الفارق، حركة المراكز
// بنفس الجدول) لا عن ترتيب الجولة نفسها أو بطلها، لأن ملخصات أخرى بنفس
// الرسالة (سطر "👑 بطل الجولة" وقائمة الجولة بالأسفل) تغطي تلك الزاوية أصلاً.
// (أُعيد توجيهها 10 سبتمبر 2026 بطلب المستخدم — كانت تتكلم عن بطل الجولة
// والممات بدل جدول الترتيب).
function buildRoundStory(){
  const st = computeStandings();
  if(!st.length) return '';
  const mv = getMovements();
  const rn = getCurrentRoundNumber();

  const leader = st[0];
  const chaser = st[1];
  const gap = chaser ? (leader.total - chaser.total) : null;

  const parts = [];
  let opener = `بعد الجولة ${rn}، *${leader.name}* يتصدّر جدول الترتيب العام برصيد ${leader.total} نقطة`;
  if(gap !== null){
    opener += gap > 0 ? ` بفارق ${gap} نقطة عن ${chaser.name}` : ` بتعادل النقاط مع ${chaser.name}`;
  }
  parts.push(opener + '.');

  // يجمع كل الأسماء المتعادلة على نفس القفزة/التراجع (نفس إصلاح computeBadges
  // أعلاه) بدل الاحتفاظ باسم واحد فقط عند تعادل حقيقي.
  let topClimberNames = [], topClimberVal = 0;
  let topDropperNames = [], topDropperVal = 0;
  PARTICIPANTS.forEach(p=>{
    const v = mv[p.id]||0;
    if(v > topClimberVal){ topClimberVal = v; topClimberNames = [p.name]; }
    else if(v === topClimberVal && v > 0){ topClimberNames.push(p.name); }
    if(v < topDropperVal){ topDropperVal = v; topDropperNames = [p.name]; }
    else if(v === topDropperVal && v < 0){ topDropperNames.push(p.name); }
  });

  if(topClimberNames.length && topClimberVal >= 2){
    const climberLabel = topClimberNames.length<=3 ? topClimberNames.join('، ') : `${topClimberNames.length} مشاركين`;
    parts.push(`${climberLabel} كان الأكثر صعودًا بجدول الترتيب بقفزة ${topClimberVal} مراكز دفعة واحدة.`);
  }

  if(topDropperNames.length && Math.abs(topDropperVal) >= 2){
    const dropperLabel = topDropperNames.length<=3 ? topDropperNames.join('، ') : `${topDropperNames.length} مشاركين`;
    parts.push(`بالمقابل، ${dropperLabel} تراجع ${Math.abs(topDropperVal)} مراكز بنفس الجدول.`);
  }

  if(!topClimberNames.length && !topDropperNames.length){
    parts.push('جدول الترتيب العام لم يشهد أي تغيّر كبير بالمراكز هذه الجولة.');
  }

  return parts.join(' ');
}

function buildWhatsAppSummary(){
  const st = computeStandings();
  const mv = getMovements();
  const rn = getCurrentRoundNumber();
  const roundPoints = getCurrentRoundPointsMap();
  const medals = ['🥇','🥈','🥉'];
  let t = `🏆 *دوري بروكي الفانتازي — الموسم الثاني*\n`;
  t += `📅 تحديث بعد الجولة ${rn}\n`;
  const story = buildRoundStory();
  if(story){
    t += `━━━━━━━━━━━━━━\n`;
    t += `📝 ${story}\n`;
  }
  t += `━━━━━━━━━━━━━━\n`;
  t += `📊 *الإجمالي* = مجموع النقاط التراكمي منذ بداية الموسم\n`;
  t += `➕ (بين قوسين) = نقاط هذه الجولة بس\n`;
  t += `▲▼ = حركة المركز عن الجولة السابقة\n`;
  t += `━━━━━━━━━━━━━━\n`;
  st.forEach((s,i)=>{
    const m = medals[i] || `${i+1}.`;
    const d = mv[s.id];
    const arrow = (d===undefined||d===0) ? '' : (d>0 ? ` ▲${d}` : ` ▼${Math.abs(d)}`);
    const rp = roundPoints[s.id];
    const gained = rp>0 ? ` (+${rp})` : ' (ممة 💀)';
    t += `${m} ${s.name} — *${s.total}*${gained}${arrow}\n`;
  });
  t += `━━━━━━━━━━━━━━\n`;
  const h = getRoundHeroes();
  if(h) t += `👑 بطل الجولة: *${h.top.name}* بـ ${h.top.points} نقطة${h.top.tieBreak ? ' (بعد كسر تعادل)' : ''}\n`;
  t += `⚽ فوز=3 · تعادل=1 · خسارة=0`;
  return t;
}

function renderCopyBox(){
  const box = document.getElementById('copyBox');
  const text = buildWhatsAppSummary();
  box.innerHTML = `
    <textarea class="copy-area" id="summaryArea" readonly>${text}</textarea>
    <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
      <button class="btn" id="doCopyBtn">نسخ النص</button>
      <button class="btn secondary" id="waShareBtn">📤 شارك في واتساب مباشرة</button>
      <button class="btn ghost" id="closeCopyBtn">إغلاق</button>
    </div>
    <div id="copyMsg"></div>`;
  document.getElementById('doCopyBtn').onclick = async ()=>{
    const ta = document.getElementById('summaryArea');
    try{
      await navigator.clipboard.writeText(ta.value);
      document.getElementById('copyMsg').innerHTML = '<div class="status-msg ok">تم النسخ ✅ الصقه في الجروب</div>';
    }catch(e){
      ta.select();
      document.getElementById('copyMsg').innerHTML = '<div class="status-msg ok">حدّد النص واضغط نسخ يدوياً</div>';
    }
  };
  // فتح واتساب مباشرة والنص جاهز بالداخل — يفتح تطبيق واتساب على الجوال
  // (تختار أنت الجروب) أو واتساب ويب على الكمبيوتر، بدل نسخ النص يدويًا.
  document.getElementById('waShareBtn').onclick = ()=>{
    const ta = document.getElementById('summaryArea');
    const url = 'https://wa.me/?text=' + encodeURIComponent(ta.value);
    window.open(url, '_blank');
  };
  document.getElementById('closeCopyBtn').onclick = ()=>{ box.innerHTML=''; };
}

// ---------- ملخص ذكي بعد التحديث + بانر جولة جديدة ----------
let _prevStandings = null;
let _prevRoundCount = null;
function capturePreRefreshState(){
  _prevStandings = computeStandings().map(s=>({id:s.id,name:s.name,total:s.total}));
  _prevRoundCount = DATA.rounds.length;
}
function renderRefreshSummary(){
  const box = document.getElementById('refreshSummaryBox');
  const bannerBox = document.getElementById('newRoundBannerBox');
  if(!box || !bannerBox) return;

  // بانر جولة جديدة
  if(_prevRoundCount !== null && DATA.rounds.length > _prevRoundCount){
    const newRound = getCurrentRoundNumber();
    bannerBox.innerHTML = `<div class="new-round-banner" onclick="this.parentElement.innerHTML=''">🎉 جولة ${newRound} أُضيفت! اضغط للإغلاق</div>`;
  } else {
    bannerBox.innerHTML = '';
  }

  // ملخص التغييرات
  if(!_prevStandings || !_prevStandings.length){ box.innerHTML=''; return; }
  const cur = computeStandings();
  const changes = [];
  cur.forEach((s,i)=>{
    const prev = _prevStandings.find(x=>x.id===s.id);
    if(!prev) return;
    const prevRank = _prevStandings.findIndex(x=>x.id===s.id)+1;
    const curRank = i+1;
    if(prevRank !== curRank){
      const dir = curRank < prevRank ? '🔼' : '🔽';
      changes.push(`${dir} <b>${s.name}</b>: من ${prevRank} إلى ${curRank}`);
    }
  });
  if(!changes.length){ box.innerHTML=''; return; }
  box.innerHTML = `
    <div class="refresh-summary">
      <div class="refresh-summary-title">📊 ما تغيّر بعد التحديث</div>
      ${changes.map(c=>`<div class="refresh-summary-row">${c}</div>`).join('')}
    </div>`;
}

// ---------- التحليل الذكي (ميزة 8) ----------
function buildSmartProfile(pid){
  const hist=buildParticipantHistory(pid);
  if(!hist.length) return '';
  const pts=hist.map(h=>h.points);
  const avg=pts.reduce((a,b)=>a+b,0)/pts.length;
  const std=Math.sqrt(pts.reduce((a,b)=>a+(b-avg)**2,0)/pts.length);
  const stands=DATA.rounds.map((_,i)=>{ const s=computeStandings(i+1); return s.findIndex(x=>x.id===pid)+1; });
  const avgRank=stands.reduce((a,b)=>a+b,0)/stands.length;
  const last3=stands.slice(-3);
  const trend=last3.length>=2?last3[last3.length-1]-last3[0]:0;
  let style='';
  if(std<1.5) style='🧱 المتسق — نقاطك منتظمة كالساعة';
  else if(std<3) style='🎯 المستقر — ثابت مع تذبذب بسيط';
  else if(std<5) style='🎢 المتقلب — إما قمة أو هاوية';
  else style='🌪️ الفوضوي — لا يمكن التنبؤ بأدائك!';
  let trendTxt='';
  if(trend< -1) trendTxt='📈 في صعود مؤخراً';
  else if(trend>1) trendTxt='📉 تراجع في الجولات الأخيرة';
  else trendTxt='➡️ مستقر في مركزه';
  let grade='';
  if(avgRank<=3) grade='🥇 نخبة — من أقوى المشاركين';
  else if(avgRank<=7) grade='💪 قوي — في النصف الأعلى باستمرار';
  else if(avgRank<=12) grade='🌊 وسط الميدان — مباراته مفتوحة';
  else grade='🔄 يبحث عن مستواه';
  return `<div style="font-size:0.84rem;line-height:1.85;color:var(--text2);">
    <span>${style}</span> &nbsp;·&nbsp; <span>${trendTxt}</span><br>
    <span style="color:var(--gold-light);">${grade}</span>
    <span style="color:var(--muted);font-size:0.78rem;margin-right:6px;">| معدل ${avg.toFixed(1)} | ثبات ±${std.toFixed(1)}</span>
  </div>`;
}

function renderSmartProfile(){
  const box=document.getElementById('smartProfileBox');
  if(!box) return;
  if(DATA.rounds.length<3){box.innerHTML='';return;}
  const stands=computeStandings();
  box.innerHTML=`<h2 class="section-title" style="margin-top:22px;">🧠 التحليل الذكي</h2>
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${stands.map((s,i)=>{
        const p=PARTICIPANTS.find(x=>x.id===s.id);
        const pc=PARTICIPANT_COLORS[s.id]||'var(--gold)';
        return `<div style="background:var(--paper);border-radius:12px;padding:13px 14px;border-right:3px solid ${pc};">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <span style="font-weight:800;color:${pc};">#${i+1}</span>
            <span style="font-weight:700;">${p?.name||''}</span>
            <span style="color:var(--muted);font-size:0.8rem;">${s.total} نقطة</span>
          </div>
          ${buildSmartProfile(s.id)}
        </div>`;
      }).join('')}
    </div>`;
}

function renderStandings(){
  const box = document.getElementById('standingsBox');
  const standings = computeStandings();
  const hasRounds = DATA.rounds.length > 0;
  const mv = getMovements();

  // إعادة ترتيب صفوف الجدول بالحركة (ميزة 14 من حزمة UX/الشكل — أُضيفت 15
  // سبتمبر 2026): نلتقط موضع كل صف الحالي (بمعرّف المشارك) قبل إعادة البناء،
  // ثم بعد استبدال innerHTML نطبّق تقنية FLIP (نبدأ الصف بمكانه القديم عبر
  // transform ثم نُزيله بانتقال سلس) بدل قفزة صفوف الجدول فجأة لمواضعها
  // الجديدة. يُحترَم prefers-reduced-motion ومفتاح إظهار/إخفاء بلوحة المنظم.
  const animEnabled = DATA.standingsAnimationEnabled !== false
    && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const oldRects = {};
  if(animEnabled && box){
    box.querySelectorAll('tr.standings-row[data-pid]').forEach(tr=>{
      oldRects[tr.dataset.pid] = tr.getBoundingClientRect();
    });
  }

  let html = '<div style="overflow-x:auto;-webkit-overflow-scrolling:touch;">';
  html += `<table class="league-table">
    <thead><tr>
      <th style="width:34px;">#</th>
      <th style="width:30px;">±</th>
      <th class="col-team">اللاعب</th>
      <th>الجولة</th>
      <th>ممة</th>
      <th>جديد</th>
      <th>نقاط</th>
      <th style="width:30px;"></th>
    </tr></thead><tbody>`;

  standings.forEach((s,i)=>{
    const p = PARTICIPANTS.find(x=>x.id===s.id);
    const pos = i+1;
    let tier = '';
    if(pos<=3) tier='tier-gold';
    else if(pos<=6) tier='tier-silver';
    else if(pos>standings.length-3) tier='tier-danger';

    const clubs = p.teams.map(t=>clubCrestSVG(t, 19)).join('');

    const meCls = (MY_ID === s.id) ? 'is-me' : '';
    html += `<tr class="standings-row ${tier} ${i%2?'zebra':''} ${meCls}" data-pid="${s.id}">
      <td class="pos-cell">${pos}</td>
      <td>${movementHTML(mv[s.id])}</td>
      <td class="team-cell">
        <div>
          <div class="team-cell-name">${s.name}${championBadgeHTML(s.id)}<span class="name-reaction-slot" data-pid="${s.id}"></span></div>
          ${championDefensePathHTML(s.id)}
          <div class="team-cell-clubs">${clubs}</div>
        </div>
      </td>
      <td class="stat-dim">${getCurrentRoundNumber()}</td>
      <td class="stat-dim">${s.mummaCount}</td>
      <td class="stat-new ${s.newPoints===0?'zero':''}">${s.newPoints>0?'+':''}${s.newPoints}</td>
      <td class="stat-strong">${s.total}</td>
      <td><button class="detail-toggle" onclick="toggleExpand(${s.id})" aria-label="تفاصيل ${s.name}">▾</button></td>
    </tr>
    <tr class="detail-row" id="expand-${s.id}" style="display:none;">
      <td colspan="8">
        <div class="detail-inner">
          ${(()=>{
            const hist = buildParticipantHistory(s.id);
            const last5 = hist.slice(-5);
            if(!last5.length) return '';
            const mx = Math.max(...hist.map(h=>h.points));
            const pills = last5.map(h=>{
              let cls = h.points===0 ? 'mumma' : h.points===mx ? 'hi' : '';
              return `<div class="quick-hist-pill ${cls}" title="الجولة ${h.number}">${h.points}</div>`;
            }).join('');
            const avg = hist.length ? Math.round(hist.reduce((a,h)=>a+h.points,0)/hist.length*10)/10 : 0;
            return `<div>
              <div class="quick-hist-mini-label">آخر ${last5.length} جولات | معدل الموسم: ${avg}</div>
              <div class="quick-hist">${pills}</div>
            </div>`;
          })()}
          <div class="detail-clubs">${p.teams.map(t=>`
            <details class="club-toggle">
              <summary>${clubBadgeHTML(t,'sm')}</summary>
              <div class="club-toggle-stats">${clubPlayLine(t)}</div>
            </details>`).join('')}</div>
          <table class="detail-table">
            <thead><tr><th>الجولة</th><th>نقاط الجولة</th><th>التراكمي</th></tr></thead>
            <tbody>
              ${JOINED_AFTER_ROUND1[s.id]
                ? `<tr><td>الجولة 1</td><td colspan="2" style="color:#8A8A8A;">لم يلتحق بعد بالمسابقة</td></tr>`
                : `<tr><td>الجولة 1</td><td>${(ROUND1_POINTS[s.id]||0)}</td><td>${(ROUND1_POINTS[s.id]||0)}</td></tr>`}
              ${JOINED_AFTER_ROUND2[s.id]
                ? `<tr><td>الجولة 2</td><td colspan="2" style="color:#8A8A8A;">لم يلتحق بعد بالمسابقة</td></tr>
                   <tr><td>الرصيد الافتتاحي</td><td>${s.carry}</td><td>${s.carry}</td></tr>`
                : `<tr><td>الجولة 2</td><td>${s.carry - (ROUND1_POINTS[s.id]||0)}</td><td>${s.carry}</td></tr>`}
              ${buildParticipantHistory(s.id).map(h=>`<tr><td>الجولة ${h.number}</td><td>${h.points}${h.points===0?' <span class="mumma">ممة</span>':''}</td><td>${s.carry + h.cumulative}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      </td>
    </tr>`;
  });

  html += '</tbody></table></div>';
  html += `<div class="table-legend">
    <div class="legend-item"><span class="legend-swatch" style="background:#16A6EA;"></span>مراكز الصدارة</div>
    <div class="legend-item"><span class="legend-swatch" style="background:#7A52EE;"></span>منطقة المطاردة</div>
    <div class="legend-item"><span class="legend-swatch" style="background:#FF4438;"></span>المراكز الأخيرة</div>
  </div>`;
  if(!hasRounds){
    html += '<p style="color:var(--muted);font-size:0.78rem;margin:10px 2px 0;">النقاط الحالية من كشف المطابقة المعتمد. عمود «جديد» يبدأ بالتحرك مع أول جولة تُسجَّل.</p>';
  }
  box.innerHTML = html;

  if(animEnabled && Object.keys(oldRects).length){
    // بعض بيئات الاختبار (jsdom) لا تنفّذ requestAnimationFrame — نتراجع
    // لـsetTimeout بمهلة تقارب إطار شاشة واحد بدل رمي استثناء يوقف renderStandings.
    const raf = (typeof requestAnimationFrame === 'function') ? requestAnimationFrame : (cb=>setTimeout(cb,16));
    raf(()=>{
      box.querySelectorAll('tr.standings-row[data-pid]').forEach(tr=>{
        const old = oldRects[tr.dataset.pid];
        if(!old) return; // مشارك جديد بلا موضع سابق — يظهر بمكانه مباشرة بلا حركة
        const newRect = tr.getBoundingClientRect();
        const dy = old.top - newRect.top;
        if(Math.abs(dy) < 1) return;
        tr.style.transition = 'none';
        tr.style.transform = `translateY(${dy}px)`;
        raf(()=>{
          tr.style.transition = 'transform 0.4s ease';
          tr.style.transform = '';
          tr.addEventListener('transitionend', function cleanup(){
            tr.style.transition = '';
            tr.removeEventListener('transitionend', cleanup);
          });
        });
      });
    });
  }
}

// ---------- Refresh (manual re-read of all rounds & re-rank) ----------
document.getElementById('refreshBtn').addEventListener('click', async ()=>{
  const btn = document.getElementById('refreshBtn');
  const msg = document.getElementById('refreshMsg');
  btn.disabled = true;
  btn.textContent = '⏳ جارٍ التحديث...';
  capturePreRefreshState();
  try{
    await loadData();
    renderRefreshSummary();
    msg.innerHTML = '<div class="status-msg ok">تم تحديث ترتيب المتسابقين بأحدث نتائج الجولات ✅</div>';
  }catch(e){
    msg.innerHTML = '<div class="status-msg err">حدث خطأ أثناء التحديث، حاول مجددًا.</div>';
  }
  btn.disabled = false;
  btn.textContent = '🔄 تحديث';
  setTimeout(()=>{ msg.innerHTML=''; }, 3000);
});
