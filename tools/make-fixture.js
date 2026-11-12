#!/usr/bin/env node
/* يحوّل نسخة احتياطية خام (تنزيل من تبويب المنظّم، version 2) إلى tests/fixtures/season.json معقّمة
 * (000-T005، plan.md D2 وD3، وقواعد التعقيم الموثّقة في specs/reports/000-T05a.md).
 *
 * الاستعمال:
 *   node tools/make-fixture.js <backup.json> [--out tests/fixtures/season.json]
 *                              [--champion <id>]   يكتب/يحدّث tests/fixtures/overrides.json
 *
 * قواعد التعقيم (الريبو عام، ورسائل الأعضاء ما تنشر فيه):
 *   1. كل نص حر كتبه عضو يُستبدل بنص تجريبي مرقّم:
 *        data.roundComments[*].text  ← "تعليق تجريبي N"
 *        extra.wall[*][*].text       ← "رسالة تجريبية N"
 *      وتبقى البنية والأسماء والأوقات والأصوات والتفاعلات.
 *   2. يُحذف snapshot من كل عنصر في data.activityLog (لقطات كاملة من DATA، حجمها بالميغابايت).
 *      نص action (يولّده النظام) والوقت يبقون.
 *   3. الجولات (data.rounds) وبقية الحقول ما تتغيّر أبدًا، والأداة تتحقق من ذلك وتفشل لو تغيّرت.
 *   4. الناتج ≤ 500KB، وإلا تفشل.
 * ⚠️ لا ترفع النسخة الخام للريبو أبدًا: تُقرأ من مسارها فقط ولا تُنسخ.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MAX_BYTES = 500 * 1024;
const COMMENT_LABEL = 'تعليق تجريبي';
const WALL_LABEL = 'رسالة تجريبية';

const clone = v => JSON.parse(JSON.stringify(v));
const isObj = v => v !== null && typeof v === 'object';

// يستبدل كل حقل text (نص) داخل الشجرة بنص تجريبي مرقّم. counter = {n}
function replaceTexts(node, label, counter) {
  if (Array.isArray(node)) { node.forEach(x => replaceTexts(x, label, counter)); return; }
  if (!isObj(node)) return;
  for (const k of Object.keys(node)) {
    if (k === 'text' && typeof node[k] === 'string') node[k] = `${label} ${++counter.n}`;
    else replaceTexts(node[k], label, counter);
  }
}

function hasKey(node, key) {
  if (Array.isArray(node)) return node.some(x => hasKey(x, key));
  if (!isObj(node)) return false;
  return Object.keys(node).some(k => k === key || hasKey(node[k], key));
}

/* ينقّي النسخة الخام ويرجع {fixture, stats}. نقية (بدون ملفات) عشان تُختبر. */
function sanitize(backup, sourceLabel) {
  if (!isObj(backup) || !isObj(backup.data)) throw new Error('الملف ليس نسخة احتياطية معروفة (ينقصه data)');
  if (backup.version !== undefined && backup.version !== 2) throw new Error('نسخة احتياطية غير مدعومة، المتوقع version: 2');
  const data = clone(backup.data);
  const predictions = clone(backup.predictions === undefined ? null : backup.predictions);
  const extra = clone(backup.extra === undefined ? null : backup.extra);

  const comments = { n: 0 }, wall = { n: 0 };
  let snapshotsRemoved = 0;
  if (data.roundComments) replaceTexts(data.roundComments, COMMENT_LABEL, comments);
  if (extra && extra.wall) replaceTexts(extra.wall, WALL_LABEL, wall);
  if (Array.isArray(data.activityLog)) {
    data.activityLog.forEach(e => { if (isObj(e) && 'snapshot' in e) { delete e.snapshot; snapshotsRemoved++; } });
  }

  // تحقق: الجولات ما تغيّرت، وما بقي أي snapshot
  if (JSON.stringify(data.rounds) !== JSON.stringify(backup.data.rounds)) throw new Error('الجولات تغيّرت أثناء التعقيم (خطأ في الأداة)');
  if (hasKey(data, 'snapshot')) throw new Error('بقي snapshot في الناتج');

  const rounds = Array.isArray(data.rounds) ? data.rounds : [];
  const fixture = {
    version: backup.version === undefined ? 2 : backup.version,
    exportedAt: backup.exportedAt || null,
    data, predictions, extra,
    fixtureMeta: {
      source: sourceLabel || 'نسخة احتياطية (version 2)',
      sanitized: 'نصوص التعليقات والجدار استُبدلت بنص تجريبي، وحُذفت لقطات snapshot من سجل النشاط',
      generatedBy: 'tools/make-fixture.js'
    }
  };
  const stats = {
    rounds: rounds.length,
    entriesPerRound: rounds.map(r => (r && Array.isArray(r.entries)) ? r.entries.length : 0),
    commentsReplaced: comments.n, wallReplaced: wall.n, snapshotsRemoved
  };
  return { fixture, stats };
}

function main(argv) {
  const arg = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  const input = argv.find((a, i) => !a.startsWith('--') && (i === 0 || !['--out', '--champion'].includes(argv[i - 1])));
  if (!input) { console.error('الاستعمال: node tools/make-fixture.js <backup.json> [--out ملف] [--champion رقم]'); return 1; }
  const inPath = path.resolve(input);
  const out = path.resolve(arg('--out') || path.join(ROOT, 'tests/fixtures/season.json'));

  if (inPath.startsWith(ROOT + path.sep)) console.error('⚠️ النسخة الخام داخل الريبو. لا تضيفها لـgit (ارفع الناتج المعقّم فقط).');
  let raw;
  try { raw = JSON.parse(fs.readFileSync(inPath, 'utf8')); }
  catch (e) { console.error('❌ تعذّرت قراءة النسخة الاحتياطية: ' + e.message); return 1; }

  let res;
  try { res = sanitize(raw, 'ملف ' + path.basename(inPath) + ' (version 2)'); }
  catch (e) { console.error('❌ ' + e.message); return 1; }

  const json = JSON.stringify(res.fixture, null, 2) + '\n';
  const bytes = Buffer.byteLength(json);
  if (bytes > MAX_BYTES) { console.error(`❌ الناتج ${(bytes / 1024).toFixed(0)}KB أكبر من 500KB. ما كُتب شي.`); return 1; }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, json);

  const champ = arg('--champion');
  if (champ !== null) {
    const ovPath = path.join(path.dirname(out), 'overrides.json');
    let ov = { currentChampionId: null, seasonChampionsArchive: [], championHonorFeatures: {} };
    try { ov = Object.assign(ov, JSON.parse(fs.readFileSync(ovPath, 'utf8'))); } catch (e) { /* جديد */ }
    ov.currentChampionId = Number(champ);
    fs.writeFileSync(ovPath, JSON.stringify(ov, null, 2) + '\n');
    console.log('تم تحديث ' + path.relative(ROOT, ovPath) + ' (currentChampionId = ' + ov.currentChampionId + ')');
  }
  const s = res.stats;
  console.log(`✅ ${path.relative(ROOT, out)} (${(bytes / 1024).toFixed(1)}KB) · جولات: ${s.rounds} · تعليقات معقّمة: ${s.commentsReplaced} · رسائل جدار: ${s.wallReplaced} · snapshot محذوفة: ${s.snapshotsRemoved}`);
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { sanitize, main, MAX_BYTES };
