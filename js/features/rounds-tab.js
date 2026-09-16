/* الجولات 1/2/3+، الأرشيف، التعليقات، تحدي الجولة */

function roundTitlesHTML(titles){
  if(!titles || !titles.length) return '';
  let html = '<div class="round-titles-row">';
  titles.forEach(t=>{
    html += `<span class="round-title-chip">${t.icon} <b>${t.label}:</b> ${t.names.join(' و')} <span class="round-title-extra">(${t.extra})</span></span>`;
  });
  html += '</div>';
  return html;
}


// ---------- شريط أبطال الجولة ----------
function renderHeroes(){
  const box = document.getElementById('heroesBox');
  const h = getRoundHeroes();
  if(!h){ box.innerHTML=''; return; }
  let html = '<div class="heroes-strip">';
  html += `<div class="hero-card gold">
    <div class="hero-label">👑 بطل الجولة ${h.roundNumber}</div>
    <div class="hero-name">${h.top.name}</div>
    <div class="hero-sub">${h.top.points} نقطة${h.top.tieBreak ? ' <span title="حُسم بكسر تعادل: الأكثر أهدافًا ثم الأقل استقبالًا">(بعد كسر تعادل)</span>' : ''}</div>
  </div>`;
  html += `<div class="hero-card">
    <div class="hero-label">💀 ممات الجولة</div>
    <div class="hero-name">${h.mummat.length ? h.mummat.length + ' لاعب' : 'لا أحد'}</div>
    <div class="hero-sub">${h.mummat.length ? h.mummat.slice(0,3).join('، ') + (h.mummat.length>3?'…':'') : 'الجميع سجّل نقاطاً'}</div>
  </div>`;
  if(h.bestStreak && h.bestStreak.streak > 0){
    html += `<div class="hero-card">
      <div class="hero-label">🔥 أطول سلسلة بلا ممة</div>
      <div class="hero-name">${h.bestStreak.name}</div>
      <div class="hero-sub">${h.bestStreak.streak} جولة متتالية</div>
    </div>`;
  }
  html += '</div>';
  box.innerHTML = html;
}

// ---------- عداد تنازلي للجولة القادمة ----------
// المنظم يحدد التاريخ من لوحة المنظم (DATA.nextRoundAt، ISO string) — يُحفظ
// ويُقرأ ضمن DATA الرئيسية مثل بقية بيانات الجولات. يظهر للجميع بلا قيود.
let countdownInterval = null;

function renderCountdown(){
  const box = document.getElementById('countdownBox');
  if(!box) return;
  if(countdownInterval){ clearInterval(countdownInterval); countdownInterval=null; }

  if(!DATA.nextRoundAt){ box.innerHTML=''; return; }
  const target = new Date(DATA.nextRoundAt).getTime();
  if(isNaN(target)){ box.innerHTML=''; return; }

  const nextRoundNum = getCurrentRoundNumber() + 1;

  function tick(){
    const diff = target - Date.now();
    if(diff <= 0){
      box.innerHTML = `<div class="countdown-card"><div class="countdown-label">⏰ الجولة ${nextRoundNum}</div><div class="countdown-timer">بدأت الجولة! 🔥</div></div>`;
      if(countdownInterval){ clearInterval(countdownInterval); countdownInterval=null; }
      return;
    }
    const days = Math.floor(diff/86400000);
    const hours = Math.floor((diff/3600000)%24);
    const mins = Math.floor((diff/60000)%60);
    const secs = Math.floor((diff/1000)%60);
    const pad = n => String(n).padStart(2,'0');
    const dayPart = days>0 ? `${days}ي ` : '';
    box.innerHTML = `<div class="countdown-card"><div class="countdown-label">⏰ العد التنازلي لبداية الجولة ${nextRoundNum}</div><div class="countdown-timer">${dayPart}${pad(hours)}:${pad(mins)}:${pad(secs)}</div></div>`;
  }
  tick();
  countdownInterval = setInterval(tick, 1000);
}

