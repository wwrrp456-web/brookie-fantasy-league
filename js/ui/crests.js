/* شعارات الأندية والشعار (001-T012، plan.md D1 وD4): crestHTML(club, size) وdrawCrest(ctx, …) وpreloadCrests().
 *
 * ثلاثة مصادر للشعار، بالترتيب (R-04: قرار الشعارات الرسمية بيد المنظّم بدون برمجة):
 *   1) CRESTS_OFFICIAL[slug]  شعار رسمي يضعه المنظّم في assets/crests/official/<slug>.svg
 *   2) CRESTS[slug]           الشعار المحسّن (assets/crests/<slug>.svg)، وله نسخة فاتحة CRESTS_LIGHT[slug] تُختار في الوضع الفاتح (001-T012b)
 *   3) درع احتياطي مبنيّ من CLUB_STYLE (النمط والألوان) لنادٍ ما له ملف
 * الاسم ← slug من CREST_NAMES (assets/crests.json). كلها من js/generated/assets.js (يُحمَّل قبل هذا الملف).
 *
 * الشعار يُعرض كـ<img> بعنوان blob: يُنشأ مرة وحدة لكل نادٍ ويُخزَّن: الـ<img> يعزل المعرّفات والألوان فما تتأثر
 * بقواعد CSS مثل .crest .crest-border (تنبيه مراجعة T06)، والـHTML يبقى صغيرًا (ما نكرر الـSVG مئات المرات).
 * وبنفس الآلية تُقدَّم الشعارات (قياسًا بـ<img>) لـhtml2canvas والكانفس بلا تلويث (same-origin). */

const CREST_RATIO = 1.1;                 // ارتفاع الدرع = العرض × 1.1 (viewBox 100×110)
const BORDER = '#9B7BF5';                // الإطار الذهبي الموحّد للدرع الاحتياطي (كان يلوّنه .crest-border بالـCSS)
// الرموز المتجهة المستعملة في الدرع الاحتياطي. الـviewBox كامل لمن كانت صورته PNG مربعة 512، ومحصور على الشكل
// (bbox) لمن كانت صورته بنسبتها الأصلية (قياسات حُسبت من المسارات بـgetBBox).
const MOTIF_VIEWBOX = {
  clover: '1.92 5.81 1163.73 1157.19', eagle: '1.12 490.32 1438.88 463.97', galatasaray: '34.09 1 167.4 232.66',
  liverbird: '775.47 6.14 3176.46 4712.03', ship: '1.04 89.7 330.38 151.84'
};

const _crestUrls = new Map();            // مفتاح (مصدر|slug|اسم) ← عنوان الـ<img>
const _crestImgs = new Map();            // اسم النادي ← Image محمّلة (للكانفس)
let _slugByName = null;

const esc = v => (typeof escapeHtml === 'function') ? escapeHtml(v) : String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function _slugOf(club){
  if(!_slugByName){
    _slugByName = {};
    Object.keys(CREST_NAMES).forEach(slug => { _slugByName[CREST_NAMES[slug]] = slug; });
  }
  return _slugByName[club] || null;
}

