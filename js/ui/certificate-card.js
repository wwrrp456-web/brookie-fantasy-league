/* شهادة بطل الموسم «ختم البطولة» 1080×1350 (001-T023c/T026، R-19، C16): بنسختين ليلية ونهارية. تحل محل buildChampionCertificateCanvas القديمة.
 * المواصفة الرقمية: assets/cards/cards.layout.md (قسم certificate-post) بالحرف، والقالب assets/cards/certificate-post.html.
 * لا رأس الكروت الخمسة ولا تذييل النقاط (التصميم المعتمد). الاعتماد: card-kit.js وcard-io.js وstandings-card.js (نافذة الوضع) وwrap-profile-cards.js (exportThemedCard) وar-format.js.
 * الألوان من card-themes.js فقط. صفر إيموجي. أرقام التاريخ لاتينية (formatDate). */

const CERT_W = 1080, CERT_H = 1350;
// نصوص الشهادة المعتمدة (certificate-ideas/data.json): لقب الموسم والتقدير والتوقيع ثابتة، والاسم من بطل الموسم، والتاريخ ساعة الإصدار.
const CERT_SEASON_TITLE = 'بطل الموسم الأول من دوري بروكي الفانتازي';
const CERT_APPRECIATION = 'تقديرًا لمشاركته المتميزة وتتويجه بطلًا للموسم الأول.';
const CERT_SIGNATURE = 'إدارة دوري بروكي الفانتازي';
const CERT_CORNER_PATH = 'M80 0H0v80 M68 12H12v56 M80 24H24v56 M40 0v40H0';

// 000-T02 (F-05): نواقص بيانات الشهادة. قائمة فاضية = الشهادة صالحة للتصدير.
function validateCertificateData(champId, participants){
  const id = (champId === undefined) ? CHAMPION_ID : champId;
  const list = participants || PARTICIPANTS;
  const issues = [];
  if(id === null || id === undefined || id === ''){
    issues.push('لم يُحدَّد بطل الموسم السابق من تبويب المنظّم');
    return issues;
  }
  const champ = list.find(p => p.id === id);
  if(!champ) issues.push('بطل الموسم السابق غير موجود في قائمة المشاركين');
  else if(!String(champ.name || '').trim()) issues.push('اسم بطل الموسم السابق فارغ');
  return issues;
}

// بيانات كانفس الشهادة (للتحقق قبل الرسم): name وseasonTitle وappreciation وsignature وissuedAt (تاريخ صالح)
function validateCertificateCardData(data){
  const out = [];
  if(!data || typeof data !== 'object') return ['لا توجد بيانات للشهادة'];
  if(!String(data.name || '').trim()) out.push('اسم البطل ناقص');
  if(!String(data.seasonTitle || '').trim()) out.push('لقب البطولة ناقص');
  if(!String(data.appreciation || '').trim()) out.push('عبارة التقدير ناقصة');
  if(!String(data.signature || '').trim()) out.push('توقيع الإدارة ناقص');
  if(!data.issuedAt || isNaN(new Date(data.issuedAt).getTime())) out.push('تاريخ الإصدار غير صالح');
  return out;
}

// بيانات من الموقع: بطل الموسم السابق (CHAMPION_ID) مع النصوص المعتمدة وتاريخ اليوم. يرمي CardDataError لو البطل غير صالح.
function getCertificateCardData(){
  const issues = validateCertificateData();
  if(issues.length) throw new CardDataError(issues);
  const champ = PARTICIPANTS.find(p => p.id === CHAMPION_ID);
  return {name: champ.name, seasonTitle: CERT_SEASON_TITLE, appreciation: CERT_APPRECIATION, signature: CERT_SIGNATURE, issuedAt: new Date().toISOString()};
}

