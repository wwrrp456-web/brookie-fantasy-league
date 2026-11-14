/* بطاقة «منافس الجولة» بالصفحة الأولى (002-R21b / S50، R-21): تقرير رياضي عن منافس واحد من قوالب Opus، يختاره المُختار حتميًا.
 * تُرسم للجميع تحت قصة الجولة. وزر «نسخ للواتساب» للمنظّم فقط (بعد الدخول)، ينسخ نص التقرير بلا HTML ولا إيموجي.
 * الاعتماد: js/voice/spotlight.js (spotlightCurrentReport) وcrests.js (crestHTML) وdom-utils.js (escapeHtml). بلا إيموجي بالواجهة. */

function renderSpotlightCard(){
  const box = document.getElementById('spotlightCardBox');
  if(!box) return;
  let rep = null;
  try{ rep = (typeof spotlightCurrentReport === 'function') ? spotlightCurrentReport() : null; }catch(e){ rep = null; }
  if(!rep){ box.innerHTML = ''; return; }
  const p = PARTICIPANTS.find(x => x.id === rep.id);
  const crests = p ? (p.teams || []).map(c => crestHTML(c, 28)).join('') : '';
  const admin = (typeof isAdmin !== 'undefined') && isAdmin;
  box.innerHTML = `
    <section class="spotlight-card" aria-label="منافس الجولة ${rep.round}">
      <div class="spotlight-head">
        <span class="spotlight-kicker">منافس الجولة ${rep.round}</span>
        <span class="spotlight-angle">${escapeHtml(rep.angleLabel)}</span>
      </div>
      <div class="spotlight-who"><strong class="spotlight-name">${escapeHtml(rep.name)}</strong><span class="spotlight-crests">${crests}</span></div>
      <h3 class="spotlight-title">${escapeHtml(rep.title)}</h3>
      ${rep.paragraphs.map(t => `<p class="spotlight-p">${escapeHtml(t)}</p>`).join('')}
      ${admin ? `<div class="spotlight-actions"><button type="button" class="btn ghost" id="copySpotlightBtn">${ICONS.clipboard} نسخ للواتساب</button></div><div id="spotlightMsg" role="status"></div>` : ''}
    </section>`;
  const btn = document.getElementById('copySpotlightBtn');
  if(btn) btn.addEventListener('click', async () => {
    const msg = document.getElementById('spotlightMsg');
    try{
      await navigator.clipboard.writeText(rep.text);
      msg.innerHTML = '<div class="status-msg ok">تم نسخ التقرير، الصقه في المجموعة بعد تقرير الجولة</div>';
    }catch(e){
      msg.innerHTML = `<textarea class="copy-area" id="spotlightArea" readonly>${escapeHtml(rep.text)}</textarea><div class="status-msg ok">حدّد النص وانسخه يدويًا</div>`;
      const ta = document.getElementById('spotlightArea'); if(ta) ta.select();
    }
  });
}
