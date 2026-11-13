/* بطاقة الترتيب النهائية 1080×1920 (001-T021/T022، R-14..R-17): صورة واحدة بكل المشاركين، بنسختين (ليلية ونهارية).
 * تحل محل بطاقتي الترتيب والستوري القديمتين. المواصفة الرقمية: assets/cards/standings-card.layout.md (بالحرف).
 * الاعتماد: card-kit.js وcard-layout.js وcrests.js وar-format.js ومحرك الترتيب (computeStandings, getMovements). */

const STANDINGS_CARD_W = 1080, STANDINGS_CARD_H = 1920;
const STANDINGS_CARD_THEME_KEY = 'brookie-card-theme';
const STANDINGS_CARD_URL = 'wwrrp456-web.github.io/brookie-fantasy-league/';

// بيانات البطاقة من محرك الموقع (بلا إعادة ترتيب ولا حساب رصيد)
function getStandingsCardData(){
  const st = computeStandings();
  const mv = getMovements();
  return {
    round: getCurrentRoundNumber(),
    standings: st.map((s, i) => {
      const p = PARTICIPANTS.find(x => x.id === s.id) || {};
      return {rank: i + 1, id: s.id, name: s.name, total: s.total, move: mv[s.id] || 0, clubs: (p.teams || []).slice()};
    })
  };
}

