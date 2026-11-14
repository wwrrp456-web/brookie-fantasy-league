/* استيراد نتائج الجولة من نص ملصوق (002-R22 / S51): دوال صافية بلا DOM ولا شبكة. التطبيق لا يجلب ولا يقرأ ولا يتصل بأي موقع:
 * المنظّم يفتح صفحة 365Scores بنفسه، ينسخ النص، ويلصقه؛ والتحليل هنا محلي بالكامل ويعرض مسودة قبل أي تعبئة.
 *
 *   resultsLinkForDate(iso, lang) · resultsDaysInPeriod(start, end) · arNormalize(s) · resultsClubKey(name)
 *   parseResults(text, opts)  ← {rows, ignored, unknown, stats}: يفهم 3 صيغ: (1) نص صفحة 365 الأصلي (كتل أسطر)، (2) جدول | أو تبويب أو فاصلة
 *                                (جواب الذكاء الاصطناعي، وماركداون)، (3) سطر لكل مباراة «النادي 3-0 الخصم» (الصيغة القديمة)
 *   validateDraft(rows, ctx)  ← {issues, byRow, missingClubs, ok}: تقرير الفحص قبل التعبئة
 *   buildSearchPrompt({start, end}) ← نص «طلب البحث» الجاهز للذكاء الاصطناعي
 *   draftToParsed(rows)       ← {recognized, unrecognized} بصيغة applyParsedResultsToForm القديمة
 * قاعدة اللعبة: تُحتسب مباريات الدوري المحلي فقط؛ كل ما عداها (كأس، قارية، ودية، شباب، نساء، احتياط) يُعرض في «تم تجاهلها» بسببه.
 * المطابقة بالاسم كاملًا بحدود الكلمة بعد التطبيع (لا includes): «ميلان» لا تلتقط «إنتر ميلان»، و«الاتحاد» لا تلتقط «الاتحاد السكندري». */

// ---------- الإعدادات (تُعدَّل هنا فقط) ----------
const RESULTS_LINK_TEMPLATE = 'https://www.365scores.com/ar/football/match-results#date={date}';
const RESULTS_LINK_TEMPLATE_EN = 'https://www.365scores.com/en-us/football/match-results#date={date}';
const RESULTS_LINK_YESTERDAY = 'https://www.365scores.com/ar/football/yesterdays-matches';
const SCORE_ORDER = 'first-team-first';   // الفريق المذكور أولًا بالنص المنسوخ يأخذ الرقم الأول (مؤكَّد بعيّنة المراجع 14 نوفمبر)
const RESULTS_MAX_GOALS_SUM = 12;          // مجموع أهداف مباراة أكبر منه = «نتيجة غريبة»
const RESULTS_MAX_DAYS = 8;

