/* كرت نتائج أنديتي 1080×1350 (001-T025، US-7، R-17): نتائج أندية المشارك الثلاثة في آخر جولة مكتملة، بنسختين (ليلية ونهارية).
 * المصدر: مدخلات آخر جولة (round.entries[pid])، ولا يعتمد على ميزة 005 (plan.md). بلا بيانات ← حالة فاضية (empty-state.js)، والكرت الناقص ما يُصدَّر.
 * المواصفة الرقمية: assets/cards/cards.layout.md (my-clubs-post). الاعتماد: card-kit.js وstandings-card.js وwrap-profile-cards.js (exportThemedCard وWRAP_URL). */

const MY_CLUBS_CARD_BG = {dark: 'assets/cards/bg-post.webp', light: 'assets/cards/bg-post-light.webp'};
const MY_CLUBS_RESULT_LABEL = {win: 'فوز', draw: 'تعادل', loss: 'خسارة'};

function validateMyClubsData(data){
  const out = [];
  if(!data || typeof data !== 'object') return ['لا توجد بيانات للكرت'];
  if(!Number.isInteger(data.round) || data.round < 1) out.push('رقم الجولة غير محدد');
  if(!data.name) out.push('اسم المشارك ناقص');
  if(!Number.isFinite(data.roundPoints)) out.push('نقاط الجولة غير محددة');
  if(!Array.isArray(data.clubs) || data.clubs.length !== 3 || data.clubs.some(c => !c || !c.club)) out.push(`أندية ${data.name || 'المشارك'} ناقصة (المطلوب ثلاثة)`);
  else data.clubs.forEach(c => {
    if(c.result !== 'no_match' && !['win', 'draw', 'loss'].includes(c.result)) out.push(`نتيجة ${c.club} غير محددة`);
    else if(c.result !== 'no_match' && !(Number.isFinite(c.gf) && Number.isFinite(c.ga))) out.push(`أهداف مباراة ${c.club} ناقصة`);
  });
  return out;
}

// بيانات المشارك من آخر جولة مسجّلة. يرجع null لو ما فيه جولات أو ما فيه مدخلات للمشارك (← الحالة الفاضية)
function getMyClubsCardData(pid){
  const p = PARTICIPANTS.find(x => x.id === pid);
  const last = DATA.rounds.length ? DATA.rounds[DATA.rounds.length - 1] : null;
  const entries = (last && last.entries && last.entries[pid]) || [];
  if(!p || !last || !entries.filter(Boolean).length) return null;
  const clubs = (p.teams || []).map((club, ti) => {
    const e = (typeof getTeamRoundEntries === 'function' ? getTeamRoundEntries(entries, ti) : [entries[ti]]).filter(Boolean)[0];
    if(!e || !e.result) return {club, result: 'no_match', opp: null, gf: 0, ga: 0};
    return {club, result: e.result, opp: e.opp || null, gf: Number(e.gf) || 0, ga: Number(e.ga) || 0};
  });
  const rp = getCurrentRoundPointsMap()[pid];
  return {round: getCurrentRoundNumber(), id: pid, name: p.name, roundPoints: rp === undefined ? NaN : rp, clubs, date: formatDate(new Date(), {style: 'full'})};
}