// ---------- تأثير احتفالي بسيط عند إعلان بطل الجولة ----------
// كونفيتي مبني ذاتيًا (بدون أي مكتبة خارجية) — يحترم تفضيل "تقليل الحركة"
// في نظام المستخدم فلا يُنشئ أي عنصر إطلاقًا لمن فعّله، ويزيل نفسه من الصفحة
// تلقائيًا بعد انتهاء الحركة (لا يترك أي أثر في الـ DOM).
function fireConfetti(colorsOverride){
  try{
    if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  }catch(e){}
  const colors = colorsOverride || ['#16A6EA','#9B7BF5','#3DD47E','#FF6B5E','#FFFFFF'];
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;';
  const count = 60;
  for(let i=0;i<count;i++){
    const piece = document.createElement('div');
    const size = 6 + Math.random()*6;
    const left = Math.random()*100;
    const duration = 2.2 + Math.random()*1.6;
    const delay = Math.random()*0.4;
    const color = colors[Math.floor(Math.random()*colors.length)];
    const rotateStart = Math.floor(Math.random()*360);
    piece.style.cssText = `position:absolute;top:-20px;left:${left}%;width:${size}px;height:${size*0.4}px;`
      + `background:${color};opacity:0.9;transform:rotate(${rotateStart}deg);`
      + `animation:confettiFall ${duration}s ease-in ${delay}s forwards;`;
    container.appendChild(piece);
  }
  document.body.appendChild(container);
  setTimeout(()=>container.remove(), 4200);
}
function renderSeasonProgress(){
  const box = document.getElementById('seasonProgressBox');
  if(!box) return;
  const done = getCurrentRoundNumber();
  const pct = Math.min(100, Math.round((done / SEASON_TOTAL_ROUNDS)*100));
  box.innerHTML = `
    <div class="season-progress-bar">
      <div class="season-progress-label">
        <span>تقدّم الموسم</span>
        <span>${done} / ${SEASON_TOTAL_ROUNDS} جولة (${pct}%)</span>
      </div>
      <div class="season-progress-track">
        <div class="season-progress-fill" style="width:${pct}%;"></div>
      </div>
    </div>`;
}

// ---------- أبرز جولات (أكثر تنافسية وأكثر تفاوتاً) ----------
function renderRoundsInsights(){
  const box = document.getElementById('roundsInsightsBox');
  if(!box) return;
  if(!DATA.rounds.length){ box.innerHTML=''; return; }

  let mostCompetitive = {round:null, spread:Infinity};
  let mostDivergent = {round:null, spread:0};

  DATA.rounds.forEach(r=>{
    const stats = computeRoundStats(r);
    const pts = PARTICIPANTS.map(p=>stats[p.id].points);
    const mn = Math.min(...pts), mx = Math.max(...pts);
    const spread = mx - mn;
    if(spread < mostCompetitive.spread) mostCompetitive = {round:r.number, spread};
    if(spread > mostDivergent.spread) mostDivergent = {round:r.number, spread, min:mn, max:mx};
  });

  box.innerHTML = `
    <div class="rounds-insights">
      <div class="rounds-insight-card best">
        <span class="rounds-insight-icon">⚔️</span>
        <span class="rounds-insight-label">الجولة الأكثر تنافسية</span>
        <span class="rounds-insight-val">جولة ${mostCompetitive.round||'—'}</span>
        <span class="rounds-insight-sub">فارق ${mostCompetitive.spread} نقطة فقط</span>
      </div>
      <div class="rounds-insight-card worst">
        <span class="rounds-insight-icon">📊</span>
        <span class="rounds-insight-label">الجولة الأكثر تفاوتاً</span>
        <span class="rounds-insight-val">جولة ${mostDivergent.round||'—'}</span>
        <span class="rounds-insight-sub">فارق ${mostDivergent.spread} نقطة</span>
      </div>
    </div>`;
}

