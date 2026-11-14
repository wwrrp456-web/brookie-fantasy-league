/* قوالب تقرير «منافس الجولة» (R-21، 002-T010، Opus). الطبقة الشعبية بإطار صحفي: عنوان مسجوع، وقصة، ورقم داعم،
 * ونكتة مشروطة بالبيانات، وخاتمة مسجوعة. الموجز: specs/002-language-voice/spotlight-report-brief.md،
 * والقواعد: style-guide.md (§8 حد الطقطقة، و§9 السجع، و§9.1 النكتة المشروطة). يعتمد على voice-kit.js وar-format.js.
 *
 * حالة المنافس sp (يبنيها مُختار S49 من البيانات فقط):
 *   round, nextRound | null, name, rank, prevRank, move (= prevRank − rank), total (الرصيد), pts (نقاط الجولة),
 *   played (لعب فعلًا)، playersCount
 *   above: {name, gap} (اللي فوقه مباشرة) | null · below: {name, gap} | null
 *   isHero, heroTieBreak, heroPts (أعلى نقاط في الجولة)
 *   isLeader, leaderChanged, second: {name, gap} (لما يكون متصدرًا) | null
 *   prevPts (نقاط الجولة السابقة) | null · last5: نقاط آخر 5 جولات لعبها (الأحدث آخرًا)
 *   hotRun: جولات متتالية حتى الحالية بـ4 نقاط أو أكثر · coldEnded: طول سلسلة الممّات اللي انكسرت هذي الجولة (أو 0)
 *   clubs: {won, played, best: {club, opp, gf, ga} (أفضل فوز لأنديته هذي الجولة) | null}
 *   duel: {opp, myPts, oppPts, totalGap} (مواجهة موسم نشطة، season-duel) | null
 *   badge: {title} (وسام جديد هذي الجولة) | null · predictor: {hits} (إصابات توقع بطل الجولة) | null
 *   seasonMumma, heroCount (مرات بطل الجولة)، bestPts (أعلى نقاط له في جولة)
 *   للنسخة الطويلة: leaderName, leaderGap (الفارق عن المتصدر، 0 لو هو المتصدر)، roundsPlayed، seasonTotal (جولات الموسم)،
 *   rank3 (مركزه قبل 3 جولات) | null
 * كل زاوية: {id, label, mood: 'up'|'down', score(sp), when(sp), title[], story[], joke[]}، وكل قائمة ≥ 5 قوالب.
 * وبعدها مجموعات مشتركة: SPOTLIGHT_FACTS (الرقم الداعم، حتى 3 مختلفة)، وSPOTLIGHT_MOTIVATION وSPOTLIGHT_CLOSING حسب mood.
 * ترتيب التقرير: العنوان ← القصة + الأرقام الداعمة ← التحفيز ← النكتة ← الخاتمة.
 * score درجة خبرية مقترحة للمختار (الأعلى أقوى)، والتوزيع العادل وعدم التكرار من شغل المختار. */

const _sp = {
  P: (h, n) => h.formatCount(n, 'نقطة'),
  Pa: (h, n) => h.formatCount(n, 'نقطة', {case: 'acc'}),
  M: (h, n) => h.formatCount(n, 'مركز', {case: 'acc'}),
  R: (h, n, acc) => h.formatCount(n, 'جولة', acc ? {case: 'acc'} : undefined),
  range(h, list){
    const lo = Math.min(...list), hi = Math.max(...list);
    return lo === hi ? `${_sp.P(h, hi)} في كل جولة` : `بين ${lo} و${_sp.P(h, hi)}`;
  },
  stdev(list){
    if(!list || list.length < 5) return Infinity;
    const avg = list.reduce((a, b) => a + b, 0) / list.length;
    return Math.sqrt(list.reduce((a, b) => a + (b - avg) * (b - avg), 0) / list.length);
  },
  avg: list => list.reduce((a, b) => a + b, 0) / list.length,
  prevDesc: sp => sp.prevPts === 0 ? 'طلع بممة' : 'اكتفى بنقطة واحدة',
  leadGap: (h, sp) => !sp.second ? '' : sp.second.gap === 0 ? `، بالتساوي مع ${vkG(sp.second.name)}` : `، بفارق ${_sp.Pa(h, sp.second.gap)} عن ${vkG(sp.second.name)}`,
};

