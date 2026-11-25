/* محلل تقارير الأعضاء (007-T001، R-29): دوال صافية بلا DOM ولا شبكة ولا كتابة. تأخذ تقارير نتائج المباريات التي أرسلها الأعضاء لجولة
 * (brookie/community-reports/matches/{الجولة}: {id, club, opponent, result, gf, ga, reporter, submittedAt}) وتصنّفها لمجموعات
 * تحتاج قرار المنظّم (مكررة / ليست مكررة)، ثم تبني نصًا بسطر لكل نادٍ في المباراة بالصيغة التي يقرؤها parseResults («النادي 3-0 الخصم»).
 *
 *   analyzeCommunityReports(reports)         ← {groups, unreadable, stats}
 *   effectiveDecision(group, decisions)      ← {mode, pick} أو null (لو لم تُحسم): القرار المحفوظ، وإلا الافتراضي للمجموعة
 *   pendingGroups(groups, decisions)         ← مجموعات لم تُحسم بعد (لا يُنسخ قبل أن تفرغ)
 *   resolveMatches(groups, decisions)        ← [{club, opp, gf, ga}] المباريات النهائية بلا تكرار (للمجموعات المحسومة)
 *   buildPasteText(groups, decisions, opts)  ← النص: سطر لكل نادٍ في المباراة (opts.expandInternal الافتراضي true: المباراة بين ناديين
 *                                              من أنديتنا بسطرين متقابلين، لأن كل نادٍ يحتاج سطره في المسودة)
 *
 * التصنيف (type): single (تقرير واحد بلا شك، ينزل مباشرة) · agreed (تقارير متفقة) · mirror (نفس المباراة من الطرفين بنتيجة متعاكسة)
 *                 · suspect (مشكوك: لا خصم، تهجئة متقاربة، نفس النادي بمباراتين محتملتين) · conflict (نفس المباراة بنتائج مختلفة).
 * القرار: {mode: 'dup'|'sep', pick?: variantKey}. dup = مباراة وحدة (ومع أكثر من نتيجة لازم pick)، sep = تبقى منفصلة (كل نتيجة مميزة مباراة).
 * الاعتماد: results-import.js (resultsClubKey وarNormalize) وCLUBS. التطبيع نفسه المستخدم في المحلل، بلا مطابقة جديدة. */

// عدد التقارير بالعربية (للأسباب): تقرير واحد، تقريران، 3–10 تقارير، 11+ تقريرًا
function _crCountText(n){
  if(n === 1) return 'تقرير واحد';
  if(n === 2) return 'تقريران';
  return n <= 10 ? `${n} تقارير` : `${n} تقريرًا`;
}

function _crLev(a, b){
  if(a === b) return 0;
  if(Math.abs(a.length - b.length) > 2) return 3;
  const dp = Array.from({length: a.length + 1}, (_, i) => [i]);
  for(let j = 1; j <= b.length; j++) dp[0][j] = j;
  for(let i = 1; i <= a.length; i++) for(let j = 1; j <= b.length; j++)
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}
// أسماء خصوم (غير معروفة بأندية الموسم) متقاربة التهجئة: مسافة تحرير 1 (حتى 2 للأسماء الطويلة)، أو أحدهما يحوي الآخر بحدود الكلمة
function _crSimilarNames(x, y){
  if(!x || !y || x === y) return false;
  const min = Math.min(x.length, y.length);
  if(min < 4) return false;
  const d = _crLev(x, y);
  if(d <= 1 || (d <= 2 && min >= 9)) return true;
  const wa = ` ${x} `, wb = ` ${y} `;
  return wa.includes(wb) || wb.includes(wa);
}

function _crCleanOpp(s){ return String(s == null ? '' : s).replace(/[|\t\r\n]+/g, ' ').replace(/\s+/g, ' ').trim(); }

// تقرير ← سجل مطبَّع {club, opp, oppKey, internal, gf, ga} أو سبب عدم القراءة
function _crRecord(r){
  const club = resultsClubKey(r.club);
  if(!club) return {error: `النادي «${_crCleanOpp(r.club) || 'بلا اسم'}» غير معروف بأندية الموسم`};
  const gf = Number(r.gf), ga = Number(r.ga);
  if(!(Number.isInteger(gf) && Number.isInteger(ga) && gf >= 0 && ga >= 0 && gf <= 99 && ga <= 99)) return {error: 'نتيجة غير صالحة'};
  const rawOpp = _crCleanOpp(r.opponent);
  const known = rawOpp ? resultsClubKey(rawOpp) : null;
  const opp = known || rawOpp;
  if(known && known === club) return {error: 'النادي والخصم نفسه'};
  return {club, opp, oppKey: known ? known : arNormalize(opp), internal: !!known, gf, ga};
}

// السجل بشكل قانوني: المباراة بين ناديين من أنديتنا تُرتَّب أبجديًا (الطرف الأول A) فيتطابق التقريران المتقابلان (مرآة)
function _crCanon(rec){
  if(rec.internal && rec.club > rec.opp) return {A: rec.opp, B: rec.club, gfA: rec.ga, gaA: rec.gf, flipped: true, internal: true, oppKey: rec.club};
  return {A: rec.club, B: rec.opp, gfA: rec.gf, gaA: rec.ga, flipped: false, internal: rec.internal, oppKey: rec.oppKey};
}

