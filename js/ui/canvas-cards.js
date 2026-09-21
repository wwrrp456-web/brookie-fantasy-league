/* كل دوال بناء بطاقات Canvas (بطاقة البطل، بطاقة الترتيب، الشهادة...) وتقرير الموسم القابل للطباعة */

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

// ---------- كرت بطل الجولة (صورة قابلة للمشاركة) ----------
function drawRoundedRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

// يصغّر حجم الخط تدريجيًا حتى يدخل النص ضمن العرض المتاح — يمنع خروج الأسماء
// الطويلة (مثل "أبو تغريد (زيد)") عن حدود الكرت في الصور القابلة للمشاركة
// (خطأ اكتُشف ومنع 3 سبتمبر 2026).
function fitFontSize(ctx, text, maxWidth, fontSpec, minSize){
  let size = fontSpec.size;
  while(size > (minSize||24)){
    ctx.font = `${fontSpec.weight} ${size}px ${fontSpec.family}`;
    if(ctx.measureText(text).width <= maxWidth) break;
    size -= 4;
  }
  return size;
}

// يقسّم نصًا طويلًا (فقرة تقدير بشهادة التكريم مثلًا) إلى أسطر تدخل ضمن
// عرض معيّن، بالاعتماد على قياس عرض كل كلمة فعليًا بنفس الخط الحالي لـctx
// (يجب ضبط ctx.font قبل استدعائها) — بدل نص واحد قد يتجاوز حدود الكانفاس
// (21 سبتمبر 2026، لشهادة تكريم البطل).
function wrapCanvasText(ctx, text, maxWidth){
  const words = text.split(' ');
  const lines = [];
  let current = '';
  words.forEach(word=>{
    const test = current ? `${current} ${word}` : word;
    if(current && ctx.measureText(test).width > maxWidth){
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  });
  if(current) lines.push(current);
  return lines;
}

// ---------- علامة شعار البطولة على كل بطاقة/شهادة/ستوري تُصدَّر كصورة ----------
// تُثبَّت بالزاوية العلوية اليمنى لكل كرت يُصدَّره الموقع (بطل الجولة، الترتيب،
// ملخص الموسم، شهادة البطل، نسخ الستوري)، عشان يبان واضح إنها بطاقات دوري
// بروكي عند مشاركتها بستوريات واتساب/انستغرام. حجم صغير وزاوية فارغة دائمًا
// (كل عناوين الكروت متمركزة نصيًا في المنتصف)، فلا تتعارض مع أي تصميم موجود
// (10 سبتمبر 2026، بطلب المستخدم).
let _cardLogoImg = null, _cardLogoPromise = null;
function loadCardLogoImage(){
  if(_cardLogoImg) return Promise.resolve(_cardLogoImg);
  if(_cardLogoPromise) return _cardLogoPromise;
  _cardLogoPromise = new Promise(resolve=>{
    const img = new Image();
    img.onload = ()=>{ _cardLogoImg = img; resolve(img); };
    img.onerror = ()=> resolve(null);
    // النسخة البيضاء من الشعار (نفس شعار الهيدر بالوضع الداكن) — كل كروت
    // المشاركة بخلفية داكنة موحّدة (#040421 → #000000 أو مشابه).
    img.src = LOGO_BASE64;
  });
  return _cardLogoPromise;
}
async function drawCardBrandMark(ctx, W, margin){
  try{
    const img = await loadCardLogoImage();
    if(!img || !img.naturalWidth) return;
    const m = margin===undefined ? 26 : margin;
    const logoW = Math.max(56, Math.min(100, W*0.1));
    const logoH = logoW * (img.naturalHeight / img.naturalWidth);
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.drawImage(img, W - m - logoW, m, logoW, logoH);
    ctx.restore();
  }catch(e){}
}

async function buildChampionCard(){
  const h = getRoundHeroes();
  if(!h) return null;
  const st = computeStandings();
  const champStanding = st.find(x=>x.id===h.top.id);
  const champRank = st.findIndex(x=>x.id===h.top.id)+1;
  const mv = getMovements();

  const W=800, H=1000;
  const cv = document.createElement('canvas');
  cv.width=W; cv.height=H;
  const ctx = cv.getContext('2d');

  // خلفية متدرجة
  const g = ctx.createLinearGradient(0,0,W,H);
  g.addColorStop(0,'#040421'); g.addColorStop(0.55,'#06061A'); g.addColorStop(1,'#000000');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);

  // أشعة خلفية
  ctx.save(); ctx.globalAlpha=0.07; ctx.translate(W/2,330);
  for(let i=0;i<12;i++){
    ctx.rotate(Math.PI/6);
    ctx.fillStyle='#16A6EA';
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-45,-620); ctx.lineTo(45,-620); ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  // إطار ذهبي
  ctx.strokeStyle='#7A52EE'; ctx.lineWidth=6;
  drawRoundedRect(ctx,18,18,W-36,H-36,26); ctx.stroke();

  await drawCardBrandMark(ctx, W);

  ctx.textAlign='center';

  // العنوان العلوي
  ctx.fillStyle='#9B7BF5'; ctx.font='700 30px Tajawal, Arial';
  ctx.fillText('دوري بروكي الفانتازي — الموسم الثاني', W/2, 82);

  ctx.strokeStyle='rgba(155,123,245,0.35)'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(120,104); ctx.lineTo(W-120,104); ctx.stroke();

  // الكأس
  ctx.font='120px serif'; ctx.fillText('🏆', W/2, 240);

  // بطل الجولة
  ctx.fillStyle='#16A6EA'; ctx.font='800 44px Tajawal, Arial';
  ctx.fillText(`بطل الجولة ${h.roundNumber}`, W/2, 320);

  // الاسم (حجم الخط يتصاغر تلقائيًا للأسماء الطويلة حتى لا يخرج عن حدود الكرت)
  ctx.fillStyle='#FFFFFF';
  const nameSize = fitFontSize(ctx, h.top.name, W-80, {size:82, weight:'800', family:'Tajawal, Arial'}, 40);
  ctx.font = `800 ${nameSize}px Tajawal, Arial`;
  ctx.fillText(h.top.name, W/2, 420);

  // نقاط الجولة
  const bw=420, bx=(W-bw)/2;
  ctx.fillStyle='rgba(22,166,234,0.16)';
  drawRoundedRect(ctx,bx,455,bw,110,18); ctx.fill();
  ctx.strokeStyle='rgba(22,166,234,0.5)'; ctx.lineWidth=2;
  drawRoundedRect(ctx,bx,455,bw,110,18); ctx.stroke();

  ctx.fillStyle='#16A6EA'; ctx.font='800 62px Tajawal, Arial';
  ctx.fillText(`${h.top.points}`, W/2-100, 530);
  ctx.fillStyle='#D8D8D8'; ctx.font='700 28px Tajawal, Arial';
  ctx.fillText('نقطة هذه الجولة', W/2+70, 528);

  // ملاحظة كسر التعادل (إن وُجدت) — خارج صندوق النقاط عشان ما تطلع النص خارج حدوده
  if(h.top.tieBreak){
    ctx.fillStyle='#A9A8D6'; ctx.font='600 22px Tajawal, Arial';
    ctx.fillText('⚖️ تم حسمها بكسر تعادل (الأكثر أهدافًا)', W/2, 592);
  }

  // أنديته
  ctx.fillStyle='#A9A8D6'; ctx.font='600 24px Tajawal, Arial';
  ctx.fillText('أنديته', W/2, 620);
  ctx.fillStyle='#FFFFFF'; ctx.font='700 30px Tajawal, Arial';
  ctx.fillText(h.top.teams.join('  ·  '), W/2, 662);

  // شريط الإحصاءات
  const sy=710, sh=120;
  ctx.fillStyle='rgba(255,255,255,0.05)';
  drawRoundedRect(ctx,60,sy,W-120,sh,16); ctx.fill();

  const cells=[
    {v:`${champStanding.total}`, l:'إجمالي النقاط'},
    {v:`${champRank}`, l:'المركز العام'},
    {v:(mv[h.top.id]>0?`▲${mv[h.top.id]}`:(mv[h.top.id]<0?`▼${Math.abs(mv[h.top.id])}`:'—')), l:'حركة المركز'}
  ];
  cells.forEach((cell,i)=>{
    const cx = 60 + (W-120)/6 + i*((W-120)/3);
    ctx.fillStyle = i===2 && mv[h.top.id]>0 ? '#3DD47E' : (i===2 && mv[h.top.id]<0 ? '#FF6B5E' : '#FFFFFF');
    ctx.font='800 44px Tajawal, Arial';
    ctx.fillText(cell.v, cx, sy+58);
    ctx.fillStyle='#9C9BC9'; ctx.font='600 21px Tajawal, Arial';
    ctx.fillText(cell.l, cx, sy+94);
  });

  // الممات
  if(h.mummat.length){
    ctx.fillStyle='#FF8A7A'; ctx.font='700 26px Tajawal, Arial';
    const txt = h.mummat.length<=3 ? h.mummat.join('، ') : `${h.mummat.length} لاعبين`;
    ctx.fillText(`💀 ممة هذه الجولة: ${txt}`, W/2, 890);
  } else {
    ctx.fillStyle='#3DD47E'; ctx.font='700 26px Tajawal, Arial';
    ctx.fillText('✨ لا توجد ممات هذه الجولة', W/2, 890);
  }

  // تذييل
  ctx.fillStyle='#7B7AA8'; ctx.font='600 22px Tajawal, Arial';
  ctx.fillText('فوز = 3  ·  تعادل = 1  ·  خسارة = 0', W/2, 946);

  return cv;
}