const SPOTLIGHT_ANGLES = [
  // 1. الصاروخ
  {
    id: 'rocket', label: 'الصاروخ', mood: 'up',
    when: sp => sp.move >= 3, score: sp => 3 + sp.move,
    title: [
      vt('sp.rocket.t1', null, sp => `${vkN(sp.name)} يطير في الجدول، والقمة صارت أقرب من أول!`),
      vt('sp.rocket.t2', null, sp => `صاروخ الجولة ${sp.round}: ${vkN(sp.name)} شقّ طريقه لفوق، وما وقّف عند حدود الخوف!`),
      vt('sp.rocket.t3', null, sp => `${vkN(sp.name)} صعد وما تردّد، والجدول له تمدّد!`),
      vt('sp.rocket.t4', null, sp => `من المركز ${sp.prevRank} إلى ${sp.rank}: ${vkN(sp.name)} على الطريق السريع، والكل يسأل وش السر البديع؟`),
      vt('sp.rocket.t5', null, sp => `${vkN(sp.name)} ركب السلّم بالعجل، وطلع للمركز ${sp.rank} بلا وجل!`),
    ],
    story: [
      vt('sp.rocket.s1', null, (sp, h) => `الجولة ${sp.round} كانت جولة ${vkG(sp.name)} بامتياز: جمع ${_sp.P(h, sp.pts)} وصعد ${_sp.M(h, sp.move)} دفعة وحدة، من المركز ${sp.prevRank} إلى المركز ${sp.rank}، ورصيده الحين ${_sp.P(h, sp.total)}.`),
      vt('sp.rocket.s2', null, (sp, h) => `${_sp.P(h, sp.pts)} في جولة وحدة كانت كافية عشان ${vkN(sp.name)} يقفز ${_sp.M(h, sp.move)} في جدول الترتيب، ويستقر في المركز ${sp.rank} برصيد ${_sp.P(h, sp.total)}.`),
      vt('sp.rocket.s3', null, (sp, h) => `ما كان أحد يتوقعها: ${vkN(sp.name)} بدأ الجولة في المركز ${sp.prevRank}، وخلّصها في المركز ${sp.rank} بعد ما جمع ${_sp.P(h, sp.pts)}.`),
      vt('sp.rocket.s4', null, (sp, h) => `${vkN(sp.name)} حصد ${_sp.P(h, sp.pts)} هالجولة، وترجمها لصعود ${_sp.M(h, sp.move)} في الجدول، وصار رصيده ${_sp.P(h, sp.total)} في المركز ${sp.rank}.`),
      vt('sp.rocket.s5', null, (sp, h) => `من ${sp.prevRank} إلى ${sp.rank}، هذي حكاية ${vkG(sp.name)} مع الجولة ${sp.round}: ${_sp.P(h, sp.pts)} نظيفة، وجدول يفسح له الطريق.`),
    ],
    joke: [
      vt('sp.rocket.j1', null, () => 'الجدول عنده صار سلّم، والباقين واقفين على الدرج يتفرّجون.'),
      vt('sp.rocket.j2', sp => sp.move >= 5, (sp, h) => `${h.formatCount(sp.move, 'مركز')} في جولة؟ هذا مو صعود، هذا إقلاع.`),
      vt('sp.rocket.j3', null, () => 'اللي تخطّاهم للحين يراجعون الجدول، يحسبونه غلط مطبعي.'),
      vt('sp.rocket.j4', null, () => 'لو كمّل بهالسرعة، يبي له حزام أمان قبل الجولة الجاية.'),
      vt('sp.rocket.j5', null, () => 'المصعد الكهربائي اشتغل عنده على طول، بلا انتظار.'),
      vt('sp.rocket.j6', null, () => 'برج المراقبة يطلب منه يخفف السرعة شوي.'),
    ],
  },

  // 2. العائد من بعيد
  {
    id: 'comeback', label: 'العائد من بعيد', mood: 'up',
    when: sp => sp.prevPts !== null && sp.prevPts <= 1 && sp.pts >= 6, score: () => 5,
    title: [
      vt('sp.comeback.t1', null, sp => `${vkN(sp.name)} رجع من بعيد، وكتب الفصل الجديد!`),
      vt('sp.comeback.t2', null, sp => `بعد الكبوة جات الصحوة: ${vkN(sp.name)} يرجع بقوة!`),
      vt('sp.comeback.t3', null, sp => `${vkN(sp.name)} نفض الغبار، ورجع للمشوار!`),
      vt('sp.comeback.t4', null, sp => `${vkN(sp.name)} قلب الموازين، وردّ على المتشائمين!`),
      vt('sp.comeback.t5', null, sp => `${vkN(sp.name)} يرد بالأفعال، والجولة ${sp.round} له مثال!`),
    ],
    story: [
      vt('sp.comeback.s1', null, (sp, h) => `الجولة الماضية ما كانت له، ${_sp.prevDesc(sp)}، لكن ${vkN(sp.name)} رجع هالجولة ${vkBi(h, sp.pts)} ورفع رصيده إلى ${_sp.P(h, sp.total)}.`),
      vt('sp.comeback.s2', null, (sp, h) => `${vkN(sp.name)} في الجولة ${sp.round - 1} ${_sp.prevDesc(sp)}، وفي الجولة ${sp.round} جمع ${_sp.P(h, sp.pts)}، وهذا الفرق اللي يصنعه الإصرار، والحين هو في المركز ${sp.rank}.`),
      vt('sp.comeback.s3', null, (sp, h) => `كثير توقعوا إن ${vkA(sp.name)} راح يتعب بعد جولته الماضية، لكنه جمع ${_sp.P(h, sp.pts)} وقال كلمته من المركز ${sp.rank}.`),
      vt('sp.comeback.s4', null, (sp, h) => `${vkN(sp.name)} حوّل خيبة الجولة ${sp.round - 1} إلى جولة ${vkBi(h, sp.pts)}، ورصيده صار ${_sp.P(h, sp.total)}.`),
      vt('sp.comeback.s5', null, (sp, h) => `الرجعة دايمًا أحلى: ${vkN(sp.name)} اللي ${_sp.prevDesc(sp)} الجولة الماضية، جمع هالمرة ${_sp.P(h, sp.pts)}.`),
    ],
    joke: [
      vt('sp.comeback.j1', null, () => 'يبدو إنه أخذ الجولة الماضية استراحة محارب، ورجع بعدّة جديدة.'),
      vt('sp.comeback.j2', null, () => 'أنديته اجتمعت بعد الجولة الماضية، وقررت تعتذر له رسميًا.'),
      vt('sp.comeback.j3', null, () => 'الجولة الماضية كانت تمرين إحماء، والحين بدأت المباراة الحقيقية.'),
      vt('sp.comeback.j4', null, () => 'اللي كانوا يواسونه الأسبوع الماضي، الحين يطلبون منه النصيحة.'),
      vt('sp.comeback.j5', null, (sp, h) => `الدرع المعنوي اشتغل، والنتيجة ${_sp.P(h, sp.pts)}.`),
    ],
  },

  // 3. الحصان الأسود
  {
    id: 'darkHorse', label: 'الحصان الأسود', mood: 'up',
    when: sp => sp.playersCount && sp.prevRank > Math.ceil(sp.playersCount / 2) && (sp.isHero || sp.pts >= sp.heroPts - 1) && sp.pts >= 4,
    score: sp => sp.isHero ? 6 : 4,
    title: [
      vt('sp.dark.t1', null, sp => `${vkN(sp.name)} جا من الخلف، وقلب الصف!`),
      vt('sp.dark.t2', null, sp => `ما كان في الحسبان، و${vkN(sp.name)} صار العنوان!`),
      vt('sp.dark.t3', null, sp => `من وسط الجدول طلع النجم، و${vkN(sp.name)} قالها بالرقم!`),
      vt('sp.dark.t4', null, sp => `${vkN(sp.name)} يكسر التوقعات، ويكتب المفاجآت!`),
      vt('sp.dark.t5', null, sp => `الحصان الأسود ظهر، و${vkN(sp.name)} بالجولة ${sp.round} انتصر!`),
    ],
    story: [
      vt('sp.dark.s1', null, (sp, h) => `دخل ${vkN(sp.name)} الجولة ${sp.round} من المركز ${sp.prevRank}، وطلع منها ${sp.isHero ? 'بطل الجولة' : 'بين أعلى المسجّلين'} ${vkBi(h, sp.pts)}.`),
      vt('sp.dark.s2', null, (sp, h) => `${vkN(sp.name)} ما كان من المرشحين، لكنه جمع ${_sp.P(h, sp.pts)} هالجولة${sp.isHero ? ' وخطف لقب بطل الجولة' : ''}، ورصيده صار ${_sp.P(h, sp.total)}.`),
      vt('sp.dark.s3', null, (sp, h) => `من المركز ${sp.prevRank}، ${vkN(sp.name)} نافس الكبار على لقب الجولة ${vkBi(h, sp.pts)}، وصار الحين في المركز ${sp.rank}.`),
      vt('sp.dark.s4', null, (sp, h) => `الأنظار كانت على المتصدرين، لكن ${vkN(sp.name)} من المركز ${sp.prevRank} سرق المشهد ${vkBi(h, sp.pts)}.`),
      vt('sp.dark.s5', null, (sp, h) => `${_sp.P(h, sp.pts)} من مشارك بدأ الجولة في المركز ${sp.prevRank}؟ هذا اللي سواه ${vkN(sp.name)}، والجدول الحين يحسب له حساب.`),
    ],
    joke: [
      vt('sp.dark.j1', null, () => 'المتصدرين للحين يدوّرون اسمه في الجدول، يحسبونه دخل بالغلط.'),
      vt('sp.dark.j2', null, () => 'جا بهدوء، وطلع بضجة.'),
      vt('sp.dark.j3', null, () => 'اللي حطّوه خارج الحسابات، يحتاجون يعيدون الحسبة.'),
      vt('sp.dark.j4', null, () => 'أنديته ما قرت التوقعات، ولعبت على كيفها.'),
      vt('sp.dark.j5', null, () => 'تقارير المحللين ما ذكرته، والنتيجة فضحت التقارير.'),
    ],
  },

  // 4. الثابت
  {
    id: 'steady', label: 'الثابت', mood: 'up',
    when: sp => _sp.stdev(sp.last5) <= 1.2 && _sp.avg(sp.last5) >= 3, score: () => 2,
    title: [
      vt('sp.steady.t1', null, sp => `${vkN(sp.name)} ساعة سويسرية، ونتائجه دقيقة ومثالية!`),
      vt('sp.steady.t2', null, sp => `الثبات له عنوان، و${vkN(sp.name)} هو البرهان!`),
      vt('sp.steady.t3', null, sp => `${vkN(sp.name)} على نفس الإيقاع، وما يعرف الضياع!`),
      vt('sp.steady.t4', null, sp => `${vkN(sp.name)} ما يتغيّر، ونَفَسه للحين ما تكسّر!`),
      vt('sp.steady.t5', null, sp => `هادي ومستقر، و${vkN(sp.name)} على دربه مستمر!`),
    ],
    story: [
      vt('sp.steady.s1', null, (sp, h) => `في آخر ${_sp.R(h, sp.last5.length)}، نقاط ${vkG(sp.name)} كانت ${_sp.range(h, sp.last5)}، وهذا الثبات وصّله للمركز ${sp.rank} برصيد ${_sp.P(h, sp.total)}.`),
      vt('sp.steady.s2', null, (sp, h) => `${vkN(sp.name)} جمع ${_sp.P(h, sp.pts)} هالجولة، وهذا رقم يشبه أرقامه دايمًا: ${_sp.range(h, sp.last5)} في آخر ${_sp.R(h, sp.last5.length)}.`),
      vt('sp.steady.s3', null, (sp, h) => `ما فيه مفاجآت مع ${vkG(sp.name)}، لا فوق ولا تحت: ${_sp.range(h, sp.last5)} في آخر ${_sp.R(h, sp.last5.length)}، ورصيده ${_sp.P(h, sp.total)}.`),
      vt('sp.steady.s4', null, (sp, h) => `لو تبي تتوقع نقاط ${vkG(sp.name)} الجولة الجاية، ارجع لأرقامه: ${_sp.range(h, sp.last5)} في آخر ${_sp.R(h, sp.last5.length)}.`),
      vt('sp.steady.s5', null, (sp, h) => `الثبات سلاح ${vkG(sp.name)}: ${_sp.P(h, sp.pts)} هالجولة، ومستوى ما يهتز من جولات، والحين هو في المركز ${sp.rank}.`),
    ],
    joke: [
      vt('sp.steady.j1', null, () => 'لو تبي تضبط ساعتك، اضبطها على نقاطه.'),
      vt('sp.steady.j2', null, () => 'أنديته عندها جدول دوام رسمي، ما تتأخر وما تغيب.'),
      vt('sp.steady.j3', null, () => 'حتى الآلة الحاسبة ملّت من تكرار أرقامه.'),
      vt('sp.steady.j4', null, () => 'المفاجآت عنده ممنوعة بقرار إداري.'),
      vt('sp.steady.j5', null, () => 'يمكن هو الوحيد اللي نقاطه تنحفظ صم.'),
    ],
  },

  // 5. سلسلة ساخنة
  {
    id: 'hotStreak', label: 'سلسلة ساخنة', mood: 'up',
    when: sp => sp.hotRun >= 3, score: sp => 1 + sp.hotRun,
    title: [
      vt('sp.hot.t1', null, sp => `${vkN(sp.name)} مولّع نار، وما له قرار!`),
      vt('sp.hot.t2', null, sp => `${vkN(sp.name)} على سلسلة ساخنة، والنتائج للحين طاحنة!`),
      vt('sp.hot.t3', null, sp => `جولة ورا جولة، و${vkN(sp.name)} يكتب بطولة!`),
      vt('sp.hot.t4', null, sp => `النار ما تنطفي، و${vkN(sp.name)} ما يكتفي!`),
      vt('sp.hot.t5', null, sp => `${vkN(sp.name)} في أحسن أيامه، والكل يلاحق أرقامه!`),
    ],
    story: [
      vt('sp.hot.s1', null, (sp, h) => `${_sp.R(h, sp.hotRun)} متتالية و${vkN(sp.name)} ما ينزل عن ${h.formatCount(4, 'نقطة')} في الجولة، وآخرها ${_sp.P(h, sp.pts)} هالجولة، ورصيده الحين ${_sp.P(h, sp.total)}.`),
      vt('sp.hot.s2', null, (sp, h) => `سلسلة ${vkG(sp.name)} الساخنة وصلت ${_sp.R(h, sp.hotRun)}: في كل وحدة منها ${h.formatCount(4, 'نقطة')} أو أكثر، والحين هو في المركز ${sp.rank}.`),
      vt('sp.hot.s3', null, (sp, h) => `من الجولة ${sp.round - sp.hotRun + 1} إلى الجولة ${sp.round}، و${vkN(sp.name)} على نفس النسق العالي: ${_sp.P(h, sp.pts)} هالجولة، ورصيد ${_sp.P(h, sp.total)}.`),
      vt('sp.hot.s4', null, (sp, h) => `${vkN(sp.name)} يعيش أحلى فتراته: ${_sp.R(h, sp.hotRun)} متتالية ${vkBi(h, 4)} أو أكثر، وآخرها ${_sp.P(h, sp.pts)}.`),
      vt('sp.hot.s5', null, (sp, h) => `الأرقام ما تكذب: ${vkN(sp.name)} له ${_sp.R(h, sp.hotRun)} متتالية بنقاط عالية، وهالجولة أضاف ${_sp.P(h, sp.pts)} لرصيده اللي صار ${_sp.P(h, sp.total)}.`),
    ],
    joke: [
      vt('sp.hot.j1', null, () => 'الدفاع المدني يتابع وضعه، النار عنده ما تهدأ.'),
      vt('sp.hot.j2', null, () => 'أنديته صارت تفوز كأنها متفقة معه من قبل.'),
      vt('sp.hot.j3', null, () => 'لو استمر كذا، لازم يفتح دورة تدريبية للباقين.'),
      vt('sp.hot.j4', null, () => 'المنافسين يتمنون له جولة هادية، بس شكله ما يسمع.'),
      vt('sp.hot.j5', null, () => 'السخونة عنده مو موسمية، صارت عادة.'),
    ],
  },

  // 6. سلسلة باردة تتكسر
  {
    id: 'coldBroken', label: 'سلسلة باردة تتكسر', mood: 'up',
    when: sp => sp.coldEnded >= 2 && sp.pts > 0, score: sp => 2 + sp.coldEnded,
    title: [
      vt('sp.cold.t1', null, sp => `انكسر الجمود، و${vkN(sp.name)} رجع للصمود!`),
      vt('sp.cold.t2', null, sp => `بعد الصيام جا الإفطار، و${vkN(sp.name)} عاد للمشوار!`),
      vt('sp.cold.t3', null, sp => `${vkN(sp.name)} ودّع الممّات، وفتح صفحة الإنجازات!`),
      vt('sp.cold.t4', null, sp => `طال الانتظار، و${vkN(sp.name)} كسر الحصار!`),
      vt('sp.cold.t5', null, sp => `بعد الصبر جا الفرج، و${vkN(sp.name)} من الضيق خرج!`),
    ],
    story: [
      vt('sp.cold.s1', null, (sp, h) => `بعد ${h.formatCount(sp.coldEnded, 'ممة', {case: 'acc'})} ${vkV(h, sp.coldEnded, '', 'متتاليتين', 'متتالية')}، ${vkN(sp.name)} رجع للتسجيل هالجولة ${vkBi(h, sp.pts)}، ورصيده صار ${_sp.P(h, sp.total)}.`),
      vt('sp.cold.s2', null, (sp, h) => `${vkN(sp.name)} عانى ${_sp.R(h, sp.coldEnded, true)} بلا نقاط، وهالجولة كسر الصمت ${vkBi(h, sp.pts)}.`),
      vt('sp.cold.s3', null, (sp, h) => `الجولة ${sp.round} كانت نهاية سلسلة صعبة ${vkLi(sp.name)}: ${_sp.R(h, sp.coldEnded)} بلا نقاط ${vkV(h, sp.coldEnded, 'انتهت', 'انتهتا', 'انتهت')} ${vkBi(h, sp.pts)}.`),
      vt('sp.cold.s4', null, (sp, h) => `أخيرًا! ${vkN(sp.name)} يسجّل من جديد بعد ${_sp.R(h, sp.coldEnded, true)} عجاف، ويضيف ${_sp.P(h, sp.pts)} لرصيده.`),
      vt('sp.cold.s5', null, (sp, h) => `الصبر ما خاب: ${vkN(sp.name)} اللي غابت نقاطه ${_sp.R(h, sp.coldEnded, true)}، رجع هالجولة ${vkBi(h, sp.pts)}.`),
    ],
    joke: [
      vt('sp.cold.j1', null, () => 'أنديته رجعت من الإجازة الطويلة، وجابت معها الهدايا.'),
      vt('sp.cold.j2', null, () => 'الدرع المعنوي أخيرًا ارتاح من الدوام الإضافي.'),
      vt('sp.cold.j3', null, () => 'كانوا يحسبون أنديته معتزلة، وطلعت بس تاخذ نفس.'),
      vt('sp.cold.j4', null, () => 'اللي تعودوا على ممّاته، لازم يغيّرون توقعاتهم.'),
      vt('sp.cold.j5', null, () => 'الحمد لله على السلامة، الجدول اشتاق لنقاطه.'),
    ],
  },

  // 7. على أبواب القمة
  {
    id: 'nearTop', label: 'على أبواب القمة', mood: 'up',
    when: sp => sp.rank > 1 && sp.rank <= 5 && sp.above && sp.above.gap >= 1 && sp.above.gap <= 3, score: sp => 5 - sp.above.gap,
    title: [
      vt('sp.near.t1', null, sp => `${vkN(sp.name)} على أبواب القمة، والمطاردة صارت مهمّة!`),
      vt('sp.near.t2', null, sp => `نقاط قليلة وتنفتح الأبواب، و${vkN(sp.name)} يدق الباب!`),
      vt('sp.near.t3', null, sp => `${vkN(sp.name)} قرّب المسافة، والفارق صار على الحافة!`),
      vt('sp.near.t4', null, sp => `${vkN(sp.name)} على مرمى حجر، والصعود للحين ينتظر!`),
      vt('sp.near.t5', null, sp => `المسافة تقصر، و${vkN(sp.name)} ما يقصّر!`),
    ],
    story: [
      vt('sp.near.s1', null, (sp, h) => `${vkN(sp.name)} الحين في المركز ${sp.rank} برصيد ${_sp.P(h, sp.total)}، وبينه وبين ${vkG(sp.above.name)} ${_sp.P(h, sp.above.gap)} بس.`),
      vt('sp.near.s2', null, (sp, h) => `هالجولة جمع ${vkN(sp.name)} ${_sp.P(h, sp.pts)}، وصار على بُعد ${_sp.Pa(h, sp.above.gap)} من ${vkG(sp.above.name)} في المركز ${sp.rank - 1}.`),
      vt('sp.near.s3', s => Number.isInteger(s.nextRound), (sp, h) => `الفارق مع ${vkG(sp.above.name)} صار ${_sp.P(h, sp.above.gap)}، و${vkN(sp.name)} اللي في المركز ${sp.rank} عنده الجولة ${sp.nextRound} يقلب فيها المعادلة.`),
      vt('sp.near.s4', sp => sp.rank === 4, (sp, h) => `${vkN(sp.name)} رابع الجدول برصيد ${_sp.P(h, sp.total)}، والميدالية البرونزية على بُعد ${_sp.Pa(h, sp.above.gap)}.`),
      vt('sp.near.s5', null, (sp, h) => `${vkN(sp.name)} يلاحق ${vkA(sp.above.name)} عن قرب: الفارق ${_sp.P(h, sp.above.gap)}، وهالجولة جمع ${_sp.P(h, sp.pts)}.`),
      vt('sp.near.s6', null, (sp, h) => `جولة وحدة زينة تكفي ${vkA(sp.name)} يتخطى ${vkA(sp.above.name)}، فالفارق بينهم ${_sp.P(h, sp.above.gap)} لا غير.`),
    ],
    joke: [
      vt('sp.near.j1', null, sp => `${vkN(sp.above.name)} صار يتلفّت وراه كل شوي.`),
      vt('sp.near.j2', null, () => 'الفارق صغير لدرجة إنه يتقاس بالمسطرة.'),
      vt('sp.near.j3', null, sp => `${vkN(sp.above.name)} يسمع خطواته، والنوم صار خفيف.`),
      vt('sp.near.j4', null, sp => `لو الجدول فيه مرايا، كان ${vkN(sp.above.name)} شافه جاي.`),
      vt('sp.near.j5', sp => sp.above.gap <= 2, () => 'الفارق بينهم أقل من عدد أنديته.'),
    ],
  },

  // 8. ملك الأندية
  {
    id: 'clubKing', label: 'ملك الأندية', mood: 'up',
    when: sp => sp.clubs && sp.clubs.best && (sp.clubs.won === 3 || sp.clubs.best.gf >= 3), score: sp => sp.clubs.won === 3 ? 5 : 3,
    title: [
      vt('sp.club.t1', null, sp => `${vkN(sp.name)} اختار وفاز، وأنديته قدّمت الإنجاز!`),
      vt('sp.club.t2', null, sp => `${vkN(sp.name)} اختار بعين خبير، وأنديته جابت الكثير!`),
      vt('sp.club.t3', null, sp => `${sp.clubs.best.club} يهدي ${vkA(sp.name)} الفوز، وهذا اللي يسمّونه كنز!`),
      vt('sp.club.t4', null, sp => `${vkN(sp.name)}: اختيارات ذهبية، ونتائج مثالية!`),
      vt('sp.club.t5', sp => sp.clubs.won === 3, sp => `ثلاثية كاملة لأندية ${vkG(sp.name)}، والفرحة شاملة!`),
      vt('sp.club.t6', sp => sp.clubs.won < 3, sp => `${sp.clubs.best.club} يقول كلمته، و${vkN(sp.name)} يحصد غلّته!`),
    ],
    story: [
      vt('sp.club.s1', sp => sp.clubs.won === 3, (sp, h) => `أنديته الثلاثة فازت كلها هالجولة، و${vkN(sp.name)} حصد ${_sp.P(h, sp.pts)}، ورصيده الحين ${_sp.P(h, sp.total)}.`),
      vt('sp.club.s2', null, (sp, h) => `${sp.clubs.best.club} كان نجم الأسبوع عند ${vkG(sp.name)}: فاز على ${sp.clubs.best.opp} ${sp.clubs.best.gf}-${sp.clubs.best.ga}، وساهم في ${_sp.P(h, sp.pts)} جمعها هالجولة.`),
      vt('sp.club.s3', sp => sp.clubs.best.gf >= 3, (sp, h) => `اختيار ${sp.clubs.best.club} طلع في محله: فوز على ${sp.clubs.best.opp} ${vkBi(h, sp.clubs.best.gf, 'هدف')}، و${vkN(sp.name)} جمع ${_sp.P(h, sp.pts)} هالجولة.`),
      vt('sp.club.s4', null, (sp, h) => `أندية ${vkG(sp.name)} عرفت طريق الفوز في ${h.formatCount(sp.clubs.won, 'مباراة', {case: 'acc'})}، والنتيجة ${_sp.P(h, sp.pts)} ورصيد ${_sp.P(h, sp.total)}.`),
      vt('sp.club.s5', null, (sp, h) => `أنديته لعبت لصالحه هالجولة، و${vkN(sp.name)} جمع ${_sp.P(h, sp.pts)} وصعد رصيده إلى ${_sp.P(h, sp.total)}.`),
      vt('sp.club.s6', null, (sp, h) => `${vkN(sp.name)} يقطف ثمار اختياراته: ${sp.clubs.won === 3 ? 'ثلاثة انتصارات من ثلاث مباريات' : `فوز ${sp.clubs.best.club} على ${sp.clubs.best.opp}`}، و${_sp.P(h, sp.pts)} في رصيده هالجولة.`),
    ],
    joke: [
      vt('sp.club.j1', null, () => 'مستشار رياضي ولا مشارك فانتازي؟ الأيام تجاوب.'),
      vt('sp.club.j2', null, sp => `${sp.clubs.best.club} يستاهل باقة ورد من ${vkG(sp.name)} هالأسبوع.`),
      vt('sp.club.j3', sp => sp.clubs.won === 3, () => 'أنديته اتفقت على كلمة سر وحدة: فوز.'),
      vt('sp.club.j4', null, () => 'الباقين يسألونه عن أنديته الجاية، وهو ساكت ويبتسم.'),
      vt('sp.club.j5', null, () => 'لو فيه جائزة لأحسن نظرة، كانت من نصيبه هالجولة.'),
    ],
  },

  // 9. صراع ثنائي (مواجهة الموسم)
  {
    id: 'duel', label: 'صراع ثنائي', mood: 'up',
    when: sp => sp.duel && sp.duel.totalGap <= 3, score: () => 3,
    title: [
      vt('sp.duel.t1', null, sp => `${vkN(sp.name)} و${vkN(sp.duel.opp)}، نار تحت الرماد، وكل جولة لها ميعاد!`),
      vt('sp.duel.t2', null, sp => `${vkN(sp.name)} يرد على ${vkG(sp.duel.opp)}، والمواجهة تشتد!`),
      vt('sp.duel.t3', null, sp => `بين ${vkG(sp.name)} و${vkG(sp.duel.opp)} حكاية، ما لها نهاية!`),
      vt('sp.duel.t4', null, sp => `${vkN(sp.name)} و${vkN(sp.duel.opp)}، كل واحد للثاني مرصاد، والجولة ${sp.round} زادت العناد!`),
      vt('sp.duel.t5', sp => sp.duel.myPts > sp.duel.oppPts, sp => `${vkN(sp.name)} تفوّق على ${vkG(sp.duel.opp)} بالجولة، والمواجهة للحين مكمّلة!`),
    ],
    story: [
      vt('sp.duel.s1', null, (sp, h) => `${vkN(sp.name)} جمع ${_sp.P(h, sp.duel.myPts)} هالجولة مقابل ${_sp.P(h, sp.duel.oppPts)} ${vkLi(sp.duel.opp)}، والفارق بينهم في الرصيد ${sp.duel.totalGap === 0 ? 'ما له وجود، تعادل كامل' : _sp.P(h, sp.duel.totalGap)}.`),
      vt('sp.duel.s2', sp => sp.duel.myPts !== sp.duel.oppPts, (sp, h) => `المواجهة بين ${vkG(sp.name)} و${vkG(sp.duel.opp)} ما تهدأ: هالجولة ${sp.duel.myPts > sp.duel.oppPts ? `ابتسمت ${vkLi(sp.name)}` : `راحت ${vkLi(sp.duel.opp)}`}، والفارق في الرصيد ${h.formatCount(sp.duel.totalGap, 'نقطة', {zero: 'معدوم'})}.`),
      vt('sp.duel.s3', null, (sp, h) => `${vkN(sp.name)} في المركز ${sp.rank}، وغريمه ${vkN(sp.duel.opp)} قريب منه، وما بينهم إلا ${h.formatCount(sp.duel.totalGap, 'نقطة', {zero: 'التعادل'})}.`),
      vt('sp.duel.s4', sp => sp.duel.myPts === sp.duel.oppPts, (sp, h) => `${vkN(sp.name)} و${vkN(sp.duel.opp)} جمعوا نفس النقاط هالجولة، ${_sp.P(h, sp.duel.myPts)} لكل واحد، والصراع للحين معلّق.`),
      vt('sp.duel.s5', null, (sp, h) => `مواجهة الموسم بين ${vkG(sp.name)} و${vkG(sp.duel.opp)} تزيد حماس: ${_sp.P(h, sp.duel.myPts)} مقابل ${_sp.P(h, sp.duel.oppPts)} هالجولة.`),
      vt('sp.duel.s6', s => Number.isInteger(s.nextRound), (sp, h) => `الحسابات بين ${vkG(sp.name)} و${vkG(sp.duel.opp)} تتجدد في الجولة ${sp.nextRound}، وهالجولة كانت ${_sp.P(h, sp.duel.myPts)} مقابل ${_sp.P(h, sp.duel.oppPts)}.`),
    ],
    joke: [
      vt('sp.duel.j1', null, () => 'الجروب ينتظر الجولة الجاية بالفشار.'),
      vt('sp.duel.j2', null, sp => `${vkN(sp.duel.opp)} يتابع نقاطه قبل نقاط نفسه.`),
      vt('sp.duel.j3', null, () => 'لو المواجهة هذي مسلسل، كان وصل الموسم الثالث.'),
      vt('sp.duel.j4', null, () => 'كل واحد فيهم يفتح الجدول ويدوّر اسم الثاني أول.'),
      vt('sp.duel.j5', null, () => 'المواجهة هذي تبي لها حكم فيديو.'),
    ],
  },

  // 10. الأوسمة والأرقام
  {
    id: 'badge', label: 'وسام جديد', mood: 'up',
    when: sp => sp.badge && sp.badge.title, score: () => 4,
    title: [
      vt('sp.badge.t1', null, sp => `${vkN(sp.name)} يتوّج بوسام، والإنجاز له كلام!`),
      vt('sp.badge.t2', null, sp => `تعب ${vkG(sp.name)} ما راح هباء، و«${sp.badge.title}» صار له جزاء!`),
      vt('sp.badge.t3', null, sp => `${vkN(sp.name)} يرفع وسامه، ويكمل مشواره قدّامه!`),
      vt('sp.badge.t4', null, sp => `وسام جديد في الخزانة، و${vkN(sp.name)} يثبت المكانة!`),
      vt('sp.badge.t5', null, sp => `${vkN(sp.name)} يحصد الألقاب، ويفتح للمجد باب!`),
    ],
    story: [
      vt('sp.badge.s1', null, (sp, h) => `هالجولة حصل ${vkN(sp.name)} على وسام «${sp.badge.title}»، بعد ${_sp.P(h, sp.pts)} في الجولة ${sp.round} ورصيد وصل ${_sp.P(h, sp.total)}.`),
      vt('sp.badge.s2', null, (sp, h) => `الوسام الجديد في سجل ${vkG(sp.name)}: «${sp.badge.title}»، وما جا من فراغ، فهو في المركز ${sp.rank} برصيد ${_sp.P(h, sp.total)}.`),
      vt('sp.badge.s3', null, (sp, h) => `«${sp.badge.title}» صار باسم ${vkG(sp.name)} رسميًا، و${_sp.P(h, sp.pts)} هالجولة كانت جزء من الحكاية.`),
      vt('sp.badge.s4', null, sp => `${vkN(sp.name)} يضيف «${sp.badge.title}» لإنجازاته، وهو الحين في المركز ${sp.rank}.`),
      vt('sp.badge.s5', null, (sp, h) => `الأرقام كتبت اسم ${vkG(sp.name)} في قائمة الأوسمة: «${sp.badge.title}»، ورصيده ${_sp.P(h, sp.total)}.`),
    ],
    joke: [
      vt('sp.badge.j1', null, () => 'خزانة الأوسمة عنده تبي رف جديد.'),
      vt('sp.badge.j2', null, () => 'الوسام وصله قبل لا يطلبه.'),
      vt('sp.badge.j3', null, () => 'الباقين يسألون: وين ينباع هالوسام؟ والجواب: في الجدول بس.'),
      vt('sp.badge.j4', null, () => 'أكيد صورة الوسام صارت خلفية جواله.'),
      vt('sp.badge.j5', null, () => 'الوسام هذا مو هدية، هذا راتب تعب.'),
    ],
  },

  // 11. الصدارة
  {
    id: 'leader', label: 'الصدارة', mood: 'up',
    when: sp => sp.isLeader && sp.second, score: sp => sp.leaderChanged ? 6 : 2,
    title: [
      vt('sp.lead.t1', sp => sp.leaderChanged, sp => `${vkN(sp.name)} صعد للقمة، وخطف الصدارة بهمّة!`),
      vt('sp.lead.t2', sp => !sp.leaderChanged, sp => `${vkN(sp.name)} ثابت فوق، والملاحقين في شوق!`),
      vt('sp.lead.t3', null, sp => `${vkN(sp.name)} في الصدارة، وكل جولة له إشارة!`),
      vt('sp.lead.t4', sp => !sp.leaderChanged, sp => `الصدارة لها حارس، و${vkN(sp.name)} أحسن فارس!`),
      vt('sp.lead.t5', null, sp => `المتصدر ${vkN(sp.name)} يكمل المشوار، وعينه على الانتصار!`),
      vt('sp.lead.t6', sp => sp.leaderChanged, sp => `القمة تغيّر صاحبها، و${vkN(sp.name)} أخذ نصيبها!`),
      vt('sp.lead.t7', null, sp => `العرش له صاحب، و${vkN(sp.name)} للصدارة طالب وغالب!`),
    ],
    story: [
      vt('sp.lead.s1', sp => sp.leaderChanged, (sp, h) => `${vkN(sp.name)} صار المتصدر الجديد بعد الجولة ${sp.round}، برصيد ${_sp.P(h, sp.total)}${_sp.leadGap(h, sp)}.`),
      vt('sp.lead.s2', sp => !sp.leaderChanged, (sp, h) => `${vkN(sp.name)} حافظ على الصدارة بعد الجولة ${sp.round}، برصيد ${_sp.P(h, sp.total)}${_sp.leadGap(h, sp)}.`),
      vt('sp.lead.s3', null, (sp, h) => `في قمة الجدول ${vkN(sp.name)} برصيد ${_sp.P(h, sp.total)}، جمع منها ${_sp.P(h, sp.pts)} هالجولة${_sp.leadGap(h, sp)}.`),
      vt('sp.lead.s4', null, (sp, h) => `${vkN(sp.name)} يتصدّر جدول الترتيب برصيد ${_sp.P(h, sp.total)}${_sp.leadGap(h, sp)}، وهالجولة أضاف ${_sp.P(h, sp.pts)}.`),
      vt('sp.lead.s5', null, (sp, h) => `اللي يبي الصدارة لازم يمر من عند ${vkG(sp.name)}: رصيد ${_sp.P(h, sp.total)}${_sp.leadGap(h, sp)}.`),
    ],
    joke: [
      vt('sp.lead.j1', null, () => 'الملاحقين صاروا يحفظون ظهره أكثر من وجهه.'),
      vt('sp.lead.j2', sp => sp.second.gap >= 3, () => 'الفارق عنده مريح لدرجة إنه يقدر ياخذ قيلولة.'),
      vt('sp.lead.j3', sp => sp.second.gap <= 2, () => 'الكرسي في القمة يهتز، والملاحق وراه بخطوة.'),
      vt('sp.lead.j4', null, () => 'الجدول كله يتكلم عنه، وهو ساكت فوق.'),
      vt('sp.lead.j5', sp => !sp.leaderChanged, () => 'الصدارة عنده صارت عنوان سكن.'),
      vt('sp.lead.j6', sp => sp.leaderChanged, () => 'أول ليلة في القمة، يا ترى يقدر ينام؟'),
      vt('sp.lead.j7', null, () => 'كل المشاركين يفتحون الجدول من تحت، إلا هو يفتحه من فوق.'),
    ],
  },

  // 12. أبطال التوقع
  {
    id: 'predictor', label: 'أبطال التوقع', mood: 'up',
    when: sp => sp.predictor && sp.predictor.hits >= 2, score: () => 2,
    title: [
      vt('sp.pred.t1', null, sp => `${vkN(sp.name)} يشوف قبل الكل، وتوقعه ما يزل!`),
      vt('sp.pred.t2', null, sp => `توقّع وصاب، و${vkN(sp.name)} فتح الباب!`),
      vt('sp.pred.t3', null, sp => `عيون ثاقبة، وتوقعات صائبة: ${vkN(sp.name)} يكرر الإصابة!`),
      vt('sp.pred.t4', null, sp => `${vkN(sp.name)} خبير التوقعات، والنتيجة إثبات!`),
      vt('sp.pred.t5', null, sp => `${vkN(sp.name)} توقّع البطل بدقة، والكل يبي منه الورقة!`),
    ],
    story: [
      vt('sp.pred.s1', null, (sp, h) => `${vkN(sp.name)} أصاب في توقع بطل الجولة في ${_sp.R(h, sp.predictor.hits, true)} هالموسم، وهالجولة كان توقعه في محله.`),
      vt('sp.pred.s2', null, (sp, h) => `توقعات ${vkG(sp.name)} لبطل الجولة صابت ${_sp.R(h, sp.predictor.hits, true)}، ولو فيه جائزة للنظرة كان أخذها.`),
      vt('sp.pred.s3', null, (sp, h) => `مين يتوقع بطل الجولة صح أكثر؟ ${vkN(sp.name)} بإصابات في ${_sp.R(h, sp.predictor.hits, true)}، وهالجولة زادت واحدة.`),
      vt('sp.pred.s4', null, (sp, h) => `${vkN(sp.name)} ما يكتفي بنقاطه، حتى التوقعات له فيها نصيب: ${_sp.R(h, sp.predictor.hits)} صاب فيها بطل الجولة.`),
      vt('sp.pred.s5', null, (sp, h) => `في سباق التوقعات، ${vkN(sp.name)} متقدّم بإصابة بطل الجولة في ${_sp.R(h, sp.predictor.hits, true)}.`),
    ],
    joke: [
      vt('sp.pred.j1', null, () => 'نفكر نستشيره قبل ما نختار أنديتنا.'),
      vt('sp.pred.j2', null, () => 'عنده كرة بلورية، بس يقول إنها خبرة.'),
      vt('sp.pred.j3', null, () => 'الباقين صاروا ينتظرون توقعه عشان ينسخونه.'),
      vt('sp.pred.j4', null, () => 'توقعاته صارت أدق من النشرة الجوية.'),
      vt('sp.pred.j5', null, () => 'لو يتوقع لنفسه بنفس الدقة، كان الجدول غير.'),
    ],
  },

  // 13. ممة بشرف (بلطف وتشجيع، لا شماتة)
  {
    id: 'mummaHonor', label: 'ممة بشرف', mood: 'down',
    when: sp => sp.played && sp.pts === 0, score: () => 1,
    title: [
      vt('sp.mumma.t1', null, sp => `${vkN(sp.name)} في جولة صعبة، والعودة له قريبة!`),
      vt('sp.mumma.t2', null, sp => `غابت النقاط عن ${vkG(sp.name)}، والهمّة ما غابت!`),
      vt('sp.mumma.t3', null, sp => `جولة ما تنحسب، و${vkN(sp.name)} للرجعة يحتسب!`),
      vt('sp.mumma.t4', null, sp => `اليوم ممة، وبكرة همّة: ${vkN(sp.name)} ما ينهزم!`),
      vt('sp.mumma.t5', null, sp => `${vkN(sp.name)} ياخذ نفس، وبكرة يرجع بحماس!`),
    ],
    story: [
      vt('sp.mumma.s1', null, (sp, h) => `الجولة ${sp.round} ما كانت ${vkLi(sp.name)}، طلع منها بممة، لكنه للحين في المركز ${sp.rank} برصيد ${_sp.P(h, sp.total)}، والموسم طويل.`),
      vt('sp.mumma.s2', null, (sp, h) => `أنديته ما وفّقت هالجولة، و${vkN(sp.name)} اكتفى بممة، بس رصيده ${_sp.P(h, sp.total)} يقول إن المشوار ما خلص.`),
      vt('sp.mumma.s3', null, (sp, h) => `حتى أقوى المشاركين يمرّون بجولة بيضاء، وهذا اللي صار مع ${vkG(sp.name)} في الجولة ${sp.round}، ورصيده باقي ${_sp.P(h, sp.total)}.`),
      vt('sp.mumma.s4', sp => sp.prevPts !== null && sp.prevPts >= 3, (sp, h) => `${vkN(sp.name)} ما سجّل هالجولة، لكن قبلها جمع ${_sp.P(h, sp.prevPts)} في الجولة ${sp.round - 1}، يعني المستوى موجود والرجعة قريبة.`),
      vt('sp.mumma.s5', null, sp => `ممة الجولة ${sp.round} عند ${vkG(sp.name)}، وفي الجدول هو للحين في المركز ${sp.rank}، وكل جولة فرصة جديدة.`),
    ],
    joke: [
      vt('sp.mumma.j1', null, () => 'أنديته أخذت إجازة جماعية بدون ما تستأذن.'),
      vt('sp.mumma.j2', null, () => 'الدرع المعنوي شغّال، وما عليه، حتى النجوم يغيبون أحيانًا.'),
      vt('sp.mumma.j3', null, sp => `الجولة ${sp.round} نعتبرها ما صارت، ونكمل.`),
      vt('sp.mumma.j4', null, () => 'الممة هذي ضيف ثقيل، بس ما راح يطوّل.'),
      vt('sp.mumma.j5', null, () => 'حتى الآلة الحاسبة تعاطفت معه هالجولة.'),
    ],
  },
];

