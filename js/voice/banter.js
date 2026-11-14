/* مكتبة الطقطقة وصيغ التنوّع للمولّدات (R-02، 002-T010، Opus). الطبقة الشعبية.
 * القواعد: style-guide.md (§3 أمثلة القصة، §8 حد الطقطقة، §9.1 النكتة المشروطة، §10 كتابة القوالب).
 * يعتمد على voice-kit.js وar-format.js. المحرك (T011/S48b) يختار حتميًا من رقم الجولة، وما يكرر قالبًا
 * لنفس المشارك في جولتين متتاليتين (FR-08)، ولا في آخر 3 جولات لو فيه بديل (S44b).
 *
 * 1) قصة الجولة (بديل قوالب round-story-card.js المصحَّح، 8 صيغ لكل موقف، FR-08)
 *    الحالة: {round, hero: {name, pts, tieBreak} | null, mummat: [أسماء], climber: {names, val ≥ 2} | null,
 *             dropper: {names, val ≥ 2} | null}
 * 2) السلاسل: {names: [أسماء]، count ≥ 2}  3) الإشعارات: حسب كل قائمة (round، title، name). */

const _bt = {
  who: (h, names, c) => vkWho(h, names, c) + vkFirst(names),
  M: (h, n) => h.formatCount(n, 'مركز', {case: 'acc'}),
};