// ---------- وضع ليلة الجولة ----------
// يظهر تلقائيًا أيام الجمعة والسبت والأحد
function renderNightMode(){
  const box = document.getElementById('nightModeBox');
  if(!box) return;
  const day = new Date().getDay(); // 0=أحد,5=جمعة,6=سبت
  if(day !== 5 && day !== 6 && day !== 0){ box.innerHTML=''; return; }
  const st = computeStandings();
  const leader = st[0];
  const dayNames = {5:'الجمعة',6:'السبت',0:'الأحد'};
  const dayName = dayNames[day];
  box.innerHTML = `<div class="night-mode-banner">
    <div class="night-title">🌙 ليلة الجولة — ${dayName}</div>
    <div class="night-sub">
      المتصدر الحالي: <b style="color:#E0C4FF;">${leader ? leader.name : '—'}</b>
      بـ <b style="color:#E0C4FF;">${leader ? leader.total : 0}</b> نقطة
      · الفارق عن التالي: <b style="color:#E0C4FF;">${leader && st[1] ? leader.total-st[1].total : 0}</b> ن
    </div>
  </div>`;
}

// ---------- تعليق المشارك على جولته ----------
// يُخزَّن في DATA.roundComments = { [roundNum]: { [pid]: {text,time,name} } }
function renderRoundComments(){
  const box = document.getElementById('roundCommentsBox');
  if(!box) return;
  if(!DATA.rounds.length){ box.innerHTML=''; return; }

  const n = DATA.rounds.length;
  const roundNum = DATA.rounds[n-1].number;
  const comments = (DATA.roundComments && DATA.roundComments[roundNum]) || {};
  const myPid = window._verifiedPid || null;
  const myName = myPid ? (PARTICIPANTS.find(p=>p.id===myPid)||{}).name : null;

  // قائمة التعليقات الحالية
  let commentsHTML = '';
  Object.values(comments).sort((a,b)=>new Date(a.time)-new Date(b.time)).forEach(c=>{
    const t = new Date(c.time).toLocaleDateString('ar',{month:'short',day:'numeric'});
    commentsHTML += `<div class="round-comment-item">
      <span class="rc-author">${c.name}</span>
      <span class="rc-text">${c.text}</span>
      <span class="rc-time">${t}</span>
    </div>`;
  });

  // حقل الإضافة (فقط للمشارك المُسجَّل دخوله)
  let formHTML = '';
  if(myPid && myName){
    const alreadyCommented = !!comments[myPid];
    if(alreadyCommented){
      formHTML = `<span class="rc-locked">✅ أضفت تعليقك على الجولة ${roundNum}</span>`;
    } else {
      formHTML = `<div class="rc-add-form">
        <input type="text" class="rc-input" id="rcInput_${roundNum}" maxlength="80" placeholder="رأيك عن جولتك... (حتى 80 حرف)">
        <button class="rc-submit" onclick="submitRoundComment(${roundNum},${myPid})">إرسال</button>
      </div>`;
    }
  } else {
    formHTML = `<span class="rc-locked">🔒 اختر اسمك وأدخل رمزك للتعليق</span>`;
  }

  box.innerHTML = `<div class="round-comment-section">
    <div style="font-weight:700;font-size:0.85rem;color:var(--text);margin-bottom:8px;">💬 تعليقات الجولة ${roundNum}</div>
    ${commentsHTML ? `<div class="round-comments-list">${commentsHTML}</div>` : '<div style="font-size:0.78rem;color:var(--muted);margin-bottom:8px;">لا تعليقات بعد — كن أول من يعلّق!</div>'}
    ${formHTML}
  </div>`;
}

async function submitRoundComment(roundNum, pid){
  const input = document.getElementById(`rcInput_${roundNum}`);
  if(!input) return;
  const text = input.value.trim();
  if(!text){ input.focus(); return; }
  const name = (PARTICIPANTS.find(p=>p.id===pid)||{}).name || '?';
  if(!DATA.roundComments) DATA.roundComments = {};
  if(!DATA.roundComments[roundNum]) DATA.roundComments[roundNum] = {};
  DATA.roundComments[roundNum][pid] = {text, name, time: new Date().toISOString()};
  await saveData();
  renderRoundComments();
}