// ---------- نسخة ستوري عمودية (1080×1920) من أي كرت جاهز ----------
// تُعيد استخدام الكرت الأصلي (بطل الجولة أو الترتيب) كصورة مُركَّبة داخل
// إطار عمودي مناسب لحالة الواتساب/الستوري، بدل إعادة رسم كل التفاصيل من
// الصفر بأبعاد جديدة — أضمن وأقل عرضة للأخطاء.
async function buildStoryCanvas(sourceCanvas){
  const W = 1080, H = 1920;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');

  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#040421'); g.addColorStop(0.55,'#06061A'); g.addColorStop(1,'#000000');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

  await drawCardBrandMark(ctx, W, 42);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#9B7BF5'; ctx.font = '800 42px Tajawal, Arial';
  ctx.fillText('🏆 دوري بروكي الفانتازي', W/2, 96);
  ctx.fillStyle = '#A9A8D6'; ctx.font = '600 26px Tajawal, Arial';
  ctx.fillText('الموسم الثاني', W/2, 136);

  const marginTop = 190, marginBottom = 130;
  const availH = H - marginTop - marginBottom;
  const srcW = sourceCanvas.width, srcH = sourceCanvas.height;
  const scale = Math.min((W*0.9)/srcW, availH/srcH);
  const dw = srcW*scale, dh = srcH*scale;
  const dx = (W-dw)/2, dy = marginTop + (availH-dh)/2;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 45;
  ctx.drawImage(sourceCanvas, dx, dy, dw, dh);
  ctx.restore();

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#7B7AA8'; ctx.font = '600 24px Tajawal, Arial';
  ctx.fillText('شارك الستوري 📲', W/2, H-56);

  return cv;
}

async function showChampionCard(){
  const box = document.getElementById('copyBox');
  const h = getRoundHeroes();
  if(!h){
    box.innerHTML = '<div class="status-msg err">لا توجد جولات مسجّلة بعد — كرت البطل يظهر بعد أول جولة.</div>';
    return;
  }
  box.innerHTML = '<p style="text-align:center;color:var(--muted);font-size:0.85rem;">جارٍ تجهيز الكرت…</p>';

  try{ if(document.fonts && document.fonts.ready) await document.fonts.ready; }catch(e){}

  const cv = await buildChampionCard();
  box.innerHTML = '';
  cv.id='championCanvas';
  box.appendChild(cv);
  fireConfetti();

  const acts = document.createElement('div');
  acts.className='champ-actions';
  acts.innerHTML = `
    <button class="btn" id="shareCardBtn">📤 مشاركة الكرت</button>
    <button class="btn secondary" id="dlCardBtn">⬇️ تحميل الصورة</button>
    <button class="btn secondary" id="storyCardBtn">📱 نسخة ستوري</button>
    <button class="btn ghost" id="closeCardBtn">إغلاق</button>`;
  box.appendChild(acts);
  const msg = document.createElement('div'); box.appendChild(msg);

  document.getElementById('dlCardBtn').onclick = ()=>{
    downloadCanvasPNG(cv, `brookie-round-${h.roundNumber}-champion.png`);
  };

  document.getElementById('storyCardBtn').onclick = async ()=>{
    const storyBtn = document.getElementById('storyCardBtn');
    storyBtn.disabled = true;
    const storyCv = await buildStoryCanvas(cv);
    downloadCanvasPNG(storyCv, `brookie-round-${h.roundNumber}-champion-story.png`);
    storyBtn.disabled = false;
  };

  document.getElementById('shareCardBtn').onclick = ()=>{
    cv.toBlob(async (blob)=>{
      if(!blob) return;
      const file = new File([blob], `بطل-الجولة-${h.roundNumber}.png`, {type:'image/png'});
      if(navigator.canShare && navigator.canShare({files:[file]})){
        try{
          await navigator.share({files:[file], title:'بطل الجولة', text:`👑 بطل الجولة ${h.roundNumber}: ${h.top.name} بـ ${h.top.points} نقطة`});
        }catch(e){}
      }else{
        downloadCanvasPNG(cv, `brookie-round-${h.roundNumber}-champion.png`);
        msg.innerHTML='<div class="status-msg ok">تم تحميل الصورة — أرسلها في الجروب 📲</div>';
      }
    },'image/png');
  };

  document.getElementById('closeCardBtn').onclick = ()=>{ box.innerHTML=''; };
}

