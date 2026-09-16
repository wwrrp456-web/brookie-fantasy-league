/* منطق التنقل بين التبويبات + renderAll() الموزّع الرئيسي */

// ---------- آخر تحديث ----------
function renderUpdatedChip(){
  const chip = document.getElementById('updatedChip');
  if(!chip) return;
  chip.textContent = DATA.updatedAt ? `آخر تحديث: ${timeAgo(DATA.updatedAt)}` : 'لم تُسجَّل جولات بعد';
}
// يحدّث نص "آخر تحديث" كل دقيقة تلقائيًا حتى بدون أي تغيير فعلي في البيانات
// (بما إنه الآن مع المزامنة اللحظية ممكن الصفحة تبقى مفتوحة لفترة طويلة).
setInterval(renderUpdatedChip, 60000);

// ---------- نقطة تنبيه تحديث جديد على تبويب "الترتيب العام" ----------
// تُظهر نقطة صغيرة على التبويب لو صار تحديث (جولة جديدة عبر المزامنة اللحظية)
// والمستخدم حاليًا فاتح تبويبًا غير "الترتيب العام" فلم يلاحظه. تُخفى تلقائيًا
// بمجرد فتح تبويب الترتيب (يُعتبر التحديث "مُشاهَدًا" شخصيًا لهذا الزائر، فيُحفظ
// محليًا في متصفحه — shared:false — بنفس منطق "مين أنت").
function renderUpdateDot(){
  const dot = document.getElementById('standingsUpdateDot');
  if(!dot) return;
  const standingsBtn = document.querySelector('nav.tabs button[data-tab="standings"]');
  const isStandingsActive = !!(standingsBtn && standingsBtn.classList.contains('active'));
  if(isStandingsActive){
    if(DATA.updatedAt) localStorage.setItem('brookie-last-seen-update', String(DATA.updatedAt));
    dot.hidden = true;
    return;
  }
  const lastSeen = Number(localStorage.getItem('brookie-last-seen-update')||0);
  dot.hidden = !(DATA.updatedAt && DATA.updatedAt > lastSeen);
}

// ---------- Rendering ----------
function renderAll(){
  renderHeroes();
  renderRoundStoryCard();
  renderWhatsNewCard();
  renderStandings();
  renderNameReactions();
  renderHonorBoard();
  renderBadges();
  renderWeeklyDuels();
  renderBottomRace();
  renderParticipants();
  renderRounds();
  renderSeasonProgress();
  renderRoundsInsights();
  renderChampionsArchive();
  renderChart();
  renderMedals();
  renderRankHistory();
  renderSurprises();
  renderMyAchievements();
  renderNightMode();
  renderWhatIf();
  renderScenario();
  renderRankLeaderboard();
  renderDeathMap();
  renderRadar();
  renderSmartProfile();
  renderRace();
  renderClubEfficiency();
  renderClubMap();
  renderPredChallenge();
  renderRoundComments();
  renderRoundWall();
  renderRoundChallenge();
  renderRoundPoll();
  renderRecords();
  renderSubGroups();
  renderHotColdStreaks();
  renderBadgeToast();
  renderClubSwapLab();
  renderPersonalStatusBar();
  renderLiveFocusToggleButton();
  renderLiveFocusMode();
  renderH2H();
  renderSeasonDuel();
  renderMySeasonDuels();
  renderPredictionAccuracy();
  renderClubStats();
  renderUpdatedChip();
  renderUpdateDot();
  renderPredictions();
  renderCountdown();
  renderMyDashboard();
  renderAboutLeague();
  renderSeasonStory();
  renderAdminActivityLog();
  // قسم تكريم البطل — كل الميزات تفحص أعلامها الخاصة وتخرج فورًا إن كانت معطّلة
  renderChampionBanner();
  renderChampionCrown();
  renderChampionHero();
  renderHallOfFame();
  checkChampionAlerts();
}

// ---------- Tabs ----------
document.querySelectorAll('nav.tabs button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('nav.tabs button').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('section.panel').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-'+btn.dataset.tab).classList.add('active');
    renderUpdateDot();
  });
});

// ---------- مؤشر حالة الاتصال بالإنترنت ----------
// بما إن الموقع صار يعمل جزئيًا بدون إنترنت (PWA + service worker)، هذه
// الشارة تنبّه الزائر إن الصفحة قد تعرض بيانات مخزَّنة قديمة إذا انقطع
// اتصاله، بدل ما يتفاجأ إن الأرقام ما تتحدّث.
function updateOfflineBadge(){
  const badge = document.getElementById('offlineBadge');
  if(!badge) return;
  badge.hidden = navigator.onLine;
}
