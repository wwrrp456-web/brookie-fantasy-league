/* المعاينات بنفس نسبة التصدير، مصغرة فقط لعرض محادثة 390px. */
for(const section of document.querySelectorAll('[data-size]')){
 const size=Number(section.dataset.size),variants=section.querySelector('.variants');
 for(const [theme,label] of [['dark','ليلية'],['light','نهارية']]){
  const figure=document.createElement('figure'),caption=document.createElement('figcaption'),title=document.createElement('span'),link=document.createElement('a'),box=document.createElement('div'),frame=document.createElement('iframe');
  const url=`preview.html?size=${size}&theme=${theme}`;
  title.textContent=label;link.textContent='فتح بالحجم الأصلي';link.href=url;frame.src=url;frame.height=String(size);frame.title=`الترتيب الكامل ${size} — ${label}`;box.className='miniature';box.style.height=(size*390/1080)+'px';caption.append(title,link);box.append(frame);figure.append(caption,box);variants.append(figure);
 }
}
