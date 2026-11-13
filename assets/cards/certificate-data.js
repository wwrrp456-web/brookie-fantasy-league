/* بيانات الشهادة من معاينة الاتجاه المعتمد؛ لا نتائج أو أرصدة مضافة. */
(async()=>{
 const root=document.documentElement,card=document.querySelector('.certificate'),params=new URLSearchParams(location.search);
 try{
  const data=await fetch('certificate-ideas/data.json').then(r=>{if(!r.ok)throw new Error();return r.json()});
  card.querySelector('.recipient').textContent=params.get('stress')==='1'?'أبو تغريد (زيد) الثاني':data.name;
  card.querySelector('.honor').textContent=data.seasonTitle;
  card.querySelector('.copy').textContent=data.appreciation;
  card.querySelector('.signature').textContent=data.signature;
  card.querySelector('.issue').textContent=formatDate(data.issuedAt,{style:'full'});
  await document.fonts.ready;
  const name=card.querySelector('.recipient'),ctx=document.createElement('canvas').getContext('2d');let size=parseFloat(getComputedStyle(name).fontSize);
  while(size>76){ctx.font='800 '+size+'px Tajawal';if(ctx.measureText(name.textContent).width<=name.clientWidth)break;size-=2}
  ctx.font='800 '+size+'px Tajawal';if(ctx.measureText(name.textContent).width>name.clientWidth)throw new Error();
  name.style.fontSize=size+'px';root.dataset.ready='true';
 }catch(error){card.querySelector('.copy').textContent='تعذر تحميل بيانات الشهادة.';root.dataset.ready='error'}
})();
