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
  'js/core/dom-utils.js',

  'js/core/ar-format.js',
  'js/core/whatsapp-text.js',
  'js/core/storage.js',
  'js/core/standings-engine.js',
  'js/core/club-engine.js',
  'js/ui/card-layout.js',
  'js/ui/certificate-card.js',
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

// ---------- 000-T02: التحقق من بيانات الشهادة ----------
check('شهادة: بطل غير محدد (null) ← نقص واحد',
  context.validateCertificateData(null, context.PARTICIPANTS),
  ['لم يُحدَّد بطل الموسم السابق من تبويب المنظّم']);
check('شهادة: بطل غير موجود بين المشاركين ← نقص',
  context.validateCertificateData(9999, context.PARTICIPANTS).length, 1);
check('شهادة: اسم فارغ ← نقص', context.validateCertificateData(1, [{id:1, name:'  '}]).length, 1);
check('شهادة: بطل صالح ← لا نواقص', context.validateCertificateData(16, context.PARTICIPANTS), []);

// ---------- 002-R20a / S43-1: قصة الجولة ورسالة الواتساب (js/core/whatsapp-text.js) ----------
{
  const L = {name: 'لطفي', total: 92};
  const story = (o) => context.composeRoundStory(Object.assign({round: 10, leader: L, chaser: {name: 'أيوب', total: 90}, climbers: {names: [], val: 0}, droppers: {names: [], val: 0}}, o));
  // الفارق: نقطة واحدة · نقطتين · 3 نقاط · 11 نقطة
  [[91, 'بفارق نقطة واحدة عن أيوب'], [90, 'بفارق نقطتين عن أيوب'], [89, 'بفارق 3 نقاط عن أيوب'], [81, 'بفارق 11 نقطة عن أيوب']].forEach(([ct, want]) =>
    check(`قصة: الفارق ← ${want}`, story({chaser: {name: 'أيوب', total: ct}}).includes(want), true));
  check('قصة: الرصيد 92 «92 نقطة»', story({}).includes('برصيد 92 نقطة'), true);
  check('قصة: تعادل الصدارة', story({chaser: {name: 'أيوب', total: 92}}).includes('بتعادل النقاط مع أيوب'), true);
  check('قصة: بلا ملاحق (مشارك واحد) لا فارق ولا خطأ', story({chaser: null}).startsWith('بعد الجولة 10، *لطفي* يتصدّر جدول الترتيب العام برصيد 92 نقطة.'), true);
  // الصاعدون: واحد/اثنان/ثلاثة/خمسة، وقفزة 2 و3 و11
  check('قصة: صاعد واحد بقفزة مركزين', story({climbers: {names: ['العندليب'], val: 2}}).includes('العندليب كان الأكثر صعودًا في جدول الترتيب بقفزة مركزين دفعة واحدة.'), true);
  check('قصة: صاعدان ← صعدا', story({climbers: {names: ['أ', 'ب'], val: 3}}).includes('أ وب صعدا 3 مراكز دفعة واحدة في جدول الترتيب.'), true);
  check('قصة: ثلاثة صاعدون ← صعدوا', story({climbers: {names: ['أ', 'ب', 'ج'], val: 2}}).includes('أ، وب، وج صعدوا مركزين دفعة واحدة في جدول الترتيب.'), true);
  check('قصة: خمسة صاعدين ← عدد + أولهم', story({climbers: {names: ['أ', 'ب', 'ج', 'د', 'هـ'], val: 2}}).includes('5 مشاركين صعدوا مركزين دفعة واحدة في جدول الترتيب (أولهم أ).'), true);
  check('قصة: قفزة 11 «11 مركزًا»', story({climbers: {names: ['أ'], val: 11}}).includes('بقفزة 11 مركزًا'), true);
  // المتراجعون: واحد/اثنان/ثلاثة، ومقدار 4
  check('قصة: متراجع واحد', story({droppers: {names: ['أبو رمزي'], val: 4}}).includes('بالمقابل، أبو رمزي تراجع 4 مراكز في الجدول نفسه.'), true);
  check('قصة: متراجعان ← تراجعا، وبواو العطف', story({droppers: {names: ['أبو تغريد (زيد)', 'أبو رمزي'], val: 4}}).includes('بالمقابل، أبو تغريد (زيد) وأبو رمزي تراجعا 4 مراكز في الجدول نفسه.'), true);
  check('قصة: ثلاثة متراجعين ← تراجعوا', story({droppers: {names: ['أ', 'ب', 'ج'], val: 3}}).includes('أ، وب، وج تراجعوا 3 مراكز'), true);
  check('قصة: أربعة متراجعين ← عدد + أولهم', story({droppers: {names: ['أ', 'ب', 'ج', 'د'], val: 2}}).includes('4 مشاركين تراجعوا مركزين في الجدول نفسه (أولهم أ).'), true);
  check('قصة: بلا صاعدين ولا متراجعين', story({}).includes('لم يشهد أي تغيّر كبير في المراكز'), true);
  check('قصة: حركة مركز واحد لا تُذكر (الحد 2)', story({climbers: {names: ['أ'], val: 1}}).includes('أ كان'), false);
  check('قصة: بلا أخطاء قديمة (2 مراكز · 2 نقطة · بجدول · الشرطة)', [/(^|\s)2 مراكز/, /(^|\s)2 نقطة/, /بجدول/, /[–—]/].some(re => re.test(story({climbers: {names: ['أ'], val: 2}, droppers: {names: ['ب'], val: 2}}))), false);

  // رسالة الواتساب: التقرير السردي فقط
  const wa = (o) => context.composeWhatsAppSummary(Object.assign({round: 10, story: story({climbers: {names: ['أ', 'ب', 'ج', 'د', 'هـ'], val: 2}, droppers: {names: ['أبو تغريد (زيد)', 'أبو رمزي'], val: 4}}), hero: {name: 'أبو أوس', points: 6, tieBreak: true}}, o));
  const m = wa({});
  check('واتساب: بلا الإجمالي ولا ▲ ولا فوز=3 ولا فواصل ولا ممة 💀', ['الإجمالي', '▲', '▼', 'فوز=3', '━', 'ممة 💀', '(+'].some(w => m.includes(w)), false);
  check('واتساب: بلا أسماء خارج السرد (من خارج القصة والبطل)', ['أبو عزام', 'مصطفى عبده'].some(w => m.includes(w)), false);
  check('واتساب: الطول < 700 حرف', m.length < 700, true);
  check('واتساب: يحوي العنوان وتحديث الجولة وبطل الجولة بنقاطه الصحيحة وكسر التعادل والخاتمة',
    [m.includes('دوري بروكي الفانتازي · الموسم الثاني'), m.includes('📅 تحديث بعد الجولة 10'), m.includes('👑 بطل الجولة: *أبو أوس* بـ6 نقاط بعد كسر التعادل'), m.includes('فالجولة 11 ما تنتظر أحدًا')], [true, true, true, true]);
  check('واتساب: بطل بنقطة وبنقطتين وبلا نقاط و11', [wa({hero: {name: 'س', points: 1}}).includes('*س* بنقطة واحدة'), wa({hero: {name: 'س', points: 2}}).includes('*س* بنقطتين'), wa({hero: {name: 'س', points: 0}}).includes('*س* بلا نقاط'), wa({hero: {name: 'س', points: 11}}).includes('*س* بـ11 نقطة')], [true, true, true, true]);
  check('واتساب: بلا بطل (أول جولة) لا سطر بطل', wa({round: 1, hero: null}).includes('بطل الجولة'), false);
  check('واتساب: بلا قصة لا سطر قصة ولا خطأ', wa({story: ''}).includes('📝'), false);
}

