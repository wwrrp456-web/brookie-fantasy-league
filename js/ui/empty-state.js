/* مكوّن الحالة الفاضية الموحّد (001-T017، U-07، الدستور 13): بدل "–" أو "—" أو "0" مضلّل كقيمة في الواجهة.
 *
 *   emptyState({icon, title, text, action})  ← بطاقة كاملة (أيقونة من ICONS + عنوان + نص بالمعجم + زر اختياري {label, href|id})
 *   emptyInline(label)                      ← قيمة فاضية داخل خلية/إحصائية: نص خافت بدل شرطة (مثل "لا جولات")
 *
 * الأيقونة اسم من ICONS (assets/icons)؛ الاسم غير الموجود يُهمَل (بدون أيقونة). كل النصوص تمر عبر escapeHtml. */
function _esEsc(v){
  return (typeof escapeHtml === 'function') ? escapeHtml(v) : String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function emptyState(o){
  o = o || {};
  const icon = (typeof ICONS !== 'undefined' && o.icon && ICONS[o.icon]) ? ICONS[o.icon] : '';
  const act = o.action && o.action.label
    ? (o.action.href
        ? `<a class="btn" href="${_esEsc(o.action.href)}">${_esEsc(o.action.label)}</a>`
        : `<button type="button" class="btn"${o.action.id ? ` id="${_esEsc(o.action.id)}"` : ''}>${_esEsc(o.action.label)}</button>`)
    : '';
  return `<div class="empty-state" role="status">${icon ? `<span class="empty-state-icon" aria-hidden="true">${icon}</span>` : ''}${o.title ? `<h3 class="empty-state-title">${_esEsc(o.title)}</h3>` : ''}${o.text ? `<p class="empty-state-text">${_esEsc(o.text)}</p>` : ''}${act}</div>`;
}

function emptyInline(label){
  return `<span class="empty-inline">${_esEsc(label || 'لا بيانات بعد')}</span>`;
}
