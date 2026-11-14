#!/usr/bin/env node
/* أداة عينات النصوص المولَّدة (002-T012 / S44): تشغّل كل المولّدات التي تعمل بلا DOM على بيانات الـfixture
 * (آخر 3 جولات) وعلى حالات حدّية، وتكتب specs/002-language-voice/samples/texts.md: (المصدر · الحالة · النص الناتج)،
 * وجدول تغطية المولّدات مقابل inventory.md، وفحصًا آليًا للأعداد (رقم 3–10 بجانب مفرد، أو 11+ بجمع) يُبلغ عنه بلا تعديل أي نص.
 *
 *   node tools/text-samples.js [--out specs/002-language-voice/samples/texts.md] [--check]
 *   --check: يفشل (exit 1) لو أي مولّد رمى خطأ أو ظهر في ناتجه undefined/NaN/null (لا يفشل بسبب ملاحظات الأعداد).
 * ⚠️ لا تعدّل نصًا؛ هذا الملف مرجع القراءة قبل الترحيل وبعده. (تقرير الواتساب التفصيلي وحالاته: `specs/002-language-voice/samples/whatsapp-report.md`.) */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const FILES = ['js/data/season-config.js', 'js/data/season-2/participants.js', 'js/data/season-2/clubs.js', 'js/data/season-2/rounds-seed.js',
  'js/core/config.js', 'js/core/dom-utils.js', 'js/core/ar-format.js', 'js/core/storage.js', 'js/core/standings-engine.js', 'js/core/club-engine.js',
  'js/core/insights-engine.js', 'js/core/whatsapp-text.js', 'js/features/round-story-card.js', 'js/ui/card-kit.js', 'js/ui/duel-card.js', 'js/ui/my-clubs-card.js',
  'js/ui/certificate-card.js', 'js/voice/voice-kit.js', 'js/voice/whatsapp-report.js', 'js/voice/spotlight-angles.js', 'js/voice/banter.js',
  'js/voice/voice-engine.js', 'js/voice/registry.js', 'js/voice/spotlight.js'];

function load(){
  const sb = {console}; sb.window = sb;
  const ctx = vm.createContext(sb);
  // ملفات الواجهة تُحمَّل لمحاولة تشغيل دوال التحقق فقط؛ لو احتاج ملف DOM وقت التحميل نتجاوزه ونذكر السبب
  const skipped = [];
  FILES.forEach(f => {
    try{ vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, {filename: f}); }
    catch(e){ skipped.push(`${f}: ${e.message}`); }
  });
  ctx.__r = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/season.json'), 'utf8')).data.rounds;
  vm.runInContext('DATA.rounds = __r;', ctx);
  return {ctx, skipped};
}

const NOUN_SING = ['نقطة', 'مركز', 'جولة', 'مشارك', 'ممة', 'مرة', 'فوز', 'خسارة', 'تعادل', 'هدف', 'وسام', 'يوم'];
// مشبوه: 3–10 + مفرد ثابت (مثل «9 نقطة»)؛ تُستثنى الصيغ الصحيحة (مركزًا، نقطة واحدة…)
function numberFlags(text){
  const out = [];
  const re = new RegExp(`(^|[^\\d])(\\d+)\\s+(${NOUN_SING.join('|')})(?![\\p{L}\\u064B-\\u0652])`, 'gu');
  let m;
  while((m = re.exec(text))){ const n = Number(m[2]); if(n >= 3 && n <= 10) out.push(`${m[2]} ${m[3]}`); }
  return out;
}

