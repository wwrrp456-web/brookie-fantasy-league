#!/usr/bin/env node
/* فحص المقاييس الثمانية مقابل خط الأساس (000-T010، plan.md §3 "tools/lint.js").
 *
 * الاستعمال:
 *   node tools/lint.js                     يفحص ويقارن بـlint-baseline.json (أي زيادة = فشل، exit 1)
 *   node tools/lint.js --update-baseline   يسجّل التحسّن فقط (التخفيض). أي زيادة تُرفض ولا يُكتب شي
 *   node tools/lint.js --root <مسار>       يفحص جذر ثاني (مثل worktree فرع الأساس)
 *   node tools/lint.js --verbose           يطبع توزيع كل مقياس على الملفات
 *
 * المقاييس الثمانية: hexColors وemoji وinlineStyles وnumberNoun وrawDates وforbiddenTerms وimportants وhardcodedCounts (002-T004).
 * المقياس = عدد **الأسطر** المطابقة (مثل grep -c)، ويُحسب بعد حذف التعليقات (JS: // و/* *​/، CSS: /* *​/، HTML: <!-- -->)،
 * لأن المقصود ما يظهر للمستخدم أو يتنفّذ، مو شرح المطوّر.
 * إذا لم يوجد lint-baseline.json: --update-baseline ينشئه لأول مرة بالقيم الحالية.
 */
const fs = require('fs');
const path = require('path');

const METRICS = ['hexColors', 'emoji', 'inlineStyles', 'numberNoun', 'rawDates', 'forbiddenTerms', 'importants', 'hardcodedCounts'];
const AR_FORMAT = 'js/core/ar-format.js';   // الملف الوحيد المسموح له يلصق رقمًا بمعدود ويستدعي دوال التاريخ مباشرة

// المعدودات من glossary.md ("المعدودات المدعومة في formatCount")
const COUNTED = ['نقطة', 'نقاط', 'نقطتان', 'نقطتين', 'مركز', 'مراكز', 'مركزًا', 'مركزان', 'جولة', 'جولات', 'جولتان', 'جولتين',
  'مشارك', 'مشاركين', 'مشاركًا', 'مشاركان', 'ممة', 'ممّات', 'ممات', 'ممّتان', 'نادي', 'نادٍ', 'أندية', 'ناديًا', 'ناديان',
  'دوري', 'دوريات', 'دوريًا', 'دوريان', 'هدف', 'أهداف', 'هدفًا', 'هدفان', 'مباراة', 'مباريات', 'مباراتان'];
// الممنوعات من glossary.md (عمود ❌) اللي ما تلتبس بكلام عام
const FORBIDDEN = ['المتسابق', 'المتسابقين', 'المتسابقون', 'اللاعب', 'اللاعبين', 'رصيد الجولة', 'النقاط الكلية',
  'صفر نقاط', 'الجوله', 'متصدر الجولة', 'نجم الجولة', 'صاحب الصدارة', 'فرقه', 'تشكيلته', 'فك التعادل',
  'تحدي الجولة', 'نزال الجولة'];

const NOT_AR_LETTER = '(?![\\u0621-\\u064A\\u064B-\\u0652])';
const RE = {
  hex: /#[0-9a-fA-F]{3,8}\b/,
  emoji: /\p{Extended_Pictographic}/u,
  inlineStyle: /style="/,
  numberNoun: new RegExp('\\$\\{[^}]*\\}\\s*(?:' + COUNTED.join('|') + ')' + NOT_AR_LETTER),
  rawDate: /toLocale(?:Date)?String\(/,
  forbidden: new RegExp(FORBIDDEN.join('|')),
  // رقم مكتوب بالأرقام داخل نص عربي قبل معدود ("13 دوريًا"، "3 جولات"): لازم يُحسب من البيانات ويمر على formatCount (002 L-13)
  hardcoded: new RegExp('(?<![\\w.$])\\d[\\d,]*\\s+(?:' + COUNTED.join('|') + ')' + NOT_AR_LETTER),
  important: /!important/
};

function walk(dir, exts, skip, out) {
  out = out || [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!skip(p)) walk(p, exts, skip, out); }
    else if (exts.includes(path.extname(e.name))) out.push(p);
  }
  return out;
}

