/* نظام تكريم بطل الموسم بالكامل */

// ════════════════════════════════════════════════════════════════════════
// قسم تكريم البطل (Champion Honor Section) — 8 سبتمبر 2026
// بطل الموسم الحالي + سجل أبطال المواسم + 16 ميزة قابلة للتفعيل، كلها
// معطّلة افتراضيًا (المجموعة لا تزال بفترة تجربة بـ5 منظمين). كل شيء يُخزَّن
// بـFirebase عبر window.storage (shared=true) فيصل فورًا لكل الأجهزة، ونفس
// مسار المزامنة اللحظية بـstartRealtimeSync يبقيه محدَّثًا بدون تحديث الصفحة.
// ════════════════════════════════════════════════════════════════════════
let CHAMPION_ID = null; // null = "بدون بطل حاليًا"
let SEASON_CHAMPIONS_ARCHIVE = []; // [{season, name, points}] — سجل تاريخي يدوي مستقل
const CHAMPION_FEATURE_KEYS = [
  'badge_standings','top_banner','golden_card',
  'hero_card','welcome_message','golden_confetti','certificate','whatsapp_line',
  'defense_journey','defense_path','hall_of_fame','animated_crown','dynamic_badge',
  'proximity_alert','smart_summary_highlight','weekly_challenge_notice'
];
const CHAMPION_FEATURES = {};
CHAMPION_FEATURE_KEYS.forEach(k=>CHAMPION_FEATURES[k]=false);
let _proximityAlertLoggedKey = null;
let _weeklyChallengeLoggedRound = null;

async function loadChampionData(){
  try{
    const res = await window.storage.get('currentChampionId', true);
    CHAMPION_ID = (res && res.value !== null && res.value !== undefined && res.value !== '') ? Number(res.value) : null;
  }catch(e){ CHAMPION_ID = null; }
  try{
    const res2 = await window.storage.get('seasonChampionsArchive', true);
    const v = res2 && res2.value;
    SEASON_CHAMPIONS_ARCHIVE = Array.isArray(v) ? v : (v ? Object.values(v) : []);
  }catch(e){ SEASON_CHAMPIONS_ARCHIVE = []; }
  try{
    const res3 = await window.storage.get('championHonorFeatures', true);
    const loaded = (res3 && res3.value) || {};
    CHAMPION_FEATURE_KEYS.forEach(k=> CHAMPION_FEATURES[k] = !!loaded[k]);
  }catch(e){ /* تبقى كل الميزات معطّلة افتراضيًا عند تعذّر القراءة */ }
}

// آخر إدخال بسجل أبطال المواسم يطابق اسم البطل الحالي — يُستخدم لميزتي
// "رحلة الدفاع" و"مسار الدفاع بالترتيب". يرجع null بأمان إن لم يوجد تطابق
// (تدهور رشيق بدل كسر الميزة).
function findChampionLastSeasonEntry(){
  if(!CHAMPION_ID) return null;
  const champ = PARTICIPANTS.find(p=>p.id===CHAMPION_ID);
  if(!champ) return null;
  const matches = SEASON_CHAMPIONS_ARCHIVE.filter(r=> r && r.name && String(r.name).trim() === champ.name.trim());
  if(!matches.length) return null;
  return matches[matches.length-1];
}

// ميزة 1 (شارة البطل) + ميزة 13 (شارة ذكية تتحول لـ"يحاول استعادة العرش")
function championBadgeHTML(pid){
  if(!CHAMPION_FEATURES.badge_standings || !CHAMPION_ID || pid !== CHAMPION_ID) return '';
  let label = 'حامل اللقب', cls = '';
  if(CHAMPION_FEATURES.dynamic_badge){
    const st = computeStandings();
    const champRow = st.find(s=>s.id===CHAMPION_ID);
    const others = st.filter(s=>s.id!==CHAMPION_ID);
    const maxOtherTotal = others.length ? Math.max(...others.map(s=>s.total)) : 0;
    if(champRow && maxOtherTotal > champRow.total){ label = 'يحاول استعادة العرش'; cls = 'reclaim'; }
  }
  return `<span class="champion-badge ${cls}">🛡️ ${label}</span>`;
}

