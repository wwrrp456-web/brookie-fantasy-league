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
  // بالفصحى الإعلامية الرياضية (R-27)، والأسماء كما هي (R-25)، وكل جملة مرتبطة بحقيقة (R-26)
  hero: [
    vt('rs.hero.1', s => s.hero.pts >= 3, (s, h) => `انتهت الجولة ${s.round} و${vkN(s.hero.name)} يبتسم بهدوء المنتصر ${vkBi(h, s.hero.pts)}، فيما يراجع الآخرون حساباتهم.`, ['hero']),
    vt('rs.hero.2', null, (s, h) => `دخل ${vkN(s.hero.name)} الجولة ${s.round} بخطة واضحة: أن يفوز ويخرج راضيًا. ونجحت الخطة: ${h.formatCount(s.hero.pts, 'نقطة')} ولا كلمة زيادة.`, ['hero']),
    vt('rs.hero.3', s => s.hero.pts >= 4, (s, h) => `بينما كان الجميع يلملم أوراقه بعد الجولة ${s.round}، كان ${vkN(s.hero.name)} قد جمع ${h.formatCount(s.hero.pts, 'نقطة', {case: 'acc'})} دون عناء يُذكر.`, ['hero']),
    vt('rs.hero.4', s => s.hero.pts >= 6, (s, h) => `عاجل من الجولة ${s.round}: ${vkN(s.hero.name)} يخطف الأضواء ${vkBi(h, s.hero.pts)}، والبقية يبحثون عن تفسير لما حدث.`, ['hero']),
    vt('rs.hero.5', s => s.hero.pts >= 5, (s, h) => `${vkN(s.hero.name)} بطل الجولة ${s.round} ${vkBi(h, s.hero.pts)}${s.hero.tieBreak ? ' بعد كسر التعادل' : ''}، ولم يترك لمنافسيه إلا التصفيق.`, ['hero']),
    vt('rs.hero.6', null, (s, h) => `في الجولة ${s.round} كانت الكلمة ${vkLi(s.hero.name)}: ${h.formatCount(s.hero.pts, 'نقطة')}، والجدول يشهد.`, ['hero']),
    vt('rs.hero.7', s => s.hero.pts >= 7, (s, h) => `لم يرحم ${vkN(s.hero.name)} أحدًا في الجولة ${s.round}: ${h.formatCount(s.hero.pts, 'نقطة')} دفعة واحدة، والبقية يتفرّجون.`, ['hero']),
    vt('rs.hero.8', s => s.hero.tieBreak, (s, h) => `تعادل على قمة الجولة ${s.round}، وكسر التعادل ابتسم ${vkLi(s.hero.name)} ${vkBi(h, s.hero.pts)}.`, ['hero']),
    vt('rs.hero.9', null, (s, h) => `قالها ${vkN(s.hero.name)} بالفعل قبل القول: ${h.formatCount(s.hero.pts, 'نقطة')} في الجولة ${s.round} ولقب بطل الجولة عن جدارة.`, ['hero']),
    vt('rs.hero.10', s => s.hero.pts <= 3, (s, h) => `جاءت الجولة ${s.round} شحيحة بالنقاط، وكان ${vkN(s.hero.name)} الأفضل فيها ${vkBi(h, s.hero.pts)}.`, ['hero']),
    vt('rs.hero.11', s => s.hero.pts <= 3, (s, h) => `في جولة قليلة النقاط، عرف ${vkN(s.hero.name)} كيف يخرج ${vkBi(h, s.hero.pts)} وينتزع لقب بطل الجولة ${s.round}.`, ['hero']),
  ],
  mummat: [
    vt('rs.mumma.1', s => s.mummat.length > 0, (s, h) => { const n = s.mummat.length; return `وفي الطرف الآخر، ${_bt.who(h, s.mummat)} ${vkV(h, n, 'سجّل', 'سجّلا', 'سجّلوا')} في هذه الجولة ممة مدوية، فدقيقة صمت على نقاط غابت ولم تعد.`; }),
    vt('rs.mumma.2', s => s.mummat.length > 0, (s, h) => { const n = s.mummat.length; return `${_bt.who(h, s.mummat)} ${vkV(h, n, 'أنهى', 'أنهيا', 'أنهوا')} الجولة ${s.round} بلا أي نقطة، في بطولة كاملة للغياب.`; }),
    vt('rs.mumma.3', s => s.mummat.length > 0, (s, h) => { const n = s.mummat.length; return `تحية خاصة ${vkLi(vkWho(h, s.mummat))}${vkFirst(s.mummat)}، فالممة كانت من ${vkV(h, n, 'نصيبه', 'نصيبهما', 'نصيبهم')} في هذه الجولة، والمعنويات بإذن الله ما زالت بخير.`; }),
    vt('rs.mumma.4', s => s.mummat.length > 0, (s, h) => { const n = s.mummat.length; return `${_bt.who(h, s.mummat)} ${vkV(h, n, 'خرج', 'خرجا', 'خرجوا')} بممة، ولا بأس، فحتى النجوم تغيب أحيانًا.`; }),
    vt('rs.mumma.5', s => s.mummat.length > 0, (s, h) => { const n = s.mummat.length; return `زارت الممة ${_bt.who(h, s.mummat)} في هذه الجولة، وكأن ${vkV(h, n, 'أنديته', 'أنديتهما', 'أنديتهم')} أخذت إجازة دون استئذان.`; }),
    vt('rs.mumma.6', s => s.mummat.length > 0, (s, h) => `لم تبتسم الجولة ${s.round} ${vkLi(vkWho(h, s.mummat))}${vkFirst(s.mummat)}، والجولة المقبلة فرصة للتعويض.`),
    vt('rs.mumma.7', s => s.mummat.length > 0, (s, h) => { const n = s.mummat.length; return `${_bt.who(h, s.mummat)} ${vkV(h, n, 'أنهى', 'أنهيا', 'أنهوا')} الجولة بلا نقاط، والمعنويات تعمل ساعات إضافية.`; }),
    vt('rs.mumma.8', s => s.mummat.length >= 3, (s, h) => `${h.formatCount(s.mummat.length, 'ممة')} في جولة واحدة، فصارت الجولة ${s.round} امتحانًا للصبر.`),
    vt('rs.mumma.9', s => s.mummat.length > 0, (s, h) => `غابت النقاط عن ${vkWho(h, s.mummat)}${vkFirst(s.mummat)}، والهمّة بإذن الله لم تغب.`),
  ],
  climb: [
    vt('rs.climb.1', s => s.climber, (s, h) => { const c = s.climber, n = c.names.length; return `${_bt.who(h, c.names)} ${vkV(h, n, 'صعد', 'صعدا', 'صعدوا')} ${_bt.M(h, c.val)} دفعة واحدة في جدول الترتيب، ${vkV(h, n, 'كأنه', 'كأنهما', 'كأنهم')} في مصعد لا يتوقف.`; }),
    vt('rs.climb.2', s => s.climber && s.climber.val >= 3, (s, h) => { const c = s.climber, n = c.names.length; return `${_bt.who(h, c.names)} ${vkV(h, n, 'قفز', 'قفزا', 'قفزوا')} ${_bt.M(h, c.val)} في هذه الجولة، والجميع يتساءل: «كيف؟!»`; }),
    vt('rs.climb.3', s => s.climber, (s, h) => { const c = s.climber, n = c.names.length; return `${_bt.who(h, c.names)} ${vkV(h, n, 'ارتقى', 'ارتقيا', 'ارتقوا')} ${_bt.M(h, c.val)}، والجدول يفسح الطريق.`; }),
    vt('rs.climb.4', s => s.climber, (s, h) => { const c = s.climber, n = c.names.length; return `أكبر صعود في الجولة ${s.round}: ${_bt.who(h, c.names)} ${vkV(h, n, 'تقدّم', 'تقدّما', 'تقدّموا')} ${_bt.M(h, c.val)}.`; }),
    vt('rs.climb.5', s => s.climber, (s, h) => { const c = s.climber, n = c.names.length; return `${_bt.who(h, c.names)} ${vkV(h, n, 'صعد', 'صعدا', 'صعدوا')} السلّم على عجل، ${vkV(h, n, 'وكسب', 'وكسبا', 'وكسبوا')} ${_bt.M(h, c.val)} في الجدول.`; }),
    vt('rs.climb.6', s => s.climber, (s, h) => { const c = s.climber; return `تحرّك الجدول لصالح ${_bt.who(h, c.names)}: ${h.formatCount(c.val, 'مركز')} إلى الأعلى دفعة واحدة، فالعمل أثمر نتيجة.`; }),
    vt('rs.climb.7', s => s.climber && s.climber.val >= 4 && s.climber.names.length === 1, (s, h) => { const c = s.climber; return `شقّ ${_bt.who(h, c.names)} طريقه إلى الأعلى ${_bt.M(h, c.val)}، ولم يقف عند حدود الخوف.`; }),
    vt('rs.climb.8', s => s.climber, (s, h) => { const c = s.climber, n = c.names.length; return `${_bt.who(h, c.names)} ${vkV(h, n, 'كسب', 'كسبا', 'كسبوا')} ${_bt.M(h, c.val)} في هذه الجولة، فصارت المطاردة أجمل.`; }),
  ],
  drop: [
    vt('rs.drop.1', s => s.dropper, (s, h) => { const d = s.dropper, n = d.names.length; return `في المقابل، ${_bt.who(h, d.names)} ${vkV(h, n, 'تراجع', 'تراجعا', 'تراجعوا')} ${_bt.M(h, d.val)} في هبوط حرّ، والموسم طويل.`; }),
    vt('rs.drop.2', s => s.dropper, (s, h) => { const d = s.dropper, n = d.names.length; return `${_bt.who(h, d.names)} ${vkV(h, n, 'هبط', 'هبطا', 'هبطوا')} ${_bt.M(h, d.val)} في هذه الجولة، والعودة ممكنة.`; }),
    vt('rs.drop.3', s => s.dropper && s.dropper.val >= 3, (s, h) => { const d = s.dropper, n = d.names.length; return `${_bt.who(h, d.names)} ${vkV(h, n, 'تراجع', 'تراجعا', 'تراجعوا')} ${_bt.M(h, d.val)}، لكن الجدول متقلّب ولا أحد ثابت.`; }),
    vt('rs.drop.4', s => s.dropper, (s, h) => { const d = s.dropper; return `لم تكن الجولة ${s.round} رحيمة مع ${_bt.who(h, d.names)}: ${_bt.M(h, d.val)} إلى الأسفل، والتعويض يبدأ من الجولة المقبلة.`; }),
    vt('rs.drop.5', s => s.dropper, (s, h) => { const d = s.dropper, n = d.names.length; return `${_bt.who(h, d.names)} ${vkV(h, n, 'تأخّر', 'تأخّرا', 'تأخّروا')} ${_bt.M(h, d.val)} في الجدول، والعودة أقرب مما ${vkV(h, n, 'يتوقع', 'يتوقعان', 'يتوقعون')}.`; }),
    vt('rs.drop.6', s => s.dropper, (s, h) => { const d = s.dropper, n = d.names.length; return `وفي الجهة الأخرى، ${_bt.who(h, d.names)} ${vkV(h, n, 'فقد', 'فقدا', 'فقدوا')} ${_bt.M(h, d.val)} من ${vkV(h, n, 'مكانه', 'مكانهما', 'مكانهم')}، ولكل جواد كبوة.`; }),
    vt('rs.drop.7', s => s.dropper && s.dropper.names.length === 1, (s, h) => { const d = s.dropper; return `نزل ${_bt.who(h, d.names)} الدرج ${_bt.M(h, d.val)} في هذه الجولة، والدرج نفسه يصلح للصعود من جديد.`; }),
    vt('rs.drop.8', s => s.dropper, (s, h) => { const d = s.dropper, n = d.names.length; return `${_bt.who(h, d.names)} ${vkV(h, n, 'خسر', 'خسرا', 'خسروا')} شيئًا من الارتفاع، ${_bt.M(h, d.val)} إلى الأسفل، والموسم ما زال في منتصفه.`; }),
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
  vt('bt.bottom.1', s => s.names.length > 0, (s, h) => { const n = s.names.length; return `${_bt.who(h, s.names)} ${vkV(h, n, 'يُغلق', 'يُغلقان', 'يُغلقون')} الجدول في هذه الجولة برصيد ${h.formatCount(s.total, 'نقطة')}، والموسم طويل والعودة ممكنة.`; }),
  vt('bt.bottom.2', s => s.names.length > 0 && s.above && s.above.gap > 0 && s.above.gap <= 4, (s, h) => `ذيل الجدول باسم ${vkWho(h, s.names)}${vkFirst(s.names)}، والفارق عن ${vkN(s.above.name)} ${h.formatCount(s.above.gap, 'نقطة')} فقط، فجولة جيدة واحدة تغيّر المكان.`),
  vt('bt.bottom.3', s => s.names.length > 0, (s, h) => `صار المركز ${s.playersCount} محطة مؤقتة ${vkLi(vkWho(h, s.names))}${vkFirst(s.names)}، والمحطات المؤقتة لا يطول فيها البقاء.`),
  vt('bt.bottom.4', s => s.names.length > 0, (s, h) => { const n = s.names.length; return `${_bt.who(h, s.names)} ${vkV(h, n, 'يرى', 'يريان', 'يرون')} الجدول كله من الأسفل، والمنظر من هناك يمنح حافزًا للصعود.`; }),
  vt('bt.bottom.5', s => s.names.length > 0, (s, h) => `ذيل الجدول في هذه الجولة عند ${vkWho(h, s.names)}${vkFirst(s.names)}، لكن الجولات الباقية كثيرة، والجدول متقلّب.`),
  vt('bt.bottom.6', s => s.names.length > 0 && s.above && s.above.gap <= 2 && s.above.gap > 0, (s, h) => `القاع قريب ممّن فوقه: ${h.formatCount(s.above.gap, 'نقطة')} بين ${vkWho(h, s.names)} و${vkN(s.above.name)}، والبقاء هناك لن يطول.`),
  vt('bt.bottom.7', s => s.names.length > 0, (s, h) => { const n = s.names.length; return `${_bt.who(h, s.names)} ${vkV(h, n, 'بدأ', 'بدآ', 'بدؤوا')} المطاردة من آخر نقطة في الجدول، وأجمل القصص تبدأ من الأسفل.`; }),
  vt('bt.bottom.8', s => s.names.length > 0, (s, h) => `تركت الجولة ${s.round} ${vkWho(h, s.names)}${vkFirst(s.names)} في آخر الجدول، والجولة المقبلة فرصة للتعويض.`),
];