// الرقم الداعم (مشترك بين الزوايا، كل واحد بشرطه)
const SPOTLIGHT_FACTS = [
  vt('sp.fact.1', sp => sp.pts > 0, (sp, h) => `بالأرقام: المركز ${sp.rank}، والرصيد ${_sp.P(h, sp.total)}، ونقاط الجولة ${_sp.P(h, sp.pts)}.`),
  vt('sp.fact.2', sp => sp.above && sp.above.gap > 0, (sp, h) => `ويفصله عن ${vkG(sp.above.name)} ${_sp.P(h, sp.above.gap)}.`),
  vt('sp.fact.3', sp => sp.below && sp.below.gap > 0, (sp, h) => `ويتقدّم على ${vkG(sp.below.name)} ${vkBi(h, sp.below.gap)}.`),
  vt('sp.fact.4', sp => sp.heroCount >= 2, (sp, h) => `وتوّج بلقب بطل الجولة في ${_sp.R(h, sp.heroCount, true)} هالموسم.`),
  vt('sp.fact.4b', sp => sp.heroCount === 1 && sp.isHero, () => 'وهذا أول لقب بطل جولة له هالموسم.'),
  vt('sp.fact.4c', sp => sp.heroCount === 1 && !sp.isHero, () => 'وسبق له لقب بطل الجولة مرة هالموسم.'),
  vt('sp.fact.5', sp => sp.seasonMumma >= 1, (sp, h) => `وعنده هالموسم ${h.formatCount(sp.seasonMumma, 'ممة')}.`),
  vt('sp.fact.6', sp => sp.seasonMumma === 0 && sp.last5 && sp.last5.length >= 5, () => 'وللحين ما عرف الممة هالموسم.'),
  vt('sp.fact.7', sp => sp.bestPts >= 1, (sp, h) => `وأعلى نقاط له في جولة وحدة هالموسم ${_sp.P(h, sp.bestPts)}.`),
  vt('sp.fact.8', sp => sp.move !== 0, (sp, h) => sp.move > 0 ? `وصعد ${_sp.M(h, sp.move)} هالجولة.` : `وتراجع ${_sp.M(h, -sp.move)} هالجولة.`),
];

