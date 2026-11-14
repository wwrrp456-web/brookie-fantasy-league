/* كرت بطل الجولة 1080×1350 (001-T022b، R-14..R-17): صورة واحدة بنسختين (ليلية ونهارية).
 * يحل محل buildChampionCard القديم. المواصفة الرقمية: assets/cards/cards.layout.md (قسم champion-post، وchampion-post-stress).
 * الاعتماد: card-kit.js وstandings-card.js (نافذة الوضع) وcrests.js وar-format.js ومحرك الجولات. الألوان من card-themes.js فقط. */

const CHAMPION_CARD_W = 1080, CHAMPION_CARD_H = 1350;
const CHAMPION_CARD_BG = {dark: 'assets/cards/bg-post.webp', light: 'assets/cards/bg-post-light.webp'};
const CHAMPION_RESULT_LABEL = {win: 'فوز', draw: 'تعادل', loss: 'خسارة'};

// بيانات الكرت من محرك الموقع: البطل من getRoundHeroes، ونتائج أنديته من آخر جولة، ومركزه ورصيده وحركته من الترتيب.
// يرجع null لو لا توجد جولات.
function getChampionCardData(){
  const h = getRoundHeroes();
  if(!h || !h.top) return null;
  const st = computeStandings();
  const idx = st.findIndex(x => x.id === h.top.id);
  const mv = getMovements();
  const last = DATA.rounds.length ? DATA.rounds[DATA.rounds.length - 1] : null;
  const entries = (last && last.entries && last.entries[h.top.id]) || [];
  const clubs = h.top.teams.map((club, ti) => {
    const e = (typeof getTeamRoundEntries === 'function' ? getTeamRoundEntries(entries, ti) : [entries[ti]]).filter(Boolean)[0];
    if(!e || !e.result) return {club, result: 'no_match', opp: null, gf: 0, ga: 0};
    return {club, result: e.result, opp: e.opp || null, gf: Number(e.gf) || 0, ga: Number(e.ga) || 0};
  });
  let tiebreak = null;
  if(h.top.tieBreak && last) tiebreak = computeRoundGoals(last, h.top.id);
  return {
    round: h.roundNumber, id: h.top.id, name: h.top.name, points: h.top.points, clubs,
    rank: idx + 1, total: idx >= 0 ? st[idx].total : NaN, move: mv[h.top.id] || 0,
    tiebreak, date: formatDate(new Date(), {style: 'full'})
  };
}

// «هدف واحد مسجل» · «هدفان مسجلان» · «7 أهداف مسجلة» · «11 هدفًا مسجلًا» · «بلا أهداف مسجلة» (الصفة تطابق المعدود؛ الإملاء كما بالقالب المعتمد)
function _chGoals(n, adj){
  const c = formatCount(n, 'هدف');
  if(n === 0) return c + ' ' + adj + 'ة';
  if(n === 1) return c + ' ' + adj;
  if(n === 2) return c + ' ' + adj + 'ان';
  const r = n >= 100 ? n % 100 : n;
  if(n >= 100 && r <= 2) return c + ' ' + adj;                 // 100 وما يليها بباقي 0 و1 و2: التمييز مجرور مفرد
  return c + ' ' + adj + (r <= 10 ? 'ة' : 'ًا');
}

// حواف مربعات CSS تُقرَّب لأقرب بكسل (مثل المتصفح)
function _chRect(ctx, x, y, w, h, r){
  const x0 = Math.round(x), y0 = Math.round(y), x1 = Math.round(x + w), y1 = Math.round(y + h);
  drawRoundedRect(ctx, x0, y0, x1 - x0, y1 - y0, r);
}

