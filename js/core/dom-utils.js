/* أدوات مشتركة صغيرة: نافذة تأكيد مخصصة، نسخ للحافظة، تنسيق الوقت */

function hashStr(s){
  let h = 0;
  for(let i=0;i<s.length;i++){ h = (h<<5) - h + s.charCodeAt(i); h |= 0; }
  return h;
}

// ---------- آخر تحديث ----------
function timeAgo(ts){
  if(!ts) return 'غير معروف';
  const diff = Math.floor((Date.now() - ts)/1000);
  if(diff < 60) return 'قبل لحظات';
  if(diff < 3600) return `قبل ${Math.floor(diff/60)} دقيقة`;
  if(diff < 86400) return `قبل ${Math.floor(diff/3600)} ساعة`;
  const d = Math.floor(diff/86400);
  return d===1 ? 'أمس' : `قبل ${d} يوم`;
}

function isoToDatetimeLocal(iso){
  if(!iso) return '';
  const d = new Date(iso);
  if(isNaN(d.getTime())) return '';
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---------- Admin login ----------
// نافذة تأكيد مخصّصة بهوية الموقع بدل confirm() الافتراضي القبيح للمتصفح —
// طلب المستخدم (6 سبتمبر 2026) ضمن تنظيف لوحة المنظم. تُرجع Promise<boolean>
// بدل قيمة فورية، فكل استدعاء لها لازم يكون بـawait داخل دالة async.
function customConfirm(message, opts={}){
  return new Promise(resolve=>{
    const overlay = document.createElement('div');
    overlay.className = 'custom-confirm-overlay';
    overlay.innerHTML = `
      <div class="custom-confirm-box">
        <div class="custom-confirm-msg">${message.replace(/\n/g,'<br>')}</div>
        <div class="custom-confirm-actions">
          <button type="button" class="btn ghost cc-cancel">إلغاء</button>
          <button type="button" class="btn cc-confirm" style="background:var(--coral);border-color:var(--coral);color:#fff;">${opts.confirmText || 'تأكيد'}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    function cleanup(result){
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      resolve(result);
    }
    function onKey(e){ if(e.key === 'Escape') cleanup(false); }
    overlay.querySelector('.cc-cancel').addEventListener('click', ()=>cleanup(false));
    overlay.querySelector('.cc-confirm').addEventListener('click', ()=>cleanup(true));
    overlay.addEventListener('click', (e)=>{ if(e.target === overlay) cleanup(false); });
    document.addEventListener('keydown', onKey);
  });
}

// رقاقات "الجولات المحفوظة" داخل قسم "➕ إضافة أو تعديل جولة" — تسمح للمنظم
// يرجع يعدّل بيانات جولة ماضية باكتشاف خطأ بحساباتها بعد إدخالها، بضغطة وحدة
// بدل ما يحتاج يتذكر رقمها ويكتبه يدويًا بالحقل (طلب المستخدم 6 سبتمبر 2026).
// التعديل الفعلي كان موجودًا أصلًا (كتابة رقم جولة محفوظة تفتحها للتعديل) —
// هذي الرقاقات فقط تكشف الإمكانية وتغني عن الكتابة اليدوية.
// تقريب فرق زمني بصيغة عربية مبسّطة ("قبل 3 أيام"، "قبل ساعتين"...) — يُستخدم
// لرقاقات الجولات المحفوظة (تاريخ آخر تعديل) ولبانر المسودة التلقائية غير
// المحفوظة (طلب المستخدم 7 سبتمبر 2026). تقريب مقصود وليس دقيقًا لغويًا
// بكل صيغ الجمع العربية — كافٍ لأداة إدارية داخلية.
function timeAgoLabel(ts){
  if(!ts) return '';
  const diff = Date.now() - ts;
  if(diff < 0) return 'الآن';
  const min = Math.floor(diff / 60000);
  if(min < 1) return 'قبل لحظات';
  if(min < 60) return `قبل ${min} دقيقة`;
  const hr = Math.floor(min / 60);
  if(hr < 24) return `قبل ${hr} ساعة`;
  const day = Math.floor(hr / 24);
  return `قبل ${day} يوم`;
}

// نسخ نص للحافظة مع تأكيد بصري مؤقت على نفس الزر — بدل تحديد النص يدويًا
// بالماوس قبل نسخه (طلب المستخدم 6 سبتمبر 2026: رموز المشاركين وروابط QR
// تُرسَل يدويًا واحدًا واحدًا بواتساب، فالنسخ السريع يوفّر خطوة متكررة).
async function copyToClipboardWithFeedback(text, btn){
  if(!text) return;
  let ok = true;
  try{
    await navigator.clipboard.writeText(text);
  }catch(e){
    // بديل لو الحافظة غير متاحة (مثلاً بدون HTTPS بمتصفح قديم)
    try{
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }catch(e2){ ok = false; }
  }
  if(btn){
    const original = btn.textContent;
    btn.textContent = ok ? '✅ تم النسخ' : '⚠️ تعذّر النسخ';
    btn.disabled = true;
    setTimeout(()=>{ btn.textContent = original; btn.disabled = false; }, 1500);
  }
}