// أسماء بديلة للأندية كما تكتبها 365 (عربي وإنجليزي)، تُضاف للاسم الأساسي من CLUBS. المطابقة كاملة بعد التطبيع.
const CLUB_ALIASES = {
  'آيندهوفن': ['ايندهوفن', 'أيندهوفن', 'PSV', 'PSV Eindhoven', 'Eindhoven'],
  'أتلتيكو مدريد': ['اتلتيكو مدريد', 'Atletico Madrid', 'Atlético Madrid', 'Atletico de Madrid'],
  'أرسنال': ['ارسنال', 'Arsenal'],
  'الاتحاد': ['الاتحاد جدة', 'Al Ittihad', 'Al-Ittihad', 'Al Ittihad Jeddah'],
  'الأهلي السعودي': ['الاهلي', 'الأهلي', 'الأهلي جدة', 'Al Ahli', 'Al-Ahli', 'Al Ahli Jeddah', 'Al-Ahli Saudi'],
  'الشباب': ['Al Shabab', 'Al-Shabab', 'Al Shabab Riyadh'],
  'القادسية': ['القادسية الخبر', 'Al Qadsiah', 'Al-Qadsiah'],
  'النصر': ['Al Nassr', 'Al-Nassr', 'Al Nasr'],
  'الهلال': ['الهلال السعودي', 'Al Hilal', 'Al-Hilal', 'Al Hilal Riyadh'],
  'أياكس': ['اياكس', 'Ajax'],
  'باريس سان جيرمان': ['باريس سان جرمان', 'باريس', 'PSG', 'Paris Saint-Germain', 'Paris Saint Germain'],
  'بايرن ميونيخ': ['بايرن ميونخ', 'بايرن ميونيخ', 'بايرن', 'Bayern Munich', 'Bayern München', 'Bayern Munchen'],
  'برشلونة': ['برشلونه', 'Barcelona', 'FC Barcelona'],
  'بنفيكا': ['Benfica', 'SL Benfica'],
  'بورتو': ['Porto', 'FC Porto'],
  'بوروسيا دورتموند': ['دورتموند', 'Borussia Dortmund', 'Dortmund'],
  'تشيلسي': ['Chelsea'],
  'دينامو زغرب': ['دينامو زاغرب', 'Dinamo Zagreb', 'GNK Dinamo Zagreb'],
  'روما': ['Roma', 'AS Roma'],
  'ريال مدريد': ['Real Madrid'],
  'رينجرز': ['رانجرز', 'Rangers', 'Glasgow Rangers'],
  'سبورتينغ لشبونة': ['سبورتنغ لشبونة', 'سبورتينج لشبونة', 'سبورتنج لشبونة', 'سبورتينغ', 'Sporting CP', 'Sporting Lisbon', 'Sporting'],
  'سلتيك': ['سيلتيك', 'Celtic'],
  'شختار دونيتسك': ['شاختار دونيتسك', 'شاختار', 'Shakhtar Donetsk', 'Shakhtar'],
  'غلطة سراي': ['جالطة سراي', 'غالطة سراي', 'Galatasaray'],
  'فاينورد': ['فايينورد', 'فيينورد', 'Feyenoord'],
  'فنربخشة': ['فنربهتشه', 'فنربهشه', 'فنربخشه', 'فنرباخشة', 'Fenerbahce', 'Fenerbahçe'],
  'ليفربول': ['Liverpool'],
  'مارسيليا': ['مرسيليا', 'Marseille', 'Olympique Marseille', 'Olympique de Marseille'],
  'مانشستر سيتي': ['مان سيتي', 'Manchester City', 'Man City'],
  'ميلان': ['إيه سي ميلان', 'اي سي ميلان', 'AC Milan', 'Milan'],
  'يوفنتوس': ['Juventus']
};

// أسماء الدوريات المحلية كما تكتبها 365 (مفتاحها = اسم الدوري بـCLUB_LEAGUE_MAP). المطابقة كاملة، فـ«الدوري الإسباني الدرجة الثانية» لا يطابق.
const DOMESTIC_LEAGUE_ALIASES = {
  'الدوري السعودي': ['دوري روشن السعودي', 'دوري روشن', 'دوري المحترفين السعودي', 'دوري المحترفين', 'Saudi Pro League', 'Roshn Saudi League', 'Saudi League'],
  'الدوري الإسباني': ['الليغا', 'لاليغا', 'لا ليغا', 'الدوري الأسباني', 'La Liga', 'LaLiga'],
  'الدوري الإنجليزي': ['الدوري الإنجليزي الممتاز', 'البريميرليغ', 'بريميرليغ', 'Premier League', 'English Premier League'],
  'الدوري الإيطالي': ['سيريا أ', 'الدوري الإيطالي الدرجة الأولى', 'Serie A'],
  'الدوري الألماني': ['البوندسليغا', 'Bundesliga'],
  'الدوري الفرنسي': ['ليغ 1', 'الدوري الفرنسي الدرجة الأولى', 'Ligue 1'],
  'الدوري البرتغالي': ['الدوري البرتغالي الممتاز', 'Liga Portugal', 'Primeira Liga'],
  'الدوري الهولندي': ['إريديفيزي', 'اريدفيزي', 'Eredivisie'],
  'الدوري التركي': ['الدوري التركي الممتاز', 'سوبر ليغ', 'Super Lig', 'Süper Lig'],
  'الدوري الأسكتلندي': ['الدوري الاسكتلندي', 'الدوري الأسكتلندي الممتاز', 'Scottish Premiership'],
  'الدوري الكرواتي': ['Croatian First League', 'SuperSport HNL', 'HNL'],
  'الدوري الأوكراني': ['الدوري الأوكراني الممتاز', 'Ukrainian Premier League']
};

