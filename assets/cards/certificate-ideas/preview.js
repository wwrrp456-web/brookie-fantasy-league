/* أفكار مستقلة؛ لا تستبدل الشهادة الحالية ولا تعيد حساب أي نتائج. */
(async()=>{
 const params=new URLSearchParams(location.search),root=document.documentElement;
 if(params.has('theme'))root.classList.toggle('light-mode',params.get('theme')==='light');
 const idea=['classic','minimal','sport'].includes(params.get('idea'))?params.get('idea'):'classic';
 const card=document.querySelector('.certificate');card.className='certificate '+idea;
 try{
  const data=await fetch('data.json').then(r=>{if(!r.ok)throw new Error();return r.json()});
  card.querySelector('.recipient').textContent=params.get('stress')==='1'?'أبو تغريد (زيد) الثاني':data.name;
  card.querySelector('.honor').textContent=data.seasonTitle;
  card.querySelector('.copy').textContent=data.appreciation;
  card.querySelector('.signature').textContent=data.signature;
  card.querySelector('.issue').textContent=formatDate(data.issuedAt,{style:'full'});
  function syncTheme(){card.querySelector('.logo').src='../../brand/'+(root.classList.contains('light-mode')?'proki-logo-light.svg':'proki-logo.svg')}
  syncTheme();new MutationObserver(syncTheme).observe(root,{attributes:true,attributeFilter:['class']});
  await document.fonts.ready;
  const name=card.querySelector('.recipient'),ctx=document.createElement('canvas').getContext('2d');let size=parseFloat(getComputedStyle(name).fontSize);
  while(size>76){ctx.font='800 '+size+'px Tajawal';if(ctx.measureText(name.textContent).width<=name.clientWidth)break;size-=2}
  name.style.fontSize=size+'px';root.dataset.ready='true';
 }catch(error){card.querySelector('.copy').textContent='تعذر تحميل بيانات المعاينة.';root.dataset.ready='error'}
})();
