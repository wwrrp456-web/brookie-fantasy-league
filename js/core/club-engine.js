/* بيانات الأندية المحسوبة ورسم شعار النادي (SVG) */

function clubInitials(name){
  const st = CLUB_STYLE[name];
  const s = (st && st.short) ? st.short : name;
  return s.slice(0,4);
}

// عدّاد عام يضمن أن يكون معرّف clipPath فريدًا لكل شعار يُرسم بالصفحة، حتى لو
// تكرر نفس النادي عشرات المرّات (زي "الهلال" اللي يظهر بأغلب فرق المشاركين).
// قبل هذا العدّاد كان المعرّف مبنيًا فقط من hash اسم النادي، فكل الشعارات
// لنفس النادي بكل الصفحة كانت تتشارك نفس id="shXXXX" (تكرار id غير صالح
// بمواصفات HTML/SVG) — وبعض المتصفحات (خصوصًا متصفحات الجوال) تفشل بحل
// مرجع clip-path لما يتكرر الـ id عشرات المرات بنفس الصفحة (245 شعار من
// حوالي 29 ناديًا فقط)، فيتجاهل المتصفح القص بالكامل ويظهر الشعار كمربّع
// مصمت بدون حواف الدرع ولا الإطار الذهبي (بلاغ المستخدم 4 سبتمبر 2026 —
// المشكلة ما ظهرت بمتصفح الفحص لأنه اختبر شعارًا واحدًا منعزلًا في كل مرة).
let __crestUidSeq = 0;

