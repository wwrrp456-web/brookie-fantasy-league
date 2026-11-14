/* الميداليات 🥇🥈🥉 كصور SVG ثابتة بشكل Noto الرسمي (R-23): تتطابق بين آيفون وأندرويد بدل رموز إيموجي يختلف رسمها.
 * القاعدة الدائمة: أي ميدالية معروضة بالواجهة تمر من هنا، ولا تُستبدل بأيقونة أخرى. تبقى الرموز نصًا فقط في رسالة الواتساب ونصوص النسخ.
 *   medalHTML(rank, {size})   ← <img> بحجم (افتراضيًا 1.15em بحجم الخط) للمركز 1 أو 2 أو 3، وإلا نص فاضي
 *   medalImage(rank)          ← Promise<Image> لرسم الكانفس (drawImage)
 *   medalURL(rank)            ← data:image/svg+xml (مخبّأ)
 * الصورة <img> بدل <use> عمدًا: html2canvas (تصدير الصور) ما يحمّل <symbol> من الصفحة، ويحمّل <img> بلا مشكلة.
 * المصدر: MEDAL_SVGS من js/generated/assets.js (assets/medals/*.svg، Apache 2.0). الاعتماد: card-kit.js وقت medalImage فقط. */

const MEDAL_KEYS = {1: 'gold', 2: 'silver', 3: 'bronze'};
const MEDAL_LABELS = {1: 'ميدالية ذهبية', 2: 'ميدالية فضية', 3: 'ميدالية برونزية'};
const _medalUrlCache = {};

function medalURL(rank){
  const k = MEDAL_KEYS[rank];
  if(!k) return '';
  if(!_medalUrlCache[k]) _medalUrlCache[k] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(MEDAL_SVGS['medal-' + k]);
  return _medalUrlCache[k];
}

function medalHTML(rank, opts){
  const k = MEDAL_KEYS[rank];
  if(!k) return '';
  const size = opts && Number(opts.size);
  const dim = size ? ` width="${size}" height="${size}"` : '';
  return `<img class="medal" src="${medalURL(rank)}"${dim} alt="${MEDAL_LABELS[rank]}" decoding="async">`;
}

function medalImage(rank){
  return cardLoadImage(medalURL(rank));
}

// مواضع ثابتة بـHTML الصفحة: <span class="medal-slot" data-medal="1"></span> تُملأ بالصورة عند التحميل
function fillMedalSlots(root){
  (root || document).querySelectorAll('.medal-slot[data-medal]').forEach(el => { el.innerHTML = medalHTML(Number(el.getAttribute('data-medal'))); });
}
if(typeof document !== 'undefined'){
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => fillMedalSlots());
  else fillMedalSlots();
}