// يرسم الشهادة: opts {theme, data}. الشهادة الناقصة ما تُصدَّر (CardDataError).
async function buildChampionCertificateCanvas(opts){
  const o = opts || {};
  const theme = cardResolveTheme(o.theme);
  const data = o.data || getCertificateCardData();
  const problems = validateCertificateCardData(data);
  if(problems.length) throw new CardDataError(problems);

  await cardFontsReady([[26, 400], [28, 400], [30, 400], [34, 400], [24, 400], [64, 800], [88, 800]]);
  const cv = document.createElement('canvas');
  cv.width = CERT_W; cv.height = CERT_H;
  const ctx = cv.getContext('2d');

  const text = cardColor(theme, 'text'), text2 = cardColor(theme, 'text-2'), gold = cardColor(theme, 'gold');
  const light = theme === 'light';
  const award = light ? cardMix(gold, text, 0.34) : gold;
  const frame = light ? cardMix(gold, text, 0.55) : gold;
  const frame3 = `rgba(${cardParseHex(gold).join(',')},0.24)`;   // mix24(gold, شفاف)

  // الخلفية: ملء صلب من --c-bg (بلا صورة ولا ظل)
  ctx.fillStyle = cardColor(theme, 'bg');
  ctx.fillRect(0, 0, CERT_W, CERT_H);

  // ---- الإطارات الثلاثة (حدود داخل الصناديق، زوايا قائمة)
  ctx.strokeStyle = frame; ctx.lineWidth = 2; ctx.strokeRect(33, 33, 1014, 1284);
  ctx.lineWidth = 1; ctx.strokeRect(44.5, 44.5, 991, 1261);
  ctx.strokeStyle = frame3; ctx.lineWidth = 1; ctx.strokeRect(56.5, 56.5, 967, 1237);

  // ---- زخارف الزوايا: 4 وحدات 80×80، stroke 2، مقصوصة لمربعها، مدوّرة حول مركزها المحلي (40,40)
  const cornerPath = new Path2D(CERT_CORNER_PATH);
  [[911, 89, 0], [89, 89, -90], [89, 1181, 180], [911, 1181, 90]].forEach(([x, y, deg]) => {
    ctx.save();
    ctx.translate(x + 40, y + 40); ctx.rotate(deg * Math.PI / 180); ctx.translate(-40, -40);
    ctx.beginPath(); ctx.rect(0, 0, 80, 80); ctx.clip();
    ctx.strokeStyle = frame; ctx.lineWidth = 2; ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
    ctx.stroke(cornerPath);
    ctx.restore();
  });

  // ---- الشعار الكامل 112 عند (484,88)، والعنوان، والكأس 72 عند (504,452)
  await cardDrawLogo(ctx, theme, 484, 88, 112);
  cardTextBase(ctx, 'دوري بروكي الفانتازي', 540, 309, {size: 26, weight: 400, color: text2, align: 'center'});
  cardTextBase(ctx, 'شهادة بطل الموسم', 540, 400, {size: 64, weight: 800, color: text, align: 'center'});
  cardDrawImage(ctx, await cardIconImage('trophy', award, 72), 504, 452, 72, 72);

  // ---- اسم البطل: 88 يبدأ، وينقص 2 حتى يتسع بعرض 888 (الحد 76 بالمواصفة؛ لو ما كفى ننقص بعده حتى 40 كي لا يُقصّ الاسم أبدًا)، بلا transform
  let size = 88;
  const nameW = s => cardTextWidth(ctx, data.name, s, 800);
  while(size > 40 && nameW(size) > 888) size -= 2;
  cardTextBase(ctx, data.name, 540, 618, {size, weight: 800, color: text, align: 'center'});

  cardTextBase(ctx, data.seasonTitle, 540, 734, {size: 34, weight: 400, color: award, align: 'center'});
  cardTextBase(ctx, data.appreciation, 540, 845, {size: 30, weight: 400, color: text2, align: 'center'});

  // ---- فاصل الاعتماد، والختم (مركز 240,1116؛ دائرتان 79 و69.5)، وعلامة P بصندوقها المقاس (80×106.94)
  ctx.fillStyle = frame; ctx.fillRect(144, 996, 792, 1);
  ctx.strokeStyle = frame; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(240, 1116, 79, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(240, 1116, 69.5, 0, Math.PI * 2); ctx.stroke();
  cardDrawImage(ctx, await cardLoadImage('assets/brand/proki-mark.svg'), 200, 1062.53125, 80, 106.9375);

  cardTextBase(ctx, data.signature, 660, 1107, {size: 28, weight: 400, color: text, align: 'center'});
  // تاريخ الإصدار بأرقام لاتينية (formatDate)، نصًّا مختلطًا كاملًا ليطبّق المحرك ترتيب bidi
  cardTextBase(ctx, formatDate(data.issuedAt, {style: 'full'}), 540, 1251, {size: 24, weight: 400, color: text2, align: 'center'});
  return cv;
}

// ---------- التصدير والواجهة (تبويب المنظم: شهادة تكريم حامل اللقب) ----------
function certificateFilename(champId, theme){ return `brookie-champion-certificate-${champId === null || champId === undefined ? 'x' : champId}-${theme}.png`; }

async function showChampionCertificate(){
  const box = document.getElementById('championCertBox');
  if(!box) return;
  const issues = validateCertificateData();
  if(issues.length){
    // بيانات ناقصة: رسالة للمنظّم بدون كانفس ولا أزرار
    box.innerHTML = '';
    const msg = document.createElement('div');
    msg.className = 'status-msg err';
    msg.textContent = 'لا يمكن إنشاء الشهادة: ' + issues[0];
    box.appendChild(msg);
    return;
  }
  box.innerHTML = '<p class="status-msg">جارٍ تجهيز الشهادة…</p>';
  try{
    const cv = await buildChampionCertificateCanvas({theme: getStandingsCardTheme()});
    box.innerHTML = '';
    cv.id = 'championCertCanvas';
    box.appendChild(cv);
    if(CHAMPION_FEATURES.golden_confetti) fireConfetti(['#FFD76A', '#FFB020', '#FFF3C4', '#FFFFFF']);
    const acts = document.createElement('div');
    acts.className = 'champ-actions';
    acts.innerHTML = `<button class="btn" id="shareCertBtn">${ICONS.share} مشاركة</button><button class="btn secondary" id="dlCertBtn">${ICONS.download} تحميل</button>`;
    box.appendChild(acts);
    const msg = document.createElement('div'); msg.className = 'cert-msg'; box.appendChild(msg);
    const spec = {
      subject: 'شهادة البطل',
      say: html => { msg.innerHTML = html; },
      build: async theme => {
        const data = getCertificateCardData();
        const c = await buildChampionCertificateCanvas({theme, data});
        return {cv: c, filename: certificateFilename(CHAMPION_ID, theme), shareTitle: 'شهادة تكريم البطل', shareText: 'دوري بروكي الفانتازي'};
      }
    };
    document.getElementById('dlCertBtn').addEventListener('click', () => exportThemedCard('download', null, spec));
    document.getElementById('shareCertBtn').addEventListener('click', () => exportThemedCard('share', null, spec));
  }catch(e){
    box.innerHTML = '';
    const msg = document.createElement('div');
    msg.className = 'status-msg err';
    msg.textContent = (e && e.name === 'CardDataError') ? 'لا يمكن إنشاء الشهادة: ' + e.problems.join('، ') : 'تعذّر تجهيز الشهادة، حاول مرة ثانية.';
    box.appendChild(msg);
  }
}
