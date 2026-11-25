/* مساعد الأيقونات (001-T011c-1، قاعدة الاستبدال 1): iconHTML(name, {size, label, cls}) يرجع <span class="ic"> فيه SVG من ICONS (currentColor)
 * بدل الإيموجي. fillStaticIcons(root) يملأ عناصر index.html الساكنة [data-icon="اسم"] (و data-size اختياري).
 *   - بلا label: الأيقونة زخرفية (aria-hidden) والنص بجانبها يشرح. مع label: role="img" وaria-label (حالات بلا نص بجانبها، مثل ✅ ⚠).
 *   - الحجم الافتراضي 18px. الاسم غير الموجود بـICONS يرجع '' بدل ما يكسر الصفحة.
 * الاعتماد: ICONS (js/generated/assets.js)، escapeHtml (dom-utils.js) لو وُجد. */
function iconHTML(name, opts){
  const svg = (typeof ICONS !== 'undefined') ? ICONS[name] : null;
  if(!svg) return '';
  const o = opts || {};
  const size = Number(o.size) || 18;
  const esc = (typeof escapeHtml === 'function') ? escapeHtml : (v => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'));
  const a = o.label ? `role="img" aria-label="${esc(o.label)}"` : 'aria-hidden="true" focusable="false"';
  return `<span class="ic${o.cls ? ' ' + o.cls : ''}">${svg.replace(/^<svg /, `<svg width="${size}" height="${size}" ${a} `)}</span>`;
}

// يملأ [data-icon] داخل root (الافتراضي الصفحة كلها). العنصر نفسه يحمل الأيقونة (innerHTML = svg بالحجم data-size أو 18)
function fillStaticIcons(root){
  if(typeof document === 'undefined') return;
  (root || document).querySelectorAll('[data-icon]').forEach(el => {
    const svg = (typeof ICONS !== 'undefined') ? ICONS[el.dataset.icon] : null;
    if(!svg) return;
    const size = Number(el.dataset.size) || 18;
    el.innerHTML = svg.replace(/^<svg /, `<svg width="${size}" height="${size}" aria-hidden="true" focusable="false" `);
  });
}

// يحوّل الإيموجي داخل نص مخزَّن قديمًا (سجل نشاط المنظّم) إلى أيقونات؛ ما لا مقابل له يُحذف. المفاتيح بصيغة \u{…} عمدًا (لا إيموجي حرفي بالمصدر).
const EMOJI_TO_ICON = {'\u{2705}':'check','\u{1F3C6}':'trophy','\u{2694}':'swords','\u{1F525}':'flame','\u{1F451}':'crown','\u{1F4CB}':'clipboard','\u{2B07}':'download','\u{1F5F3}':'poll','\u{26A0}':'warning','\u{1F3C5}':'medal','\u{1F4CA}':'chart-bar','\u{1F480}':'skull-zero','\u{1F94A}':'swords','\u{1F512}':'lock','\u{1F5D1}':'trash','\u{1F52E}':'crystal-ball','\u{1F9F1}':'wall','\u{1F6E1}':'shield','\u{1F504}':'refresh','\u{1F534}':'live','\u{1F381}':'gift','\u{1F3AF}':'target','\u{26BD}':'ball','\u{1F399}':'mic','\u{1F465}':'users','\u{1F4BE}':'save','\u{1F389}':'sparkles','\u{1F4C9}':'trend-down','\u{1F4E4}':'share','\u{2B06}':'arrow-up','\u{2795}':'plus','\u{1F517}':'link','\u{1F396}':'medal','\u{26A1}':'bolt','\u{1F4C8}':'trend-up','\u{23F3}':'clock','\u{1F53C}':'arrow-up','\u{1F53D}':'arrow-down','\u{23F0}':'clock','\u{1F4C5}':'calendar','\u{1F5D3}':'calendar','\u{1F9CA}':'snowflake','\u{2744}':'snowflake','\u{1F680}':'rocket','\u{274C}':'close','\u{2716}':'close','\u{2699}':'settings','\u{1F513}':'unlock','\u{1F4A5}':'sparkles','\u{270F}':'edit','\u{1F4DD}':'edit','\u{270D}':'edit','\u{1F50D}':'search','\u{2753}':'info','\u{1F9FE}':'certificate','\u{1F4E5}':'download','\u{1F6A8}':'warning','\u{1F195}':'sparkles','\u{1F552}':'clock','\u{1F319}':'moon','\u{1F4AC}':'comment','\u{1F31F}':'sparkles','\u{2B50}':'sparkles','\u{1F53B}':'arrow-down','\u{1F501}':'refresh','\u{2620}':'skull-zero','\u{1F4F2}':'share','\u{1F52C}':'flask','\u{21A9}':'undo','\u{1F44F}':'thumbs-up','\u{1F4AA}':'dumbbell','\u{1F4CC}':'pin','\u{1F39E}':'film','\u{1F441}':'eye','\u{1F3DB}':'landmark','\u{1F4D6}':'book','\u{1F44B}':'hand-wave','\u{1F30D}':'globe','\u{23F8}':'pause','\u{2601}':'cloud','\u{1F3B2}':'dice','\u{1F3C1}':'flag-race','\u{1F6AB}':'ban','\u{1F3F4}':'flag','\u{1F5A8}':'printer','\u{1F511}':'key','\u{1F4F1}':'phone','\u{1F4E3}':'megaphone','\u{1F945}':'goal','\u{1F5C4}':'archive','\u{1F515}':'bell-off','\u{1F514}':'bell','\u{1F524}':'sort-alpha','\u{1F91D}':'handshake','\u{1F9E0}':'brain','\u{27A1}':'arrow-right','\u{1F9EE}':'calculator','\u{25B6}':'play','\u{1F5FA}':'map','\u{1F578}':'radar','\u{1F3CE}':'race-car','\u{1F3A2}':'rollercoaster','\u{1F32A}':'tornado','\u{1F30A}':'wave','\u{1F3AA}':'tent','\u{1F6CC}':'bed'};
function iconizeEmoji(text){
  // الدستور 23: أجزاء النص غير الإيموجي تُهرَّب بـescapeHtml (سجل النشاط يعرض entry.action بلا تهريب)؛ والإيموجي وحده يتحوّل إلى أيقونة موثوقة.
  const esc = (typeof escapeHtml === 'function') ? escapeHtml : (v => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
  const src = String(text == null ? '' : text);
  const re = /(\p{Extended_Pictographic})\uFE0F?(?:\u200D\p{Extended_Pictographic}\uFE0F?)*/gu;
  let out = '', last = 0, m;
  while((m = re.exec(src))){
    out += esc(src.slice(last, m.index));
    const n = EMOJI_TO_ICON[m[1]];
    out += n ? iconHTML(n) : '';
    last = m.index + m[0].length;
  }
  return out + esc(src.slice(last));
}
