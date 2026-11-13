/* مقترح مستقل: لا يكتب في القوالب الحالية أو يحسب ترتيبًا جديدًا. */
(async()=>{
 const params=new URLSearchParams(location.search),requested=Number(params.get('size'));
 const size=[1350,1620,1920].includes(requested)?requested:1620;
 const light=params.get('theme')==='light';document.documentElement.classList.toggle('light-mode',light);
 try{
  const [data,map,canonical,...icons]=await Promise.all([
   fetch('data.json').then(r=>r.json()),fetch('../../../crests.json').then(r=>r.json()),fetch('../../standings-post.html').then(r=>r.text()),
   ...['arrow-up','arrow-down','snowflake'].map(n=>fetch('../../../icons/'+n+'.svg').then(r=>r.text()))
  ]);
  const svg=Object.fromEntries(['arrow-up','arrow-down','snowflake'].map((n,i)=>[n,icons[i].replace('<svg ','<svg class="icon" aria-hidden="true" ')]));
  const slug=Object.fromEntries(Object.entries(map).map(([s,n])=>[n,s]));
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const card=document.createElement('main');card.className='full-card canvas-'+size;card.dataset.size=size;
  const safe=document.createElement('div');safe.className='full-safe';
  const logo=light?'proki-logo-light.svg':'proki-logo.svg';
  safe.innerHTML=`<header class="full-header"><img class="full-logo" src="../../../brand/${logo}" alt="PROKI Fantasy League — دوري بروكي الفانتازي" width="88" height="101"><div><p class="meta">الموسم الثاني · الجولة ${data.round}</p><h1>الترتيب العام</h1></div><p class="full-count">${formatCount(data.standings.length,'مشارك')}</p></header>`;
  const content=document.createElement('div');content.className='full-content';
  content.innerHTML='<div class="table-labels" aria-hidden="true"><span>#</span><span>الحركة</span><span>المشارك</span><span>الأندية</span><span>الرصيد</span></div>';
  const list=document.createElement('section');list.className='full-list';list.setAttribute('aria-label','الترتيب الكامل للمشاركين');
  for(const [i,p] of data.standings.entries()){
   const motion=p.move===0?'snowflake':p.move>0?'arrow-up':'arrow-down';
   const item=document.createElement('article');item.className='participant'+(i>0&&i%5===0?' group-start':'')+(p.id===16?' me':'');item.dataset.id=p.id;item.dataset.rank=p.rank;
   item.innerHTML=`<span class="rank">${p.rank}</span><span class="motion ${p.move>0?'rising':p.move<0?'falling':'still'}" role="img" aria-label="${p.move===0?'ثابت':(p.move>0?'صعد ':'تراجع ')+formatCount(Math.abs(p.move),'مركز')}">${svg[motion]}${p.move===0?'':Math.abs(p.move)}</span><h2 class="person">${esc(p.name)}</h2><span class="full-clubs">${p.clubs.map(n=>`<img class="crest" src="../../../crests/${light?'light/':''}${slug[n]}.svg" alt="${esc(n)}" width="32" height="35">`).join('')}</span><b class="score">${p.total}</b>`;
   list.append(item);
  }
  content.append(list);safe.append(content);card.append(safe);
  const source=new DOMParser().parseFromString(canonical,'text/html');card.append(source.querySelector('.card-footer').cloneNode(true));document.body.replaceChildren(card);
  document.title=`الترتيب الكامل — 1080×${size} — ${light?'نهاري':'ليلي'}`;
  document.documentElement.dataset.ready='true';
 }catch(error){document.querySelector('#loading').textContent='تعذر إعداد معاينة الترتيب. أعد فتحها من اللوحة.';document.documentElement.dataset.ready='error';}
})();