// كل قالب يحمل شرط زاويته (يُرفض لوحده لو الزاوية ما تنطبق)، فيصير القالب مستقلًا وآمنًا لو استُدعي منفردًا
SPOTLIGHT_ANGLES.forEach(a => ['title', 'story', 'joke'].forEach(k => a[k].forEach(t => {
  const own = t.when;
  t.when = (sp, h) => !!a.when(sp) && (!own || own(sp, h));
})));

// سياق الموسم (مقطع النسخة الطويلة، قرار المنظّم 14 نوفمبر: الطول يتنوّع بين الجولات)
const SPOTLIGHT_SEASON = [
  vt('sp.season.1', sp => sp.seasonTotal > sp.round, (sp, h) => `الموسم وصل للجولة ${sp.round} من ${sp.seasonTotal}، والباقي ${_sp.R(h, sp.seasonTotal - sp.round)}، يعني الحسبة للحين مفتوحة.`),
  vt('sp.season.2', sp => !sp.isLeader && sp.leaderGap > 0 && sp.leaderGap <= 6, (sp, h) => `وبينه وبين المتصدر ${vkN(sp.leaderName)} ${_sp.P(h, sp.leaderGap)} بس، يعني جولتين زينتين تقلب الحسبة.`),
  vt('sp.season.3', sp => !sp.isLeader && sp.leaderGap > 6, (sp, h) => `والمسافة عن المتصدر ${vkN(sp.leaderName)} وصلت ${_sp.P(h, sp.leaderGap)}، والمطاردة تبي نفس طويل وجولات ثابتة.`),
  vt('sp.season.4', sp => sp.rank3 && sp.rank3 > sp.rank && sp.rank3 !== sp.prevRank, (sp, h) => `قبل ${_sp.R(h, 3, true)} كان في المركز ${sp.rank3}، والحين في المركز ${sp.rank}، والخط البياني عنده يصعد.`),
  vt('sp.season.5', sp => sp.rank3 && sp.rank3 < sp.rank && sp.rank3 !== sp.prevRank, (sp, h) => `قبل ${_sp.R(h, 3, true)} كان في المركز ${sp.rank3}، والحين في المركز ${sp.rank}، والمطلوب يرجع للخط الصاعد.`),
  vt('sp.season.6', sp => sp.seasonMumma === 0 && sp.roundsPlayed >= 5, () => 'وطول الموسم ما عرف الممة، وهذا لحاله إنجاز في دوري بهالقوة.'),
  vt('sp.season.7', sp => sp.seasonMumma >= 2, (sp, h) => `وعدّاد الممّات عنده هالموسم وصل ${h.formatCount(sp.seasonMumma, 'ممة', {case: 'acc'})}، والجولات الجاية فرصة يوقّف العدّاد.`),
  vt('sp.season.8', sp => sp.bestPts >= 8, (sp, h) => `وأعلى رقم سجّله في جولة هالموسم ${_sp.P(h, sp.bestPts)}، يعني عنده القدرة على الجولات الكبيرة.`),
  vt('sp.season.9', sp => sp.rank >= 2 && sp.rank <= 3, sp => `ومكانه الحين على منصة الميداليات، والمركز ${sp.rank} ما يجيه إلا اللي يستاهله.`),
  vt('sp.season.10', sp => sp.playersCount && sp.rank > sp.playersCount - 3, () => 'ومكانه في ذيل الجدول ما يعكس اللي يقدر عليه، والموسم للحين طويل.'),
  vt('sp.season.12', sp => sp.heroCount === 0 && sp.roundsPlayed >= 5, () => 'وللحين ما توّج بلقب بطل الجولة هالموسم، والجولات الجاية فرصة يكسر هالحاجز.'),
  vt('sp.season.13', sp => sp.roundsPlayed >= 3, (sp, h) => `ولعب للحين ${_sp.R(h, sp.roundsPlayed)} في الموسم، وكل جولة تضيف لحكايته فصل جديد.`),
  vt('sp.season.11', sp => sp.last5 && sp.last5.length >= 3, (sp, h) => `وفي آخر ${_sp.R(h, sp.last5.length)} جمع ${_sp.P(h, sp.last5.reduce((a, b) => a + b, 0))}، وهذا مقياس مستواه الحقيقي هالفترة.`),
];