// ---------- ملخّص نهاية الموسم القابل للمشاركة (خاص بالمنظم) ----------
// يجمع أبرز أرقام الموسم في كرت واحد بنفس هوية كرت بطل الجولة، على نمط
// "الملخص السنوي" لتطبيقات الموسيقى — مصمم ليُنشر في المجموعة عند نهاية
// الموسم أو أي وقت يرغب فيه المنظم بلمحة شاملة.
function getSeasonWrapStats(){
  const st = computeStandings();
  const leader = st[0] || null;

  // أفضل أداء فردي بجولة واحدة عبر كامل الموسم (تشمل جسر الجولة 2 وكل
  // الجولات الحقيقية 3 فصاعدًا)
  let bestRound = {name:'', points:-Infinity, round:null};
  const bridgePts = getRound2BridgePointsMap();
  PARTICIPANTS.forEach(p=>{
    if(bridgePts[p.id] > bestRound.points) bestRound = {name:p.name, points:bridgePts[p.id], round:2};
  });
  DATA.rounds.forEach(round=>{
    const stats = computeRoundStats(round);
    PARTICIPANTS.forEach(p=>{
      if(stats[p.id].points > bestRound.points) bestRound = {name:p.name, points:stats[p.id].points, round:round.number};
    });
  });

  // الأكثر توقعًا صحيحًا — نفس ترتيب لوحة المتصدرين في قسم التوقعات
  const acc = computePredictionAccuracy();
  const predRanked = PARTICIPANTS
    .map(p=>({name:p.name, correct:acc[p.id].correct, total:acc[p.id].total}))
    .filter(a=>a.total>0)
    .sort((a,b)=> b.correct-a.correct || (b.correct/b.total)-(a.correct/a.total));
  const topPredictor = predRanked[0] || null;

  // أطول سلسلة جولات متتالية بدون ممة (bestStreak محسوبة أصلاً في computeStandings)
  let bestStreakOwner = {name:'', streak:0};
  st.forEach(s=>{
    if(s.bestStreak > bestStreakOwner.streak) bestStreakOwner = {name:s.name, streak:s.bestStreak};
  });

  return {leader, bestRound, topPredictor, bestStreakOwner};
}

async function buildSeasonWrapCard(){
  const stats = getSeasonWrapStats();
  const roundNum = getCurrentRoundNumber();
  const W=800, H=1100;
  const cv = document.createElement('canvas');
  cv.width=W; cv.height=H;
  const ctx = cv.getContext('2d');

  const g = ctx.createLinearGradient(0,0,W,H);
  g.addColorStop(0,'#040421'); g.addColorStop(0.55,'#06061A'); g.addColorStop(1,'#000000');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);

  ctx.save(); ctx.globalAlpha=0.07; ctx.translate(W/2,300);
  for(let i=0;i<12;i++){
    ctx.rotate(Math.PI/6);
    ctx.fillStyle='#16A6EA';
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-45,-620); ctx.lineTo(45,-620); ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  ctx.strokeStyle='#7A52EE'; ctx.lineWidth=6;
  drawRoundedRect(ctx,18,18,W-36,H-36,26); ctx.stroke();

  await drawCardBrandMark(ctx, W);

  ctx.textAlign='center';
  ctx.fillStyle='#9B7BF5'; ctx.font='700 30px Tajawal, Arial';
  ctx.fillText('دوري بروكي الفانتازي — الموسم الثاني', W/2, 82);
  ctx.strokeStyle='rgba(155,123,245,0.35)'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(120,104); ctx.lineTo(W-120,104); ctx.stroke();

  ctx.font='96px serif'; ctx.fillText('📊', W/2, 218);

  ctx.fillStyle='#16A6EA'; ctx.font='800 40px Tajawal, Arial';
  ctx.fillText(`ملخّص الموسم حتى الجولة ${roundNum}`, W/2, 288);

  const cardsData = [
    {emoji:'👑', label:'متصدّر الترتيب', value: stats.leader ? `${stats.leader.name} — ${stats.leader.total} نقطة` : '—'},
    {emoji:'🔥', label:'أفضل أداء بجولة واحدة', value: stats.bestRound.round ? `${stats.bestRound.name} — ${stats.bestRound.points} نقطة (الجولة ${stats.bestRound.round})` : '—'},
    {emoji:'🔮', label:'الأكثر توقعًا صحيحًا', value: stats.topPredictor ? `${stats.topPredictor.name} — ${stats.topPredictor.correct}/${stats.topPredictor.total}` : 'لا توجد توقعات كافية بعد'},
    {emoji:'⚡', label:'أطول سلسلة بدون ممة', value: stats.bestStreakOwner.streak>0 ? `${stats.bestStreakOwner.name} — ${stats.bestStreakOwner.streak} ${stats.bestStreakOwner.streak===1?'جولة':'جولات'}` : '—'}
  ];

  let y = 335;
  const cardH = 150, cardGap = 20, cardW = W-100, cardX=50;
  cardsData.forEach(c=>{
    ctx.fillStyle='rgba(255,255,255,0.05)';
    drawRoundedRect(ctx, cardX, y, cardW, cardH, 16); ctx.fill();
    ctx.strokeStyle='rgba(22,166,234,0.25)'; ctx.lineWidth=1.5;
    drawRoundedRect(ctx, cardX, y, cardW, cardH, 16); ctx.stroke();

    ctx.font='44px serif'; ctx.fillText(c.emoji, W/2, y+52);
    ctx.fillStyle='#A9A8D6'; ctx.font='600 22px Tajawal, Arial';
    ctx.fillText(c.label, W/2, y+86);
    ctx.fillStyle='#FFFFFF';
    const valSize = fitFontSize(ctx, c.value, cardW-60, {size:28, weight:'800', family:'Tajawal, Arial'}, 18);
    ctx.font = `800 ${valSize}px Tajawal, Arial`;
    ctx.fillText(c.value, W/2, y+126);

    y += cardH + cardGap;
  });

  ctx.fillStyle='#7B7AA8'; ctx.font='600 22px Tajawal, Arial';
  ctx.fillText('فوز = 3  ·  تعادل = 1  ·  خسارة = 0', W/2, H-40);

  return cv;
}

async function showSeasonWrapCard(){
  const box = document.getElementById('copyBox');
  if(!box) return;
  box.innerHTML = '<p style="text-align:center;color:var(--muted);font-size:0.85rem;">جارٍ تجهيز ملخص الموسم…</p>';

  try{ if(document.fonts && document.fonts.ready) await document.fonts.ready; }catch(e){}

  const cv = await buildSeasonWrapCard();
  box.innerHTML = '';
  cv.id = 'seasonWrapCanvas';
  box.appendChild(cv);

  const roundNum = getCurrentRoundNumber();
  const acts = document.createElement('div');
  acts.className = 'champ-actions';
  acts.innerHTML = `
    <button class="btn" id="shareWrapBtn">📤 مشاركة الملخص</button>
    <button class="btn secondary" id="dlWrapBtn">⬇️ تحميل الصورة</button>
    <button class="btn secondary" id="storyWrapBtn">📱 نسخة ستوري</button>
    <button class="btn ghost" id="closeWrapBtn">إغلاق</button>`;
  box.appendChild(acts);
  const msg = document.createElement('div'); box.appendChild(msg);

  document.getElementById('dlWrapBtn').onclick = ()=>{
    downloadCanvasPNG(cv, `brookie-season-wrap-round-${roundNum}.png`);
  };

  document.getElementById('storyWrapBtn').onclick = async ()=>{
    const btn = document.getElementById('storyWrapBtn');
    btn.disabled = true;
    const storyCv = await buildStoryCanvas(cv);
    downloadCanvasPNG(storyCv, `brookie-season-wrap-round-${roundNum}-story.png`);
    btn.disabled = false;
  };

  document.getElementById('shareWrapBtn').onclick = async ()=>{
    const shared = await tryShareCanvas(cv, 'ملخص-الموسم.png', 'ملخص الموسم', `📊 ملخص دوري بروكي الفانتازي حتى الجولة ${roundNum}`);
    if(!shared){
      downloadCanvasPNG(cv, `brookie-season-wrap-round-${roundNum}.png`);
      msg.innerHTML = '<div class="status-msg ok">جهازك لا يدعم المشاركة المباشرة — تم تحميل الصورة بدلاً منها 📲</div>';
    } else {
      msg.innerHTML = '<div class="status-msg ok">تم فتح المشاركة ✅</div>';
    }
  };

  document.getElementById('closeWrapBtn').onclick = ()=>{ box.innerHTML=''; };
}