const VOICE_ROUND_STORY = {
  hero: [
    vt('rs.hero.1', s => s.hero.pts >= 3, (s, h) => `الجولة ${s.round} خلصت و${vkN(s.hero.name)} قاعد يبتسم بهدوء المنتصر ${vkBi(h, s.hero.pts)}، والبقية يراجعون قراراتهم.`, ['hero']),
    vt('rs.hero.2', null, (s, h) => `${vkN(s.hero.name)} دخل الجولة ${s.round} بخطة واضحة: يفوز ويطلع مبسوط. ونجحت الخطة، ${h.formatCount(s.hero.pts, 'نقطة')} ولا كلمة زيادة.`, ['hero']),
    vt('rs.hero.3', s => s.hero.pts >= 4, (s, h) => `الكل يلملم أوراقه بعد الجولة ${s.round}، و${vkN(s.hero.name)} مشغول يحسب كيف جاب ${h.formatCount(s.hero.pts, 'نقطة', {case: 'acc'})} بدون ما يعرق.`, ['hero']),
    vt('rs.hero.4', s => s.hero.pts >= 6, (s, h) => `عاجل من الجولة ${s.round}: ${vkN(s.hero.name)} خطف الأضواء ${vkBi(h, s.hero.pts)}، والباقين للحين يدوّرون تفسير علمي للي صار.`, ['hero']),
    vt('rs.hero.5', s => s.hero.pts >= 5, (s, h) => `${vkN(s.hero.name)} بطل الجولة ${s.round} ${vkBi(h, s.hero.pts)}${s.hero.tieBreak ? ' بعد كسر التعادل' : ''}، وما ترك للباقين إلا التصفيق.`, ['hero']),
    vt('rs.hero.6', null, (s, h) => `في الجولة ${s.round} كان الكلام كله ${vkLi(s.hero.name)}: ${h.formatCount(s.hero.pts, 'نقطة')}، والجدول يشهد.`, ['hero']),
    vt('rs.hero.7', s => s.hero.pts >= 7, (s, h) => `${vkN(s.hero.name)} ما رحم أحد في الجولة ${s.round}: ${h.formatCount(s.hero.pts, 'نقطة')} دفعة وحدة، والبقية يتفرّجون.`, ['hero']),
    vt('rs.hero.8', s => s.hero.tieBreak, (s, h) => `تعادل على القمة في الجولة ${s.round}، وكسر التعادل ابتسم ${vkLi(s.hero.name)} ${vkBi(h, s.hero.pts)}.`, ['hero']),
    vt('rs.hero.10', s => s.hero.pts <= 3, (s, h) => `الجولة ${s.round} كانت شحيحة بالنقاط، و${vkN(s.hero.name)} كان أحسن الموجودين ${vkBi(h, s.hero.pts)}.`, ['hero']),
    vt('rs.hero.11', s => s.hero.pts <= 3, (s, h) => `في جولة قليلة النقاط، ${vkN(s.hero.name)} عرف يطلع ${vkBi(h, s.hero.pts)} ويخطف لقب بطل الجولة ${s.round}.`, ['hero']),
    vt('rs.hero.9', null, (s, h) => `${vkN(s.hero.name)} قالها بالفعل قبل القول، ${h.formatCount(s.hero.pts, 'نقطة')} في الجولة ${s.round} ولقب بطل الجولة بجدارة.`, ['hero']),
  ],
  mummat: [
    vt('rs.mumma.1', s => s.mummat.length > 0, (s, h) => { const n = s.mummat.length; return `وفي الطرف الثاني، ${_bt.who(h, s.mummat)} ${vkV(h, n, 'سجّل', 'سجّلا', 'سجّلوا')} هالجولة ممة مدوية، ودقيقة صمت على نقاط راحت وما رجعت.`; }),
    vt('rs.mumma.2', s => s.mummat.length > 0, (s, h) => { const n = s.mummat.length; return `${_bt.who(h, s.mummat)} ${vkV(h, n, 'قرّر', 'قرّرا', 'قرّروا')} ${vkV(h, n, 'يعدّي', 'يعدّيان', 'يعدّون')} الجولة ${s.round} بلا ولا نقطة، بطولة كاملة في الغياب.`; }),
    vt('rs.mumma.3', s => s.mummat.length > 0, (s, h) => `تحية خاصة ${vkLi(vkWho(h, s.mummat, 'gen'))}${vkFirst(s.mummat)}، ممة هالجولة، والروح المعنوية إن شاء الله للحين بخير.`),
    vt('rs.mumma.4', s => s.mummat.length > 0, (s, h) => { const n = s.mummat.length; return `${_bt.who(h, s.mummat)} ${vkV(h, n, 'طلع', 'طلعا', 'طلعوا')} بممة، وما عليه، حتى النجوم يغيبون أحيانًا.`; }),
    vt('rs.mumma.5', s => s.mummat.length > 0, (s, h) => { const n = s.mummat.length; return `الممة زارت ${_bt.who(h, s.mummat, 'acc')} هالجولة، و${vkV(h, n, 'أنديته', 'أنديتهما', 'أنديتهم')} أخذت إجازة بدون ما تستأذن.`; }),
    vt('rs.mumma.6', s => s.mummat.length > 0, (s, h) => `الجولة ${s.round} ما ابتسمت ${vkLi(vkWho(h, s.mummat, 'gen'))}${vkFirst(s.mummat)}، والجولة الجاية فرصة للتعويض.`),
    vt('rs.mumma.7', s => s.mummat.length > 0, (s, h) => { const n = s.mummat.length; return `${_bt.who(h, s.mummat)} ${vkV(h, n, 'عدّى', 'عدّيا', 'عدّوا')} الجولة بلا نقاط، والدرع المعنوي يشتغل ساعات إضافية.`; }),
    vt('rs.mumma.8', s => s.mummat.length >= 3, (s, h) => `${h.formatCount(s.mummat.length, 'ممة')} في جولة وحدة، والجولة ${s.round} صارت جولة الصبر.`),
    vt('rs.mumma.9', s => s.mummat.length > 0, (s, h) => `غابت النقاط عن ${_bt.who(h, s.mummat, 'gen')}، والهمّة إن شاء الله ما غابت.`),
  ],
  climb: [
    vt('rs.climb.1', s => s.climber, (s, h) => { const c = s.climber, n = c.names.length; return `${_bt.who(h, c.names)} ${vkV(h, n, 'صعد', 'صعدا', 'صعدوا')} ${_bt.M(h, c.val)} دفعة وحدة في جدول الترتيب، مصعد كهربائي على طول.`; }),
    vt('rs.climb.2', s => s.climber && s.climber.val >= 3, (s, h) => { const c = s.climber, n = c.names.length; return `${_bt.who(h, c.names)} ${vkV(h, n, 'قفز', 'قفزا', 'قفزوا')} ${_bt.M(h, c.val)} هالجولة، والبقية للحين يسألون: «كيف؟!»`; }),
    vt('rs.climb.3', s => s.climber, (s, h) => { const c = s.climber, n = c.names.length; return `${_bt.who(h, c.names)} ${vkV(h, n, 'طلع', 'طلعا', 'طلعوا')} ${_bt.M(h, c.val)} لفوق، والجدول يفسح الطريق.`; }),
    vt('rs.climb.4', s => s.climber, (s, h) => { const c = s.climber, n = c.names.length; return `أكبر صعود في الجولة ${s.round}: ${_bt.who(h, c.names)} ${vkV(h, n, 'تقدّم', 'تقدّما', 'تقدّموا')} ${_bt.M(h, c.val)}.`; }),
    vt('rs.climb.5', s => s.climber, (s, h) => { const c = s.climber, n = c.names.length; return `${_bt.who(h, c.names)} ${vkV(h, n, 'ركب', 'ركبا', 'ركبوا')} السلّم بالعجل، و${_bt.M(h, c.val)} صارت في الجيب.`; }),
    vt('rs.climb.6', s => s.climber, (s, h) => { const c = s.climber, n = c.names.length; return `الجدول تحرّك لصالح ${_bt.who(h, c.names, 'gen')}: ${h.formatCount(c.val, 'مركز')} لفوق مرة وحدة، وواضح إن الشغل ${vkV(h, n, 'جاب', 'جابا', 'جابوا')} نتيجة.`; }),
    vt('rs.climb.7', s => s.climber && s.climber.val >= 4 && s.climber.names.length === 1, (s, h) => { const c = s.climber; return `${_bt.who(h, c.names)} شقّ طريقه لفوق ${_bt.M(h, c.val)}، وما وقّف عند حدود الخوف.`; }),
    vt('rs.climb.8', s => s.climber, (s, h) => { const c = s.climber, n = c.names.length; return `${_bt.who(h, c.names)} ${vkV(h, n, 'كسب', 'كسبا', 'كسبوا')} ${_bt.M(h, c.val)} هالجولة، والمطاردة صارت أحلى.`; }),
  ],
  drop: [
    vt('rs.drop.1', s => s.dropper, (s, h) => { const d = s.dropper, n = d.names.length; return `بالمقابل، ${_bt.who(h, d.names)} ${vkV(h, n, 'تراجع', 'تراجعا', 'تراجعوا')} ${_bt.M(h, d.val)}، نزول حر بلا مظلة، والموسم طويل.`; }),
    vt('rs.drop.2', s => s.dropper, (s, h) => { const d = s.dropper, n = d.names.length; return `${_bt.who(h, d.names)} ${vkV(h, n, 'نزل', 'نزلا', 'نزلوا')} ${_bt.M(h, d.val)} هالجولة، سلّم متزحلق بامتياز، والرجعة ممكنة.`; }),
    vt('rs.drop.3', s => s.dropper && s.dropper.val >= 3, (s, h) => { const d = s.dropper, n = d.names.length; return `${_bt.who(h, d.names)} ${vkV(h, n, 'طاح', 'طاحا', 'طاحوا')} ${_bt.M(h, d.val)}، بس الجدول يتقلّب وما أحد ثابت.`; }),
    vt('rs.drop.4', s => s.dropper, (s, h) => { const d = s.dropper, n = d.names.length; return `الجولة ${s.round} ما كانت رحيمة مع ${_bt.who(h, d.names, 'gen')}: ${_bt.M(h, d.val)} لتحت، والتعويض يبدأ من الجولة الجاية.`; }),
    vt('rs.drop.5', s => s.dropper, (s, h) => { const d = s.dropper, n = d.names.length; return `${_bt.who(h, d.names)} ${vkV(h, n, 'تأخّر', 'تأخّرا', 'تأخّروا')} ${_bt.M(h, d.val)} في الجدول، والرجعة أقرب مما ${vkV(h, n, 'يتوقع', 'يتوقعان', 'يتوقعون')}.`; }),
    vt('rs.drop.6', s => s.dropper, (s, h) => { const d = s.dropper, n = d.names.length; return `في الجهة الثانية، ${_bt.who(h, d.names)} ${vkV(h, n, 'فقد', 'فقدا', 'فقدوا')} ${_bt.M(h, d.val)} من ${vkV(h, n, 'مكانه', 'مكانهما', 'مكانهم')}، وكل جواد له كبوة.`; }),
    vt('rs.drop.7', s => s.dropper && s.dropper.names.length === 1, (s, h) => { const d = s.dropper; return `${_bt.who(h, d.names)} نزل الدرج ${_bt.M(h, d.val)} هالجولة، والدرج نفسه يطلع فيه الواحد من جديد.`; }),
    vt('rs.drop.8', s => s.dropper, (s, h) => { const d = s.dropper, n = d.names.length; return `${_bt.who(h, d.names)} ${vkV(h, n, 'خسر', 'خسرا', 'خسروا')} شوي من الارتفاع، ${_bt.M(h, d.val)} لتحت، والموسم للحين في نصه.`; }),
  ],
};

