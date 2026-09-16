/* قصة الجولة الساخرة التلقائية (ميزة 5 من حزمة المحتوى الطازج — أُضيفت
 * 15 سبتمبر 2026). فقرة ساخرة قصيرة تُبنى بالكامل من بيانات محسوبة فعليًا
 * (بطل الجولة، الممات، أكبر صاعد/هابط بجدول الترتيب) — لا نص عشوائي غير
 * مرتبط بالبيانات. منفصلة عن buildRoundStory() الجادة المستخدمة بملخص
 * الواتساب (standings-table.js) والتي تتكلم فقط عن جدول الترتيب العام؛
 * هذه نسخة ساخرة تجمع بطل الجولة + الممات + الحركة بنبرة فكاهية خفيفة،
 * وتُعرض كبطاقة مستقلة بتبويب الترتيب العام (وليست جزءًا من نص الواتساب).
 */

// قوالب افتتاحية للبطل — تدور حسب رقم الجولة (تنويع ثابت، لا عشوائية حقيقية
// حتى تبقى النتيجة نفسها لكل من يفتح الصفحة بنفس اللحظة).
const ROUND_STORY_HERO_OPENERS = [
  p => `الجولة ${p.rn} خلصت و${p.heroName} قاعد يبتسم بهدوء المنتصر برصيد ${p.heroPts} نقطة — بينما البقية يراجعون قراراتهم بالحياة.`,
  p => `${p.heroName} دخل الجولة ${p.rn} بخطة واضحة: يفوز، ويطلع يضحك على الجميع. ونجحت الخطة — ${p.heroPts} نقطة ولا كلمة زيادة.`,
  p => `بينما الكل يلملم أوراقه بعد الجولة ${p.rn}، ${p.heroName} كان مشغولًا يحسب كيف يوصّل ${p.heroPts} نقطة بدون ما يعرق.`,
  p => `عاجل من الجولة ${p.rn}: ${p.heroName} سرق الأضواء برصيد ${p.heroPts} نقطة، والباقين لسه يبحثون عن تفسير علمي لما حصل.`
];

const ROUND_STORY_MUMMAT_LINES = [
  p => `وفي الطرف الآخر، ${p.names} سجّلوا صفرًا مدويًا هذي الجولة — لحظة صمت لمن رحلوا نقاطهم بلا رجعة.`,
  p => `${p.names} قرروا يمروا الجولة ${p.rn} بلا أي نقطة، بطولة كاملة بالغياب.`,
  p => `تحية خاصة لـ${p.names} — صفر نقاط هذي الجولة، لكن الروح المعنوية (نتمنى) لسه بخير.`
];

const ROUND_STORY_CLIMBER_LINES = [
  p => `${p.name} صعد ${p.val} مراكز دفعة وحدة بجدول الترتيب — مصعد كهربائي ولا يهمك.`,
  p => `${p.name} قفز ${p.val} مراكز هذي الجولة، والبقية لسه يسألون "كيف؟!"`
];
const ROUND_STORY_DROPPER_LINES = [
  p => `بالمقابل، ${p.name} تراجع ${p.val} مراكز — نزول حر بلا مظلة.`,
  p => `${p.name} خسر ${p.val} مراكز هذي الجولة، سلّم متزحلق بامتياز.`
];

function buildSatiricalRoundStory(){
  const rn = getCurrentRoundNumber();
  const heroes = getRoundHeroes();
  if(!heroes || !heroes.top) return '';
  const mv = getMovements();

  const parts = [];
  const heroOpener = ROUND_STORY_HERO_OPENERS[rn % ROUND_STORY_HERO_OPENERS.length];
  parts.push(heroOpener({rn, heroName: heroes.top.name, heroPts: heroes.top.points}));

  if(heroes.mummat && heroes.mummat.length){
    const namesLabel = heroes.mummat.length<=3 ? heroes.mummat.join('، ') : `${heroes.mummat.length} مشاركين`;
    const mummatLine = ROUND_STORY_MUMMAT_LINES[rn % ROUND_STORY_MUMMAT_LINES.length];
    parts.push(mummatLine({names: namesLabel, rn}));
  }

  let topClimberName = null, topClimberVal = 0;
  let topDropperName = null, topDropperVal = 0;
  PARTICIPANTS.forEach(p=>{
    const v = mv[p.id]||0;
    if(v > topClimberVal){ topClimberVal = v; topClimberName = p.name; }
    if(v < topDropperVal){ topDropperVal = v; topDropperName = p.name; }
  });
  if(topClimberName && topClimberVal >= 2){
    const line = ROUND_STORY_CLIMBER_LINES[rn % ROUND_STORY_CLIMBER_LINES.length];
    parts.push(line({name: topClimberName, val: topClimberVal}));
  }
  if(topDropperName && Math.abs(topDropperVal) >= 2){
    const line = ROUND_STORY_DROPPER_LINES[rn % ROUND_STORY_DROPPER_LINES.length];
    parts.push(line({name: topDropperName, val: Math.abs(topDropperVal)}));
  }

  return parts.join(' ');
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
      <div class="round-story-text">${story}</div>
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
