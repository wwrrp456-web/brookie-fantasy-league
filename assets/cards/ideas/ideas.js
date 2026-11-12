/* لوحة أفكار مستقلة؛ لا تعدل القوالب المعتمدة أو بيانات الدوري. */
(async()=>{
 const params=new URLSearchParams(location.search);
 const design=['a','b','c','d'].includes(params.get('design'))?params.get('design'):'a';
 const light=params.get('theme')==='light';document.documentElement.classList.toggle('light-mode',light);
 const names={a:'السطر الواضح',b:'منصة المنافسة',c:'الترتيب على منشورين',d:'بطاقات المنافسين'};
 const limits={a:[8,10,12],b:[8,10],c:[10],d:[4,6]};
 const requested=Number(params.get('count'));const count=limits[design].includes(requested)?requested:limits[design].at(-1);
 const shown=design==='d'&&!params.has('count')?4:count;
 const part=design==='c'&&params.get('page')==='2'?2:1;
 try{
  const [data,map,canonical,...icons]=await Promise.all([
   fetch('data.json').then(r=>r.json()),fetch('../../crests.json').then(r=>r.json()),fetch('../standings-post.html').then(r=>r.text()),
   ...['arrow-up','arrow-down','snowflake','crown','chart-bar'].map(n=>fetch('../../icons/'+n+'.svg').then(r=>r.text()))
  ]);
  const svg=Object.fromEntries(['arrow-up','arrow-down','snowflake','crown','chart-bar'].map((n,i)=>[n,icons[i].replace('<svg ','<svg class="icon" aria-hidden="true" ')]));
  const slug=Object.fromEntries(Object.entries(map).map(([s,n])=>[n,s]));
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clubs=p=>`<span class="clubs">${p.clubs.map(n=>`<img class="crest" src="../../crests/${light?'light/':''}${slug[n]}.svg" alt="${esc(n)}" width="40" height="44">`).join('')}</span>`;
  const movement=p=>`<span class="move ${p.move>0?'rising':p.move<0?'falling':'still'}" role="img" aria-label="${p.move===0?'ثابت':(p.move>0?'صعد ':'تراجع ')+formatCount(Math.abs(p.move),'مركز')}">${svg[p.move===0?'snowflake':p.move>0?'arrow-up':'arrow-down']}${p.move===0?'':Math.abs(p.move)}</span>`;
  const row=p=>`<article class="idea-row ${p.id===16?'me':''}" data-id="${p.id}" data-rank="${p.rank}"><span class="place">${p.rank}</span>${movement(p)}<h2 class="person">${esc(p.name)}</h2>${clubs(p)}<b class="balance">${p.total}</b></article>`;
  const podium=p=>`<article class="podium-person ${p.id===16?'me':''}" data-id="${p.id}" data-rank="${p.rank}"><div class="podium-top"><span class="place">${p.rank}</span><h2 class="person">${esc(p.name)}</h2></div>${clubs(p)}<div class="podium-bottom"><b class="balance">${p.total}</b>${movement(p)}</div></article>`;
  const tile=p=>`<article class="elevated-person ${p.id===16?'me':''}" data-id="${p.id}" data-rank="${p.rank}"><div class="tile-top"><span class="place">المركز ${p.rank}</span>${movement(p)}</div><h2 class="person">${esc(p.name)}</h2>${clubs(p)}<div class="tile-score"><span>الرصيد</span><b class="balance">${p.total}</b></div></article>`;
  const source=new DOMParser().parseFromString(canonical,'text/html');
  const card=document.createElement('main');card.className=`card table-card idea design-${design}${shown===6&&design==='d'?' six-tiles':''}`;card.dataset.design=design;card.dataset.count=shown;
  const safe=document.createElement('div');safe.className='safe';const header=source.querySelector('.card-header').cloneNode(true);header.querySelector('.logo').setAttribute('src',`../../brand/${light?'proki-logo-light.svg':'proki-logo.svg'}`);
  // النص نفسه ونسبة الشعار ونظام الرأس من C8؛ تغيير مسار المورد لمجلد ideas فقط.
  safe.append(header);const content=document.createElement('div');content.className='content';
  let selection;
  if(design==='a'){
   selection=data.standings.slice(0,shown);content.innerHTML=`<section class="clean-list">${selection.map(row).join('')}</section><p class="scope-note">المراكز <bdi dir="ltr">1–${shown}</bdi> · الترتيب الكامل في الموقع</p>`;
  }else if(design==='b'){
   selection=data.standings.slice(0,shown);content.innerHTML=`<section class="podium" aria-label="منصة الثلاثة الأوائل">${selection.slice(0,3).map(podium).join('')}</section><section class="chase-list">${selection.slice(3).map(row).join('')}</section><p class="scope-note">أفضل ${shown} · باقي الترتيب في الموقع</p>`;
  }else if(design==='c'){
   selection=data.standings.slice((part-1)*10,part*10);content.innerHTML=`<div class="part-label"><b dir="ltr">${part}/2</b><span>المراكز <bdi dir="ltr">${selection[0].rank}–${selection.at(-1).rank}</bdi></span></div><section class="split-list">${selection.map(row).join('')}</section><p class="scope-note">${part===1?'يتبع: المراكز <bdi dir="ltr">11–20</bdi> في البطاقة الثانية':'البطاقة الثانية · الترتيب كامل عبر منشورين'}</p>`;
  }else{
   selection=data.standings.slice(0,shown);content.innerHTML=`<section class="elevated-grid">${selection.map(tile).join('')}</section><p class="scope-note">لقطة لأفضل ${shown} · الترتيب الكامل في الموقع</p>`;
  }
  safe.append(content);card.append(safe);card.append(source.querySelector('.card-footer').cloneNode(true));document.body.replaceChildren(card);
  document.title=names[design]+(light?' — نهاري':' — ليلي')+' | دوري بروكي';
  document.documentElement.dataset.ready='true';
 }catch(error){document.querySelector('#loading').textContent='تعذر إعداد المعاينة. أعد فتحها من لوحة الأفكار.';document.documentElement.dataset.ready='error';}
})();