// ميزة 10: ملاحظة صغيرة تحت اسم البطل بجدول الترتيب العام بنتيجة الموسم الماضي
function championDefensePathHTML(pid){
  if(!CHAMPION_FEATURES.defense_path || !CHAMPION_ID || pid !== CHAMPION_ID) return '';
  const entry = findChampionLastSeasonEntry();
  if(!entry) return '';
  return `<div class="champion-defense-note">🏅 نتيجته الموسم الماضي (${entry.season}): ${entry.points} نقطة</div>`;
}

// ميزة 2: بانر تذكير بالبطل أعلى الصفحة
function renderChampionBanner(){
  const box = document.getElementById('championBannerBox');
  if(!box) return;
  if(!CHAMPION_FEATURES.top_banner || !CHAMPION_ID){ box.innerHTML=''; return; }
  const champ = PARTICIPANTS.find(p=>p.id===CHAMPION_ID);
  if(!champ){ box.innerHTML=''; return; }
  box.innerHTML = `<div class="champion-banner">🛡️ ${champ.name} — حامل لقب الموسم الماضي، والكل يطارده!</div>`;
}

// ميزة 12: تاج متحرك بجانب شعار الموقع
function renderChampionCrown(){
  const el = document.getElementById('championCrown');
  if(!el) return;
  el.hidden = !(CHAMPION_FEATURES.animated_crown && CHAMPION_ID);
}

// ميزة 11: قاعة مشاهير الأبطال بتبويب الإحصائيات — من سجل أبطال المواسم مباشرة
function renderHallOfFame(){
  const box = document.getElementById('hallOfFameBox');
  if(!box) return;
  if(!CHAMPION_FEATURES.hall_of_fame || !SEASON_CHAMPIONS_ARCHIVE.length){ box.innerHTML=''; return; }
  const sorted = SEASON_CHAMPIONS_ARCHIVE.slice().sort((a,b)=>(b.points||0)-(a.points||0));
  box.innerHTML = `<h2 class="section-title" style="margin-top:22px;">🏛️ قاعة مشاهير الأبطال</h2>
    <div>${sorted.map(r=>`<div class="hof-row"><span>🏆 <b>${r.season}</b> — ${r.name}</span><span style="font-weight:800;color:var(--gold);">${r.points} نقطة</span></div>`).join('')}</div>`;
}

// ميزة 4 (كرت المدافع عن اللقب) + ميزة 9 (رحلة الدفاع) + زر ميزة 7 (الشهادة)
function renderChampionHero(){
  const box = document.getElementById('championHeroBox');
  if(!box) return;
  if(!CHAMPION_FEATURES.hero_card || !CHAMPION_ID){ box.innerHTML=''; return; }
  const champ = PARTICIPANTS.find(p=>p.id===CHAMPION_ID);
  const st = computeStandings();
  const idx = st.findIndex(s=>s.id===CHAMPION_ID);
  if(!champ || idx===-1){ box.innerHTML=''; return; }
  const row = st[idx];
  const rank = idx+1;
  const entry = findChampionLastSeasonEntry();
  let journeyHTML = '';
  if(CHAMPION_FEATURES.defense_journey && entry && entry.points>0){
    const pct = Math.max(0, Math.min(100, Math.round(row.total/entry.points*100)));
    journeyHTML = `<div style="margin-top:12px;">
      <div style="display:flex;justify-content:space-between;font-size:0.72rem;color:var(--muted);margin-bottom:4px;">
        <span>رحلة الدفاع عن اللقب</span><span>${row.total} / ${entry.points} نقطة (${entry.season})</span>
      </div>
      <div style="background:var(--line);border-radius:20px;height:10px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,var(--sky),var(--gold));"></div>
      </div>
    </div>`;
  }
  const certBtn = CHAMPION_FEATURES.certificate ? `<button class="btn secondary" id="championCertBtn" style="margin-top:10px;">🎖️ شهادة تكريم البطل</button>` : '';
  box.innerHTML = `<div class="champion-hero-card">
    <div style="font-size:0.75rem;color:var(--muted);font-weight:700;">🛡️ المدافع عن اللقب</div>
    <div style="font-size:1.2rem;font-weight:900;margin:4px 0;">${champ.name}</div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:0.85rem;color:var(--text2);">
      <span>المركز الحالي: <b>${rank}</b></span>
      <span>مجموع النقاط: <b>${row.total}</b></span>
      <span>الممات: <b>${row.mummaCount}</b></span>
    </div>
    ${journeyHTML}
    <div id="championCertBox"></div>
    ${certBtn}
  </div>`;
  const btn = document.getElementById('championCertBtn');
  if(btn) btn.addEventListener('click', showChampionCertificate);
}