const VOICE_STREAKS = {
  hot: [
    vt('st.hot.1', s => s.names.length > 0 && s.count >= 2, (s, h) => `${_bt.who(h, s.names)} على نار: ${h.formatCount(s.count, 'جولة')} بالنقاط على التوالي.`),
    vt('st.hot.2', s => s.names.length > 0 && s.count >= 2, (s, h) => { const n = s.names.length; return `${_bt.who(h, s.names)} ${vkV(h, n, 'يكمل', 'يكملان', 'يكملون')} ${h.formatCount(s.count, 'جولة')} ورا بعض بالنقاط، والنار للحين مولّعة.`; }),
    vt('st.hot.3', s => s.names.length > 0 && s.count >= 2, (s, h) => `النار ما تنطفي عند ${_bt.who(h, s.names, 'gen')}: ${h.formatCount(s.count, 'جولة')} بالنقاط على التوالي.`),
    vt('st.hot.4', s => s.names.length > 0 && s.count >= 2, (s, h) => `سلسلة ساخنة ${vkLi(vkWho(h, s.names, 'gen'))}${vkFirst(s.names)}، وصلت ${h.formatCount(s.count, 'جولة')} بالنقاط.`),
    vt('st.hot.5', s => s.names.length > 0 && s.count >= 2, (s, h) => { const n = s.names.length; return `${_bt.who(h, s.names)} ما ${vkV(h, n, 'يعرف', 'يعرفان', 'يعرفون')} الممة من ${h.formatCount(s.count, 'جولة', {case: 'acc'})}.`; }),
  ],
  cold: [
    vt('st.cold.1', s => s.names.length > 0 && s.count >= 2, (s, h) => { const n = s.names.length; return `${_bt.who(h, s.names)} ${vkV(h, n, 'له', 'لهما', 'لهم')} ${h.formatCount(s.count, 'جولة')} بلا نقاط، والفرج قريب إن شاء الله.`; }),
    vt('st.cold.2', s => s.names.length > 0 && s.count >= 2, (s, h) => { const n = s.names.length; return `${_bt.who(h, s.names)} ${vkV(h, n, 'ينتظر', 'ينتظران', 'ينتظرون')} أول نقطة من ${h.formatCount(s.count, 'جولة', {case: 'acc'})}، والصبر مفتاح الفرج.`; }),
    vt('st.cold.3', s => s.names.length > 0 && s.count >= 2, (s, h) => `برد شوي عند ${_bt.who(h, s.names, 'gen')}: ${h.formatCount(s.count, 'جولة')} بلا نقاط على التوالي، والجولة الجاية فرصة.`),
    vt('st.cold.4', s => s.names.length > 0 && s.count >= 2, (s, h) => `الدرع المعنوي شغّال عند ${_bt.who(h, s.names, 'gen')} من ${h.formatCount(s.count, 'جولة', {case: 'acc'})}، والرجعة جاية.`),
    vt('st.cold.5', s => s.names.length > 0 && s.count >= 2, (s, h) => { const n = s.names.length; return `${_bt.who(h, s.names)} ${vkV(h, n, 'يمر', 'يمرّان', 'يمرّون')} بفترة هادية، ${h.formatCount(s.count, 'جولة')} بلا نقاط، وكل جواد له كبوة.`; }),
  ],
};