// يرسم البطاقة: opts {theme, data, meId, note, countLabel}. note وcountLabel (اختياريان، للعينات الاختبارية فقط): سطر تنبيه تحت العدد، وبديل نص العدد.
// يرمي CardDataError لو البيانات ناقصة (الكرت الناقص ما يُصدَّر).
async function buildStandingsCardCanvas(opts){
  const o = opts || {};
  const theme = cardResolveTheme(o.theme);
  const data = o.data || getStandingsCardData();
  const problems = validateCardData('standings', data);
  if(problems.length) throw new CardDataError(problems);

  const rows = data.standings;
  const n = rows.length;
  const L = computeStandingsCardLayout(n);
  const sc = L.scale;
  const meId = (o.meId !== undefined) ? o.meId : (typeof MY_ID !== 'undefined' ? MY_ID : null);

  await cardFontsReady([[24, 400], [20, 400], [44, 800], [sc.name, 800], [sc.score, 800], [sc.rank, 800], [sc.motion, 400]]);
  await cardPreloadClubs(rows.reduce((a, p) => a.concat(p.clubs), []), theme);

  const cv = document.createElement('canvas');
  cv.width = STANDINGS_CARD_W; cv.height = STANDINGS_CARD_H;
  const ctx = cv.getContext('2d');

  await cardDrawBackground(ctx, theme, STANDINGS_CARD_W, STANDINGS_CARD_H);

  const text = cardColor(theme, 'text'), text2 = cardColor(theme, 'text-2');

  // ---- الرأس (y 64..192): الشعار 88 يمينًا، والعنوان، والعدد يسارًا
  await cardDrawLogo(ctx, theme, 916, 76.9375, 88);
  cardText(ctx, `الموسم الثاني · الجولة ${data.round}`, 892, 99.5, {size: 24, weight: 400, color: text2, align: 'right'});
  cardText(ctx, 'الترتيب العام', 892, 143.5, {size: 44, weight: 800, color: text, align: 'right'});
  const countText = o.countLabel || formatCount(n, 'مشارك');
  if(o.note){
    cardText(ctx, countText, 76, 113.5, {size: 24, weight: 400, color: text2, align: 'left'});
    cardText(ctx, o.note, 76, 145.5, {size: 20, weight: 400, color: text2, align: 'left'});
  } else {
    cardText(ctx, countText, 76, 127.5, {size: 24, weight: 400, color: text2, align: 'left'});
  }
  cardHRule(ctx, theme, 64, 191, 952);

  // ---- عناوين الأعمدة (مركز خط y=228): # | الحركة | المشارك | الأندية | الرصيد
  const lab = {size: 24, weight: 400, color: text2};
  cardText(ctx, '#', 980, 228, {...lab, align: 'center'});
  cardText(ctx, 'الحركة', 908, 228, {...lab, align: 'center'});
  cardText(ctx, 'المشارك', 856, 228, {...lab, align: 'right'});
  cardText(ctx, 'الأندية', 240, 228, {...lab, align: 'center'});
  cardText(ctx, 'الرصيد', 120, 228, {...lab, align: 'center'});

  // ---- الصفوف
  const upColor = cardAccent(theme, 'up'), downColor = cardAccent(theme, 'down');
  const upIcon = await cardIconImage('arrow-up', upColor, sc.motion);
  const downIcon = await cardIconImage('arrow-down', downColor, sc.motion);
  const stillIcon = await cardIconImage('snowflake', text2, sc.motion);

  for(let i = 0; i < n; i++){
    const p = rows[i], row = L.rows[i], top = row.top, cy = row.center;
    if(i % 2 === 0){
      ctx.fillStyle = cardColor(theme, 'surface-1');
      drawRoundedRect(ctx, 64, top, 952, L.r, 8);
      ctx.fill();
    }
    cardHRule(ctx, theme, 72, top + L.r - 1, 936);
    if(meId !== null && meId !== undefined && p.id === meId){
      ctx.fillStyle = cardColor(theme, 'brand');
      drawRoundedRect(ctx, 1014, top + 4, 2, L.r - 8, 1);
      ctx.fill();
    }
    // المركز (وزن 800؛ الأول بلون الذهب)
    cardText(ctx, p.rank, 980, cy, {size: sc.rank, weight: 800, color: p.rank === 1 ? cardAccent(theme, 'gold') : text, align: 'center', dir: 'ltr'});
    // الحركة: أيقونة يمينًا ثم فجوة 4 ثم القيمة المطلقة؛ الصفر ← snowflake وحدها
    const M = sc.motion;
    if(!p.move){
      cardDrawImage(ctx, stillIcon, 908 - M / 2, cy - M / 2, M, M);
    } else {
      const val = String(Math.abs(p.move));
      const tw = cardTextWidth(ctx, val, M, 400);
      const gw = M + 4 + tw;
      const right = 908 + gw / 2;
      cardDrawImage(ctx, p.move > 0 ? upIcon : downIcon, right - M, cy - M / 2, M, M);
      cardText(ctx, val, 908 - gw / 2, cy, {size: M, weight: 400, color: text2, align: 'left', dir: 'ltr'});
    }
    // الاسم (يمين عند 856)، والأندية (مركز 240)، والرصيد (مركز 120، LTR)
    cardText(ctx, p.name, 856, cy, {size: sc.name, weight: 800, color: text, align: 'right', dir: 'rtl'});
    cardDrawCrestRow(ctx, p.clubs, 240, cy, sc.crest, theme);
    cardText(ctx, p.total, 120, cy, {size: sc.score, weight: 800, color: text, align: 'center', dir: 'ltr'});
  }

  // ---- التذييل (y 1824): قاعدة النقاط يمينًا، والرابط يسارًا
  cardDrawFooter(ctx, theme, {y: 1824, centerY: 1872.5, right: 'فوز 3 · تعادل 1 · خسارة 0', left: STANDINGS_CARD_URL});
  return cv;
}

// ---------- اختيار الوضع (داكن/فاتح): الافتراضي ثيم الموقع، والاختيار يُحفظ للمشارك ----------
function getStandingsCardTheme(){
  try{
    const v = localStorage.getItem(STANDINGS_CARD_THEME_KEY);
    if(v === 'dark' || v === 'light') return v;
  }catch(e){}
  return cardResolveTheme();
}
function setStandingsCardTheme(theme){
  try{ localStorage.setItem(STANDINGS_CARD_THEME_KEY, theme === 'light' ? 'light' : 'dark'); }catch(e){}
}
function standingsCardFilename(round, theme){ return `brookie-standings-round-${round}-${theme}.png`; }

