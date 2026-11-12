/* معاينة ليلية ونهارية من HTML واحد، دون نسخ بيانات الترتيب أو حسابها مجددًا. */
(async()=>{
 const root=document.documentElement;
 function syncLogo(){
  const light=root.classList.contains("light-mode");
  for(const crest of document.querySelectorAll(".table-v2 img.crest")){
   const original=crest.getAttribute("src").replace("/crests/light/","/crests/");
   const target=light?original.replace("/crests/","/crests/light/"):original;
   if(crest.getAttribute("src")!==target)crest.setAttribute("src",target);
  }
  const logo=document.querySelector('.table-v2 .logo');
  if(logo)logo.setAttribute('src',root.classList.contains('light-mode')?'../brand/proki-logo-light.svg':'../brand/proki-logo.svg');
 }
 try{
  const template=document.body.dataset.template;
  if(template){
   if(!['standings-post.html','standings-story.html'].includes(template))throw new Error('قالب غير معروف');
   const response=await fetch(template);
   if(!response.ok)throw new Error('تعذر تحميل القالب');
   const source=new DOMParser().parseFromString(await response.text(),'text/html');
   const card=source.querySelector('.card');
   if(!card)throw new Error('قالب غير مكتمل');
   document.querySelector('#loading')?.remove();
   document.body.append(document.importNode(card,true));
  }
  syncLogo();
  new MutationObserver(syncLogo).observe(root,{attributes:true,attributeFilter:['class']});
  root.dataset.ready='true';
 }catch(error){
  const status=document.querySelector('#loading');
  if(status)status.textContent='تعذر تحميل المعاينة. أعد فتح الصفحة من لوحة القوالب.';
  root.dataset.ready='error';
 }
})();
