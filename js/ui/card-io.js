/* أدوات التصدير المشتركة للكروت (001-T026، كانت في canvas-cards.js المحذوف): تنزيل PNG، والمشاركة، ومستطيل بزوايا مدوّرة. */

// ---------- تنزيل كانفاس كصورة PNG (مشتركة بين كرت البطل وكرت الترتيب) ----------
// ملاحظتان مهمتان اتضحتا بالاختبار الفعلي (Playwright + كروميوم):
// 1) كروم يتجاهل خاصية download="اسم" على روابط data: (يعتبرها منشأ معزول)
//    فتنزل الصورة باسم "download" بلا امتداد — الحل: toBlob() + Object URL
//    (رابط blob: من نفس أصل الصفحة فيُحترم اسمه بشكل صحيح).
// 2) حتى مع blob:، كروم لا يحترم اسم الملف إذا كان بحروف عربية (يرجع أيضًا
//    "download" بلا امتداد!) — لذلك اسم الملف الفعلي *للتنزيل* لازم يكون
//    إنجليزي/أرقام بحتة. اسم الملف داخل File() للمشاركة عبر navigator.share
//    مسار مختلف (يمر بشيت المشاركة لا سمة download) ويقبل العربي بأمان.
function downloadCanvasPNG(cv, filename){
  cv.toBlob((blob)=>{
    if(!blob) return;
    const url = URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.download=filename;
    a.href=url;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 2000);
  },'image/png');
}

// يحاول فتح شاشة "مشاركة" الجهاز مباشرة (تشمل واتساب) لملف صورة الكانفاس —
// بنفس نمط زر "مشاركة الكرت" الموجود مسبقًا لكرت بطل الجولة، هنا مُعمَّم
// كدالة واحدة يعاد استخدامها بدل تكرار نفس الكود. يرجع true لو نجحت المشاركة
// فعليًا (فيتولى المستدعي عدم عرض رسالة "تم التحميل" لأنه ما صار تحميل).
function tryShareCanvas(cv, filename, shareTitle, shareText){
  return new Promise(resolve=>{
    cv.toBlob(async (blob)=>{
      if(!blob){ resolve(false); return; }
      try{
        const file = new File([blob], filename, {type:'image/png'});
        if(navigator.canShare && navigator.canShare({files:[file]})){
          await navigator.share({files:[file], title:shareTitle||'', text:shareText||''});
          resolve(true);
          return;
        }
      }catch(e){
        // المستخدم ألغى نافذة المشاركة أو فشلت — لا نعتبره خطأ، فقط نرجع false
        // ليكمل المستدعي بالتحميل العادي كخط رجعة.
      }
      resolve(false);
    }, 'image/png');
  });
}


function drawRoundedRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