function main(argv){
  const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
  const outFile = path.resolve(opt('--out', path.join(ROOT, 'specs/002-language-voice/samples/texts.md')));
  const {ctx, skipped} = load();
  const h = {formatCount: ctx.formatCount, pickForm: ctx.pickForm, formatList: ctx.formatList};
  ctx.__h = h;
  const ev = c => vm.runInContext(c, ctx);
  const rows = [], errors = [], covered = new Set();
  const add = (gen, source, label, fn) => {
    covered.add(gen);
    let text;
    try{ text = fn(); }catch(e){ text = null; errors.push(`${gen} · ${label}: ${e.message}`); rows.push({gen, source, label, text: `⚠️ خطأ: ${e.message}`, flags: []}); return; }
    if(text === null || text === undefined) return;
    const t = typeof text === 'string' ? text : JSON.stringify(text);
    const bad = /undefined|NaN|\bnull\b|\[object/.test(t);
    if(bad) errors.push(`${gen} · ${label}: نص فيه undefined/NaN/null`);
    rows.push({gen, source, label, text: t, flags: numberFlags(t)});
  };
  const nRounds = ctx.__r.length, last3 = ctx.__r.slice(-3).map(r => r.number);   // أرقام الجولات الحقيقية (الجسر 1 و2 خارج DATA.rounds)

  // 1) قصة الجولة الجادة (whatsapp-text.js): مصفوفة الأعداد
  const L = {name: 'لطفي', total: 92}, C = {name: 'أيوب', total: 90};
  const mvList = (k, v) => ({names: ['أبو رمزي', 'العندليب', 'أبو شيخة', 'مصطفى عبده', 'أبو عزام'].slice(0, k), val: v});
  [[1, 2], [2, 3], [3, 4], [5, 11], [0, 0]].forEach(([k, v]) => {
    ctx.__d = {round: 10, leader: L, chaser: C, climbers: k ? mvList(k, v) : {names: [], val: 0}, droppers: k ? mvList(Math.min(k + 1, 5), v) : {names: [], val: 0}};
    add('story.serious', 'whatsapp-text.js · composeRoundStory', `صاعدون ${k} (قفزة ${v})`, () => ev('composeRoundStory(__d)'));
  });
  [[90, 'فارق نقطتين'], [91, 'فارق نقطة'], [92, 'تعادل'], [80, 'فارق 12']].forEach(([t, l]) => {
    ctx.__d = {round: 10, leader: L, chaser: {name: 'أيوب', total: t}, climbers: null, droppers: null};
    add('story.serious', 'whatsapp-text.js · composeRoundStory', l, () => ev('composeRoundStory(__d)'));
  });
  ctx.__d = {round: 3, leader: L, chaser: null, climbers: null, droppers: null};
  add('story.serious', 'whatsapp-text.js · composeRoundStory', 'مشارك واحد بلا ملاحق', () => ev('composeRoundStory(__d)'));

  // 2) رسالة الواتساب القديمة (الطبقة الأولى، احتياطية) بنقاط 0/1/2/3/6/11 وكسر التعادل
  [0, 1, 2, 3, 6, 11].forEach(p => {
    ctx.__d = {round: 10, story: 'نص القصة', hero: {name: 'أبو أوس', points: p, tieBreak: p === 6}};
    add('whatsapp.layer1', 'whatsapp-text.js · composeWhatsAppSummary', `بطل بـ${p} نقاط${p === 6 ? ' + كسر تعادل' : ''}`, () => ev('composeWhatsAppSummary(__d)'));
  });
  ctx.__d = {round: 10, story: '', hero: null};
  add('whatsapp.layer1', 'whatsapp-text.js · composeWhatsAppSummary', 'بلا بطل ولا قصة', () => ev('composeWhatsAppSummary(__d)'));

  // 3) قصة الجولة الساخرة (round-story-card.js): ممّات 0/1/2/3/4/11، ونقاط البطل
  [[0, 6, 0, 0], [1, 1, 2, 2], [2, 0, 3, 5], [3, 2, 11, 3], [4, 10, 2, 11], [11, 11, 0, 0]].forEach(([m, pts, cv, dv]) => {
    ctx.__d = {rn: 10, hero: {name: 'أبو أوس', points: pts}, mummat: ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح', 'ط', 'ي', 'ك'].slice(0, m),
      climber: cv ? {name: 'العندليب', val: cv} : null, dropper: dv ? {name: 'أبو رمزي', val: dv} : null};
    add('story.satirical', 'round-story-card.js · composeSatiricalStory', `ممّات ${m}، بطل بـ${pts}، صعود ${cv}، تراجع ${dv}`, () => ev('composeSatiricalStory(__d)'));
  });
  add('story.satirical', 'round-story-card.js · composeSatiricalStory', 'بلا بطل (يُرجع نصًا فارغًا)', () => { ctx.__d = {rn: 3, hero: null}; return ev('composeSatiricalStory(__d)') || '(نص فارغ بقصد)'; });

  // 4) تقرير الواتساب (الطبقة الثانية، S48b): آخر 3 جولات من المحرك
  const wa = ev('voiceReportSeries()');
  last3.forEach(r => { const x = wa.find(y => y.round === r); if(x) add('whatsapp.report', 'voice-engine.js · voiceComposeReport', `الجولة ${r} (قوالب: ${x.ids.join(' ')})`, () => x.text); });

  // 5) منافس الجولة (مؤقت S49): آخر 3 جولات
  const sp = ev('spotlightSeries()');
  last3.forEach(r => { const x = sp.find(y => y.round === r); if(x && x.pick){ ctx.__p = x.pick; add('spotlight.plain', 'spotlight.js · spotlightPlainText', `الجولة ${r}: ${x.pick.sp.name}`, () => ev('spotlightPlainText(__p, __h)')); } });

  // 6) الأوسمة والأرقام والألقاب (insights-engine.js) على بيانات الموسم الحالية وآخر 3 جولات (ألقاب الجولة)
  const fmtBadges = list => list.map(b => `${b.icon} ${b.title}: ${b.names} (${b.detail})`).join(' | ');
  add('badges.core', 'insights-engine.js · computeBadges', 'أوسمة الموسم الحالية', () => fmtBadges(ev('computeBadges()')));
  add('badges.extended', 'insights-engine.js · computeExtendedBadges', 'الأوسمة الموسّعة', () => fmtBadges(ev('computeExtendedBadges()')));
  add('records', 'insights-engine.js · computeRecords', 'الأرقام القياسية (حقول نصية)', () => {
    const r = ev('computeRecords()');
    return JSON.stringify(r, (k, v) => (k === 'teams' || typeof v === 'object' || typeof v === 'string' || typeof v === 'number') ? v : undefined).slice(0, 400);
  });
  last3.forEach(r => {
    ctx.__k = ctx.__r.findIndex(x => x.number === r) + 1;   // عدد الجولات المحتسبة حتى هذه الجولة
    add('roundTitles', 'insights-engine.js · computeRoundTitles', `ألقاب الجولة ${r}`, () => {
      const t = ev(`(() => { const saved = DATA.rounds; try{ DATA.rounds = saved.slice(0, __k); return computeRoundTitles(computeStandings(), computeStandings(__k - 1)); } finally { DATA.rounds = saved; } })()`);
      return t.length ? JSON.stringify(t) : '(لا ألقاب)';
    });
  });

  // 7) مكتبة الصوت (banter.js): قصة الجولة، السلاسل، القاع، التعادل، المواجهة، الإشعارات، بحالات حدّية
  const NAMES = ['أبو رمزي', 'العندليب', 'أبا عتاب', 'مصطفى عبده', 'أبو شيخة'];
  const everyEligible = (gen, source, list, states) => states.forEach(([label, st]) => {
    ctx.__st = st; ctx.__list = list;
    const out = ev('voiceEligible(__list, __st, __h).map(t => voiceApply(t, __st, __h))');
    covered.add(gen);
    if(!out.length) return;
    out.forEach((t, i) => add(gen, source, `${label} · صيغة ${i + 1} من ${out.length}`, () => t));
  });
  const lib = ev('({VOICE_ROUND_STORY, VOICE_STREAKS, VOICE_BOTTOM, VOICE_TIE, VOICE_DUEL, VOICE_NOTIFY})');
  const rs = {round: 10, hero: {name: 'أبو أوس', pts: 6, tieBreak: false}, mummat: NAMES.slice(0, 1), climber: {names: NAMES.slice(0, 1), val: 3}, dropper: {names: NAMES.slice(0, 2), val: 2}};
  Object.entries(lib.VOICE_ROUND_STORY).forEach(([k, list]) => {
    ctx.__list = list;
    [['حالة نموذجية', rs], ['ممّات 5', {...rs, mummat: ['أ', 'ب', 'ج', 'د', 'هـ']}], ['نقاط 0', {...rs, hero: {name: 'أبو أوس', pts: 0, tieBreak: true}}]].forEach(([label, st]) => {
      ctx.__st = st;
      const out = ev('voiceEligible(__list, __st, __h).slice(0, 2).map(t => voiceApply(t, __st, __h))');
      covered.add('banter.roundStory');
      out.forEach((t, i) => add('banter.roundStory', `banter.js · VOICE_ROUND_STORY.${k}`, `${label} · ${i + 1}`, () => t));
    });
  });
  ['hot', 'cold'].forEach(k => everyEligible('banter.streaks', `banter.js · VOICE_STREAKS.${k}`, lib.VOICE_STREAKS[k].slice(0, 2),
    [['فرد، 3 جولات', {names: NAMES.slice(0, 1), count: 3}], ['اثنان، 11 جولة', {names: NAMES.slice(0, 2), count: 11}], ['5 أسماء، جولتان', {names: NAMES, count: 2}]]));
  everyEligible('banter.bottom', 'banter.js · VOICE_BOTTOM', lib.VOICE_BOTTOM.slice(0, 3),
    [['فرد وفارق 1', {round: 10, names: NAMES.slice(0, 1), total: 40, above: {name: 'أيوب', gap: 1}, playersCount: 20}], ['4 أسماء', {round: 10, names: NAMES.slice(0, 4), total: 40, above: null, playersCount: 20}]]);
  everyEligible('banter.tie', 'banter.js · VOICE_TIE', lib.VOICE_TIE.slice(0, 3),
    [['اثنان', {round: 10, names: ['لطفي', 'أيوب'], total: 92}], ['3 أسماء', {round: 10, names: ['لطفي', 'أيوب', 'سعيد'], total: 92}], ['5 أسماء', {round: 10, names: NAMES, total: 92}]]);
  ['win', 'draw'].forEach(k => everyEligible('banter.duel', `banter.js · VOICE_DUEL.${k}`, lib.VOICE_DUEL[k].slice(0, 2),
    [['فارق 1', {round: 10, a: {name: 'أبو رمزي', pts: 4}, b: {name: 'العندليب', pts: k === 'win' ? 3 : 4}}], ['فارق 6 وخسارة بصفر', {round: 10, a: {name: 'أبو رمزي', pts: k === 'win' ? 6 : 0}, b: {name: 'العندليب', pts: 0}}]]));

  // 8) رسائل التحقق في كروت الواجهة (card-kit.js وduel-card.js وmy-clubs-card.js وcertificate-card.js): بيانات ناقصة
  const tryFn = (gen, source, label, code) => add(gen, source, label, () => { const r = ev(code); return Array.isArray(r) ? (r.length ? r.join(' | ') : '(بلا ملاحظات)') : String(r); });
  const cardSrc = [['duel-card.js · validateDuelData', 'validateDuelData'], ['my-clubs-card.js · validateMyClubsData', 'validateMyClubsData'], ['certificate-card.js · validateCertificateCardData', 'validateCertificateCardData']];
  cardSrc.forEach(([src, fn]) => {
    tryFn('cards.validation', src, 'بلا بيانات', `typeof ${fn} === 'function' ? ${fn}(null) : (() => { throw new Error('الدالة غير محمّلة') })()`);
    tryFn('cards.validation', src, 'بيانات ناقصة', `${fn}({})`);
  });
  tryFn('cards.validation', 'certificate-card.js · validateCertificateData', 'بلا بطل', 'validateCertificateData(null, [])');
  tryFn('cards.validation', 'certificate-card.js · validateCertificateData', 'بطل غير موجود', 'validateCertificateData(999, [])');
  tryFn('cards.validation', 'card-kit.js · validateCardData', 'ترتيب بلا صفوف', "validateCardData('standings', {rows: []})");

  // التغطية مقابل inventory.md
  const NOT_COVERED = [
    ['notification-center.js (getUnifiedNotifications)', 'يحتاج DOM وlocalStorage ومستمعي Firebase وقت التشغيل'],
    ['badge-toast.js (renderBadgeToast)', 'يرسم DOM مباشرة؛ نصوصه من VOICE_NOTIFY.badge وتُغطّى بعد ترحيل S45'],
    ['my-dashboard.js (buildMyRankShareText، رسائل «حالتي»)', 'تعتمد على اختيار المشارك وlocalStorage؛ مسجّلة «ينتظر ترحيل» بـVOICE_REGISTRY وتُغطّى في S45'],
    ['insights-engine.js (calcWhatIf)', 'تستدعي document؛ تحتاج فصلًا عن الواجهة (S45)'],
    ['stats-tab.js وparticipants-tab.js وrounds-tab.js وstandings-widgets.js', 'توليد HTML مختلط بالنص؛ يُرحَّل ويُغطّى بالعينات في S45/S46'],
    ['admin-*.js وreport-main.js (رسائل المنظّم والتقارير)', 'تحتاج DOM وصلاحيات؛ تُغطّى بعد فصل النصوص (S47)'],
    ['رسائل الأخطاء والنجاح العامة (storage.js، card-io.js، export-tools.js)', 'نصوص ثابتة داخل معالجات أحداث؛ تُجرد وتُراجع في S45 إلى S47 بجرد inventory.md'],
    ['نصوص الكروت المرسومة بالكانفس (champion/wrap/profile/duel/my-clubs/certificate/standings)', 'تُرسم على canvas؛ تُغطّى بلقطات tools/snap.js وtools/card-compare.js، وهنا رسائل التحقق فقط'],
    ['spotlight (قوالب Opus الكاملة)', 'عيناتها في `samples/voice-samples.md` (أداة Opus)']
  ];
  // 9) تقرير التنوّع (S44b): كل مولّد على الجولات 1..30
  const VMAP = {ok: '✅ متنوّع', fixed: '✅ ثابت بقصد', fail: '❌ فشل'};
  const variety = ev('voiceVarietyReport(voiceGeneratorRegistry(), 30)').map(v => ({...v, verdict: VMAP[v.verdict] || `⏸️ ينتظر صيغ (ينقص ${v.missing})`}));
  const varietyFails = variety.filter(v => v.verdict.startsWith('❌'));
  varietyFails.forEach(v => errors.push(`تنوّع · ${v.id}: ${v.variants < 4 ? 'صيغه أقل من 4' : 'يكرر نفس النص جولتين متتاليتين مع توفّر بديل'}`));
  const sections = {};
  rows.forEach(r => { (sections[r.gen] = sections[r.gen] || []).push(r); });
  const flagged = rows.filter(r => r.flags.length);
  let md = `# عينات كل النصوص المولَّدة (002-T012 / S44)\n\n> مولَّد بـ\`node tools/text-samples.js\` من \`tests/fixtures/season.json\` (آخر 3 جولات: ${last3.join('، ')}) وحالات حدّية. **لا نص عُدّل**؛ هذا مرجع القراءة قبل الترحيل وبعده.\n` +
    `> الفحص الآلي للأعداد يشير لأي «رقم 3–10 بجانب مفرد» (مثل «9 نقطة») للمراجعة، وليس حكمًا نهائيًا.\n\n`;
  md += `## ملخص\n\n- مولّدات مغطّاة: **${covered.size}** · عينات: **${rows.length}** · أخطاء تشغيل/نص ناقص: **${errors.length}** · ملاحظات أعداد: **${flagged.length}**\n`;
  if(skipped.length) md += `- ملفات تعذّر تحميلها بلا DOM (فتُغطّى بالجدول أدناه): ${skipped.map(s => '`' + s + '`').join('، ')}\n`;
  md += `\n## ملاحظات الأعداد المكتشفة (للمراجعة)\n\n`;
  md += flagged.length ? flagged.map(r => `- **${r.gen}** (${r.source} · ${r.label}): ${r.flags.map(f => '«' + f + '»').join('، ')}`).join('\n') : '- لا شيء.';
  md += `\n\n## تقرير التنوّع (الجولات 1–30)\n\n> حالة كل جولة تتغيّر برقم الجولة (بقية البيانات نموذجية ثابتة)، والمنتقي \`pickVariant\` حتمي ولا يكرر قالبًا بآخر 3 جولات. ✅ متنوّع = ≥ 4 صيغ وبلا تكرار متتالٍ مع توفّر بديل؛ ⏸️ ينتظر صيغ = أقل من 4 (الصيغ الإبداعية يكتبها Opus).\n\n| المولّد | الحالة | الصيغ | نصوص مختلفة / 30 | تكرار متتالٍ | أطول سلسلة |\n|---|---|---|---|---|---|\n` +
    variety.map(v => `| ${v.id} (${v.label}) | ${v.verdict} | ${v.variants} | ${v.distinct} | ${v.consecRepeatPct}% | ${v.maxRun} |`).join('\n') +
    `\n\n**الملخص:** ✅ متنوّع ${variety.filter(v => v.verdict === '✅ متنوّع').length} · ✅ ثابت بقصد ${variety.filter(v => v.verdict === '✅ ثابت بقصد').length} · ⏸️ ينتظر صيغ ${variety.filter(v => v.verdict.startsWith('⏸️')).length} · ❌ فشل ${varietyFails.length}\n`;
  md += `\n\n## المولّدات المغطّاة\n\n| المولّد | عدد العينات |\n|---|---|\n` + Object.entries(sections).map(([g, v]) => `| ${g} | ${v.length} |`).join('\n');
  md += `\n\n## مولّدات غير مغطّاة (وسببها)\n\n| المولّد | السبب |\n|---|---|\n` + NOT_COVERED.map(([a, b]) => `| ${a} | ${b} |`).join('\n') + '\n';
  Object.entries(sections).forEach(([g, v]) => {
    md += `\n---\n\n## ${g}\n\n| المصدر | الحالة | النص |\n|---|---|---|\n` + v.map(r => `| ${r.source} | ${r.label.replace(/\|/g, '/')} | ${r.text.replace(/\n/g, ' ⏎ ').replace(/\|/g, '\\|')}${r.flags.length ? ' ⚠️' : ''} |`).join('\n') + '\n';
  });
  fs.mkdirSync(path.dirname(outFile), {recursive: true});
  fs.writeFileSync(outFile, md);
  console.log(`✅ ${path.relative(ROOT, outFile)}: ${covered.size} مولّدًا، ${rows.length} عينة، ${errors.length} خطأ، ${flagged.length} ملاحظة أعداد`);
  if(errors.length) errors.forEach(e => console.log('❌ ' + e));
  if(argv.includes('--check') && errors.length) process.exit(1);
}
main(process.argv.slice(2));