function analyzeCommunityReports(reports){
  const list = Array.isArray(reports) ? reports : [];
  const unreadable = [], items = [];
  list.forEach((r, i) => {
    if(!r){ unreadable.push({report: r, reason: 'تقرير فاضي'}); return; }
    const rec = _crRecord(r);
    if(rec.error){ unreadable.push({report: r, reason: rec.error}); return; }
    const c = _crCanon(rec);
    const pairKey = c.internal ? `${c.A}|${c.B}` : `${c.A}|${c.oppKey}`;
    items.push({
      idx: i, id: r.id !== undefined ? String(r.id) : String(i), reporter: r.reporter ? String(r.reporter).trim() : '', time: r.submittedAt || null,
      raw: r, rec, c, pairKey, variantKey: `${pairKey}|${c.gfA}-${c.gaA}`
    });
  });

  // 1) عناقيد قوية: نفس المباراة (النادي والخصم، أو الخصم والنادي بالمرآة)
  const clusters = new Map();
  items.forEach(it => { if(!clusters.has(it.pairKey)) clusters.set(it.pairKey, {pairKey: it.pairKey, A: it.c.A, B: it.c.B, internal: it.c.internal, oppKey: it.c.oppKey, items: []}); clusters.get(it.pairKey).items.push(it); });
  const cl = Array.from(clusters.values());

  // 2) روابط ضعيفة بين عناقيد نادٍ واحد: بلا خصم، أو خصم بتهجئة متقاربة، أو خصمان مختلفان (مباراتان محتملتان)
  const parent = cl.map((_, i) => i);
  const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
  const weak = [];                   // {a, b, code, club}
  const link = (a, b, code, club) => { weak.push({a, b, code, club}); parent[find(a)] = find(b); };
  const byClub = new Map();
  cl.forEach((c, i) => {
    const sides = c.internal ? [c.A, c.B] : [c.A];
    sides.forEach(club => { if(!byClub.has(club)) byClub.set(club, []); byClub.get(club).push(i); });
  });
  byClub.forEach((idxs, club) => {
    for(let x = 0; x < idxs.length; x++) for(let y = x + 1; y < idxs.length; y++){
      const a = cl[idxs[x]], b = cl[idxs[y]];
      const oa = a.internal ? (a.A === club ? a.B : a.A) : a.B, ob = b.internal ? (b.A === club ? b.B : b.A) : b.B;
      const ka = a.internal ? oa : a.oppKey, kb = b.internal ? ob : b.oppKey;
      if(!oa || !ob) link(idxs[x], idxs[y], 'no_opponent', club);
      else if(!a.internal && !b.internal && _crSimilarNames(ka, kb)) link(idxs[x], idxs[y], 'similar_opp', club);
      else link(idxs[x], idxs[y], 'two_matches', club);
    }
  });

  // 3) المجموعات = المكوّنات المتصلة
  const comps = new Map();
  cl.forEach((c, i) => { const r = find(i); if(!comps.has(r)) comps.set(r, []); comps.get(r).push(i); });
  const groups = [];
  comps.forEach(idxs => {
    const cls = idxs.map(i => cl[i]);
    const gItems = [].concat(...cls.map(c => c.items)).sort((p, q) => p.idx - q.idx);
    const weakHere = weak.filter(w => idxs.includes(w.a) || idxs.includes(w.b));
    // النتائج المميّزة (variants) لكل مباراة قانونية
    const vmap = new Map();
    gItems.forEach(it => {
      if(!vmap.has(it.variantKey)) vmap.set(it.variantKey, {key: it.variantKey, club: it.c.A, opp: it.c.B, gf: it.c.gfA, ga: it.c.gaA, internal: it.c.internal, reportIds: []});
      vmap.get(it.variantKey).reportIds.push(it.id);
    });
    const variants = Array.from(vmap.values());
    const conflictClusters = cls.filter(c => new Set(c.items.map(it => it.variantKey)).size > 1);
    const reasons = [];
    let type, defaultDecision = null;

    const reporters = it => it.reporter || '';
    if(weakHere.length){
      type = 'suspect';
      const codes = new Set(weakHere.map(w => w.code));
      const clubs = Array.from(new Set(weakHere.map(w => w.club)));
      if(codes.has('no_opponent')) reasons.push(`تقرير ${clubs.join(' و')} بلا خصم بجانب تقرير بخصم: قد يكونان المباراة نفسها`);
      if(codes.has('similar_opp')) reasons.push(`خصمان بتهجئتين متقاربتين لنفس النادي (${Array.from(new Set(cls.filter(c => !c.internal).map(c => c.B).filter(Boolean))).join(' / ')}): قد يكونان الخصم نفسه`);
      if(codes.has('two_matches')) reasons.push(`${clubs.join(' و')} له تقريران بخصمين مختلفين: قد تكونان مباراتين حقيقيتين`);
      if(conflictClusters.length){ type = 'conflict'; reasons.push('نفس المباراة بنتائج مختلفة'); }
    } else if(conflictClusters.length){
      type = 'conflict';
      reasons.push('نفس المباراة بنتائج مختلفة: اختر النتيجة المعتمدة، أو اعتبرها غير مكررة');
    } else if(gItems.length === 1){
      type = 'single';
    } else {
      const orient = new Set(gItems.map(it => it.c.flipped));
      if(cls[0].internal && orient.size > 1){
        type = 'mirror'; defaultDecision = {mode: 'dup'};
        reasons.push('أرسلها الطرفان بنتيجة متعاكسة: مباراة وحدة');
      } else {
        type = 'agreed'; defaultDecision = {mode: 'dup'};
        const reps = Array.from(new Set(gItems.map(reporters).filter(Boolean)));
        if(reps.length === 1 && gItems.length > 1 && gItems.every(it => reporters(it) === reps[0])) reasons.push(`${_crCountText(gItems.length)} بنفس النتيجة من المُرسِل نفسه`);
        else reasons.push(`${_crCountText(gItems.length)} بنفس النتيجة`);
      }
    }
    if(type === 'suspect' && gItems.length && new Set(gItems.map(reporters).filter(Boolean)).size === 1 && gItems.length > 1) reasons.push('كلها من مُرسِل واحد');

    const key = variants.map(v => v.key).sort().join('~');
    groups.push({
      key, type, needsDecision: type !== 'single', defaultDecision, reasons, variants,
      reports: gItems.map(it => ({id: it.id, club: it.rec.club, opponent: it.rec.opp, gf: it.rec.gf, ga: it.rec.ga, reporter: it.reporter, time: it.time, variantKey: it.variantKey, mirrored: it.c.flipped}))
    });
  });
  const order = {conflict: 0, suspect: 1, mirror: 2, agreed: 3, single: 4};
  groups.sort((p, q) => order[p.type] - order[q.type] || p.variants[0].club.localeCompare(q.variants[0].club, 'ar') || p.key.localeCompare(q.key, 'ar'));
  const byType = {};
  groups.forEach(g => { byType[g.type] = (byType[g.type] || 0) + 1; });
  return {groups, unreadable, stats: {reports: list.length, readable: items.length, groups: groups.length, byType}};
}

