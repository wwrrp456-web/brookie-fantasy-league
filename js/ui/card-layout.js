// حساب مواضع صفوف ستوري الترتيب (000-T01 / F-04): دالة نقية بلا DOM،
// تضمن أن آخر صف لا يتجاوز بداية التذييل مهما كان عدد المشاركين.
// المخرجات: {rowH, topN, bottomN, skipped, rows:[{rank, y}], bottomTitleY, skippedY, scale}
function computeStoryLayout(opts){
  const o = opts || {};
  const n = Math.max(0, o.n|0);
  const H = o.H || 1920;
  const contentTop = o.contentTop || 0;
  const footerTop = (o.footerTop !== undefined) ? o.footerTop : H - 170;
  const maxRowH = o.maxRowH || 150;
  const minRowH = o.minRowH || 96;
  // مسافات الفواصل: سطر "مراكز بينهم" ثم عنوان القاع (تُحجز من المساحة قبل حساب الصف)
  const skippedBlock = 60;   // 14 قبل السطر + 46 بعده
  const noSkipGap = 20;
  const bottomTitleBlock = 54;

  let topN = Math.min(o.topN || 6, n);
  const bottomWanted = o.bottomN === undefined ? 3 : o.bottomN;

  let bottomN, skipped, gapBlocks, rowH;
  for(;;){
    bottomN = Math.min(bottomWanted, Math.max(0, n - topN));
    skipped = Math.max(0, n - topN - bottomN);
    gapBlocks = (o.gapBlocks !== undefined) ? o.gapBlocks
      : (skipped > 0 ? skippedBlock : noSkipGap) + (bottomN > 0 ? bottomTitleBlock : 0);
    const rows = topN + bottomN;
    rowH = rows > 0 ? Math.min(maxRowH, (footerTop - contentTop - gapBlocks) / rows) : maxRowH;
    // لا نصغّر الصف أكثر من اللازم: ننقص أعلى المراكز إلى 5 ثم 4
    if(rowH < minRowH && topN > 4 && topN > Math.min(4, n)){ topN--; continue; }
    break;
  }
  rowH = Math.floor(rowH * 100) / 100;

  const rows = [];
  let y = contentTop;
  for(let i = 0; i < topN; i++){ rows.push({rank: i + 1, y}); y += rowH; }
  let skippedY = null, bottomTitleY = null;
  if(skipped > 0){ y += 14; skippedY = y; y += 46; } else { y += noSkipGap; }
  if(bottomN > 0){
    bottomTitleY = y; y += bottomTitleBlock;
    for(let i = n - bottomN; i < n; i++){ rows.push({rank: i + 1, y}); y += rowH; }
  }
  return {rowH, topN, bottomN, skipped, rows, bottomTitleY, skippedY, scale: rowH / maxRowH};
}


// ---------- مواصفة بطاقة الترتيب النهائية 1080×1920 (001-T021، R-16) ----------
// assets/cards/standings-card.layout.md "التكيف مع n من 18 إلى 24": دالة نقية بأعداد صحيحة بلا DOM.
// المتاح من y=256 إلى y=1760 (1504)، والفاصل 16 (--sp-4)، ويضاف 8 (--sp-2) قبل الصفوف 6 و11 و16 و21.
// المخرجات: {n, r, rows:[{top, center}], scale:{name, score, motion, rank, crest}, lastBottom, gap}
function computeStandingsCardLayout(n){
  n = Math.max(1, n | 0);
  const g = Math.floor((n - 1) / 5);
  const r = Math.min(64, Math.max(44, Math.floor((1504 - 16 * (n - 1) - 8 * g) / n)));
  const rowTop = i => 256 + i * (r + 16) + 8 * Math.floor(i / 5);
  const scale = r >= 56 ? {name: 40, score: 48, motion: 28, rank: 32, crest: 36}
              : r >= 48 ? {name: 36, score: 44, motion: 26, rank: 28, crest: 32}
              : {name: 32, score: 36, motion: 24, rank: 24, crest: 28};
  const rows = [];
  for(let i = 0; i < n; i++) rows.push({top: rowTop(i), center: rowTop(i) + r / 2});
  return {n, r, rows, scale, lastBottom: rowTop(n - 1) + r, gap: 1760 - (rowTop(n - 1) + r)};
}
