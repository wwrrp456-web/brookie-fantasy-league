#!/usr/bin/env node
/* تصنيف جرد النصوص (002-T005، جزء Opus) بقواعد specs/002-language-voice/style-guide.md.
 *
 *   node tools/text-inventory.js && node tools/text-classify.js [--in specs/002-language-voice/inventory.md] [--overrides specs/002-language-voice/inventory-overrides.json]
 *
 * يعبّي عمود «التصنيف» في inventory.md لكل نص بصيغة:  <الطبقة> · <الحالة>[: الأسباب]
 *   الطبقة: رسمي | شعبي | مستثنى (بيانات، أو مرجع الصياغة، أو كود مولَّد، أو رسالة مطوّر)
 *   الحالة: ✅ سليم | ✏️ يحتاج تعديل: <الأسباب> | ⏸️ قرار نبرة (من ملف الاستثناءات اليدوية)
 * القواعد آلية ومحافظة: تكشف ما يُقاس (العدد والمعدود، والترقيم، والمعجم، واللهجة غير السعودية، وخلط اللهجة
 * في نص رسمي، والتنوين، والإيموجي بالواجهة). أحكام النبرة والذوق تُكتب يدويًا في inventory-overrides.json
 * (مفتاحها "الملف:السطر:بداية النص") وتغلب الآلي. حتمي: نفس المدخل ← نفس المخرج. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// ── أماكن الطبقة الرسمية الإلزامية (الدستور 14): لهجة فيها = خلط ──
const FORMAL_FILES = [/^index\.html$/, /^js\/features\/admin-/, /^js\/features\/rules-and-about\.js$/, /^js\/features\/stats-tab\.js$/, /^js\/report\//, /^report\.html$/, /^js\/ui\/certificate-card\.js$/, /^js\/core\/storage\.js$/];
// ── ملفات الطبقة الشعبية (المولّدات والاحتفال) ──
const POPULAR_FILES = [/round-story-card\.js$/, /name-reactions\.js$/, /badge-toast\.js$/, /hot-cold-streaks\.js$/, /round-wall\.js$/, /^js\/voice\//];

const COUNTED = ['نقطة', 'نقاط', 'نقطتان', 'نقطتين', 'مركز', 'مراكز', 'مركزًا', 'جولة', 'جولات', 'مشارك', 'مشاركين', 'مشاركًا', 'ممة', 'ممّات', 'ممات', 'نادي', 'أندية', 'دوري', 'دوريات', 'هدف', 'أهداف', 'مباراة', 'مباريات', 'حرف', 'أرقام', 'يوم', 'أيام', 'ساعة', 'دقيقة', 'دقائق'];
const NOT_AR = '(?![\\u0621-\\u064A])';
const RE = {
  numberNoun: new RegExp('(?:\\$\\{[^}]*\\}|(?<![\\w.])\\d+)\\s*(?:' + COUNTED.join('|') + ')' + NOT_AR),
  dash: /[—–]/,
  doubleBang: /!!|؟؟/,
  tanween: /[ء-ي]اً/,
  latinComma: /[ء-ي]\s*,\s*[ء-ي]/,
  asciiQuote: /"[^"]*[ء-ي][^"]*"/,
  hindiDigits: /[٠-٩]/,
  abbrev: /(?:^|\s)ج\s?\d|\sن\.(?:\s|$)/,
  emoji: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2705}]/u,
};
// الممنوع من المعجم (glossary.md عمود ❌) — يُحسب في الكلمة الكاملة
const FORBIDDEN = ['المتسابق', 'المتسابقين', 'المتسابقون', 'متسابق', 'اللاعب', 'اللاعبين', 'رصيد الجولة', 'النقاط الكلية', 'صفر نقاط', 'الجوله', 'متصدر الجولة', 'نجم الجولة', 'صاحب الصدارة', 'فرقه', 'تشكيلته', 'فك التعادل', 'تحدي الجولة', 'نزال الجولة', 'خالي النقاط'];
// لهجات غير سعودية أو عبارات مرفوضة (style-guide §4)
const NON_SAUDI = ['لسه', 'لسا', 'لسّه', 'مش', 'كمان', 'برضو', 'ولا يهمك', 'ليه', 'كده', 'هيك', 'وايد', 'واجد', 'إيش', 'ايش', 'عايز', 'بدّي', 'كويس', 'منيح', 'دلوقتي', 'هلق', 'شلون', 'إزاي', 'أوي', 'خالص', 'علشان', 'يا جدعان', 'بيفلت', 'بيطلع', 'بيصير', 'هيطلع'];
// علامات اللهجة السعودية (تحدد الطبقة الشعبية، وتُعدّ خلطًا في الرسمي الإلزامي)
const DIALECT = ['وش', 'الحين', 'للحين', 'اللي', 'لازم', 'يبي', 'تبي', 'أبي', 'نبي', 'هذي', 'عشان', 'بس', 'مين', 'زين', 'كفو', 'طاح', 'مو', 'مب', 'يطارده', 'يسوي', 'تسوي', 'وين', 'ليش', 'كذا', 'شوي', 'خلاص', 'قاعد', 'يدوّر', 'مرة', 'اللي'];
const wordRe = list => new RegExp('(?:^|[^\\u0621-\\u064A])(?:' + list.join('|') + ')(?![\\u0621-\\u064A])');
const RE_FORBIDDEN = wordRe(FORBIDDEN);
const RE_NON_SAUDI = wordRe(NON_SAUDI);
const RE_DIALECT = wordRe(DIALECT.filter(w => w !== 'مرة'));

function exclusion(file, text) {
  if (file.startsWith('js/data/')) return 'بيانات';
  if (file === 'js/core/ar-format.js') return 'مرجع الصياغة';
  if (/\bconst\s|\/\/\s|\bfunction\b/.test(text)) return 'كود مولَّد';
  if (/^(?:formatCount|pickForm|formatList|formatDate|_ar)|TypeError|Error\(/.test(text)) return 'رسالة مطوّر';
  return null;
}

function classify(file, raw) {
  const ex = exclusion(file, raw);
  if (ex) return `مستثنى (${ex})`;
  // قيمة خاصية HTML (content="…" وplaceholder="…"): علامات الخاصية مو تنصيص
  const text = raw.replace(/^[\w-]+="([\s\S]*)"$/, '$1');
  const popularFile = POPULAR_FILES.some(r => r.test(file));
  const formalFile = FORMAL_FILES.some(r => r.test(file)) || /status-msg|showToast|alert\(|confirm\(|^تعذّر/.test(text);
  const hasDialect = RE_DIALECT.test(text) || RE_NON_SAUDI.test(text);
  const msgContext = /status-msg|showToast|alert\(|confirm\(|^تعذّر/.test(text);
  const layer = !msgContext && (popularFile || (hasDialect && !formalFile)) ? 'شعبي' : 'رسمي';
  const why = [];
  if (RE.numberNoun.test(text)) why.push('عدد ومعدود (formatCount)');
  if (RE_FORBIDDEN.test(text)) why.push('معجم');
  if (RE_NON_SAUDI.test(text)) why.push('لهجة غير سعودية');
  if (formalFile && RE_DIALECT.test(text)) why.push('لهجة في نص رسمي');
  if (RE.dash.test(text)) why.push('شرطة طويلة');
  if (RE.doubleBang.test(text)) why.push('ترقيم مكرر');
  if (RE.latinComma.test(text)) why.push('فاصلة لاتينية');
  if (RE.asciiQuote.test(text)) why.push('علامات تنصيص «»');
  if (RE.tanween.test(text)) why.push('التنوين (ًا)');
  if (RE.hindiDigits.test(text)) why.push('أرقام هندية');
  if (RE.abbrev.test(text)) why.push('اختصار');
  if (RE.emoji.test(text) && !/standings-table\.js$|^js\/voice\//.test(file)) why.push('إيموجي بالواجهة');
  return `${layer} · ` + (why.length ? `✏️ ${why.join('، ')}` : '✅ سليم');
}

function keyOf(file, line, text) { return `${file}:${line}:${text.slice(0, 24)}`; }

function run(inFile, overridesFile) {
  const md = fs.readFileSync(inFile, 'utf8');
  const overrides = fs.existsSync(overridesFile) ? JSON.parse(fs.readFileSync(overridesFile, 'utf8')) : {};
  const stats = { 'رسمي': {ok: 0, fix: 0, hold: 0}, 'شعبي': {ok: 0, fix: 0, hold: 0}, excluded: 0, reasons: {} };
  let file = null, usedOverrides = 0;
  const out = md.split('\n').map(line => {
    const h = line.match(/^## `([^`]+)` \(\d+\)$/);
    if (h) { file = h[1]; return line; }
    const m = file && line.match(/^\| (\d+) \| (.*) \| (نص ثابت|قالب فيه \$\{\}|HTML) \| (.*) \|$/);
    if (!m) return line;
    const [, ln, text, kind] = m;
    const ov = overrides[keyOf(file, ln, text)];
    const c = ov ? (usedOverrides++, ov) : classify(file, text);
    if (c.startsWith('مستثنى')) stats.excluded++;
    else {
      const layer = c.startsWith('شعبي') ? 'شعبي' : 'رسمي';
      if (c.includes('✅')) stats[layer].ok++; else if (c.includes('⏸️')) stats[layer].hold++; else stats[layer].fix++;
      const r = c.split('✏️ ')[1];
      if (ov && !c.includes('✅')) stats.reasons['حكم يدوي (inventory-overrides.json)'] = (stats.reasons['حكم يدوي (inventory-overrides.json)'] || 0) + 1;
      else if (r) r.split('، ').forEach(x => { stats.reasons[x] = (stats.reasons[x] || 0) + 1; });
    }
    return `| ${ln} | ${text} | ${kind} | ${c} |`;
  });
  // ملخص التصنيف بعد سطر الإجمالي (يُستبدل لو موجود)
  let txt = out.join('\n').replace(/\n## ملخص التصنيف[\s\S]*?(?=\n## عدد النصوص لكل ملف)/, '');
  const reasons = Object.entries(stats.reasons).sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`).join('\n');
  const summary = `\n## ملخص التصنيف (002-T005، Opus)\n\n> صنّفه \`node tools/text-classify.js\` بقواعد \`style-guide.md\`، مع ${usedOverrides} حكمًا يدويًا من \`inventory-overrides.json\`.\n> الصيغة: **الطبقة · الحالة**. ✅ سليم · ✏️ يحتاج تعديل (مع السبب) · ⏸️ قرار نبرة · «مستثنى» = بيانات أو كود أو رسائل مطوّر.\n\n| | ✅ سليم | ✏️ يحتاج تعديل | ⏸️ نبرة |\n|---|---|---|---|\n| **رسمي** | ${stats['رسمي'].ok} | ${stats['رسمي'].fix} | ${stats['رسمي'].hold} |\n| **شعبي** | ${stats['شعبي'].ok} | ${stats['شعبي'].fix} | ${stats['شعبي'].hold} |\n\nمستثنى: ${stats.excluded}\n\n| سبب التعديل | عدد النصوص |\n|---|---|\n${reasons}\n`;
  txt = txt.replace(/\n## عدد النصوص لكل ملف/, summary + '\n## عدد النصوص لكل ملف');
  fs.writeFileSync(inFile, txt);
  return stats;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
  const inFile = path.resolve(opt('--in', path.join(ROOT, 'specs/002-language-voice/inventory.md')));
  const ovFile = path.resolve(opt('--overrides', path.join(ROOT, 'specs/002-language-voice/inventory-overrides.json')));
  const s = run(inFile, ovFile);
  console.log(`✅ صُنّف: رسمي ${s['رسمي'].ok}✅/${s['رسمي'].fix}✏️/${s['رسمي'].hold}⏸️ · شعبي ${s['شعبي'].ok}✅/${s['شعبي'].fix}✏️/${s['شعبي'].hold}⏸️ · مستثنى ${s.excluded}`);
}
module.exports = { classify, run };
