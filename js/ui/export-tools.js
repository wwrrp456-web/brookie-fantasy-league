/* تصدير تبويب كصورة (html2canvas) وتقرير الموسم القابل للطباعة (كانا في canvas-cards.js المحذوف، 001-T026). خاصان بالمنظم. */

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

  // الأقسام المطوية (<details>) تُفتح مؤقتًا ليشملها الكانفس، ثم تُرجَع كما كانت (في finally)
  const closedFolds = Array.from(el.querySelectorAll('details:not([open])'));
  closedFolds.forEach(d => { d.open = true; });
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
    closedFolds.forEach(d => { d.open = false; });
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
  <div class="sub">تقرير الموسم حتى الجولة ${n} · ${formatDate(new Date(), {style: 'full'})}</div>

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
  DATA.rounds.slice().sort((a,b)=>a.number-b.number).forEach(r=> body+=`<th title="الجولة ${r.number}">${r.number}</th>`);
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

