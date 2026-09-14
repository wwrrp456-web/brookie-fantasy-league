/* نقطة الدخول: تشغيل التطبيق عند فتح الصفحة (يُحمَّل أخيرًا) */

// ---------- التشغيل الأولي عند فتح الصفحة ----------
document.getElementById('copySummaryBtn').addEventListener('click', renderCopyBox);
document.getElementById('champCardBtn').addEventListener('click', showChampionCard);
document.getElementById('seasonWrapBtn').addEventListener('click', showSeasonWrapCard);
document.getElementById('dlStandingsBtn').addEventListener('click', downloadStandingsImage);
document.getElementById('shareStandingsBtn').addEventListener('click', shareStandingsImage);
document.getElementById('dlStandingsStoryBtn').addEventListener('click', downloadStandingsStoryImage);

document.getElementById('dlParticipantsBtn').addEventListener('click', ()=>{
  downloadElementAsImage('participantsCapture', 'brookie-participants.png', 'participantsImgMsg', 'dlParticipantsBtn');
});
document.getElementById('dlRoundsBtn').addEventListener('click', ()=>{
  downloadElementAsImage('roundsCapture', `brookie-rounds-round-${getCurrentRoundNumber()}.png`, 'roundsImgMsg', 'dlRoundsBtn');
});
document.getElementById('dlStatsBtn').addEventListener('click', ()=>{
  downloadElementAsImage('statsCapture', 'brookie-stats.png', 'statsImgMsg', 'dlStatsBtn');
});
document.getElementById('dlRulesBtn').addEventListener('click', ()=>{
  downloadElementAsImage('rulesCapture', 'brookie-rules.png', 'rulesImgMsg', 'dlRulesBtn');
});
initMePicker();
loadMyId();
loadData();
loadPredictions();
loadAdminPin();
trackVisit();
loadChampionData().then(()=>{ renderAll(); syncChampionAdminUI(); });
startRealtimeSync();
// رابط مباشر لمشارك — يُطبَّق بعد تحميل البيانات والرسم
setTimeout(handleParticipantHash, 800);

// تسجيل service worker لدعم "أضف للشاشة الرئيسية" (PWA) — فشل التسجيل (مثلاً
// متصفح قديم لا يدعمه) لا يوقف أي شيء آخر في الصفحة، فقط تظل خاصية التثبيت
// غير متاحة.
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('sw.js').catch(e=>{
      console.warn('تعذّر تسجيل service worker (لا يمس عمل الصفحة):', e);
    });
  });
}
window.addEventListener('online', updateOfflineBadge);
window.addEventListener('offline', updateOfflineBadge);
updateOfflineBadge();
if(darkModeToggleBtn){
  darkModeToggleBtn.addEventListener('click', ()=>{
    let on = false;
    try{ on = localStorage.getItem(LIGHT_MODE_KEY) === '1'; }catch(e){}
    const next = !on;
    try{ localStorage.setItem(LIGHT_MODE_KEY, next ? '1' : '0'); }catch(e){}
    applyLightModePref();
  });
}
applyLightModePref();
initOnboarding();
