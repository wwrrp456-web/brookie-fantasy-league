#!/usr/bin/env node
/* عينات تقرير الواتساب من المحرك الفعلي js/voice/voice-engine.js (002-T011 / S48b).
 *
 *   node tools/text-samples.js [--rounds 8,9,10] [--out specs/002-language-voice/samples/whatsapp-report.md]
 *
 * يحمّل ملفات الموقع في vm بلا DOM، ويحاكي الجولات بالتسلسل (آخر 3 جولات حقيقية) ثم يضيف حالات حافة بحالات مبنية يدويًا.
 * (S44 توسّعه لاحقًا ليشمل بقية المولّدات.) */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const FILES = ['js/data/season-config.js', 'js/data/season-2/participants.js', 'js/data/season-2/clubs.js', 'js/data/season-2/rounds-seed.js',
  'js/core/config.js', 'js/core/dom-utils.js', 'js/core/ar-format.js', 'js/core/storage.js', 'js/core/standings-engine.js', 'js/core/club-engine.js',
  'js/core/insights-engine.js', 'js/voice/voice-kit.js', 'js/voice/whatsapp-report.js', 'js/voice/voice-engine.js'];

function load(){
  const sb = {console}; sb.window = sb;
  const ctx = vm.createContext(sb);
  vm.runInContext(FILES.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n'), ctx, {filename: 'voice-engine-bundle.js'});
  ctx.__r = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/season.json'), 'utf8')).data.rounds;
  vm.runInContext('DATA.rounds = __r; this.E = {voiceReportSeries, voiceComposeReport};', ctx);
  return ctx;
}

const words = t => t.replace(/\*/g, '').split(/\s+/).filter(Boolean).length;

function edgeCases(){
  const base = {round: 10, nextRound: 11, firstRound: false, playersCount: 20, hero: {name: 'أبو أوس', pts: 6, tieBreak: false, repeat: false, prevRank: 3},
    leader: {name: 'لطفي', total: 92}, chaser: {name: 'أيوب', total: 90}, gap: 2, topTied: [], leaderChanged: false, prevLeader: 'لطفي',
    climbers: {names: ['العندليب'], val: 3}, droppers: {names: ['أبو رمزي', 'مصطفى عبده'], val: 2}, mummat: [], mummaRepeat: null, hotStreak: null};
  return [
    ['أول جولة', {round: 1, firstRound: true, leaderChanged: false, prevLeader: null, climbers: null, droppers: null}],
    ['تعادل على الصدارة', {topTied: ['لطفي', 'أيوب'], gap: 0, chaser: {name: 'أيوب', total: 92}}],
    ['تبديل الصدارة', {leaderChanged: true, prevLeader: 'أيوب'}],
    ['لا صاعدين ولا هابطين', {climbers: null, droppers: null}],
    ['ممة واحدة', {mummat: ['أبو رمزي']}],
    ['ممّات متعددة (5)', {mummat: ['أبو رمزي', 'العندليب', 'مصطفى عبده', 'أبو شيخة', 'أبو عزام']}],
    ['ممة ثانية على التوالي', {mummat: ['أبو رمزي'], mummaRepeat: {name: 'أبو رمزي', count: 2}}],
    ['بطل بتعادل مكسور', {hero: {...base.hero, tieBreak: true}}],
    ['سلسلة ساخنة', {hotStreak: {name: 'أيوب', count: 7}}],
    ['آخر جولة في الموسم', {round: 30, nextRound: null}],
    ['بيانات ناقصة (بلا بطل)', {hero: null}]
  ].map(([label, o]) => [label, {...base, ...o}]);
}

function main(argv){
  const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
  const want = opt('--rounds', '8,9,10').split(',').map(Number);
  const out = path.resolve(opt('--out', path.join(ROOT, 'specs/002-language-voice/samples/whatsapp-report.md')));
  const ctx = load();
  const series = vm.runInContext('E.voiceReportSeries()', ctx);
  let md = `# عينات تقرير الواتساب من المحرك الفعلي (002-T011 / S48b)\n\n> مولَّد بـ\`node tools/text-samples.js\` من \`tests/fixtures/season.json\` وقوالب \`js/voice/whatsapp-report.js\` عبر \`js/voice/voice-engine.js\`.\n` +
    `> الاختيار حتمي من رقم الجولة وحال البيانات، ولا يتكرر قالب بآخر 3 جولات. **للمنظّم:** علّق على أي جملة (رقم القالب بالأسفل).\n`;
  series.filter(x => want.includes(x.round)).forEach(x => {
    md += `\n---\n\n## الجولة ${x.round} (عدد الكلمات: ${words(x.text)})\n\n\`\`\`\n${x.text}\n\`\`\`\n\n<sub>القوالب: ${x.ids.join(' · ')}</sub>\n`;
  });
  md += `\n---\n\n# حالات الحافة\n`;
  const lens = [];
  edgeCases().forEach(([label, st]) => {
    ctx.__s = st;
    const r = vm.runInContext('E.voiceComposeReport(__s, {})', ctx);
    lens.push(words(r.text));
    md += `\n## ${label} (عدد الكلمات: ${words(r.text)})\n\n\`\`\`\n${r.text}\n\`\`\`\n\n<sub>القوالب: ${r.ids.join(' · ')}</sub>\n`;
  });
  const all = series.map(x => words(x.text));
  md += `\n---\n\n**ملخص الطول:** جولات الموسم ${Math.min(...all)}–${Math.max(...all)} كلمة، وحالات الحافة ${Math.min(...lens)}–${Math.max(...lens)} كلمة (المستهدف 90–150 تقريبًا).\n`;
  fs.mkdirSync(path.dirname(out), {recursive: true});
  fs.writeFileSync(out, md);
  console.log(`✅ كتبت ${path.relative(ROOT, out)} (${want.length} جولات + ${lens.length} حالة حافة)`);
}
main(process.argv.slice(2));
