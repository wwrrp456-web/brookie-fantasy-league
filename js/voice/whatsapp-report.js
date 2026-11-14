/* قوالب تقرير الواتساب بعد كل جولة (R-20، 002-T010، Opus). الطبقة الشعبية الإخبارية، وفيها سجع.
 * الموجز: specs/002-language-voice/whatsapp-report-brief.md · القواعد: style-guide.md (§5 §6 §8 §9 §9.1 §10).
 * يعتمد على voice-kit.js وar-format.js (h = {formatCount, pickForm, formatList}).
 *
 * حالة الجولة s (يبنيها المحرك S48b من البيانات فقط):
 *   round, nextRound (null بعد آخر جولة), firstRound (أول جولة حقيقية)
 *   hero: {name, pts, tieBreak, repeat (بطل الجولة السابقة أيضًا), prevRank (مركزه قبل الجولة)} | null
 *   leader: {name, total} · chaser: {name, total} | null · gap: الفارق بين الاثنين
 *   topTied: أسماء المتعادلين على الصدارة (اثنان فأكثر) أو []
 *   leaderChanged (تغيّر المتصدر عن الجولة السابقة) · prevLeader: اسم المتصدر السابق | null
 *   climbers / droppers: {names (بترتيب الجدول), val (≥ 2)} | null
 *   mummat: أسماء أصحاب الممة هذي الجولة (لعبوا ولا جمعوا) · mummaRepeat: {name, count ≥ 2} | null
 *   hotStreak: {name, count ≥ 3} (أطول سلسلة حالية بـ4 نقاط أو أكثر في كل جولة) | null
 *   playersCount: عدد المشاركين النشطين
 * ترتيب المقاطع WA_REPORT_ORDER، وكل مقطع قائمة قوالب (5 صيغ صالحة على الأقل في كل حالة شائعة).
 * المحرك يختار حتميًا من رقم الجولة، ولا يكرر قالبًا في آخر 3 جولات، ويحذف المقطع لو ما فيه قالب صالح. */

const _waGap = (s, h) => s.gap > 0;
const _waNoTie = s => !s.topTied || s.topTied.length < 2;
const _waTie = s => s.topTied && s.topTied.length >= 2;
const _waTie2 = s => s.topTied && s.topTied.length === 2;
const _waTieBreak = s => s.hero && s.hero.tieBreak ? '، بعد كسر التعادل' : '';
const _waClimb = s => !!(s.climbers && s.climbers.names.length);
const _waDrop = s => !!(s.droppers && s.droppers.names.length);
const _waNext = s => Number.isInteger(s.nextRound);