// عنوان صالح لـ<img>/Image من نص SVG: blob: لو متاح (أخف وأسرع)، وإلا data:
function svgToURL(svg){
  try{
    if(typeof Blob !== 'undefined' && typeof URL !== 'undefined' && URL.createObjectURL){
      return URL.createObjectURL(new Blob([svg], {type: 'image/svg+xml'}));
    }
  }catch(e){ /* نرجع لـdata: */ }
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// رمز متجه ملوّن بـfill داخل <svg> متداخل بنفس موضع وحجم صورة PNG القديمة (x, y, w, h)
function motifSVG(name, fill, x, y, w, h){
  const svg = MOTIFS[name];
  if(!svg) return '';
  const vb = MOTIF_VIEWBOX[name] || (svg.match(/viewBox="([^"]+)"/) || [])[1] || '0 0 512 512';
  const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${vb}" preserveAspectRatio="xMidYMid meet" fill="${fill}">${inner}</svg>`;
}

// ───────────── المصدر 3: الدرع الاحتياطي من CLUB_STYLE ─────────────
// يبني درع SVG بهوية بصرية لكل نادٍ (نمط + ألوان مميّزة، بلا اختصارات نصية داخل الدرع)، وكان دالة قديمة بالاسم القديم في
// club-engine.js. الأقنعة المبنية على صور PNG (base64) صارت رموزًا متجهة من MOTIFS.
function fallbackCrestSVG(name){
  const st = CLUB_STYLE[name] || {bg:'#1A1A1A', fg:'#E7C158', pattern:'solid', accent:'#E7C158'};
  const uid = 'f';   // الـ<svg> مستقل داخل <img>، فالمعرّفات معزولة وما تحتاج تفرّد عالمي
  const bg = st.bg, ac = st.accent || st.fg;

  let pattern = '';
  if(st.pattern === 'stripes'){
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      <rect x="16" y="0" width="16" height="110" fill="${ac}"/>
      <rect x="48" y="0" width="16" height="110" fill="${ac}"/>
      <rect x="80" y="0" width="16" height="110" fill="${ac}"/>
    </g>`;
  } else if(st.pattern === 'atleticoStripes'){
    // خلفية كحلية + خطوط رأسية بيضاء وحمراء متبادلة، مع قص الجزء العلوي
    // بشكل مائل — هوية أتلتيكو مدريد، بطلب المستخدم
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      <clipPath id="atc${uid}">
        <polygon points="0,60 100,20 100,110 0,110"/>
      </clipPath>
      <g clip-path="url(#atc${uid})">
        <rect x="0" y="0" width="20" height="110" fill="white"/>
        <rect x="20" y="0" width="20" height="110" fill="${ac}"/>
        <rect x="40" y="0" width="20" height="110" fill="white"/>
        <rect x="60" y="0" width="20" height="110" fill="${ac}"/>
        <rect x="80" y="0" width="20" height="110" fill="white"/>
      </g>
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
    // (رمز متجه من MOTIFS)، بنفس أسلوب رمز الأسد أعلاه
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      ${motifSVG('eiffel', ac, 18, 22, 64, 64)}
    </g>`;
  } else if(st.pattern === 'hoops'){
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      <rect x="0" y="14" width="100" height="15" fill="${ac}"/>
      <rect x="0" y="44" width="100" height="15" fill="${ac}"/>
      <rect x="0" y="74" width="100" height="15" fill="${ac}"/>
    </g>`;
  } else if(st.pattern === 'clover'){
    // ورقة برسيم رباعية — هوية سلتيك، أيقونة PNG قدّمها المستخدم
    // (رمز متجه من MOTIFS)، بنفس أسلوب رمز الأسد أعلاه
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      ${motifSVG('clover', ac, 18, 22, 64, 64)}
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
    // (رمز متجه من MOTIFS)، بنفس أسلوب رمز الأسد أعلاه
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      ${motifSVG('saudi-map', ac, 20, 24, 60, 60)}
    </g>`;
  } else if(st.pattern === 'ship'){
    // سفينة شراعية — هوية مانشستر سيتي التاريخية (قناة مانشستر الملاحية)،
    // أيقونة PNG قدّمها المستخدم (رمز متجه من MOTIFS)، فوق
    // خلفية بلونين: أبيض أعلى وسماوي أسفل، بطلب المستخدم
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="55" fill="white"/>
      <rect x="0" y="55" width="100" height="55" fill="${bg}"/>
      ${motifSVG('ship', ac, 18, 40, 64, 29)}
    </g>`;
  } else if(st.pattern === 'lion'){
    // أيقونة أسد جاهزة قدّمها المستخدم (صورة PNG محوّلة base64 بـ
    // رمز متجه من MOTIFS) بدل رسمة متجهية — لهوية أندية
    // شعارها أسد (رينجرز، سبورتينغ لشبونة...). الصورة أصلًا أسد أسود على
    // خلفية شفافة؛ نستخدمها كـmask (بعد عكس الألوان invert(1) لأن قناع SVG
    // الافتراضي يُظهر المناطق الفاتحة ويُخفي الداكنة — عكس ما نريد)، ونملأ
    // الشكل الناتج بلون هوية النادي بدل الأسود الثابت، فيتلوّن الأسد تلقائيًا
    // حسب كل نادٍ.
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      ${motifSVG('lion', ac, 18, 22, 64, 64)}
    </g>`;
  } else if(st.pattern === 'wolf'){
    // رأس ذئبة عاوية — هوية روما (أسطورة ذئبة الكابيتول)، أيقونة PNG قدّمها
    // المستخدم (رمز متجه من MOTIFS)، بنفس أسلوب قناع الأسد
    // أعلاه (invert(1) لأن قناع SVG الافتراضي يُظهر الفاتح ويُخفي الداكن).
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      ${motifSVG('wolf', ac, 18, 20, 64, 64)}
    </g>`;
  } else if(st.pattern === 'lock'){
    // شعار GS 1905 — هوية غلطة سراي، أيقونة PNG قدّمها المستخدم
    // (رمز متجه من MOTIFS)، بنفس أسلوب رمز الأسد أعلاه
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      ${motifSVG('galatasaray', ac, 27, 22, 46, 64)}
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
    // (رمز متجه من MOTIFS)، بنفس أسلوب رمز الأسد أعلاه
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      ${motifSVG('ball', ac, 18, 22, 64, 64)}
    </g>`;
  } else if(st.pattern === 'phoenix'){
    // طائر الليفر (Liver Bird) — هوية ليفربول، أيقونة PNG قدّمها المستخدم
    // (رمز متجه من MOTIFS)، بنفس أسلوب رمز الأسد أعلاه
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      ${motifSVG('liverbird', ac, 29, 22, 43, 64)}
    </g>`;
  } else if(st.pattern === 'checkerCell'){
    // "خلية" مربّعات حمراء/بيضاء صغيرة وسط الدرع — هوية دينامو زغرب، بطلب المستخدم
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      <rect x="34" y="36" width="16" height="16" fill="white"/>
      <rect x="50" y="36" width="16" height="16" fill="#CE151C"/>
      <rect x="34" y="52" width="16" height="16" fill="#CE151C"/>
      <rect x="50" y="52" width="16" height="16" fill="white"/>
    </g>`;
  } else if(st.pattern === 'psvFlag'){
    // أحمر/أبيض مقلّم + علم أبيض في المنتصف — هوية آيندهوفن (PSV)، بطلب المستخدم
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      <rect x="16" y="0" width="16" height="110" fill="${ac}"/>
      <rect x="48" y="0" width="16" height="110" fill="${ac}"/>
      <rect x="80" y="0" width="16" height="110" fill="${ac}"/>
      <rect x="46" y="34" width="3" height="34" fill="white"/>
      <path d="M49 34 L70 40 L49 46 Z" fill="white"/>
    </g>`;
  } else if(st.pattern === 'fenerLeaf'){
    // ثلاث حزم أفقية (أصفر أعلى، كحلي وسط، أحمر أسفل) ونخلة بيضاء في المنتصف
    // — هوية فنربخشة، بطلب المستخدم بدل التقسيم القطري وورقة الشجرة الخضراء
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      <rect x="0" y="0" width="100" height="37" fill="${ac}"/>
      <rect x="0" y="37" width="100" height="36" fill="#00285E"/>
      <rect x="0" y="73" width="100" height="37" fill="#E4002B"/>
      <path d="M50 58 C48 44 48 30 50 18 C52 30 52 44 50 58 Z" fill="white"/>
      <path d="M50 60 C38 56 28 46 24 34 C34 40 44 48 50 58 Z" fill="white"/>
      <path d="M50 60 C62 56 72 46 76 34 C66 40 56 48 50 58 Z" fill="white"/>
      <path d="M50 60 C34 60 20 54 12 44 C24 46 38 52 50 58 Z" fill="white"/>
      <path d="M50 60 C66 60 80 54 88 44 C76 46 62 52 50 58 Z" fill="white"/>
      <path d="M48 95 L46 65 L50 60 L54 65 L52 95 Z" fill="white"/>
    </g>`;
  } else if(st.pattern === 'cannon'){
    // مدفع — هوية أرسنال (The Gunners)، أيقونة PNG قدّمها المستخدم
    // (رمز متجه من MOTIFS)، بنفس أسلوب رمز الأسد أعلاه
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      ${motifSVG('cannon', ac, 18, 22, 64, 64)}
    </g>`;
  } else if(st.pattern === 'eagle'){
    // نسر مفرود الجناحين — هوية بنفيكا، أيقونة PNG قدّمها المستخدم
    // (رمز متجه من MOTIFS)، بنفس أسلوب رمز الأسد أعلاه
    pattern = `<g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="110" fill="${bg}"/>
      ${motifSVG('eagle', ac, 18, 44, 64, 21)}
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

  return `<svg width="100" height="110" viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(name)}">
    <defs>
      <clipPath id="sh${uid}">
        <path d="M6 6 H94 V58 C94 84 74 99 50 106 C26 99 6 84 6 58 Z" transform="${INSET}"/>
      </clipPath>
      <linearGradient id="${glossId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="white" stop-opacity="0.38"/>
        <stop offset="100%" stop-color="white" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <title>${esc(name)}</title>
    <path d="M6 6 H94 V58 C94 84 74 99 50 106 C26 99 6 84 6 58 Z" fill="${BORDER}"/>
    ${pattern}
    <g clip-path="url(#sh${uid})">
      <rect x="0" y="0" width="100" height="46" fill="url(#${glossId})"/>
    </g>
    ${monogramSVG}
  </svg>`;
}

// ───────────── الواجهة العامة ─────────────
// الثيم المطلوب: opts.theme ('light'|'dark') صراحةً، وإلا من الصفحة (html.light-mode). بدون صفحة (اختبارات/عقدة) = dark
function _crestTheme(opts){
  if(opts && (opts.theme === 'light' || opts.theme === 'dark')) return opts.theme;
  return (typeof document !== 'undefined' && document.documentElement && document.documentElement.classList.contains('light-mode')) ? 'light' : 'dark';
}

// {kind: 'official'|'enhanced'|'fallback', slug, theme, svg} لنادٍ. الأولوية: رسمي ← محسّن (بنسخته للثيم) ← احتياطي.
// النسخة الفاتحة للمحسّن فقط (لو ما لقينا فاتحة نرجع للعادية). الرسمي والاحتياطي ما لهما نسخ فاتحة.
function crestSource(club, opts){
  const slug = _slugOf(club);
  const theme = _crestTheme(opts);
  if(slug && CRESTS_OFFICIAL[slug]) return {kind: 'official', slug, theme, svg: CRESTS_OFFICIAL[slug]};
  if(slug && CRESTS[slug]){
    const lightSvg = theme === 'light' ? CRESTS_LIGHT[slug] : null;
    return {kind: 'enhanced', slug, theme, variant: lightSvg ? 'light' : 'dark', svg: lightSvg || CRESTS[slug]};
  }
  return {kind: 'fallback', slug, theme, svg: fallbackCrestSVG(club)};
}

function crestURL(club, opts){
  const src = crestSource(club, opts);
  const key = src.kind + '|' + (src.slug || '') + '|' + (src.kind === 'fallback' ? club : '') + '|' + (src.variant || '');
  if(!_crestUrls.has(key)) _crestUrls.set(key, svgToURL(src.svg));
  return _crestUrls.get(key);
}

// <img> بدل <svg> مضمّن: يعزل المعرّفات والألوان. الأبعاد صريحة (بدون قفز تخطيط)، والاسم alt وtitle.
// بدون opts.theme يتبع الصفحة، ويحمل data-crest-club ليتبدّل مع الثيم بدون إعادة تحميل (refreshCrestsTheme)
function crestHTML(club, size, opts){
  const w = Number(size) || 24;
  const h = Math.round(w * CREST_RATIO * 100) / 100;
  const name = esc(club);
  const auto = (opts && opts.theme) ? '' : ` data-crest-club="${name}"`;
  return `<img class="crest" src="${crestURL(club, opts)}" width="${w}" height="${h}" alt="${name}" title="${name}"${auto} decoding="async">`;
}

// عند تبديل الثيم: يبدّل src لكل شعار تلقائي معروض (بلا إعادة رسم الأقسام)
function refreshCrestsTheme(){
  if(typeof document === 'undefined') return;
  document.querySelectorAll('img.crest[data-crest-club]').forEach(img => {
    const club = img.getAttribute('data-crest-club');
    const url = crestURL(club);
    if(img.getAttribute('src') !== url) img.setAttribute('src', url);
  });
}

// يحمّل صور كل الأندية (أو القائمة المعطاة) مرة وحدة ويخزّنها للرسم على الكانفس. يرجع Promise<Map>
// opts.theme يحدد النسخة (الافتراضي: ثيم الصفحة). الذاكرة بمفتاح النادي|الثيم
function _imgKey(club, opts){ return club + '|' + _crestTheme(opts); }
function preloadCrests(clubs, opts){
  const list = clubs || Object.keys(CLUB_STYLE).concat(Object.values(CREST_NAMES)).filter((v, i, a) => a.indexOf(v) === i);
  return Promise.all(list.map(club => new Promise(resolve => {
    const k = _imgKey(club, opts);
    if(_crestImgs.has(k)) return resolve(_crestImgs.get(k));
    const img = new Image();
    img.onload = () => { _crestImgs.set(k, img); resolve(img); };
    img.onerror = () => resolve(null);
    img.src = crestURL(club, opts);
  }))).then(() => _crestImgs);
}

// يرسم شعار النادي على كانفس بالعرض w (والارتفاع w×1.1). يرجع false لو الشعار ما حُمّل بعد (استدعِ preloadCrests أولًا بنفس opts).
// opts.theme: محرك الكروت يمرّره صراحةً ('light' لبطاقة الترتيب النهارية)
function drawCrest(ctx, club, x, y, w, h, opts){
  const img = _crestImgs.get(_imgKey(club, opts));
  if(!img || !img.complete || !img.naturalWidth) return false;
  ctx.drawImage(img, x, y, w, h === undefined ? w * CREST_RATIO : h);
  return true;
}

// الشعار الرئيسي: الداكن = الأبيض الأحادي (نفس الهيدر الداكن)، والفاتح = الملوّن (نصه الكحلي ← أبيض لأن الهيدر داكن بكل الأوضاع)
function logoURL(light){
  const key = 'logo|' + (light ? 'light' : 'dark');
  if(!_crestUrls.has(key)){
    const svg = light ? LOGO_SVG.logoLight : LOGO_SVG.logo;
    _crestUrls.set(key, svgToURL(svg));
  }
  return _crestUrls.get(key);
}

// للاختبارات: يمسح الذاكرة (بعد تعديل CRESTS_OFFICIAL مثلًا)
function resetCrestCache(){ _crestUrls.clear(); _crestImgs.clear(); _slugByName = null; }

// الشعار الأولي في الترويسة (كان ملف الشعارات المضمَّنة القديم يضبطه). applyLightModePref تبدّله لاحقًا مع الوضع
(function(){
  if(typeof document === 'undefined') return;
  const el = document.getElementById('logoImg');
  if(el) el.src = logoURL(false);
  const mark = document.getElementById('logoMark');
  if(mark) mark.src = svgToURL(LOGO_SVG.mark);
  const contribute = document.getElementById('contributeLink');
  if(contribute) contribute.innerHTML = ICONS.edit;
  document.querySelectorAll('[data-icon]').forEach(el => { if(ICONS[el.dataset.icon]) el.innerHTML = ICONS[el.dataset.icon]; });
  const more = document.getElementById('tabMoreBtn');
  if(more) more.innerHTML = ICONS['chevron-left'];
})();

