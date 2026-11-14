/* أدوات مكتبة الصوت (002-T010، Opus): دوال صافية بلا DOM تستخدمها قوالب js/voice/*.
 *
 * شكل القالب:  { id, needs: ['hero', ...], when: (s, h) => bool, text: (s, h) => string }
 *   s: حالة الجولة (حقائق من البيانات فقط، يبنيها المحرك S48b/S49)، و h: {formatCount, pickForm, formatList}
 *   voiceApply(t, s, h) ← النص، أو null لو متغير ناقص، أو شرط ما انطبق، أو نتج نص فيه undefined/null/NaN.
 * القاعدة (style-guide.md §10): القالب ما يلصق رقمًا بمعدود أبدًا، وكل رقم يمر بـformatCount
 * وكل فعل بـpickForm وكل قائمة بـformatList. */

function vt(id, when, text, needs){
  return {id, when: when || null, text, needs: needs || []};
}

function voiceApply(t, s, h){
  if(!t || !s) return null;
  for(const k of t.needs){ if(s[k] === undefined || s[k] === null) return null; }
  try{
    if(t.when && !t.when(s, h)) return null;
    const out = t.text(s, h);
    if(typeof out !== 'string' || !out.trim() || /undefined|null|NaN|\[object/.test(out)) return null;
    return out;
  }catch(e){ return null; }
}

// القوالب الصالحة لهذه الحالة (بترتيبها في المكتبة)
function voiceEligible(list, s, h){
  return (list || []).filter(t => voiceApply(t, s, h) !== null);
}

// «بـ6 نقاط» · «بنقطتين» · «بنقطة واحدة» (n ≥ 1)
function vkBi(h, n, noun){
  if(!(n >= 1)) throw new RangeError('vkBi: العدد لازم ≥ 1');   // voiceApply يرفض القالب
  const t = h.formatCount(n, noun || 'نقطة', {case: 'acc'});
  return (/^\d/.test(t) ? 'بـ' : 'ب') + t;
}

// تصريف الكنية حسب الإعراب (F-voice-1): «أبو/أبا/أبي» في أول الاسم أو بعد واو العطف
//   'nom' فاعل ومبتدأ وخبر ← أبو · 'gen' بعد حرف جر أو مضاف ← أبي · 'acc' مفعول به ومنادى واسم إنّ ← أبا
// الاسم المخزّن بأي صيغة («أبا عتاب») يتصرّف صح، وباقي الاسم (بين قوسين مثلًا) ما يتغيّر.
function vkName(name, c){
  const f = c === 'gen' ? 'أبي' : c === 'acc' ? 'أبا' : 'أبو';
  return String(name).replace(/(^|\s|و)(أبو|أبا|أبي)(?=\s)/g, (m, pre) => pre + f);
}
const vkN = n => vkName(n, 'nom'), vkG = n => vkName(n, 'gen'), vkA = n => vkName(n, 'acc');
// لام الجر مع الاسم بلا تطويل: «للعندليب» · «لأبي صالح» · «لمصطفى» · «لـ5 مشاركين» (التطويل قبل الرقم فقط)
function vkLi(name){
  const t = vkG(name);
  if(t.startsWith('ال')) return 'ل' + t.slice(1);
  return (/^\d/.test(t) ? 'لـ' : 'ل') + t;
}
// الأسماء: حتى 3 بالعطف «أ، وب، وج»، وأكثر «5 مشاركين»
function vkWho(h, names, c){
  return names.length <= 3 ? h.formatList(names.map(n => vkName(n, c || 'nom'))) : h.formatCount(names.length, 'مشارك');
}
// « (أولهم فلان)» لما يكثر العدد (خبر مرفوع)
function vkFirst(names){
  return names.length > 3 ? ` (أولهم ${vkN(names[0])})` : '';
}
// الفعل حسب عدد الفاعلين
function vkV(h, n, one, two, many){
  return h.pickForm(n, {one, two, many});
}
// ترتيبي مؤنث للممّات والجولات المتتالية (2 ← ثانية …) أو null
function vkOrdinalF(n){
  return ({2: 'ثانية', 3: 'ثالثة', 4: 'رابعة', 5: 'خامسة', 6: 'سادسة'})[n] || null;
}

if(typeof module !== 'undefined') module.exports = {vt, voiceApply, voiceEligible, vkBi, vkName, vkN, vkG, vkA, vkLi, vkWho, vkFirst, vkV, vkOrdinalF};
