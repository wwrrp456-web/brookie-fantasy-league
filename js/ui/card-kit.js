/* لبنات مشتركة لكروت الكانفس (001-T021، R-17): الثيمان داكن/فاتح، الألوان من css/tokens.css عبر js/generated/card-themes.js
 * (مصدر واحد، بلا ألوان مكرّرة هنا)، والخط والمقاسات، والرأس والتذييل والمنطقة الآمنة، وصف شعارات الأندية، والتحقق من البيانات.
 *
 * كل دالة رسم تأخذ `theme` ('dark'|'light'). بدون معامل: يتبع ثيم الموقع (html.light-mode) عبر cardResolveTheme().
 * الاعتماد: CARD_THEMES (generated)، ICONS وLOGO_SVG (assets.js)، crests.js (logoURL, drawCrest, preloadCrests)، ar-format.js.
 * لا يلمس DOM إلا عبر الصور والخطوط. */

const CARD_FONT = 'Tajawal';
const CARD_SAFE = {x: 64, y: 64, w: 952, h: 1696};        // المنطقة الآمنة لبطاقة 1080×1920

function cardResolveTheme(theme){
  if(theme === 'light' || theme === 'dark') return theme;
  return (typeof document !== 'undefined' && document.documentElement.classList.contains('light-mode')) ? 'light' : 'dark';
}

// لون من رموز الثيم (CSS color string مباشرة للكانفس)
function cardColor(theme, name){
  const t = CARD_THEMES[cardResolveTheme(theme)];
  if(!t || !(name in t)) throw new Error('card-kit: لون غير معروف: ' + name);
  return t[name];
}

