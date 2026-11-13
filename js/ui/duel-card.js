/* كرت مواجهة الجولة 1080×1350 (001-T024، US-7، R-17): مشاركان وجهًا لوجه، ونقاط كل واحد في الجولة، والفائز. بنسختين (ليلية ونهارية).
 * المواجهات من computeWeeklyDuels() (عشوائية بذرة ثابتة لكل جولة، للعرض فقط). المواصفة الرقمية: assets/cards/cards.layout.md (duel-post وduel-post-stress).
 * الاعتماد: card-kit.js وstandings-card.js (نافذة الوضع) وwrap-profile-cards.js (exportThemedCard) وcrests.js. الألوان من card-themes.js فقط. */

const DUEL_CARD_BG = {dark: 'assets/cards/bg-post.webp', light: 'assets/cards/bg-post-light.webp'};

function validateDuelData(data){
  const out = [];
  if(!data || typeof data !== 'object') return ['لا توجد بيانات للكرت'];
  if(!Number.isInteger(data.round) || data.round < 1) out.push('رقم الجولة غير محدد');
  ['a', 'b'].forEach(k => {
    const p = data[k];
    if(!p){ out.push('أحد طرفي المواجهة غير محدد'); return; }
    if(!p.name) out.push('اسم أحد المشاركين ناقص');
    if(!Array.isArray(p.clubs) || p.clubs.length !== 3 || p.clubs.some(c => !c)) out.push(`أندية ${p.name || 'المشارك'} ناقصة (المطلوب ثلاثة)`);
    if(!Number.isFinite(p.points)) out.push(`نقاط ${p.name || 'المشارك'} غير محددة`);
  });
  if(data.a && data.b && data.a.id !== undefined && data.a.id === data.b.id) out.push('طرفا المواجهة نفس المشارك');
  return out;
}

// بيانات مواجهة بين مشاركين (a وb) في الجولة الحالية، من نفس مصدر "تحدي مواجهة الجولة"
function getDuelCardData(aId, bId){
  const duel = computeWeeklyDuels().find(d => !d.bye && ((d.a.id === aId && d.b.id === bId) || (d.a.id === bId && d.b.id === aId)));
  if(!duel) return null;
  const side = (p, pts) => ({id: p.id, name: p.name, clubs: (p.teams || []).slice(), points: pts});
  return {
    round: getCurrentRoundNumber(),
    a: side(duel.a, duel.ap), b: side(duel.b, duel.bp),
    winner: duel.winner === null ? null : (duel.winner === duel.a.id ? 'a' : 'b'),
    date: formatDate(new Date(), {style: 'full'})
  };
}