const WA_REPORT = {
  // 1. الافتتاحية (سجع، الموضع الأول)
  opener: [
    vt('wa.open.1', null, s => `الجولة ${s.round} قفلت أبوابها، والكل يحسب حسابها.`),
    vt('wa.open.2', null, () => 'جولة حماسية، ونتائجها نارية.'),
    vt('wa.open.3', null, s => `الجولة ${s.round} مرّت سريعة، وخلّت وراها أخبار بديعة.`),
    vt('wa.open.4', null, () => 'خلصت الجولة بحلوها ومرّها، وهذي أخبارها وسرّها.'),
    vt('wa.open.5', null, s => `جولة ${s.round} ولّت، والأخبار هلّت.`),
    vt('wa.open.6', s => _waClimb(s) || _waDrop(s), s => `انتهت الجولة ${s.round}، والجدول ما عاد مثل ما كان، وكل مركز صار له عنوان.`),
    vt('wa.open.7', s => s.leaderChanged && _waNoTie(s), s => `تغيّر صاحب القمة، والجولة ${s.round} كانت مهمّة.`),
    vt('wa.open.8', _waTie2, () => 'القمة صارت لاثنين، والسباق مشتعل من الجهتين.'),
    vt('wa.open.9', s => s.mummat.length >= 3, () => 'جولة فيها الفرح والحسرة، وكل واحد له فيها عبرة.'),
    vt('wa.open.10', s => s.hero && s.hero.pts >= 7, () => 'بطل الجولة طار بعيد، والكل يسأل: وش الجديد؟'),
    vt('wa.open.11', s => !_waClimb(s) && !_waDrop(s), () => 'جولة هادية على الجدول، والسباق للحين ما تحوّل.'),
  ],

  // 2. بطل الجولة
  hero: [
    vt('wa.hero.1', s => s.hero.pts >= 5, (s, h) => `بطل الجولة ${s.hero.name} ${vkBi(h, s.hero.pts)}${_waTieBreak(s)}، وما ترك للباقين إلا التصفيق.`, ['hero']),
    vt('wa.hero.2', null, (s, h) => `التاج هالمرة على راس ${s.hero.name}: ${h.formatCount(s.hero.pts, 'نقطة')}${_waTieBreak(s)}.`, ['hero']),
    vt('wa.hero.3', null, (s, h) => `${s.hero.name} خطف لقب بطل الجولة ${vkBi(h, s.hero.pts)}${_waTieBreak(s)}، وقالها بالفعل قبل القول.`, ['hero']),
    vt('wa.hero.4', null, (s, h) => `أعلى نقاط الجولة كانت من نصيب ${s.hero.name}، ${h.formatCount(s.hero.pts, 'نقطة')}${_waTieBreak(s)}، وهذا اسمه حضور.`, ['hero']),
    vt('wa.hero.5', null, (s, h) => `${s.hero.name} بطل الجولة ${s.round} ${vkBi(h, s.hero.pts)}${_waTieBreak(s)}، والجميع يرفع له القبعة.`, ['hero']),
    vt('wa.hero.6', s => s.hero.repeat, (s, h) => `${s.hero.name} بطل الجولة للمرة الثانية على التوالي ${vkBi(h, s.hero.pts)}${_waTieBreak(s)}، واضح إنه حاجز المكان.`, ['hero']),
    vt('wa.hero.8', s => s.hero.pts <= 3, (s, h) => `جولة شحيحة بالنقاط، و${s.hero.name} كان أحسن الموجودين ${vkBi(h, s.hero.pts)}${_waTieBreak(s)}.`, ['hero']),
    vt('wa.hero.7', s => s.playersCount && s.hero.prevRank > Math.ceil(s.playersCount / 2), (s, h) => `من النصف الثاني للجدول طلع ${s.hero.name} وخطف لقب الجولة ${vkBi(h, s.hero.pts)}${_waTieBreak(s)}، ومين قال إن المفاجآت خلصت؟`, ['hero']),
  ],

  // 3. الصدارة والسباق
  lead: [
    // أي حالة بلا تعادل
    vt('wa.lead.1', s => _waNoTie(s) && _waGap(s), (s, h) => `في القمة ${s.leader.name} برصيد ${h.formatCount(s.leader.total, 'نقطة')}، و${s.chaser.name} وراه بفارق ${h.formatCount(s.gap, 'نقطة', {case: 'acc'})}.`, ['leader', 'chaser']),
    // فارق قريب (1–2)
    vt('wa.lead.2', s => _waNoTie(s) && s.gap > 0 && s.gap <= 2, (s, h) => `${s.leader.name} على القمة برصيد ${h.formatCount(s.leader.total, 'نقطة')}، لكن ${s.chaser.name} يتنفّس في رقبته بفارق ${h.formatCount(s.gap, 'نقطة', {case: 'acc'})} بس.`, ['leader', 'chaser']),
    vt('wa.lead.3', s => _waNoTie(s) && !s.leaderChanged && s.gap > 0 && s.gap <= 2, (s, h) => `${s.leader.name} ثبّت الصدارة برصيد ${h.formatCount(s.leader.total, 'نقطة')}، والفارق مع ${s.chaser.name} ${h.formatCount(s.gap, 'نقطة')} لا غير، يعني كل شي وارد.`, ['leader', 'chaser']),
    vt('wa.lead.4', s => _waNoTie(s) && !s.leaderChanged && s.gap > 0 && s.gap <= 2, (s, h) => `${s.leader.name} في الصدارة برصيد ${h.formatCount(s.leader.total, 'نقطة')}، و${s.chaser.name} على بُعد ${h.formatCount(s.gap, 'نقطة', {case: 'acc'})}، والسباق ولا أحلى.`, ['leader', 'chaser']),
    // فارق مريح (3+)
    vt('wa.lead.5', s => _waNoTie(s) && s.gap >= 3, (s, h) => `${s.leader.name} مرتاح على القمة برصيد ${h.formatCount(s.leader.total, 'نقطة')}، والفارق عن ${s.chaser.name} ${h.formatCount(s.gap, 'نقطة')}، والمطاردة تبي نفس طويل.`, ['leader', 'chaser']),
    vt('wa.lead.6', s => _waNoTie(s) && !s.leaderChanged && s.gap >= 3, (s, h) => `الصدارة باقية عند ${s.leader.name} برصيد ${h.formatCount(s.leader.total, 'نقطة')}، وبينه وبين ${s.chaser.name} ${h.formatCount(s.gap, 'نقطة')}.`, ['leader', 'chaser']),
    vt('wa.lead.7', s => _waNoTie(s) && !s.leaderChanged && s.gap >= 3, (s, h) => `${s.leader.name} يغرّد بعيد في القمة برصيد ${h.formatCount(s.leader.total, 'نقطة')}، بفارق ${h.formatCount(s.gap, 'نقطة', {case: 'acc'})} عن أقرب ملاحقيه ${s.chaser.name}.`, ['leader', 'chaser']),
    // ثبات بلا تعادل
    vt('wa.lead.8', s => _waNoTie(s) && !s.leaderChanged && _waGap(s), (s, h) => `${s.leader.name} للحين المتصدر برصيد ${h.formatCount(s.leader.total, 'نقطة')}، و${s.chaser.name} أقرب ملاحقيه بفارق ${h.formatCount(s.gap, 'نقطة', {case: 'acc'})}.`, ['leader', 'chaser']),
    // تبدّل الصدارة
    vt('wa.lead.9', s => _waNoTie(s) && s.leaderChanged && s.prevLeader && _waGap(s), (s, h) => `تغيّرت الصدارة: ${s.leader.name} صعد للقمة برصيد ${h.formatCount(s.leader.total, 'نقطة')}، و${s.prevLeader} صار يطارد من الخلف.`, ['leader', 'chaser']),
    vt('wa.lead.10', s => _waNoTie(s) && s.leaderChanged && _waGap(s), (s, h) => `القمة لها صاحب جديد: ${s.leader.name} برصيد ${h.formatCount(s.leader.total, 'نقطة')}، بفارق ${h.formatCount(s.gap, 'نقطة', {case: 'acc'})} عن ${s.chaser.name}.`, ['leader', 'chaser']),
    vt('wa.lead.11', s => _waNoTie(s) && s.leaderChanged && s.prevLeader && _waGap(s), (s, h) => `${s.leader.name} اعتلى الصدارة هالجولة برصيد ${h.formatCount(s.leader.total, 'نقطة')}، وأزاح ${s.prevLeader} عن مكانه.`, ['leader', 'chaser']),
    // تعادل على الصدارة
    vt('wa.lead.12', _waTie, (s, h) => `القمة مشتركة بين ${vkWho(h, s.topTied)} برصيد ${h.formatCount(s.leader.total, 'نقطة')} لكل واحد، والجولة الجاية تفصل.`, ['leader']),
    vt('wa.lead.13', _waTie, (s, h) => `تعادل على القمة! ${vkWho(h, s.topTied)} عند ${h.formatCount(s.leader.total, 'نقطة')}، ومين يكسر التعادل الجولة الجاية؟`, ['leader']),
    vt('wa.lead.14', _waTie, (s, h) => `${vkWho(h, s.topTied)} ${vkV(h, s.topTied.length, 'يتقاسم', 'يتقاسمان', 'يتقاسمون')} الصدارة برصيد ${h.formatCount(s.leader.total, 'نقطة')}${vkFirst(s.topTied)}.`, ['leader']),
    vt('wa.lead.15', _waTie, (s, h) => `ما فيه فرق بين ${vkWho(h, s.topTied)} في القمة، ${h.formatCount(s.leader.total, 'نقطة')} لكل واحد، والحسم مؤجّل.`, ['leader']),
    vt('wa.lead.16', _waTie, (s, h) => `${vkWho(h, s.topTied)} عند نفس الرصيد ${h.formatCount(s.leader.total, 'نقطة')}، والصدارة تنتظر مين يكسر التعادل.`, ['leader']),
  ],

  // 4. الحركة في الجدول
  climb: [
    vt('wa.climb.1', _waClimb, (s, h) => { const c = s.climbers, n = c.names.length; return `${vkWho(h, c.names)} ${vkV(h, n, 'صعد', 'صعدا', 'صعدوا')} ${h.formatCount(c.val, 'مركز', {case: 'acc'})} دفعة وحدة في جدول الترتيب${vkFirst(c.names)}.`; }),
    vt('wa.climb.2', s => _waClimb(s) && s.climbers.val >= 3, (s, h) => { const c = s.climbers, n = c.names.length; return `${vkWho(h, c.names)} ${vkV(h, n, 'قفز', 'قفزا', 'قفزوا')} ${h.formatCount(c.val, 'مركز', {case: 'acc'})}${vkFirst(c.names)}، والجدول صار ${vkV(h, n, 'عنده', 'عندهما', 'عندهم')} سلّم.`; }),
    vt('wa.climb.3', _waClimb, (s, h) => { const c = s.climbers; return `أكبر صعود هالجولة كان ${vkLi(vkWho(h, c.names))}${vkFirst(c.names)}: ${h.formatCount(c.val, 'مركز')} في جدول الترتيب.`; }),
    vt('wa.climb.4', _waClimb, (s, h) => { const c = s.climbers, n = c.names.length; return `${vkWho(h, c.names)} ${vkV(h, n, 'تقدّم', 'تقدّما', 'تقدّموا')} ${h.formatCount(c.val, 'مركز', {case: 'acc'})}${vkFirst(c.names)}، وواضح إن الشغل جاب نتيجة.`; }),
    vt('wa.climb.5', _waClimb, (s, h) => { const c = s.climbers, n = c.names.length; return `وفي الجدول، ${vkWho(h, c.names)} ${vkV(h, n, 'طلع', 'طلعا', 'طلعوا')} ${h.formatCount(c.val, 'مركز', {case: 'acc'})} لفوق${vkFirst(c.names)}.`; }),
    vt('wa.climb.6', s => _waClimb(s) && s.climbers.val >= 3, (s, h) => { const c = s.climbers, n = c.names.length; return `${vkWho(h, c.names)} ${vkV(h, n, 'ركب', 'ركبا', 'ركبوا')} المصعد هالجولة${vkFirst(c.names)}: ${h.formatCount(c.val, 'مركز')} لفوق مرة وحدة.`; }),
  ],
  drop: [
    vt('wa.drop.1', _waDrop, (s, h) => { const d = s.droppers, n = d.names.length; return `بالمقابل، ${vkWho(h, d.names)} ${vkV(h, n, 'تراجع', 'تراجعا', 'تراجعوا')} ${h.formatCount(d.val, 'مركز', {case: 'acc'})}${vkFirst(d.names)}، والموسم طويل والعودة ممكنة.`; }),
    vt('wa.drop.2', _waDrop, (s, h) => { const d = s.droppers, n = d.names.length; return `${vkWho(h, d.names)} ${vkV(h, n, 'نزل', 'نزلا', 'نزلوا')} ${h.formatCount(d.val, 'مركز', {case: 'acc'})} هالجولة${vkFirst(d.names)}، بس الجدول يتقلّب وما أحد ثابت.`; }),
    vt('wa.drop.3', s => _waDrop(s) && s.droppers.val >= 3, (s, h) => { const d = s.droppers, n = d.names.length; return `${vkWho(h, d.names)} ${vkV(h, n, 'طاح', 'طاحا', 'طاحوا')} ${h.formatCount(d.val, 'مركز', {case: 'acc'})}${vkFirst(d.names)}، نزول حر بلا مظلة، والجولة الجاية فرصة للتعويض.`; }),
    vt('wa.drop.4', _waDrop, (s, h) => { const d = s.droppers, n = d.names.length; return `وفي الجهة الثانية، ${vkWho(h, d.names)} ${vkV(h, n, 'تأخّر', 'تأخّرا', 'تأخّروا')} ${h.formatCount(d.val, 'مركز', {case: 'acc'})}${vkFirst(d.names)}، والرجعة أقرب مما ${vkV(h, n, 'يتوقع', 'يتوقعان', 'يتوقعون')}.`; }),
    vt('wa.drop.5', s => _waDrop(s) && _waNext(s), (s, h) => { const d = s.droppers, n = d.names.length; return `${vkWho(h, d.names)} ${vkV(h, n, 'تراجع', 'تراجعا', 'تراجعوا')} ${h.formatCount(d.val, 'مركز', {case: 'acc'})} في جدول الترتيب${vkFirst(d.names)}، والتعويض يبدأ من الجولة ${s.nextRound}.`; }),
  ],
  // بلا صعود ولا تراجع ≥ مركزين
  quiet: [
    vt('wa.quiet.1', s => !_waClimb(s) && !_waDrop(s), () => 'الجدول ما شهد تحرّكات كبيرة هالجولة، والكل ماسك مكانه.'),
    vt('wa.quiet.2', s => !_waClimb(s) && !_waDrop(s), () => 'المراكز هالجولة شبه ثابتة، والهدوء هذا يسبق العاصفة.'),
    vt('wa.quiet.3', s => !_waClimb(s) && !_waDrop(s), () => 'ما فيه قفزات ولا طيحات هالجولة، كل واحد حافظ على مكانه تقريبًا.'),
    vt('wa.quiet.4', s => !_waClimb(s) && !_waDrop(s), () => 'جدول الترتيب أخذ نفس هالجولة، والتغييرات كانت بسيطة.'),
    vt('wa.quiet.5', s => !_waClimb(s) && !_waDrop(s), () => 'الكل تحرّك بحذر هالجولة، وما أحد غيّر مكانه كثير.'),
  ],

  // 5. الممّات (بطقطقة خفيفة وباب أمل، الدستور 17)
  mummat: [
    vt('wa.mumma.1', s => s.mummat.length > 0, (s, h) => { const n = s.mummat.length; return `${vkWho(h, s.mummat)} ${vkV(h, n, 'طلع', 'طلعا', 'طلعوا')} بممة هالجولة${vkFirst(s.mummat)}، وما عليه، حتى النجوم يغيبون أحيانًا.`; }),
    vt('wa.mumma.2', s => s.mummat.length > 0, (s, h) => { const n = s.mummat.length; return `${vkWho(h, s.mummat)} ${vkV(h, n, 'سجّل', 'سجّلا', 'سجّلوا')} هالجولة ممة${vkFirst(s.mummat)}، و${vkV(h, n, 'أنديته', 'أنديتهما', 'أنديتهم')} قررت تاخذ إجازة جماعية.`; }),
    vt('wa.mumma.3', s => s.mummat.length > 0, (s, h) => `الممة زارت ${vkWho(h, s.mummat)} هالجولة${vkFirst(s.mummat)}، والصبر مفتاح الفرج.`),
    vt('wa.mumma.4', s => s.mummat.length > 0 && s.mummat.length <= 3, (s, h) => `دقيقة صمت على نقاط ${h.formatList(s.mummat)} اللي راحت وما رجعت، والجولة الجاية تعوّض.`),
    vt('wa.mumma.5', s => s.mummat.length > 0, (s, h) => { const n = s.mummat.length; return `${vkWho(h, s.mummat)} ${vkV(h, n, 'عدّى', 'عدّيا', 'عدّوا')} الجولة بلا ولا نقطة${vkFirst(s.mummat)}، والدرع المعنوي شغّال.`; }),
    vt('wa.mumma.6', s => s.mummaRepeat && vkOrdinalF(s.mummaRepeat.count), s => `ممة ${vkOrdinalF(s.mummaRepeat.count)} على التوالي ${vkLi(s.mummaRepeat.name)}، والدرع المعنوي يشتغل ساعات إضافية، والفرج قريب إن شاء الله.`),
  ],
  noMummat: [
    vt('wa.nomumma.1', s => s.mummat.length === 0, () => 'وهالجولة بلا ممّات، الكل سجّل وشرّف.'),
    vt('wa.nomumma.2', s => s.mummat.length === 0, () => 'والخبر الحلو: ولا ممة هالجولة، الكل جاب شي.'),
    vt('wa.nomumma.3', s => s.mummat.length === 0, () => 'الممّات أخذت إجازة هالجولة، والكل حط بصمته.'),
    vt('wa.nomumma.4', s => s.mummat.length === 0, () => 'جولة بيضاء من الممّات، وهذا شي يفرّح.'),
    vt('wa.nomumma.5', s => s.mummat.length === 0, () => 'ما فيه أحد طلع خالي اليدين هالجولة، كلهم سجّلوا.'),
  ],

  // 6. السلسلة الساخنة (سجع، الموضع الثالث)
  streak: [
    vt('wa.streak.1', null, (s, h) => `${s.hotStreak.name} يكمل ${h.formatCount(s.hotStreak.count, 'جولة')} متتالية بنقاط عالية، ونار المنافسة عنده ما تبرد، وسلسلته كل جولة تتمدّد.`, ['hotStreak']),
    vt('wa.streak.2', null, (s, h) => `سلسلة ${s.hotStreak.name} الساخنة وصلت ${h.formatCount(s.hotStreak.count, 'جولة')}، والمستوى ما نزل والهمّة ما قلّت.`, ['hotStreak']),
    vt('wa.streak.3', null, (s, h) => `${h.formatCount(s.hotStreak.count, 'جولة')} ورا بعض و${s.hotStreak.name} يجمع بسخاء، وكأنه في سباق مع الهواء.`, ['hotStreak']),
    vt('wa.streak.4', null, (s, h) => `${s.hotStreak.name} في أحسن أيامه: ${h.formatCount(s.hotStreak.count, 'جولة')} متتالية بنقاط عالية، والكل يلاحق أرقامه.`, ['hotStreak']),
    vt('wa.streak.5', null, (s, h) => `النار ما تنطفي، و${s.hotStreak.name} ما يكتفي: ${h.formatCount(s.hotStreak.count, 'جولة')} متتالية بنقاط عالية.`, ['hotStreak']),
  ],

  // 7. الخاتمة (سجع، تحفيز للجولة القادمة)
  closing: [
    vt('wa.close.1', _waNext, s => `شدّوا الهمّة، الجولة ${s.nextRound} مهمّة.`),
    vt('wa.close.2', _waNext, s => `الجولة ${s.nextRound} على الأبواب، والكل يجهّز الحساب.`),
    vt('wa.close.3', _waNext, s => `الفرص للحين كثيرة، والجولة ${s.nextRound} مثيرة.`),
    vt('wa.close.4', _waNext, s => `اللي فوق يحافظ على مكانه، واللي تحت يجهّز حصانه، والجولة ${s.nextRound} تقول كلمتها.`),
    vt('wa.close.5', _waNext, s => `نلتقي بعد الجولة ${s.nextRound}، والقلوب معلّقة، والعيون محدّقة.`),
    vt('wa.close.6', _waNext, s => `جهّزوا اختياراتكم وارفعوا التوقعات، الجولة ${s.nextRound} فيها مفاجآت.`),
    vt('wa.close.7', _waNext, s => `الجولة ${s.nextRound} جاية، وكل واحد له فيها حكاية.`),
    vt('wa.close.last', s => !_waNext(s), () => 'خلص الموسم، والذكرى باقية، والمنافسة كانت راقية.'),
  ],
};

// ترتيب المقاطع في الرسالة (المحرك يدمج climb/drop/quiet في فقرة الحركة، وmummat/noMummat في فقرة الممّات)
const WA_REPORT_ORDER = ['opener', 'hero', 'lead', ['climb', 'drop', 'quiet'], ['mummat', 'noMummat'], 'streak', 'closing'];

if(typeof module !== 'undefined') module.exports = {WA_REPORT, WA_REPORT_ORDER};