// ---------- كرت الترتيب العام (صورة قابلة للمشاركة — متاحة للجميع) ----------
async function buildStandingsCard(){
  const st = computeStandings();
  const mv = getMovements();
  const roundNum = getCurrentRoundNumber();
  const n = st.length;

  const W = 900;
  const headH = 190;
  const rowH = 56;
  const footH = 70;
  const H = headH + n*rowH + footH;

  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');

  // خلفية متدرجة (نفس هوية كرت البطل)
  const g = ctx.createLinearGradient(0,0,W,H);
  g.addColorStop(0,'#040421'); g.addColorStop(0.5,'#06061A'); g.addColorStop(1,'#000000');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);

  // إطار ذهبي
  ctx.strokeStyle='#7A52EE'; ctx.lineWidth=6;
  drawRoundedRect(ctx,14,14,W-28,H-28,22); ctx.stroke();

  await drawCardBrandMark(ctx, W);

  ctx.textAlign='center';

  // العنوان
  ctx.fillStyle='#9B7BF5'; ctx.font='700 28px Tajawal, Arial';
  ctx.fillText('دوري بروكي الفانتازي — الموسم الثاني', W/2, 56);
  ctx.fillStyle='#16A6EA'; ctx.font='800 40px Tajawal, Arial';
  ctx.fillText(`🏆 الترتيب العام — بعد الجولة ${roundNum}`, W/2, 108);

  ctx.strokeStyle='rgba(155,123,245,0.35)'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(60,132); ctx.lineTo(W-60,132); ctx.stroke();

  // رؤوس الأعمدة (RTL: المركز يمين، النقاط يسار)
  const colRank = W-70, colName = W-150, colPts = 90, colMv = 190;
  ctx.fillStyle='#9C9BC9'; ctx.font='700 20px Tajawal, Arial';
  ctx.textAlign='center';
  ctx.fillText('#', colRank, 168);
  ctx.fillText('النقاط', colPts, 168);
  ctx.fillText('الحركة', colMv, 168);
  ctx.textAlign='right';
  ctx.fillText('المتسابق', colName, 168);

  // الصفوف
  st.forEach((s,i)=>{
    const rank = i+1;
    const y = headH + i*rowH;
    const isTop3 = rank<=3;

    // خلفية الصف (تبادل + تمييز أول 3 مراكز)
    if(isTop3){
      ctx.fillStyle = rank===1 ? 'rgba(22,166,234,0.18)' : rank===2 ? 'rgba(200,200,200,0.12)' : 'rgba(205,127,50,0.12)';
    } else {
      ctx.fillStyle = i%2===0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.015)';
    }
    drawRoundedRect(ctx, 40, y+4, W-80, rowH-8, 10); ctx.fill();

    // شريط لوني يسار الصف لأصحاب أعلى 3 مراكز
    if(isTop3){
      ctx.fillStyle = rank===1 ? '#16A6EA' : rank===2 ? '#C0C0C0' : '#CD7F32';
      drawRoundedRect(ctx, 40, y+4, 6, rowH-8, 3); ctx.fill();
    }

    const midY = y + rowH/2 + 8;

    // رقم المركز
    ctx.textAlign='center';
    ctx.fillStyle = isTop3 ? (rank===1?'#16A6EA':rank===2?'#E4E4E4':'#E0A468') : '#FFFFFF';
    ctx.font = isTop3 ? '800 26px Tajawal, Arial' : '700 24px Tajawal, Arial';
    ctx.fillText(`${rank}`, colRank, midY);

    // الاسم
    ctx.textAlign='right';
    ctx.fillStyle='#FFFFFF';
    ctx.font = isTop3 ? '800 25px Tajawal, Arial' : '700 23px Tajawal, Arial';
    ctx.fillText(s.name, colName-30, midY);

    // النقاط
    ctx.textAlign='center';
    ctx.fillStyle='#16A6EA';
    ctx.font='800 26px Tajawal, Arial';
    ctx.fillText(`${s.total}`, colPts, midY);

    // الحركة
    const delta = mv[s.id];
    ctx.font='700 22px Tajawal, Arial';
    if(!delta){
      ctx.fillStyle='#9C9BC9';
      ctx.fillText('—', colMv, midY);
    } else if(delta>0){
      ctx.fillStyle='#3DD47E';
      ctx.fillText(`▲${delta}`, colMv, midY);
    } else {
      ctx.fillStyle='#FF6B5E';
      ctx.fillText(`▼${Math.abs(delta)}`, colMv, midY);
    }
  });

  // تذييل
  ctx.textAlign='center';
  ctx.fillStyle='#7B7AA8'; ctx.font='600 20px Tajawal, Arial';
  ctx.fillText('فوز = 3  ·  تعادل = 1  ·  خسارة = 0', W/2, H-30);

  return cv;
}

