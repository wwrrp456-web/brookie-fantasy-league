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

/* ---------- سجلّ المولّدات وتقرير التنوّع (002-VAR / S44b) ----------
 * voiceGeneratorRegistry(): [{id, label, status, variants, slots | fixed, note}]
 *   status: 'متنوّع' (≥ 4 صيغ، يُفحص بالتقرير) · 'ثابت بقصد' (صيغة واحدة عمدًا) · 'يحتاج صيغ' (أقل من 4، ينتظر Opus أو ترحيل)
 *   slots: [{key, list, state(round)}] ← المولّد = ما تختاره pickVariant في كل خانة (حتميًا من رقم الجولة)
 *   fixed: round => نص (مولّد قديم يدور بـrn % عدد القوالب)
 * voiceVarietyReport(registry, rounds): لكل مولّد على الجولات 1..rounds: عدد النصوص المختلفة، ونسبة التكرار المتتالي، وأطول سلسلة تكرار،
 * وaltRepeat (تكرر القالب جولتين متتاليتين مع توفّر بديل)، وverdict: ok · fail · fixed · waiting (الإيموجي في الأداة لا هنا). history محسوب من رقم الجولة بالتسلسل (لا تخزين). */
const _VR_NAMES = ['أبو رمزي', 'العندليب', 'أبو عتاب', 'مصطفى عبده', 'أبو شيخة'];

