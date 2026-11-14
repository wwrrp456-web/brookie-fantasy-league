/* نص قصة الجولة ورسالة الواتساب (002-R20a / S43-1): دوال صافية بلا DOM، تأخذ حقائق جاهزة وتركّب نصًا عربيًا سليمًا
 * (العدد والمعدود بـformatCount، والفعل بـpickForm، والأسماء بـformatList). تُحمَّل بعد ar-format.js.
 *
 *   composeRoundStory({round, leader:{name,total}, chaser:{name,total}|null, climbers:{names,val}, droppers:{names,val}})
 *   composeWhatsAppSummary({round, story, hero:{name,points,tieBreak}|null})
 *
 * الرسالة تقرير سردي قصير: العنوان، وسطر التحديث، وقصة الجولة، وبطل الجولة، وخاتمة ثابتة مؤقتة (يستبدلها S48b بقوالب Opus). بلا جدول ولا مفتاح. */

const WA_CLIMB_VERB = {one: 'صعد', two: 'صعدا', many: 'صعدوا'};
const WA_DROP_VERB = {one: 'تراجع', two: 'تراجعا', many: 'تراجعوا'};

// جملة حركة المراكز لمجموعة متعادلة بنفس القفزة/التراجع. up: صعود (true) أو تراجع (false).
function _waMoveSentence(names, val, up){
  const n = names.length;
  const amount = formatCount(val, 'مركز', {case: 'acc'});   // مركزين · 3 مراكز · 11 مركزًا
  const verbs = up ? WA_CLIMB_VERB : WA_DROP_VERB;
  const verb = pickForm(n, verbs);
  const who = n <= 3 ? formatList(names) : `${formatCount(n, 'مشارك')}`;
  const tail = n > 3 ? ` (أولهم ${names[0]})` : '';
  if(up){
    if(n === 1) return `${who} كان الأكثر صعودًا في جدول الترتيب بقفزة ${amount} دفعة واحدة.`;
    return `${who} ${verb} ${amount} دفعة واحدة في جدول الترتيب${tail}.`;
  }
  return `بالمقابل، ${who} ${verb} ${amount} في الجدول نفسه${tail}.`;
}

function composeRoundStory(d){
  const parts = [];
  const L = d.leader;
  let opener = `بعد الجولة ${d.round}، *${L.name}* يتصدّر جدول الترتيب العام برصيد ${formatCount(L.total, 'نقطة')}`;
  if(d.chaser){
    const gap = L.total - d.chaser.total;
    opener += gap > 0 ? ` بفارق ${formatCount(gap, 'نقطة', {case: 'acc'})} عن ${d.chaser.name}` : ` بتعادل النقاط مع ${d.chaser.name}`;
  }
  parts.push(opener + '.');
  const c = d.climbers || {names: [], val: 0}, p = d.droppers || {names: [], val: 0};
  const hasClimb = c.names.length && c.val >= 2, hasDrop = p.names.length && p.val >= 2;
  if(hasClimb) parts.push(_waMoveSentence(c.names, c.val, true));
  if(hasDrop) parts.push(_waMoveSentence(p.names, p.val, false));
  if(!c.names.length && !p.names.length) parts.push('جدول الترتيب العام لم يشهد أي تغيّر كبير في المراكز هذه الجولة.');
  return parts.join(' ');
}

// رسالة الواتساب بعد حذف الجدول والمفتاح وسطر الحساب والخطوط الفاصلة (قرار المنظّم R-20).
function composeWhatsAppSummary(d){
  let t = `🏆 *دوري بروكي الفانتازي · الموسم الثاني*\n`;
  t += `📅 تحديث بعد الجولة ${d.round}\n`;
  if(d.story) t += `\n📝 ${d.story}\n`;
  if(d.hero){
    const pts = formatCount(d.hero.points, 'نقطة', {case: 'acc'});          // بنقطة واحدة · بنقطتين · بـ6 نقاط · بـ11 نقطة · بلا نقاط
    const withPts = d.hero.points === 0 ? pts : (/^\d/.test(pts) ? 'بـ' : 'ب') + pts;
    t += `\n👑 بطل الجولة: *${d.hero.name}* ${withPts}${d.hero.tieBreak ? ' بعد كسر التعادل' : ''}\n`;
  }
  t += `\nشدّوا الهمّة يا جماعة، فالجولة ${d.round + 1} ما تنتظر أحدًا!`;
  return t;
}