// كرت "ستوري" مخصّص للترتيب (لا يستخدم buildStoryCanvas العام): تصميم طويل
// رأسي 1080×1920 يعرض مباشرة أول 6 مراكز + آخر 3 مراكز (بدل تصغير كل الـ18
// صفًا بكرت واحد) — لأن مساحة ستوري الواتساب طويلة وتتحمّل تفاصيل أوضح.
async function buildStandingsStoryCanvas(){
  const st = computeStandings();
  const mv = getMovements();
  const roundNum = getCurrentRoundNumber();
  const n = st.length;

  const W = 1080, H = 1920;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');

  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#040421'); g.addColorStop(0.55,'#06061A'); g.addColorStop(1,'#000000');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

  ctx.strokeStyle='#7A52EE'; ctx.lineWidth=6;
  drawRoundedRect(ctx,20,20,W-40,H-40,28); ctx.stroke();

  await drawCardBrandMark(ctx, W, 42);

  ctx.textAlign='center';
  ctx.fillStyle='#9B7BF5'; ctx.font='700 34px Tajawal, Arial';
  ctx.fillText('🏆 دوري بروكي الفانتازي', W/2, 90);
  ctx.fillStyle='#A9A8D6'; ctx.font='600 26px Tajawal, Arial';
  ctx.fillText('الموسم الثاني', W/2, 128);
  ctx.fillStyle='#16A6EA'; ctx.font='800 44px Tajawal, Arial';
  ctx.fillText(`الترتيب العام — بعد الجولة ${roundNum}`, W/2, 190);

  ctx.strokeStyle='rgba(155,123,245,0.35)'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(70,214); ctx.lineTo(W-70,214); ctx.stroke();

  const colRank = W-110, colName = W-190, colPts = 130, colMv = 260;
  const rowH = 150;

  function drawStoryHeaderRow(y){
    ctx.fillStyle='#9C9BC9'; ctx.font='700 24px Tajawal, Arial';
    ctx.textAlign='center';
    ctx.fillText('#', colRank, y);
    ctx.fillText('النقاط', colPts, y);
    ctx.fillText('الحركة', colMv, y);
    ctx.textAlign='right';
    ctx.fillText('المتسابق', colName, y);
    ctx.textAlign='center';
  }

  function drawStoryRow(s, rank, y){
    const isTop3 = rank<=3;
    const isBottom3 = rank > n-3;
    if(isTop3){
      ctx.fillStyle = rank===1 ? 'rgba(22,166,234,0.18)' : rank===2 ? 'rgba(200,200,200,0.12)' : 'rgba(205,127,50,0.12)';
    } else if(isBottom3){
      ctx.fillStyle = 'rgba(255,107,94,0.10)';
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
    }
    drawRoundedRect(ctx, 60, y+6, W-120, rowH-12, 14); ctx.fill();

    if(isTop3){
      ctx.fillStyle = rank===1 ? '#16A6EA' : rank===2 ? '#C0C0C0' : '#CD7F32';
      drawRoundedRect(ctx, 60, y+6, 8, rowH-12, 4); ctx.fill();
    } else if(isBottom3){
      ctx.fillStyle = '#FF6B5E';
      drawRoundedRect(ctx, 60, y+6, 8, rowH-12, 4); ctx.fill();
    }

    const midY = y + rowH/2 + 12;

    ctx.textAlign='center';
    ctx.fillStyle = isTop3 ? (rank===1?'#16A6EA':rank===2?'#E4E4E4':'#E0A468') : (isBottom3 ? '#FF6B5E' : '#FFFFFF');
    ctx.font = isTop3 ? '800 44px Tajawal, Arial' : '700 40px Tajawal, Arial';
    ctx.fillText(`${rank}`, colRank, midY);

    ctx.textAlign='right';
    ctx.fillStyle='#FFFFFF';
    ctx.font = isTop3 ? '800 38px Tajawal, Arial' : '700 35px Tajawal, Arial';
    ctx.fillText(s.name, colName-40, midY);

    ctx.textAlign='center';
    ctx.fillStyle='#16A6EA';
    ctx.font='800 40px Tajawal, Arial';
    ctx.fillText(`${s.total}`, colPts, midY);

    const delta = mv[s.id];
    ctx.font='700 32px Tajawal, Arial';
    if(!delta){
      ctx.fillStyle='#9C9BC9';
      ctx.fillText('—', colMv, midY);
    } else if(delta>0){
      ctx.fillStyle='#3DD47E';
      ctx.fillText(`▲${delta}`, colMv, midY);
    } else {
      ctx.fillStyle='#FF6B5E';
      ctx.fillText(`▼${Math.abs(delta)}`, colMv, midY);
    }
  }

  const topN = Math.min(6, n);
  const bottomN = Math.min(3, Math.max(0, n - topN));
  const skipped = Math.max(0, n - topN - bottomN);

  let cursorY = 250;
  drawStoryHeaderRow(cursorY);
  cursorY += 26;

  for(let i=0;i<topN;i++){
    drawStoryRow(st[i], i+1, cursorY);
    cursorY += rowH;
  }

  if(skipped > 0){
    cursorY += 14;
    ctx.fillStyle='#7B7AA8'; ctx.font='700 30px Tajawal, Arial';
    ctx.fillText(`⋯ ${skipped} مراكز بينهم ⋯`, W/2, cursorY);
    cursorY += 46;
  } else {
    cursorY += 20;
  }

  if(bottomN > 0){
    ctx.fillStyle='#FF6B5E'; ctx.font='800 32px Tajawal, Arial';
    ctx.fillText('🔥 سباق الهروب من القاع', W/2, cursorY);
    cursorY += 54;

    const bottomStart = n - bottomN;
    for(let i=bottomStart;i<n;i++){
      drawStoryRow(st[i], i+1, cursorY);
      cursorY += rowH;
    }
  }

  ctx.textAlign='center';
  ctx.fillStyle='#7B7AA8'; ctx.font='600 24px Tajawal, Arial';
  ctx.fillText('فوز = 3  ·  تعادل = 1  ·  خسارة = 0', W/2, H-90);
  ctx.fillStyle='#7B7AA8'; ctx.font='600 24px Tajawal, Arial';
  ctx.fillText('شارك الستوري 📲', W/2, H-50);

  return cv;
}

async function downloadStandingsImage(){
  const box = document.getElementById('standingsImgBox');
  const btn = document.getElementById('dlStandingsBtn');
  if(box) box.innerHTML = '<p style="text-align:center;color:var(--muted);font-size:0.85rem;">جارٍ تجهيز صورة الترتيب…</p>';
  if(btn) btn.disabled = true;

  try{ if(document.fonts && document.fonts.ready) await document.fonts.ready; }catch(e){}

  try{
    const cv = await buildStandingsCard();
    const roundNum = getCurrentRoundNumber();
    downloadCanvasPNG(cv, `brookie-standings-round-${roundNum}.png`);
    if(box) box.innerHTML = '<div class="status-msg ok">تم تحميل صورة الترتيب — أرسلها في الجروب 📲</div>';
  }catch(e){
    if(box) box.innerHTML = '<div class="status-msg err">تعذّر تجهيز الصورة، حاول مرة ثانية.</div>';
  } finally {
    if(btn) btn.disabled = false;
  }
}

// نفس صورة الترتيب، لكن تفتح شاشة مشاركة الجهاز مباشرة (تشمل واتساب) بدل
// التحميل — للأجهزة التي تدعم Web Share API (أغلب الجوالات). على الأجهزة
// التي لا تدعمها (أغلب أجهزة الكمبيوتر) تتصرف مثل زر التحميل تمامًا كخط رجعة.
async function shareStandingsImage(){
  const box = document.getElementById('standingsImgBox');
  const btn = document.getElementById('shareStandingsBtn');
  if(box) box.innerHTML = '<p style="text-align:center;color:var(--muted);font-size:0.85rem;">جارٍ تجهيز صورة الترتيب…</p>';
  if(btn) btn.disabled = true;

  try{ if(document.fonts && document.fonts.ready) await document.fonts.ready; }catch(e){}

  try{
    const cv = await buildStandingsCard();
    const roundNum = getCurrentRoundNumber();
    const filename = `brookie-standings-round-${roundNum}.png`;
    const shared = await tryShareCanvas(cv, filename, 'ترتيب دوري بروكي', `🏆 الترتيب العام بعد الجولة ${roundNum}`);
    if(!shared){
      downloadCanvasPNG(cv, filename);
      if(box) box.innerHTML = '<div class="status-msg ok">جهازك لا يدعم المشاركة المباشرة — تم تحميل الصورة بدلاً منها، أرسلها يدويًا 📲</div>';
    } else if(box){
      box.innerHTML = '<div class="status-msg ok">تم فتح المشاركة ✅</div>';
    }
  }catch(e){
    if(box) box.innerHTML = '<div class="status-msg err">تعذّر تجهيز الصورة، حاول مرة ثانية.</div>';
  } finally {
    if(btn) btn.disabled = false;
  }
}

async function downloadStandingsStoryImage(){
  const box = document.getElementById('standingsImgBox');
  const btn = document.getElementById('dlStandingsStoryBtn');
  if(box) box.innerHTML = '<p style="text-align:center;color:var(--muted);font-size:0.85rem;">جارٍ تجهيز نسخة الستوري…</p>';
  if(btn) btn.disabled = true;

  try{ if(document.fonts && document.fonts.ready) await document.fonts.ready; }catch(e){}

  try{
    const storyCv = await buildStandingsStoryCanvas();
    const roundNum = getCurrentRoundNumber();
    downloadCanvasPNG(storyCv, `brookie-standings-round-${roundNum}-story.png`);
    if(box) box.innerHTML = '<div class="status-msg ok">تم تحميل نسخة الستوري — أرسلها في حالتك 📲</div>';
  }catch(e){
    if(box) box.innerHTML = '<div class="status-msg err">تعذّر تجهيز الصورة، حاول مرة ثانية.</div>';
  } finally {
    if(btn) btn.disabled = false;
  }
}

