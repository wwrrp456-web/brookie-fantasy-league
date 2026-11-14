/* صياغة العدد والمعدود والقوائم والتواريخ بقواعد العربية (002-T001 و002-T002، plan.md §2).
 * دوال صافية بدون DOM وبدون مكتبات، تُحمَّل بعد config.js فتصير متاحة لكل الميزات.
 * الأرقام لاتينية دائمًا (الدستور 18)، وفاصل الآلاف "1,250". والمنطقة الزمنية ثابتة Asia/Riyadh.
 *
 *   formatCount(n, noun, opts)   ← '5 نقاط' · 'نقطتان' · '11 مركزًا'   (معدود مجهول يرمي خطأ)
 *   pickForm(count, {one,two,many})   ← مطابقة الفعل/الضمير
 *   formatList(names, {max})     ← 'أ وب' · 'أ، وب، وج' · 'أ، وب، وج، و3 آخرون'
 *   formatDate(d, {style})       ← full | short | datetime | relative
 */

// جدول المعدودات (من glossary.md "المعدودات المدعومة في formatCount")
//   g: الجنس · one: المفرد المجرّد · dual: [مثنى مرفوع، مثنى منصوب/مجرور] · plural: جمع القلة (3–10)
//   acc: التمييز المنصوب (11–99) · jar: التمييز المجرور (100 وما يليها، و101 و102)
// الأخيرة (آخر ودقيقة وساعة ويوم) لازمة لـformatList وformatDate relative.
const AR_NOUNS = {
  'نقطة':  {g: 'f', one: 'نقطة',  dual: ['نقطتان', 'نقطتين'],   plural: 'نقاط',   acc: 'نقطة',   jar: 'نقطة'},
  'مركز':  {g: 'm', one: 'مركز',  dual: ['مركزان', 'مركزين'],   plural: 'مراكز',  acc: 'مركزًا', jar: 'مركز'},
  'جولة':  {g: 'f', one: 'جولة',  dual: ['جولتان', 'جولتين'],   plural: 'جولات',  acc: 'جولة',   jar: 'جولة'},
  'مشارك': {g: 'm', one: 'مشارك', dual: ['مشاركان', 'مشاركين'], plural: 'مشاركين', acc: 'مشاركًا', jar: 'مشارك'},
  'ممة':   {g: 'f', one: 'ممة',   dual: ['ممّتان', 'ممّتين'],   plural: 'ممّات',  acc: 'ممة',    jar: 'ممة'},
  'نادٍ':  {g: 'm', one: 'نادٍ',  dual: ['ناديان', 'ناديين'],   plural: 'أندية',  acc: 'ناديًا', jar: 'نادٍ'},
  'دوري':  {g: 'm', one: 'دوري',  dual: ['دوريان', 'دوريين'],   plural: 'دوريات', acc: 'دوريًا', jar: 'دوري'},
  'هدف':   {g: 'm', one: 'هدف',   dual: ['هدفان', 'هدفين'],     plural: 'أهداف',  acc: 'هدفًا',  jar: 'هدف'},
  'مباراة': {g: 'f', one: 'مباراة', dual: ['مباراتان', 'مباراتين'], plural: 'مباريات', acc: 'مباراة', jar: 'مباراة'},
  // مساعدة (ليست في المعجم الأساسي)
  'آخر':   {g: 'm', one: 'آخر',   dual: ['آخران', 'آخرين'],     plural: 'آخرون', acc: 'آخرين', jar: 'آخر'},
  'دقيقة': {g: 'f', one: 'دقيقة', dual: ['دقيقتان', 'دقيقتين'], plural: 'دقائق', acc: 'دقيقة', jar: 'دقيقة'},
  'ساعة':  {g: 'f', one: 'ساعة',  dual: ['ساعتان', 'ساعتين'],   plural: 'ساعات', acc: 'ساعة',  jar: 'ساعة'},
  'تغيير': {g: 'm', one: 'تغيير', dual: ['تغييران', 'تغييرين'], plural: 'تغييرات', acc: 'تغييرًا', jar: 'تغيير'},
  'يوم':   {g: 'm', one: 'يوم',   dual: ['يومان', 'يومين'],     plural: 'أيام',  acc: 'يومًا', jar: 'يوم'}
};