// ---------- 003-T001: escapeHtml (S-07) ----------
{
  const esc = context.escapeHtml;
  check('escapeHtml: وسم صورة خبيث', esc('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  check('escapeHtml: كسر خاصية بعلامة اقتباس', esc('" onmouseover="alert(1)" x="'), '&quot; onmouseover=&quot;alert(1)&quot; x=&quot;');
  check('escapeHtml: علامة الاقتباس المفردة وعلامة &', esc("it's a&b"), 'it&#39;s a&amp;b');
  check('escapeHtml: null وundefined ← نص فاضي', [esc(null), esc(undefined)], ['', '']);
  check('escapeHtml: الأرقام والقيمة 0 تبقى', [esc(0), esc(12), esc(3.5)], ['0', '12', '3.5']);
  check('escapeHtml: العربية والنص السليم يبقى كما هو', esc('أبو تغريد (زيد) 😀'), 'أبو تغريد (زيد) 😀');
  check('escapeHtml: ما يبقى < ولا > ولا " ولا \' في ناتج نص خليط', /[<>"']/.test(esc('<a href="x" onclick=\'y\'>z</a>')), false);
}


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


// ---------- 002-T004: قواعد اللغة الأربع في lint.js (لكل قاعدة اختبار سلبي) ----------
{
  const {spawnSync} = require('child_process');
  const os = require('os');
  const lintMod = require(path.join(ROOT, 'tools/lint.js'));
  const ZERO = {hexColors: 0, emoji: 0, inlineStyles: 0, numberNoun: 0, rawDates: 0, forbiddenTerms: 0, importants: 0, hardcodedCounts: 0};
  // ينشئ جذرًا مؤقتًا بالملفات المعطاة وخط أساس أصفار، ويرجع {measure, status, out}
  const lintCase = files => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lintrule-'));
    Object.entries(files).forEach(([f, c]) => { fs.mkdirSync(path.dirname(path.join(tmp, f)), {recursive: true}); fs.writeFileSync(path.join(tmp, f), c); });
    fs.writeFileSync(path.join(tmp, 'lint-baseline.json'), JSON.stringify(ZERO));
    const r = spawnSync('node', [path.join(ROOT, 'tools/lint.js'), '--root', tmp], {encoding: 'utf8'});
    const counts = lintMod.measure(tmp).counts;
    fs.rmSync(tmp, {recursive: true, force: true});
    return {counts, status: r.status, out: r.stdout + r.stderr};
  };
  const NN = 'const t = `${n} نقطة`;\n';
  // 1) numberNoun
  let r = lintCase({'js/features/a.js': NN});
  check('قاعدة numberNoun: ${n} نقطة خارج ar-format ← يفشل', [r.status, r.counts.numberNoun, /numberNoun/.test(r.out)], [1, 1, true]);
  check('قاعدة numberNoun: نفس السطر داخل js/core/ar-format.js مستثنى', lintCase({'js/core/ar-format.js': NN}).counts.numberNoun, 0);
  check('قاعدة numberNoun: formatCount(n, "نقطة") سليم ولا يُحسب', lintCase({'js/features/a.js': "const t = formatCount(n, 'نقطة');\n"}).counts.numberNoun, 0);
  // 2) rawDates
  r = lintCase({'js/features/a.js': "const s = d.toLocaleDateString('ar');\n"});
  check('قاعدة rawDates: toLocaleDateString خارج ar-format ← يفشل', [r.status, r.counts.rawDates, /rawDates/.test(r.out)], [1, 1, true]);
  check('قاعدة rawDates: toLocaleString أيضًا', lintCase({'js/ui/b.js': "x = d.toLocaleString('ar-SA');\n"}).counts.rawDates, 1);
  check('قاعدة rawDates: داخل js/core/ar-format.js مستثنى', lintCase({'js/core/ar-format.js': "const s = d.toLocaleDateString('ar');\n"}).counts.rawDates, 0);
  // 3) forbiddenTerms
  r = lintCase({'js/features/a.js': "const t = 'ترتيب المتسابق';\n"});
  check('قاعدة forbiddenTerms: "المتسابق" في نص ← يفشل', [r.status, r.counts.forbiddenTerms, /forbiddenTerms/.test(r.out)], [1, 1, true]);
  check('قاعدة forbiddenTerms: "اللاعب" و"رصيد الجولة" و index.html', [
    lintCase({'js/features/a.js': "const t = 'اللاعب الأول';\n"}).counts.forbiddenTerms,
    lintCase({'js/features/a.js': "const t = 'رصيد الجولة';\n"}).counts.forbiddenTerms,
    lintCase({'index.html': '<p>المتسابق</p>\n'}).counts.forbiddenTerms], [1, 1, 1]);
  check('قاعدة forbiddenTerms: "المشارك" سليم، والممنوع داخل تعليق لا يُحسب', [
    lintCase({'js/features/a.js': "const t = 'المشارك';\n"}).counts.forbiddenTerms,
    lintCase({'js/features/a.js': "// المتسابق سابقًا\nconst t = 1;\n"}).counts.forbiddenTerms], [0, 0]);
  // 4) hardcodedCounts
  r = lintCase({'js/features/a.js': "const t = 'يشارك فيه 13 دوريًا';\n"});
  check('قاعدة hardcodedCounts: "13 دوريًا" مكتوب يدويًا في ملف ميزة ← يفشل', [r.status, r.counts.hardcodedCounts, /hardcodedCounts/.test(r.out)], [1, 1, true]);
  check('قاعدة hardcodedCounts: خارج js/features (مثل js/core) لا يُحسب', lintCase({'js/core/a.js': "const t = 'فيه 13 دوريًا';\n"}).counts.hardcodedCounts, 0);
  check('قاعدة hardcodedCounts: العدد من البيانات (${n}) والتعليقات لا تُحسب', [
    lintCase({'js/features/a.js': 'const t = `فيه ${n} دوريًا`;\n'}).counts.hardcodedCounts,
    lintCase({'js/features/a.js': '// فيه 13 دوريًا\nconst t = 1;\n'}).counts.hardcodedCounts], [0, 0]);
  check('قاعدة hardcodedCounts: "3 جولات" و"20 مشاركًا" تُحسب', [
    lintCase({'js/features/a.js': "t = 'على 3 جولات';\n"}).counts.hardcodedCounts,
    lintCase({'js/features/a.js': "t = 'بين 20 مشاركًا';\n"}).counts.hardcodedCounts], [1, 1]);
  // خط الأساس: لازم يسجّل المقاييس الثمانية، ونقص أي مقياس يفشل (ما يمر بصمت)
  const realBase = JSON.parse(fs.readFileSync(path.join(ROOT, 'lint-baseline.json'), 'utf8'));
  check('خط الأساس الفعلي يسجّل المقاييس الثمانية (بما فيها hardcodedCounts)', lintMod.METRICS.every(m => typeof realBase[m] === 'number') && lintMod.METRICS.length === 8, true);
  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lintbase-'));
    fs.mkdirSync(path.join(tmp, 'js'));
    const partial = Object.assign({}, ZERO); delete partial.hardcodedCounts;
    fs.writeFileSync(path.join(tmp, 'lint-baseline.json'), JSON.stringify(partial));
    const rr = spawnSync('node', [path.join(ROOT, 'tools/lint.js'), '--root', tmp], {encoding: 'utf8'});
    check('خط أساس ناقص مقياسًا ← الفحص يفشل برسالة واضحة', [rr.status, /hardcodedCounts/.test(rr.stdout + rr.stderr)], [1, true]);
    fs.rmSync(tmp, {recursive: true, force: true});
  }
}

// ---------- 001-T010: tools/build-assets.js (توليد js/generated/assets.js حتمي) ----------
{
  const os = require('os');
  const {build} = require(path.join(ROOT, 'tools/build-assets.js'));
  const thrown = f => { try { f(); return null; } catch (e) { return e.message; } };
  const gen = fs.readFileSync(path.join(ROOT, 'js/generated/assets.js'), 'utf8');
  const a1 = build(ROOT), a2 = build(ROOT);
  check('build-assets: توليدان متتاليان متطابقان حرفيًا', a1 === a2, true);
  check('build-assets: الملف المرفوع js/generated/assets.js محدَّث (يطابق ناتج التوليد)', gen === a1, true);
  const ctx2 = vm.createContext({});
  vm.runInContext(gen + ';this.R = {ICONS, CRESTS, CREST_NAMES, MOTIFS, LOGO_SVG, CRESTS_OFFICIAL};', ctx2);
  const R = ctx2.R;
  const sorted = o => JSON.stringify(Object.keys(o)) === JSON.stringify(Object.keys(o).slice().sort());
  check('build-assets: المحتوى = 56 أيقونة و32 شعارًا بأسمائها و11 رمزًا وشعار PROKI (3) ورسمية فاضية',
    [Object.keys(R.ICONS).length, Object.keys(R.CRESTS).length, Object.keys(R.CREST_NAMES).length, Object.keys(R.MOTIFS).length, Object.keys(R.LOGO_SVG).sort(), Object.keys(R.CRESTS_OFFICIAL).length],
    [56, 32, 32, 11, ['logo', 'logoLight', 'mark'], 0]);
  check('build-assets: كل المجموعات مرتبة أبجديًا', [R.ICONS, R.CRESTS, R.CREST_NAMES, R.MOTIFS].every(sorted), true);
  check('build-assets: كل قيمة تبدأ بـ<svg وبلا <image أو base64 أو <?xml', Object.values(Object.assign({}, R.ICONS, R.CRESTS, R.MOTIFS, R.LOGO_SVG)).every(v => /^<svg[\s>]/.test(v) && !/<image|base64|<\?xml/.test(v)), true);
  // جذر مصطنع
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ba-'));
  const w = (f, c) => { fs.mkdirSync(path.dirname(path.join(tmp, f)), {recursive: true}); fs.writeFileSync(path.join(tmp, f), c); };
  w('assets/icons/zeta.svg', '<?xml version="1.0"?>\n<svg viewBox="0 0 24 24"><path d="M1 1"/></svg>\n');
  w('assets/icons/alpha.svg', '<svg viewBox="0 0 24 24"/>');
  w('assets/icons/_sheet.html', '<html/>'); w('assets/icons/_hidden.svg', '<svg/>');
  w('assets/crests/ajax.svg', '<svg id="a"/>'); w('assets/crests.json', JSON.stringify({ajax: 'أياكس'}));
  const t1 = build(tmp);
  const ctx3 = vm.createContext({}); vm.runInContext(t1 + ';this.R = {ICONS, CRESTS, CREST_NAMES, MOTIFS, LOGO_SVG, CRESTS_OFFICIAL};', ctx3);
  check('build-assets (مصطنع): ترتيب أبجدي، وحذف سطر <?xml?>، وتجاهل ملفات _', [Object.keys(ctx3.R.ICONS), ctx3.R.ICONS.zeta], [['alpha', 'zeta'], '<svg viewBox="0 0 24 24"><path d="M1 1"/></svg>']);
  check('build-assets (مصطنع): غياب motifs وbrand وofficial ← {} وبلا خطأ', [Object.keys(ctx3.R.MOTIFS).length, Object.keys(ctx3.R.LOGO_SVG).length, Object.keys(ctx3.R.CRESTS_OFFICIAL).length], [0, 0, 0]);
  w('assets/crests/official/ajax.svg', '<svg id="official"/>');
  const ctx4 = vm.createContext({}); vm.runInContext(build(tmp) + ';this.O = CRESTS_OFFICIAL;', ctx4);
  check('build-assets (مصطنع): وجود assets/crests/official يملأ CRESTS_OFFICIAL', Object.keys(ctx4.O), ['ajax']);
  w('assets/icons/bad.svg', '<div>not svg</div>');
  check('build-assets (مصطنع): ملف لا يبدأ بـ<svg يرمي خطأ واضحًا', /ما يبدأ بوسم <svg>/.test(thrown(() => build(tmp)) || ''), true);
  fs.rmSync(path.join(tmp, 'assets/icons/bad.svg'));
  w('assets/crests/orphan.svg', '<svg/>');
  check('build-assets (مصطنع): شعار بلا اسم في crests.json يرمي خطأ', /crests\.json لا يطابق/.test(thrown(() => build(tmp)) || ''), true);
  fs.rmSync(tmp, {recursive: true, force: true});
}

// ---------- 001-T010 (F2): snap.js يتخطّى الصفحات اللي ملفها غير موجود تحت --root بدون ما يعدّها خطأ ----------
{
  // يحتاج متصفح Chromium فعليًا (وظيفة verify في CI ما تثبّته: فيها npm ci فقط، واللقطات في وظيفتين ثانيتين)
  let hasPw = true; try { const pw = require('playwright'); hasPw = fs.existsSync(pw.chromium.executablePath()); } catch (e) { hasPw = false; }
  if (!hasPw) console.log('⏭️ اختبار تخطّي الصفحات في snap.js متخطّى (Chromium غير مثبّت: npx playwright install chromium)');
  else {
    const {spawnSync} = require('child_process');
    const os = require('os');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'snapskip-'));
    const run = rootDir => spawnSync('node', [path.join(ROOT, 'tools/snap.js'), '--only', 'pages', '--root', rootDir, '--out', path.join(tmp, 'out'), '--label', path.basename(rootDir)], {encoding: 'utf8', timeout: 120000});
    // أساس بلا assets/preview.html ← تخطّي (exit 0) وسجل في report.json
    const baseRoot = path.join(tmp, 'base'); fs.mkdirSync(baseRoot);
    const r1 = run(baseRoot);
    const rep1 = JSON.parse(fs.readFileSync(path.join(tmp, 'out/base/report.json'), 'utf8'));
    check('snap: صفحة غير موجودة تحت --root ← exit 0 (ما تُعدّ خطأ)', r1.status, 0);
    check('snap: skippedPages يسجّل الصفحة، وما التُقطت لقطات لها', [rep1.skippedPages.map(x => x.page), rep1.pages, rep1.files], [['preview'], 0, 0]);
    check('snap: يطبع سطر "تخطّي" واضحًا', /تخطّي الصفحة «preview»/.test(r1.stdout), true);
    check('snap: التخطّي ما يضيف أخطاء كونسول/صفحة', [rep1.consoleErrors.length, rep1.pageErrors.length, rep1.cardErrors.length], [0, 0, 0]);
    // رأس فيه الصفحة ← تُلتقط الـ4 ولا تخطّي
    const headRoot = path.join(tmp, 'head'); fs.mkdirSync(path.join(headRoot, 'assets'), {recursive: true});
    fs.writeFileSync(path.join(headRoot, 'assets/preview.html'), '<!doctype html><meta charset="utf-8"><title>x</title><p>ok</p>');
    const r2 = run(headRoot);
    const rep2 = JSON.parse(fs.readFileSync(path.join(tmp, 'out/head/report.json'), 'utf8'));
    check('snap: صفحة موجودة ← تُلتقط 4 لقطات بدون تخطّي', [r2.status, rep2.pages, rep2.skippedPages.length], [0, 4, 0]);
    fs.rmSync(tmp, {recursive: true, force: true});
  }
}