// طول التقرير (R-21 المحدّث): الجولات الزوجية طويلة لو فيه سياق موسم كافٍ (مقطعان صالحان)، وغير كذا قصيرة.
// حتمي من رقم الجولة وغنى البيانات، فيتبادل الطولان بين الجولات. ترتيب الطويل:
//   العنوان ← القصة + 3 أرقام داعمة ← سياق الموسم (حتى 3) ← التحفيز ← نكتتان مختلفتان ← الخاتمة (100–180 كلمة)
// قاعدة للمحرك: الرقم الداعم sp.fact.1 (المركز والرصيد) يُترك لو القصة المختارة ذكرت المركز والرصيد نفسهم.
// والقصير: العنوان ← القصة + 3 أرقام ← التحفيز ← نكتة ← الخاتمة (~70–90 كلمة)
function spotlightLength(sp, h){
  const rich = voiceEligible(SPOTLIGHT_SEASON, sp, h).length >= 2;
  return sp.round % 2 === 0 && rich ? 'long' : 'short';
}

// قوالب ما تجتمع في تقرير واحد لأنها تقول نفس المعلومة (المحرك يحذف الثاني لو اختير الأول)
const SPOTLIGHT_CONFLICTS = {
  'sp.season.6': ['sp.fact.6'],
  'sp.season.7': ['sp.fact.5'],
  'sp.season.8': ['sp.fact.7'],
  'sp.season.9': ['sp.motiv.up2'],
  'sp.motiv.up7': ['sp.fact.3'],
  'sp.motiv.up1': ['sp.fact.2'],
  'sp.fact.1': ['sp.rocket.s1', 'sp.rocket.s4', 'sp.lead.s3'],
};