function _arCheckCount(n, fn) {
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 0) {
    throw new TypeError(fn + ': العدد لازم يكون عددًا صحيحًا غير سالب، والمعطى: ' + String(n));
  }
}

// 1250 → "1,250" (لاتيني دائمًا)
function _arNum(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// رقم خام بلا معدود (لاتيني + فاصل آلاف)، للإحصاءات مثل عدد الزيارات
function formatNumber(n) { return _arNum(n); }

/* formatCount(n, noun, opts)
 *   opts.zero    نص بديل لـ0 ('صفر' أو '0 نقطة'…)، الافتراضي "بلا + الجمع"
 *   opts.bareOne true ← 1 يطلع المفرد المجرّد ('نقطة') بدل 'نقطة واحدة'
 *   opts.case    'acc' ← المثنى 'نقطتين' (بعد حرف جر أو مفعول) بدل 'نقطتان'
 */
function formatCount(n, noun, opts) {
  _arCheckCount(n, 'formatCount');
  const w = AR_NOUNS[noun];
  if (!w) throw new Error('formatCount: معدود غير معروف: ' + String(noun) + ' (أضفه لـAR_NOUNS ولمعجم glossary.md أولًا)');
  const o = opts || {};
  if (n === 0) return (typeof o.zero === 'string') ? o.zero : 'بلا ' + w.plural;
  if (n === 1) return o.bareOne ? w.one : w.one + ' ' + (w.g === 'f' ? 'واحدة' : 'واحد');
  if (n === 2) return w.dual[o.case === 'acc' ? 1 : 0];
  // 100 وما فوق: تُحسب بآخر رقمين. باقي 0 أو 1 أو 2 ← التمييز المجرور، وغير ذلك نفس قاعدة الباقي
  let r = n;
  if (n >= 100) {
    r = n % 100;
    if (r <= 2) return _arNum(n) + ' ' + w.jar;
  }
  if (r <= 10) return _arNum(n) + ' ' + w.plural;
  return _arNum(n) + ' ' + w.acc;
}

/* pickForm(count, {one, two, many}): مطابقة الفعل والضمير مع عدد المذكورين.
 *   1 ← one · 2 ← two · غير ذلك (0 و3 فأكثر) ← many */
function pickForm(count, forms) {
  _arCheckCount(count, 'pickForm');
  if (!forms || typeof forms.one !== 'string' || typeof forms.two !== 'string' || typeof forms.many !== 'string') {
    throw new Error('pickForm: لازم forms = {one, two, many} كلها نصوص');
  }
  return count === 1 ? forms.one : count === 2 ? forms.two : forms.many;
}

/* formatList(names, {max = 3})
 *   ['أ'] ← 'أ' · ['أ','ب'] ← 'أ وب' · 3 أسماء ← 'أ، وب، وج'
 *   أكثر من max ← 'أ، وب، وج، و3 آخرون' (يستخدم formatCount للباقي) */
function formatList(names, opts) {
  if (!Array.isArray(names)) throw new TypeError('formatList: المدخل لازم يكون مصفوفة أسماء');
  const max = (opts && opts.max !== undefined) ? opts.max : 3;
  if (!Number.isInteger(max) || max < 1) throw new TypeError('formatList: max لازم يكون عددًا صحيحًا ≥ 1');
  if (names.length === 0) return '';
  let items = names.map(String);
  if (items.length > max) {
    const rest = items.length - max;
    items = items.slice(0, max).concat([formatCount(rest, 'آخر', {bareOne: true})]);
  }
  const withAnd = items.map((s, i) => i === 0 ? s : 'و' + s);
  return withAnd.length === 2 ? withAnd.join(' ') : withAnd.join('، ');
}

// ───────────── مساعدات الصياغة المركّبة (001 S43-0) ─────────────
// «بـ6 نقاط» قبل الرقم (بتطويل)، و«بنقطة واحدة/بنقطتين» قبل الكلمة (بلا تطويل)، و«بلا نقاط» بلا باء. countText ناتج formatCount.
function arBaPrefix(countText){
  if(/^بلا /.test(countText)) return countText;
  return (/^\d/.test(countText) ? 'بـ' : 'ب') + countText;
}

// «جولة واحدة» · «جولتان متتاليتان» · «3 جولات متتالية» · «11 جولة متتالية» (الصفة تطابق المعدود)
function arRoundsRun(n){
  const c = formatCount(n, 'جولة');
  if(n < 2) return c;
  return c + ' ' + (n === 2 ? 'متتاليتان' : 'متتالية');
}

// ───────────── التاريخ ─────────────
const AR_TZ = 'Asia/Riyadh';
const _arDtf = {};
function _arFmt(key, locale, opts) {
  if (!_arDtf[key]) _arDtf[key] = new Intl.DateTimeFormat(locale, Object.assign({timeZone: AR_TZ}, opts));
  return _arDtf[key];
}
// Intl يضع أحيانًا مسافة ضيقة (U+202F/U+00A0) قبل ص/م؛ نوحّدها لمسافة عادية
const _arSp = s => s.replace(/[  ]/g, ' ');

/* formatDate(d, {style, now})
 *   full     ← '29 أكتوبر 2026 · 18 جمادى الأولى 1448 هـ'  (الشهادة والكروت والأرشيف)
 *   short    ← '29 أكتوبر'
 *   datetime ← '29 أكتوبر · 9:30 م'
 *   relative ← 'قبل ساعتين' (يستخدم formatCount، و now اختياري للاختبار)
 * ميلادي (ar) + هجري أم القرى (ar-SA-u-ca-islamic-umalqura)، أرقام لاتينية، والمنطقة ثابتة Asia/Riyadh. */
function formatDate(d, opts) {
  const o = opts || {};
  const style = o.style || 'full';
  const date = (d instanceof Date) ? d : new Date(d);
  if (isNaN(date.getTime())) throw new TypeError('formatDate: تاريخ غير صالح: ' + String(d));
  const greg = _arFmt('g', 'ar-u-nu-latn', {day: 'numeric', month: 'long', year: 'numeric'});
  const gShort = _arFmt('gs', 'ar-u-nu-latn', {day: 'numeric', month: 'long'});
  if (style === 'full') {
    const hijri = _arFmt('h', 'ar-SA-u-ca-islamic-umalqura-nu-latn', {day: 'numeric', month: 'long', year: 'numeric'});
    return greg.format(date) + ' · ' + hijri.format(date);
  }
  if (style === 'short') return gShort.format(date);
  if (style === 'datetime') {
    const time = _arFmt('t', 'ar-u-nu-latn', {hour: 'numeric', minute: '2-digit', hour12: true});
    return gShort.format(date) + ' · ' + _arSp(time.format(date));
  }
  if (style === 'relative') {
    const now = o.now ? new Date(o.now) : new Date();
    const sec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (sec < 60) return 'الآن';
    const min = Math.floor(sec / 60);
    if (min < 60) return 'قبل ' + formatCount(min, 'دقيقة', {bareOne: true, case: 'acc'});
    const hr = Math.floor(min / 60);
    if (hr < 24) return 'قبل ' + formatCount(hr, 'ساعة', {bareOne: true, case: 'acc'});
    const day = Math.floor(hr / 24);
    if (day < 30) return 'قبل ' + formatCount(day, 'يوم', {bareOne: true, case: 'acc'});
    return gShort.format(date);
  }
  throw new Error('formatDate: style غير معروف: ' + String(style) + ' (full | short | datetime | relative)');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {formatCount, pickForm, formatList, formatDate, formatNumber, AR_NOUNS, arBaPrefix, arRoundsRun};
}
