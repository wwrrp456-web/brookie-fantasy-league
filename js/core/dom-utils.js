/* أدوات مشتركة صغيرة: نافذة تأكيد مخصصة، نسخ للحافظة، تنسيق الوقت */

function hashStr(s){
  let h = 0;
  for(let i=0;i<s.length;i++){ h = (h<<5) - h + s.charCodeAt(i); h |= 0; }
  return h;
}

// ---------- تعقيم HTML (003-T001، S-07، الدستور 23) ----------
// كل نص يكتبه زائر (جدار، تقارير، نزالات، ردود فعل…) يمر عليها قبل أي innerHTML.
// تهرب & < > " ' فتصلح للنص داخل وسم وللقيمة داخل خاصية ("…" أو '…').
// تقبل أي نوع (رقم، null، undefined) وترجع نصًا.
// نقاط قادمة من بيانات غير موثوقة (تقارير المجتمع): عدد صحيح ← «6 نقاط»، وغيره يُعرض كما هو مهرَّبًا
function pointsLabelSafe(v){
  const n = Number(v);
  return (v !== '' && v != null && Number.isInteger(n) && n >= 0) ? formatCount(n, 'نقطة') : escapeHtml(v);
}

function escapeHtml(v){
  return String(v == null ? '' : v)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
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

// ---------- تباين الألوان (001-T020، SC-09: النص ≥ 4.5:1) ----------
// ألوان المشاركين (PARTICIPANT_COLORS) متدرجة على دائرة الألوان كاملة، فلا تصلح كما هي نصًا على الخلفيتين الداكنة والفاتحة.
// readableColor يعدّل **سطوع** اللون (بدون تغيير الصبغة) لحد ما يحقق التباين المطلوب مع سطح الصفحة الحالي (--paper)،
// وcontrastTextOn يختار لون نص (الحبر أو الأبيض) يقرأ على خلفية ملوّنة. الألوان غير السداسية (var(--…)) ترجع كما هي.
const _rcCache = new Map();
function _rcParse(c){
  const m = /^#([0-9a-f]{6})$/i.exec(String(c || '').trim());
  if(!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function _rcLum(rgb){
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
}
function _rcRatio(a, b){ const la = _rcLum(a), lb = _rcLum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); }
function _rcToHsl(rgb){
  const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if(mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function _rcFromHsl(h, s, l){
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const hue = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return s === 0 ? [l * 255, l * 255, l * 255] : [hue(h + 1 / 3) * 255, hue(h) * 255, hue(h - 1 / 3) * 255];
}
function _rcSurface(){
  if(typeof document === 'undefined') return [16, 16, 46];
  const v = getComputedStyle(document.documentElement).getPropertyValue('--paper');
  return _rcParse(v) || [16, 16, 46];
}
function readableColor(color, min){
  const rgb = _rcParse(color);
  if(!rgb) return color;
  const need = min || 4.6, surf = _rcSurface();
  const key = color + '|' + surf.join(',') + '|' + need;
  if(_rcCache.has(key)) return _rcCache.get(key);
  let out = color;
  if(_rcRatio(rgb, surf) < need){
    const [h, s, l0] = _rcToHsl(rgb);
    const lighter = _rcLum(surf) < 0.4;          // سطح داكن ← نفتّح اللون، سطح فاتح ← نغمّقه
    let l = l0;
    for(let i = 0; i < 40; i++){
      l = lighter ? Math.min(1, l + 0.025) : Math.max(0, l - 0.025);
      const c = _rcFromHsl(h, s, l);
      if(_rcRatio(c, surf) >= need){
        out = '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
        break;
      }
    }
  }
  _rcCache.set(key, out);
  return out;
}
function contrastTextOn(bg){
  const rgb = _rcParse(bg);
  if(!rgb) return 'white';
  const ink = [11, 13, 31];
  return _rcRatio(rgb, ink) >= _rcRatio(rgb, [255, 255, 255]) ? 'var(--ink)' : 'white';
}