const VOICE_NOTIFY = {
  // جولة جديدة نزلت نتائجها {round}
  newRound: [
    vt('nt.round.1', null, s => `نتائج الجولة ${s.round} نزلت، شف وين صرت في الجدول.`, ['round']),
    vt('nt.round.2', null, s => `الجولة ${s.round} انحسبت، والجدول تحرّك.`, ['round']),
    vt('nt.round.3', null, s => `وصلت نتائج الجولة ${s.round}، تعال شف مين البطل.`, ['round']),
    vt('nt.round.4', null, s => `الجدول اتحدّث بعد الجولة ${s.round}، وفيه أخبار.`, ['round']),
    vt('nt.round.5', null, s => `خلصت الجولة ${s.round}، والترتيب الجديد جاهز.`, ['round']),
  ],
  // وسام جديد {title}
  badge: [
    vt('nt.badge.1', null, s => `وسام جديد: «${s.title}»، مبروك!`, ['title']),
    vt('nt.badge.2', null, s => `«${s.title}» صار باسمك، تستاهل.`, ['title']),
    vt('nt.badge.3', null, s => `خزانتك زادت وسام: «${s.title}».`, ['title']),
    vt('nt.badge.4', null, s => `مبروك «${s.title}»، الإنجاز له كلام.`, ['title']),
    vt('nt.badge.5', null, s => `تعبك ما راح هباء، «${s.title}» من نصيبك.`, ['title']),
  ],
  // بطل الجولة {name, round}
  hero: [
    vt('nt.hero.1', null, s => `${vkN(s.name)} بطل الجولة ${s.round}.`, ['name', 'round']),
    vt('nt.hero.2', null, s => `لقب بطل الجولة ${s.round} راح ${vkLi(s.name)}.`, ['name', 'round']),
    vt('nt.hero.3', null, s => `التاج على راس ${vkG(s.name)} في الجولة ${s.round}.`, ['name', 'round']),
    vt('nt.hero.4', null, s => `${vkN(s.name)} خطف لقب الجولة ${s.round}.`, ['name', 'round']),
    vt('nt.hero.5', null, s => `الجولة ${s.round} لها بطل: ${vkN(s.name)}.`, ['name', 'round']),
  ],
};

