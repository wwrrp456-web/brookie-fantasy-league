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
