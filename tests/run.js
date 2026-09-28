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

// ---------- الخلاصة ----------
console.log(`\n${pass} ✅ / ${fail} ❌`);
process.exit(fail > 0 ? 1 : 0);