// التحفيز (موجز R-21 §1)، حسب مزاج الزاوية، وكل جملة بشرطها من البيانات
const SPOTLIGHT_MOTIVATION = {
  up: [
    vt('sp.motiv.up1', sp => sp.above && sp.above.gap > 0 && sp.rank > 1, (sp, h) => `والمطلوب الحين جولة زينة ثانية، فالمركز ${sp.rank - 1} ما يبعد عنه إلا ${_sp.P(h, sp.above.gap)}.`),
    vt('sp.motiv.up2', sp => sp.rank >= 2 && sp.rank <= 3, () => 'والميدالية في يده، والشطارة يحافظ عليها لين آخر الموسم.'),
    vt('sp.motiv.up3', null, () => 'والمستوى هذا لو استمر، الجدول راح يتغيّر كثير في الجولات الجاية.'),
    vt('sp.motiv.up4', s => Number.isInteger(s.nextRound), sp => `والجولة ${sp.nextRound} فرصته يثبت فيها إن اللي صار مو صدفة.`),
    vt('sp.motiv.up5', null, () => 'وكل نقطة يجمعها الحين تقرّبه خطوة من حلمه في الجدول.'),
    vt('sp.motiv.up6', sp => sp.isLeader, () => 'والصدارة تبي محافظة أكثر من الوصول لها، والجولات الجاية امتحان.'),
    vt('sp.motiv.up7', sp => sp.below && sp.below.gap > 0 && sp.below.gap <= 2, (sp, h) => `بس ينتبه، ${vkN(sp.below.name)} وراه بفارق ${_sp.Pa(h, sp.below.gap)} بس، والغفلة ممنوعة.`),
  ],
  down: [
    vt('sp.motiv.down1', null, () => 'والمهم الحين يرجع بسرعة، لأن الجدول ما ينتظر أحد.'),
    vt('sp.motiv.down2', s => Number.isInteger(s.nextRound), sp => `والجولة ${sp.nextRound} فرصة يمسح فيها هالجولة من الذاكرة.`),
    vt('sp.motiv.down3', sp => sp.playersCount && sp.rank <= Math.floor(sp.playersCount / 2), () => 'ومكانه في النصف الأول من الجدول يقول إن المستوى موجود.'),
    vt('sp.motiv.down4', null, () => 'وكل المشاركين مرّوا بجولة مثل هذي، والفرق دايمًا في الرجعة.'),
    vt('sp.motiv.down5', sp => sp.prevPts !== null && sp.prevPts >= 3, () => 'وقبلها بجولة كان في أحسن حالاته، يعني الرجعة مسألة وقت.'),
  ],
};