// القرار الفعلي لمجموعة: المحفوظ إن كان صالحًا، وإلا الافتراضي (للمتفق والمرآة)، وإلا null (لم تُحسم). المفرد لا يحتاج قرارًا.
function effectiveDecision(group, decisions){
  if(!group.needsDecision) return {mode: 'dup', pick: group.variants[0].key};
  const d = decisions && decisions[group.key];
  const valid = x => x && (x.mode === 'sep' || (x.mode === 'dup' && (group.variants.length === 1 || group.variants.some(v => v.key === x.pick))));
  if(valid(d)) return d;
  if(d && d.mode === 'dup' && group.variants.length > 1) return null;      // قرر "مكررة" لكن ما اختار النتيجة
  const def = group.defaultDecision;
  if(def && def.mode === 'dup' && group.variants.length === 1) return {mode: 'dup', pick: group.variants[0].key};
  return null;
}
function pendingGroups(groups, decisions){
  return groups.filter(g => g.needsDecision && !effectiveDecision(g, decisions));
}

// المباريات النهائية (للمجموعات المحسومة فقط): dup ← النتيجة المختارة، sep ← كل نتيجة مميزة. بلا تكرار.
function resolveMatches(groups, decisions){
  const out = [], seen = new Set();
  groups.forEach(g => {
    const d = effectiveDecision(g, decisions);
    if(!d) return;
    const vs = d.mode === 'sep' ? g.variants : [g.variants.find(v => v.key === d.pick) || g.variants[0]];
    vs.forEach(v => { if(seen.has(v.key)) return; seen.add(v.key); out.push({club: v.club, opp: v.opp, gf: v.gf, ga: v.ga, internal: v.internal, key: v.key}); });
  });
  return out;
}

// نص اللصق: «النادي له-عليه الخصم» (بلا خصم: «النادي له-عليه»). مباراة داخلية ← سطران متقابلان (opts.expandInternal !== false)
function buildPasteText(groups, decisions, opts){
  const expand = !(opts && opts.expandInternal === false);
  const lines = [], seen = new Set();
  const push = (club, gf, ga, opp) => { const l = `${club} ${gf}-${ga}${opp ? ' ' + opp : ''}`; if(!seen.has(l)){ seen.add(l); lines.push(l); } };
  resolveMatches(groups, decisions).forEach(m => {
    push(m.club, m.gf, m.ga, m.opp);
    if(m.internal && expand) push(m.opp, m.ga, m.gf, m.club);
  });
  return lines.sort((a, b) => a.localeCompare(b, 'ar')).join('\n');
}

if(typeof module !== 'undefined') module.exports = {analyzeCommunityReports, effectiveDecision, pendingGroups, resolveMatches, buildPasteText};