// 4) القاع (FR-08): آخر الجدول، بلطف وباب أمل (الدستور 17 وstyle-guide §8 السؤال 5)
//    الحالة: {round, names: [أصحاب المركز الأخير، بترتيب الجدول], total, above: {name, gap} | null, playersCount}
const VOICE_BOTTOM = [
  vt('bt.bottom.1', s => s.names.length > 0, (s, h) => { const n = s.names.length; return `${_bt.who(h, s.names)} ${vkV(h, n, 'يقفل', 'يقفلان', 'يقفلون')} الجدول هالجولة برصيد ${h.formatCount(s.total, 'نقطة')}، والموسم طويل والعودة ممكنة.`; }),
  vt('bt.bottom.2', s => s.names.length > 0 && s.above && s.above.gap > 0 && s.above.gap <= 4, (s, h) => `آخر الجدول باسم ${vkWho(h, s.names, 'gen')}${vkFirst(s.names)}، والفارق عن ${vkG(s.above.name)} ${h.formatCount(s.above.gap, 'نقطة')} بس، يعني جولة زينة وحدة تغيّر المكان.`),
  vt('bt.bottom.3', s => s.names.length > 0, (s, h) => `المركز ${s.playersCount} صار محطة مؤقتة ${vkLi(vkWho(h, s.names, 'gen'))}${vkFirst(s.names)}، والمحطات المؤقتة ما يطوّل فيها أحد.`),
  vt('bt.bottom.4', s => s.names.length > 0, (s, h) => { const n = s.names.length; return `${_bt.who(h, s.names)} ${vkV(h, n, 'يشوف', 'يشوفان', 'يشوفون')} الجدول كله من تحت، والمنظر من هناك يعطي حافز للصعود.`; }),
  vt('bt.bottom.5', s => s.names.length > 0, (s, h) => `ذيل الجدول هالجولة عند ${vkWho(h, s.names, 'gen')}${vkFirst(s.names)}، بس الجولات الباقية كثيرة، والجدول يتقلّب.`),
  vt('bt.bottom.6', s => s.names.length > 0 && s.above && s.above.gap <= 2 && s.above.gap > 0, (s, h) => `القاع قريب من اللي فوقه: ${h.formatCount(s.above.gap, 'نقطة')} بين ${vkWho(h, s.names, 'gen')} و${vkG(s.above.name)}، والمكان ما راح يطوّل.`),
  vt('bt.bottom.7', s => s.names.length > 0, (s, h) => { const n = s.names.length; return `${_bt.who(h, s.names)} ${vkV(h, n, 'بدأ', 'بدآ', 'بدؤوا')} المطاردة من آخر نقطة في الجدول، وأحلى القصص تبدأ من تحت.`; }),
  vt('bt.bottom.8', s => s.names.length > 0, (s, h) => `الجولة ${s.round} خلّت ${vkWho(h, s.names, 'acc')}${vkFirst(s.names)} في آخر الجدول، والجولة الجاية فرصة للتعويض.`),
];

