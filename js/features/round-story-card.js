/* قصة الجولة الساخرة التلقائية (ميزة 5 من حزمة المحتوى الطازج — أُضيفت
 * 15 سبتمبر 2026). فقرة ساخرة قصيرة تُبنى بالكامل من بيانات محسوبة فعليًا
 * (بطل الجولة، الممات، أكبر صاعد/هابط بجدول الترتيب) — لا نص عشوائي غير
 * مرتبط بالبيانات. منفصلة عن buildRoundStory() الجادة المستخدمة بملخص
 * الواتساب (standings-table.js) والتي تتكلم فقط عن جدول الترتيب العام؛
 * هذه نسخة ساخرة تجمع بطل الجولة + الممات + الحركة بنبرة فكاهية خفيفة،
 * وتُعرض كبطاقة مستقلة بتبويب الترتيب العام (وليست جزءًا من نص الواتساب).
 */

// قوالب قصة الجولة (طبقة شعبية، دليل الأسلوب §3 و§5). كل رقم بمعدوده بـformatCount (الدستور 16)، والفعل يطابق الفاعل بـpickForm،
// والمعطوفات بـformatList، وبلا شرطة طويلة داخل الجمل. تدور القوالب حسب رقم الجولة (تنويع ثابت، لا عشوائية حقيقية).
// p.pts مثل «6 نقاط»/«نقطة واحدة»/«نقطتين»، وp.ba جاهزة بحرف الجر («بـ6 نقاط»، «بنقطة واحدة»، «بنقطتين»).
const ROUND_STORY_HERO_OPENERS = [
  p => `الجولة ${p.rn} خلصت و${p.heroName} قاعد يبتسم بهدوء المنتصر ${p.ba}، والبقية يراجعون قراراتهم بالحياة.`,
  p => `${p.heroName} دخل الجولة ${p.rn} بخطة واضحة: يفوز، ويطلع يضحك على الجميع. ونجحت الخطة: ${p.pts} ولا كلمة زيادة.`,
  p => `الكل يلملم أوراقه بعد الجولة ${p.rn}، و${p.heroName} مشغول يحسب كيف يوصّل ${p.pts} بدون ما يعرق.`,
  p => `عاجل من الجولة ${p.rn}: ${p.heroName} خطف الأضواء ${p.ba}، والباقين للحين يدوّرون تفسير علمي لما حصل.`
];

// p.names = «أ» أو «أ وب» أو «أ، وب، وج» أو «4 مشاركين»، وp.n عددهم لمطابقة الفعل
const _RS_SAJJAL = {one: 'سجّل ممة', two: 'سجّلا ممة', many: 'سجّلوا ممة'};   // الفعل مع مفعوله «ممة» لتطابق الفاعل
const _RS_QARRAR = {one: 'قرّر', two: 'قرّرا', many: 'قرّروا'};
const _RS_YAUDD = {one: 'يعدّ', two: 'يعدّان', many: 'يعدّون'};
const ROUND_STORY_MUMMAT_LINES = [
  p => `وفي الطرف الآخر، ${p.names} ${pickForm(p.n, _RS_SAJJAL)} مدوية هذي الجولة، ودقيقة صمت على نقاط راحت وما رجعت.`,
  p => `${p.names} ${pickForm(p.n, _RS_QARRAR)} ${pickForm(p.n, _RS_YAUDD)} الجولة ${p.rn} بلا ولا نقطة، بطولة كاملة بالغياب.`,
  p => `تحية خاصة لـ${p.names}، ممة هذي الجولة، والروح المعنوية إن شاء الله للحين بخير.`
];

// p.amount = «مركزين»/«3 مراكز»/«11 مركزًا» (منصوب)
const ROUND_STORY_CLIMBER_LINES = [
  p => `${p.name} صعد ${p.amount} دفعة وحدة في جدول الترتيب، مصعد كهربائي على طول.`,
  p => `${p.name} قفز ${p.amount} هذي الجولة، والبقية للحين يسألون: «كيف؟!»`
];
const ROUND_STORY_DROPPER_LINES = [
  p => `بالمقابل، ${p.name} طاح ${p.amount}، نزول حر بلا مظلة.`,
  p => `${p.name} خسر ${p.amount} هذي الجولة، سلّم متزحلق بامتياز.`
];

// دالة صافية: d = {rn, hero:{name, points}|null, mummat:[أسماء], climber:{name,val}|null, dropper:{name,val}|null}
function composeSatiricalStory(d){
  if(!d || !d.hero) return '';
  const rn = d.rn;
  const parts = [];
  const pts = formatCount(d.hero.points, 'نقطة', {case: 'acc'});
  parts.push(ROUND_STORY_HERO_OPENERS[rn % ROUND_STORY_HERO_OPENERS.length]({rn, heroName: d.hero.name, pts, ba: arBaPrefix(pts)}));

  const mum = d.mummat || [];
  if(mum.length){
    const names = mum.length <= 3 ? formatList(mum) : formatCount(mum.length, 'مشارك');
    parts.push(ROUND_STORY_MUMMAT_LINES[rn % ROUND_STORY_MUMMAT_LINES.length]({names, n: mum.length, rn}));
  }
  if(d.climber && d.climber.val >= 2){
    parts.push(ROUND_STORY_CLIMBER_LINES[rn % ROUND_STORY_CLIMBER_LINES.length]({name: d.climber.name, amount: formatCount(d.climber.val, 'مركز', {case: 'acc'})}));
  }
  if(d.dropper && d.dropper.val >= 2){
    parts.push(ROUND_STORY_DROPPER_LINES[rn % ROUND_STORY_DROPPER_LINES.length]({name: d.dropper.name, amount: formatCount(d.dropper.val, 'مركز', {case: 'acc'})}));
  }
  return parts.join(' ');
}

function buildSatiricalRoundStory(){
  const heroes = getRoundHeroes();
  if(!heroes || !heroes.top) return '';
  const mv = getMovements();
  let climber = null, dropper = null;
  PARTICIPANTS.forEach(p=>{
    const v = mv[p.id]||0;
    if(v > 0 && (!climber || v > climber.val)) climber = {name: p.name, val: v};
    if(v < 0 && (!dropper || -v > dropper.val)) dropper = {name: p.name, val: -v};
  });
  return composeSatiricalStory({rn: getCurrentRoundNumber(), hero: {name: heroes.top.name, points: heroes.top.points}, mummat: heroes.mummat || [], climber, dropper});
}

function renderRoundStoryCard(){
  const box = document.getElementById('roundStoryCardBox');
  if(!box) return;
  if(DATA.roundStoryEnabled === false){
    box.innerHTML = '';
    return;
  }
  const story = buildSatiricalRoundStory();
  if(!story){
    box.innerHTML = '';
    return;
  }
  box.innerHTML = `
    <div class="round-story-card" id="roundStoryCardCapture">
      <div class="round-story-icon">🎙️</div>
      <div class="round-story-text">${escapeHtml(story)}</div>
    </div>
    <div style="margin-top:8px;">
      <button type="button" class="btn ghost" id="dlRoundStoryBtn">⬇️ تحميل كصورة</button>
    </div>
    <div id="roundStoryMsg"></div>`;
  const dlBtn = document.getElementById('dlRoundStoryBtn');
  if(dlBtn){
    dlBtn.addEventListener('click', ()=>{
      downloadElementAsImage('roundStoryCardCapture', `قصة-الجولة-${getCurrentRoundNumber()}.png`, 'roundStoryMsg', 'dlRoundStoryBtn');
    });
  }
}
