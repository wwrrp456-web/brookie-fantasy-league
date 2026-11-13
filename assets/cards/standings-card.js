/* معاينة القالب النهائي؛ حساب الصفوف من مساحة ثابتة، دون إعادة حساب نتائج الدوري. */
(async()=>{
 const params=new URLSearchParams(location.search),root=document.documentElement;
 if(params.has('theme'))root.classList.toggle('light-mode',params.get('theme')==='light');
 try{
  const [data,map,...icons]=await Promise.all([fetch('standings-card.data.json').then(r=>r.json()),fetch('../crests.json').then(r=>r.json()),...['arrow-up','arrow-down','snowflake'].map(n=>fetch('../icons/'+n+'.svg').then(r=>r.text()))]);
  const requested=params.has('n')?Number(params.get('n')):data.standings.length;
  if(!Number.isInteger(requested)||requested<18||requested>24)throw new Error('عدد خارج نطاق القالب');
  const stress=params.get('stress')==='1',fixture=requested!==data.standings.length||stress;
  const rows=data.standings.slice(0,requested).map(p=>({...p,clubs:[...p.clubs]}));
  // النسخ الزائدة اختبار هندسي فقط؛ لا تمثل مشاركين جددًا أو نتائج حقيقية.
  while(rows.length<requested){const last=data.standings.at(-1);rows.push({...last,clubs:[...last.clubs],rank:rows.length+1,fixtureClone:true})}
  if(stress){const p=rows.find(p=>p.id===1)||rows[0];p.name='أبو تغريد (زيد) الثاني';p.clubs[0]='باريس سان جيرمان'}
  const n=rows.length,groupBreaks=Math.floor((n-1)/5),rowHeight=Math.min(64,Math.max(44,Math.floor((1504-16*(n-1)-8*groupBreaks)/n)));
  const scale=rowHeight>=56?{name:40,score:48,motion:28,rank:32,crest:36}:rowHeight>=48?{name:36,score:44,motion:26,rank:28,crest:32}:{name:32,score:36,motion:24,rank:24,crest:28};
  const card=document.querySelector('.standings-card');card.dataset.n=n;card.dataset.rowHeight=rowHeight;card.dataset.fixture=String(fixture);
  for(const [key,value] of Object.entries({'row-height':rowHeight,'name-size':scale.name,'score-size':scale.score,'motion-size':scale.motion,'rank-size':scale.rank,'crest-size':scale.crest}))card.style.setProperty('--'+key,value+'px');
  const svg=Object.fromEntries(['arrow-up','arrow-down','snowflake'].map((n,i)=>[n,icons[i].replace('<svg ','<svg class="icon" aria-hidden="true" ')])),slug=Object.fromEntries(Object.entries(map).map(([s,n])=>[n,s]));
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  document.querySelector('#round-label').textContent='الموسم الثاني · الجولة '+data.round;
  document.querySelector('#participant-count').textContent=requested>data.standings.length?requested+' صفًا':formatCount(n,'مشارك');
  if(fixture){const note=document.querySelector('#fixture-note');note.hidden=false;note.textContent=stress?'اختبار النص الطويل':'اختبار التكيّف'}
  const list=document.querySelector('.standings-list');
  for(const [i,p] of rows.entries()){
   const item=document.createElement('article');item.className='standing-person'+(i&&i%5===0?' group-start':'')+(p.id===16?' me':'');item.dataset.rank=p.rank;item.dataset.sourceId=p.id;item.dataset.key=p.fixtureClone?'fixture-'+i:String(p.id);
   const motion=p.move===0?'snowflake':p.move>0?'arrow-up':'arrow-down';
   item.innerHTML=`<span class="rank">${p.rank}</span><span class="motion ${p.move>0?'rising':p.move<0?'falling':'still'}" role="img" aria-label="${p.move===0?'ثابت':(p.move>0?'صعد ':'تراجع ')+formatCount(Math.abs(p.move),'مركز')}">${svg[motion]}${p.move===0?'':Math.abs(p.move)}</span><h2 class="person">${esc(p.name)}</h2><span class="standings-clubs">${p.clubs.map(n=>`<img class="crest" src="../crests/${slug[n]}.svg" alt="${esc(n)}" title="${esc(n)}" width="36" height="40">`).join('')}</span><b class="score">${p.total}</b>`;list.append(item);
  }
  function syncTheme(){const light=root.classList.contains('light-mode');document.querySelector('.standings-logo').src='../brand/'+(light?'proki-logo-light.svg':'proki-logo.svg');for(const img of list.querySelectorAll('img')){const src=img.getAttribute('src').replace('/crests/light/','/crests/');img.setAttribute('src',light?src.replace('/crests/','/crests/light/'):src)}}
  syncTheme();new MutationObserver(syncTheme).observe(root,{attributes:true,attributeFilter:['class']});document.querySelector('#loading').remove();root.dataset.ready='true';
 }catch(error){document.querySelector('#loading').textContent='تعذر إعداد البطاقة. تحقق من بيانات القالب.';root.dataset.ready='error';}
})();
