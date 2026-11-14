/* منتقي الصيغ الحتمي (002-VAR، بدايته من S49؛ S44b يوسّعه بالسجل وتقرير التنوّع).
 *   pickVariant(id, round, state, variants, history)
 * variants: قوالب {id, when?, text} (شكل voice-kit.js) أو عناصر بسيطة بمعرّف. يرفض غير المنطبق، ويتجنّب ما استُعمل في آخر 3 جولات
 * لنفس id (history[id] = معرّفات الصيغ بترتيب الجولات، ويُحدَّث)، والفهرس من (round × 7 + طول id). بلا عشوائية.
 * يرجع القالب المختار أو null لو لا قالب منطبق. */
function pickVariant(id, round, state, variants, history, h){
  const ok = (variants || []).filter(v => typeof voiceApply === 'function' && v.text ? voiceApply(v, state, h || {formatCount, pickForm, formatList}) !== null : true);
  if(!ok.length) return null;
  const used = history[id] = history[id] || [];
  const recent = used.slice(-3);
  const fresh = ok.filter(v => !recent.includes(v.id));
  const pool = fresh.length ? fresh : ok;
  const v = pool[(round * 7 + id.length) % pool.length];
  used.push(v.id);
  return v;
}
if(typeof module !== 'undefined') module.exports = {pickVariant};
