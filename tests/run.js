/* اختبارات آلية خفيفة لمحرك الترتيب (js/core/standings-engine.js).
 * لا تحتاج أي تثبيت (Node فقط، بدون npm install) — تحمّل نفس ملفات البيانات
 * والمحرك اللي يحمّلها index.html بنفس الترتيب بالضبط داخل سياق vm واحد
 * (بدون DOM لأن الدوال المستهدفة "بدون أي تعامل مع DOM" كما يذكر التعليق
 * الأول بـstandings-engine.js)، وتقارن مخرجاتها بأرقام حقيقية موثّقة في
 * دوري-بروكي-ملف-التسليم.md وبتعليقات season-2/rounds-seed.js نفسها.
 *
 * التشغيل: node tests/run.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const FILES = [
  'js/data/season-config.js',
  'js/data/season-2/participants.js',
  'js/data/season-2/clubs.js',
  'js/data/season-2/rounds-seed.js',
  'js/core/config.js',
  'js/core/ar-format.js',
  'js/core/storage.js',
  'js/core/standings-engine.js',
  'js/core/club-engine.js',
  'js/ui/card-layout.js',
  'js/ui/canvas-cards.js',
];

const source = FILES.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n');

const sandbox = {console};
sandbox.window = sandbox; // نفس سلوك المتصفح: window يشير للكائن العام نفسه
const context = vm.createContext(sandbox);
vm.runInContext(source, context, {filename: 'brookie-bundle.js'});

// ---------- أداة اختبار بسيطة ----------
let pass = 0, fail = 0;
function check(name, actual, expected){
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if(ok){ pass++; console.log(`✅ ${name}`); }
  else{ fail++; console.log(`❌ ${name}\n   متوقّع: ${JSON.stringify(expected)}\n   فعلي:   ${JSON.stringify(actual)}`); }
}

// ---------- الحالات ----------
// حالة أساسية: قبل أي جولة حقيقية (DATA.rounds=[]) الترتيب = carry مباشرة،
// وأبو أوس (id:16, carry:31) هو الأول (موثّق بملف التسليم، القسم 7).
const standings = context.computeStandings();
check('أبو أوس (16) في صدارة الترتيب العام قبل أي جولة حقيقية', standings[0].id, 16);
check('مجموع أبو أوس = 31 (موثّق بملف التسليم، القسم 7)', standings[0].total, 31);

// بطل الجولة 1 والجولة 2 محسوم بـROUND_HERO_OVERRIDE (اختيار المنظم اليدوي
// لتعادلات لا تملك بيانات أهداف كافية لحسمها آليًا — موثّق بملف التسليم
// وبتعليقات rounds-seed.js).
check('بطل الجولة 1 = أبو عبيدة (id:5) عبر ROUND_HERO_OVERRIDE', context.getRoundChampion(1), 5);
check('بطل الجولة 2 = أبو أوس (id:16) عبر ROUND_HERO_OVERRIDE (تعادل رباعي، القسم 9.1)', context.getRoundChampion(2), 16);

// كسر تعادل الجولة 2 الرباعي (القسم 9.1): أبو أوس ← أيوب ← أبو تغريد ← أبو
// شيخة (الأكثر أهدافًا، ثم الأقل استقبالًا لأيوب/أبو تغريد). الأربعة
// متعادلون بنفس مجموع "الجولة 2" (carry - ROUND1_POINTS)، فترتيبهم بالجدول
// العام (عند تساوي المجموع الكلي) يجب أن يطابق هذا الترتيب بالضبط.
const order = standings.filter(s => [16,17,1,7].includes(s.id)).map(s => s.id);
check('كسر تعادل تعادل الجولة 2 الرباعي: أوس←أيوب←تغريد←شيخة', order, [16,17,1,7]);

// مشارك انضمّ متأخرًا (لطفي، id:20، JOINED_AFTER_ROUND=4) يجب أن يكون غير
// نشط أثناء فترة الجسر (لا يظهر بالترتيب العام قبل أي جولة حقيقية).
check('لطفي (20) غير نشط أثناء جسر الجولة 2 (لم ينضمّ بعد)', context.isParticipantActiveNow(20, 2), false);
check('لطفي (20) مستثنى فعليًا من الترتيب أثناء الجسر', standings.some(s => s.id === 20), false);

// محمد عثمان (id:19، JOINED_AFTER_ROUND2) لا يملك نقاط "جولة حالية" حقيقية
// أثناء فترة الجسر — يجب أن تكون صفرًا لا رصيده الافتتاحي الكامل (منع خطأ
// توثَّق بملف التسليم: بند "أخطاء أُصلحت" رقم يخص محمد عثمان).
const currentRoundPoints = context.getCurrentRoundPointsMap();
check('محمد عثمان (19): نقاط الجولة الحالية = 0 أثناء الجسر (لم يشارك بعد)', currentRoundPoints[19], 0);

// ---------- 000-T01: تخطيط ستوري الترتيب (computeStoryLayout) ----------
// آخر صف لازم ينتهي قبل بداية التذييل (footerTop) بدون تداخل مع أي صف قبله.
const STORY_FOOTER_TOP = 1920 - 170;
[10, 18, 20, 24].forEach(n => {
  const L = context.computeStoryLayout({n, H: 1920, contentTop: 520, footerTop: STORY_FOOTER_TOP});
  const last = L.rows[L.rows.length - 1];
  check(`ستوري n=${n}: آخر صف y+rowH ≤ footerTop`, last.y + L.rowH <= STORY_FOOTER_TOP, true);
  check(`ستوري n=${n}: الصفوف بدون تداخل ورتبة الأخير = ${n}`,
    L.rows.every((r, i) => i === 0 || r.y >= L.rows[i - 1].y + L.rowH) && last.rank === n, true);
  check(`ستوري n=${n}: rowH ضمن [96,150]`, L.rowH >= 96 && L.rowH <= 150, true);
});

// ---------- 000-T02: التحقق من بيانات الشهادة ----------
check('شهادة: بطل غير محدد (null) ← نقص واحد',
  context.validateCertificateData(null, context.PARTICIPANTS),
  ['لم يُحدَّد بطل الموسم السابق من تبويب المنظّم']);
check('شهادة: بطل غير موجود بين المشاركين ← نقص',
  context.validateCertificateData(9999, context.PARTICIPANTS).length, 1);
check('شهادة: اسم فارغ ← نقص', context.validateCertificateData(1, [{id:1, name:'  '}]).length, 1);
check('شهادة: بطل صالح ← لا نواقص', context.validateCertificateData(16, context.PARTICIPANTS), []);

// ---------- 002-T001/T002: js/core/ar-format.js ----------
{
  const fc = context.formatCount;
  // لكل معدود: [مفرد كامل، مثنى مرفوع، مثنى منصوب، جمع (3–10)، تمييز منصوب (11–99)، تمييز مجرور (100، 101، 102)]
  const NOUN_FORMS = {
    'نقطة':  ['نقطة واحدة', 'نقطتان', 'نقطتين', 'نقاط', 'نقطة', 'نقطة'],
    'مركز':  ['مركز واحد', 'مركزان', 'مركزين', 'مراكز', 'مركزًا', 'مركز'],
    'جولة':  ['جولة واحدة', 'جولتان', 'جولتين', 'جولات', 'جولة', 'جولة'],
    'مشارك': ['مشارك واحد', 'مشاركان', 'مشاركين', 'مشاركين', 'مشاركًا', 'مشارك'],
    'ممة':   ['ممة واحدة', 'ممّتان', 'ممّتين', 'ممّات', 'ممة', 'ممة'],
    'نادٍ':  ['نادٍ واحد', 'ناديان', 'ناديين', 'أندية', 'ناديًا', 'نادٍ'],
    'دوري':  ['دوري واحد', 'دوريان', 'دوريين', 'دوريات', 'دوريًا', 'دوري'],
    'هدف':   ['هدف واحد', 'هدفان', 'هدفين', 'أهداف', 'هدفًا', 'هدف'],
    'مباراة': ['مباراة واحدة', 'مباراتان', 'مباراتين', 'مباريات', 'مباراة', 'مباراة']
  };
  const PLURAL = {'نقطة': 'نقاط', 'مركز': 'مراكز', 'جولة': 'جولات', 'مشارك': 'مشاركين', 'ممة': 'ممّات', 'نادٍ': 'أندية', 'دوري': 'دوريات', 'هدف': 'أهداف', 'مباراة': 'مباريات'};
  let counted = 0;
  Object.entries(NOUN_FORMS).forEach(([noun, [one, dnom, dacc, pl, acc, jar]]) => {
    const exp = [['0', 'بلا ' + PLURAL[noun]], ['1', one], ['2', dnom], ['3', '3 ' + pl], ['10', '10 ' + pl], ['11', '11 ' + acc], ['99', '99 ' + acc],
      ['100', '100 ' + jar], ['101', '101 ' + jar], ['102', '102 ' + jar], ['103', '103 ' + pl], ['111', '111 ' + acc]];
    exp.forEach(([n, want]) => { check(`formatCount(${n}, ${noun})`, fc(Number(n), noun), want); counted++; });
    check(`formatCount(2, ${noun}) نصب`, fc(2, noun, {case: 'acc'}), dacc); counted++;
  });
  // أمثلة plan.md حرفيًا + الخيارات
  check('formatCount: 5 نقطة = 5 نقاط', fc(5, 'نقطة'), '5 نقاط');
  check('formatCount: 15 مركز = 15 مركزًا', fc(15, 'مركز'), '15 مركزًا');
  check('formatCount: 111 هدف = 111 هدفًا', fc(111, 'هدف'), '111 هدفًا');
  check('formatCount: opts.zero نص مخصص', [fc(0, 'نقطة', {zero: 'صفر'}), fc(0, 'نقطة', {zero: '0 نقطة'})], ['صفر', '0 نقطة']);
  check('formatCount: bareOne', fc(1, 'نقطة', {bareOne: true}), 'نقطة');
  check('formatCount: فاصل الآلاف لاتيني', [fc(1250, 'نقطة'), fc(1000, 'مركز'), fc(1103, 'نقطة')], ['1,250 نقطة', '1,000 مركز', '1,103 نقاط']);
  check('formatCount: 200 و202 و203 و211', [fc(200, 'نقطة'), fc(202, 'هدف'), fc(203, 'جولة'), fc(211, 'نادٍ')], ['200 نقطة', '202 هدف', '203 جولات', '211 ناديًا']);
  const thrown = f => { try { f(); return null; } catch (e) { return e.message; } };
  check('formatCount: معدود مجهول يرمي خطأ', /معدود غير معروف/.test(thrown(() => fc(3, 'تفاحة')) || ''), true);
  check('formatCount: عدد سالب أو كسري أو نص يرمي خطأ', [thrown(() => fc(-1, 'نقطة')) !== null, thrown(() => fc(1.5, 'نقطة')) !== null, thrown(() => fc('3', 'نقطة')) !== null], [true, true, true]);
  // pickForm
  const F = {one: 'سجّل', two: 'سجّلا', many: 'سجّلوا'};
  check('pickForm: 1 و2 و3', [context.pickForm(1, F), context.pickForm(2, F), context.pickForm(3, F)], ['سجّل', 'سجّلا', 'سجّلوا']);
  check('pickForm: 0 ← many، وforms ناقصة ترمي خطأ', [context.pickForm(0, F), thrown(() => context.pickForm(1, {one: 'a'})) !== null], ['سجّلوا', true]);
  // formatList
  const fl = context.formatList;
  check('formatList: 0 أسماء', fl([]), '');
  check('formatList: اسم واحد', fl(['أ']), 'أ');
  check('formatList: اسمان', fl(['أ', 'ب']), 'أ وب');
  check('formatList: 3 أسماء', fl(['أ', 'ب', 'ج']), 'أ، وب، وج');
  check('formatList: 6 أسماء', fl(['أ', 'ب', 'ج', 'د', 'هـ', 'و']), 'أ، وب، وج، و3 آخرون');
  check('formatList: 4 أسماء ← وآخر', fl(['أ', 'ب', 'ج', 'د']), 'أ، وب، وج، وآخر');
  check('formatList: 5 أسماء ← وآخران', fl(['أ', 'ب', 'ج', 'د', 'هـ']), 'أ، وب، وج، وآخران');
  check('formatList: max=2', fl(['أ', 'ب', 'ج', 'د', 'هـ'], {max: 2}), 'أ، وب، و3 آخرون');
  check('formatList: max=1 مع 2 باقي', fl(['أ', 'ب', 'ج'], {max: 1}), 'أ وآخران');
  // formatDate (002-T002)
  const fd = context.formatDate;
  const D = new Date('2026-10-29T12:00:00Z');
  check('formatDate full = القبول بالحرف', fd(D, {style: 'full'}), '29 أكتوبر 2026 · 18 جمادى الأولى 1448 هـ');
  check('formatDate: الافتراضي full', fd(D), '29 أكتوبر 2026 · 18 جمادى الأولى 1448 هـ');
  check('formatDate short', fd(D, {style: 'short'}), '29 أكتوبر');
  check('formatDate datetime (9:30 ص بتوقيت الرياض)', fd(new Date('2026-10-29T06:30:00Z'), {style: 'datetime'}), '29 أكتوبر · 9:30 ص');
  check('formatDate datetime مساءً', fd(new Date('2026-10-29T18:30:00Z'), {style: 'datetime'}), '29 أكتوبر · 9:30 م');
  const allStyles = ['full', 'short', 'datetime'].map(st => fd(D, {style: st})).join(' ');
  check('formatDate: أرقام لاتينية في كل الصيغ (لا أرقام هندية)', /[\u0660-\u0669\u06F0-\u06F9]/.test(allStyles), false);
  // المنطقة الزمنية الرياض (UTC+3) قرب منتصف الليل
  check('formatDate: 21:30Z = بعد منتصف الليل بالرياض (اليوم التالي)', fd(new Date('2026-10-29T21:30:00Z'), {style: 'short'}), '30 أكتوبر');
  check('formatDate: 20:59Z = قبل منتصف الليل بالرياض (نفس اليوم)', fd(new Date('2026-10-29T20:59:00Z'), {style: 'short'}), '29 أكتوبر');
  check('formatDate: التاريخ الهجري يتبع يوم الرياض (30 أكتوبر ← 19 جمادى الأولى)', fd(new Date('2026-10-29T21:30:00Z'), {style: 'full'}), '30 أكتوبر 2026 · 19 جمادى الأولى 1448 هـ');
  const NOW = new Date('2026-10-29T12:00:00Z');
  check('formatDate relative', [fd(new Date('2026-10-29T11:59:30Z'), {style: 'relative', now: NOW}), fd(new Date('2026-10-29T11:59:00Z'), {style: 'relative', now: NOW}), fd(new Date('2026-10-29T11:58:00Z'), {style: 'relative', now: NOW}),
    fd(new Date('2026-10-29T10:00:00Z'), {style: 'relative', now: NOW}), fd(new Date('2026-10-29T09:00:00Z'), {style: 'relative', now: NOW}), fd(new Date('2026-10-26T12:00:00Z'), {style: 'relative', now: NOW})],
    ['الآن', 'قبل دقيقة', 'قبل دقيقتين', 'قبل ساعتين', 'قبل 3 ساعات', 'قبل 3 أيام']);
  check('formatDate: تاريخ غير صالح وstyle مجهول يرميان خطأ', [thrown(() => fd('x')) !== null, thrown(() => fd(D, {style: 'zzz'})) !== null], [true, true]);
  console.log(`   (formatCount: ${counted} حالة جدولية)`);
}

// ---------- الخلاصة ----------
console.log(`\n${pass} ✅ / ${fail} ❌`);
process.exit(fail > 0 ? 1 : 0);