// 5) التعادل على الصدارة (FR-08)
//    الحالة: {round, names: [المتعادلون على الصدارة، اثنان فأكثر], total}
const VOICE_TIE = [
  vt('bt.tie.1', s => s.names.length >= 2, (s, h) => `القمة مشتركة بين ${vkWho(h, s.names, 'gen')}${vkFirst(s.names)} برصيد ${h.formatCount(s.total, 'نقطة')} لكل واحد، والجولة الجاية تفصل.`),
  vt('bt.tie.2', s => s.names.length >= 2, (s, h) => { const n = s.names.length; return `${_bt.who(h, s.names)} ${vkV(h, n, 'يتقاسم', 'يتقاسمان', 'يتقاسمون')} الصدارة برصيد ${h.formatCount(s.total, 'نقطة')}، والكرسي ما يتسع إلا لواحد.`; }),
  vt('bt.tie.3', s => s.names.length >= 2, (s, h) => `تعادل على القمة! ${_bt.who(h, s.names)} عند ${h.formatCount(s.total, 'نقطة')}، ومين يكسر التعادل الجولة الجاية؟`),
  vt('bt.tie.4', s => s.names.length === 2, (s, h) => `القمة صارت لاثنين: ${h.formatList(s.names.map(vkN))}، والسباق مشتعل من الجهتين.`),
  vt('bt.tie.5', s => s.names.length >= 2, (s, h) => `ما فيه فرق بين ${vkWho(h, s.names, 'gen')}${vkFirst(s.names)} في الصدارة، ${h.formatCount(s.total, 'نقطة')} لكل واحد، والحسم مؤجّل.`),
  vt('bt.tie.6', s => s.names.length >= 2, (s, h) => { const n = s.names.length; return `${_bt.who(h, s.names)} ${vkV(h, n, 'واقف', 'واقفين', 'واقفين')} على نفس الدرجة في القمة، وكل نقطة الجولة الجاية لها وزن ذهب.`; }),
  vt('bt.tie.7', s => s.names.length >= 2, (s, h) => `الصدارة بلا صاحب واحد هالجولة: ${_bt.who(h, s.names)} برصيد واحد، ${h.formatCount(s.total, 'نقطة')}.`),
  vt('bt.tie.8', s => s.names.length >= 2, (s, h) => `جدول الترتيب ما قدر يختار بين ${vkWho(h, s.names, 'gen')}${vkFirst(s.names)}، فخلّاهم كلهم فوق برصيد ${h.formatCount(s.total, 'نقطة')}.`),
];