// الخاتمة (سجع)، حسب مزاج الزاوية
const SPOTLIGHT_CLOSING = {
  up: [
    vt('sp.close.up1', s => Number.isInteger(s.nextRound), sp => `يا ${vkA(sp.name)}، حافظ على النسق، والجولة ${sp.nextRound} فيها السبق!`),
    vt('sp.close.up2', null, sp => `الطريق للحين طويل، و${vkN(sp.name)} على الدرب الجميل!`),
    vt('sp.close.up3', s => Number.isInteger(s.nextRound), sp => `يا ${vkA(sp.name)}، خلّك على الموعد، والجولة ${sp.nextRound} تشهد!`),
    vt('sp.close.up4', null, sp => `الجدول يتكلم، و${vkN(sp.name)} يتقدّم!`),
    vt('sp.close.up5', null, sp => `اليوم إنجاز، وبكرة امتياز، يا ${vkA(sp.name)} خلّك جاهز!`),
    vt('sp.close.up6', null, sp => `المشوار للحين في أوله، و${vkN(sp.name)} يعرف وين يوصله!`),
  ],
  down: [
    vt('sp.close.down1', null, sp => `يا ${vkA(sp.name)}، الموسم طويل، والرجعة لها سبيل!`),
    vt('sp.close.down2', s => Number.isInteger(s.nextRound), sp => `اليوم ممة، وبكرة همّة، والجولة ${sp.nextRound} لها كلمة!`),
    vt('sp.close.down3', null, sp => `كل جواد له كبوة، و${vkN(sp.name)} راجع بقوة!`),
    vt('sp.close.down4', s => Number.isInteger(s.nextRound), sp => `شدّ الهمّة يا ${vkA(sp.name)}، الجولة ${sp.nextRound} مهمّة!`),
    vt('sp.close.down5', null, () => 'الجدول ما يقفل على أحد، والتعويض يبدأ من الغد!'),
  ],
};

if(typeof module !== 'undefined') module.exports = {SPOTLIGHT_ANGLES, SPOTLIGHT_FACTS, SPOTLIGHT_SEASON, SPOTLIGHT_MOTIVATION, SPOTLIGHT_CLOSING, SPOTLIGHT_CONFLICTS, spotlightLength};