// مسابقات/فرق لا تُحتسب (سبب التجاهل بالعربي). تُفحص على عنوان المسابقة وعلى اسم الفريق.
const NON_DOMESTIC_PATTERNS = [
  [/كأس|سوبر|درع|cup|supercup|super cup|copa|coupe|pokal|taca/i, 'كأس أو سوبر (ليست دوريًا)'],
  [/دوري أبطال|دوري الأبطال|دوري أوروبا|المؤتمر|الأبطال|champions league|europa|conference|libertadores|الأمم|nations league|تصفيات|qualif|مونديال|كأس العالم|world cup/i, 'بطولة قارية أو دولية'],
  [/(^|\s)(ال)?ودي[ةه](\s|$)|friendl/i, 'مباراة ودية'],
  [/الدرجة (الثانية|الثالثة|الرابعة)|درجة ثانية|second division|segunda|serie b|serie c|league two|league one|championship|2\. bundesliga|ligue 2/i, 'دوري درجة أدنى']
];
const YOUTH_PATTERNS = /تحت\s*\d+|دون\s*\d+|شباب\s*\d+|ناشئين|احتياطي|احتياط|نساء|سيدات|فريق الشباب|\bU-?\s?\d{2}\b|\bB\b|\bII\b|reserves?|women|femin|youth/i;

const _AR_MONTHS = {'يناير': 1, 'فبراير': 2, 'مارس': 3, 'أبريل': 4, 'ابريل': 4, 'مايو': 5, 'يونيو': 6, 'يوليو': 7, 'أغسطس': 8, 'اغسطس': 8, 'سبتمبر': 9, 'أكتوبر': 10, 'اكتوبر': 10, 'نوفمبر': 11, 'ديسمبر': 12};

// ---------- التطبيع والمطابقة ----------
// ا/أ/إ/آ ← ا، ة ← ه، ى ← ي، حذف التشكيل والتطويل وعلامات الترقيم، ولاتيني صغير، وطيّ المسافات
function arNormalize(s){
  return String(s == null ? '' : s)
    .normalize('NFKD').replace(/[ً-ٰٟـ‎‏‪-‮]/g, '')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/[ىئ]/g, 'ي').replace(/ؤ/g, 'و')
    .toLowerCase().replace(/[-_.'’`"«»()[\]{}|]/g, ' ').replace(/\s+/g, ' ').trim();
}

let _clubIndex = null;
function _buildClubIndex(){
  const idx = new Map();
  const add = (n, club) => { const k = arNormalize(n); if(k && !idx.has(k)) idx.set(k, club); };
  CLUBS.forEach(c => add(c, c));
  CLUBS.forEach(c => (CLUB_ALIASES[c] || []).forEach(a => add(a, c)));
  return idx;
}
// اسم أي نادٍ كما يكتبه المصدر ← اسمه بـCLUBS، أو null. كاملًا لا جزئيًا.
function resultsClubKey(name){
  if(!_clubIndex) _clubIndex = _buildClubIndex();
  return _clubIndex.get(arNormalize(name)) || null;
}

// عنوان مسابقة ← 'domestic:<اسم الدوري>' لو يطابق دوريًا محليًا لأحد أنديتنا، أو {kind, reason}
function _leagueIndex(){
  const m = new Map();
  Object.keys(DOMESTIC_LEAGUE_ALIASES).forEach(l => {
    m.set(arNormalize(l), l);
    DOMESTIC_LEAGUE_ALIASES[l].forEach(a => m.set(arNormalize(a), l));
  });
  return m;
}
let _leagueIdx = null;
function resultsLeagueKey(title){
  if(!_leagueIdx) _leagueIdx = _leagueIndex();
  return _leagueIdx.get(arNormalize(title)) || null;
}
function resultsClassifyCompetition(title){
  const t = String(title || '');
  for(const [re, reason] of NON_DOMESTIC_PATTERNS) if(re.test(t)) return {kind: 'other', reason};
  if(YOUTH_PATTERNS.test(t)) return {kind: 'other', reason: 'فرق شباب أو احتياط أو نساء'};
  const lg = resultsLeagueKey(t);
  if(lg) return {kind: 'domestic', league: lg};
  return {kind: 'unknown', reason: 'عنوان مسابقة غير معروف'};
}

// ---------- الروابط والتواريخ ----------
function resultsLinkForDate(iso, lang){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) throw new RangeError('resultsLinkForDate: تاريخ غير صالح: ' + String(iso));
  return (lang === 'en' ? RESULTS_LINK_TEMPLATE_EN : RESULTS_LINK_TEMPLATE).replace('{date}', iso);
}
function _isoToUtc(iso){ const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); }
function _utcToIso(t){ return new Date(t).toISOString().slice(0, 10); }
// الأيام من البداية إلى النهاية شاملةً (بحد أقصى RESULTS_MAX_DAYS). [] لو غير صالح
function resultsDaysInPeriod(start, end){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(start)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(end))) return [];
  const a = _isoToUtc(start), b = _isoToUtc(end);
  if(!(b >= a)) return [];
  const out = [];
  for(let t = a; t <= b && out.length < RESULTS_MAX_DAYS; t += 86400000) out.push(_utcToIso(t));
  return out;
}