// يبني درع SVG بهوية بصرية لكل نادي (نمط + ألوان مميّزة، بلا أي اختصار حرفي
// داخل الدرع — طلب المستخدم إزالة الاختصارات النصية والاعتماد فقط على الشكل
// واللون؛ اسم النادي الكامل يبقى متاحًا كـ<title> وaria-label لإتاحة الوصول)
function clubCrestSVG(name, px){
  const st = CLUB_STYLE[name] || {bg:'#1A1A1A', fg:'#E7C158', pattern:'solid', accent:'#E7C158'};
  const uid = 'c' + Math.abs(hashStr(name)).toString(36) + '_' + (__crestUidSeq++);
  const bg = st.bg, ac = st.accent || st.fg;

  let pattern = '';
  if(st.pattern === 'stripes'){
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      <rect x="16" y="0" width="16" height="110" fill="${ac}"/>
      <rect x="48" y="0" width="16" height="110" fill="${ac}"/>
      <rect x="80" y="0" width="16" height="110" fill="${ac}"/>
    </g>`;
  } else if(st.pattern === 'halves'){
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="50" height="110" fill="${bg}"/>
      <rect x="50" y="0" width="50" height="110" fill="${ac}"/>
    </g>`;
  } else if(st.pattern === 'sash'){
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      <polygon points="0,32 100,0 100,34 0,66" fill="${ac}"/>
    </g>`;
  } else if(st.pattern === 'eiffel'){
    // برج إيفل — هوية باريس سان جيرمان، أيقونة PNG قدّمها المستخدم
    // (brand-assets.js: EIFFEL_ICON_PNG_BASE64)، بنفس أسلوب قناع الأسد أعلاه
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      <mask id="ef${uid}">
        <image href="${EIFFEL_ICON_PNG_BASE64}" x="18" y="22" width="64" height="64" style="filter:invert(1)"/>
      </mask>
      <rect x="0" y="0" width="100" height="110" fill="${ac}" mask="url(#ef${uid})"/>
    </g>`;
  } else if(st.pattern === 'hoops'){
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      <rect x="0" y="14" width="100" height="15" fill="${ac}"/>
      <rect x="0" y="44" width="100" height="15" fill="${ac}"/>
      <rect x="0" y="74" width="100" height="15" fill="${ac}"/>
    </g>`;
  } else if(st.pattern === 'diag'){
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      <polygon points="0,0 46,0 0,58" fill="${ac}"/>
      <polygon points="100,110 54,110 100,52" fill="${ac}"/>
    </g>`;
  } else if(st.pattern === 'crescent'){
    // هلال — لأندية اسمها/هويتها هلال (الهلال السعودي تحديدًا)، بطلب المستخدم
    // بدل الخطوط العمودية المستخدَمة سابقًا لتمييزه عن تشيلسي (نفس درجة الأزرق).
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      <circle cx="50" cy="52" r="24" fill="${ac}"/>
      <circle cx="61" cy="45" r="20" fill="${bg}"/>
    </g>`;
  } else if(st.pattern === 'checkers'){
    // شطرنجي 4×4 — لهوية أندية معروفة بنمط مربعات (بايرن ميونخ مثلاً)
    let squares = '';
    const cols = 4, rows = 4, cw = 100/cols, rh = 110/rows;
    for(let r=0; r<rows; r++){
      for(let c=0; c<cols; c++){
        if((r+c) % 2 === 0) squares += `<rect x="${c*cw}" y="${r*rh}" width="${cw}" height="${rh}" fill="${ac}"/>`;
      }
    }
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      ${squares}
    </g>`;
  } else if(st.pattern === 'crown'){
    // تاج ملكي — لهوية أندية بطابع ملكي/تتويج (ريال مدريد، النصر...)، بطلب
    // المستخدم بدل الحلقة الدائرية المستخدَمة سابقًا لنفس الفكرة.
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      <path d="M27 64 L27 42 L38 52 L50 30 L62 52 L73 42 L73 64 Z" fill="${ac}"/>
      <rect x="25" y="64" width="50" height="9" rx="2" fill="${ac}"/>
      <circle cx="27" cy="42" r="4" fill="${ac}"/>
      <circle cx="50" cy="30" r="4.5" fill="${ac}"/>
      <circle cx="73" cy="42" r="4" fill="${ac}"/>
    </g>`;
  } else if(st.pattern === 'saudiMap'){
    // خريطة المملكة العربية السعودية — هوية النصر، أيقونة PNG قدّمها المستخدم
    // (brand-assets.js: SAUDI_MAP_ICON_PNG_BASE64)، بنفس أسلوب قناع الأسد أعلاه
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      <mask id="sm${uid}">
        <image href="${SAUDI_MAP_ICON_PNG_BASE64}" x="20" y="24" width="60" height="60" style="filter:invert(1)"/>
      </mask>
      <rect x="0" y="0" width="100" height="110" fill="${ac}" mask="url(#sm${uid})"/>
    </g>`;
  } else if(st.pattern === 'ship'){
    // سفينة (مُصغَّرة بطلب المستخدم) — هوية مانشستر سيتي التاريخية (قناة
    // مانشستر الملاحية)
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      <path d="M32 63 L68 63 L62 70 L38 70 Z" fill="${ac}"/>
      <rect x="49" y="40" width="2" height="23" fill="${ac}"/>
      <path d="M51 40 L64 48 L51 51 Z" fill="${ac}"/>
    </g>`;
  } else if(st.pattern === 'lion'){
    // أيقونة أسد جاهزة قدّمها المستخدم (صورة PNG محوّلة base64 بـ
    // brand-assets.js: LION_ICON_PNG_BASE64) بدل رسمة متجهية — لهوية أندية
    // شعارها أسد (رينجرز، سبورتينغ لشبونة...). الصورة أصلًا أسد أسود على
    // خلفية شفافة؛ نستخدمها كـmask (بعد عكس الألوان invert(1) لأن قناع SVG
    // الافتراضي يُظهر المناطق الفاتحة ويُخفي الداكنة — عكس ما نريد)، ونملأ
    // الشكل الناتج بلون هوية النادي بدل الأسود الثابت، فيتلوّن الأسد تلقائيًا
    // حسب كل نادٍ.
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      <mask id="lm${uid}">
        <image href="${LION_ICON_PNG_BASE64}" x="18" y="22" width="64" height="64" style="filter:invert(1)"/>
      </mask>
      <rect x="0" y="0" width="100" height="110" fill="${ac}" mask="url(#lm${uid})"/>
    </g>`;
  } else if(st.pattern === 'wolf'){
    // رأس ذئبة عاوية — هوية روما (أسطورة ذئبة الكابيتول)، أيقونة PNG قدّمها
    // المستخدم (brand-assets.js: WOLF_ICON_PNG_BASE64)، بنفس أسلوب قناع الأسد
    // أعلاه (invert(1) لأن قناع SVG الافتراضي يُظهر الفاتح ويُخفي الداكن).
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      <mask id="wm${uid}">
        <image href="${WOLF_ICON_PNG_BASE64}" x="18" y="20" width="64" height="64" style="filter:invert(1)"/>
      </mask>
      <rect x="0" y="0" width="100" height="110" fill="${ac}" mask="url(#wm${uid})"/>
    </g>`;
  } else if(st.pattern === 'lock'){
    // قفل — هوية غلطة سراي، بطلب المستخدم
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      <path d="M38 46 V38 C38 28 62 28 62 38 V46" stroke="${ac}" stroke-width="6" fill="none"/>
      <rect x="30" y="46" width="40" height="32" rx="6" fill="${ac}"/>
      <circle cx="50" cy="58" r="5" fill="${bg}"/>
      <rect x="47" y="60" width="6" height="10" fill="${bg}"/>
    </g>`;
  } else if(st.pattern === 'palm'){
    // نخلة — هوية الأهلي السعودي، بطلب المستخدم
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      <rect x="47" y="54" width="6" height="26" fill="${ac}"/>
      <path d="M50 54 C38 50 28 52 20 42 C32 44 42 48 50 52 Z" fill="${ac}"/>
      <path d="M50 54 C62 50 72 52 80 42 C68 44 58 48 50 52 Z" fill="${ac}"/>
      <path d="M50 54 C46 44 44 34 38 26 C48 32 52 42 52 52 Z" fill="${ac}"/>
      <path d="M50 54 C54 44 56 34 62 26 C52 32 48 42 48 52 Z" fill="${ac}"/>
    </g>`;
  } else if(st.pattern === 'ball'){
    // كرة طائرة — هوية الشباب، أيقونة PNG قدّمها المستخدم
    // (brand-assets.js: BALL_ICON_PNG_BASE64)، بنفس أسلوب قناع الأسد أعلاه
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      <mask id="bl${uid}">
        <image href="${BALL_ICON_PNG_BASE64}" x="18" y="22" width="64" height="64" style="filter:invert(1)"/>
      </mask>
      <rect x="0" y="0" width="100" height="110" fill="${ac}" mask="url(#bl${uid})"/>
    </g>`;
  } else if(st.pattern === 'phoenix'){
    // طائر الليفر (Liver Bird) — هوية ليفربول، أيقونة PNG قدّمها المستخدم
    // (brand-assets.js: LIVERBIRD_ICON_PNG_BASE64)، بنفس أسلوب قناع الأسد أعلاه
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      <mask id="pb${uid}">
        <image href="${LIVERBIRD_ICON_PNG_BASE64}" x="29" y="22" width="43" height="64" style="filter:invert(1)"/>
      </mask>
      <rect x="0" y="0" width="100" height="110" fill="${ac}" mask="url(#pb${uid})"/>
    </g>`;
  } else if(st.pattern === 'checkerCell'){
    // "خلية" مربّعات حمراء/بيضاء صغيرة وسط الدرع — هوية دينامو زغرب، بطلب المستخدم
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      <rect x="34" y="36" width="16" height="16" fill="#fff"/>
      <rect x="50" y="36" width="16" height="16" fill="#CE151C"/>
      <rect x="34" y="52" width="16" height="16" fill="#CE151C"/>
      <rect x="50" y="52" width="16" height="16" fill="#fff"/>
    </g>`;
  } else if(st.pattern === 'psvFlag'){
    // أحمر/أبيض مقلّم + علم أبيض في المنتصف — هوية آيندهوفن (PSV)، بطلب المستخدم
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      <rect x="16" y="0" width="16" height="110" fill="${ac}"/>
      <rect x="48" y="0" width="16" height="110" fill="${ac}"/>
      <rect x="80" y="0" width="16" height="110" fill="${ac}"/>
      <rect x="46" y="34" width="3" height="34" fill="#fff"/>
      <path d="M49 34 L70 40 L49 46 Z" fill="#fff"/>
    </g>`;
  } else if(st.pattern === 'fenerLeaf'){
    // ثلاث حزم أفقية (أصفر أعلى، كحلي وسط، أحمر أسفل) ونخلة بيضاء في المنتصف
    // — هوية فنربخشة، بطلب المستخدم بدل التقسيم القطري وورقة الشجرة الخضراء
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      <rect x="0" y="0" width="100" height="37" fill="${ac}"/>
      <rect x="0" y="37" width="100" height="36" fill="#00285E"/>
      <rect x="0" y="73" width="100" height="37" fill="#E4002B"/>
      <path d="M50 58 C48 44 48 30 50 18 C52 30 52 44 50 58 Z" fill="#fff"/>
      <path d="M50 60 C38 56 28 46 24 34 C34 40 44 48 50 58 Z" fill="#fff"/>
      <path d="M50 60 C62 56 72 46 76 34 C66 40 56 48 50 58 Z" fill="#fff"/>
      <path d="M50 60 C34 60 20 54 12 44 C24 46 38 52 50 58 Z" fill="#fff"/>
      <path d="M50 60 C66 60 80 54 88 44 C76 46 62 52 50 58 Z" fill="#fff"/>
      <path d="M48 95 L46 65 L50 60 L54 65 L52 95 Z" fill="#fff"/>
    </g>`;
  } else if(st.pattern === 'cannon'){
    // مدفع — هوية أرسنال (The Gunners)، أيقونة PNG قدّمها المستخدم
    // (brand-assets.js: CANNON_ICON_PNG_BASE64)، بنفس أسلوب قناع الأسد أعلاه
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      <mask id="cn${uid}">
        <image href="${CANNON_ICON_PNG_BASE64}" x="18" y="22" width="64" height="64" style="filter:invert(1)"/>
      </mask>
      <rect x="0" y="0" width="100" height="110" fill="${ac}" mask="url(#cn${uid})"/>
    </g>`;
  } else if(st.pattern === 'eagle'){
    // نسر/صقر مفرود الجناحين — هوية بنفيكا، بطلب المستخدم
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      <path d="M50 34 C42 38 26 40 14 52 C24 50 32 52 38 58 L44 50 L50 58 L56 50 L62 58 C68 52 76 50 86 52 C74 40 58 38 50 34 Z" fill="${ac}"/>
      <circle cx="50" cy="30" r="5" fill="${ac}"/>
    </g>`;
  } else {
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      <path d="M50 18 L64 44 L50 58 L36 44 Z" fill="${ac}" opacity="0.28"/>
    </g>`;
  }

  // إطار الدرع: يُرسم أولًا درع كامل معبأ بالذهبي (لون افتراضي/مخصص قديم
  // بـ strokeCol، لكن قاعدة CSS أعلاه .crest .crest-border تطغى عليه دائمًا
  // بالذهبي الموحّد)، وفوقه درع أصغر (مُصغَّر من المنتصف) فيه ألوان النادي
  // الفعلية (خلفية + نمط) مقصوصة بـ clip-path على مقاس الدرع الأصغر نفسه —
  // فيبقى هامش ذهبي واضح ومضمون هندسيًا حول كل الألوان بأي حجم عرض (حتى
  // أصغر مقاس مستخدم بأي قائمة)، بدل الاعتماد على خط حد رفيع فوق قص قد
  // يترك شعرة بكسل من لون الخلفية خارج الإطار بالأحجام الصغيرة جدًا.
  const strokeCol = st.border || 'rgba(0,0,0,0.55)';
  const INSET = 'translate(50,56) scale(0.82) translate(-50,-56)';

  // لمعة زجاجية خفيفة أعلى الدرع — تعطي إحساس "شارة" مصقولة بدل تلوين مسطّح.
  // تدرّج محلي داخل نفس
  // الـ<svg> (لا مرجع خارجي) عمدًا — الموقع يستخدم html2canvas لتصدير صور
  // (كرت البطل، تحميل الجداول...)، ومراجع SVG بين وثائق/عناصر منفصلة غالبًا
  // ما تفشل بالتصدير؛ التدرّج المحلي هنا يبقى يعمل دائمًا لأنه جزء من نفس
  // الـ<svg> المُلتقَط.
  const glossId = 'gl' + uid;

  // حرف/اختصار مركزي مطلوب صراحة لأندية معيّنة فقط (H للقادسية، F لفاينورد،
  // FCP لبورتو، BVB لدورتموند، M لمارسيليا) — يُرسم فوق النمط الأساسي (وليس
  // بدلاً عنه)، بخلاف الاختصار العام اللي أُزيل من كل الدروع سابقًا بطلب
  // المستخدم؛ هذا استثناء صريح لهوية كل نادٍ من هذي الخمسة تحديدًا.
  const monogramSVG = st.monogram
    ? `<text x="50" y="68" text-anchor="middle" font-family="Tajawal, Arial, sans-serif" font-size="${st.monogram.length > 2 ? 26 : st.monogram.length > 1 ? 34 : 42}" font-weight="900" fill="${st.monogramColor || ac}" stroke="rgba(0,0,0,0.35)" stroke-width="0.8" paint-order="stroke">${st.monogram}</text>`
    : '';

  return `<svg class="crest" width="${px}" height="${px*1.1}" viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${name}">
    <defs>
      <clipPath id="sh${uid}">
        <path d="M6 6 H94 V58 C94 84 74 99 50 106 C26 99 6 84 6 58 Z" transform="${INSET}"/>
      </clipPath>
      <linearGradient id="${glossId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fff" stop-opacity="0.38"/>
        <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <title>${name}</title>
    <path class="crest-border" d="M6 6 H94 V58 C94 84 74 99 50 106 C26 99 6 84 6 58 Z" fill="${strokeCol}"/>
    ${pattern}
    <g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="46" fill="url(#${glossId})"/>
    </g>
    ${monogramSVG}
  </svg>`;
}

function clubBadgeHTML(name, size){
  const px = size==='sm' ? 30 : 44;
  const cls = size==='sm' ? 'club-mini sm' : 'club-mini';
  return `<div class="${cls}">
    ${clubCrestSVG(name, px)}
    <div class="club-name">${name}</div>
  </div>`;
}

function computeRoundGoals(round, pid){
  const entries = (round.entries && round.entries[pid]) || [];
  let gf=0, ga=0;
  entries.forEach(e=>{ gf += Number(e.gf)||0; ga += Number(e.ga)||0; });
  return {gf, ga};
}

function getRoundHeroes(){
  const roundPoints = getCurrentRoundPointsMap();
  const full = computeStandings();
  const roundNum = getCurrentRoundNumber();

  let top = null, mummat = [], bestStreak = null;
  let maxPts = -Infinity;
  // آخر جولة حقيقية (إن وُجدت) — تُستخدم لاستثناء مشارك بلا مباراة فعلية هذه
  // الجولة (كل أنديته "لا توجد مباراة") من قائمة "ممات الجولة"، بدل عدّه كأنه
  // لعب وسجّل صفرًا (طلب المستخدم 16 سبتمبر 2026).
  const lastRoundForHeroes = DATA.rounds.length ? DATA.rounds[DATA.rounds.length-1] : null;
  PARTICIPANTS.forEach(p=>{
    const pts = roundPoints[p.id];
    if(pts > maxPts) maxPts = pts;
    if((!JOINED_AFTER_ROUND1[p.id] && !JOINED_AFTER_ROUND2[p.id]) || DATA.rounds.length>0){
      const playedThisRound = lastRoundForHeroes ? round_has_entries(lastRoundForHeroes, p.id) : true;
      if(pts===0 && playedThisRound) mummat.push(p.name);
    }
  });

  const tied = PARTICIPANTS.filter(p=> roundPoints[p.id] === maxPts);
  if(tied.length <= 1){
    const w = tied[0];
    top = {id:w.id, name:w.name, points:maxPts, teams:w.teams};
  } else if(ROUND_HERO_OVERRIDE[roundNum]){
    const w = PARTICIPANTS.find(p=> p.id === ROUND_HERO_OVERRIDE[roundNum]);
    top = {id:w.id, name:w.name, points:maxPts, teams:w.teams, tieBreak:true};
  } else if(DATA.rounds.length > 0){
    // كسر تعادل تلقائي لجولات 3+: الأكثر أهدافًا ثم الأقل استقبالًا
    const last = DATA.rounds[DATA.rounds.length-1];
    const sorted = tied.slice().sort((a,b)=>{
      const ga_ = computeRoundGoals(last, a.id), gb_ = computeRoundGoals(last, b.id);
      if(gb_.gf !== ga_.gf) return gb_.gf - ga_.gf;
      if(ga_.ga !== gb_.ga) return ga_.ga - gb_.ga;
      return a.name.localeCompare(b.name,'ar');
    });
    const w = sorted[0];
    top = {id:w.id, name:w.name, points:maxPts, teams:w.teams, tieBreak:true};
  } else {
    const w = tied[0];
    top = {id:w.id, name:w.name, points:maxPts, teams:w.teams, tieBreak:true};
  }

  full.forEach(s=>{
    if(!bestStreak || s.streak > bestStreak.streak) bestStreak = {name:s.name, streak:s.streak};
  });
  return {roundNumber:getCurrentRoundNumber(), top, mummat, bestStreak};
}

// ---------- إحصائيات الأندية ----------
// الأساس: بيانات الموسم الحقيقية حتى 2 سبتمبر 2026 (CLUB_SEASON_STATS)،
// وتُضاف عليها أي جولات فانتازي حقيقية أُدخلت لاحقًا من تبويب المنظم
// (من الجولة 3 فصاعدًا) حتى تبقى الإحصائيات محدَّثة ودقيقة دائمًا.
// نادٍ مشترك بين عدة مشاركين تُضمن نتيجته موحّدة بينهم عبر syncSharedClub()
// (نفس المباراة الحقيقية تُنسخ حرفيًا لكل مالك). لذا عند تجميع إحصائيات نادٍ
// عبر كل الجولات يكفي أخذ تسجيل أول مالك له بكل جولة فقط — وإلا تُحتسب نفس
// المباراة N مرة (بعدد الملاك)، وهذا سبب خطأ "الهلال خسر 7 مرات" المُبلَّغ
// عنه رغم أن الهلال خاض مباريات أقل بكثير (7 سبتمبر 2026).
function getClubRoundResults(clubName){
  const owner = PARTICIPANTS.find(p=> p.teams.includes(clubName));
  if(!owner) return [];
  const idx = owner.teams.indexOf(clubName);
  const results = [];
  DATA.rounds.forEach(r=>{
    const entries = (r.entries && r.entries[owner.id]) || [];
    // نادٍ قد يلعب أكثر من مباراة بنفس الجولة (منذ 5 سبتمبر 2026) — هذه مباريات
    // حقيقية متعددة لنفس المالك، فتُحتسب كلها (ليست تكرارًا).
    getTeamRoundEntries(entries, idx).forEach(e=>{
      // "لا توجد مباراة" (no_match) ليست مباراة فعلية لهذا النادي — تُستثنى من
      // عدّاد "لعب X مباراة" وإحصائيات الأداء، وإلا احتُسب النادي كأنه خسر/تعادل
      // في جولة لم يخض فيها أصلًا (طلب المستخدم 16 سبتمبر 2026).
      if(e && e.result && e.result !== 'no_match') results.push(e.result);
    });
  });
  return results;
}

function getClubStats(){
  const map = {};
  PARTICIPANTS.forEach(p=>{
    p.teams.forEach(t=>{
      if(!map[t]){
        const base = CLUB_SEASON_STATS[t] || {played:0, w:0, d:0, l:0, pts:0};
        map[t] = {name:t, played:base.played, pts:base.pts, w:base.w, d:base.d, l:base.l, owners:new Set()};
      }
      map[t].owners.add(p.name);
    });
  });
  Object.keys(map).forEach(t=>{
    getClubRoundResults(t).forEach(result=>{
      map[t].played++;
      map[t].pts += RESULT_POINTS[result] || 0;
      if(result==='win') map[t].w++;
      else if(result==='draw') map[t].d++;
      else map[t].l++;
    });
  });
  return Object.values(map)
    .map(c=>({...c, ownersCount:c.owners.size, avg: c.played? (c.pts/c.played):0}))
    .sort((a,b)=> b.pts - a.pts || b.avg - a.avg);
}

// نص مختصر لبيانات لعب نادٍ واحد (لعب/فاز/تعادل/خسر) لعرضه في القوائم المنسدلة
// — يجمع قاعدة الجسر الثابتة (CLUB_SEASON_STATS، جولتا 1-2) مع كل جولات
// DATA.rounds الفعلية (3+)، بنفس منطق إزالة التكرار في getClubStats أعلاه.
function clubPlayLine(name){
  const base = CLUB_SEASON_STATS[name] || {played:0, w:0, d:0, l:0, pts:0};
  let played = base.played, w = base.w, d = base.d, l = base.l, pts = base.pts;
  getClubRoundResults(name).forEach(result=>{
    played++;
    pts += RESULT_POINTS[result] || 0;
    if(result==='win') w++;
    else if(result==='draw') d++;
    else l++;
  });
  if(!played) return 'لم تبدأ مبارياته بعد';
  return `لعب ${played} · فاز ${w} · تعادل ${d} · خسر ${l} · ${pts} نقطة`;
}
