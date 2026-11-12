/* أدوات عرض الأفكار فقط؛ الاختيار هنا لا يغيّر أي قالب حالي. */
for(const section of document.querySelectorAll('.direction')){
 const design=section.dataset.design;let page=1;
 const variants=section.querySelector('.variants');
 for(const [theme,label] of [['dark','ليلية'],['light','نهارية']]){
  const figure=document.createElement('figure'),caption=document.createElement('figcaption'),title=document.createElement('span'),link=document.createElement('a'),box=document.createElement('div'),frame=document.createElement('iframe');
  title.textContent=label;link.textContent='فتح بالحجم الأصلي';box.className='miniature';frame.title=section.querySelector('h2').textContent+' — '+label;frame.dataset.theme=theme;caption.append(title,link);box.append(frame);figure.append(caption,box);variants.append(figure);
 }
 function update(){
  const count=section.querySelector('select')?.value||10;
  const scopes={a:`${count} من 20 في اللقطة؛ البقية في الموقع.`,b:`أفضل ${count} فقط؛ البقية في الموقع.`,c:'10 + 10؛ لا يُحذف أي مشارك.',d:`أفضل ${count}؛ لقطة بارزة لا ترتيب كامل.`};
  section.querySelector('.scope').textContent=scopes[design];
  for(const figure of variants.querySelectorAll('figure')){
   const frame=figure.querySelector('iframe');const url=`preview.html?design=${design}&theme=${frame.dataset.theme}&count=${count}&page=${page}`;
   frame.src=url;figure.querySelector('a').href=url;
  }
 }
 section.querySelector('select')?.addEventListener('change',update);
 for(const button of section.querySelectorAll('[data-page]'))button.addEventListener('click',()=>{page=Number(button.dataset.page);for(const b of section.querySelectorAll('[data-page]'))b.setAttribute('aria-pressed',String(b===button));update()});
 update();
}