function voiceGeneratorRegistry(){
  // const العليا لا تظهر على globalThis، فنقرأها بالاسم مباشرة (typeof آمن لو الملف غير محمّل)
  const T = {
    WA_REPORT: typeof WA_REPORT !== 'undefined' ? WA_REPORT : null, VOICE_ROUND_STORY: typeof VOICE_ROUND_STORY !== 'undefined' ? VOICE_ROUND_STORY : null,
    VOICE_STREAKS: typeof VOICE_STREAKS !== 'undefined' ? VOICE_STREAKS : null, VOICE_BOTTOM: typeof VOICE_BOTTOM !== 'undefined' ? VOICE_BOTTOM : null,
    VOICE_TIE: typeof VOICE_TIE !== 'undefined' ? VOICE_TIE : null, VOICE_DUEL: typeof VOICE_DUEL !== 'undefined' ? VOICE_DUEL : null,
    VOICE_NOTIFY: typeof VOICE_NOTIFY !== 'undefined' ? VOICE_NOTIFY : null,
    ROUND_STORY_HERO_OPENERS: typeof ROUND_STORY_HERO_OPENERS !== 'undefined' ? ROUND_STORY_HERO_OPENERS : [],
    ROUND_STORY_MUMMAT_LINES: typeof ROUND_STORY_MUMMAT_LINES !== 'undefined' ? ROUND_STORY_MUMMAT_LINES : [],
    ROUND_STORY_CLIMBER_LINES: typeof ROUND_STORY_CLIMBER_LINES !== 'undefined' ? ROUND_STORY_CLIMBER_LINES : [],
    ROUND_STORY_DROPPER_LINES: typeof ROUND_STORY_DROPPER_LINES !== 'undefined' ? ROUND_STORY_DROPPER_LINES : []
  };
  const g = n => T[n];
  const reg = [];
  // قوالب الواتساب (7 مقاطع بحالة رقم الجولة وحقائق نموذجية)
  const waBase = r => ({round: r, nextRound: r + 1, firstRound: false, playersCount: 20, hero: {name: 'أبو أوس', pts: 6, tieBreak: false, repeat: false, prevRank: 3},
    leader: {name: 'لطفي', total: 70 + r}, chaser: {name: 'أيوب', total: 68 + r}, gap: 2, topTied: [], leaderChanged: false, prevLeader: 'لطفي',
    climbers: {names: [_VR_NAMES[0]], val: 3}, droppers: {names: [_VR_NAMES[1], _VR_NAMES[2]], val: 2}, mummat: [], mummaRepeat: null,
    hotStreak: {name: 'أيوب', count: 4}});
  if(g('WA_REPORT')) reg.push({id: 'whatsapp.report', label: 'تقرير الواتساب (الطبقة الثانية)', status: 'متنوّع', note: 'R-20، 7 مقاطع',
    slots: Object.entries(g('WA_REPORT')).map(([k, list]) => ({key: 'wa.' + k, list, state: waBase}))});
  // منافس الجولة (R-21): كل زاوية × (عنوان، قصة، نكتة) بحالة منافس نموذجية تتغيّر برقم الجولة
  if(typeof SPOTLIGHT_ANGLES !== 'undefined'){
    const spBase = r => ({round: r, nextRound: r + 1, name: _VR_NAMES[1], id: 4, rank: 4, prevRank: 8, move: 4, total: 80 + r, pts: 6, played: true, playersCount: 20,
      above: {name: 'أيوب', gap: 2}, below: {name: 'سعيد', gap: 3}, isHero: false, heroTieBreak: false, heroPts: 8, isLeader: false, leaderChanged: false, second: null,
      prevPts: 1, last5: [3, 5, 1, 6, 6], hotRun: 3, coldEnded: 2, clubs: {won: 2, played: 3, best: {club: 'الهلال', opp: 'النصر', gf: 3, ga: 0}}, duel: null, badge: {title: 'الأكثر ثباتًا'},
      predictor: null, seasonMumma: 1, heroCount: 1, bestPts: 9, leaderName: 'لطفي', leaderGap: 6, roundsPlayed: r, seasonTotal: 30, rank3: 7});
    const slots = [];
    SPOTLIGHT_ANGLES.forEach(a => ['title', 'story', 'joke'].forEach(k => slots.push({key: 'sp.' + a.id + '.' + k, list: a[k], state: spBase})));
    reg.push({id: 'spotlight.report', label: 'تقرير منافس الجولة (13 زاوية)', status: 'متنوّع', note: 'R-21، العنوان والقصة والنكتة لكل زاوية', slots});
  }
  if(g('VOICE_ROUND_STORY')){
    const rs = r => ({round: r, hero: {name: 'أبو أوس', pts: 4 + (r % 3), tieBreak: false}, mummat: [_VR_NAMES[0]], climber: {names: [_VR_NAMES[3]], val: 3}, dropper: {names: [_VR_NAMES[1]], val: 2}});
    reg.push({id: 'banter.roundStory', label: 'قصة الجولة (قوالب Opus)', status: 'متنوّع', slots: Object.entries(g('VOICE_ROUND_STORY')).map(([k, list]) => ({key: 'rs.' + k, list, state: rs}))});
  }
  if(g('VOICE_STREAKS')) ['hot', 'cold'].forEach(k => reg.push({id: 'banter.streaks.' + k, label: 'سطر السلاسل (' + k + ')', status: 'متنوّع',
    slots: [{key: 'st.' + k, list: g('VOICE_STREAKS')[k], state: r => ({names: _VR_NAMES.slice(0, 1 + (r % 2)), count: 3 + (r % 4)})}]}));
  if(g('VOICE_BOTTOM')) reg.push({id: 'banter.bottom', label: 'القاع', status: 'متنوّع', slots: [{key: 'bt.bottom', list: g('VOICE_BOTTOM'),
    state: r => ({round: r, names: _VR_NAMES.slice(0, 1), total: 30 + r, above: {name: 'أيوب', gap: 3}, playersCount: 20})}]});
  if(g('VOICE_TIE')) reg.push({id: 'banter.tie', label: 'التعادل على الصدارة', status: 'متنوّع', slots: [{key: 'bt.tie', list: g('VOICE_TIE'),
    state: r => ({round: r, names: ['لطفي', 'أيوب'], total: 60 + r})}]});
  if(g('VOICE_DUEL')) ['win', 'draw'].forEach(k => reg.push({id: 'banter.duel.' + k, label: 'مواجهة الجولة (' + k + ')', status: 'متنوّع',
    slots: [{key: 'dl.' + k, list: g('VOICE_DUEL')[k], state: r => ({round: r, a: {name: _VR_NAMES[0], pts: 6}, b: {name: _VR_NAMES[1], pts: k === 'win' ? 3 : 6}})}]}));
  if(g('VOICE_NOTIFY')){
    reg.push({id: 'notify.newRound', label: 'إشعار جولة جديدة', status: 'متنوّع', slots: [{key: 'nt.round', list: g('VOICE_NOTIFY').newRound, state: r => ({round: r})}]});
    reg.push({id: 'notify.badge', label: 'توست وسام جديد', status: 'متنوّع', slots: [{key: 'nt.badge', list: g('VOICE_NOTIFY').badge, state: () => ({title: 'الأكثر ثباتًا'})}]});
    reg.push({id: 'notify.hero', label: 'إشعار بطل الجولة', status: 'متنوّع', slots: [{key: 'nt.hero', list: g('VOICE_NOTIFY').hero, state: r => ({round: r, name: _VR_NAMES[0]})}]});
  }
  // المولّدات القديمة الحيّة بالموقع (تدور بـrn % عدد القوالب أو صيغة واحدة)
  if(typeof composeSatiricalStory === 'function'){
    const n = Math.min(g('ROUND_STORY_HERO_OPENERS').length, g('ROUND_STORY_MUMMAT_LINES').length, g('ROUND_STORY_CLIMBER_LINES').length, g('ROUND_STORY_DROPPER_LINES').length);
    reg.push({id: 'story.satirical', label: 'قصة الجولة الساخرة (الحالية بالموقع)', status: 'يحتاج صيغ', variants: n, note: 'تُستبدل بـ banter.roundStory عند ربط المحرك (S50 وما بعده)',
      fixed: r => composeSatiricalStory({rn: r, hero: {name: 'أبو أوس', points: 5}, mummat: [_VR_NAMES[0]], climber: {name: _VR_NAMES[3], val: 3}, dropper: {name: _VR_NAMES[1], val: 2}})});
  }
  if(typeof composeRoundStory === 'function') reg.push({id: 'story.serious', label: 'قصة الجولة الجادة (احتياطية)', status: 'يحتاج صيغ', variants: 1,
    note: 'صيغة واحدة؛ احتياطية للواتساب (S48b). قرار: تبقى أو تُحذف بعد S45',
    fixed: r => composeRoundStory({round: r, leader: {name: 'لطفي', total: 70 + r}, chaser: {name: 'أيوب', total: 68 + r}, climbers: {names: [_VR_NAMES[0]], val: 3}, droppers: {names: [_VR_NAMES[1]], val: 2}})});
  if(typeof composeWhatsAppSummary === 'function') reg.push({id: 'whatsapp.layer1', label: 'رسالة الواتساب (الطبقة الأولى الاحتياطية)', status: 'ثابت بقصد', variants: 1,
    note: 'احتياطية لو تعذّر المحرك؛ خاتمتها ثابتة',
    fixed: r => composeWhatsAppSummary({round: r, story: 'قصة', hero: {name: 'أبو أوس', points: 5, tieBreak: false}})});
  reg.push({id: 'badges.titles', label: 'أسماء الأوسمة', status: 'ثابت بقصد', variants: 1, note: 'هوية ثابتة (insights-engine.js)', fixed: () => 'أسماء الأوسمة'});
  reg.push({id: 'stats.titles', label: 'عناوين الإحصاءات', status: 'ثابت بقصد', variants: 1, note: 'رسمية (stats-tab.js)', fixed: () => 'عناوين الإحصاءات'});
  reg.push({id: 'myDashboard.motivation', label: 'رسائل «حالتي»', status: 'يحتاج صيغ', variants: 0, note: 'تُجرد صيغها في S45 ثم صيغ Opus', fixed: null});
  return reg;
}