// 6) مواجهة الجولة (FR-08، ميزة المواجهات العشوائية في standings-widgets.js)
//    الحالة: {round, a: {name, pts}, b: {name, pts}} — الفائز صاحب النقاط الأعلى، والتعادل لو تساوت
const _btDuel = s => s.a.pts === s.b.pts ? null : (s.a.pts > s.b.pts ? {w: s.a, l: s.b} : {w: s.b, l: s.a});
const VOICE_DUEL = {
  win: [
    vt('dl.win.1', s => _btDuel(s) && _btDuel(s).l.pts > 0, (s, h) => { const d = _btDuel(s); return `${vkN(d.w.name)} كسب مواجهة الجولة على ${vkG(d.l.name)}، ${h.formatCount(d.w.pts, 'نقطة')} مقابل ${h.formatCount(d.l.pts, 'نقطة')}.`; }, ['a', 'b']),
    vt('dl.win.2', s => _btDuel(s), (s, h) => { const d = _btDuel(s); return `مواجهة الجولة ${s.round} راحت ${vkLi(d.w.name)}، و${vkN(d.l.name)} يطالب بإعادة الجولة الجاية.`; }, ['a', 'b']),
    vt('dl.win.3', s => _btDuel(s), (s, h) => { const d = _btDuel(s); return `${vkN(d.w.name)} تفوّق على ${vkG(d.l.name)} ${vkBi(h, d.w.pts - d.l.pts)}، والفخر هالأسبوع له.`; }, ['a', 'b']),
    vt('dl.win.4', s => { const d = _btDuel(s); return d && d.w.pts - d.l.pts >= 4; }, (s, h) => { const d = _btDuel(s); return `مواجهة من طرف واحد: ${vkN(d.w.name)} ${vkBi(h, d.w.pts)} و${vkN(d.l.name)} ${d.l.pts ? vkBi(h, d.l.pts) : 'بلا نقاط'}، والنتيجة واضحة.`; }, ['a', 'b']),
    vt('dl.win.5', s => { const d = _btDuel(s); return d && d.w.pts - d.l.pts === 1; }, (s, h) => { const d = _btDuel(s); return `نقطة وحدة فصلت ${vkA(d.w.name)} عن ${vkG(d.l.name)} في مواجهة الجولة، والفرق كان شعرة.`; }, ['a', 'b']),
    vt('dl.win.6', s => _btDuel(s), (s, h) => { const d = _btDuel(s); return `${vkN(d.w.name)} يرفع راسه في مواجهة الجولة ${s.round}، و${vkN(d.l.name)} يجهّز الرد.`; }, ['a', 'b']),
    vt('dl.win.7', s => _btDuel(s) && _btDuel(s).l.pts > 0, (s, h) => { const d = _btDuel(s); return `الفوز في المواجهة ${vkLi(d.w.name)}: ${h.formatCount(d.w.pts, 'نقطة')} مقابل ${h.formatCount(d.l.pts, 'نقطة')}، والحساب مفتوح بينهم.`; }, ['a', 'b']),
    vt('dl.win.8', s => _btDuel(s), (s, h) => { const d = _btDuel(s); return `${vkN(d.l.name)} خسر المواجهة قدّام ${vkG(d.w.name)} هالجولة، بس المواجهات الجاية كثيرة.`; }, ['a', 'b']),
  ],
  draw: [
    vt('dl.draw.1', s => s.a.pts === s.b.pts, (s, h) => `تعادل في مواجهة الجولة: ${h.formatList([vkN(s.a.name), vkN(s.b.name)])}، ${h.formatCount(s.a.pts, 'نقطة', {zero: 'بلا نقاط'})} لكل واحد.`, ['a', 'b']),
    vt('dl.draw.2', s => s.a.pts === s.b.pts, (s, h) => `${vkN(s.a.name)} و${vkN(s.b.name)} تقاسما مواجهة الجولة، والحسم مؤجّل للمرة الجاية.`, ['a', 'b']),
    vt('dl.draw.3', s => s.a.pts === s.b.pts, (s, h) => `ما فيه فايز في مواجهة ${vkG(s.a.name)} و${vkG(s.b.name)}، نفس النقاط بالضبط.`, ['a', 'b']),
    vt('dl.draw.4', s => s.a.pts === s.b.pts, (s, h) => `مواجهة الجولة ${s.round} بين ${vkG(s.a.name)} و${vkG(s.b.name)} انتهت بالتعادل، وكل واحد يقول: أنا الأحق.`, ['a', 'b']),
    vt('dl.draw.5', s => s.a.pts === s.b.pts, (s, h) => `${vkN(s.a.name)} و${vkN(s.b.name)} ما تفارقا هالجولة، تعادل تام في المواجهة.`, ['a', 'b']),
  ],
};