// ميزتا 5 و6: رسالة ترحيب خاصة + كونفيتي ذهبي عند دخول البطل بنفسه (يتحقق
// من الرمز الخاص أصلاً عبر applyMyId — لا نبني تحققًا جديدًا). مرة واحدة فقط
// لكل جلسة متصفح (sessionStorage) حتى لا تتكرر عند كل إعادة رسم.
function handleChampionIdentityWelcome(id){
  if(!id) return;
  const pid = Number(id);
  if(!CHAMPION_ID || pid !== CHAMPION_ID) return;
  if(!CHAMPION_FEATURES.welcome_message && !CHAMPION_FEATURES.golden_confetti) return;
  let already = false;
  try{ already = !!sessionStorage.getItem('brookie-champ-welcome-shown-'+pid); }catch(e){}
  if(already) return;
  try{ sessionStorage.setItem('brookie-champ-welcome-shown-'+pid, '1'); }catch(e){}
  if(CHAMPION_FEATURES.golden_confetti) fireConfetti(['#FFD76A','#FFB020','#FFF3C4','#FFFFFF']);
  if(CHAMPION_FEATURES.welcome_message){
    const champ = PARTICIPANTS.find(p=>p.id===pid);
    const toast = document.createElement('div');
    toast.className = 'champion-toast';
    toast.innerHTML = `👑 أهلًا ${champ?champ.name:''}! بصفتك حامل لقب الموسم الماضي، الكل يترقّب دفاعك عن العرش هالموسم 🛡️`;
    document.body.appendChild(toast);
    setTimeout(()=>toast.remove(), 5000);
  }
}

// ميزتا 14 و16: تنبيهات سجل النشاط — تعمل فقط بمتصفح المنظم المسجّل دخوله
// (logAdminActivity نفسها مقيّدة بـisAdmin أصلًا)، ومحمية بمفاتيح تفادي
// (dedupe) حتى لا يتكرر نفس التنبيه مع كل إعادة رسم.
function checkChampionAlerts(){
  // طلب المستخدم 17 سبتمبر 2026 — computeStandings() يعطي ترتيبًا صحيحًا حتى
  // بمرحلة جسر الجولة 2 (بلا أي DATA.rounds حقيقية)، فالبوابة القديمة على
  // DATA.rounds.length كانت تعطّل التنبيهات كاملة طول تلك الفترة بلا داعٍ.
  if(!isAdmin || !CHAMPION_ID) return;
  const st = computeStandings();
  const champRow = st.find(s=>s.id===CHAMPION_ID);
  if(!champRow) return;

  if(CHAMPION_FEATURES.proximity_alert){
    const PROXIMITY_MARGIN = 3; // هامش تقريب معقول لتنبيه "يقترب"
    const others = st.filter(s=>s.id!==CHAMPION_ID);
    const closest = others.length ? others.slice().sort((a,b)=>b.total-a.total)[0] : null;
    if(closest && closest.total < champRow.total && (champRow.total - closest.total) <= PROXIMITY_MARGIN){
      const key = `${closest.id}-${champRow.total}-${closest.total}`;
      if(_proximityAlertLoggedKey !== key){
        _proximityAlertLoggedKey = key;
        logAdminActivity(`⚠️ ${closest.name} يقترب من كسر رقم البطل (${closest.total} مقابل ${champRow.total})`);
        saveData();
      }
    }
  }

  if(CHAMPION_FEATURES.weekly_challenge_notice){
    const roundNum = getCurrentRoundNumber();
    const key2 = 'r'+roundNum;
    if(roundNum > 0 && _weeklyChallengeLoggedRound !== key2){
      const champLast = champRow.lastPoints || 0;
      const beaters = st.filter(s=>s.id!==CHAMPION_ID && (s.lastPoints||0) > champLast);
      if(beaters.length){
        _weeklyChallengeLoggedRound = key2;
        logAdminActivity(`🔥 ${beaters.map(b=>b.name).join('، ')} تفوّق على حامل اللقب هالجولة (الجولة ${roundNum})`);
        saveData();
      }
    }
  }
}
