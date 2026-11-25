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
