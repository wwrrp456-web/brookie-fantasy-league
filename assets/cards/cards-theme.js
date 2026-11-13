/* معاينات الكروت: الثيم كلاس واحد؛ المحتوى والنتائج لا يتغيران. */
(()=>{
 const root=document.documentElement,params=new URLSearchParams(location.search);
 if(params.has('theme'))root.classList.toggle('light-mode',params.get('theme')==='light');
 function syncTheme(){
  const light=root.classList.contains('light-mode');
  for(const img of document.querySelectorAll('.card img')){
   if(img.classList.contains('logo'))img.setAttribute('src','../brand/'+(light?'proki-logo-light.svg':'proki-logo.svg'));
   else if(img.classList.contains('crest')){
    const original=img.getAttribute('src').replace('/crests/light/','/crests/');
    img.setAttribute('src',light?original.replace('/crests/','/crests/light/'):original);
   }
  }
 }
 syncTheme();new MutationObserver(syncTheme).observe(root,{attributes:true,attributeFilter:['class']});
})();