// ---------- الصيغة 1: نص صفحة 365 الأصلي ----------
const _FINISHED_RE = /^(انتهت|انتهى|نهايه المباراه|نهاية المباراة|ن\.?|ft|full time|التسعير)$/i;
const _LIVE_RE = /مباشر|جارية|الشوط|استراحة|live|ht\b|\d+\s*['′]/i;
const _POSTPONED_RE = /مؤجل|ملغ|postponed|cancel|abandon/i;
const _DASH = /^[-–—]$/;

function _isNum(s){ return /^\d{1,2}$/.test(s); }

function _parseDateHeader(line, year){
  const m = String(line).match(/^[ء-ي]+[,،]?\s*(\d{1,2})\s+([ء-ي]+)$/);
  if(!m) return null;
  const mo = _AR_MONTHS[m[2]] || _AR_MONTHS[arNormalize(m[2])];
  if(!mo) return null;
  const d = Number(m[1]);
  return `${year}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// يرجع {matches: [{league, home, away, hs, as, status, date}], ...} من نص 365
function _parse365(text, opts){
  const lines = String(text).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const year = (opts && opts.year) || new Date().getFullYear();
  const out = [];
  let league = null, date = (opts && opts.date) || null;
  for(let i = 0; i < lines.length; i++){
    const l = lines[i];
    const dh = _parseDateHeader(l, year);
    if(dh && !(opts && opts.date)){ date = dh; continue; }
    const hm = l.match(/^(.{2,}?)\s*[,،]\s*(.{2,})$/);
    if(hm && lines[i + 1] && arNormalize(lines[i + 1]) === arNormalize(hm[1])){ league = hm[1].trim(); continue; }
    if(/^ترتيب\s/.test(l)){ league = null; continue; }
    const isScore = _isNum(l) && _DASH.test(lines[i + 1] || '') && _isNum(lines[i + 2] || '');
    const isTime = /^\d{1,2}:\d{2}$/.test(l);
    if(!isScore && !isTime) continue;
    // الفريق الأول: أقرب سطرين متطابقين (اسم + نص بديل الشعار) قبل النتيجة، ويُتخطّى بينهما سطر الحالة وأرقام البطاقات الحمراء
    let hj = -1;
    for(let j = i - 1; j >= Math.max(1, i - 5); j--){ if(lines[j] === lines[j - 1] && !_isNum(lines[j])){ hj = j; break; } }
    if(hj < 0) continue;
    const home = lines[hj];
    const statusText = lines.slice(hj + 1, i).filter(x => !_isNum(x)).join(' ');
    let k = isScore ? i + 3 : i + 1;
    while(k < lines.length && _isNum(lines[k])) k++;          // بطاقات حمراء
    const away = lines[k];
    if(!away) continue;
    let status = 'played';
    if(isTime) status = 'not_started';
    else if(_POSTPONED_RE.test(statusText)) status = 'postponed';
    else if(_LIVE_RE.test(statusText) && !_FINISHED_RE.test(statusText.trim())) status = 'live';
    out.push({league, home, away, hs: isScore ? Number(l) : null, as: isScore ? Number(lines[i + 2]) : null, status, date, statusText});
    i = k;   // تجاوز أسطر الفريق الثاني
  }
  // إزالة التكرار بين قسمي الصفحة («شائعة» و«حسب البلد»): نفس الفريقين والنتيجة والتاريخ تُحسب مرة
  const seen = new Set();
  return out.filter(m => { const key = [arNormalize(m.home), arNormalize(m.away), m.hs, m.as, m.date].join('|'); if(seen.has(key)) return false; seen.add(key); return true; });
}

function _resultOf(gf, ga){ return gf > ga ? 'win' : (gf < ga ? 'loss' : 'draw'); }

// ---------- الصيغة 2: جدول (جواب الذكاء الاصطناعي) ----------
function _splitTableLine(line){
  let l = line.trim();
  if(l.includes('|')) return l.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
  if(l.includes('\t')) return l.split('\t').map(c => c.trim());
  return null;
}
const _STATUS_PLAYED = /^(لعبت|لُعبت|لعب|لُعب|انتهت|انتهى|played|ft)$/i;
const _STATUS_NOT_PLAYED = /(لم يلعب|لم تلعب|لم تُلعب|لم يُلعب|لا مباراة|بدون مباراة|no match|not played)/i;
const _STATUS_POSTPONED = /(مؤجل|مؤجلة|ملغ|postponed)/i;

function _parseTableRow(cells){
  const out = {club: null, opp: '', gf: null, ga: null, date: null, status: null, source: '', raw: cells.join(' | ')};
  cells.forEach(c => {
    if(/^https?:\/\//i.test(c)) { out.source = c; return; }
    if(/^\d{4}-\d{2}-\d{2}$/.test(c)) { out.date = c; return; }
    const sm = c.match(/^(\d{1,2})\s*[-–—:]\s*(\d{1,2})$/);
    if(sm && out.gf === null){ out.gf = Number(sm[1]); out.ga = Number(sm[2]); return; }
    if(_STATUS_NOT_PLAYED.test(c)){ out.status = 'not_played'; return; }
    if(_STATUS_POSTPONED.test(c)){ out.status = 'postponed'; return; }
    if(_STATUS_PLAYED.test(c)){ out.status = 'played'; return; }
    if(!out.club && resultsClubKey(c)){ out.club = resultsClubKey(c); return; }
    if(c && !out.opp) out.opp = c;
  });
  if(!out.status) out.status = out.gf !== null ? 'played' : 'not_played';
  return out;
}

// ---------- الصيغة 3: «النادي 3-0 الخصم» ----------
function _parseOneLine(line){
  const m = line.match(/^(.+?)\s+(\d{1,2})\s*[-–—:]\s*(\d{1,2})(?:\s+(.*))?$/);
  if(!m) return null;
  const club = resultsClubKey(m[1]);
  if(!club) return {unrecognized: true, raw: line};
  return {club, gf: Number(m[2]), ga: Number(m[3]), opp: (m[4] || '').trim(), status: 'played', date: null, source: '', raw: line};
}

// ---------- الواجهة العامة: parseResults ----------
// opts: {year, date (تاريخ هذه اللصقة، يتجاوز رأس التاريخ بالنص), lang}
// ← {rows: [{club, opp, oppKnown, gf, ga, date, status, source, note, src, league}], ignored: [{text, reason, match?}], unknown: [أسطر/أسماء لم تُفهم],
//    stats: {matches365, ours, ignored}}
function parseResults(text, opts){
  const o = opts || {};
  const rows = [], ignored = [], unknown = [];
  const src = String(text == null ? '' : text);
  const rowFrom = (club, opp, gf, ga, base) => Object.assign({club, opp: opp || '', oppKnown: !opp || CLUBS.includes(opp), gf, ga, date: null, status: 'played', source: '', note: '', src: '', league: ''}, base);

  // (2) جداول: أي سطر فيه | أو تبويب
  const tableLines = [], rest = [];
  src.split(/\r?\n/).forEach(l => {
    const cells = _splitTableLine(l);
    if(cells && cells.length >= 2 && !/^[\s:|-]+$/.test(l)){
      if(cells.every(c => /^[-: ]*$/.test(c))) return;                                   // فاصل ماركداون
      if(/^(النادي|نادي|club)$/i.test(cells[0]) || /النتيجة/.test(cells.join(' ')) && !cells.some(c => /\d/.test(c))) return;   // سطر الترويسة
      tableLines.push(cells);
    } else rest.push(l);
  });
  tableLines.forEach(cells => {
    const r = _parseTableRow(cells);
    if(!r.club){ unknown.push(r.raw); return; }
    const status = r.status;
    rows.push(rowFrom(r.club, r.opp ? (resultsClubKey(r.opp) || r.opp) : '', status === 'played' ? r.gf : null, status === 'played' ? r.ga : null, {date: r.date, status, source: r.source, note: status === 'played' ? '' : (status === 'postponed' ? 'مؤجلة' : 'لم يلعب'), src: 'table'}));
  });

  // (1) نص 365: نبحث عن نمط الكتلة؛ لو وُجدت مباريات نعتمدها
  const restText = rest.join('\n');
  const m365 = _parse365(restText, {year: o.year, date: o.date});
  m365.forEach(m => {
    const hc = resultsClubKey(m.home), ac = resultsClubKey(m.away);
    if(!hc && !ac) return;                                         // مباراة لا تخصّنا: تُهمل بصمت (مئات المباريات)
    const label = `${m.home} ${m.hs === null ? '' : m.hs + ' - ' + m.as + ' '}${m.away}`.replace(/\s+/g, ' ');
    const ours = [hc, ac].filter(Boolean).join('، ');
    if(YOUTH_PATTERNS.test(m.home) || YOUTH_PATTERNS.test(m.away)){ ignored.push({text: label, reason: 'فرق شباب أو احتياط أو نساء', league: m.league || ''}); return; }
    if(m.status === 'live'){ ignored.push({text: label, reason: 'لم تنتهِ بعد (مباشر)', league: m.league || ''}); return; }
    const cls = resultsClassifyCompetition(m.league || '');
    const sides = [[hc, m.home, m.hs, m.as, m.away], [ac, m.away, m.as, m.hs, m.home]];
    sides.forEach(([club, name, gf, ga, oppName]) => {
      if(!club) return;
      if(cls.kind === 'other'){ ignored.push({text: label, reason: cls.reason, league: m.league || '', club}); return; }
      if(cls.kind === 'unknown'){ ignored.push({text: label, reason: cls.reason, league: m.league || '', club, unknownLeague: true, match: {club, opp: resultsClubKey(oppName) || oppName, gf, ga, date: m.date, status: m.status}}); return; }
      if(CLUB_LEAGUE_MAP[club] !== cls.league){ ignored.push({text: label, reason: `دوري غير محلي لـ${club} (${m.league})`, league: m.league || '', club}); return; }
      const status = m.status === 'not_started' ? 'not_played' : (m.status === 'postponed' ? 'postponed' : 'played');
      rows.push(rowFrom(club, resultsClubKey(oppName) || oppName, status === 'played' ? gf : null, status === 'played' ? ga : null, {
        date: m.date, status, note: status === 'played' ? '' : (status === 'postponed' ? 'مؤجلة' : 'لم تبدأ'), src: '365', league: cls.league}));
    });
    void ours;
  });

  // (3) أسطر «النادي 3-0 الخصم» من بقية السطور (التي لم تكن ضمن كتل 365)
  if(!m365.length){
    rest.map(l => l.trim()).filter(Boolean).forEach(l => {
      const r = _parseOneLine(l);
      if(!r) { if(/\d\s*[-–—:]\s*\d/.test(l)) unknown.push(l); return; }
      if(r.unrecognized){ unknown.push(r.raw); return; }
      rows.push(rowFrom(r.club, resultsClubKey(r.opp) || r.opp, r.gf, r.ga, {src: 'line'}));
    });
  }

  // إزالة التكرار الحرفي (نفس النادي والخصم والنتيجة والتاريخ)
  const seen = new Set();
  const uniq = rows.filter(r => { const k = [r.club, arNormalize(r.opp), r.gf, r.ga, r.date, r.status].join('|'); if(seen.has(k)) return false; seen.add(k); return true; });
  // لو معظم أسماء الفرق بالنص غير معروفة (غالبًا ترجمة المتصفح مفعّلة): تنبيه
  const namesSeen = m365.length * 2, namesKnown = m365.reduce((n, m) => n + (resultsClubKey(m.home) ? 1 : 0) + (resultsClubKey(m.away) ? 1 : 0), 0);
  const likelyTranslated = m365.length >= 5 && namesKnown / namesSeen < 0.04 && !uniq.length;
  return {rows: uniq, ignored, unknown, stats: {matches365: m365.length, ours: uniq.length, ignored: ignored.length, likelyTranslated}};
}

// ---------- تقرير الفحص ----------
// ctx: {start, end (ISO) اختياري، expectAll: هل نتوقع سطرًا لكل نادٍ (افتراضيًا true)}
// ← {issues: [{row (فهرس أو -1), level: 'warn'|'info', code, text}], byRow: {فهرس: [issues]}, missingClubs: [...], ok}
function validateDraft(rows, ctx){
  const c = ctx || {};
  const issues = [];
  const add = (row, level, code, text) => issues.push({row, level, code, text});
  const playedBy = {};
  rows.forEach((r, i) => {
    if(r.status === 'played'){
      (playedBy[r.club] = playedBy[r.club] || []).push(i);
      if(!(Number.isInteger(r.gf) && Number.isInteger(r.ga) && r.gf >= 0 && r.ga >= 0)) add(i, 'warn', 'no_score', `مباراة ${r.club} بلا نتيجة رقمية`);
      else if(r.gf + r.ga > RESULTS_MAX_GOALS_SUM) add(i, 'warn', 'odd_score', `نتيجة غريبة لـ${r.club} (${r.gf}-${r.ga})، تأكد منها`);
    } else add(i, 'info', r.status, `${r.club}: ${r.status === 'postponed' ? 'مؤجلة' : 'لم يلعب'} (تُسجَّل «لا مباراة»)`);
    if(r.date && c.start && c.end && (r.date < c.start || r.date > c.end)) add(i, 'warn', 'date_outside', `تاريخ مباراة ${r.club} (${r.date}) خارج فترة الجولة`);
    if(r.opp && !CLUBS.includes(r.opp)) add(i, 'warn', 'unknown_opp', `الخصم «${r.opp}» غير معروف بأندية الموسم (يُسجَّل «غير ذلك»)`);
  });
  Object.keys(playedBy).forEach(club => { if(playedBy[club].length > 1) playedBy[club].forEach(i => add(i, 'warn', 'multi_match', `${club} لعب ${formatCount(playedBy[club].length, 'مباراة', {case: 'acc'})} بالفترة، راجعها`)); });
  // مباراتان داخليتان: نادٍ ضد نادٍ آخر من القائمة يظهر بسطرين متقابلين بنتيجتين متعاكستين
  rows.forEach((r, i) => {
    if(r.status !== 'played' || !CLUBS.includes(r.opp) || r.opp === r.club) return;
    const mirror = rows.findIndex((m, j) => j !== i && m.status === 'played' && m.club === r.opp && m.opp === r.club && (!m.date || !r.date || m.date === r.date));
    if(mirror < 0) add(i, 'warn', 'internal_missing', `${r.club} ضد ${r.opp} (كلاهما من الأندية): السطر المقابل غير موجود`);
    else if(rows[mirror].gf !== r.ga || rows[mirror].ga !== r.gf) add(i, 'warn', 'internal_mismatch', `${r.club} ${r.gf}-${r.ga} ${r.opp} يخالف سطر ${r.opp} (${rows[mirror].gf}-${rows[mirror].ga})؛ غالبًا النتيجة معكوسة`);
  });
  const have = new Set(rows.map(r => r.club));
  const missingClubs = c.expectAll === false ? [] : CLUBS.filter(x => !have.has(x));
  if(missingClubs.length) add(-1, 'warn', 'missing_clubs', `أندية بلا سطر (${formatCount(missingClubs.length, 'نادٍ')}): ${missingClubs.join('، ')}. قد لا تكون لعبت، أو أن عنوان المسابقة غير معروف`);
  const byRow = {};
  issues.forEach(x => { (byRow[x.row] = byRow[x.row] || []).push(x); });
  return {issues, byRow, missingClubs, ok: !issues.some(x => x.level === 'warn')};
}

// «عكس» نتيجة سطر (يقلب له/عليه). السطر المقابل الداخلي يُعكس يدويًا بنفس الزر.
function resultsSwapRow(r){
  return Object.assign({}, r, {gf: r.ga, ga: r.gf});
}

// ---------- طلب البحث الجاهز ----------
function _fmtGregorian(iso){
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${Object.keys(_AR_MONTHS).filter(k => _AR_MONTHS[k] === m)[0]} ${y}`;
}
function buildSearchPrompt(period){
  const p = period || {};
  const byLeague = {};
  CLUBS.forEach(c => { (byLeague[CLUB_LEAGUE_MAP[c] || 'أخرى'] = byLeague[CLUB_LEAGUE_MAP[c] || 'أخرى'] || []).push(c); });
  const clubsBlock = Object.keys(byLeague).map(l => `- ${l}: ${byLeague[l].join('، ')}`).join('\n');
  return `أريد نتائج مباريات كرة القدم لأندية محددة في الفترة من ${_fmtGregorian(p.start)} إلى ${_fmtGregorian(p.end)} (بالتاريخ الميلادي وبتوقيت الرياض، شاملةً اليومين).

الأندية مجمّعة حسب دورياتها المحلية (استخدم أسماءها العربية كما هي حرفيًا ولا تغيّرها):
${clubsBlock}

الشرط: **مباريات الدوري المحلي فقط** لكل نادٍ (لا كأس، ولا بطولات قارية، ولا مباريات ودية، ولا فرق الشباب أو الاحتياط أو النساء).

أعطني الجواب جدولًا واحدًا بلا أي شرح، سطر لكل نادٍ، بهذه الأعمدة بالترتيب وبينها الفاصل |:
النادي | النتيجة (أرقام: له-عليه) | الخصم | تاريخ المباراة (YYYY-MM-DD) | الحالة (لُعبت / لم يلعب / مؤجلة) | رابط المصدر

ولا تخمّن أبدًا: إن لم تجد مباراة للنادي بالفترة اكتب «لم يلعب»، وإن كانت مؤجلة اكتب «مؤجلة». ولو لعب النادي أكثر من مباراة دوري بالفترة فاكتب سطرًا لكل مباراة.`;
}

// ---------- من المسودة إلى صيغة التعبئة ----------
// يرجع بصيغة applyParsedResultsToForm: {recognized: [{club, matches: [{gf, ga, opp, result}]}], unrecognized: []}
function draftToParsed(rows){
  const by = new Map();
  rows.forEach(r => {
    if(!by.has(r.club)) by.set(r.club, []);
    if(r.status === 'played') by.get(r.club).push({gf: r.gf, ga: r.ga, opp: r.opp || '', result: _resultOf(r.gf, r.ga)});
    else by.get(r.club).push({gf: 0, ga: 0, opp: '', result: 'no_match'});
  });
  // سطر «لا مباراة» يُسقَط لو للنادي مباراة فعلية بسطر آخر
  const recognized = [];
  by.forEach((matches, club) => {
    const real = matches.filter(m => m.result !== 'no_match');
    recognized.push({club, matches: real.length ? real : [matches[0]]});
  });
  return {recognized, unrecognized: []};
}

if(typeof module !== 'undefined') module.exports = {
  RESULTS_LINK_TEMPLATE, RESULTS_LINK_YESTERDAY, SCORE_ORDER, CLUB_ALIASES, DOMESTIC_LEAGUE_ALIASES,
  arNormalize, resultsClubKey, resultsLeagueKey, resultsClassifyCompetition, resultsLinkForDate, resultsDaysInPeriod,
  parseResults, validateDraft, resultsSwapRow, buildSearchPrompt, draftToParsed
};
