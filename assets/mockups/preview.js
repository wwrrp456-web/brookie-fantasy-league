/* تفاعلات المعاينة فقط؛ لا اتصال بالبيانات الحية. */
const tabbar=document.querySelector('.tabbar');
const activeTab=tabbar?.querySelector('[aria-current="page"]');
if(activeTab)activeTab.scrollIntoView({block:'nearest',inline:'center',behavior:'instant'});
const more=document.querySelector('.tab-more');
function updateTabs(){
 if(!tabbar||!more)return;
 const edge=tabbar.getBoundingClientRect();
 const tabs=[...tabbar.querySelectorAll('a')];
 const left=tabs.find(t=>t.getBoundingClientRect().left<edge.left-1);
 const right=tabs.find(t=>t.getBoundingClientRect().right>edge.right+1);
 more.hidden=!left&&!right;
 more.dataset.direction=left?'left':'right';
 more.querySelector('svg').style.rotate=left?'0deg':'180deg';
 more.setAttribute('aria-label',left?'عرض التبويبات التالية':'العودة إلى التبويبات الأولى');
}
more?.addEventListener('click',()=>tabbar.scrollBy({left:more.dataset.direction==='left'?-240:240,behavior:'smooth'}));
tabbar?.addEventListener('scroll',updateTabs,{passive:true});
window.addEventListener('resize',updateTabs);
updateTabs();
const search=document.querySelector('#participant-search');
const sort=document.querySelector('#participant-sort');
const list=document.querySelector('#participant-list');
function updateParticipants(){
 const cards=[...list.querySelectorAll('.participant')];
 for(const card of cards)card.hidden=!card.dataset.name.includes(search.value.trim());
 cards.sort((a,b)=>sort.value==='name'?a.dataset.name.localeCompare(b.dataset.name,'ar'):Number(a.dataset.rank)-Number(b.dataset.rank));
 list.append(...cards);
 document.querySelector('#search-empty').classList.toggle('hidden',cards.some(c=>!c.hidden));
}
search?.addEventListener('input',updateParticipants);
sort?.addEventListener('change',updateParticipants);