// ---------- ألوان: تحليل سداسي، وخلط sRGB مطابق لـ color-mix(in srgb) ----------
function cardParseHex(c){
  const m = /^#([0-9a-f]{6})$/i.exec(String(c).trim());
  if(!m) throw new Error('card-kit: لون سداسي متوقع: ' + c);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
// mix(a, b, p): p من a و(1-p) من b (مثل CSS: color-mix(in srgb, a p%, b))
function cardMix(a, b, p){
  const x = cardParseHex(a), y = cardParseHex(b);
  const ch = i => Math.round(x[i] * p + y[i] * (1 - p));
  return `rgb(${ch(0)}, ${ch(1)}, ${ch(2)})`;
}
// لون الصعود/الهبوط/المركز الأول: كما هو بالليلي، ومخلوط 34% مع النص بالنهاري (مواصفة بطاقة الترتيب)
function cardAccent(theme, name){
  const th = cardResolveTheme(theme);
  const base = cardColor(th, name);
  return th === 'light' ? cardMix(base, cardColor(th, 'text'), 0.34) : base;
}

// ---------- الخط ----------
function cardFont(size, weight){ return `${weight || 400} ${size}px ${CARD_FONT}`; }
async function cardFontsReady(sizes){
  if(typeof document === 'undefined' || !document.fonts) return;
  const specs = (sizes || [[24, 400], [24, 800]]).map(([s, w]) => cardFont(s, w));
  try{ await Promise.all(specs.map(f => document.fonts.load(f, 'أبج ABC 0123'))); await document.fonts.ready; }catch(e){}
}

// خط الأساس: baseline = lineCenterY + (A - D) / 2 حيث A وD أسندا من قياس خط Tajawal (مواصفة "خط الأساس للكانفس")
const _cardBaseCache = new Map();
function cardBaselineOffset(ctx, size, weight){
  const key = size + '|' + weight;
  if(_cardBaseCache.has(key)) return _cardBaseCache.get(key);
  ctx.save();
  ctx.font = cardFont(size, weight);
  const m = ctx.measureText('أبج ABC 0123');
  const A = m.fontBoundingBoxAscent !== undefined ? m.fontBoundingBoxAscent : size * 0.95;
  const D = m.fontBoundingBoxDescent !== undefined ? m.fontBoundingBoxDescent : size * 0.5;
  ctx.restore();
  const off = (A - D) / 2;
  _cardBaseCache.set(key, off);
  return off;
}

// يرسم سطرًا واحدًا بمركز رأسي lineCenterY: opts {size, weight, color, align:'left'|'right'|'center', dir:'rtl'|'ltr'}
function cardText(ctx, text, x, lineCenterY, opts){
  const o = opts || {};
  ctx.save();
  ctx.font = cardFont(o.size, o.weight);
  ctx.fillStyle = o.color;
  ctx.direction = o.dir || 'rtl';
  ctx.textAlign = o.align || 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(String(text), x, lineCenterY + cardBaselineOffset(ctx, o.size, o.weight || 400));
  ctx.restore();
}
function cardTextWidth(ctx, text, size, weight){
  ctx.save(); ctx.font = cardFont(size, weight); const w = ctx.measureText(String(text)).width; ctx.restore();
  return w;
}

// نص طويل: يلتفّ على الأسطر (حتى maxLines) وبلا كلمة يتيمة بالسطر الأخير (يوازن آخر سطرين)، وإن ما كفى ينكمش الخط
// المخرجات {lines, size}. بلا قصّ ولا "…" (الدستور: الاسم كامل).
function cardFitText(ctx, text, maxWidth, o){
  const opt = o || {};
  const maxLines = opt.maxLines || 2, weight = opt.weight || 400, minSize = opt.minSize || 12;
  let size = opt.size || 24;
  const words = String(text).split(/\s+/).filter(Boolean);
  const w = (t, s) => cardTextWidth(ctx, t, s, weight);
  for(;;){
    const lines = []; let cur = '';
    words.forEach(word => {
      const trial = cur ? cur + ' ' + word : word;
      if(w(trial, size) <= maxWidth || !cur) cur = trial; else { lines.push(cur); cur = word; }
    });
    if(cur) lines.push(cur);
    // كلمة يتيمة بالسطر الأخير: انقل كلمة من السطر قبله لو الدمج يسع
    if(lines.length > 1){
      const last = lines[lines.length - 1].split(' ');
      if(last.length === 1){
        const prev = lines[lines.length - 2].split(' ');
        if(prev.length > 1){
          const moved = prev.pop();
          const a = prev.join(' '), b = moved + ' ' + last[0];
          if(w(a, size) <= maxWidth && w(b, size) <= maxWidth){ lines[lines.length - 2] = a; lines[lines.length - 1] = b; }
        }
      }
    }
    const fits = lines.length <= maxLines && lines.every(l => w(l, size) <= maxWidth);
    if(fits || size <= minSize) return {lines, size};
    size -= 1;
  }
}

// ---------- صور (تُخزَّن)، وأيقونات ملوّنة ----------
const _cardImgs = new Map();
function cardLoadImage(url){
  if(_cardImgs.has(url)) return _cardImgs.get(url);
  const p = new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
  _cardImgs.set(url, p);
  return p;
}
// أيقونة من ICONS بلون محدد (currentColor ← اللون)؛ ترجع Image أو null
function cardIconImage(name, color, size){
  const svg = ICONS[name];
  if(!svg) return Promise.resolve(null);
  const colored = svg.replace(/currentColor/g, color).replace(/^<svg /, `<svg width="${size}" height="${size}" `);
  return cardLoadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(colored));
}
function cardDrawImage(ctx, img, x, y, w, h){ if(img) ctx.drawImage(img, x, y, w, h); return !!img; }

// ---------- الخلفية والرأس والتذييل ----------
const CARD_BG_URL = {dark: 'assets/cards/bg-story.webp', light: 'assets/cards/bg-story-light.webp'};
async function cardDrawBackground(ctx, theme, W, H, bgUrls){
  const th = cardResolveTheme(theme);
  ctx.fillStyle = cardColor(th, 'bg');
  ctx.fillRect(0, 0, W, H);
  const img = await cardLoadImage((bgUrls || CARD_BG_URL)[th]);
  if(img){
    // center / cover
    const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  }
}