// يرسم الكرت: opts {theme, data}. يرمي CardDataError لو البيانات ناقصة (الكرت الناقص ما يُصدَّر).
async function buildDuelCardCanvas(opts){
  const o = opts || {};
  const theme = cardResolveTheme(o.theme);
  const data = o.data;
  const problems = validateDuelData(data);
  if(problems.length) throw new CardDataError(problems);

  const W = 1080, H = 1350;
  await cardFontsReady([[24, 400], [40, 400], [48, 700], [48, 800], [56, 700], [144, 800]]);
  await cardPreloadClubs(data.a.clubs.concat(data.b.clubs), theme);
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  await cardDrawBackground(ctx, theme, W, H, DUEL_CARD_BG);

  const text = cardColor(theme, 'text'), text2 = cardColor(theme, 'text-2'), brand = cardColor(theme, 'brand'), gold = cardAccent(theme, 'gold');

  // ---- الرأس
  await cardDrawLogo(ctx, theme, 808, 96, 176);
  cardTextBase(ctx, `الموسم الثاني · الجولة ${data.round}`, 776, 168.921875, {size: 24, weight: 400, color: text2, align: 'right'});
  cardTextBase(ctx, `مواجهة الجولة ${data.round}`, 776, 221.921875, {size: 48, weight: 800, color: text, align: 'right'});
  cardDrawImage(ctx, await cardIconImage('swords', brand, 48), 96, 173.109375, 48, 48);
  cardHRule(ctx, theme, 64, 330, 952);

  // ---- الاسم: سطر واحد، أو سطران (متوازنان بلا كلمة يتيمة) لو ما كفى عرض اللوحة (430)؛ والسطر الثاني يزيد ارتفاع اللوحة 0.78
  const NAME_W = 430;
  const names = [data.a.name, data.b.name].map(n => cardFitText(ctx, n, NAME_W, {size: 56, weight: 700, maxLines: 2, minSize: 24}));
  const twoLines = names.some(f => f.lines.length > 1);
  const dy = twoLines ? 0.78125 : 0;
  const PH = 537.1875 + dy;

  // ---- لوحتا المشاركين: الأول (a) يمينًا
  const cols = [{p: data.a, x: 552, f: names[0]}, {p: data.b, x: 64, f: names[1]}];
  for(const c of cols){
    const cx = c.x + 232;
    cardDrawPanel(ctx, theme, c.x, 339.25, 464, PH);
    cardTextBase(ctx, 'المشارك', cx, 385.25, {size: 24, weight: 400, color: text2, align: 'center'});
    // الاسم داخل صندوق ارتفاعه 156 (+0.78) متمركز رأسيًا؛ كل سطر بارتفاع 78.4 وخط أساسه = مركزه + 8
    const n = c.f.lines.length, boxTop = 412.25, boxH = 156 + dy, lh = 78.4;
    c.f.lines.forEach((line, i) => {
      const center = boxTop + boxH / 2 - (n * lh) / 2 + lh * i + lh / 2;
      cardTextBase(ctx, line, cx, center + 8 * (c.f.size / 56), {size: c.f.size, weight: 700, color: text, align: 'center'});
    });
    // صف الشعارات (48×52.8، فاصل 12، الأول يمينًا)
    c.p.clubs.forEach((club, i) => drawCrest(ctx, club, cx + 84 - 48 - i * 60, 580.25 + dy, 48, 52.796875, {theme}));
    cardTextBase(ctx, c.p.points, cx, 745.046875 + dy, {size: 144, weight: 800, color: text, align: 'center', dir: 'ltr'});
    cardTextBase(ctx, 'نقاط الجولة', cx, 844.4375 + dy, {size: 24, weight: 400, color: text2, align: 'center'});
  }

  // ---- الفائز: حدّان أفقيان، وأيقونة التاج 48 يمينًا ثم فجوة 16 ثم سطران متمركزان (الفائز / الاسم)
  const wy = 892.4375 + dy;
  cardHRule(ctx, theme, 64, Math.round(wy), 952);
  cardHRule(ctx, theme, 64, Math.round(wy + 182) - 1, 952);
  const winner = data.winner === 'a' ? data.a : data.winner === 'b' ? data.b : null;
  const l1 = winner ? 'الفائز' : 'النتيجة', l2 = winner ? winner.name : 'تعادل';
  const w1 = cardTextWidth(ctx, l1, 40, 400), w2 = cardTextWidth(ctx, l2, 48, 700), spanW = Math.max(w1, w2);
  const gw = 48 + 16 + spanW, gx = 540 - gw / 2, sc = gx + spanW / 2;
  cardDrawImage(ctx, await cardIconImage(winner ? 'crown' : 'scale', winner ? gold : text2, 48), gx + spanW + 16, 959.4375 + dy, 48, 48);
  cardTextBase(ctx, l1, sc, 953.4375 + dy, {size: 40, weight: 400, color: text, align: 'center'});
  cardTextBase(ctx, l2, sc, 1020.4375 + dy, {size: 48, weight: 700, color: text, align: 'center'});

  cardTextBase(ctx, 'تُحسم مواجهة الجولة بنقاط الجولة، لا بالرصيد التراكمي.', 540, 1112.4375 + dy, {size: 24, weight: 400, color: text2, align: 'center'});
  cardTextBase(ctx, data.date, 540, 1175, {size: 24, weight: 400, color: text2, align: 'center'});
  cardDrawFooter(ctx, theme, {y: 1254, centerY: 1302.5, right: 'فوز 3 · تعادل 1 · خسارة 0', left: WRAP_URL});
  return cv;
}

// ---------- التصدير (تحميل/مشاركة) بالوضع المختار ----------
function duelCardFilename(round, aId, bId, theme){ return `brookie-duel-round-${round}-${aId}-${bId}-${theme}.png`; }

// زر "مشاركة المواجهة" داخل بطاقة المواجهة بالواجهة: يسأل عن الوضع ثم يشارك (أو ينزّل لو المشاركة غير مدعومة)
function exportDuelCard(aId, bId, msgBox){
  return exportThemedCard('share', null, {
    subject: 'مواجهة الجولة',
    say: html => { if(msgBox) msgBox.innerHTML = html; },
    build: async theme => {
      const data = getDuelCardData(aId, bId);
      if(!data) throw new CardDataError(['المواجهة غير موجودة في هذه الجولة']);
      const c = await buildDuelCardCanvas({theme, data});
      return {cv: c, filename: duelCardFilename(data.round, aId, bId, theme), shareTitle: 'مواجهة الجولة', shareText: `مواجهة الجولة ${data.round}: ${data.a.name} ضد ${data.b.name}`};
    }
  });
}