// حذف التعليقات مع احترام النصوص (علشان // داخل رابط ما يقطع السطر)
const keepLines = m => m.replace(/[^\n]/g, '');   // يحذف التعليق ويبقي أسطره فارغة (ترقيم الأسطر ثابت)
function stripJs(src) {
  return src.replace(/("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (m, str) => str || keepLines(m));
}
const stripCss = s => s.replace(/\/\*[\s\S]*?\*\//g, keepLines);
const stripHtml = s => s.replace(/<!--[\s\S]*?-->/g, keepLines);

function measure(root) {
  const rel = p => path.relative(root, p).split(path.sep).join('/');
  const jsFiles = walk(path.join(root, 'js'), ['.js'], p => rel(p) === 'js/generated');
  const cssFiles = walk(path.join(root, 'css'), ['.css'], () => false);
  const read = f => fs.readFileSync(f, 'utf8');
  // المقياس = عدد الأسطر المطابقة (مثل grep -c)، وهذا اللي بُني عليه خط الأساس المتوقع في tasks.md
  const count = (text, re) => text.split('\n').reduce((n, l) => n + (re.test(l) ? 1 : 0), 0);

  const result = {}; const perFile = {};
  const add = (metric, file, n) => { if (!n) return; result[metric] += n; (perFile[metric][file] = (perFile[metric][file] || 0) + n); };
  METRICS.forEach(m => { result[m] = 0; perFile[m] = {}; });

  const indexPath = path.join(root, 'index.html');
  const indexText = fs.existsSync(indexPath) ? stripHtml(read(indexPath)) : '';

  // hexColors: css/** (عدا tokens.css) و js/features|ui|core/**
  cssFiles.forEach(f => { const r = rel(f); if (r === 'css/tokens.css') return; add('hexColors', r, count(stripCss(read(f)), RE.hex)); });
  jsFiles.forEach(f => { const r = rel(f); if (/^js\/(features|ui|core)\//.test(r)) add('hexColors', r, count(stripJs(read(f)), RE.hex)); });
  // emoji: index.html و js/** (عدا generated/)
  add('emoji', 'index.html', count(indexText, RE.emoji));
  jsFiles.forEach(f => add('emoji', rel(f), count(stripJs(read(f)), RE.emoji)));
  // inlineStyles: index.html
  add('inlineStyles', 'index.html', count(indexText, RE.inlineStyle));
  // numberNoun و rawDates (عدا js/core/ar-format.js)، و hardcodedCounts (js/features/** فقط)، و forbiddenTerms
  jsFiles.forEach(f => {
    const r = rel(f); const t = stripJs(read(f));
    if (r !== AR_FORMAT) { add('numberNoun', r, count(t, RE.numberNoun)); add('rawDates', r, count(t, RE.rawDate)); }
    if (r.startsWith('js/features/')) add('hardcodedCounts', r, count(t, RE.hardcoded));
    add('forbiddenTerms', r, count(t, RE.forbidden));
  });
  add('forbiddenTerms', 'index.html', count(indexText, RE.forbidden));
  // importants: css/**
  cssFiles.forEach(f => add('importants', rel(f), count(stripCss(read(f)), RE.important)));

  return { counts: result, perFile };
}

function main(argv) {
  const arg = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  const root = path.resolve(arg('--root') || path.join(__dirname, '..'));
  const baselinePath = path.join(root, 'lint-baseline.json');
  const update = argv.includes('--update-baseline');
  const verbose = argv.includes('--verbose');

  const { counts, perFile } = measure(root);
  const hasBaseline = fs.existsSync(baselinePath);
  const baseline = hasBaseline ? JSON.parse(fs.readFileSync(baselinePath, 'utf8')) : null;

  if (!hasBaseline && !update) {
    console.error('❌ lint-baseline.json غير موجود. أنشئه أول مرة بـ: node tools/lint.js --update-baseline');
    return 1;
  }

  const missingMetrics = baseline ? METRICS.filter(m => baseline[m] === undefined) : [];
  if (missingMetrics.length && !update) {
    console.error('❌ lint-baseline.json ينقصه: ' + missingMetrics.join('، ') + '. سجّله بـ: node tools/lint.js --update-baseline');
    return 1;
  }
  const worse = [], better = [];
  if (baseline) METRICS.forEach(m => {
    const b = baseline[m];
    if (b === undefined) return;
    if (counts[m] > b) worse.push(m); else if (counts[m] < b) better.push(m);
  });

  console.log('المقياس'.padEnd(16) + 'الحالي'.padStart(8) + 'الأساس'.padStart(8) + '  الحالة');
  METRICS.forEach(m => {
    const b = baseline && baseline[m] !== undefined ? baseline[m] : '—';
    const st = worse.includes(m) ? '❌ زيادة' : better.includes(m) ? '⬇️ تحسّن' : '✅';
    console.log(m.padEnd(16) + String(counts[m]).padStart(8) + String(b).padStart(8) + '  ' + st);
  });
  if (verbose || worse.length) {
    (verbose ? METRICS : worse).forEach(m => {
      const top = Object.entries(perFile[m]).sort((a, b) => b[1] - a[1]).slice(0, 10);
      if (top.length) console.log(`\n${m}: أعلى الملفات\n` + top.map(([f, n]) => `  ${String(n).padStart(4)}  ${f}`).join('\n'));
    });
  }

  if (update) {
    if (worse.length) { console.error('\n❌ --update-baseline يسمح بالتخفيض فقط. زيادة في: ' + worse.join('، ') + '. ما كُتب شي.'); return 1; }
    const next = {};
    METRICS.forEach(m => { next[m] = baseline && baseline[m] !== undefined ? Math.min(baseline[m], counts[m]) : counts[m]; });
    fs.writeFileSync(baselinePath, JSON.stringify(next, null, 2) + '\n');
    console.log('\n✅ تم تحديث lint-baseline.json' + (better.length ? ' (تحسّن في: ' + better.join('، ') + ')' : ''));
    return 0;
  }
  if (worse.length) { console.error('\n❌ فشل الفحص: زيادة في ' + worse.join('، ') + '. أصلحها (لا ترفع خط الأساس).'); return 1; }
  if (better.length) console.log('\nℹ️ تحسّن في ' + better.join('، ') + '. سجّله بـ: node tools/lint.js --update-baseline');
  console.log('\n✅ الفحص نظيف.');
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { measure, main, METRICS };