// نافذة صغيرة بخيارين (داكن/فاتح) تُرجع الخيار المختار (أو null لو أُلغيت). الافتراضي: المحفوظ ثم ثيم الموقع.
function askStandingsCardTheme(action){
  return new Promise(resolve => {
    const prev = document.getElementById('cardThemeSheet');
    if(prev) prev.remove();
    const cur = getStandingsCardTheme();
    const sheet = document.createElement('div');
    sheet.id = 'cardThemeSheet';
    sheet.className = 'card-theme-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', 'وضع صورة الترتيب');
    const opt = (t, label, icon) => `<button type="button" class="card-theme-opt${cur === t ? ' selected' : ''}" data-theme="${t}" aria-pressed="${cur === t}">${ICONS[icon]}<span>${label}</span></button>`;
    sheet.innerHTML = `<div class="card-theme-box">
      <h3 class="card-theme-title">${action === 'share' ? 'مشاركة' : 'تحميل'} الترتيب بوضع</h3>
      <div class="card-theme-opts">${opt('dark', 'داكن', 'moon')}${opt('light', 'فاتح', 'sun')}</div>
      <button type="button" class="btn ghost card-theme-cancel">إلغاء</button>
    </div>`;
    const done = v => { sheet.remove(); resolve(v); };
    sheet.addEventListener('click', e => {
      const b = e.target.closest('.card-theme-opt');
      if(b){ done(b.dataset.theme); return; }
      if(e.target.closest('.card-theme-cancel') || e.target === sheet) done(null);
    });
    sheet.addEventListener('keydown', e => { if(e.key === 'Escape') done(null); });
    document.body.appendChild(sheet);
    const first = sheet.querySelector('.card-theme-opt.selected') || sheet.querySelector('.card-theme-opt');
    if(first) first.focus();
  });
}

function _standingsMsg(html){ const box = document.getElementById('standingsImgBox'); if(box) box.innerHTML = html; }

// يبني البطاقة بالوضع المختار ويصدّرها (تحميل أو مشاركة). رسالة عربية للكرت الناقص، وبلا تصدير.
async function exportStandingsCard(action, forcedTheme){
  const btn = document.getElementById(action === 'share' ? 'shareStandingsBtn' : 'dlStandingsBtn');
  const theme = forcedTheme || await askStandingsCardTheme(action);
  if(!theme) return false;
  setStandingsCardTheme(theme);
  _standingsMsg('<p class="status-msg">جارٍ تجهيز صورة الترتيب…</p>');
  if(btn) btn.disabled = true;
  try{
    const cv = await buildStandingsCardCanvas({theme});
    const round = getCurrentRoundNumber();
    const filename = standingsCardFilename(round, theme);
    if(action === 'share'){
      const shared = await tryShareCanvas(cv, filename, 'ترتيب دوري بروكي', `الترتيب العام بعد الجولة ${round}`);
      if(shared){ _standingsMsg('<div class="status-msg ok">تم فتح المشاركة</div>'); return true; }
      downloadCanvasPNG(cv, filename);
      _standingsMsg('<div class="status-msg ok">جهازك لا يدعم المشاركة المباشرة، فتم تحميل الصورة. أرسلها في الجروب.</div>');
      return true;
    }
    downloadCanvasPNG(cv, filename);
    _standingsMsg('<div class="status-msg ok">تم تحميل صورة الترتيب. أرسلها في الجروب.</div>');
    return true;
  }catch(e){
    if(e && e.name === 'CardDataError') _standingsMsg(`<div class="status-msg err">ما نقدر نجهّز صورة الترتيب: ${e.problems.join('، ')}.</div>`);
    else _standingsMsg('<div class="status-msg err">تعذّر تجهيز الصورة، حاول مرة ثانية.</div>');
    return false;
  } finally {
    if(btn) btn.disabled = false;
  }
}
function downloadStandingsImage(){ return exportStandingsCard('download'); }
function shareStandingsImage(){ return exportStandingsCard('share'); }
