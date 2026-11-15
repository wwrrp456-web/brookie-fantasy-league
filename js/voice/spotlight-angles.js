/* قوالب تقرير «منافس الجولة» (R-21، 002-T010، Opus). **الطبقة الإعلامية الرياضية: فصحى مبسّطة مشوّقة** (R-27):
 * عنوان مسجوع، وقصة، ورقم داعم، وتحفيز، ونكتة لطيفة مبنية على رقم، وخاتمة مسجوعة، وبلا أي كلمة لهجية.
 * التماسك (R-26): كل جملة ترتبط بما قبلها، ولا فاعل مفاجئ، ولا جهات متخيّلة. والأسماء كما هي (R-25).
 * الموجز: specs/002-language-voice/spotlight-report-brief.md · القواعد: style-guide.md (§1.1 §8 §9 §9.1 §9.2).
 * يعتمد على voice-kit.js وar-format.js.
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
 * كل زاوية: {id, label, mood: 'up'|'down', score(sp), when(sp), title[], story[], joke[], jokeLong[]}، وكل قائمة ≥ 5 قوالب.
 *   joke: نكتة من جملة واحدة (النسخة القصيرة).
 *   jokeLong: **زوج نكتتين مكتوبتين معًا** (الثانية تكمل الأولى)، للنسخة الطويلة بدل اختيار نكتة ثانية مستقلة (R-26).
 * وبعدها مجموعات مشتركة: SPOTLIGHT_FACTS (الرقم الداعم)، وSPOTLIGHT_SEASON (سياق الموسم، للطويلة)،
 * وSPOTLIGHT_MOTIVATION وSPOTLIGHT_CLOSING حسب mood، وSPOTLIGHT_CONFLICTS (قوالب ما تجتمع).
 * ترتيب التقرير: العنوان ← القصة + الأرقام الداعمة ← (سياق الموسم) ← التحفيز ← النكتة (أو زوج النكتتين) ← الخاتمة.
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
  prevDesc: sp => sp.prevPts === 0 ? 'خرج بممة' : 'اكتفى بنقطة واحدة',
  leadGap: (h, sp) => !sp.second ? '' : sp.second.gap === 0 ? `، بالتساوي مع ${vkN(sp.second.name)}` : `، بفارق ${_sp.Pa(h, sp.second.gap)} عن ${vkN(sp.second.name)}`,
};

const SPOTLIGHT_ANGLES = [
  // 1. الصاروخ
  {
    id: 'rocket', label: 'الصاروخ', mood: 'up',
    when: sp => sp.move >= 3, score: sp => 3 + sp.move,
    title: [
      vt('sp.rocket.t1', null, sp => `${vkN(sp.name)} يحلّق في الجدول، والقمة أقرب من أي وقت مضى!`),
      vt('sp.rocket.t2', null, sp => `صاروخ الجولة ${sp.round}: ${vkN(sp.name)} يشقّ طريقه إلى الأعلى، ولا يعرف التوقف!`),
      vt('sp.rocket.t3', null, sp => `${vkN(sp.name)} صعد ولم يتردّد، والجدول أمامه تمدّد!`),
      vt('sp.rocket.t4', null, sp => `من المركز ${sp.prevRank} إلى ${sp.rank}: ${vkN(sp.name)} على الطريق السريع، والكل يسأل عن السر البديع!`),
      vt('sp.rocket.t5', null, sp => `${vkN(sp.name)} يصعد السلّم على عجل، ويبلغ المركز ${sp.rank} بلا وجل!`),
    ],
    story: [
      vt('sp.rocket.s1', null, (sp, h) => `كانت الجولة ${sp.round} من نصيب ${vkN(sp.name)} بامتياز: جمع ${_sp.P(h, sp.pts)} وصعد ${_sp.M(h, sp.move)} دفعة واحدة، من المركز ${sp.prevRank} إلى المركز ${sp.rank}، ورصيده الآن ${_sp.P(h, sp.total)}.`),
      vt('sp.rocket.s2', null, (sp, h) => `${_sp.P(h, sp.pts)} في جولة واحدة كانت كافية ليقفز ${vkN(sp.name)} ${_sp.M(h, sp.move)} في جدول الترتيب، ويستقر في المركز ${sp.rank} برصيد ${_sp.P(h, sp.total)}.`),
      vt('sp.rocket.s3', null, (sp, h) => `لم يتوقعها أحد: بدأ ${vkN(sp.name)} الجولة في المركز ${sp.prevRank}، وأنهاها في المركز ${sp.rank} بعدما جمع ${_sp.P(h, sp.pts)}.`),
      vt('sp.rocket.s4', null, (sp, h) => `حصد ${vkN(sp.name)} ${_sp.P(h, sp.pts)} في هذه الجولة، وترجمها إلى صعود ${_sp.M(h, sp.move)} في الجدول، فصار رصيده ${_sp.P(h, sp.total)} في المركز ${sp.rank}.`),
      vt('sp.rocket.s5', null, (sp, h) => `من ${sp.prevRank} إلى ${sp.rank}، هذه حكاية ${vkN(sp.name)} مع الجولة ${sp.round}: ${_sp.P(h, sp.pts)} نظيفة، وجدول يفسح له الطريق.`),
    ],
    joke: [
      vt('sp.rocket.j1', null, (sp, h) => `${h.formatCount(sp.move, 'مركز')} في جولة واحدة، وكأن الجدول صار سلّمًا يصعده وحده.`),
      vt('sp.rocket.j2', sp => sp.move >= 5, (sp, h) => `${h.formatCount(sp.move, 'مركز')} في جولة؟ هذا ليس صعودًا، بل إقلاع.`),
      vt('sp.rocket.j3', null, (sp, h) => `تخطّى ${h.formatCount(sp.move, 'مشارك', {case: 'acc'})} في ليلة واحدة، وربما يحتاج إلى حزام أمان قبل الجولة المقبلة.`),
      vt('sp.rocket.j4', null, sp => `بهذه السرعة، يحتاج ${vkN(sp.name)} إلى إشارة مرور قبل المركز ${Math.max(1, sp.rank - 1)}.`),
      vt('sp.rocket.j5', null, sp => `صعد من المركز ${sp.prevRank} كأنه في مصعد كهربائي لا يتوقف عند الطوابق.`),
    ],
    jokeLong: [
      vt('sp.rocket.l1', null, (sp, h) => `${h.formatCount(sp.move, 'مركز')} في جولة واحدة، وكأن الجدول صار سلّمًا يصعده وحده. ولو حافظ على هذا الإيقاع، فلن يكفيه السلّم، وسيحتاج إلى مصعد.`),
      vt('sp.rocket.l2', null, sp => `بدأ الجولة في المركز ${sp.prevRank} وأنهاها في المركز ${sp.rank}. ومن تخطّاهم ما زالوا يتفحّصون الجدول، ظنًّا منهم أنه خطأ مطبعي.`),
      vt('sp.rocket.l3', sp => sp.move >= 5, (sp, h) => `${h.formatCount(sp.move, 'مركز')} دفعة واحدة؟ هذا ليس صعودًا بل إقلاع، والجدول وحده سجّل الرحلة كاملة، من المركز ${sp.prevRank} إلى المركز ${sp.rank}.`),
      vt('sp.rocket.l4', null, sp => `صعد من المركز ${sp.prevRank} كأنه في مصعد لا يتوقف عند الطوابق. والسؤال الآن: في أي طابق سيطلب التوقف؟`),
      vt('sp.rocket.l5', null, (sp, h) => `جمع ${_sp.P(h, sp.pts)} فصعد ${_sp.M(h, sp.move)}. وبهذه المعادلة، كل نقطة إضافية تساوي خطوة نحو القمة.`),
    ],
  },

  // 2. العائد من بعيد
  {
    id: 'comeback', label: 'العائد من بعيد', mood: 'up',
    when: sp => sp.prevPts !== null && sp.prevPts <= 1 && sp.pts >= 6, score: () => 5,
    title: [
      vt('sp.comeback.t1', null, sp => `${vkN(sp.name)} يعود من بعيد، ويكتب الفصل الجديد!`),
      vt('sp.comeback.t2', null, sp => `بعد الكبوة جاءت الصحوة: ${vkN(sp.name)} يعود بقوة!`),
      vt('sp.comeback.t3', null, sp => `${vkN(sp.name)} ينفض الغبار، ويعود إلى المشوار!`),
      vt('sp.comeback.t4', null, sp => `${vkN(sp.name)} يقلب الموازين، ويردّ على المتشائمين!`),
      vt('sp.comeback.t5', null, sp => `${vkN(sp.name)} يردّ بالأفعال، والجولة ${sp.round} خير مثال!`),
    ],
    story: [
      vt('sp.comeback.s1', null, (sp, h) => `لم تكن الجولة الماضية جولته، فقد ${_sp.prevDesc(sp)}، لكن ${vkN(sp.name)} عاد في هذه الجولة ${vkBi(h, sp.pts)} ورفع رصيده إلى ${_sp.P(h, sp.total)}.`),
      vt('sp.comeback.s2', null, (sp, h) => `في الجولة ${sp.round - 1} ${_sp.prevDesc(sp)} ${vkN(sp.name)}، وفي الجولة ${sp.round} جمع ${_sp.P(h, sp.pts)}، وهذا هو الفرق الذي يصنعه الإصرار، فهو الآن في المركز ${sp.rank}.`),
      vt('sp.comeback.s3', null, (sp, h) => `توقّع كثيرون أن يتعثّر ${vkN(sp.name)} بعد جولته الماضية، لكنه جمع ${_sp.P(h, sp.pts)} وقال كلمته من المركز ${sp.rank}.`),
      vt('sp.comeback.s4', null, (sp, h) => `حوّل ${vkN(sp.name)} خيبة الجولة ${sp.round - 1} إلى جولة ${vkBi(h, sp.pts)}، فصار رصيده ${_sp.P(h, sp.total)}.`),
      vt('sp.comeback.s5', null, (sp, h) => `العودة دائمًا أجمل: ${vkN(sp.name)} الذي ${_sp.prevDesc(sp)} في الجولة الماضية، جمع هذه المرة ${_sp.P(h, sp.pts)}.`),
    ],
    joke: [
      vt('sp.comeback.j1', null, (sp, h) => `من ${sp.prevPts === 0 ? 'ممة' : 'نقطة واحدة'} إلى ${_sp.P(h, sp.pts)}، يبدو أن الجولة الماضية كانت استراحة محارب.`),
      vt('sp.comeback.j2', null, (sp, h) => `${_sp.P(h, sp.pts)} بعد جولة باهتة، وكأن أنديته اجتمعت لتعتذر له رسميًا.`),
      vt('sp.comeback.j3', null, () => 'كانت الجولة الماضية تمرين إحماء، وهذه الجولة بدأت المباراة الحقيقية.'),
      vt('sp.comeback.j4', null, (sp, h) => `من واساه الأسبوع الماضي على ${sp.prevPts === 0 ? 'الممة' : 'النقطة الوحيدة'}، يطلب منه النصيحة بعد ${_sp.P(h, sp.pts)}.`),
      vt('sp.comeback.j5', null, (sp, h) => `المعنويات التي صمدت بعد الجولة الماضية، كوفئت هذه المرة ${vkBi(h, sp.pts)}.`),
    ],
    jokeLong: [
      vt('sp.comeback.l1', null, (sp, h) => `من ${sp.prevPts === 0 ? 'ممة' : 'نقطة واحدة'} إلى ${_sp.P(h, sp.pts)}، يبدو أن الجولة الماضية كانت استراحة محارب. وقد عاد المحارب هذه المرة بعدّة كاملة.`),
      vt('sp.comeback.l2', null, () => 'كانت الجولة الماضية تمرين إحماء. أما هذه الجولة، فقد بدأت المباراة الحقيقية.'),
      vt('sp.comeback.l3', null, (sp, h) => `${_sp.P(h, sp.pts)} بعد جولة باهتة، وكأن أنديته اجتمعت لتعتذر له. وقبل الاعتذار، فهو يطالب بتعويض في الجولة المقبلة.`),
      vt('sp.comeback.l4', null, (sp, h) => `من واساه الأسبوع الماضي على ${sp.prevPts === 0 ? 'الممة' : 'النقطة الوحيدة'}، يطلب منه النصيحة اليوم. والنصيحة باختصار: ${_sp.P(h, sp.pts)} تكفي للإجابة.`),
      vt('sp.comeback.l5', null, (sp, h) => `صمدت معنوياته بعد الجولة الماضية. واليوم جاءت المكافأة: ${_sp.P(h, sp.pts)}.`),
    ],
  },

  // 3. الحصان الأسود
  {
    id: 'darkHorse', label: 'الحصان الأسود', mood: 'up',
    when: sp => sp.playersCount && sp.prevRank > Math.ceil(sp.playersCount / 2) && (sp.isHero || sp.pts >= sp.heroPts - 1) && sp.pts >= 4,
    score: sp => sp.isHero ? 6 : 4,
    title: [
      vt('sp.dark.t1', null, sp => `${vkN(sp.name)} ينطلق من الخلف، ويقلب الصف!`),
      vt('sp.dark.t2', null, sp => `لم يكن في الحسبان، فصار ${vkN(sp.name)} العنوان!`),
      vt('sp.dark.t3', null, sp => `من وسط الجدول بزغ النجم، و${vkN(sp.name)} قالها بالرقم!`),
      vt('sp.dark.t4', null, sp => `${vkN(sp.name)} يكسر التوقعات، ويكتب المفاجآت!`),
      vt('sp.dark.t5', null, sp => `ظهر الحصان الأسود، و${vkN(sp.name)} في الجولة ${sp.round} انتصر!`),
    ],
    story: [
      vt('sp.dark.s1', null, (sp, h) => `دخل ${vkN(sp.name)} الجولة ${sp.round} من المركز ${sp.prevRank}، وخرج منها ${sp.isHero ? 'بطلًا للجولة' : 'بين أعلى المسجّلين'} ${vkBi(h, sp.pts)}.`),
      vt('sp.dark.s2', null, (sp, h) => `لم يكن ${vkN(sp.name)} من المرشحين، لكنه جمع ${_sp.P(h, sp.pts)} في هذه الجولة${sp.isHero ? ' وانتزع لقب بطل الجولة' : ''}، فصار رصيده ${_sp.P(h, sp.total)}.`),
      vt('sp.dark.s3', null, (sp, h) => `من المركز ${sp.prevRank}، نافس ${vkN(sp.name)} الكبار على لقب الجولة ${vkBi(h, sp.pts)}، وهو الآن في المركز ${sp.rank}.`),
      vt('sp.dark.s4', null, (sp, h) => `اتجهت الأنظار إلى المتصدرين، لكن ${vkN(sp.name)} خطف المشهد من المركز ${sp.prevRank} ${vkBi(h, sp.pts)}.`),
      vt('sp.dark.s5', null, (sp, h) => `${_sp.P(h, sp.pts)} من مشارك بدأ الجولة في المركز ${sp.prevRank}؟ هذا ما فعله ${vkN(sp.name)}، والجدول بات يحسب له ألف حساب.`),
    ],
    joke: [
      vt('sp.dark.j1', null, sp => `جاء من المركز ${sp.prevRank} بهدوء، وغادر الجولة بضجيج.`),
      vt('sp.dark.j2', null, (sp, h) => `${_sp.P(h, sp.pts)} من المركز ${sp.prevRank}، ومن أخرجه من الحسابات عليه أن يعيد الحساب.`),
      vt('sp.dark.j3', null, (sp, h) => `لعبت أنديته بلا ضغط وجمعت ${_sp.P(h, sp.pts)}، فقلبت التوقعات رأسًا على عقب.`),
      vt('sp.dark.j4', null, sp => `من كان في المركز ${sp.prevRank} لا يُتوقع منه شيء، وهذا بالضبط ما استغلّه.`),
      vt('sp.dark.j5', null, sp => `قفز من المركز ${sp.prevRank} إلى ${sp.rank}، والجدول وحده كان شاهدًا على المفاجأة.`),
    ],
    jokeLong: [
      vt('sp.dark.l1', null, sp => `جاء من المركز ${sp.prevRank} بهدوء، وغادر الجولة بضجيج. وهكذا يفعل الحصان الأسود دائمًا: لا يعلن عن نفسه إلا بعد الوصول.`),
      vt('sp.dark.l2', null, (sp, h) => `${_sp.P(h, sp.pts)} من المركز ${sp.prevRank}، ومن أخرجه من الحسابات عليه أن يعيد الحساب. وعليه أن يضيفه هذه المرة إلى قائمة المنافسين.`),
      vt('sp.dark.l3', null, sp => `من كان في المركز ${sp.prevRank} لا يُتوقع منه شيء. وهذا بالضبط ما جعل مفاجأته أجمل.`),
      vt('sp.dark.l4', null, (sp, h) => `لعبت أنديته بلا ضغط وجمعت ${_sp.P(h, sp.pts)}. وحين لا ينتظر منك أحد شيئًا، يصبح كل شيء ممكنًا.`),
      vt('sp.dark.l5', null, sp => `قفز من المركز ${sp.prevRank} إلى ${sp.rank} في جولة واحدة. والجولة المقبلة ستكشف إن كانت مفاجأة عابرة أم بداية قصة.`),
    ],
  },

  // 4. الثابت
  {
    id: 'steady', label: 'الثابت', mood: 'up',
    when: sp => _sp.stdev(sp.last5) <= 1.2 && _sp.avg(sp.last5) >= 3, score: () => 2,
    title: [
      vt('sp.steady.t1', null, sp => `${vkN(sp.name)} ساعة سويسرية، ونتائجه دقيقة ومثالية!`),
      vt('sp.steady.t2', null, sp => `للثبات عنوان، و${vkN(sp.name)} هو البرهان!`),
      vt('sp.steady.t3', null, sp => `${vkN(sp.name)} على الإيقاع نفسه، ولا يعرف الضياع!`),
      vt('sp.steady.t4', null, sp => `${vkN(sp.name)} لا يتغيّر، ونَفَسه لا يتكسّر!`),
      vt('sp.steady.t5', null, sp => `هادئ ومستقر، و${vkN(sp.name)} على دربه مستمر!`),
    ],
    story: [
      vt('sp.steady.s1', null, (sp, h) => `في آخر ${_sp.R(h, sp.last5.length)}، كانت نقاط ${vkN(sp.name)} ${_sp.range(h, sp.last5)}، وهذا الثبات أوصله إلى المركز ${sp.rank} برصيد ${_sp.P(h, sp.total)}.`),
      vt('sp.steady.s2', null, (sp, h) => `جمع ${vkN(sp.name)} ${_sp.P(h, sp.pts)} في هذه الجولة، وهو رقم يشبه أرقامه دائمًا: ${_sp.range(h, sp.last5)} في آخر ${_sp.R(h, sp.last5.length)}.`),
      vt('sp.steady.s3', null, (sp, h) => `لا مفاجآت مع ${vkN(sp.name)}، لا صعودًا حادًّا ولا هبوطًا: ${_sp.range(h, sp.last5)} في آخر ${_sp.R(h, sp.last5.length)}، ورصيده ${_sp.P(h, sp.total)}.`),
      vt('sp.steady.s4', null, (sp, h) => `إن أردت أن تتوقع نقاط ${vkN(sp.name)} في الجولة المقبلة، فارجع إلى أرقامه: ${_sp.range(h, sp.last5)} في آخر ${_sp.R(h, sp.last5.length)}.`),
      vt('sp.steady.s5', null, (sp, h) => `الثبات سلاح ${vkN(sp.name)}: ${_sp.P(h, sp.pts)} في هذه الجولة، ومستوى لا يهتز منذ جولات، وهو الآن في المركز ${sp.rank}.`),
    ],
    joke: [
      vt('sp.steady.j1', null, (sp, h) => `${_sp.range(h, sp.last5)} في كل جولة، حتى إنك تستطيع أن تضبط ساعتك على نقاطه.`),
      vt('sp.steady.j2', null, (sp, h) => `أنديته تلتزم بجدول دوام رسمي: ${_sp.range(h, sp.last5)}، بلا تأخير ولا غياب.`),
      vt('sp.steady.j3', null, (sp, h) => `${_sp.range(h, sp.last5)} في آخر ${_sp.R(h, sp.last5.length)}، والآلة الحاسبة نفسها ملّت من تكرار أرقامه.`),
      vt('sp.steady.j4', null, sp => `لم يفاجئ ${vkN(sp.name)} أحدًا في الجولات الأخيرة، وكأن المفاجآت عنده ممنوعة بقرار إداري.`),
      vt('sp.steady.j5', null, (sp, h) => `نقاطه تتكرر ${_sp.range(h, sp.last5)} حتى صار حفظها أسهل من حفظ جدول الضرب.`),
    ],
    jokeLong: [
      vt('sp.steady.l1', null, (sp, h) => `${_sp.range(h, sp.last5)} في كل جولة، حتى إنك تستطيع أن تضبط ساعتك على نقاطه. والفرق الوحيد أن الساعة قد تتأخر، أما هو فلا.`),
      vt('sp.steady.l2', null, (sp, h) => `أنديته تلتزم بجدول دوام رسمي: ${_sp.range(h, sp.last5)}. ولو تأخّرت يومًا، فسيكون ذلك خبر الموسم.`),
      vt('sp.steady.l3', null, (sp, h) => `${_sp.range(h, sp.last5)} في آخر ${_sp.R(h, sp.last5.length)}، والآلة الحاسبة ملّت من تكرار أرقامه. لكن الرصيد لا يملّ، فهو يكبر جولة بعد جولة.`),
      vt('sp.steady.l4', null, () => 'لا قفزات ولا تراجعات في أرقامه الأخيرة. ومن يريد مفاجأة، فليبحث عنها في مكان آخر من الجدول.'),
      vt('sp.steady.l5', null, (sp, h) => `نقاطه تتكرر ${_sp.range(h, sp.last5)} حتى صار حفظها أسهل من جدول الضرب. والتكرار هنا ليس مملًّا، بل هو سرّ مركزه ${sp.rank}.`),
    ],
  },

  // 5. سلسلة ساخنة
  {
    id: 'hotStreak', label: 'سلسلة ساخنة', mood: 'up',
    when: sp => sp.hotRun >= 3, score: sp => 1 + sp.hotRun,
    title: [
      vt('sp.hot.t1', null, sp => `${vkN(sp.name)} يشتعل نارًا، ولا يعرف قرارًا!`),
      vt('sp.hot.t2', null, sp => `${vkN(sp.name)} على سلسلة ساخنة، ونتائجه ما زالت طاحنة!`),
      vt('sp.hot.t3', null, sp => `جولة تلو جولة، و${vkN(sp.name)} يكتب بطولة!`),
      vt('sp.hot.t4', null, sp => `النار لا تنطفئ، و${vkN(sp.name)} لا يكتفي!`),
      vt('sp.hot.t5', null, sp => `${vkN(sp.name)} في أفضل أيامه، والجميع يلاحق أرقامه!`),
    ],
    story: [
      vt('sp.hot.s1', null, (sp, h) => `${_sp.R(h, sp.hotRun)} متتالية لم ينزل فيها ${vkN(sp.name)} عن ${h.formatCount(4, 'نقطة')} في الجولة، وآخرها ${_sp.P(h, sp.pts)} في هذه الجولة، ورصيده الآن ${_sp.P(h, sp.total)}.`),
      vt('sp.hot.s2', null, (sp, h) => `وصلت سلسلة ${vkN(sp.name)} الساخنة إلى ${_sp.R(h, sp.hotRun, true)}: في كل منها ${h.formatCount(4, 'نقطة')} أو أكثر، وهو الآن في المركز ${sp.rank}.`),
      vt('sp.hot.s3', null, (sp, h) => `من الجولة ${sp.round - sp.hotRun + 1} إلى الجولة ${sp.round}، و${vkN(sp.name)} على النسق العالي نفسه: ${_sp.P(h, sp.pts)} في هذه الجولة، ورصيد ${_sp.P(h, sp.total)}.`),
      vt('sp.hot.s4', null, (sp, h) => `يعيش ${vkN(sp.name)} أجمل فتراته: ${_sp.R(h, sp.hotRun)} متتالية ${vkBi(h, 4)} أو أكثر، وآخرها ${_sp.P(h, sp.pts)}.`),
      vt('sp.hot.s5', null, (sp, h) => `الأرقام لا تكذب: ${_sp.R(h, sp.hotRun)} متتالية بنقاط عالية ${vkLi(sp.name)}، وأضاف في هذه الجولة ${_sp.P(h, sp.pts)} إلى رصيد بلغ ${_sp.P(h, sp.total)}.`),
    ],
    joke: [
      vt('sp.hot.j1', null, (sp, h) => `${_sp.R(h, sp.hotRun)} متتالية بنقاط عالية، والنار عنده لا تهدأ.`),
      vt('sp.hot.j2', null, (sp, h) => `أنديته تفوز منذ ${_sp.R(h, sp.hotRun, true)} وكأنها اتفقت معه مسبقًا.`),
      vt('sp.hot.j3', null, (sp, h) => `بعد ${_sp.R(h, sp.hotRun, true)} متتالية بهذا المستوى، عليه أن يفتح دورة تدريبية لمن يطاردونه.`),
      vt('sp.hot.j4', null, (sp, h) => `سلسلة من ${_sp.R(h, sp.hotRun, true)}، ومن يطاردونه يتمنون له جولة هادئة، لكنه لا يسمع.`),
      vt('sp.hot.j5', null, (sp, h) => `${_sp.R(h, sp.hotRun)} على التوالي، فالسخونة عنده ليست موسمية، بل عادة.`),
    ],
    jokeLong: [
      vt('sp.hot.l1', null, (sp, h) => `${_sp.R(h, sp.hotRun)} متتالية بنقاط عالية، والنار عنده لا تهدأ. ومن يطاردونه يبحثون عن طفاية حريق قبل الجولة المقبلة.`),
      vt('sp.hot.l2', null, (sp, h) => `أنديته تفوز منذ ${_sp.R(h, sp.hotRun, true)} وكأنها اتفقت معه مسبقًا. والاتفاق، على ما يبدو، ساري المفعول حتى إشعار آخر.`),
      vt('sp.hot.l3', null, (sp, h) => `بعد ${_sp.R(h, sp.hotRun, true)} متتالية بهذا المستوى، عليه أن يفتح دورة تدريبية لمن يطاردونه. والشرط الوحيد للتسجيل: ألا يتجاوزوه.`),
      vt('sp.hot.l4', null, (sp, h) => `سلسلة من ${_sp.R(h, sp.hotRun, true)}، ومن يطاردونه يتمنون له جولة هادئة. لكنه، كعادته، لا يسمع إلا صوت النقاط.`),
      vt('sp.hot.l5', null, (sp, h) => `${_sp.R(h, sp.hotRun)} على التوالي، فالسخونة عنده ليست موسمية بل عادة. والعادات، كما يقال، يصعب كسرها.`),
    ],
  },

  // 6. سلسلة باردة تتكسر
  {
    id: 'coldBroken', label: 'سلسلة باردة تتكسر', mood: 'up',
    when: sp => sp.coldEnded >= 2 && sp.pts > 0, score: sp => 2 + sp.coldEnded,
    title: [
      vt('sp.cold.t1', null, sp => `انكسر الجمود، وعاد ${vkN(sp.name)} للصمود!`),
      vt('sp.cold.t2', null, sp => `بعد الصيام جاء الإفطار، وعاد ${vkN(sp.name)} إلى المشوار!`),
      vt('sp.cold.t3', null, sp => `${vkN(sp.name)} يودّع الممّات، ويفتح صفحة الإنجازات!`),
      vt('sp.cold.t4', null, sp => `طال الانتظار، و${vkN(sp.name)} يكسر الحصار!`),
      vt('sp.cold.t5', null, sp => `بعد الصبر جاء الفرج، و${vkN(sp.name)} من الضيق خرج!`),
    ],
    story: [
      vt('sp.cold.s1', null, (sp, h) => `بعد ${h.formatCount(sp.coldEnded, 'ممة', {case: 'acc'})} ${vkV(h, sp.coldEnded, '', 'متتاليتين', 'متتالية')}، عاد ${vkN(sp.name)} إلى التسجيل في هذه الجولة ${vkBi(h, sp.pts)}، فصار رصيده ${_sp.P(h, sp.total)}.`),
      vt('sp.cold.s2', null, (sp, h) => `عانى ${vkN(sp.name)} ${_sp.R(h, sp.coldEnded, true)} بلا نقاط، وفي هذه الجولة كسر الصمت ${vkBi(h, sp.pts)}.`),
      vt('sp.cold.s3', null, (sp, h) => `كانت الجولة ${sp.round} نهاية سلسلة صعبة ${vkLi(sp.name)}: ${_sp.R(h, sp.coldEnded)} بلا نقاط ${vkV(h, sp.coldEnded, 'انتهت', 'انتهتا', 'انتهت')} ${vkBi(h, sp.pts)}.`),
      vt('sp.cold.s4', null, (sp, h) => `أخيرًا! يسجّل ${vkN(sp.name)} من جديد بعد ${_sp.R(h, sp.coldEnded, true)} عجاف، ويضيف ${_sp.P(h, sp.pts)} إلى رصيده.`),
      vt('sp.cold.s5', null, (sp, h) => `الصبر لم يخب: ${vkN(sp.name)} الذي غابت نقاطه ${_sp.R(h, sp.coldEnded, true)}، عاد في هذه الجولة ${vkBi(h, sp.pts)}.`),
    ],
    joke: [
      vt('sp.cold.j1', null, (sp, h) => `بعد ${_sp.R(h, sp.coldEnded, true)} من الغياب، عادت أنديته من إجازتها الطويلة ومعها ${_sp.P(h, sp.pts)} هدية.`),
      vt('sp.cold.j2', null, (sp, h) => `${_sp.R(h, sp.coldEnded)} من الممّات، وأخيرًا ارتاحت المعنويات من الدوام الإضافي.`),
      vt('sp.cold.j3', null, (sp, h) => `لعل أحدًا ظنّ أن أنديته اعتزلت بعد ${_sp.R(h, sp.coldEnded, true)} بلا نقاط، فإذا بها كانت تلتقط أنفاسها.`),
      vt('sp.cold.j4', null, (sp, h) => `من اعتاد ممّاته في ${_sp.R(h, sp.coldEnded, true)} الماضية، عليه أن يغيّر توقعاته الآن.`),
      vt('sp.cold.j5', null, (sp, h) => `حمدًا لله على السلامة، فالجدول اشتاق إلى نقاطه بعد ${_sp.R(h, sp.coldEnded, true)} من الغياب.`),
    ],
    jokeLong: [
      vt('sp.cold.l1', null, (sp, h) => `بعد ${_sp.R(h, sp.coldEnded, true)} من الغياب، عادت أنديته من إجازتها الطويلة. وعادت محمّلة بالهدايا: ${_sp.P(h, sp.pts)}.`),
      vt('sp.cold.l2', null, (sp, h) => `${_sp.R(h, sp.coldEnded)} من الممّات أنهكت المعنويات في دوام إضافي. واليوم، أخيرًا، حصلت على إجازة مستحقة.`),
      vt('sp.cold.l3', null, (sp, h) => `لعل أحدًا ظنّ أن أنديته اعتزلت بعد ${_sp.R(h, sp.coldEnded, true)} بلا نقاط. لكنها كانت تلتقط أنفاسها، ثم عادت.`),
      vt('sp.cold.l4', null, (sp, h) => `حمدًا لله على السلامة، فالجدول اشتاق إلى نقاطه. وأول الغيث ${_sp.P(h, sp.pts)}.`),
      vt('sp.cold.l5', null, (sp, h) => `من اعتاد ممّاته في ${_sp.R(h, sp.coldEnded, true)} الماضية، عليه أن يغيّر توقعاته. فالسلسلة الباردة انكسرت، والصفحة الجديدة بدأت.`),
    ],
  },

  // 7. على أبواب القمة
  {
    id: 'nearTop', label: 'على أبواب القمة', mood: 'up',
    when: sp => sp.rank > 1 && sp.rank <= 5 && sp.above && sp.above.gap >= 1 && sp.above.gap <= 3, score: sp => 5 - sp.above.gap,
    title: [
      vt('sp.near.t1', null, sp => `${vkN(sp.name)} على أبواب القمة، والمطاردة صارت مهمّة!`),
      vt('sp.near.t2', null, sp => `نقاط قليلة وتنفتح الأبواب، و${vkN(sp.name)} يطرق الباب!`),
      vt('sp.near.t3', null, sp => `${vkN(sp.name)} يقلّص المسافة، والفارق على الحافة!`),
      vt('sp.near.t4', null, sp => `${vkN(sp.name)} على مرمى حجر، والصعود ينتظر!`),
      vt('sp.near.t5', null, sp => `المسافة تقصر، و${vkN(sp.name)} لا يقصّر!`),
    ],
    story: [
      vt('sp.near.s1', null, (sp, h) => `${vkN(sp.name)} الآن في المركز ${sp.rank} برصيد ${_sp.P(h, sp.total)}، وبينه وبين ${vkN(sp.above.name)} ${_sp.P(h, sp.above.gap)} فقط.`),
      vt('sp.near.s2', null, (sp, h) => `جمع ${vkN(sp.name)} في هذه الجولة ${_sp.P(h, sp.pts)}، فصار على بُعد ${_sp.Pa(h, sp.above.gap)} من ${vkN(sp.above.name)} صاحب المركز ${sp.rank - 1}.`),
      vt('sp.near.s3', s => Number.isInteger(s.nextRound), (sp, h) => `تقلّص الفارق مع ${vkN(sp.above.name)} إلى ${_sp.P(h, sp.above.gap)}، وأمام ${vkN(sp.name)} صاحب المركز ${sp.rank} الجولة ${sp.nextRound} ليقلب المعادلة.`),
      vt('sp.near.s4', sp => sp.rank === 4, (sp, h) => `${vkN(sp.name)} رابع الجدول برصيد ${_sp.P(h, sp.total)}، والميدالية البرونزية على بُعد ${_sp.Pa(h, sp.above.gap)}.`),
      vt('sp.near.s5', null, (sp, h) => `يلاحق ${vkN(sp.name)} ${vkN(sp.above.name)} عن قرب: الفارق ${_sp.P(h, sp.above.gap)}، وقد جمع في هذه الجولة ${_sp.P(h, sp.pts)}.`),
      vt('sp.near.s6', null, (sp, h) => `جولة جيدة واحدة تكفي ${vkN(sp.name)} ليتخطى ${vkN(sp.above.name)}، فالفارق بينهما ${_sp.P(h, sp.above.gap)} لا غير.`),
    ],
    joke: [
      vt('sp.near.j1', null, (sp, h) => `${_sp.P(h, sp.above.gap)} فقط تفصلهما، وصار ${vkN(sp.above.name)} يلتفت خلفه كل قليل.`),
      vt('sp.near.j2', null, (sp, h) => `الفارق ${_sp.P(h, sp.above.gap)}، وهو صغير لدرجة أنه يُقاس بالمسطرة.`),
      vt('sp.near.j3', null, (sp, h) => `على بُعد ${_sp.Pa(h, sp.above.gap)}، يسمع ${vkN(sp.above.name)} خطوات مطارده، وقد صار نومه خفيفًا.`),
      vt('sp.near.j4', null, (sp, h) => `${_sp.P(h, sp.above.gap)} بينهما، ولو كان للجدول مرايا لرأى ${vkN(sp.above.name)} مطارده قادمًا.`),
      vt('sp.near.j5', sp => sp.above.gap <= 2, (sp, h) => `الفارق بينهما ${_sp.P(h, sp.above.gap)}، أي أقل من عدد أنديته الثلاثة.`),
    ],
    jokeLong: [
      vt('sp.near.l1', null, (sp, h) => `${_sp.P(h, sp.above.gap)} فقط تفصلهما، وصار ${vkN(sp.above.name)} يلتفت خلفه كل قليل. والالتفات المتكرر، كما يعرف الجميع، يبطئ الخطى.`),
      vt('sp.near.l2', null, (sp, h) => `الفارق ${_sp.P(h, sp.above.gap)}، وهو صغير لدرجة أنه يُقاس بالمسطرة. وفي الجولة المقبلة قد لا نحتاج حتى إلى المسطرة.`),
      vt('sp.near.l3', null, (sp, h) => `على بُعد ${_sp.Pa(h, sp.above.gap)}، يسمع ${vkN(sp.above.name)} خطوات مطارده. ولهذا صار نومه خفيفًا قبل كل جولة.`),
      vt('sp.near.l4', null, (sp, h) => `${_sp.P(h, sp.above.gap)} بين المركزين ${sp.rank - 1} و${sp.rank}. ومن يملك النفَس الأطول سيحسمها في الجولات المقبلة.`),
      vt('sp.near.l5', sp => sp.above.gap <= 2, (sp, h) => `الفارق بينهما ${_sp.P(h, sp.above.gap)}، أي أقل من عدد أنديته الثلاثة. ويكفي أن يفوز نادٍ واحد ليصير الحديث عن تجاوز.`),
    ],
  },

  // 8. ملك الأندية
  {
    id: 'clubKing', label: 'ملك الأندية', mood: 'up',
    when: sp => sp.clubs && sp.clubs.best && (sp.clubs.won === 3 || sp.clubs.best.gf >= 3), score: sp => sp.clubs.won === 3 ? 5 : 3,
    title: [
      vt('sp.club.t1', null, sp => `${vkN(sp.name)} اختار ففاز، وأنديته قدّمت الإنجاز!`),
      vt('sp.club.t2', null, sp => `${vkN(sp.name)} يختار بعين خبير، وأنديته تجلب الكثير!`),
      vt('sp.club.t3', null, sp => `${sp.clubs.best.club} يهدي ${vkN(sp.name)} الفوز، وهذا ما يُسمّى الكنز!`),
      vt('sp.club.t4', null, sp => `${vkN(sp.name)}: اختيارات ذهبية، ونتائج مثالية!`),
      vt('sp.club.t5', sp => sp.clubs.won === 3, sp => `ثلاثية كاملة لأندية ${vkN(sp.name)}، والفرحة شاملة!`),
      vt('sp.club.t6', sp => sp.clubs.won < 3, sp => `${sp.clubs.best.club} يقول كلمته، و${vkN(sp.name)} يحصد غلّته!`),
    ],
    story: [
      vt('sp.club.s1', sp => sp.clubs.won === 3, (sp, h) => `فازت أنديته الثلاثة كلها في هذه الجولة، فحصد ${vkN(sp.name)} ${_sp.P(h, sp.pts)}، ورصيده الآن ${_sp.P(h, sp.total)}.`),
      vt('sp.club.s2', null, (sp, h) => `كان ${sp.clubs.best.club} نجم الأسبوع عند ${vkN(sp.name)}: فاز على ${sp.clubs.best.opp} ${sp.clubs.best.gf}-${sp.clubs.best.ga}، وأسهم في ${_sp.P(h, sp.pts)} جمعها في هذه الجولة.`),
      vt('sp.club.s3', sp => sp.clubs.best.gf >= 3, (sp, h) => `جاء اختيار ${sp.clubs.best.club} في محلّه: فوز على ${sp.clubs.best.opp} ${vkBi(h, sp.clubs.best.gf, 'هدف')}، وجمع ${vkN(sp.name)} ${_sp.P(h, sp.pts)} في هذه الجولة.`),
      vt('sp.club.s4', null, (sp, h) => `عرفت أندية ${vkN(sp.name)} طريق الفوز في ${h.formatCount(sp.clubs.won, 'مباراة', {case: 'acc'})}، فكانت الحصيلة ${_sp.P(h, sp.pts)} ورصيدًا بلغ ${_sp.P(h, sp.total)}.`),
      vt('sp.club.s5', null, (sp, h) => `لعبت أنديته لصالحه في هذه الجولة، فجمع ${vkN(sp.name)} ${_sp.P(h, sp.pts)} ورفع رصيده إلى ${_sp.P(h, sp.total)}.`),
      vt('sp.club.s6', null, (sp, h) => `يقطف ${vkN(sp.name)} ثمار اختياراته: ${sp.clubs.won === 3 ? 'ثلاثة انتصارات من ثلاث مباريات' : `فوز ${sp.clubs.best.club} على ${sp.clubs.best.opp}`}، و${_sp.P(h, sp.pts)} في رصيده هذه الجولة.`),
    ],
    joke: [
      vt('sp.club.j1', null, (sp, h) => `فوز في ${h.formatCount(sp.clubs.won, 'مباراة', {case: 'acc'})}، فهل هو مستشار رياضي أم مشارك فانتازي؟`),
      vt('sp.club.j2', null, sp => `${sp.clubs.best.club} فاز على ${sp.clubs.best.opp}، ويستحق باقة ورد من ${vkN(sp.name)} هذا الأسبوع.`),
      vt('sp.club.j3', sp => sp.clubs.won === 3, () => 'ثلاثة انتصارات من ثلاث، وكأن أنديته اتفقت على كلمة سر واحدة: الفوز.'),
      vt('sp.club.j4', null, (sp, h) => `بعد ${_sp.P(h, sp.pts)} من أنديته، سيكثر السؤال عن اختياراته المقبلة، وهو يكتفي بالابتسام.`),
      vt('sp.club.j5', null, sp => `فوز ${sp.clubs.best.club} على ${sp.clubs.best.opp} يكفي ليمنحه جائزة أفضل اختيار في هذه الجولة.`),
    ],
    jokeLong: [
      vt('sp.club.l1', null, sp => `${sp.clubs.best.club} فاز على ${sp.clubs.best.opp}، ويستحق باقة ورد من ${vkN(sp.name)} هذا الأسبوع. وربما بطاقة شكر أيضًا، فالنقاط تستحق.`),
      vt('sp.club.l2', sp => sp.clubs.won === 3, () => 'ثلاثة انتصارات من ثلاث، وكأن أنديته اتفقت على كلمة سر واحدة: الفوز. والسر، حتى الآن، لم يتسرّب إلى بقية المشاركين.'),
      vt('sp.club.l3', null, (sp, h) => `بعد ${_sp.P(h, sp.pts)} من أنديته، سيكثر السؤال عن اختياراته المقبلة. وهو، كعادة الخبراء، يكتفي بالابتسام.`),
      vt('sp.club.l4', null, sp => `فوز ${sp.clubs.best.club} على ${sp.clubs.best.opp} يكفي ليمنحه جائزة أفضل اختيار. ولو استمر هذا الحس، فستتحول الجائزة إلى عادة أسبوعية.`),
      vt('sp.club.l5', null, (sp, h) => `فوز في ${h.formatCount(sp.clubs.won, 'مباراة', {case: 'acc'})}، فهل هو مستشار رياضي أم مشارك فانتازي؟ الجولات المقبلة وحدها تجيب.`),
    ],
  },

  // 9. صراع ثنائي (مواجهة الموسم)
  {
    id: 'duel', label: 'صراع ثنائي', mood: 'up',
    when: sp => sp.duel && sp.duel.totalGap <= 3, score: () => 3,
    title: [
      vt('sp.duel.t1', null, sp => `${vkN(sp.name)} و${vkN(sp.duel.opp)}، نار تحت الرماد، ولكل جولة ميعاد!`),
      vt('sp.duel.t2', null, sp => `${vkN(sp.name)} يردّ على ${vkN(sp.duel.opp)}، والمواجهة تشتد!`),
      vt('sp.duel.t3', null, sp => `بين ${vkN(sp.name)} و${vkN(sp.duel.opp)} حكاية، ليس لها نهاية!`),
      vt('sp.duel.t4', null, sp => `${vkN(sp.name)} و${vkN(sp.duel.opp)}، كلٌّ للآخر بالمرصاد، والجولة ${sp.round} زادت العناد!`),
      vt('sp.duel.t5', sp => sp.duel.myPts > sp.duel.oppPts, sp => `${vkN(sp.name)} يتفوّق على ${vkN(sp.duel.opp)} في الجولة، والمواجهة ما زالت مكمّلة!`),
    ],
    story: [
      vt('sp.duel.s1', null, (sp, h) => `جمع ${vkN(sp.name)} ${_sp.P(h, sp.duel.myPts)} في هذه الجولة مقابل ${_sp.P(h, sp.duel.oppPts)} ${vkLi(sp.duel.opp)}، والفارق بينهما في الرصيد ${sp.duel.totalGap === 0 ? 'معدوم، في تعادل كامل' : _sp.P(h, sp.duel.totalGap)}.`),
      vt('sp.duel.s2', sp => sp.duel.myPts !== sp.duel.oppPts, (sp, h) => `المواجهة بين ${vkN(sp.name)} و${vkN(sp.duel.opp)} لا تهدأ: ابتسمت هذه الجولة ${vkLi(sp.duel.myPts > sp.duel.oppPts ? sp.name : sp.duel.opp)}، والفارق في الرصيد ${h.formatCount(sp.duel.totalGap, 'نقطة', {zero: 'معدوم'})}.`),
      vt('sp.duel.s3', null, (sp, h) => `${vkN(sp.name)} في المركز ${sp.rank}، وغريمه ${vkN(sp.duel.opp)} قريب منه، ولا يفصل بينهما إلا ${h.formatCount(sp.duel.totalGap, 'نقطة', {zero: 'التعادل'})}.`),
      vt('sp.duel.s4', sp => sp.duel.myPts === sp.duel.oppPts, (sp, h) => `جمع ${vkN(sp.name)} و${vkN(sp.duel.opp)} النقاط نفسها في هذه الجولة، ${_sp.P(h, sp.duel.myPts)} لكل منهما، والصراع ما زال معلّقًا.`),
      vt('sp.duel.s5', null, (sp, h) => `تزداد مواجهة الموسم بين ${vkN(sp.name)} و${vkN(sp.duel.opp)} حماسًا: ${_sp.P(h, sp.duel.myPts)} مقابل ${_sp.P(h, sp.duel.oppPts)} في هذه الجولة.`),
      vt('sp.duel.s6', s => Number.isInteger(s.nextRound), (sp, h) => `تتجدد الحسابات بين ${vkN(sp.name)} و${vkN(sp.duel.opp)} في الجولة ${sp.nextRound}، بعد ${_sp.P(h, sp.duel.myPts)} مقابل ${_sp.P(h, sp.duel.oppPts)} في هذه الجولة.`),
    ],
    joke: [
      vt('sp.duel.j1', null, (sp, h) => `${_sp.P(h, sp.duel.myPts)} مقابل ${_sp.P(h, sp.duel.oppPts)}، والمتابعون ينتظرون الجولة المقبلة بشغف.`),
      vt('sp.duel.j2', null, sp => `صار ${vkN(sp.duel.opp)} يتابع نقاط ${vkN(sp.name)} قبل نقاطه هو.`),
      vt('sp.duel.j3', null, (sp, h) => `فارق ${h.formatCount(sp.duel.totalGap, 'نقطة', {zero: 'معدوم'})} في الرصيد، ولو كانت هذه المواجهة مسلسلًا لبلغت موسمها الثالث.`),
      vt('sp.duel.j4', null, sp => `${vkN(sp.name)} و${vkN(sp.duel.opp)}، كلاهما يفتح الجدول ويبحث عن اسم الآخر أولًا، قبل أن يبحث عن اسمه.`),
      vt('sp.duel.j5', null, (sp, h) => `${_sp.P(h, sp.duel.myPts)} مقابل ${_sp.P(h, sp.duel.oppPts)}، ومواجهة بهذا القرب تحتاج إلى حكم فيديو.`),
    ],
    jokeLong: [
      vt('sp.duel.l1', null, sp => `صار ${vkN(sp.duel.opp)} يتابع نقاط ${vkN(sp.name)} قبل نقاطه هو. والعكس صحيح تمامًا، فالعين على الغريم أولًا.`),
      vt('sp.duel.l2', null, (sp, h) => `فارق ${h.formatCount(sp.duel.totalGap, 'نقطة', {zero: 'معدوم'})} في الرصيد، ولو كانت هذه المواجهة مسلسلًا لبلغت موسمها الثالث. والحلقة المقبلة تُعرض في الجولة القادمة.`),
      vt('sp.duel.l3', null, (sp, h) => `${_sp.P(h, sp.duel.myPts)} مقابل ${_sp.P(h, sp.duel.oppPts)}، ومواجهة بهذا القرب تحتاج إلى حكم فيديو. وحتى الحكم سيطلب إعادة اللقطة مرتين.`),
      vt('sp.duel.l4', null, sp => `${vkN(sp.name)} و${vkN(sp.duel.opp)} يفتحان الجدول ويبحث كلٌّ عن اسم الآخر أولًا. وبعدها فقط يتذكّر كلٌّ منهما أن يبحث عن نفسه.`),
      vt('sp.duel.l5', null, (sp, h) => `${_sp.P(h, sp.duel.myPts)} مقابل ${_sp.P(h, sp.duel.oppPts)} في هذه الجولة. والمتابعون حجزوا مقاعدهم للجولة المقبلة.`),
    ],
  },

  // 10. الأوسمة والأرقام
  {
    id: 'badge', label: 'وسام جديد', mood: 'up',
    when: sp => sp.badge && sp.badge.title, score: () => 4,
    title: [
      vt('sp.badge.t1', null, sp => `${vkN(sp.name)} يتوّج بوسام، وللإنجاز كلام!`),
      vt('sp.badge.t2', null, sp => `تعب ${vkN(sp.name)} لم يذهب هباء، و«${sp.badge.title}» صار له جزاء!`),
      vt('sp.badge.t3', null, sp => `${vkN(sp.name)} يرفع وسامه، والمجد أمامه!`),
      vt('sp.badge.t4', null, sp => `وسام جديد في الخزانة، و${vkN(sp.name)} يثبت المكانة!`),
      vt('sp.badge.t5', null, sp => `${vkN(sp.name)} يحصد الألقاب، ويفتح للمجد الباب!`),
    ],
    story: [
      vt('sp.badge.s1', null, (sp, h) => `حصل ${vkN(sp.name)} في هذه الجولة على وسام «${sp.badge.title}»، بعد ${_sp.P(h, sp.pts)} في الجولة ${sp.round} ورصيد بلغ ${_sp.P(h, sp.total)}.`),
      vt('sp.badge.s2', null, (sp, h) => `وسام جديد في سجل ${vkN(sp.name)}: «${sp.badge.title}»، ولم يأتِ من فراغ، فهو في المركز ${sp.rank} برصيد ${_sp.P(h, sp.total)}.`),
      vt('sp.badge.s3', null, (sp, h) => `صار «${sp.badge.title}» باسم ${vkN(sp.name)} رسميًا، وكانت ${_sp.P(h, sp.pts)} في هذه الجولة جزءًا من الحكاية.`),
      vt('sp.badge.s4', null, sp => `يضيف ${vkN(sp.name)} «${sp.badge.title}» إلى إنجازاته، وهو الآن في المركز ${sp.rank}.`),
      vt('sp.badge.s5', null, (sp, h) => `كتبت الأرقام اسم ${vkN(sp.name)} في قائمة الأوسمة: «${sp.badge.title}»، ورصيده ${_sp.P(h, sp.total)}.`),
    ],
    joke: [
      vt('sp.badge.j1', null, sp => `مع «${sp.badge.title}»، صارت خزانة أوسمته تحتاج إلى رفّ جديد.`),
      vt('sp.badge.j2', null, sp => `وصله وسام «${sp.badge.title}» قبل أن يطلبه، فالأرقام تكفّلت بالطلب.`),
      vt('sp.badge.j3', null, sp => `وسام «${sp.badge.title}» لا يُشترى من متجر، بل يُكسب من الجدول فقط.`),
      vt('sp.badge.j4', null, sp => `«${sp.badge.title}» ليس هدية، بل راتب تعب جولات كاملة.`),
      vt('sp.badge.j5', null, (sp, h) => `${_sp.P(h, sp.total)} في الرصيد ووسام «${sp.badge.title}» على الصدر، والبقية في الطريق.`),
    ],
    jokeLong: [
      vt('sp.badge.l1', null, sp => `مع «${sp.badge.title}»، صارت خزانة أوسمته تحتاج إلى رفّ جديد. والنجّار، على ما يبدو، سيزوره أكثر من مرة هذا الموسم.`),
      vt('sp.badge.l2', null, sp => `وصله وسام «${sp.badge.title}» قبل أن يطلبه. فالأرقام، حين تتكلم، لا تحتاج إلى طلب.`),
      vt('sp.badge.l3', null, sp => `وسام «${sp.badge.title}» لا يُشترى من متجر، بل يُكسب من الجدول. ومن يريد نسخة منه، فالطريق الوحيد هو النقاط.`),
      vt('sp.badge.l4', null, sp => `«${sp.badge.title}» ليس هدية، بل راتب تعب جولات كاملة. والراتب، كما هو معروف، يُصرف لمن يستحق.`),
      vt('sp.badge.l5', null, (sp, h) => `${_sp.P(h, sp.total)} في الرصيد ووسام «${sp.badge.title}» على الصدر. والسؤال الآن: ما الوسام التالي؟`),
    ],
  },

  // 11. الصدارة
  {
    id: 'leader', label: 'الصدارة', mood: 'up',
    when: sp => sp.isLeader && sp.second, score: sp => sp.leaderChanged ? 6 : 2,
    title: [
      vt('sp.lead.t1', sp => sp.leaderChanged, sp => `${vkN(sp.name)} يصعد إلى القمة، وينتزع الصدارة بهمّة!`),
      vt('sp.lead.t2', sp => !sp.leaderChanged, sp => `${vkN(sp.name)} ثابت فوق، والملاحقون في شوق!`),
      vt('sp.lead.t3', null, sp => `${vkN(sp.name)} في الصدارة، ولكل جولة إشارة!`),
      vt('sp.lead.t4', sp => !sp.leaderChanged, sp => `للصدارة حارس، و${vkN(sp.name)} خير فارس!`),
      vt('sp.lead.t5', null, sp => `المتصدر ${vkN(sp.name)} يواصل المشوار، وعينه على الانتصار!`),
      vt('sp.lead.t6', sp => sp.leaderChanged, sp => `القمة تغيّر صاحبها، و${vkN(sp.name)} يأخذ نصيبها!`),
      vt('sp.lead.t7', null, sp => `للعرش صاحب، و${vkN(sp.name)} للصدارة طالب وغالب!`),
    ],
    story: [
      vt('sp.lead.s1', sp => sp.leaderChanged, (sp, h) => `صار ${vkN(sp.name)} المتصدر الجديد بعد الجولة ${sp.round}، برصيد ${_sp.P(h, sp.total)}${_sp.leadGap(h, sp)}.`),
      vt('sp.lead.s2', sp => !sp.leaderChanged, (sp, h) => `حافظ ${vkN(sp.name)} على الصدارة بعد الجولة ${sp.round}، برصيد ${_sp.P(h, sp.total)}${_sp.leadGap(h, sp)}.`),
      vt('sp.lead.s3', null, (sp, h) => `في قمة الجدول ${vkN(sp.name)} برصيد ${_sp.P(h, sp.total)}، جمع منها ${_sp.P(h, sp.pts)} في هذه الجولة${_sp.leadGap(h, sp)}.`),
      vt('sp.lead.s4', null, (sp, h) => `يتصدّر ${vkN(sp.name)} جدول الترتيب برصيد ${_sp.P(h, sp.total)}${_sp.leadGap(h, sp)}، وأضاف في هذه الجولة ${_sp.P(h, sp.pts)}.`),
      vt('sp.lead.s5', null, (sp, h) => `من يريد الصدارة عليه أن يتجاوز ${vkN(sp.name)} أولًا: رصيد ${_sp.P(h, sp.total)}${_sp.leadGap(h, sp)}.`),
    ],
    joke: [
      vt('sp.lead.j1', null, (sp, h) => `يتصدّر برصيد ${_sp.P(h, sp.total)}، وصار ملاحقوه يعرفون ظهره أكثر من وجهه.`),
      vt('sp.lead.j2', sp => sp.second.gap >= 3, (sp, h) => `فارق ${_sp.P(h, sp.second.gap)} عن الثاني، وهو فارق مريح لدرجة أنه يسمح بقيلولة قصيرة.`),
      vt('sp.lead.j3', sp => sp.second.gap <= 2, (sp, h) => `الفارق عن ${vkN(sp.second.name)} ${h.formatCount(sp.second.gap, 'نقطة', {zero: 'معدوم'})}، فكرسي القمة يهتز تحته.`),
      vt('sp.lead.j4', null, (sp, h) => `${_sp.P(h, sp.total)} في الرصيد، والجدول كله يتحدث عنه، وهو صامت في الأعلى.`),
      vt('sp.lead.j5', sp => !sp.leaderChanged, () => 'بقي في القمة جولة أخرى، حتى صارت الصدارة عنوان سكنه الدائم.'),
      vt('sp.lead.j6', sp => sp.leaderChanged, () => 'أول ليلة في القمة، فهل سيقدر على النوم؟'),
      vt('sp.lead.j7', null, () => 'كل المشاركين يقرؤون الجدول من الأسفل، إلا هو فيقرؤه من الأعلى.'),
    ],
    jokeLong: [
      vt('sp.lead.l1', null, (sp, h) => `يتصدّر برصيد ${_sp.P(h, sp.total)}، وصار ملاحقوه يعرفون ظهره أكثر من وجهه. ومن يريد أن يرى وجهه، فعليه أن يسبقه أولًا.`),
      vt('sp.lead.l2', sp => sp.second.gap >= 3, (sp, h) => `فارق ${_sp.P(h, sp.second.gap)} عن الثاني، وهو فارق يسمح بقيلولة قصيرة. لكن القيلولة الطويلة ممنوعة، فالجولات المقبلة لا ترحم.`),
      vt('sp.lead.l3', sp => sp.second.gap <= 2, (sp, h) => `الفارق عن ${vkN(sp.second.name)} ${h.formatCount(sp.second.gap, 'نقطة', {zero: 'معدوم'})}، فكرسي القمة يهتز تحته. والكرسي الذي يهتز يحتاج إلى نقاط تثبّته.`),
      vt('sp.lead.l4', sp => sp.leaderChanged, () => 'أول ليلة في القمة، فهل سيقدر على النوم؟ الجواب في الجولة المقبلة، حين يكتشف إن كانت القمة مريحة أم مقلقة.'),
      vt('sp.lead.l5', null, () => 'كل المشاركين يقرؤون الجدول من الأسفل، إلا هو فيقرؤه من الأعلى. ويكفيه أن يقرأ السطر الأول.'),
    ],
  },

  // 12. أبطال التوقع
  {
    id: 'predictor', label: 'أبطال التوقع', mood: 'up',
    when: sp => sp.predictor && sp.predictor.hits >= 2, score: () => 2,
    title: [
      vt('sp.pred.t1', null, sp => `${vkN(sp.name)} يرى قبل الجميع، وتوقعه لا يضيع!`),
      vt('sp.pred.t2', null, sp => `توقّع فأصاب، و${vkN(sp.name)} فتح الباب!`),
      vt('sp.pred.t3', null, sp => `عيون ثاقبة، وتوقعات صائبة: ${vkN(sp.name)} يكرر الإصابة!`),
      vt('sp.pred.t4', null, sp => `${vkN(sp.name)} خبير التوقعات، والنتيجة إثبات!`),
      vt('sp.pred.t5', null, sp => `${vkN(sp.name)} توقّع البطل بدقة، والجميع يطلب منه الورقة!`),
    ],
    story: [
      vt('sp.pred.s1', null, (sp, h) => `أصاب ${vkN(sp.name)} في توقع بطل الجولة في ${_sp.R(h, sp.predictor.hits, true)} هذا الموسم، وجاء توقعه في هذه الجولة في محلّه.`),
      vt('sp.pred.s2', null, (sp, h) => `صدقت توقعات ${vkN(sp.name)} لبطل الجولة في ${_sp.R(h, sp.predictor.hits, true)}، ولو كانت هناك جائزة للبصيرة لنالها.`),
      vt('sp.pred.s3', null, (sp, h) => `من يتوقع بطل الجولة بدقة أكبر؟ ${vkN(sp.name)} بإصابات في ${_sp.R(h, sp.predictor.hits, true)}، وهذه الجولة أضافت واحدة.`),
      vt('sp.pred.s4', null, (sp, h) => `لا يكتفي ${vkN(sp.name)} بنقاطه، فله في التوقعات نصيب أيضًا: ${_sp.R(h, sp.predictor.hits)} أصاب فيها بطل الجولة.`),
      vt('sp.pred.s5', null, (sp, h) => `في سباق التوقعات، يتقدّم ${vkN(sp.name)} بإصابة بطل الجولة في ${_sp.R(h, sp.predictor.hits, true)}.`),
    ],
    joke: [
      vt('sp.pred.j1', null, (sp, h) => `أصاب في ${_sp.R(h, sp.predictor.hits, true)}، وقد نفكّر في استشارته قبل اختيار أنديتنا.`),
      vt('sp.pred.j2', null, (sp, h) => `${_sp.R(h, sp.predictor.hits)} صائبة، ويبدو أنه يملك كرة بلورية، وإن كان يقول إنها خبرة.`),
      vt('sp.pred.j3', null, (sp, h) => `بعد ${_sp.R(h, sp.predictor.hits, true)} صائبة، صارت توقعاته أدق من النشرة الجوية.`),
      vt('sp.pred.j4', null, (sp, h) => `${_sp.R(h, sp.predictor.hits)} صائبة في توقع غيره، ولو توقّع لنفسه بالدقة نفسها لتغيّر الجدول.`),
      vt('sp.pred.j5', null, (sp, h) => `إصابات في ${_sp.R(h, sp.predictor.hits, true)}، وتوقعه المقبل سيُنتظر كما تُنتظر النتائج.`),
    ],
    jokeLong: [
      vt('sp.pred.l1', null, (sp, h) => `أصاب في ${_sp.R(h, sp.predictor.hits, true)}، وقد نفكّر في استشارته قبل اختيار أنديتنا. وإن رفض، فسنكتفي بمراقبة توقعاته بصمت.`),
      vt('sp.pred.l2', null, (sp, h) => `${_sp.R(h, sp.predictor.hits)} صائبة، ويبدو أنه يملك كرة بلورية. أما هو فيصرّ على أنها مجرد خبرة.`),
      vt('sp.pred.l3', null, (sp, h) => `بعد ${_sp.R(h, sp.predictor.hits, true)} صائبة، صارت توقعاته أدق من النشرة الجوية. والفرق أن النشرة تتوقع المطر، وهو يتوقع الأبطال.`),
      vt('sp.pred.l4', null, (sp, h) => `${_sp.R(h, sp.predictor.hits)} صائبة في توقع غيره. ولو توقّع لنفسه بالدقة نفسها، لتغيّر شكل الجدول كله.`),
      vt('sp.pred.l5', null, (sp, h) => `إصابات في ${_sp.R(h, sp.predictor.hits, true)}، وتوقعه المقبل سيُنتظر كما تُنتظر النتائج. وربما أكثر.`),
    ],
  },

  // 13. ممة بشرف (بلطف وتشجيع، لا شماتة)
  {
    id: 'mummaHonor', label: 'ممة بشرف', mood: 'down',
    when: sp => sp.played && sp.pts === 0, score: () => 1,
    title: [
      vt('sp.mumma.t1', null, sp => `${vkN(sp.name)} في جولة صعبة، والعودة قريبة!`),
      vt('sp.mumma.t2', null, sp => `غابت النقاط عن ${vkN(sp.name)}، والهمّة لم تغب!`),
      vt('sp.mumma.t3', null, sp => `جولة لا تُحتسب، و${vkN(sp.name)} للعودة يحتسب!`),
      vt('sp.mumma.t4', null, sp => `اليوم ممة، وغدًا همّة: ${vkN(sp.name)} لا ينهزم!`),
      vt('sp.mumma.t5', null, sp => `${vkN(sp.name)} يلتقط الأنفاس، ويعود غدًا بحماس!`),
    ],
    story: [
      vt('sp.mumma.s1', null, (sp, h) => `لم تكن الجولة ${sp.round} في صالح ${vkN(sp.name)}، فقد خرج منها بممة، لكنه ما زال في المركز ${sp.rank} برصيد ${_sp.P(h, sp.total)}، والموسم طويل.`),
      vt('sp.mumma.s2', null, (sp, h) => `لم توفَّق أنديته في هذه الجولة، فاكتفى ${vkN(sp.name)} بممة، لكن رصيده ${_sp.P(h, sp.total)} يقول إن المشوار لم ينتهِ.`),
      vt('sp.mumma.s3', null, (sp, h) => `حتى أقوى المشاركين يمرّون بجولة بيضاء، وهذا ما حدث مع ${vkN(sp.name)} في الجولة ${sp.round}، ورصيده باقٍ عند ${_sp.P(h, sp.total)}.`),
      vt('sp.mumma.s4', sp => sp.prevPts !== null && sp.prevPts >= 3, (sp, h) => `لم يسجّل ${vkN(sp.name)} في هذه الجولة، لكنه جمع قبلها ${_sp.P(h, sp.prevPts)} في الجولة ${sp.round - 1}، فالمستوى موجود والعودة قريبة.`),
      vt('sp.mumma.s5', null, sp => `ممة الجولة ${sp.round} من نصيب ${vkN(sp.name)}، لكنه في الجدول ما زال في المركز ${sp.rank}، وكل جولة فرصة جديدة.`),
    ],
    joke: [
      vt('sp.mumma.j1', null, () => 'أخذت أنديته إجازة جماعية دون أن تستأذن، وستعود حتمًا بعد الإجازة.'),
      vt('sp.mumma.j2', null, sp => `ممة في الجولة ${sp.round}، ولا بأس، فحتى النجوم تغيب أحيانًا.`),
      vt('sp.mumma.j3', null, sp => `الجولة ${sp.round} نعتبرها كأن لم تكن، ونكمل.`),
      vt('sp.mumma.j4', null, (sp, h) => `الممة ضيف ثقيل، لكنها لن تطيل البقاء مع رصيد ${_sp.P(h, sp.total)}.`),
      vt('sp.mumma.j5', null, () => 'حتى الآلة الحاسبة تعاطفت معه في هذه الجولة، فلم تجد ما تجمعه.'),
    ],
    jokeLong: [
      vt('sp.mumma.l1', null, () => 'أخذت أنديته إجازة جماعية دون أن تستأذن. وكل إجازة، مهما طالت، تنتهي بعودة.'),
      vt('sp.mumma.l2', null, sp => `ممة في الجولة ${sp.round}، ولا بأس، فحتى النجوم تغيب أحيانًا. والنجم الذي يغيب ليلة، يعود أكثر لمعانًا.`),
      vt('sp.mumma.l3', null, (sp, h) => `الممة ضيف ثقيل، لكنها لن تطيل البقاء. فرصيد ${_sp.P(h, sp.total)} لا يتسع لضيوف من هذا النوع.`),
      vt('sp.mumma.l4', null, sp => `الجولة ${sp.round} نعتبرها كأن لم تكن. والجولة المقبلة صفحة بيضاء تنتظر من يكتبها.`),
      vt('sp.mumma.l5', null, () => 'حتى الآلة الحاسبة تعاطفت معه في هذه الجولة. لكنها تنتظر الجولة المقبلة لتعمل من جديد.'),
    ],
  },
];

// الرقم الداعم (مشترك بين الزوايا، كل واحد بشرطه)
const SPOTLIGHT_FACTS = [
  vt('sp.fact.1', sp => sp.pts > 0, (sp, h) => `بالأرقام: المركز ${sp.rank}، والرصيد ${_sp.P(h, sp.total)}، ونقاط الجولة ${_sp.P(h, sp.pts)}.`),
  vt('sp.fact.2', sp => sp.above && sp.above.gap > 0, (sp, h) => `ويفصله عن ${vkN(sp.above.name)} ${_sp.P(h, sp.above.gap)}.`),
  vt('sp.fact.3', sp => sp.below && sp.below.gap > 0, (sp, h) => `ويتقدّم على ${vkN(sp.below.name)} ${vkBi(h, sp.below.gap)}.`),
  vt('sp.fact.4', sp => sp.heroCount >= 2, (sp, h) => `وتوّج بلقب بطل الجولة في ${_sp.R(h, sp.heroCount, true)} هذا الموسم.`),
  vt('sp.fact.4b', sp => sp.heroCount === 1 && sp.isHero, () => 'وهذا أول لقب بطل جولة له هذا الموسم.'),
  vt('sp.fact.4c', sp => sp.heroCount === 1 && !sp.isHero, () => 'وسبق له أن توّج بطلًا لجولة هذا الموسم.'),
  vt('sp.fact.5', sp => sp.seasonMumma >= 1, (sp, h) => `وفي رصيده هذا الموسم ${h.formatCount(sp.seasonMumma, 'ممة')}.`),
  vt('sp.fact.6', sp => sp.seasonMumma === 0 && sp.last5 && sp.last5.length >= 5, () => 'ولم يعرف الممة منذ بداية الموسم.'),
  vt('sp.fact.7', sp => sp.bestPts >= 1, (sp, h) => `وأعلى نقاط له في جولة واحدة هذا الموسم ${_sp.P(h, sp.bestPts)}.`),
  vt('sp.fact.8', sp => sp.move !== 0, (sp, h) => sp.move > 0 ? `وصعد ${_sp.M(h, sp.move)} في هذه الجولة.` : `وتراجع ${_sp.M(h, -sp.move)} في هذه الجولة.`),
];

// كل قالب يحمل شرط زاويته (يُرفض لوحده لو الزاوية ما تنطبق)، فيصير القالب مستقلًا وآمنًا لو استُدعي منفردًا
SPOTLIGHT_ANGLES.forEach(a => ['title', 'story', 'joke', 'jokeLong'].forEach(k => a[k].forEach(t => {
  const own = t.when;
  t.when = (sp, h) => !!a.when(sp) && (!own || own(sp, h));
})));

// سياق الموسم (مقطع النسخة الطويلة، قرار المنظّم 14 نوفمبر: الطول يتنوّع بين الجولات)
const SPOTLIGHT_SEASON = [
  vt('sp.season.1', sp => sp.seasonTotal > sp.round, (sp, h) => `بلغ الموسم الجولة ${sp.round} من ${sp.seasonTotal}، وتبقّى ${_sp.R(h, sp.seasonTotal - sp.round)}، فالحسابات ما زالت مفتوحة.`),
  vt('sp.season.2', sp => !sp.isLeader && sp.leaderGap > 0 && sp.leaderGap <= 6, (sp, h) => `وبينه وبين المتصدر ${vkN(sp.leaderName)} ${_sp.P(h, sp.leaderGap)} فقط، أي إن جولتين جيدتين قد تقلبان الحسابات.`),
  vt('sp.season.3', sp => !sp.isLeader && sp.leaderGap > 6, (sp, h) => `وبلغت المسافة عن المتصدر ${vkN(sp.leaderName)} ${_sp.P(h, sp.leaderGap)}، والمطاردة تحتاج إلى نفَس طويل وجولات ثابتة.`),
  vt('sp.season.4', sp => sp.rank3 && sp.rank3 > sp.rank && sp.rank3 !== sp.prevRank, (sp, h) => `قبل ${_sp.R(h, 3, true)} كان في المركز ${sp.rank3}، وهو الآن في المركز ${sp.rank}، فمنحناه يتّجه إلى الأعلى.`),
  vt('sp.season.5', sp => sp.rank3 && sp.rank3 < sp.rank && sp.rank3 !== sp.prevRank, (sp, h) => `قبل ${_sp.R(h, 3, true)} كان في المركز ${sp.rank3}، وهو الآن في المركز ${sp.rank}، والمطلوب أن يعود إلى المسار الصاعد.`),
  vt('sp.season.6', sp => sp.seasonMumma === 0 && sp.roundsPlayed >= 5, () => 'ولم يعرف الممة طوال الموسم، وهذا وحده إنجاز في دوري بهذه القوة.'),
  vt('sp.season.7', sp => sp.seasonMumma >= 2, (sp, h) => `ووصل عدّاد الممّات عنده هذا الموسم إلى ${h.formatCount(sp.seasonMumma, 'ممة', {case: 'acc'})}، والجولات المقبلة فرصة ليوقف العدّاد.`),
  vt('sp.season.8', sp => sp.bestPts >= 8, (sp, h) => `وأعلى رقم سجّله في جولة هذا الموسم ${_sp.P(h, sp.bestPts)}، فهو قادر على الجولات الكبيرة.`),
  vt('sp.season.9', sp => sp.rank >= 2 && sp.rank <= 3, sp => `ومكانه الآن على منصة الميداليات، والمركز ${sp.rank} لا يناله إلا من يستحقه.`),
  vt('sp.season.10', sp => sp.playersCount && sp.rank > sp.playersCount - 3, () => 'ومكانه في ذيل الجدول لا يعكس ما يقدر عليه، والموسم ما زال طويلًا.'),
  vt('sp.season.11', sp => sp.last5 && sp.last5.length >= 3, (sp, h) => `وفي آخر ${_sp.R(h, sp.last5.length)} جمع ${_sp.P(h, sp.last5.reduce((a, b) => a + b, 0))}، وهذا مقياس مستواه الحقيقي في هذه الفترة.`),
  vt('sp.season.12', sp => sp.heroCount === 0 && sp.roundsPlayed >= 5, () => 'ولم يتوّج بلقب بطل الجولة حتى الآن هذا الموسم، والجولات المقبلة فرصة ليكسر هذا الحاجز.'),
  vt('sp.season.13', sp => sp.roundsPlayed >= 3, (sp, h) => `وخاض حتى الآن ${_sp.R(h, sp.roundsPlayed, true)} في الموسم، وكل جولة تضيف إلى حكايته فصلًا جديدًا.`),
];

// طول التقرير (R-21 المحدّث): الجولات الزوجية طويلة لو فيه سياق موسم كافٍ (مقطعان صالحان)، وغير كذا قصيرة.
// حتمي من رقم الجولة وغنى البيانات، فيتبادل الطولان بين الجولات. ترتيب الطويل:
//   العنوان ← القصة + 3 أرقام داعمة ← سياق الموسم (حتى 3) ← التحفيز ← زوج النكتتين (jokeLong) ← الخاتمة (100–180 كلمة)
// قاعدة للمحرك: الرقم الداعم sp.fact.1 (المركز والرصيد) يُترك لو القصة المختارة ذكرت المركز والرصيد نفسهم.
// والقصير: العنوان ← القصة + 3 أرقام ← التحفيز ← نكتة (joke) ← الخاتمة (~70–90 كلمة)
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
    vt('sp.motiv.up1', sp => sp.above && sp.above.gap > 0 && sp.rank > 1, (sp, h) => `والمطلوب الآن جولة جيدة أخرى، فالمركز ${sp.rank - 1} لا يبعد عنه إلا ${_sp.P(h, sp.above.gap)}.`),
    vt('sp.motiv.up2', sp => sp.rank >= 2 && sp.rank <= 3, () => 'والميدالية في يده، والبراعة أن يحافظ عليها حتى نهاية الموسم.'),
    vt('sp.motiv.up3', null, () => 'وإن استمر هذا المستوى، فسيتغيّر الجدول كثيرًا في الجولات المقبلة.'),
    vt('sp.motiv.up4', s => Number.isInteger(s.nextRound), sp => `والجولة ${sp.nextRound} فرصته ليثبت أن ما حدث لم يكن صدفة.`),
    vt('sp.motiv.up5', null, () => 'وكل نقطة يجمعها الآن تقرّبه خطوة من طموحه في الجدول.'),
    vt('sp.motiv.up6', sp => sp.isLeader, () => 'والحفاظ على الصدارة أصعب من الوصول إليها، والجولات المقبلة امتحان.'),
    vt('sp.motiv.up7', sp => sp.below && sp.below.gap > 0 && sp.below.gap <= 2, (sp, h) => `لكن عليه أن ينتبه، لأن ${vkN(sp.below.name)} يلاحقه بفارق ${_sp.Pa(h, sp.below.gap)} فقط، والغفلة ممنوعة.`),
  ],
  down: [
    vt('sp.motiv.down1', null, () => 'والمهم الآن أن يعود سريعًا، فالجدول لا ينتظر أحدًا.'),
    vt('sp.motiv.down2', s => Number.isInteger(s.nextRound), sp => `والجولة ${sp.nextRound} فرصة ليمحو هذه الجولة من الذاكرة.`),
    vt('sp.motiv.down3', sp => sp.playersCount && sp.rank <= Math.floor(sp.playersCount / 2), () => 'ومكانه في النصف الأول من الجدول يؤكد أن المستوى موجود.'),
    vt('sp.motiv.down4', null, () => 'وكل المشاركين مرّوا بجولة كهذه، والفارق دائمًا في العودة.'),
    vt('sp.motiv.down5', sp => sp.prevPts !== null && sp.prevPts >= 3, () => 'وقبلها بجولة كان في أفضل حالاته، فالعودة مسألة وقت.'),
  ],
};

// الخاتمة (سجع)، حسب مزاج الزاوية
const SPOTLIGHT_CLOSING = {
  up: [
    vt('sp.close.up1', s => Number.isInteger(s.nextRound), sp => `يا ${vkN(sp.name)}، حافظ على النسق، فالجولة ${sp.nextRound} فيها السبق!`),
    vt('sp.close.up2', null, sp => `الطريق ما زال طويلًا، و${vkN(sp.name)} على الدرب يمضي جميلًا!`),
    vt('sp.close.up3', s => Number.isInteger(s.nextRound), sp => `يا ${vkN(sp.name)}، كن على الموعد، فالجولة ${sp.nextRound} تشهد!`),
    vt('sp.close.up4', null, sp => `الجدول يتكلم، و${vkN(sp.name)} يتقدّم!`),
    vt('sp.close.up5', null, sp => `اليوم إنجاز، وغدًا امتياز، فكن يا ${vkN(sp.name)} على أهبة الاستعداد!`),
    vt('sp.close.up6', null, sp => `المشوار ما زال في أوله، و${vkN(sp.name)} يعرف أين يوصله!`),
  ],
  down: [
    vt('sp.close.down1', null, sp => `يا ${vkN(sp.name)}، الموسم طويل، وللعودة سبيل!`),
    vt('sp.close.down2', s => Number.isInteger(s.nextRound), sp => `اليوم ممة، وغدًا همّة، وللجولة ${sp.nextRound} كلمة!`),
    vt('sp.close.down3', null, sp => `لكل جواد كبوة، و${vkN(sp.name)} عائد بقوة!`),
    vt('sp.close.down4', s => Number.isInteger(s.nextRound), sp => `شُدّ الهمّة يا ${vkN(sp.name)}، فالجولة ${sp.nextRound} مهمّة!`),
    vt('sp.close.down5', null, () => 'الجدول لا يُغلق على أحد، والتعويض يبدأ من الغد!'),
  ],
};

if(typeof module !== 'undefined') module.exports = {SPOTLIGHT_ANGLES, SPOTLIGHT_FACTS, SPOTLIGHT_SEASON, SPOTLIGHT_MOTIVATION, SPOTLIGHT_CLOSING, SPOTLIGHT_CONFLICTS, spotlightLength};