// ---------- محاكاة السيناريوهات (ميزة 10) ----------
let _scenarioRendered=false;
function renderScenario(){
  const box=document.getElementById('scenarioBox');
  if(!box) return;
  if(DATA.rounds.length<2){box.innerHTML='';return;}
  const remaining=SEASON_TOTAL_ROUNDS-DATA.rounds.length;
  if(remaining<=0){box.innerHTML='';return;}
  if(_scenarioRendered) return;
  _scenarioRendered=true;
  box.innerHTML=`<h2 class="section-title" style="margin-top:22px;">🎲 محاكاة السيناريوهات</h2>
    <div style="background:var(--paper);border-radius:14px;padding:16px;">
      <p style="color:var(--muted);margin:0 0 12px;font-size:0.87rem;">ماذا لو حصل المتصدر على نقاط أقل في الجولات الـ${remaining} القادمة؟</p>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:4px;">
        <label style="font-size:0.88rem;color:var(--text2);">نقاط المتصدر/جولة:</label>
        <input type="range" id="scenarioSlider" min="0" max="12" value="6" style="flex:1;min-width:120px;accent-color:var(--gold);">
        <span id="scenarioSliderVal" style="font-weight:800;color:var(--gold);min-width:28px;text-align:center;">6</span>
      </div>
      <div id="scenarioResult"></div>
    </div>`;
  function calcScenario(lp){
    const cur=computeStandings();
    const lid=cur[0].id;
    const rows=cur.map(s=>({...s,proj:s.total+(s.id===lid?lp*remaining:0)})).sort((a,b)=>b.proj-a.proj);
    const newLead=rows[0];
    const nl=PARTICIPANTS.find(x=>x.id===newLead.id);
    const ol=PARTICIPANTS.find(x=>x.id===lid);
    return `<div style="overflow-x:auto;margin-top:12px;">
      <table style="width:100%;border-collapse:collapse;font-size:0.84rem;">
        <thead><tr style="background:var(--ink);color:var(--gold);">
          <th style="padding:6px;text-align:center;">#</th>
          <th style="padding:6px;text-align:right;">المشارك</th>
          <th style="padding:6px;text-align:center;">الحالي</th>
          <th style="padding:6px;text-align:center;">المتوقع</th>
        </tr></thead>
        <tbody>${rows.slice(0,6).map((s,i)=>{
          const pp=PARTICIPANTS.find(x=>x.id===s.id);
          const pc2=PARTICIPANT_COLORS[s.id]||'var(--gold)';
          const hl=s.id===newLead.id?`background:${pc2}22;`:'';
          return `<tr style="border-bottom:1px solid var(--line);${hl}">
            <td style="padding:6px;text-align:center;font-weight:800;color:${pc2};">${i+1}</td>
            <td style="padding:6px;">${pp?.name||''}</td>
            <td style="padding:6px;text-align:center;color:var(--muted);">${s.total}</td>
            <td style="padding:6px;text-align:center;font-weight:700;color:${pc2};">${s.proj}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>
      ${newLead.id!==lid
        ?`<div style="margin-top:10px;padding:8px;background:var(--gold)22;border-radius:8px;color:var(--gold);font-size:0.87rem;text-align:center;">⚡ في هذا السيناريو، <strong>${nl?.name}</strong> يتصدر بدلاً من <strong>${ol?.name}</strong>!</div>`
        :`<div style="margin-top:10px;padding:8px;background:var(--cream);border-radius:8px;color:var(--muted);font-size:0.85rem;text-align:center;">${ol?.name} يظل في الصدارة حتى في هذا السيناريو.</div>`
      }
    </div>`;
  }
  const sl=document.getElementById('scenarioSlider');
  const sv=document.getElementById('scenarioSliderVal');
  const sr=document.getElementById('scenarioResult');
  function upd(){const v=parseInt(sl.value);sv.textContent=v;sr.innerHTML=calcScenario(v);}
  sl.addEventListener('input',upd);
  upd();
}

// ---------- تحدي الجولة التلقائي (ميزة 9) ----------
function renderRoundChallenge(){
  const box=document.getElementById('roundChallengeBox');
  if(!box) return;
  // خيار إخفاء/إظهار للمنظم (نفس نمط DATA.duelsEnabled) — بيانات قديمة بلا
  // هذا الحقل تُعامَل كـ"مفعّل" افتراضيًا (9 سبتمبر 2026).
  if(DATA.roundChallengeEnabled === false){box.innerHTML='';return;}
  if(!DATA.rounds.length){box.innerHTML='';return;}
  const lastRound=DATA.rounds[DATA.rounds.length-1];
  const nextNum=lastRound.number+1;
  const stands=computeStandings();
  const pid=window._verifiedPid;
  const cKey=`challenge_r${nextNum}`;
  const votes=(DATA.roundComments&&DATA.roundComments[cKey])||{};
  const myVote=pid?votes[pid]:null;
  const voteCounts={};
  Object.values(votes).forEach(v=>{ if(v&&v.vote) voteCounts[v.vote]=(voteCounts[v.vote]||0)+1; });
  const totalVotes=Object.values(voteCounts).reduce((a,b)=>a+b,0);
  const canVote=pid&&!myVote;
  const myVotedName=myVote?PARTICIPANTS.find(x=>x.id==myVote.vote)?.name:'';
  box.innerHTML=`<h2 class="section-title" style="margin-top:22px;">🗳️ تحدي الجولة ${nextNum}</h2>
    <div style="background:var(--paper);border-radius:14px;padding:16px;">
      <p style="color:var(--text2);margin:0 0 12px;font-size:0.9rem;">
        <strong>من سيتصدر الجولة ${nextNum}؟</strong>
        ${!pid?'<br><span style="color:var(--muted);font-size:0.8rem;">سجّل دخولك للتصويت</span>':''}
        ${myVote?`<br><span style="color:var(--gold);font-size:0.82rem;">✅ صوّتت لـ: ${myVotedName}</span>`:''}
      </p>
      ${canVote?`<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin-bottom:14px;">
        ${stands.slice(0,6).map((s,i)=>{
          const pp=PARTICIPANTS.find(x=>x.id===s.id);
          const pc=PARTICIPANT_COLORS[s.id]||'var(--gold)';
          return `<button onclick="castChallengeVote(${s.id})" style="padding:8px 6px;background:var(--cream);border:1.5px solid ${pc}55;border-radius:9px;color:var(--text);font-family:inherit;cursor:pointer;font-size:0.84rem;font-weight:700;transition:background .15s;">
            <span style="color:${pc};">#${i+1}</span> ${pp?.name||''}
          </button>`;
        }).join('')}
      </div>`:''}
      ${totalVotes>0
        ?`<div>
          <div style="font-size:0.8rem;color:var(--muted);margin-bottom:8px;">${totalVotes} تصويت حتى الآن:</div>
          ${Object.entries(voteCounts).sort((a,b)=>b[1]-a[1]).map(([vpid,cnt])=>{
            const pp=PARTICIPANTS.find(x=>x.id==vpid);
            const pc=PARTICIPANT_COLORS[parseInt(vpid)]||'var(--gold)';
            const pct=Math.round(cnt/totalVotes*100);
            return `<div style="margin-bottom:7px;">
              <div style="display:flex;justify-content:space-between;font-size:0.84rem;">
                <span style="color:${pc};">${pp?.name||''}</span><span>${cnt} (${pct}%)</span>
              </div>
              <div style="height:6px;background:var(--cream);border-radius:3px;margin-top:3px;">
                <div style="height:100%;width:${pct}%;background:${pc};border-radius:3px;"></div>
              </div>
            </div>`;
          }).join('')}
        </div>`
        :`<div style="color:var(--muted);font-size:0.85rem;">لا تصويتات بعد — كن أول من يصوّت!</div>`}
    </div>`;
}

async function castChallengeVote(targetPid){
  const pid=window._verifiedPid;
  if(!pid) return;
  const lastRound=DATA.rounds[DATA.rounds.length-1];
  const cKey=`challenge_r${lastRound.number+1}`;
  const voterName=PARTICIPANTS.find(x=>x.id===pid)?.name||'';
  if(!DATA.roundComments) DATA.roundComments={};
  if(!DATA.roundComments[cKey]) DATA.roundComments[cKey]={};
  DATA.roundComments[cKey][pid]={vote:targetPid,name:voterName,time:Date.now()};
  await saveData();
  renderRoundChallenge();
}

function toggleExpand(pid){
  const row = document.getElementById('expand-'+pid);
  if(row) row.style.display = row.style.display==='table-row' ? 'none' : 'table-row';
}

// شارة نتيجة صغيرة (فوز/تعادل/خسارة/لا توجد مباراة) بلون مناسب
function r2ResBadge(res){
  if(res==='no_match') return `<span class="r2-res-nomatch">⏸️ ${RESULT_LABEL[res]}</span>`;
  const cls = res==='win' ? 'r2-res-win' : res==='draw' ? 'r2-res-draw' : 'r2-res-loss';
  return `<span class="${cls}">${RESULT_LABEL[res]}</span>`;
}

// كرت "الجولة 2" الكامل لكل مشارك: كل نادٍ ومبارياته الحقيقية ضمن نافذة
// الجولة (تاريخ/خصم/نتيجة/أهداف)، من ROUND2_MATCHES مباشرة
function renderRound2Section(){
  // كل مشارك يظهر بهذا الأرشيف التاريخي — حتى من التحق بعد نافذة الجولة 2
  // (JOINED_AFTER_ROUND2، مثل محمد عثمان الملتحق بالجولة 3 مباشرة). بدل
  // استثنائه بالكامل من القائمة (كما كان سابقًا) أو عرض كرت مباريات وهمي
  // له، يظهر اسمه بصف "لم يلتحق بعد بالمسابقة" — بنفس نمط renderRound1Section
  // أدناه — حتى يبقى موجودًا دائمًا بقائمة الجولات (7 سبتمبر 2026، بطلب المستخدم).
  const rows = PARTICIPANTS.map(p=>({
    p,
    joined: !JOINED_AFTER_ROUND2[p.id],
    r2: JOINED_AFTER_ROUND2[p.id] ? null : computeRound2ForParticipant(p)
  }));
  rows.sort((a,b)=>{
    if(!a.joined && !b.joined) return 0;
    if(!a.joined) return 1;
    if(!b.joined) return -1;
    if(b.r2.points !== a.r2.points) return b.r2.points - a.r2.points;
    return a.p.name.localeCompare(b.p.name, 'ar');
  });

  let html = `<h4 style="margin:0 0 8px;font-size:0.95rem;color:var(--text);">🏁 الجولة 2 — بالتفصيل (26 أغسطس – 2 سبتمبر 2026)</h4>`;
  html += `<p class="rounds-subtitle" style="margin-top:0;">مباريات كل نادٍ الحقيقية في دوريه المحلي ضمن هذه الجولة، نادٍ نادٍ ومباراة مباراة — بحث حقيقي عبر 365Scores. بطل الجولة الثانية تحديدًا (تاريخي، لا يتغيّر) مُعلَّم بشارة "بطل الجولة" أدناه: أبو أوس (كسر تعادل بالأهداف، التفاصيل في تبويب اللائحة). لبطل الجولة الحالية شوف "🏆 أرشيف أبطال الجولات" أعلاه.</p>`;
  html += roundTitlesHTML((computeRoundTitlesArchive())[2]);

  rows.forEach(({p, r2, joined})=>{
    if(!joined){
      html += `<div class="r2-card">
        <div class="r2-head">
          <div class="r2-name">${p.name}</div>
          <div class="r2-pts"><span style="color:#8A8A8A;font-weight:600;font-size:0.76rem;">لم يلتحق بعد بالمسابقة</span></div>
        </div>
      </div>`;
      return;
    }
    const isChamp = p.id === ROUND_HERO_OVERRIDE[2];
    html += `<div class="r2-card${isChamp?' is-champion':''}">
      <div class="r2-head">
        <div class="r2-name">${p.name}${isChamp?' <span class="round-champion-badge">بطل الجولة</span>':''}</div>
        <div class="r2-pts">${r2.points} نقطة <span style="color:var(--muted);font-weight:600;font-size:0.72rem;">(${r2.gf}-${r2.ga})</span></div>
      </div>
      <div class="r2-clubs">
        ${r2.clubs.map(c=>`
          <div class="r2-club-row">
            ${clubCrestSVG(c.name, 26)}
            <div class="r2-club-matches">
              <div class="r2-club-name">${c.name}</div>
              ${c.matches.length ? c.matches.map(m=>`
                <div class="r2-match-line">${m.date} · ${m.opp} · ${r2ResBadge(m.res)} <b>${m.gf}-${m.ga}</b></div>
              `).join('') : `<div class="r2-match-line">لا توجد مباراة ضمن هذه النافذة</div>`}
            </div>
          </div>
        `).join('')}
      </div>
      ${p.id===18 ? `<div class="r2-note">⚠️ أبو صالح التحق بالمسابقة بعد الجولة الأولى، فرصيده المعروض في الترتيب العام (${p.carry}) محسوب من كامل موسم أنديته حتى الآن — أما الرقم أعلاه (${r2.points}) فهو حصاد أنديته الفعلي ضمن نافذة الجولة 2 تحديدًا فقط، وهو أقل طبيعيًا لأنه لا يشمل مبارياتها الأقدم.</div>` : ''}
    </div>`;
  });
  return html;
}

// كرت "الجولة 1" المبسّط: نقاط فقط (لا تتوفر بيانات مباريات مُفصّلة لها)
function renderRound1Section(){
  const rows = PARTICIPANTS.map(p=>({p, pts: ROUND1_POINTS[p.id]||0, joined:!JOINED_AFTER_ROUND1[p.id]}));
  rows.sort((a,b)=>{
    if(!a.joined && !b.joined) return 0;
    if(!a.joined) return 1;
    if(!b.joined) return -1;
    if(b.pts !== a.pts) return b.pts - a.pts;
    return a.p.name.localeCompare(b.p.name, 'ar');
  });

  let html = `<h4 style="margin:18px 0 8px;font-size:0.95rem;color:var(--text);">🥇 الجولة 1 — ملخص النقاط (حتى 25 أغسطس 2026)</h4>`;
  html += `<p class="rounds-subtitle" style="margin-top:0;">ملخّص نقاط فقط من كشف الترتيب المعتمد بتاريخ 25 أغسطس 2026 — بلا تفاصيل مباريات لكل نادٍ. بطل الجولة الأولى تحديدًا (تاريخي، لا يتغيّر) مُعلَّم بشارة "بطل الجولة" أدناه — حُسم باختيار المنظم عند تعادل ثلاثي تام بالنقاط (لا بيانات أهداف للجولة الأولى لكسر التعادل رقميًا).</p>`;
  html += `<div class="r1-simple-card">`;
  rows.forEach((row, i)=>{
    const isChamp = row.joined && row.p.id === ROUND_HERO_OVERRIDE[1];
    html += `<div class="r1-simple-row">
      <div class="r1-rank">${i+1}</div>
      <div class="r1-name">${row.p.name}${isChamp?' <span class="round-champion-badge">بطل الجولة</span>':''}</div>
      <div class="r1-pts">${row.joined ? row.pts + ' نقطة' : '<span style="color:#8A8A8A;font-weight:600;font-size:0.76rem;">لم يلتحق بعد بالمسابقة</span>'}</div>
    </div>`;
  });
  html += `</div>`;
  return html;
}

function renderChampionsArchive(){
  const box = document.getElementById('championsArchiveBox');
  if(!box) return;
  const archive = getRoundChampionsArchive();
  if(!archive.length){ box.innerHTML=''; return; }
  let html = '<div class="champions-archive">';
  archive.forEach(row=>{
    const names = row.champions.length ? row.champions.join(' و') : '—';
    html += `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px dotted var(--line);">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-weight:800;font-size:0.8rem;color:var(--gold);min-width:60px;">الجولة ${row.round}</span>
        <span style="font-weight:700;font-size:0.85rem;">${names} <span class="round-champion-badge">بطل الجولة</span></span>
      </div>
      <span style="font-weight:800;font-size:0.85rem;color:var(--coral);">${row.points} نقطة</span>
    </div>`;
  });
  html += '</div>';
  box.innerHTML = html;
}

function renderRounds(){
  const box = document.getElementById('roundsBox');
  let html = '';

  // جولات حقيقية أُدخلت من تبويب المنظم (3 فصاعدًا) — الأحدث أولًا
  if(DATA.rounds.length){
    const titlesArchive = computeRoundTitlesArchive();
    // توحيد شكل عرض الجولات 3+ مع كرت "الجولة 2 بالتفصيل" (r2-card): اسم +
    // نقاط الجولة + كل نادٍ ضد خصمه بنتيجته، بدل الصف المضغوط القديم بلا
    // تفاصيل الخصم. الترتيب هنا هو ترتيب هذه الجولة تحديدًا (بنقاطها فقط)
    // وليس الترتيب العام التراكمي — رقمان مختلفان تمامًا (10 سبتمبر 2026).
    DATA.rounds.slice().reverse().forEach(r=>{
      const stats = computeRoundStats(r);
      const rows = PARTICIPANTS.map(p=>({
        p,
        s: stats[p.id],
        entries: (r.entries && r.entries[p.id]) || []
      })).sort((a,b)=> b.s.points - a.s.points || a.p.name.localeCompare(b.p.name,'ar'));
      // بطل هذه الجولة تحديدًا (تاريخي، لا يتغيّر) — نفس منطق getRoundChampionsArchive
      // (يحترم ROUND_HERO_OVERRIDE إن وُجد، وإلا كسر تعادل تلقائي بالأهداف).
      const roundChampId = getRoundChampion(r.number);

      html += `<h4 style="margin:18px 0 8px;font-size:0.95rem;color:var(--text);">الجولة ${r.number}</h4>`;
      html += roundTitlesHTML(titlesArchive[r.number]);
      rows.forEach(({p, s, entries}, i)=>{
        const isChamp = p.id === roundChampId;
        html += `<div class="r2-card${isChamp?' is-champion':''}">
          <div class="r2-head">
            <div class="r2-name">#${i+1} ${p.name}${isChamp?' <span class="round-champion-badge">بطل الجولة</span>':''}</div>
            <div class="r2-pts">${s.points} نقطة${(s.points===0 && round_has_entries(r,p.id))?' <span class="mumma">ممة</span>':''} <span style="color:var(--muted);font-weight:600;font-size:0.72rem;">(${s.gf}-${s.ga})</span></div>
          </div>
          <div class="r2-clubs">
            ${p.teams.map((t,ti)=>{
              // نادٍ قد يلعب أكثر من مباراة بنفس الجولة (منذ 5 سبتمبر 2026) —
              // تُعرض كل مباراة بسطر مستقل، بنفس أسلوب r2-match-line بالجولة 2.
              const es = getTeamRoundEntries(entries, ti);
              return `<div class="r2-club-row">
                ${clubCrestSVG(t, 26)}
                <div class="r2-club-matches">
                  <div class="r2-club-name">${t}</div>
                  ${es.length ? es.map(e=> e.result==='no_match' ? `
                    <div class="r2-match-line">${r2ResBadge(e.result)}</div>
                  ` : `
                    <div class="r2-match-line">${e.opp?e.opp+' · ':''}${r2ResBadge(e.result)} <b>${Number(e.gf)||0}-${Number(e.ga)||0}</b></div>
                  `).join('') : `<div class="r2-match-line">لا يوجد تسجيل لهذه الجولة بعد</div>`}
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>`;
      });
    });
  }

  html += renderRound2Section();
  html += renderRound1Section();

  box.innerHTML = html;
}
