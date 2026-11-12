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
  renderNotificationCenter();
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
  renderSeasonsArchive();
  checkChampionAlerts();
  // آخر استدعاء دائمًا — تعتمد على وجود كل عناوين تبويب الإحصائيات بالـDOM فعليًا
  renderStatsQuickNav();
}

// ---------- Tabs ----------
// الشريط يتمركز على التبويب النشط تلقائيًا، ويعرض تلاشيًا وسهمًا لو فيه تبويبات مخفية (001-T013، FR-03)
const tabsNav = document.getElementById('mainTabs');
const tabMoreBtn = document.getElementById('tabMoreBtn');
function centerActiveTab(smooth){
  const nav = tabsNav; if(!nav) return;
  const btn = nav.querySelector('button.active'); if(!btn) return;
  const n = nav.getBoundingClientRect(), r = btn.getBoundingClientRect();
  const delta = (r.left + r.width / 2) - (n.left + n.width / 2);
  nav.scrollBy({left: delta, behavior: smooth ? 'smooth' : 'auto'});
}
// تبويبات مخفية جهة اليسار (في RTL هناك التبويبات اللاحقة) ← تلاشٍ وسهم
function updateTabCues(){
  const nav = tabsNav; if(!nav) return;
  const n = nav.getBoundingClientRect();
  const first = nav.querySelector('button');
  const lefts = Array.from(nav.querySelectorAll('button')).map(b => b.getBoundingClientRect().left);
  const more = !!first && Math.min.apply(null, lefts) < n.left - 2;
  nav.classList.toggle('has-more', more);
  if(tabMoreBtn) tabMoreBtn.hidden = !more;
}
document.querySelectorAll('nav.tabs button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('nav.tabs button').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('section.panel').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-'+btn.dataset.tab).classList.add('active');
    renderUpdateDot();
    centerActiveTab(true);
  });
});
if(tabsNav){
  tabsNav.addEventListener('scroll', updateTabCues, {passive:true});
  window.addEventListener('resize', ()=>{ updateTabCues(); });
  if(tabMoreBtn) tabMoreBtn.addEventListener('click', ()=>{
    const rtl = getComputedStyle(tabsNav).direction === 'rtl';
    tabsNav.scrollBy({left: (rtl ? -1 : 1) * tabsNav.clientWidth * 0.7, behavior: 'smooth'});
  });
  centerActiveTab(false); updateTabCues();
}

// ---------- مؤشر حالة الاتصال بالإنترنت ----------
// بما إن الموقع صار يعمل جزئيًا بدون إنترنت (PWA + service worker)، هذه
// الشارة تنبّه الزائر إن الصفحة قد تعرض بيانات مخزَّنة قديمة إذا انقطع
// اتصاله، بدل ما يتفاجأ إن الأرقام ما تتحدّث.
function updateOfflineBadge(){
  const badge = document.getElementById('offlineBadge');
  if(!badge) return;
  badge.hidden = navigator.onLine;
}