// ---------- كرت الملف الشخصي الكامل لمشارك (صورة قابلة للمشاركة) ----------
// يستبدل التقاط لقطة DOM الخام لصندوق الملف الشخصي (كانت النتيجة تبدو كواجهة
// عامة غير منظمة) بكرت canvas مرسوم يدويًا بنفس هوية باقي الكروت (بطل الجولة/
// الترتيب/ملخص الموسم): خلفية متدرجة داكنة، إطار بنفسجي مدوّر، علامة الشعار.
async function buildParticipantProfileCard(pid){
  const p = PARTICIPANTS.find(x=>x.id===pid);
  if(!p) return null;

  const st = computeStandings();
  const rank = st.findIndex(s=>s.id===pid)+1;
  const row = st.find(s=>s.id===pid) || {total:0, mummaCount:0, bestStreak:0};
  const history = (typeof buildParticipantHistory === 'function') ? buildParticipantHistory(pid) : [];

  const allBadges = [...computeBadges(), ...computeExtendedBadges()];
  const myBadges = allBadges.filter(b=> b.names.split('، ').includes(p.name));

  const duelRecord = (typeof _profileSeasonDuelRecord === 'function') ? _profileSeasonDuelRecord(pid) : null;

  // آخر N جولات فقط بالشريط (المساحة محدودة بكرت مربّع) — الأحدث يمين لأن
  // الاتجاه RTL، مطابقة لترتيب الأعمدة بكروت الترتيب الأخرى بهذا الملف.
  const recentHistory = history.slice(-8);

  const W = 1080;
  const headH = 300;
  const statsH = 150;
  const stripH = recentHistory.length ? 190 : 0;
  const badgesRowH = 74;
  const badgesH = 70 + Math.max(1, myBadges.length ? Math.ceil(myBadges.length/2) : 1) * badgesRowH;
  const duelH = duelRecord ? 90 : 0;
  const footH = 90;
  const H = headH + statsH + stripH + badgesH + duelH + footH;

  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');

  // خلفية متدرجة (نفس هوية باقي الكروت)
  const g = ctx.createLinearGradient(0,0,W,H);
  g.addColorStop(0,'#040421'); g.addColorStop(0.55,'#06061A'); g.addColorStop(1,'#000000');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);

  ctx.save(); ctx.globalAlpha=0.06; ctx.translate(W/2,240);
  for(let i=0;i<12;i++){
    ctx.rotate(Math.PI/6);
    ctx.fillStyle='#16A6EA';
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-45,-620); ctx.lineTo(45,-620); ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  ctx.strokeStyle='#7A52EE'; ctx.lineWidth=6;
  drawRoundedRect(ctx,18,18,W-36,H-36,26); ctx.stroke();

  await drawCardBrandMark(ctx, W);

  ctx.textAlign='center';

  // ---------- 1) الهيدر: العنوان + الاسم + المركز/النقاط ----------
  ctx.fillStyle='#9B7BF5'; ctx.font='700 30px Tajawal, Arial';
  ctx.fillText('دوري بروكي الفانتازي — الموسم الثاني', W/2, 70);
  ctx.strokeStyle='rgba(155,123,245,0.35)'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(120,92); ctx.lineTo(W-120,92); ctx.stroke();

  ctx.fillStyle='#16A6EA'; ctx.font='800 32px Tajawal, Arial';
  ctx.fillText('📋 الملف الشخصي', W/2, 140);

  ctx.fillStyle='#FFFFFF';
  const nameSize = fitFontSize(ctx, p.name, W-120, {size:66, weight:'800', family:'Tajawal, Arial'}, 34);
  ctx.font = `800 ${nameSize}px Tajawal, Arial`;
  ctx.fillText(p.name, W/2, 210);

  if(p.teams && p.teams.length){
    ctx.fillStyle='#A9A8D6'; ctx.font='600 26px Tajawal, Arial';
    const teamsTxt = p.teams.join('  ·  ');
    const teamsSize = fitFontSize(ctx, teamsTxt, W-160, {size:26, weight:'600', family:'Tajawal, Arial'}, 18);
    ctx.font = `600 ${teamsSize}px Tajawal, Arial`;
    ctx.fillText(teamsTxt, W/2, 254);
  }

  // ---------- 2) شريط الإحصاءات الأساسية ----------
  let y = headH;
  ctx.fillStyle='rgba(255,255,255,0.05)';
  drawRoundedRect(ctx,60,y,W-120,statsH-30,16); ctx.fill();

  const statCells = [
    {v:`${rank||'—'}`, l:'المركز العام'},
    {v:`${row.total}`, l:'إجمالي النقاط'},
    {v:`${row.mummaCount}`, l:'الممات'},
    {v:`${row.bestStreak}`, l:'أفضل سلسلة'}
  ];
  statCells.forEach((cell,i)=>{
    const cx = 60 + (W-120)/8 + i*((W-120)/4);
    ctx.fillStyle='#16A6EA'; ctx.font='800 42px Tajawal, Arial';
    ctx.fillText(cell.v, cx, y+58);
    ctx.fillStyle='#9C9BC9'; ctx.font='600 20px Tajawal, Arial';
    ctx.fillText(cell.l, cx, y+92);
  });

  // ---------- 3) شريط تاريخ آخر الجولات ----------
  y += statsH;
  if(recentHistory.length){
    ctx.fillStyle='#A9A8D6'; ctx.font='700 24px Tajawal, Arial';
    ctx.fillText('تاريخ آخر الجولات', W/2, y+34);

    const n = recentHistory.length;
    const areaX = 60, areaW = W-120;
    const colW = areaW / n;
    // الأحدث يمين (RTL): نعكس ترتيب الرسم فقط، بلا تغيير بيانات المصدر.
    const ordered = recentHistory.slice().reverse();
    ordered.forEach((h,i)=>{
      const cx = areaX + colW*i + colW/2;
      const boxX = areaX + colW*i + 8, boxW = colW-16, boxY = y+55, boxH = 90;
      const isMumma = h.points===0;
      const isGreat = h.points>=10;
      ctx.fillStyle = isMumma ? 'rgba(255,107,94,0.14)' : isGreat ? 'rgba(61,212,126,0.14)' : 'rgba(255,255,255,0.05)';
      drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 12); ctx.fill();
      ctx.strokeStyle = isMumma ? 'rgba(255,107,94,0.4)' : isGreat ? 'rgba(61,212,126,0.4)' : 'rgba(255,255,255,0.12)';
      ctx.lineWidth=1.5;
      drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 12); ctx.stroke();

      ctx.fillStyle = isMumma ? '#FF6B5E' : isGreat ? '#3DD47E' : '#FFFFFF';
      ctx.font='800 30px Tajawal, Arial';
      ctx.fillText(`${h.points}`, cx, boxY+42);
      ctx.fillStyle='#7B7AA8'; ctx.font='600 18px Tajawal, Arial';
      ctx.fillText(`ج${h.number}`, cx, boxY+70);
    });
  }

  // ---------- 4) الأوسمة الشخصية ----------
  y += stripH;
  ctx.fillStyle='#A9A8D6'; ctx.font='700 26px Tajawal, Arial';
  ctx.fillText('🏅 أوسمته الشخصية', W/2, y+38);

  if(myBadges.length){
    const cols = 2;
    const cellW = (W-120)/cols;
    myBadges.forEach((b,i)=>{
      const col = i % cols, rowI = Math.floor(i/cols);
      const bx = 60 + col*cellW, by = y+62 + rowI*badgesRowH;
      ctx.fillStyle='rgba(255,255,255,0.05)';
      drawRoundedRect(ctx, bx+10, by, cellW-20, badgesRowH-14, 12); ctx.fill();
      ctx.textAlign='center';
      ctx.font='30px serif';
      ctx.fillText(b.icon||'🏅', bx+cellW/2, by+38);
      ctx.fillStyle='#FFFFFF'; ctx.font='700 19px Tajawal, Arial';
      const label = fitFontSize(ctx, b.title, cellW-90, {size:19, weight:'700', family:'Tajawal, Arial'}, 14);
      ctx.font = `700 ${label}px Tajawal, Arial`;
      ctx.fillText(b.title, bx+cellW/2+22, by+38);
    });
  } else {
    ctx.fillStyle='#7B7AA8'; ctx.font='600 22px Tajawal, Arial';
    ctx.fillText('لا أوسمة شخصية بعد', W/2, y+76);
  }

  // ---------- 5) سجل نزال الموسم (إن وُجد) ----------
  y += badgesH;
  if(duelRecord){
    ctx.fillStyle='#A9A8D6'; ctx.font='700 24px Tajawal, Arial';
    ctx.fillText('🥊 سجل نزال الموسم', W/2, y+30);
    ctx.fillStyle='#FFFFFF'; ctx.font='800 26px Tajawal, Arial';
    const txt = `${duelRecord.wins} فوز · ${duelRecord.losses} خسارة · ${duelRecord.ties} تعادل${duelRecord.active?` · ${duelRecord.active} جارٍ`:''}`;
    ctx.fillText(txt, W/2, y+64);
  }

  // ---------- 6) التذييل ----------
  ctx.fillStyle='#7B7AA8'; ctx.font='600 22px Tajawal, Arial';
  ctx.fillText('فوز = 3  ·  تعادل = 1  ·  خسارة = 0', W/2, H-32);

  return cv;
}

