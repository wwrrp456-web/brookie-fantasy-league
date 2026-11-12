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
  fs.mkdirSync(path.join(tmp, 'js/core'));
  fs.writeFileSync(path.join(tmp, 'js/core/b.js'), "// #fff في تعليق ما يُحسب\n/* #eee\n#ddd */\nconst x = 'https://a.b/#abc';\n");
  check('lint: التعليقات لا تُحسب والنصوص تُحسب (css=1 + js=1)', require(path.join(ROOT, 'tools/lint.js')).measure(tmp).counts.hexColors, 2);
  fs.rmSync(tmp, {recursive: true, force: true});
}

// ---------- الخلاصة ----------
Promise.all([asyncTests, asyncDiffTests]).then(() => {
  console.log(`\n${pass} ✅ / ${fail} ❌`);
  process.exit(fail > 0 ? 1 : 0);
}, e => { console.log('❌ خطأ غير متوقع في الاختبارات غير المتزامنة:', e); process.exit(1); });