// عدد صيغ المولّد: لمقاطعه (أقل خانة) أو ما سُجّل
function voiceGeneratorVariants(e){
  if(e.slots) return Math.min(...e.slots.map(s => s.list.length));
  return e.variants;
}

function voiceVarietyReport(registry, rounds){
  const h = {formatCount, pickForm, formatList};
  return registry.map(e => {
    const variants = voiceGeneratorVariants(e), texts = [], ids = [];
    let altRepeat = false;
    const altAvail = [];
    if(e.fixed || e.slots){
      const history = {};
      for(let r = 1; r <= rounds; r++){
        if(e.fixed){ texts.push(e.fixed(r)); continue; }
        const parts = [], roundIds = [];
        e.slots.forEach(sl => {
          const st = sl.state(r), v = pickVariant(sl.key, r, st, sl.list, history, h);
          if(v){ parts.push(voiceApply(v, st, h)); roundIds.push(v.id); }
        });
        texts.push(parts.join(' | ')); ids.push(roundIds.join(','));
        altAvail[r - 1] = e.slots.some(sl => voiceEligible(sl.list, sl.state(r), h).length > 1);
      }
    }
    // المقارنة على القالب لا على الأرقام: «الجولة 3» و«الجولة 4» نفس الصيغة
    const norm = t => String(t).replace(/\d+/g, '#');
    const rawTexts = texts.slice();
    texts.length = 0; rawTexts.forEach(t => texts.push(norm(t)));
    // مرفوض: نفس القالب جولتين متتاليتين مع توفّر بديل
    if(e.slots) altRepeat = texts.some((t, i) => i && t === texts[i - 1] && altAvail[i]);
    let consec = 0, run = 1, maxRun = 1;
    texts.forEach((t, i) => { if(i && t === texts[i - 1]){ consec++; run++; if(run > maxRun) maxRun = run; } else run = 1; });
    const n = texts.length;
    return {id: e.id, label: e.label, status: e.status, variants, note: e.note || '', rounds: n, distinct: n ? new Set(texts).size : 0,
      consecRepeatPct: n > 1 ? Math.round(consec * 100 / (n - 1)) : 0, maxRun: n ? maxRun : 0, altRepeat,
      verdict: e.status === 'متنوّع' ? (variants >= 4 && !altRepeat ? 'ok' : 'fail') : e.status === 'ثابت بقصد' ? 'fixed' : 'waiting', missing: Math.max(0, 4 - variants)};
  });
}

if(typeof module !== 'undefined') module.exports = {pickVariant, voiceGeneratorRegistry, voiceGeneratorVariants, voiceVarietyReport};
