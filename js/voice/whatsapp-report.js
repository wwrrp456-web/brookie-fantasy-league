/* قوالب تقرير الواتساب بعد كل جولة (R-20، 002-T010، Opus). **الطبقة الإعلامية الرياضية: فصحى مبسّطة مشوّقة** (R-27)،
 * بسجع وتحفيز ونكتة لطيفة، وبلا أي كلمة لهجية، وبتماسك بين الجمل (R-26)، والأسماء كما هي (R-25).
 * الموجز: specs/002-language-voice/whatsapp-report-brief.md · القواعد: style-guide.md (§1.1 §5 §6 §8 §9 §9.1 §9.2 §10).
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
    vt('wa.open.1', null, s => `أُسدل الستار على الجولة ${s.round}، وبدأ الجميع يعيد الحساب ويقلّب الأوراق.`),
    vt('wa.open.2', null, () => 'جولة حماسية، ونتائج نارية.'),
    vt('wa.open.3', null, s => `مضت الجولة ${s.round} سريعة، وتركت وراءها أخبارًا بديعة.`),
    vt('wa.open.4', null, () => 'انتهت الجولة بحلوها ومرّها، وهذه أخبارها وأسرارها.'),
    vt('wa.open.5', null, s => `طُويت صفحة الجولة ${s.round}، وانهالت الأخبار من كل الجهات.`),
    vt('wa.open.6', s => _waClimb(s) || _waDrop(s), s => `انتهت الجولة ${s.round}، ولم يعد الجدول كما كان، فلكل مركز اليوم عنوان.`),
    vt('wa.open.7', s => s.leaderChanged && _waNoTie(s), s => `تغيّر صاحب القمة، وحملت الجولة ${s.round} أحداثًا مهمّة.`),
    vt('wa.open.8', _waTie2, () => 'صارت القمة لاثنين، والسباق مشتعل من الجهتين.'),
    vt('wa.open.9', s => s.mummat.length >= 3, () => 'جولة جمعت الفرحة والحسرة، ولكل مشارك فيها عبرة.'),
    vt('wa.open.10', s => s.hero && s.hero.pts >= 7, () => 'حلّق بطل الجولة بعيدًا، وفرض على الجميع إيقاعًا جديدًا.'),
    vt('wa.open.11', s => !_waClimb(s) && !_waDrop(s), () => 'جولة هادئة في الجدول، والسباق ما زال على حاله لم يتبدّل.'),
  ],

  // 2. بطل الجولة
  hero: [
    vt('wa.hero.1', s => s.hero.pts >= 5, (s, h) => `بطل الجولة ${vkN(s.hero.name)} ${vkBi(h, s.hero.pts)}${_waTieBreak(s)}، ولم يترك لمنافسيه إلا التصفيق.`, ['hero']),
    vt('wa.hero.2', null, (s, h) => `التاج هذه المرة ${vkLi(s.hero.name)}: ${h.formatCount(s.hero.pts, 'نقطة')}${_waTieBreak(s)}.`, ['hero']),
    vt('wa.hero.3', null, (s, h) => `انتزع ${vkN(s.hero.name)} لقب بطل الجولة ${vkBi(h, s.hero.pts)}${_waTieBreak(s)}، وقالها بالفعل قبل القول.`, ['hero']),
    vt('wa.hero.4', null, (s, h) => `أعلى نقاط الجولة كانت من نصيب ${vkN(s.hero.name)}، ${h.formatCount(s.hero.pts, 'نقطة')}${_waTieBreak(s)}، في حضور لافت.`, ['hero']),
    vt('wa.hero.5', null, (s, h) => `${vkN(s.hero.name)} بطل الجولة ${s.round} ${vkBi(h, s.hero.pts)}${_waTieBreak(s)}، والجميع يرفع له القبعة.`, ['hero']),
    vt('wa.hero.6', s => s.hero.repeat, (s, h) => `${vkN(s.hero.name)} بطل الجولة للمرة الثانية على التوالي ${vkBi(h, s.hero.pts)}${_waTieBreak(s)}، وكأنه حجز المكان باسمه.`, ['hero']),
    vt('wa.hero.7', s => s.playersCount && s.hero.prevRank > Math.ceil(s.playersCount / 2), (s, h) => `من النصف الثاني للجدول خرج ${vkN(s.hero.name)} وانتزع لقب الجولة ${vkBi(h, s.hero.pts)}${_waTieBreak(s)}، فمن قال إن المفاجآت انتهت؟`, ['hero']),
    vt('wa.hero.8', s => s.hero.pts <= 3, (s, h) => `في جولة شحيحة بالنقاط، كان ${vkN(s.hero.name)} الأفضل ${vkBi(h, s.hero.pts)}${_waTieBreak(s)}.`, ['hero']),
  ],

  // 3. الصدارة والسباق
  lead: [
    vt('wa.lead.1', s => _waNoTie(s) && _waGap(s), (s, h) => `في القمة ${vkN(s.leader.name)} برصيد ${h.formatCount(s.leader.total, 'نقطة')}، ويليه ${vkN(s.chaser.name)} بفارق ${h.formatCount(s.gap, 'نقطة', {case: 'acc'})}.`, ['leader', 'chaser']),
    vt('wa.lead.2', s => _waNoTie(s) && s.gap > 0 && s.gap <= 2, (s, h) => `يتصدّر ${vkN(s.leader.name)} برصيد ${h.formatCount(s.leader.total, 'نقطة')}، و${vkN(s.chaser.name)} يلاحقه عن قرب بفارق ${h.formatCount(s.gap, 'نقطة', {case: 'acc'})} فقط.`, ['leader', 'chaser']),
    vt('wa.lead.3', s => _waNoTie(s) && !s.leaderChanged && s.gap > 0 && s.gap <= 2, (s, h) => `ثبّت ${vkN(s.leader.name)} صدارته برصيد ${h.formatCount(s.leader.total, 'نقطة')}، والفارق مع ${vkN(s.chaser.name)} ${h.formatCount(s.gap, 'نقطة')} لا غير، فكل الاحتمالات واردة.`, ['leader', 'chaser']),
    vt('wa.lead.4', s => _waNoTie(s) && !s.leaderChanged && s.gap > 0 && s.gap <= 2, (s, h) => `يحافظ ${vkN(s.leader.name)} على الصدارة برصيد ${h.formatCount(s.leader.total, 'نقطة')}، و${vkN(s.chaser.name)} على بُعد ${h.formatCount(s.gap, 'نقطة', {case: 'acc'})}، والسباق في أحلى حالاته.`, ['leader', 'chaser']),
    vt('wa.lead.5', s => _waNoTie(s) && s.gap >= 3, (s, h) => `يتربّع ${vkN(s.leader.name)} على القمة برصيد ${h.formatCount(s.leader.total, 'نقطة')}، وبفارق ${h.formatCount(s.gap, 'نقطة', {case: 'acc'})} عن ${vkN(s.chaser.name)}، والمطاردة تحتاج إلى نفَس طويل.`, ['leader', 'chaser']),
    vt('wa.lead.6', s => _waNoTie(s) && !s.leaderChanged && s.gap >= 3, (s, h) => `تبقى الصدارة مع ${vkN(s.leader.name)} برصيد ${h.formatCount(s.leader.total, 'نقطة')}، وبينه وبين ${vkN(s.chaser.name)} ${h.formatCount(s.gap, 'نقطة')}.`, ['leader', 'chaser']),
    vt('wa.lead.7', s => _waNoTie(s) && !s.leaderChanged && s.gap >= 3, (s, h) => `يغرّد ${vkN(s.leader.name)} بعيدًا في القمة برصيد ${h.formatCount(s.leader.total, 'نقطة')}، بفارق ${h.formatCount(s.gap, 'نقطة', {case: 'acc'})} عن أقرب ملاحقيه ${vkN(s.chaser.name)}.`, ['leader', 'chaser']),
    vt('wa.lead.8', s => _waNoTie(s) && !s.leaderChanged && _waGap(s), (s, h) => `ما زال ${vkN(s.leader.name)} متصدرًا برصيد ${h.formatCount(s.leader.total, 'نقطة')}، و${vkN(s.chaser.name)} أقرب ملاحقيه بفارق ${h.formatCount(s.gap, 'نقطة', {case: 'acc'})}.`, ['leader', 'chaser']),
    vt('wa.lead.9', s => _waNoTie(s) && s.leaderChanged && s.prevLeader && _waGap(s), (s, h) => `تغيّرت الصدارة: صعد ${vkN(s.leader.name)} إلى القمة برصيد ${h.formatCount(s.leader.total, 'نقطة')}، وصار ${vkN(s.prevLeader)} مطاردًا بعد أن كان متصدرًا.`, ['leader', 'chaser']),
    vt('wa.lead.10', s => _waNoTie(s) && s.leaderChanged && _waGap(s), (s, h) => `للقمة صاحب جديد: ${vkN(s.leader.name)} برصيد ${h.formatCount(s.leader.total, 'نقطة')}، وبفارق ${h.formatCount(s.gap, 'نقطة', {case: 'acc'})} عن ${vkN(s.chaser.name)}.`, ['leader', 'chaser']),
    vt('wa.lead.11', s => _waNoTie(s) && s.leaderChanged && s.prevLeader && _waGap(s), (s, h) => `اعتلى ${vkN(s.leader.name)} الصدارة في هذه الجولة برصيد ${h.formatCount(s.leader.total, 'نقطة')}، وأزاح ${vkN(s.prevLeader)} عن مكانه.`, ['leader', 'chaser']),
    vt('wa.lead.12', _waTie, (s, h) => `القمة مشتركة بين ${vkWho(h, s.topTied)} برصيد ${h.formatCount(s.leader.total, 'نقطة')} لكل منهم، والجولة المقبلة تفصل.`, ['leader']),
    vt('wa.lead.13', _waTie, (s, h) => `تعادل على القمة! ${vkWho(h, s.topTied)} عند ${h.formatCount(s.leader.total, 'نقطة')}، فمن يكسر التعادل في الجولة المقبلة؟`, ['leader']),
    vt('wa.lead.14', _waTie, (s, h) => `${vkWho(h, s.topTied)} ${vkV(h, s.topTied.length, 'يتقاسم', 'يتقاسمان', 'يتقاسمون')} الصدارة برصيد ${h.formatCount(s.leader.total, 'نقطة')}${vkFirst(s.topTied)}.`, ['leader']),
    vt('wa.lead.15', _waTie, (s, h) => `لا فرق بين ${vkWho(h, s.topTied)} في القمة، ${h.formatCount(s.leader.total, 'نقطة')} لكل منهم، والحسم مؤجّل.`, ['leader']),
    vt('wa.lead.16', _waTie, (s, h) => `${vkWho(h, s.topTied)} عند الرصيد نفسه، ${h.formatCount(s.leader.total, 'نقطة')}، والصدارة تنتظر من يكسر التعادل.`, ['leader']),
  ],

  // 4. الحركة في الجدول
  climb: [
    vt('wa.climb.1', _waClimb, (s, h) => { const c = s.climbers, n = c.names.length; return `${vkWho(h, c.names)} ${vkV(h, n, 'صعد', 'صعدا', 'صعدوا')} ${h.formatCount(c.val, 'مركز', {case: 'acc'})} دفعة واحدة في جدول الترتيب${vkFirst(c.names)}.`; }),
    vt('wa.climb.2', s => _waClimb(s) && s.climbers.val >= 3, (s, h) => { const c = s.climbers, n = c.names.length; return `${vkWho(h, c.names)} ${vkV(h, n, 'قفز', 'قفزا', 'قفزوا')} ${h.formatCount(c.val, 'مركز', {case: 'acc'})}${vkFirst(c.names)}، وكأن الجدول صار سلّمًا.`; }),
    vt('wa.climb.3', _waClimb, (s, h) => { const c = s.climbers; return `أكبر صعود في هذه الجولة كان ${vkLi(vkWho(h, c.names))}${vkFirst(c.names)}: ${h.formatCount(c.val, 'مركز')} في جدول الترتيب.`; }),
    vt('wa.climb.4', _waClimb, (s, h) => { const c = s.climbers, n = c.names.length; return `${vkWho(h, c.names)} ${vkV(h, n, 'تقدّم', 'تقدّما', 'تقدّموا')} ${h.formatCount(c.val, 'مركز', {case: 'acc'})}${vkFirst(c.names)}، فالعمل أثمر نتيجة.`; }),
    vt('wa.climb.5', _waClimb, (s, h) => { const c = s.climbers, n = c.names.length; return `وفي الجدول، ${vkWho(h, c.names)} ${vkV(h, n, 'ارتقى', 'ارتقيا', 'ارتقوا')} ${h.formatCount(c.val, 'مركز', {case: 'acc'})}${vkFirst(c.names)}.`; }),
    vt('wa.climb.6', s => _waClimb(s) && s.climbers.val >= 3, (s, h) => { const c = s.climbers; return `صعود صاروخي ${vkLi(vkWho(h, c.names))}${vkFirst(c.names)}: ${h.formatCount(c.val, 'مركز')} دفعة واحدة.`; }),
  ],
  drop: [
    vt('wa.drop.1', _waDrop, (s, h) => { const d = s.droppers, n = d.names.length; return `في المقابل، ${vkWho(h, d.names)} ${vkV(h, n, 'تراجع', 'تراجعا', 'تراجعوا')} ${h.formatCount(d.val, 'مركز', {case: 'acc'})}${vkFirst(d.names)}، والموسم طويل والعودة ممكنة.`; }),
    vt('wa.drop.2', _waDrop, (s, h) => { const d = s.droppers, n = d.names.length; return `${vkWho(h, d.names)} ${vkV(h, n, 'هبط', 'هبطا', 'هبطوا')} ${h.formatCount(d.val, 'مركز', {case: 'acc'})} في هذه الجولة${vkFirst(d.names)}، لكن الجدول متقلّب ولا أحد ثابت.`; }),
    vt('wa.drop.3', s => _waDrop(s) && s.droppers.val >= 3, (s, h) => { const d = s.droppers, n = d.names.length; return `${vkWho(h, d.names)} ${vkV(h, n, 'تراجع', 'تراجعا', 'تراجعوا')} ${h.formatCount(d.val, 'مركز', {case: 'acc'})}${vkFirst(d.names)} في هبوط حرّ، والجولة المقبلة فرصة للتعويض.`; }),
    vt('wa.drop.4', _waDrop, (s, h) => { const d = s.droppers, n = d.names.length; return `وفي الجهة الأخرى، ${vkWho(h, d.names)} ${vkV(h, n, 'تأخّر', 'تأخّرا', 'تأخّروا')} ${h.formatCount(d.val, 'مركز', {case: 'acc'})}${vkFirst(d.names)}، والعودة أقرب مما ${vkV(h, n, 'يتوقع', 'يتوقعان', 'يتوقعون')}.`; }),
    vt('wa.drop.5', s => _waDrop(s) && _waNext(s), (s, h) => { const d = s.droppers, n = d.names.length; return `${vkWho(h, d.names)} ${vkV(h, n, 'تراجع', 'تراجعا', 'تراجعوا')} ${h.formatCount(d.val, 'مركز', {case: 'acc'})} في جدول الترتيب${vkFirst(d.names)}، والتعويض يبدأ من الجولة ${s.nextRound}.`; }),
  ],
  // بلا صعود ولا تراجع ≥ مركزين
  quiet: [
    vt('wa.quiet.1', s => !_waClimb(s) && !_waDrop(s), () => 'لم يشهد الجدول تحرّكات كبيرة في هذه الجولة، وحافظ الجميع على مواقعهم.'),
    vt('wa.quiet.2', s => !_waClimb(s) && !_waDrop(s), () => 'المراكز شبه ثابتة في هذه الجولة، وهذا الهدوء يسبق العاصفة.'),
    vt('wa.quiet.3', s => !_waClimb(s) && !_waDrop(s), () => 'لا قفزات ولا تراجعات كبيرة هذه المرة، فكل مشارك حافظ على مكانه تقريبًا.'),
    vt('wa.quiet.4', s => !_waClimb(s) && !_waDrop(s), () => 'التقط جدول الترتيب أنفاسه في هذه الجولة، وجاءت التغييرات طفيفة.'),
    vt('wa.quiet.5', s => !_waClimb(s) && !_waDrop(s), () => 'تحرّك الجميع بحذر في هذه الجولة، ولم يتبدّل الترتيب كثيرًا.'),
  ],

  // 5. الممّات (بدعابة لطيفة وباب أمل، الدستور 17)
  mummat: [
    vt('wa.mumma.1', s => s.mummat.length > 0, (s, h) => { const n = s.mummat.length; return `${vkWho(h, s.mummat)} ${vkV(h, n, 'خرج', 'خرجا', 'خرجوا')} بممة في هذه الجولة${vkFirst(s.mummat)}، ولا بأس، فحتى النجوم تغيب أحيانًا.`; }),
    vt('wa.mumma.2', s => s.mummat.length > 0, (s, h) => { const n = s.mummat.length; return `${vkWho(h, s.mummat)} ${vkV(h, n, 'سجّل', 'سجّلا', 'سجّلوا')} في هذه الجولة ممة${vkFirst(s.mummat)}، وكأن ${vkV(h, n, 'أنديته', 'أنديتهما', 'أنديتهم')} قررت إجازة جماعية.`; }),
    vt('wa.mumma.3', s => s.mummat.length > 0, (s, h) => `زارت الممة ${vkWho(h, s.mummat)} في هذه الجولة${vkFirst(s.mummat)}، والصبر مفتاح الفرج.`),
    vt('wa.mumma.4', s => s.mummat.length > 0 && s.mummat.length <= 3, (s, h) => `دقيقة صمت على نقاط ${vkWho(h, s.mummat)} التي غابت ولم تعد، والجولة المقبلة تعوّض.`),
    vt('wa.mumma.5', s => s.mummat.length > 0, (s, h) => { const n = s.mummat.length; return `${vkWho(h, s.mummat)} ${vkV(h, n, 'أنهى', 'أنهيا', 'أنهوا')} الجولة بلا أي نقطة${vkFirst(s.mummat)}، والمعنويات ما زالت عالية.`; }),
    vt('wa.mumma.6', s => s.mummaRepeat && vkOrdinalF(s.mummaRepeat.count), s => `ممة ${vkOrdinalF(s.mummaRepeat.count)} على التوالي ${vkLi(s.mummaRepeat.name)}، والمعنويات تعمل ساعات إضافية، والفرج قريب بإذن الله.`),
  ],
  noMummat: [
    vt('wa.nomumma.1', s => s.mummat.length === 0, () => 'وجاءت هذه الجولة بلا ممّات، فالجميع سجّل وشرّف.'),
    vt('wa.nomumma.2', s => s.mummat.length === 0, () => 'والخبر السار: لا ممة في هذه الجولة، فكل مشارك حصد شيئًا.'),
    vt('wa.nomumma.3', s => s.mummat.length === 0, () => 'غابت الممّات عن هذه الجولة، وترك كل مشارك بصمته.'),
    vt('wa.nomumma.4', s => s.mummat.length === 0, () => 'جولة خالية من الممّات، وهذا ما يسرّ الجميع.'),
    vt('wa.nomumma.5', s => s.mummat.length === 0, () => 'لم يخرج أحد خالي الوفاض في هذه الجولة، فكلهم سجّلوا.'),
  ],

  // 6. السلسلة الساخنة (سجع، الموضع الثالث)
  streak: [
    vt('wa.streak.1', null, (s, h) => `يواصل ${vkN(s.hotStreak.name)} سلسلة من ${h.formatCount(s.hotStreak.count, 'جولة', {case: 'acc'})} متتالية بنقاط عالية، فناره لا تبرد، وسلسلته تتمدّد.`, ['hotStreak']),
    vt('wa.streak.2', null, (s, h) => `وصلت سلسلة ${vkN(s.hotStreak.name)} الساخنة إلى ${h.formatCount(s.hotStreak.count, 'جولة', {case: 'acc'})}، فلا المستوى نزل، ولا الهمّة قلّت.`, ['hotStreak']),
    vt('wa.streak.3', null, (s, h) => `${h.formatCount(s.hotStreak.count, 'جولة')} متتالية و${vkN(s.hotStreak.name)} يجمع بسخاء، وكأنه في سباق مع الهواء.`, ['hotStreak']),
    vt('wa.streak.4', null, (s, h) => `${vkN(s.hotStreak.name)} في أفضل أيامه: ${h.formatCount(s.hotStreak.count, 'جولة')} متتالية بنقاط عالية، والجميع يلاحق أرقامه.`, ['hotStreak']),
    vt('wa.streak.5', null, (s, h) => `النار لا تنطفئ، و${vkN(s.hotStreak.name)} لا يكتفي: ${h.formatCount(s.hotStreak.count, 'جولة')} متتالية بنقاط عالية.`, ['hotStreak']),
  ],

  // 7. الخاتمة (سجع، تحفيز للجولة القادمة)
  closing: [
    vt('wa.close.1', _waNext, s => `الهمّة مطلوبة، والجولة ${s.nextRound} مهمّة.`),
    vt('wa.close.2', _waNext, s => `الجولة ${s.nextRound} على الأبواب، والجميع يُعدّ الحساب.`),
    vt('wa.close.3', _waNext, s => `الفرص ما زالت كثيرة، والجولة ${s.nextRound} مثيرة.`),
    vt('wa.close.4', _waNext, s => `من في القمة يحرس مكانه، ومن في القاع يُعدّ حصانه، والجولة ${s.nextRound} تقول كلمتها.`),
    vt('wa.close.5', _waNext, s => `نلتقي بعد الجولة ${s.nextRound}، والقلوب معلّقة، والعيون محدّقة.`),
    vt('wa.close.6', _waNext, s => `جهّزوا اختياراتكم وارفعوا التوقعات، فالجولة ${s.nextRound} حافلة بالمفاجآت.`),
    vt('wa.close.7', _waNext, s => `الجولة ${s.nextRound} قادمة، ولكل مشارك فيها حكاية.`),
    vt('wa.close.last', s => !_waNext(s), () => 'انتهى الموسم، والذكرى باقية، والمنافسة كانت راقية.'),
  ],
};

// ترتيب المقاطع في الرسالة (المحرك يدمج climb/drop/quiet في فقرة الحركة، وmummat/noMummat في فقرة الممّات)
const WA_REPORT_ORDER = ['opener', 'hero', 'lead', ['climb', 'drop', 'quiet'], ['mummat', 'noMummat'], 'streak', 'closing'];

if(typeof module !== 'undefined') module.exports = {WA_REPORT, WA_REPORT_ORDER};