// يرسم الكرت: opts {theme, data}. يرمي CardDataError لو البيانات ناقصة (الكرت الناقص ما يُصدَّر).
async function buildMyClubsCardCanvas(opts){
  const o = opts || {};
  const theme = cardResolveTheme(o.theme);
  const data = o.data;
  const problems = validateMyClubsData(data);
  if(problems.length) throw new CardDataError(problems);

  const W = 1080, H = 1350;
  await cardFontsReady([[24, 400], [32, 400], [32, 700], [48, 800], [72, 800], [96, 800]]);
  await cardPreloadClubs(data.clubs.map(c => c.club), theme);
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  await cardDrawBackground(ctx, theme, W, H, MY_CLUBS_CARD_BG);

  const text = cardColor(theme, 'text'), text2 = cardColor(theme, 'text-2'), brand = cardColor(theme, 'brand');
  const up = cardAccent(theme, 'up'), down = cardAccent(theme, 'down');
  const light = theme === 'light';

  // ---- الرأس
  await cardDrawLogo(ctx, theme, 808, 96, 176);
  cardTextBase(ctx, `الموسم الثاني · الجولة ${data.round}`, 776, 168.921875, {size: 24, weight: 400, color: text2, align: 'right'});
  cardTextBase(ctx, 'نتائج أنديتي', 776, 221.921875, {size: 48, weight: 800, color: text, align: 'right'});
  cardDrawImage(ctx, await cardIconImage('ball', brand, 48), 96, 173.109375, 48, 48);
  cardHRule(ctx, theme, 64, 330, 952);

  // ---- الاسم (72/800 وسط) والنقاط: الرقم 96 يمينًا ثم فجوة 16 ثم "نقاط الجولة" 32، بخط أساس واحد
  const fit = cardFitText(ctx, data.name, 952, {size: 72, weight: 800, maxLines: 1, minSize: 36});
  cardTextBase(ctx, fit.lines[0], 540, 395.25 - (72 - fit.size) * 0.3, {size: fit.size, weight: 800, color: text, align: 'center'});
  const numW = cardTextWidth(ctx, data.roundPoints, 96, 800), labW = cardTextWidth(ctx, 'نقاط الجولة', 32, 400);
  const blockRight = 540 + (numW + 16 + labW) / 2;
  cardTextBase(ctx, data.roundPoints, blockRight, 510.84375, {size: 96, weight: 800, color: text, align: 'right', dir: 'ltr'});
  cardTextBase(ctx, 'نقاط الجولة', blockRight - numW - 16, 510.84375, {size: 32, weight: 400, color: text2, align: 'right'});

  // ---- صفوف المباريات: ارتفاع 144 للا مباراة و175.8 للباقي، فاصل 16، والأول من y=562.44
  const checkIcon = await cardIconImage('check', up, 24), lossIcon = await cardIconImage('close', down, 24);
  let y = 562.4375;
  for(const c of data.clubs){
    const noMatch = c.result === 'no_match';
    const h = noMatch ? 144 : 175.796875;
    cardDrawPanel(ctx, theme, 64, y, 952, h);
    drawCrest(ctx, c.club, 927, y + (h - 70.390625) / 2, 64, 70.390625, {theme});
    if(noMatch){
      const nm = cardFitText(ctx, c.club, 672, {size: 32, weight: 700, maxLines: 1, minSize: 18});
      cardTextBase(ctx, nm.lines[0], 887, y + 76.59375, {size: nm.size, weight: 700, color: text, align: 'right'});
      cardTextBase(ctx, 'لا مباراة', 89, y + 76.99999, {size: 32, weight: 400, color: text2, align: 'left'});
    } else {
      const nm = cardFitText(ctx, c.club, 672, {size: 32, weight: 700, maxLines: 1, minSize: 18});
      cardTextBase(ctx, nm.lines[0], 887, y + 52, {size: nm.size, weight: 700, color: text, align: 'right'});
      if(c.opp) cardTextBase(ctx, `أمام ${c.opp}`, 887, y + 98.796875, {size: 24, weight: 400, color: text2, align: 'right'});
      cardTextBase(ctx, `${c.gf} – ${c.ga}`, 89, y + 94.703125, {size: 48, weight: 800, color: text, align: 'left', dir: 'ltr'});
      // سطر النتيجة: أيقونة 24 يمينًا (عند 863) ثم فجوة 8 ثم النص. بالنهاري خلفية حبّة بعرض العمود كله (688) كما في CSS القالب
      const ly = y + 123.796875;
      if(light){
        const tint = c.result === 'win' ? cardMix(cardColor(theme, 'up'), cardColor(theme, 'surface-1'), 0.08)
          : c.result === 'loss' ? cardMix(cardColor(theme, 'down'), cardColor(theme, 'surface-1'), 0.08) : cardColor(theme, 'surface-2');
        ctx.fillStyle = tint;
        drawRoundedRect(ctx, Math.round(199), Math.round(ly), Math.round(887) - Math.round(199), 29, 14.5); ctx.fill();
      }
      if(c.result === 'win') cardDrawImage(ctx, checkIcon, 863, ly + 2.5, 24, 24);
      else if(c.result === 'loss') cardDrawImage(ctx, lossIcon, 863, ly + 2.5, 24, 24);
      else { ctx.fillStyle = text2; ctx.fillRect(868, Math.round(ly + 13.5), 14, 2); }
      cardTextBase(ctx, MY_CLUBS_RESULT_LABEL[c.result], 855, ly + 15, {size: 24, weight: 400, color: text, align: 'right'});
    }
    y += h + 16;
  }
  // ملاحظة الجدول: بعد الصفوف بفاصل 12 (y الصفوف تنتهي عند y-16)
  cardTextBase(ctx, 'نتيجة كل مباراة من منظور النادي الظاهر.', 540, (y - 16) + 12 + 21, {size: 24, weight: 400, color: text2, align: 'center'});
  cardTextBase(ctx, data.date, 540, 1175, {size: 24, weight: 400, color: text2, align: 'center'});
  cardDrawFooter(ctx, theme, {y: 1254, centerY: 1302.5, right: 'فوز 3 · تعادل 1 · خسارة 0', left: WRAP_URL});
  return cv;
}

// ---------- التصدير والواجهة ----------
function myClubsCardFilename(round, pid, theme){ return `brookie-my-clubs-round-${round}-${pid}-${theme}.png`; }

function exportMyClubsCard(pid, msgBox){
  return exportThemedCard('share', null, {
    subject: 'نتائج أنديتي',
    say: html => { if(msgBox) msgBox.innerHTML = html; },
    build: async theme => {
      const data = getMyClubsCardData(pid);
      if(!data) throw new CardDataError(['لا توجد نتائج مسجّلة لأنديتك بعد']);
      const c = await buildMyClubsCardCanvas({theme, data});
      return {cv: c, filename: myClubsCardFilename(data.round, pid, theme), shareTitle: 'نتائج أنديتي', shareText: `نتائج أنديتي في الجولة ${data.round}`};
    }
  });
}

// كتلة "نتائج أنديتي" داخل "حالتي": زر المشاركة لو فيه بيانات، وإلا حالة فاضية (بلا زر)
function myClubsCardBlockHTML(pid){
  if(getMyClubsCardData(pid)){
    return `<button type="button" class="btn secondary my-clubs-card-btn" id="myClubsCardBtn" style="width:100%;margin-top:10px;">${ICONS.share} مشاركة نتائج أنديتي</button><div id="myClubsCardMsg"></div>`;
  }
  return `<div class="my-clubs-card-empty">${emptyState({icon: 'ball', title: 'لا نتائج بعد', text: 'تظهر نتائج أنديتك هنا بعد تسجيل أول جولة.'})}</div>`;
}
function bindMyClubsCardBlock(pid){
  const btn = document.getElementById('myClubsCardBtn');
  if(!btn) return;
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try{ await exportMyClubsCard(pid, document.getElementById('myClubsCardMsg')); }
    finally{ btn.disabled = false; }
  });
}