// ---------- تحميل أي تبويب (المشاركون / الجولات / الإحصائيات / اللائحة) كصورة ----------
// دالة عامة تلتقط عنصر DOM حقيقي (وليس رسمًا يدويًا على canvas) عبر html2canvas،
// لأن محتوى هذه التبويبات متغيّر الطول والشكل (قوائم، جداول، كروت مباريات...)
// فالأنسب تصوير الواجهة كما هي بدل إعادة رسمها. كل هذه الأزرار خاصة بالمنظم.

// محاولة تحميل html2canvas إن لم تكن جاهزة بعد (وسم <script> الثابت في رأس
// الصفحة يفترض أن يحمّلها قبل تفاعل المستخدم، لكن هذه شبكة أمان لو تأخر
// التحميل أو فشل لأي سبب — تعيد المحاولة عند أول ضغطة زر بدل الفشل الصامت).
let _h2cLoadPromise = null;
function ensureHtml2Canvas(){
  if(typeof html2canvas === 'function') return Promise.resolve(true);
  if(_h2cLoadPromise) return _h2cLoadPromise;
  _h2cLoadPromise = new Promise((resolve)=>{
    const existing = document.querySelector('script[data-h2c]');
    if(existing){
      existing.addEventListener('load', ()=>resolve(typeof html2canvas === 'function'));
      existing.addEventListener('error', ()=>resolve(false));
    }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    s.setAttribute('data-h2c','1');
    s.onload = ()=> resolve(typeof html2canvas === 'function');
    s.onerror = ()=> resolve(false);
    document.head.appendChild(s);
    setTimeout(()=> resolve(typeof html2canvas === 'function'), 9000);
  });
  return _h2cLoadPromise;
}

async function downloadElementAsImage(elementId, filename, msgBoxId, btnId){
  const box = msgBoxId ? document.getElementById(msgBoxId) : null;
  const btn = btnId ? document.getElementById(btnId) : null;
  const el = document.getElementById(elementId);
  if(!el) return;

  if(box) box.innerHTML = '<p style="text-align:center;color:var(--muted);font-size:0.85rem;">جارٍ تجهيز الصورة…</p>';
  if(btn) btn.disabled = true;

  try{ if(document.fonts && document.fonts.ready) await document.fonts.ready; }catch(e){}

  try{
    const ready = await ensureHtml2Canvas();
    if(!ready) throw new Error('تعذّر تحميل مكتبة الصور (html2canvas) — تحقق من الاتصال بالإنترنت');
    const bgFallback = getComputedStyle(document.documentElement).getPropertyValue('--cream').trim() || '#0A0A24';
    const cv = await html2canvas(el, {backgroundColor:bgFallback, scale:2, useCORS:true});
    downloadCanvasPNG(cv, filename);
    if(box) box.innerHTML = '<div class="status-msg ok">تم تحميل الصورة — أرسلها في الجروب 📲</div>';
  }catch(e){
    const detail = (e && e.message) ? ` (${e.message})` : '';
    if(box) box.innerHTML = `<div class="status-msg err">تعذّر تجهيز الصورة، حاول مرة ثانية${detail}.</div>`;
  } finally {
    if(btn) btn.disabled = false;
  }
}

// ---------- تقرير الموسم الكامل (قابل للطباعة) ----------
function printSeasonReport(){
  const st = computeStandings();
  const histMap = getAllParticipantsRoundsHistory();
  const n = DATA.rounds.length;
  const badges = [...computeBadges(), ...computeExtendedBadges()];

  let body = `
  <html dir="rtl"><head><meta charset="utf-8">
  <title>تقرير الموسم — دوري بروكي الفانتازي</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:system-ui,Arial,sans-serif;background:#fff;color:#111;padding:24px;direction:rtl;}
    h1{font-size:1.4rem;font-weight:900;text-align:center;margin-bottom:4px;}
    .sub{text-align:center;color:#666;font-size:0.85rem;margin-bottom:20px;}
    h2{font-size:1rem;font-weight:800;border-bottom:2px solid #eee;padding-bottom:4px;margin:20px 0 10px;}
    table{width:100%;border-collapse:collapse;font-size:0.82rem;margin-bottom:16px;}
    th{background:#f5f5f5;font-weight:700;padding:6px 8px;text-align:center;border-bottom:2px solid #ddd;}
    td{padding:5px 8px;text-align:center;border-bottom:1px solid #eee;}
    td:first-child{text-align:right;font-weight:700;}
    .gold{color:#B8902A;font-weight:900;}
    .muted{color:#888;}
    .badges{display:flex;flex-wrap:wrap;gap:10px;}
    .badge{border:1px solid #eee;border-radius:8px;padding:8px 12px;font-size:0.8rem;min-width:140px;}
    .badge-icon{font-size:1.4rem;display:block;margin-bottom:3px;}
    .badge-title{font-weight:800;color:#B8902A;}
    @media print{body{padding:10px;} @page{margin:15mm;}}
  </style></head><body>
  <h1>🏆 دوري بروكي الفانتازي — الموسم الثاني</h1>
  <div class="sub">تقرير الموسم حتى الجولة ${n} · ${new Date().toLocaleDateString('ar',{year:'numeric',month:'long',day:'numeric'})}</div>

  <h2>📊 الترتيب العام</h2>
  <table>
    <tr><th>#</th><th style="text-align:right;">المشارك</th><th>نقاط</th><th>ممات</th><th>أفضل جولة</th><th>معدل</th></tr>`;

  st.forEach((s,i)=>{
    const hist = histMap[s.id]||[];
    const best = hist.length?Math.max(...hist.map(h=>h.points)):0;
    const avg = hist.length?Math.round(hist.reduce((a,h)=>a+h.points,0)/hist.length*10)/10:0;
    const rank = i+1;
    const medal = rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':'';
    body += `<tr>
      <td>${medal||rank}</td>
      <td style="text-align:right;">${s.name}</td>
      <td class="${rank<=3?'gold':''}">${s.total}</td>
      <td>${s.mummaCount}</td>
      <td>${best}</td>
      <td class="muted">${avg}</td>
    </tr>`;
  });

  body += `</table>
  <h2>🏅 أوسمة الموسم</h2>
  <div class="badges">`;
  badges.forEach(b=>{
    body += `<div class="badge">
      <span class="badge-icon">${b.icon}</span>
      <span class="badge-title">${b.title}</span><br>
      <span>${b.names}</span><br>
      <span class="muted">${b.detail}</span>
    </div>`;
  });
  body += `</div>`;

  // جدول تاريخ الجولات
  body += `<h2>📅 تاريخ الجولات</h2>
  <table><tr><th style="text-align:right;">المشارك</th>`;
  DATA.rounds.slice().sort((a,b)=>a.number-b.number).forEach(r=> body+=`<th>ج${r.number}</th>`);
  body += '<th>المجموع</th></tr>';
  st.forEach(s=>{
    const hist = histMap[s.id]||[];
    const byRound = {};
    hist.forEach(h=>byRound[h.number]=h.points);
    body += `<tr><td style="text-align:right;">${s.name}</td>`;
    DATA.rounds.slice().sort((a,b)=>a.number-b.number).forEach(r=>{
      const pts = byRound[r.number];
      body += `<td style="color:${pts===0?'#c0392b':pts===undefined?'#aaa':'inherit'}">${pts===undefined?'—':pts}</td>`;
    });
    body += `<td style="font-weight:800;">${s.total}</td></tr>`;
  });
  body += `</table></body></html>`;

  const win = window.open('','_blank','width=900,height=700');
  if(win){
    win.document.write(body);
    win.document.close();
    win.focus();
    setTimeout(()=>win.print(), 600);
  }
}