// يرسم الكرت: opts {theme, data}. يرمي CardDataError لو البيانات ناقصة (الكرت الناقص ما يُصدَّر).
async function buildChampionCardCanvas(opts){
  const o = opts || {};
  const theme = cardResolveTheme(o.theme);
  const data = o.data || getChampionCardData();
  const problems = validateCardData('champion', data);
  if(problems.length) throw new CardDataError(problems);

  const W = CHAMPION_CARD_W, H = CHAMPION_CARD_H;
  await cardFontsReady([[24, 400], [28, 700], [32, 400], [40, 700], [48, 800], [72, 800], [144, 800]]);
  await cardPreloadClubs(data.clubs.map(c => c.club), theme);

  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  await cardDrawBackground(ctx, theme, W, H, CHAMPION_CARD_BG);

  const text = cardColor(theme, 'text'), text2 = cardColor(theme, 'text-2');
  const gold = cardAccent(theme, 'gold'), up = cardAccent(theme, 'up'), down = cardAccent(theme, 'down');

  // ---- الرأس: الشعار يمينًا (176)، والعنوان بمحاذاة اليمين عند 776، والكأس الذهبية 48 يسارًا عند 96
  await cardDrawLogo(ctx, theme, 808, 96, 176);
  cardTextBase(ctx, `الموسم الثاني · الجولة ${data.round}`, 776, 168.921875, {size: 24, weight: 400, color: text2, align: 'right'});
  cardTextBase(ctx, `بطل الجولة ${data.round}`, 776, 221.921875, {size: 48, weight: 800, color: text, align: 'right'});
  cardDrawImage(ctx, await cardIconImage('trophy', gold, 48), 96, 173.109375, 48, 48);
  cardHRule(ctx, theme, 64, 330, 952);

  // ---- الاسم (72/800 وسط)، وينكمش لو تجاوز عرض المحتوى (952) بلا قصّ
  const fit = cardFitText(ctx, data.name, 952, {size: 72, weight: 800, maxLines: 1, minSize: 36});
  cardTextBase(ctx, fit.lines[0], 540, 395.25 - (72 - fit.size) * 0.3, {size: fit.size, weight: 800, color: text, align: 'center'});

  // ---- نقاط الجولة: الرقم 144 يمينًا ثم فجوة 16 ثم "نقاط الجولة" 32، بخط أساس واحد (548.84)
  const numW = cardTextWidth(ctx, data.points, 144, 800), labW = cardTextWidth(ctx, 'نقاط الجولة', 32, 400);
  const blockRight = 540 + (numW + 16 + labW) / 2;
  cardTextBase(ctx, data.points, blockRight, 548.84375, {size: 144, weight: 800, color: text, align: 'right', dir: 'ltr'});
  cardTextBase(ctx, 'نقاط الجولة', blockRight - numW - 16, 548.84375, {size: 32, weight: 400, color: text2, align: 'right'});

  // ---- أندية البطل: ثلاث لوحات (الأول يمينًا)، العرض 309.33 والفجوة 12
  const PW = 309.328125, PY = 623.234375, PH = 306.96875;
  const checkIcon = await cardIconImage('check', up, 24), lossIcon = await cardIconImage('close', down, 24);
  const light = theme === 'light';
  for(let i = 0; i < 3; i++){
    const c = data.clubs[i];
    const px = 1016 - PW - i * (PW + 12), cx = px + PW / 2;
    if(light){
      ctx.save();
      ctx.shadowColor = `rgba(${cardParseHex(cardColor(theme, 'text')).join(',')},0.06)`;
      ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
      ctx.fillStyle = cardColor(theme, 'surface-1');
      _chRect(ctx, px, PY, PW, PH, 16); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = cardColor(theme, 'surface-1');
    _chRect(ctx, px, PY, PW, PH, 16); ctx.fill();
    ctx.strokeStyle = cardColor(theme, 'border'); ctx.lineWidth = 1;
    _chRect(ctx, px + 0.5, PY + 0.5, PW - 1, PH - 1, 15.5); ctx.stroke();

    drawCrest(ctx, c.club, cx - 32, 640.234375, 64, 70.4, {theme});
    const nm = cardFitText(ctx, c.club, PW - 34, {size: 28, weight: 700, maxLines: 1, minSize: 18});
    cardTextBase(ctx, nm.lines[0], cx, 745.625, {size: nm.size, weight: 700, color: text, align: 'center'});
    if(c.result === 'no_match'){
      cardTextBase(ctx, 'لا مباراة', cx, 846.515625, {size: 32, weight: 400, color: text2, align: 'center'});
      continue;
    }
    if(c.opp) cardTextBase(ctx, `أمام ${c.opp}`, cx, 790.8125, {size: 24, weight: 400, color: text2, align: 'center'});
    cardTextBase(ctx, `${c.gf} – ${c.ga}`, cx, 851.8125, {size: 48, weight: 800, color: text, align: 'center', dir: 'ltr'});
    // سطر النتيجة: أيقونة 24 يمينًا ثم فجوة 8 ثم النص، متمركز
    const label = CHAMPION_RESULT_LABEL[c.result];
    const lw = cardTextWidth(ctx, label, 24, 400), gw = 24 + 8 + lw, gx = cx - gw / 2;
    if(light){
      const tint = c.result === 'win' ? cardMix(cardColor(theme, 'up'), cardColor(theme, 'surface-1'), 0.08)
        : c.result === 'loss' ? cardMix(cardColor(theme, 'down'), cardColor(theme, 'surface-1'), 0.08) : cardColor(theme, 'surface-2');
      ctx.fillStyle = tint; _chRect(ctx, gx, 884.203125, gw, 29, 14.5); ctx.fill();
    }
    if(c.result === 'win') cardDrawImage(ctx, checkIcon, gx + gw - 24, 886.703125, 24, 24);
    else if(c.result === 'loss') cardDrawImage(ctx, lossIcon, gx + gw - 24, 886.703125, 24, 24);
    else { ctx.fillStyle = text2; ctx.fillRect(Math.round(gx + gw - 19), 898, 14, 2); }
    cardTextBase(ctx, label, gx + lw, 901.203125, {size: 24, weight: 400, color: text, align: 'right'});
  }

  // ---- الشريط: المركز | الرصيد | الحركة (حدّان أفقيان)
  cardHRule(ctx, theme, 64, 946, 952);
  cardHRule(ctx, theme, 64, 1078, 952);
  const colW = 309.34375;
  const cxs = [1016 - colW / 2, 540, 64 + colW / 2];
  cardTextBase(ctx, 'المركز', cxs[0], 985.203125, {size: 24, weight: 400, color: text2, align: 'center'});
  cardTextBase(ctx, data.rank, cxs[0], 1037.203125, {size: 40, weight: 700, color: text, align: 'center', dir: 'ltr'});
  cardTextBase(ctx, 'الرصيد', cxs[1], 985.203125, {size: 24, weight: 400, color: text2, align: 'center'});
  cardTextBase(ctx, data.total, cxs[1], 1037.203125, {size: 40, weight: 700, color: text, align: 'center', dir: 'ltr'});
  cardTextBase(ctx, 'الحركة', cxs[2], 980.203125, {size: 24, weight: 400, color: text2, align: 'center'});
  const mvLabel = data.move === 0 ? 'ثابت' : String(Math.abs(data.move));
  const mvIconName = data.move === 0 ? 'snowflake' : data.move > 0 ? 'arrow-up' : 'arrow-down';
  const mvColor = data.move === 0 ? text2 : data.move > 0 ? up : down;
  const mvW = cardTextWidth(ctx, mvLabel, 40, 700), mvGw = 32 + 4 + mvW, mvRight = cxs[2] + mvGw / 2;
  cardDrawImage(ctx, await cardIconImage(mvIconName, mvColor, 32), mvRight - 32, 1010.203125, 32, 32);
  cardTextBase(ctx, mvLabel, mvRight - 36, 1032.203125, {size: 40, weight: 700, color: text, align: 'right', dir: data.move === 0 ? 'rtl' : 'ltr'});

  // ---- كسر التعادل (إن وُجد): أيقونة الميزان 24 يمينًا ثم النص، متمركز
  if(data.tiebreak){
    const t = `كسر التعادل: ${_chGoals(data.tiebreak.gf, 'مسجل')}، و${_chGoals(data.tiebreak.ga, 'مستقبل')}.`;
    const tw = cardTextWidth(ctx, t, 24, 400), tg = 24 + 8 + tw, tx = 540 - tg / 2;
    cardDrawImage(ctx, await cardIconImage('scale', text2, 24), tx + tg - 24, 1098.75, 24, 24);
    cardTextBase(ctx, t, tx + tw, 1116.203125, {size: 24, weight: 400, color: text2, align: 'right'});
  }

  // ---- التاريخ (وسط) والتذييل
  cardTextBase(ctx, data.date, 540, 1175, {size: 24, weight: 400, color: text2, align: 'center'});
  cardDrawFooter(ctx, theme, {y: 1254, centerY: 1302.5, right: 'فوز 3 · تعادل 1 · خسارة 0', left: STANDINGS_CARD_URL});
  return cv;
}

// ---------- التصدير (تحميل/مشاركة) بالوضع المختار؛ الاختيار محفوظ ومشترك مع بطاقة الترتيب ----------
function championCardFilename(round, theme){ return `brookie-champion-round-${round}-${theme}.png`; }

async function exportChampionCard(action, forcedTheme, box){
  const target = box || document.getElementById('copyBox');
  const say = html => { if(target) target.querySelector('.champ-msg').innerHTML = html; };
  const theme = forcedTheme || await askStandingsCardTheme(action, 'بطل الجولة');
  if(!theme) return false;
  setStandingsCardTheme(theme);
  try{
    const data = getChampionCardData();
    const cv = await buildChampionCardCanvas({theme, data});
    const filename = championCardFilename(data.round, theme);
    if(action === 'share'){
      const shared = await tryShareCanvas(cv, filename, 'بطل الجولة', `بطل الجولة ${data.round}: ${data.name} ${arBaPrefix(formatCount(data.points, 'نقطة', {case: 'acc'}))}`);
      if(shared){ say('<div class="status-msg ok">تم فتح المشاركة</div>'); return true; }
      downloadCanvasPNG(cv, filename);
      say('<div class="status-msg ok">جهازك لا يدعم المشاركة المباشرة، فتم تحميل الصورة. أرسلها في المجموعة.</div>');
      return true;
    }
    downloadCanvasPNG(cv, filename);
    say('<div class="status-msg ok">تم تحميل صورة بطل الجولة. أرسلها في المجموعة.</div>');
    return true;
  }catch(e){
    if(e && e.name === 'CardDataError') say(`<div class="status-msg err">تعذّر تجهيز كرت بطل الجولة: ${e.problems.join('، ')}.</div>`);
    else say('<div class="status-msg err">تعذّر تجهيز الصورة، حاول مرة أخرى.</div>');
    return false;
  }
}

// يعرض معاينة الكرت (بثيم الموقع) مع أزرار المشاركة والتحميل (كلاهما يسأل عن الوضع)
async function showChampionCard(){
  const box = document.getElementById('copyBox');
  if(!getRoundHeroes()){
    box.innerHTML = '<div class="status-msg err">لا توجد جولات مسجّلة بعد. يظهر كرت البطل بعد أول جولة.</div>';
    return;
  }
  box.innerHTML = '<p class="status-msg">جارٍ تجهيز الكرت…</p>';
  try{
    const cv = await buildChampionCardCanvas({theme: getStandingsCardTheme()});
    box.innerHTML = '';
    cv.id = 'championCanvas';
    box.appendChild(cv);
    fireConfetti();
    const acts = document.createElement('div');
    acts.className = 'champ-actions';
    acts.innerHTML = `
      <button class="btn" id="shareCardBtn">${ICONS.share} مشاركة الكرت</button>
      <button class="btn secondary" id="dlCardBtn">${ICONS.download} تحميل الصورة</button>
      <button class="btn ghost" id="closeCardBtn">إغلاق</button>`;
    box.appendChild(acts);
    const msg = document.createElement('div'); msg.className = 'champ-msg'; box.appendChild(msg);
    document.getElementById('dlCardBtn').onclick = () => exportChampionCard('download', null, box);
    document.getElementById('shareCardBtn').onclick = () => exportChampionCard('share', null, box);
    document.getElementById('closeCardBtn').onclick = () => { box.innerHTML = ''; };
  }catch(e){
    if(e && e.name === 'CardDataError') box.innerHTML = `<div class="status-msg err">تعذّر تجهيز كرت بطل الجولة: ${e.problems.join('، ')}.</div>`;
    else box.innerHTML = '<div class="status-msg err">تعذّر تجهيز الكرت، حاول مرة أخرى.</div>';
  }
}