// الشعار الكامل بنسبته الأصلية 476:547 (ليلًا proki-logo، نهارًا proki-logo-light)، ارتفاعه Q64(w*547/476) كما بالمواصفة
async function cardDrawLogo(ctx, theme, x, y, w){
  const img = await cardLoadImage(logoURL(cardResolveTheme(theme) === 'light'));
  const h = Math.round(64 * (w * 547 / 476)) / 64;
  return cardDrawImage(ctx, img, x, y, w, h);
}

// خط أفقي بسُمك 1 من x وعرض w بلون الحدود
function cardHRule(ctx, theme, x, y, w){ ctx.fillStyle = cardColor(theme, 'border'); ctx.fillRect(x, y, w, 1); }

// تذييل: نص يمين (RTL) ونص يسار (LTR)، 20/32، مركز y، بلون text-2
function cardDrawFooter(ctx, theme, o){
  cardHRule(ctx, theme, CARD_SAFE.x, o.y, CARD_SAFE.w);
  const color = cardColor(theme, 'text-2');
  cardText(ctx, o.right, CARD_SAFE.x + CARD_SAFE.w, o.centerY, {size: 20, weight: 400, color, align: 'right', dir: 'rtl'});
  cardText(ctx, o.left, CARD_SAFE.x, o.centerY, {size: 20, weight: 400, color, align: 'left', dir: 'ltr'});
}

// ---------- صف شعارات الأندية (3) حول cx: كل نادٍ بعرض c وارتفاع 1.1c، فاصل 8، الأول يمينًا ----------
async function cardPreloadClubs(clubs, theme){ return preloadCrests(clubs, {theme: cardResolveTheme(theme)}); }
function cardDrawCrestRow(ctx, clubs, cx, cy, c, theme){
  const th = cardResolveTheme(theme);
  const right0 = cx + (clubs.length * c + (clubs.length - 1) * 8) / 2;
  let ok = true;
  clubs.forEach((club, i) => {
    const right = right0 - i * (c + 8);
    ok = drawCrest(ctx, club, right - c, cy - 1.1 * c / 2, c, 1.1 * c, {theme: th}) && ok;
  });
  return ok;
}

// ---------- التحقق من البيانات: يرجع قائمة بالنواقص بالعربية؛ الكرت الناقص ما يُصدَّر ----------
class CardDataError extends Error {
  constructor(problems){ super(problems.join('، ')); this.name = 'CardDataError'; this.problems = problems; }
}
// kind: 'standings' (والباقي يُضاف مع باقي الكروت). data: {round, standings:[{rank,name,total,move,clubs:[3]}]}
function validateCardData(kind, data){
  const out = [];
  if(!data || typeof data !== 'object') return ['لا توجد بيانات للكرت'];
  if(kind === 'standings'){
    if(!Number.isInteger(data.round) || data.round < 1) out.push('رقم الجولة غير محدد');
    const st = data.standings;
    if(!Array.isArray(st) || !st.length){ out.push('لا يوجد مشاركون في الترتيب'); return out; }
    if(st.length < 2) out.push('الترتيب يحتاج مشاركين اثنين على الأقل');
    st.forEach((p, i) => {
      const who = p && p.name ? p.name : `الصف ${i + 1}`;
      if(!p || !p.name) out.push(`اسم المشارك ناقص في الصف ${i + 1}`);
      if(!p || !Number.isFinite(p.total)) out.push(`رصيد ${who} غير محدد`);
      if(!p || !Array.isArray(p.clubs) || p.clubs.length !== 3 || p.clubs.some(c => !c)) out.push(`أندية ${who} ناقصة (المطلوب ثلاثة)`);
    });
    return out;
  }
  out.push('نوع الكرت غير معروف: ' + kind);
  return out;
}
