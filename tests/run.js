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

// ---------- الخلاصة ----------
asyncTests.then(() => {
  console.log(`\n${pass} ✅ / ${fail} ❌`);
  process.exit(fail > 0 ? 1 : 0);
}, e => { console.log('❌ خطأ غير متوقع في الاختبارات غير المتزامنة:', e); process.exit(1); });
