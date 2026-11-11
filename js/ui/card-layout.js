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