// ميزة 7: شهادة تكريم قابلة للمشاركة — نفس أسلوب buildStandingsStoryCanvas
// نص الشهادة الكامل (نص تقديري منسّق بطلب المستخدم، 21 سبتمبر 2026) بدل
// سطر الرصيد المجرّد وحده — الرصيد الحالي أصبح إحصائية إضافية أسفل الفقرة.
async function buildChampionCertificateCanvas(){
  const champ = PARTICIPANTS.find(p=>p.id===CHAMPION_ID) || {name:'—'};
  const st = computeStandings();
  const row = st.find(s=>s.id===CHAMPION_ID) || {total:0};
  const W=1080, H=1300;
  const cv = document.createElement('canvas');
  cv.width=W; cv.height=H;
  const ctx = cv.getContext('2d');
  const g = ctx.createLinearGradient(0,0,W,H);
  g.addColorStop(0,'#0B0D1F'); g.addColorStop(1,'#3D2E99');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='#7B5CFF'; ctx.lineWidth=10;
  drawRoundedRect(ctx,30,30,W-60,H-60,30); ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,0.4)'; ctx.lineWidth=2;
  drawRoundedRect(ctx,50,50,W-100,H-100,22); ctx.stroke();
  await drawCardBrandMark(ctx, W, 66);
  ctx.textAlign='center';

  ctx.fillStyle='#00B4FF'; ctx.font='700 30px Tajawal, Arial';
  ctx.fillText('دوري بروكي الفانتازي — الموسم الثاني', W/2, 150);

  ctx.fillStyle='#FFD76A'; ctx.font='900 42px Tajawal, Arial';
  ctx.fillText('🏆 شهادة تكريم حامل اللقب 🏆', W/2, 220);

  ctx.strokeStyle='rgba(255,215,106,0.5)'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(W/2-140,252); ctx.lineTo(W/2+140,252); ctx.stroke();

  ctx.fillStyle='#B9AEF5'; ctx.font='500 26px Tajawal, Arial';
  ctx.fillText('يتشرّف دوري بروكي الفانتازي بتكريم', W/2, 305);

  ctx.fillStyle='#FFFFFF';
  const nameSize = fitFontSize(ctx, champ.name, W-200, {size:74, weight:'900', family:'Tajawal, Arial'}, 40);
  ctx.font = `900 ${nameSize}px Tajawal, Arial`;
  ctx.fillText(champ.name, W/2, 395);

  ctx.fillStyle='#FFD76A'; ctx.font='700 28px Tajawal, Arial';
  ctx.fillText('بطلًا لدوري بروكي الفانتازي — الموسم الأول', W/2, 445);

  ctx.fillStyle='#D8D4F5'; ctx.font='500 26px Tajawal, Arial';
  const bodyLines = wrapCanvasText(ctx,
    'تقديرًا لتفوّقه وتميّزه على مدار الموسم، وحصده اللقب باستحقاق بين نخبة من المنافسين، وحمل راية البطولة التي يسعى الجميع هذا الموسم لانتزاعها منه.',
    W-220
  );
  let ly = 515;
  bodyLines.forEach(line=>{ ctx.fillText(line, W/2, ly); ly += 42; });

  ctx.fillStyle='#FFFFFF'; ctx.font='700 27px Tajawal, Arial';
  ly += 22;
  wrapCanvasText(ctx, 'فهنيئًا له اللقب، وتحية لروح المنافسة التي جمعت الجميع 🎉', W-220)
    .forEach(line=>{ ctx.fillText(line, W/2, ly); ly += 40; });

  ctx.fillStyle='#8FE3A6'; ctx.font='600 28px Tajawal, Arial';
  ly += 46;
  ctx.fillText(`الرصيد الحالي: ${row.total} نقطة`, W/2, ly);

  ctx.strokeStyle='rgba(255,255,255,0.18)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(W/2-120,H-172); ctx.lineTo(W/2+120,H-172); ctx.stroke();

  ctx.fillStyle='#9C9BC9'; ctx.font='600 24px Tajawal, Arial';
  ctx.fillText('إدارة دوري بروكي الفانتازي', W/2, H-130);
  ctx.font='500 22px Tajawal, Arial';
  ctx.fillText(new Date().toLocaleDateString('ar-SA'), W/2, H-90);

  return cv;
}
async function showChampionCertificate(){
  const box = document.getElementById('championCertBox');
  if(!box) return;
  box.innerHTML = '<p style="text-align:center;color:var(--muted);font-size:0.85rem;">جارٍ تجهيز الشهادة…</p>';
  try{ if(document.fonts && document.fonts.ready) await document.fonts.ready; }catch(e){}
  const cv = await buildChampionCertificateCanvas();
  box.innerHTML='';
  box.appendChild(cv);
  if(CHAMPION_FEATURES.golden_confetti) fireConfetti(['#FFD76A','#FFB020','#FFF3C4','#FFFFFF']);
  const acts = document.createElement('div');
  acts.className='champ-actions';
  acts.innerHTML = `<button class="btn" id="shareCertBtn">📤 مشاركة</button><button class="btn secondary" id="dlCertBtn">⬇️ تحميل</button>`;
  box.appendChild(acts);
  document.getElementById('dlCertBtn').addEventListener('click', ()=>downloadCanvasPNG(cv, `champion-certificate-${CHAMPION_ID||'x'}.png`));
  document.getElementById('shareCertBtn').addEventListener('click', async ()=>{
    const shared = await tryShareCanvas(cv, 'champion-certificate.png', 'شهادة تكريم البطل', 'دوري بروكي الفانتازي');
    if(!shared) downloadCanvasPNG(cv, `champion-certificate-${CHAMPION_ID||'x'}.png`);
  });
}