// ---------- 002-T005: tools/text-inventory.js على عينة مصطنعة صغيرة ----------
{
  const {scanJs, scanHtml, inventory, render} = require(path.join(ROOT, 'tools/text-inventory.js'));
  const os = require('os');
  const js = [
    "// تعليق عربي ما يُجرد",
    "const a = 'نص ثابت'; /* وهذا تعليق كتلة */",
    "const b = `مرحبا ${name} يا ${cond ? 'أول' : 'ثاني'}`;",
    "const c = \"English only\"; const url = 'https://x.y/z';",
    "const d = '\\u0645\\u0631\\u062d\\u0628\\u0627';",
    "const re = /['\"]نمط/; const e = 'بعد الـregex';",
    "const f = `<b>وسم عربي</b>`;"
  ].join('\n');
  const items = scanJs(js).map(i => [i.kind, i.text]);
  check('جرد JS: نص ثابت وقالب فيه ${} (والنصوص الداخلية بسطر مستقل) وHTML', items.filter(x => x[1] !== 'مرحبا ${name} يا ${cond ? \'أول\' : \'ثاني\'}').map(x => x[0] + ':' + x[1]),
    ['نص ثابت:نص ثابت', 'نص ثابت:أول', 'نص ثابت:ثاني', 'نص ثابت:مرحبا', 'نص ثابت:بعد الـregex', 'HTML:<b>وسم عربي</b>']);
  check('جرد JS: القالب يحتفظ بالتعبيرات ويصنَّف قالبًا', items.some(x => x[0] === 'قالب فيه ${}' && x[1].startsWith('مرحبا ${name} يا ${')), true);
  check('جرد JS: التعليقات لا تُجرد، والإنجليزي والروابط خارج الجرد', [items.some(x => /تعليق/.test(x[1])), items.some(x => /English|https/.test(x[1]))], [false, false]);
  check('جرد JS: الـregex (حتى لو فيه علامة اقتباس) لا يُجرد ولا يكسر الماسح', [items.some(x => /نمط/.test(x[1])), items.some(x => x[1] === 'بعد الـregex')], [false, true]);
  const html = '<!-- تعليق HTML -->\n<h1 title="عنوان الصفحة">أهلًا بك</h1>\n<style>.a:after{content:"نص css"}</style>\n<p>text only</p>\n<script>\nconst x = \'نص داخل سكربت\';\n</script>';
  const hi = scanHtml(html).map(i => [i.kind, i.text]);
  check('جرد HTML: خاصية ونص بين وسوم ونص سكربت مضمّن، بلا تعليقات ولا style ولا إنجليزي',
    hi.map(x => x[1]).sort(), ['أهلًا بك', 'نص داخل سكربت', 'title="عنوان الصفحة"'].sort());
  // أرقام الأسطر + جذر مصطنع + حتمية الإخراج
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inv-'));
  fs.mkdirSync(path.join(tmp, 'js/generated'), {recursive: true});
  fs.writeFileSync(path.join(tmp, 'js/a.js'), "// تعليق\n\nconst x = 'سطر ثالث';\nconst y = `سطر\nمتعدد ${1}`;\n");
  fs.writeFileSync(path.join(tmp, 'js/generated/g.js'), "const x = 'مولَّد ما يُجرد';\n");
  fs.writeFileSync(path.join(tmp, 'index.html'), '<p>\n  فقرة\n</p>\n');
  const inv = inventory(tmp);
  check('جرد: أرقام الأسطر صحيحة (بداية النص) و js/generated مستثنى', inv.map(f => [f.file, f.rows.map(r => r.line)]), [['index.html', [2]], ['js/a.js', [3, 4]]]);
  check('جرد: الإخراج حتمي (مرتان متطابقتان) وعمود التصنيف فاضي', [render(inventory(tmp)).md === render(inv).md, /\| نص ثابت \|  \|/.test(render(inv).md)], [true, true]);
  fs.rmSync(tmp, {recursive: true, force: true});
}