// سجلّ المولّدات وحالتها (مرجع S44b وتقرير التنوّع). status: متنوّع (≥ 5 صيغ) · ثابت بقصد · ينتظر ترحيل
const VOICE_REGISTRY = [
  {id: 'whatsapp.report', lib: 'WA_REPORT', status: 'متنوّع', note: 'R-20، 7 مقاطع'},
  {id: 'spotlight.report', lib: 'SPOTLIGHT_ANGLES', status: 'متنوّع', note: 'R-21، 13 زاوية'},
  {id: 'roundStory', lib: 'VOICE_ROUND_STORY', status: 'متنوّع', note: 'بديل round-story-card.js (4/3/2/2 صيغ حاليًا)'},
  {id: 'streaks.line', lib: 'VOICE_STREAKS', status: 'متنوّع', note: 'سطر شعبي تحت قائمة السلاسل؛ العنوان الرسمي ثابت بقصد'},
  {id: 'notify.newRound', lib: 'VOICE_NOTIFY.newRound', status: 'متنوّع'},
  {id: 'notify.badge', lib: 'VOICE_NOTIFY.badge', status: 'متنوّع', note: 'توست الأوسمة'},
  {id: 'notify.hero', lib: 'VOICE_NOTIFY.hero', status: 'متنوّع'},
  {id: 'banter.bottom', lib: 'VOICE_BOTTOM', status: 'متنوّع', note: 'FR-08 القاع'},
  {id: 'banter.tie', lib: 'VOICE_TIE', status: 'متنوّع', note: 'FR-08 التعادل على الصدارة'},
  {id: 'banter.duel', lib: 'VOICE_DUEL', status: 'متنوّع', note: 'FR-08 مواجهة الجولة (فوز 8، تعادل 5)'},
  {id: 'badges.titles', lib: null, status: 'ثابت بقصد', note: 'أسماء الأوسمة هوية ثابتة (insights-engine.js)'},
  {id: 'stats.titles', lib: null, status: 'ثابت بقصد', note: 'عناوين الإحصاءات رسمية (stats-tab.js)'},
  {id: 'myDashboard.motivation', lib: null, status: 'ينتظر ترحيل', note: 'رسائل «حالتي» (my-dashboard.js): تحتاج جرد صيغها في S45 ثم صيغ Opus'},
];

if(typeof module !== 'undefined') module.exports = {VOICE_ROUND_STORY, VOICE_STREAKS, VOICE_NOTIFY, VOICE_BOTTOM, VOICE_TIE, VOICE_DUEL, VOICE_REGISTRY};