// 5) التعادل على الصدارة (FR-08)
//    الحالة: {round, names: [المتعادلون على الصدارة، اثنان فأكثر], total}
const VOICE_TIE = [
  vt('bt.tie.1', s => s.names.length >= 2, (s, h) => `القمة مشتركة بين ${vkWho(h, s.names)}${vkFirst(s.names)} برصيد ${h.formatCount(s.total, 'نقطة')} لكل منهم، والجولة المقبلة تفصل.`),
  vt('bt.tie.2', s => s.names.length >= 2, (s, h) => { const n = s.names.length; return `${_bt.who(h, s.names)} ${vkV(h, n, 'يتقاسم', 'يتقاسمان', 'يتقاسمون')} الصدارة برصيد ${h.formatCount(s.total, 'نقطة')}، والكرسي لا يتسع إلا لواحد.`; }),
  vt('bt.tie.3', s => s.names.length >= 2, (s, h) => `تعادل على القمة! ${_bt.who(h, s.names)} عند ${h.formatCount(s.total, 'نقطة')}، فمن يكسر التعادل في الجولة المقبلة؟`),
  vt('bt.tie.4', s => s.names.length === 2, (s, h) => `صارت القمة لاثنين: ${h.formatList(s.names.map(vkN))}، والسباق مشتعل من الجهتين.`),
  vt('bt.tie.5', s => s.names.length >= 2, (s, h) => `لا فرق بين ${vkWho(h, s.names)}${vkFirst(s.names)} في الصدارة، ${h.formatCount(s.total, 'نقطة')} لكل منهم، والحسم مؤجّل.`),
  vt('bt.tie.6', s => s.names.length >= 2, (s, h) => { const n = s.names.length; return `${_bt.who(h, s.names)} ${vkV(h, n, 'يقف', 'يقفان', 'يقفون')} على الدرجة نفسها في القمة، وكل نقطة في الجولة المقبلة لها وزن الذهب.`; }),
  vt('bt.tie.7', s => s.names.length >= 2, (s, h) => `الصدارة بلا صاحب واحد في هذه الجولة: ${_bt.who(h, s.names)} برصيد واحد، ${h.formatCount(s.total, 'نقطة')}.`),
  vt('bt.tie.8', s => s.names.length >= 2, (s, h) => `عجز جدول الترتيب عن الاختيار بين ${vkWho(h, s.names)}${vkFirst(s.names)}، فأبقاهم جميعًا في القمة برصيد ${h.formatCount(s.total, 'نقطة')}.`),
];