// ---------- 001-T012: js/ui/crests.js (ثلاثة مصادر، <img>، الدرع الاحتياطي بلا PNG) ----------
const asyncCrestTests = (async () => {
  const {resolveObjectURL} = require('buffer');
  const sb = {console, Blob, URL};
  sb.window = sb;
  const cctx = vm.createContext(sb);
  ['js/data/season-config.js', 'js/data/season-2/participants.js', 'js/data/season-2/clubs.js', 'js/core/dom-utils.js', 'js/generated/assets.js', 'js/ui/crests.js', 'js/ui/empty-state.js', 'js/generated/card-themes.js', 'js/ui/card-layout.js', 'js/ui/card-kit.js']
    .forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), cctx, {filename: f}));
  const run = code => vm.runInContext(code, cctx);
  const blobText = async url => resolveObjectURL(url).text();
  // المصدر 2: المحسّن
  check('crests: نادٍ له ملف ← المصدر المحسّن (enhanced)', run("crestSource('الهلال').kind + ':' + crestSource('الهلال').slug"), 'enhanced:al-hilal');
  // المصدر 1: الرسمي يغلب المحسّن، ويُلغى فيرجع المحسّن
  run("CRESTS_OFFICIAL['al-hilal'] = '<svg id=\"official-test\" viewBox=\"0 0 10 10\"/>'; resetCrestCache();");
  check('crests: ملف في official ← يظهر بدل المحسّن', run("crestSource('الهلال').kind"), 'official');
  const offUrl = run("crestURL('الهلال')");
  check('crests: <img> الرسمي محتواه هو SVG الرسمي (مو المحسّن)', /official-test/.test(await blobText(offUrl)), true);
  run("delete CRESTS_OFFICIAL['al-hilal']; resetCrestCache();");
  check('crests: حذف الرسمي ← يرجع المحسّن', run("crestSource('الهلال').kind"), 'enhanced');
  // 001-T020: readableColor/contrastTextOn (SC-09: النص ≥ 4.5:1)
  const ratio = (a, b) => run(`(() => { const x = _rcParse('${a}'), y = _rcParse('${b}'); return _rcRatio(x, y); })()`);
  const rc1 = run("readableColor('#4EC9E9')");   // سماوي فاتح على سطح داكن افتراضي (--paper غير معرّف بلا صفحة ← سطح داكن)
  check('contrast: لون فاتح على سطح داكن يبقى كما هو لو تباينه كافٍ', run("readableColor('#9B7BF5')"), '#9B7BF5');
  check('contrast: لون داكن على سطح داكن يُفتَّح حتى ≥ 4.6:1', ratio(run("readableColor('#7A4EE9')"), '#10102E') >= 4.6, true);
  check('contrast: الصبغة ما تتغير (نفس hue تقريبًا)، والسداسي غير الصالح يرجع كما هو', [run("readableColor('var(--gold)')"), run("readableColor('red')")], ['var(--gold)', 'red']);
  check('contrast: contrastTextOn يختار الحبر على الفاتح والأبيض على الداكن', [run("contrastTextOn('#00B4FF')"), run("contrastTextOn('#B3401A')"), run("contrastTextOn('#FFFF00')"), run("contrastTextOn('#202040')")], ['var(--ink)', 'white', 'var(--ink)', 'white']);
  // 001-T012b: الشعارات الفاتحة: ثلاثة مصادر × ثيمين
  check('crests-light: محسّن + ثيم فاتح ← النسخة الفاتحة (CRESTS_LIGHT)', run("(() => { const s = crestSource('الهلال', {theme: 'light'}); return [s.kind, s.variant, s.svg === CRESTS_LIGHT['al-hilal'], s.svg === CRESTS['al-hilal']]; })()"), ['enhanced', 'light', true, false]);
  check('crests-light: محسّن + ثيم داكن ← العادية', run("(() => { const s = crestSource('الهلال', {theme: 'dark'}); return [s.kind, s.variant, s.svg === CRESTS['al-hilal']]; })()"), ['enhanced', 'dark', true]);
  check('crests-light: لكل شعار محسّن نسخة فاتحة مختلفة (32)', run("Object.keys(CRESTS).every(k => CRESTS_LIGHT[k] && CRESTS_LIGHT[k] !== CRESTS[k])"), true);
  check('crests-light: بلا صفحة ← داكن، وعنوان الفاتح ≠ الداكن', [run("crestSource('الهلال').variant"), run("crestURL('الهلال', {theme: 'light'}) !== crestURL('الهلال', {theme: 'dark'})")], ['dark', true]);
  run("CRESTS_OFFICIAL['al-hilal'] = '<svg id=\"official-test\" viewBox=\"0 0 10 10\"/>'; resetCrestCache();");
  check('crests-light: الرسمي يغلب بالثيمين (ما له نسخة فاتحة)', [run("crestSource('الهلال', {theme: 'light'}).kind"), run("crestSource('الهلال', {theme: 'dark'}).kind"), run("crestSource('الهلال', {theme: 'light'}).svg === crestSource('الهلال', {theme: 'dark'}).svg")], ['official', 'official', true]);
  run("delete CRESTS_OFFICIAL['al-hilal']; resetCrestCache();");
  check('crests-light: احتياطي بالثيمين نفسه (fallback)', [run("crestSource('نادي وهمي', {theme: 'light'}).kind"), run("crestSource('نادي وهمي', {theme: 'dark'}).kind"), run("crestSource('نادي وهمي', {theme: 'light'}).svg === crestSource('نادي وهمي', {theme: 'dark'}).svg")], ['fallback', 'fallback', true]);
  run("globalThis.__tmpLight = CRESTS_LIGHT['al-hilal']; delete CRESTS_LIGHT['al-hilal']; resetCrestCache();");
  check('crests-light: محسّن بلا نسخة فاتحة ← يرجع للعادية بالفاتح', run("(() => { const s = crestSource('الهلال', {theme: 'light'}); return [s.kind, s.variant, s.svg === CRESTS['al-hilal']]; })()"), ['enhanced', 'dark', true]);
  run("CRESTS_LIGHT['al-hilal'] = globalThis.__tmpLight; resetCrestCache();");
  check('crests-light: crestHTML بـopts.theme صريح بلا data-crest-club، وبدونه يحمله (تبديل بلا إعادة تحميل)', [/data-crest-club/.test(run("crestHTML('الهلال', 20, {theme: 'light'})")), /data-crest-club="الهلال"/.test(run("crestHTML('الهلال', 20)"))], [false, true]);
  // 001-T021: card-kit وتخطيط بطاقة الترتيب (assets/cards/standings-card.layout.md)
  const lay = JSON.parse(run("JSON.stringify([18,19,20,21,22,23,24].map(n => { const L = computeStandingsCardLayout(n); return [n, L.r, L.lastBottom, L.gap, L.scale.name, L.scale.crest]; }))"));
  check('card-layout: جدول المواصفة n=18..24 (الصف r، نهاية آخر صف، الفراغ، مقاسات الاسم والشعار)', lay, [[18,64,1704,56,40,36],[19,62,1746,14,40,36],[20,58,1744,16,40,36],[21,54,1742,18,36,32],[22,51,1746,14,36,32],[23,48,1744,16,36,32],[24,46,1760,0,32,28]]);
  check('card-layout: أول صف عند y=256، وفاصل إضافي 8 قبل الصفوف 6 و11 و16 و21', run("(() => { const L = computeStandingsCardLayout(24); return [L.rows[0].top, L.rows[5].top - L.rows[4].top - L.r, L.rows[4].top - L.rows[3].top - L.r, L.rows[10].top - L.rows[9].top - L.r]; })()"), [256, 24, 16, 24]);
  check('card-kit: الثيمان من tokens (داكن ≠ فاتح) وكل الألوان المطلوبة موجودة', run("['bg','surface-1','border','text','text-2','brand','gold','up','down'].every(k => CARD_THEMES.dark[k] && CARD_THEMES.light[k]) && CARD_THEMES.dark.bg !== CARD_THEMES.light.bg"), true);
  check('card-kit: cardMix يطابق color-mix(in srgb) وcardAccent: الفاتح مخلوط والداكن كما هو', [run("cardMix('#FF0000', '#0000FF', 0.34)"), run("cardAccent('light', 'gold') !== cardColor('light', 'gold')"), run("cardAccent('dark', 'gold') === cardColor('dark', 'gold')")], ['rgb(87, 0, 168)', true, true]);
  const okData = "({round: 10, standings: [{rank: 1, name: 'أ', total: 5, move: 0, clubs: ['الهلال', 'برشلونة', 'آيندهوفن']}, {rank: 2, name: 'ب', total: 4, move: 1, clubs: ['الهلال', 'برشلونة', 'آيندهوفن']}]})";
  check('card-kit: validateCardData يقبل بيانات كاملة', run(`validateCardData('standings', ${okData})`), []);
  check('card-kit: validateCardData يرجع النواقص بالعربية (جولة، اسم، رصيد، أندية)', run("validateCardData('standings', {round: 0, standings: [{rank: 1, name: '', total: NaN, clubs: ['الهلال']}, {rank: 2, name: 'ب', total: 4, clubs: ['س', 'ص', 'ع']}]})"), ['رقم الجولة غير محدد', 'اسم المشارك ناقص في الصف 1', 'رصيد الصف 1 غير محدد', 'أندية الصف 1 ناقصة (المطلوب ثلاثة)']);
  check('card-kit: بلا مشاركين أو بيانات فاضية ← رسالة عربية', [run("validateCardData('standings', {round: 3, standings: []})"), run("validateCardData('standings', null)")], [['لا يوجد مشاركون في الترتيب'], ['لا توجد بيانات للكرت']]);
  check('card-kit: CardDataError يحمل النواقص', run("(() => { const e = new CardDataError(['أ', 'ب']); return [e.name, e.problems.length, e.message]; })()"), ['CardDataError', 2, 'أ، ب']);
  // المصدر 3: نادٍ وهمي ← الدرع الاحتياطي
  check('crests: نادٍ وهمي بلا ملف ← الدرع الاحتياطي (fallback)', run("crestSource('نادي وهمي').kind"), 'fallback');
  const fb = run("crestSource('نادي وهمي').svg");
  check('crests: الدرع الاحتياطي SVG صالح بالإطار والعنوان واسم النادي', [/^<svg[\s>]/.test(fb), /<title>نادي وهمي<\/title>/.test(fb), /fill="#9B7BF5"/.test(fb)], [true, true, true]);
  // كل الأنماط ذات الرموز المتجهة (بدل أقنعة PNG)
  const patterns = ['eiffel', 'clover', 'saudiMap', 'ship', 'lion', 'wolf', 'lock', 'ball', 'phoenix', 'cannon', 'eagle'];
  const bad = [];
  patterns.forEach(pt => {
    const svg = run(`CLUB_STYLE['نادي-${pt}'] = {bg: '#112233', fg: '#fff', accent: '#ddeeff', pattern: '${pt}'}; fallbackCrestSVG('نادي-${pt}')`);
    if (!/<svg x="[\d.]+" y="[\d.]+" width="[\d.]+" height="[\d.]+" viewBox="[^"]+"[^>]*fill="#ddeeff"/.test(svg) || /<image|base64|<mask/.test(svg)) bad.push(pt);
  });
  check('crests: 11 نمطًا تستعمل الرمز المتجه (svg متداخل بلون النادي) بلا <image> ولا base64 ولا mask', bad, []);
  const all = run("Object.keys(CLUB_STYLE).filter(n => !n.startsWith('نادي-')).map(n => fallbackCrestSVG(n))");
  check('crests: الدرع الاحتياطي لكل أندية CLUB_STYLE الـ32 بلا PNG/base64', [all.length, all.some(x => /<image|base64/.test(x))], [32, false]);
  // crestHTML: <img> صغير ومعزول ومهرَّب
  const html = run("crestHTML('الهلال', 20)");
  check('crests: crestHTML ← <img class=crest> بأبعاد صريحة (20×22) وalt وtitle، وأقصر من 400 حرف', [/^<img class="crest" src="blob:/.test(html), /width="20" height="22"/.test(html), /alt="الهلال" title="الهلال"/.test(html), html.length < 400], [true, true, true, true]);
  check('crests: اسم نادٍ فيه علامة اقتباس يُهرَّب في alt/title', /alt="a&quot;b"/.test(run("crestHTML('a\"b', 18)")), true);
  check('crests: نفس النادي ← نفس العنوان (مخزَّن)، ونادٍ ثاني ← عنوان ثاني', [run("crestURL('الهلال') === crestURL('الهلال')"), run("crestURL('الهلال') !== crestURL('النصر')")], [true, true]);
  // الشعار الرئيسي
  const dark = await blobText(run("logoURL(false)")), light = await blobText(run("logoURL(true)"));
  check('crests: الشعار الداكن = الأبيض الأحادي (بلا الكحلي)، والفاتح = logoLight كما هو بنصه الكحلي #12142E (F3)', [/^<svg/.test(dark), /^<svg/.test(light), /#12142E/i.test(light), /#12142E/i.test(dark), dark === light], [true, true, true, false, false]);
  // لا بقايا: brand-assets محذوف ولا إحالة له ولا clubCrestSVG
  const refs = [];
  (function walk(d) { fs.readdirSync(d, {withFileTypes: true}).forEach(e => { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(js|html)$/.test(e.name)) { const t = fs.readFileSync(p, 'utf8'); if (/clubCrestSVG|brand-assets|LOGO_BASE64|_ICON_PNG_BASE64/.test(t)) refs.push(path.relative(ROOT, p)); } }); })(path.join(ROOT, 'js'));
  ['index.html', 'report.html'].forEach(f => { if (/brand-assets|clubCrestSVG|LOGO_BASE64/.test(fs.readFileSync(path.join(ROOT, f), 'utf8'))) refs.push(f); });
  check('crests: js/data/brand-assets.js محذوف ولا بقيت أي إحالة (clubCrestSVG وLOGO_BASE64 والأيقونات PNG)', [fs.existsSync(path.join(ROOT, 'js/data/brand-assets.js')), refs], [false, []]);
  // 001-T017: مكوّن الحالة الفاضية
  const es = run("emptyState({icon: 'bell', title: 'لا إشعارات جديدة', text: 'أنت مطّلع على آخر الأخبار.'})");
  check('empty-state: أيقونة (svg من ICONS) + عنوان + نص، وبلا أي شرطة كقيمة', [/<svg/.test(es), /<h3 class="empty-state-title">لا إشعارات جديدة<\/h3>/.test(es), /<p class="empty-state-text">/.test(es), /[—–]/.test(es)], [true, true, true, false]);
  check('empty-state: أيقونة غير معروفة تُهمَل بدون خطأ', /<svg/.test(run("emptyState({icon: 'ما-في-أيقونة', title: 'ت'})")), false);
  const esx = run("emptyState({title: '<img src=x onerror=1>', text: '\"x\"&', action: {label: '<b>', href: 'a\" onclick=\"1'}})");
  check('empty-state: النصوص والرابط مهرَّبة (لا وسوم ولا كسر خاصية)', [/<img/.test(esx), /<b>/.test(esx), /onclick="1/.test(esx)], [false, false, false]);
  check('empty-state: الزر الاختياري (رابط أو زر بمعرّف)', [/<a class="btn" href="x">ذهاب<\/a>/.test(run("emptyState({title:'t', action:{label:'ذهاب', href:'x'}})")), /<button type="button" class="btn" id="b1">ذهاب<\/button>/.test(run("emptyState({title:'t', action:{label:'ذهاب', id:'b1'}})"))], [true, true]);
  check('empty-state: emptyInline نص خافت بدل شرطة، وافتراضيه "لا بيانات بعد"', [run("emptyInline('لا جولات')"), run("emptyInline()")], ['<span class="empty-inline">لا جولات</span>', '<span class="empty-inline">لا بيانات بعد</span>']);
})();

// ---------- 000-T005: tools/make-fixture.js (التعقيم) على عينة خام صغيرة مصطنعة ----------
{
  const {sanitize} = require(path.join(ROOT, 'tools/make-fixture.js'));
  const SECRET_C = 'كلام خاص كتبه عضو 123', SECRET_W = 'رسالة جدار سرية';
  const raw = {
    version: 2, exportedAt: '2026-11-12T00:00:00.000Z',
    data: {
      rounds: [{number: 3, entries: [null, [{ga: 0, gf: 2, opp: 'أ', result: 'win', ti: 0}]], lastModified: 'x'}],
      roundComments: {'3': [null, {name: 'سعيد', text: SECRET_C, time: 1}], 'challenge_r4': {'6': {name: 'أبو عزام', time: 2, vote: 15}}},
      activityLog: [{action: '💾 حفظ الجولة 3', time: 't1', snapshot: {rounds: [1, 2, 3], big: 'x'.repeat(1000)}}, {action: 'دخول', time: 't2'}]
    },
    predictions: {enabled: false, entries: {}},
    extra: {wall: {'3': {'-k1': {pid: 5, name: 'سعيد', text: SECRET_W, time: 3, reactions: {'7': true}}}}, nameReactions: null, seasonDuels: null}
  };
  const {fixture, stats} = sanitize(raw, 'عينة اختبار');
  const out = JSON.stringify(fixture);
  check('تعقيم (أ): نص التعليق ← نص تجريبي', fixture.data.roundComments['3'][1].text, 'تعليق تجريبي 1');
  check('تعقيم (أ): نص الجدار ← نص تجريبي', fixture.extra.wall['3']['-k1'].text, 'رسالة تجريبية 1');
  check('تعقيم (أ): لا أثر للنص الأصلي في الناتج', out.includes(SECRET_C) || out.includes(SECRET_W), false);
  check('تعقيم (أ): الاسم والوقت والتفاعلات والأصوات تبقى', [fixture.data.roundComments['3'][1].name, fixture.data.roundComments['3'][1].time, fixture.extra.wall['3']['-k1'].reactions, fixture.data.roundComments.challenge_r4['6'].vote], ['سعيد', 1, {'7': true}, 15]);
  check('تعقيم (ب): snapshot محذوف من سجل النشاط', out.includes('"snapshot"'), false);
  check('تعقيم (ب): نص الإجراء والوقت يبقون', fixture.data.activityLog.map(e => [e.action, e.time]), [['💾 حفظ الجولة 3', 't1'], ['دخول', 't2']]);
  check('تعقيم (ج): الجولات ما تغيّرت', fixture.data.rounds, raw.data.rounds);
  check('تعقيم: الإحصاءات', [stats.rounds, stats.commentsReplaced, stats.wallReplaced, stats.snapshotsRemoved], [1, 1, 1, 1]);
  check('تعقيم: الأصل ما تعدّل', raw.data.roundComments['3'][1].text, SECRET_C);
  let bad = null;
  try { sanitize({version: 1, data: {}}); } catch (e) { bad = e.message; }
  check('تعقيم: نسخة غير version 2 ← خطأ واضح', /version: 2/.test(bad || ''), true);
  // اتساق مع ملف T05a: إعادة تعقيم الملف الجاهز ما تغيّر بياناته (idempotent)
  const season = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/season.json'), 'utf8'));
  const again = sanitize(season).fixture;
  check('تعقيم: season.json الجاهز يبقى كما هو بعد إعادة التعقيم', [again.data, again.predictions, again.extra], [season.data, season.predictions, season.extra]);
  check('تعقيم: season.json ≤ 500KB', fs.statSync(path.join(ROOT, 'tests/fixtures/season.json')).size <= 500 * 1024, true);
}

// ---------- 000-T006: Firebase الوهمي (tools/fake-firebase.js) ----------
const asyncTests = (async () => {
  const ffSrc = fs.readFileSync(path.join(ROOT, 'tools/fake-firebase.js'), 'utf8');
  const win = {__FIXTURE__: {data: {rounds: [{n: 1}]}, extra: {wall: {a: 1}}}, __OVERRIDES__: {currentChampionId: 7}, console};
  win.window = win;
  vm.runInContext(ffSrc, vm.createContext(win), {filename: 'fake-firebase.js'});
  const db = win.firebase.database();
  check('وهمي: get يقرأ data من fixture', (await db.ref('brookie/brookie-fantasy-s2-data').get()).val(), {rounds: [{n: 1}]});
  check('وهمي: overrides تحت brookie/ مباشرة', (await db.ref('brookie/currentChampionId').get()).val(), 7);
  check('وهمي: مسار غير موجود ← exists() = false', (await db.ref('brookie/nope').get()).exists(), false);
  await db.ref('brookie/x/y').set(5);
  check('وهمي: set ثم get', (await db.ref('brookie/x').get()).val(), {y: 5});
  await db.ref('brookie/x').update({'y': 6, 'z/w': 1});
  check('وهمي: update بمسارات متداخلة', (await db.ref('brookie/x').get()).val(), {y: 6, z: {w: 1}});
  await db.ref('brookie/visitors/total').transaction(v => (v || 0) + 1);
  await db.ref('brookie/visitors/total').transaction(v => (v || 0) + 1);
  check('وهمي: transaction', (await db.ref('brookie/visitors/total').get()).val(), 2);
  await db.ref('brookie/x').remove();
  check('وهمي: remove يحذف الفرع', (await db.ref('brookie/x').get()).exists(), false);
  const k = db.ref('brookie/list').push({a: 1}).key;
  await Promise.resolve();
  check('وهمي: push يولّد مفتاحًا ويكتب القيمة', (await db.ref('brookie/list/' + k).get()).val(), {a: 1});
  const seen = [];
  db.ref('brookie/live').on('value', s => seen.push(s.val()));
  await Promise.resolve(); await Promise.resolve();
  await db.ref('brookie/live').set(1);
  await Promise.resolve(); await Promise.resolve();
  check('وهمي: on(value) يستدعي فورًا ثم مع كل كتابة', seen, [null, 1]);
  let err = null;
  try { db.ref('brookie/a').orderByChild('x'); } catch (e) { err = e.message; }
  check('وهمي: دالة غير مدعومة ترمي خطأ واضحًا', /غير مدعوم/.test(err || ''), true);
  check('وهمي: الدالة غير المدعومة تُسجَّل', win.__FAKE_FIREBASE__.unsupported, ['ref.orderByChild()']);
})();

// ---------- 000-T009: tools/snap-diff.js (يحتاج pngjs وpixelmatch من npm ci، يُتخطى لو غير مثبّتين) ----------
const asyncDiffTests = (async () => {
  let PNG;
  try { PNG = require('pngjs').PNG; require.resolve('pixelmatch'); } catch (e) { console.log('⏭️ اختبارات snap-diff متخطاة (pngjs/pixelmatch غير مثبّتين: npm ci)'); return; }
  const os = require('os');
  const {main: diffMain} = require(path.join(ROOT, 'tools/snap-diff.js'));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'snapdiff-'));
  const mk = (dir, name, w, h, px) => {
    const img = new PNG({width: w, height: h});
    for (let i = 0; i < img.data.length; i += 4) { img.data[i] = 20; img.data[i + 1] = 30; img.data[i + 2] = 60; img.data[i + 3] = 255; }
    (px || []).forEach(([x, y, c]) => { const o = (y * w + x) * 4; img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; });
    fs.mkdirSync(path.join(tmp, dir), {recursive: true});
    fs.writeFileSync(path.join(tmp, dir, name), PNG.sync.write(img));
  };
  mk('base', 'same.png', 20, 20); mk('head', 'same.png', 20, 20);
  mk('base', 'color.png', 20, 20); mk('head', 'color.png', 20, 20, [[3, 3, [255, 0, 0]], [4, 3, [255, 0, 0]]]);
  mk('base', 'resized.png', 20, 20); mk('head', 'resized.png', 20, 30);
  mk('base', 'removed.png', 10, 10); mk('head', 'added.png', 10, 10);
  // ما نُسكت console.log: التزامن مع بقية اختبارات الملف كان يبتلع رسائل الفشل (❌) فيظهر العدّاد بدون تفاصيل
  const code = await diffMain(['--base', path.join(tmp, 'base'), '--head', path.join(tmp, 'head'), '--out', path.join(tmp, 'diff')]);
  const md = fs.readFileSync(path.join(tmp, 'diff/summary.md'), 'utf8');
  check('snap-diff: لا يفشل على الفروق (exit 0)', code, 0);
  check('snap-diff: الصورة المتغيّرة بلون واحد في الملخص', /`color\.png`/.test(md), true);
  check('snap-diff: الصورة المطابقة ما تظهر في الجدول', /`same\.png`/.test(md), false);
  check('snap-diff: تغيّر الحجم يُعد متغيّرًا مع ملاحظة', /`resized\.png`.*20×20 ← 20×30/.test(md), true);
  check('snap-diff: جديدة ومحذوفة تُسرد', [/## جديدة[\s\S]*`added\.png`/.test(md), /## محذوفة[\s\S]*`removed\.png`/.test(md)], [true, true]);
  check('snap-diff: صورة قبل|بعد|فرق للمتغيّرة فقط', [fs.existsSync(path.join(tmp, 'diff/color.png')), fs.existsSync(path.join(tmp, 'diff/same.png'))], [true, false]);
  const wide = PNG.sync.read(fs.readFileSync(path.join(tmp, 'diff/color.png')));
  check('snap-diff: عرض الصورة المركّبة = 3 صور + فاصلين', wide.width, 20 * 3 + 16 * 2);
  const empty = path.join(tmp, 'empty'); fs.mkdirSync(empty);
  const bad = await diffMain(['--base', empty, '--head', path.join(tmp, 'head'), '--out', path.join(tmp, 'd2')]);
  check('snap-diff: مجلد فاضي ← exit 2', bad, 2);
  // --crop: ±200px حول المتغيّر وحد أقصى 4000px (000-T011)
  mk('cbase', 'tall.png', 20, 1000); mk('chead', 'tall.png', 20, 1000, [[5, 500, [255, 0, 0]]]);
  mk('cbase', 'huge.png', 20, 6000); mk('chead', 'huge.png', 20, 6000, [[5, 100, [255, 0, 0]], [5, 5000, [255, 0, 0]]]);
  mk('cbase', 'edge.png', 20, 1000); mk('chead', 'edge.png', 20, 1000, [[5, 10, [255, 0, 0]]]);
  const run = async extra => { const l = console.log; console.log = () => {}; try { return await diffMain(['--base', path.join(tmp, 'cbase'), '--head', path.join(tmp, 'chead'), '--out', path.join(tmp, 'cdiff'), ...extra]); } finally { console.log = l; } };
  const h = f => PNG.sync.read(fs.readFileSync(path.join(tmp, 'cdiff', f))).height;
  await run([]);
  check('snap-diff: بدون --crop الصورة كاملة (السلوك القديم)', [h('tall.png'), h('huge.png'), h('edge.png')], [1000, 6000, 1000]);
  await run(['--crop']);
  check('snap-diff --crop: ±200 حول المتغيّر (500 ← 300..701)', h('tall.png'), 401);
  check('snap-diff --crop: عند الحافة العليا يبدأ من 0 (10 ← 0..211)', h('edge.png'), 211);
  check('snap-diff --crop: حد أقصى 4000px ارتفاعًا', h('huge.png'), 4000);
  const md2 = fs.readFileSync(path.join(tmp, 'cdiff/summary.md'), 'utf8');
  check('snap-diff --crop: الملخص يذكر القص وحد 4000', [/القص: مفعّل/.test(md2), /قُصّت الصورة: الصفوف 300–701 من 1000/.test(md2), /حد 4000px/.test(md2)], [true, true, true]);
  fs.rmSync(tmp, {recursive: true, force: true});
})();

// ---------- 000-T010: tools/lint.js (SC-04: أي زيادة تفشل، والتخفيض فقط يُسجَّل) ----------
{
  const {spawnSync} = require('child_process');
  const os = require('os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  fs.mkdirSync(path.join(tmp, 'css')); fs.mkdirSync(path.join(tmp, 'js'));
  const lint = (...a) => spawnSync('node', [path.join(ROOT, 'tools/lint.js'), '--root', tmp, ...a], {encoding: 'utf8'});
  const base = (o) => fs.writeFileSync(path.join(tmp, 'lint-baseline.json'), JSON.stringify(Object.assign({hexColors: 0, emoji: 0, inlineStyles: 0, numberNoun: 0, rawDates: 0, forbiddenTerms: 0, importants: 0, hardcodedCounts: 0}, o)));
  base({});
  fs.writeFileSync(path.join(tmp, 'css/a.css'), 'a{color:var(--x)}\n');
  check('lint: ريبو نظيف مقابل خط أساس صفر ← ينجح', lint().status, 0);
  fs.writeFileSync(path.join(tmp, 'css/a.css'), 'a{color:#123456}\n');
  const bad = lint();
  check('lint: إضافة #123456 لملف CSS ← يفشل (SC-04)', bad.status, 1);
  check('lint: رسالة الفشل تسمّي المقياس hexColors', /hexColors/.test(bad.stdout + bad.stderr), true);
  check('lint: --update-baseline يرفض الزيادة ولا يكتب', [lint('--update-baseline').status, JSON.parse(fs.readFileSync(path.join(tmp, 'lint-baseline.json'), 'utf8')).hexColors], [1, 0]);
  base({hexColors: 5});
  check('lint: تخفيض ← ينجح مع تلميح تسجيل التحسّن', lint().status, 0);
  lint('--update-baseline');
  check('lint: --update-baseline يخفّض خط الأساس للقيمة الحالية', JSON.parse(fs.readFileSync(path.join(tmp, 'lint-baseline.json'), 'utf8')).hexColors, 1);
  // إصلاح (001-T003): regex الإيموجي كان عامًا (/g) مع .test() لكل سطر، فيتذبذب العدّ حسب lastIndex (ثلاثة أسطر متتالية تُحسب سطرين)
  fs.writeFileSync(path.join(tmp, 'js/emoji.js'), "a = '😀';\nb = '🏆';\nc = '🔥';\nd = 'x';\ne = '⭐';\n");
  check('lint: عدّ الإيموجي بالأسطر ثابت (لا يتأثر بـlastIndex): 4 أسطر', require(path.join(ROOT, 'tools/lint.js')).measure(tmp).counts.emoji, 4);
  fs.rmSync(path.join(tmp, 'js/emoji.js'));
  fs.mkdirSync(path.join(tmp, 'js/core'));
  fs.writeFileSync(path.join(tmp, 'js/core/b.js'), "// #fff في تعليق ما يُحسب\n/* #eee\n#ddd */\nconst x = 'https://a.b/#abc';\n");
  check('lint: التعليقات لا تُحسب والنصوص تُحسب (css=1 + js=1)', require(path.join(ROOT, 'tools/lint.js')).measure(tmp).counts.hexColors, 2);
  fs.rmSync(tmp, {recursive: true, force: true});
}

// ---------- 002-T010: مكتبة الصوت js/voice/* (قوالب الواتساب والمنافس والتنوّع) ----------
{
  const vsb = {console}; vsb.window = vsb;
  const vctx = vm.createContext(vsb);
  ['js/core/ar-format.js', 'js/voice/voice-kit.js', 'js/voice/whatsapp-report.js', 'js/voice/spotlight-angles.js', 'js/voice/banter.js']
    .forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), vctx, {filename: f}));
  vm.runInContext('this.L = {WA_REPORT, SPOTLIGHT_ANGLES, SPOTLIGHT_FACTS, SPOTLIGHT_MOTIVATION, SPOTLIGHT_CLOSING, SPOTLIGHT_CONFLICTS, VOICE_ROUND_STORY, VOICE_STREAKS, VOICE_NOTIFY, VOICE_REGISTRY, voiceApply};', vctx);
  const L = vctx.L, h = {formatCount: vctx.formatCount, pickForm: vctx.pickForm, formatList: vctx.formatList};
  const apply = (t, st) => L.voiceApply(t, st, h);

  // 1) الحجم: ≥ 5 صيغ لكل مقطع، و8 لكل موقف قصة (FR-08)، و13 زاوية
  const short = [];
  Object.entries(L.WA_REPORT).forEach(([k, v]) => { if(v.length < 5) short.push('wa.' + k); });
  L.SPOTLIGHT_ANGLES.forEach(a => ['title', 'story', 'joke'].forEach(k => { if(a[k].length < 5) short.push(a.id + '.' + k); }));
  [['facts', L.SPOTLIGHT_FACTS], ['motiv.up', L.SPOTLIGHT_MOTIVATION.up], ['motiv.down', L.SPOTLIGHT_MOTIVATION.down], ['close.up', L.SPOTLIGHT_CLOSING.up], ['close.down', L.SPOTLIGHT_CLOSING.down],
    ['streak.hot', L.VOICE_STREAKS.hot], ['streak.cold', L.VOICE_STREAKS.cold], ['notify.newRound', L.VOICE_NOTIFY.newRound], ['notify.badge', L.VOICE_NOTIFY.badge], ['notify.hero', L.VOICE_NOTIFY.hero]]
    .forEach(([k, v]) => { if(v.length < 5) short.push(k); });
  Object.entries(L.VOICE_ROUND_STORY).forEach(([k, v]) => { if(v.length < 8) short.push('rs.' + k); });
  check('صوت: ≥ 5 صيغ لكل مقطع، و≥ 8 لكل موقف قصة، و13 زاوية للمنافس', [short, L.SPOTLIGHT_ANGLES.length], [[], 13]);

  const all = [].concat(...Object.values(L.WA_REPORT), ...L.SPOTLIGHT_ANGLES.map(a => [...a.title, ...a.story, ...a.joke]), L.SPOTLIGHT_FACTS,
    L.SPOTLIGHT_MOTIVATION.up, L.SPOTLIGHT_MOTIVATION.down, L.SPOTLIGHT_CLOSING.up, L.SPOTLIGHT_CLOSING.down, ...Object.values(L.VOICE_ROUND_STORY),
    L.VOICE_STREAKS.hot, L.VOICE_STREAKS.cold, ...Object.values(L.VOICE_NOTIFY));
  const ids = all.map(t => t.id);
  check('صوت: معرّفات القوالب فريدة', ids.filter((x, i) => ids.indexOf(x) !== i), []);
  const conflictIds = [].concat(...Object.entries(L.SPOTLIGHT_CONFLICTS).map(([k, v]) => [k, ...v]));
  check('صوت: جدول التعارض يشير لقوالب موجودة', conflictIds.filter(x => !ids.includes(x)), []);

  // 2) الرفض: حالة فاضية ما تطلع منها جملة ناقصة ولا خطأ
  const bad = all.filter(t => { const out = apply(t, {}); return out !== null && /undefined|NaN|null/.test(out); });
  check('صوت: الحالة الفاضية ما تنتج undefined/NaN (القالب يُرفض)', bad.map(t => t.id), []);

  // 3) بطارية حالات حدّية (0، 1، 2، 3، 11 في كل عدّاد) وفحص لغوي لكل نص ناتج
  const N = ['العندليب', 'أبو عزام', 'مصطفى عبده', 'أبا عتاب', 'أبو شيخة'];
  const counts = [1, 2, 3, 11], names = k => N.slice(0, Math.min(k, 5)), mv = (k, v) => ({names: names(k), val: v});
  const waStates = [], spStates = [], rsStates = [];
  for(let i = 0; i < 40; i++){
    const c = counts[i % 4], g = [0, 1, 2, 3, 11][i % 5], tie = [[], [], ['لطفي', 'أيوب'], ['لطفي', 'أيوب', 'سعيد']][i % 4];
    waStates.push({round: 10, nextRound: i % 7 ? 11 : null, firstRound: false, playersCount: 20,
      hero: {name: 'أبو أوس', pts: [1, 2, 6, 11][i % 4], tieBreak: i % 2 === 0, repeat: i % 3 === 0, prevRank: [2, 15][i % 2]},
      leader: {name: 'لطفي', total: [1, 2, 92, 111][i % 4]}, chaser: {name: 'أيوب', total: 90}, gap: tie.length ? 0 : g, topTied: tie,
      leaderChanged: i % 3 === 1, prevLeader: 'أيوب', climbers: i % 6 ? mv(c, [2, 3, 11][i % 3]) : null, droppers: i % 5 ? mv([1, 2, 3, 5][i % 4], [2, 4, 11][i % 3]) : null,
      mummat: names([0, 1, 2, 3, 5][i % 5]), mummaRepeat: i % 4 === 0 ? {name: 'سعيد', count: [2, 3][i % 2]} : null, hotStreak: i % 3 ? {name: 'أيوب', count: [3, 11][i % 2]} : null});
    spStates.push({round: 10, nextRound: i % 7 ? 11 : null, name: 'العندليب', rank: [1, 2, 4, 5, 12][i % 5], prevRank: [7, 12, 15, 3][i % 4], move: [3, 5, 11, -2, 0][i % 5],
      total: [85, 101, 111][i % 3], pts: [0, 1, 2, 6, 9][i % 5], played: true, playersCount: 20,
      above: {name: 'لطفي', gap: [1, 2, 3][i % 3]}, below: {name: 'سعيد', gap: [1, 2, 11][i % 3]}, isHero: i % 2 === 0, heroTieBreak: false, heroPts: 9,
      isLeader: i % 5 === 0, leaderChanged: i % 2 === 0, second: {name: 'أيوب', gap: [0, 1, 2, 3, 11][i % 5]}, prevPts: [0, 1, 3, 6][i % 4],
      last5: [[5, 5, 5, 5, 5], [4, 5, 6, 5, 4], [1, 9, 0, 6, 3]][i % 3], hotRun: [3, 4, 11, 0][i % 4], coldEnded: [2, 3, 11, 0][i % 4],
      clubs: {won: [1, 2, 3][i % 3], played: 3, best: {club: 'الهلال', opp: 'النصر', gf: [1, 3, 11][i % 3], ga: 0}},
      duel: i % 2 ? {opp: 'أيوب', myPts: [6, 3, 6][i % 3], oppPts: [3, 6, 6][i % 3], totalGap: [0, 1, 2, 3][i % 4]} : null,
      badge: i % 3 ? {title: 'أطول سلسلة نقاط'} : null, predictor: i % 2 ? {hits: [2, 3, 11][i % 3]} : null,
      seasonMumma: [0, 1, 2, 11][i % 4], heroCount: [0, 1, 2, 11][i % 4], bestPts: [1, 2, 12][i % 3]});
    rsStates.push({round: 10, hero: waStates[i].hero, mummat: waStates[i].mummat, climber: waStates[i].climbers, dropper: waStates[i].droppers,
      names: names(c), count: [2, 3, 11][i % 3], title: 'أطول سلسلة نقاط', name: 'أبو أوس'});
  }
  const texts = [];
  const run = (list, states) => list.forEach(t => states.forEach(st => { const o = apply(t, st); if(o !== null) texts.push([t.id, o]); }));
  run([].concat(...Object.values(L.WA_REPORT)), waStates);
  run([].concat(...L.SPOTLIGHT_ANGLES.map(a => [...a.title, ...a.story, ...a.joke]), L.SPOTLIGHT_FACTS, L.SPOTLIGHT_MOTIVATION.up, L.SPOTLIGHT_MOTIVATION.down, L.SPOTLIGHT_CLOSING.up, L.SPOTLIGHT_CLOSING.down), spStates);
  run([].concat(...Object.values(L.VOICE_ROUND_STORY), L.VOICE_STREAKS.hot, L.VOICE_STREAKS.cold, ...Object.values(L.VOICE_NOTIFY)), rsStates);
  const RULES = [
    ['عدد ومعدود', /(^|[^\d])([3-9]|10) (نقطة|مركز|جولة|ممة)(?![ء-ي])|(^|[^\d])[12] (نقاط|نقطة|مراكز|مركز|جولات|جولة)(?![ء-ي])|(^|[^\d])(1[1-9]|[2-9]\d) (نقاط|مراكز|جولات|ممّات)(?![ء-ي])/],
    ['شرطة طويلة', /[—–]/], ['ترقيم مكرر', /!!|؟؟|\.\./], ['مسافة قبل الترقيم أو مزدوجة', / [،.؟!:]|  /],
    ['لهجة غير سعودية', /(^|[^ء-ي])(لسه|مش|كمان|ولا يهمك|ليه|كده|هيك|وايد|إيش|عايز|كويس|بيفلت)(?![ء-ي])/],
    ['معجم', /المتسابق|اللاعب|رصيد الجولة|صفر نقاط|نجم الجولة|صاحب الصدارة|فك التعادل|الجوله/],
    ['بقايا', /undefined|NaN|\$\{|بـ(بلا|نقط)|ببلا/],
    ['مطابقة الصفة للمثنى', /(جولتان|جولتين|ممّتان|ممّتين|نقطتان|نقطتين|مركزان|مركزين) متتالية/],
    ['لام الجر مع أل', /لـال/],
    ['مبالغة: تهويل لبطل بنقاط قليلة', /(خطف الأضواء|ما ترك للباقين إلا التصفيق|بدون ما يعرق|ما رحم أحد) ب(نقطة|نقطتين)/],
  ];
  const fails = [];
  texts.forEach(([id, o]) => RULES.forEach(([name, re]) => { if(re.test(o)) fails.push(`${name}: ${id}: ${o}`); }));
  check(`صوت: ${texts.length} نصًا من الحالات الحدّية بلا أخطاء عدد أو ترقيم أو لهجة أو معجم`, [...new Set(fails.map(f => f.split(': ').slice(0, 2).join(': ')))].concat(fails.slice(0, 3)), []);

  // 4) كل زاوية تنطبق على حالة واحدة على الأقل، وتطلع عنوان وقصة ونكتة
  const dead = L.SPOTLIGHT_ANGLES.filter(a => !spStates.some(st => { try{ return a.when(st) && ['title', 'story', 'joke'].every(k => a[k].some(t => apply(t, st) !== null)); }catch(e){ return false; } }));
  check('صوت: كل زاوية من الـ13 قابلة للتحقق (عنوان وقصة ونكتة)', dead.map(a => a.id), []);
  // 5) الشروط تُحترم: زاوية الممة ما تنطبق على من جمع نقاطًا، والصاروخ ما ينطبق على صعود مركزين
  const A = id => L.SPOTLIGHT_ANGLES.find(a => a.id === id);
  check('صوت: شروط الزوايا (الممة بلا نقاط فقط، والصاروخ ≥ 3 مراكز)', [!!A('mummaHonor').when({played: true, pts: 2}), !!A('rocket').when({move: 2}), !!A('rocket').when({move: 3})], [false, false, true]);
  // 6) أمثلة حرفية
  const W = L.WA_REPORT;
  check('صوت: أمثلة حرفية (المثنى والفعل والمعطوف)', [
    apply(W.lead.find(t => t.id === 'wa.lead.2'), {leader: {name: 'لطفي', total: 92}, chaser: {name: 'أيوب', total: 90}, gap: 2, topTied: [], leaderChanged: false}),
    apply(W.drop.find(t => t.id === 'wa.drop.1'), {droppers: {names: ['أبو تغريد (زيد)', 'أبو رمزي'], val: 4}}),
    apply(W.lead.find(t => t.id === 'wa.lead.14'), {leader: {name: 'لطفي', total: 92}, topTied: ['لطفي', 'أيوب']}),
  ], [
    'لطفي على القمة برصيد 92 نقطة، لكن أيوب يتنفّس في رقبته بفارق نقطتين بس.',
    'بالمقابل، أبو تغريد (زيد) وأبو رمزي تراجعا 4 مراكز، والموسم طويل والعودة ممكنة.',
    'لطفي وأيوب يتقاسمان الصدارة برصيد 92 نقطة.',
  ]);
  check('صوت: السجلّ يصنّف كل مولّد', L.VOICE_REGISTRY.filter(r => !['متنوّع', 'ثابت بقصد', 'ينتظر ترحيل'].includes(r.status)).map(r => r.id), []);

  // 7) أداة العينات: حتمية وتطلع الجولة 10 بأرقامها الصحيحة
  const os = require('os');
  const tmp1 = path.join(os.tmpdir(), 'voice-a.md'), tmp2 = path.join(os.tmpdir(), 'voice-b.md');
  const log = console.log; console.log = () => {};
  const vs = require(path.join(ROOT, 'tools/voice-samples.js'));
  vs.main(['--rounds', '10', '--out', tmp1]); vs.main(['--rounds', '10', '--out', tmp2]);
  console.log = log;
  const s1 = fs.readFileSync(tmp1, 'utf8');
  check('عينات الصوت: حتمية، والجولة 10 فيها المتصدر والمثنى وبلا شرطة طويلة', [s1 === fs.readFileSync(tmp2, 'utf8'), /لطفي/.test(s1), /نقطتين/.test(s1), /[—–]/.test(s1.split('## الجولة')[1])], [true, true, true, false]);

  // 8) مصنّف الجرد (002-T005)
  const {classify} = require(path.join(ROOT, 'tools/text-classify.js'));
  check('تصنيف الجرد: لهجة في رسمي، وعدد ومعدود، وبيانات مستثناة، وسليم', [
    classify('index.html', 'الخصم لازم يختلف عن النادي.').includes('لهجة في نص رسمي'),
    classify('js/features/x.js', '${n} نقطة').includes('عدد ومعدود'),
    classify('js/data/season-2/clubs.js', 'الهلال').startsWith('مستثنى'),
    classify('index.html', 'اختر اسمك أولًا'),
  ], [true, true, true, 'رسمي · ✅ سليم']);
}

// ---------- الخلاصة ----------
Promise.all([asyncTests, asyncDiffTests, asyncCrestTests]).then(() => {
  console.log(`\n${pass} ✅ / ${fail} ❌`);
  process.exit(fail > 0 ? 1 : 0);
}, e => { console.log('❌ خطأ غير متوقع في الاختبارات غير المتزامنة:', e); process.exit(1); });