// 6) مواجهة الجولة (FR-08، ميزة المواجهات العشوائية في standings-widgets.js)
//    الحالة: {round, a: {name, pts}, b: {name, pts}} — الفائز صاحب النقاط الأعلى، والتعادل لو تساوت
const _btDuel = s => s.a.pts === s.b.pts ? null : (s.a.pts > s.b.pts ? {w: s.a, l: s.b} : {w: s.b, l: s.a});
const VOICE_DUEL = {
  win: [
    vt('dl.win.1', s => _btDuel(s) && _btDuel(s).l.pts > 0, (s, h) => { const d = _btDuel(s); return `كسب ${vkN(d.w.name)} مواجهة الجولة أمام ${vkN(d.l.name)}، ${h.formatCount(d.w.pts, 'نقطة')} مقابل ${h.formatCount(d.l.pts, 'نقطة')}.`; }, ['a', 'b']),
    vt('dl.win.2', s => _btDuel(s), (s, h) => { const d = _btDuel(s); return `ذهبت مواجهة الجولة ${s.round} ${vkLi(d.w.name)}، و${vkN(d.l.name)} يطالب بالثأر في المواجهة المقبلة.`; }, ['a', 'b']),
    vt('dl.win.3', s => _btDuel(s), (s, h) => { const d = _btDuel(s); return `تفوّق ${vkN(d.w.name)} على ${vkN(d.l.name)} ${vkBi(h, d.w.pts - d.l.pts)}، والفخر هذا الأسبوع له.`; }, ['a', 'b']),
    vt('dl.win.4', s => { const d = _btDuel(s); return d && d.w.pts - d.l.pts >= 4; }, (s, h) => { const d = _btDuel(s); return `مواجهة من طرف واحد: ${vkN(d.w.name)} ${vkBi(h, d.w.pts)} و${vkN(d.l.name)} ${d.l.pts ? vkBi(h, d.l.pts) : 'بلا نقاط'}، والنتيجة واضحة.`; }, ['a', 'b']),
    vt('dl.win.5', s => { const d = _btDuel(s); return d && d.w.pts - d.l.pts === 1; }, (s, h) => { const d = _btDuel(s); return `نقطة واحدة فصلت ${vkN(d.w.name)} عن ${vkN(d.l.name)} في مواجهة الجولة، فكان الفارق شعرة.`; }, ['a', 'b']),
    vt('dl.win.6', s => _btDuel(s), (s, h) => { const d = _btDuel(s); return `يرفع ${vkN(d.w.name)} رأسه في مواجهة الجولة ${s.round}، و${vkN(d.l.name)} يجهّز الرد.`; }, ['a', 'b']),
    vt('dl.win.7', s => _btDuel(s) && _btDuel(s).l.pts > 0, (s, h) => { const d = _btDuel(s); return `الفوز في المواجهة ${vkLi(d.w.name)}: ${h.formatCount(d.w.pts, 'نقطة')} مقابل ${h.formatCount(d.l.pts, 'نقطة')}، والحساب بينهما مفتوح.`; }, ['a', 'b']),
    vt('dl.win.8', s => _btDuel(s), (s, h) => { const d = _btDuel(s); return `خسر ${vkN(d.l.name)} المواجهة أمام ${vkN(d.w.name)} في هذه الجولة، لكن المواجهات المقبلة كثيرة.`; }, ['a', 'b']),
  ],
  draw: [
    vt('dl.draw.1', s => s.a.pts === s.b.pts, (s, h) => `تعادل في مواجهة الجولة: ${h.formatList([vkN(s.a.name), vkN(s.b.name)])}، ${h.formatCount(s.a.pts, 'نقطة', {zero: 'بلا نقاط'})} لكل منهما.`, ['a', 'b']),
    vt('dl.draw.2', s => s.a.pts === s.b.pts, (s, h) => `تقاسم ${vkN(s.a.name)} و${vkN(s.b.name)} مواجهة الجولة، والحسم مؤجّل إلى المرة المقبلة.`, ['a', 'b']),
    vt('dl.draw.3', s => s.a.pts === s.b.pts, (s, h) => `لا فائز في مواجهة ${vkN(s.a.name)} و${vkN(s.b.name)}، فالنقاط متساوية تمامًا.`, ['a', 'b']),
    vt('dl.draw.4', s => s.a.pts === s.b.pts, (s, h) => `انتهت مواجهة الجولة ${s.round} بين ${vkN(s.a.name)} و${vkN(s.b.name)} بالتعادل، وكلٌّ منهما يرى نفسه الأحق.`, ['a', 'b']),
    vt('dl.draw.5', s => s.a.pts === s.b.pts, (s, h) => `لم يفترق ${vkN(s.a.name)} و${vkN(s.b.name)} في هذه الجولة، فالتعادل في المواجهة تام.`, ['a', 'b']),
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
