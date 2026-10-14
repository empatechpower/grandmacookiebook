/**
 * Bulk book discounts: platform-wide tiers set by the admin. Default (client):
 *   1–9 copies full price · 10–24 copies 20% off · 25–99 copies 30% off · 100+ copies: custom quote
 * (an optional third tier can be switched on in Admin → Settings).
 * Each product can switch discounts off (Book.bulkEnabled). Commission is charged on the discounted price.
 */
export type BulkTiers = { min1: number; pct1: number; min2: number; pct2: number; min3: number; pct3: number; quoteMin: number };

export const tiersFrom = (s: {
  bulkTier1Min: number; bulkTier1Pct: number; bulkTier2Min: number; bulkTier2Pct: number;
  bulkTier3Min: number; bulkTier3Pct: number; bulkQuoteMin: number;
}): BulkTiers => ({
  min1: s.bulkTier1Min, pct1: s.bulkTier1Pct,
  min2: s.bulkTier2Min, pct2: s.bulkTier2Pct,
  min3: s.bulkTier3Min, pct3: s.bulkTier3Pct,
  quoteMin: s.bulkQuoteMin,
});

/** Discount percentage that applies to this quantity (0 when none). */
export function bulkDiscountPct(book: { bulkEnabled: boolean }, qty: number, t: BulkTiers) {
  if (!book.bulkEnabled) return 0;
  if (t.pct3 > 0 && qty >= t.min3) return t.pct3;
  if (t.pct2 > 0 && qty >= t.min2) return t.pct2;
  if (t.pct1 > 0 && qty >= t.min1) return t.pct1;
  return 0;
}

/** Orders this large go through a custom quote instead of the cart (only for books with bulk discounts on). */
export const needsQuote = (book: { bulkEnabled: boolean }, qty: number, t: BulkTiers) => book.bulkEnabled && t.quoteMin > 0 && qty >= t.quoteMin;

/** Most copies of one book allowed in the cart. */
export const maxCartQty = (book: { bulkEnabled: boolean; stock: number }, t: BulkTiers) =>
  book.bulkEnabled && t.quoteMin > 0 ? Math.min(book.stock, t.quoteMin - 1) : book.stock;

/** Per-copy price after any bulk discount, rounded to the cent. */
export function unitPriceFor(book: { price: number; bulkEnabled: boolean }, qty: number, t: BulkTiers) {
  return Math.round(book.price * (1 - bulkDiscountPct(book, qty, t) / 100));
}

/** Rows for the tier table: [label, discount % or null for full price, or "quote"]. */
export function tierRows(t: BulkTiers): { label: string; pct: number | "quote" }[] {
  const rows: { label: string; pct: number | "quote" }[] = [];
  const range = (a: number, b: number) => (b > a ? `${a}–${b}` : `${a}`);
  const steps = [[t.min1, t.pct1], [t.min2, t.pct2], [t.min3, t.pct3]].filter(([, p]) => p > 0) as [number, number][];
  const end = t.quoteMin > 0 ? t.quoteMin : Infinity;
  rows.push({ label: `${range(1, (steps[0]?.[0] ?? end) - 1)} copies`, pct: 0 });
  steps.forEach(([min, pct], i) => {
    const next = steps[i + 1]?.[0] ?? end;
    rows.push({ label: next === Infinity ? `${min}+ copies` : `${range(min, next - 1)} copies`, pct });
  });
  if (end !== Infinity) rows.push({ label: `${end}+ copies`, pct: "quote" });
  return rows;
}

/** "10–24 copies: 20% off · 25–49 copies: 30% off · 50–99 copies: 50% off · 100+ copies: custom quote" */
export const tiersLabel = (t: BulkTiers) =>
  tierRows(t).filter((r) => r.pct !== 0).map((r) => `${r.label}: ${r.pct === "quote" ? "custom quote" : `${r.pct}% off`}`).join(" · ");

/** "Order 3 more for 20% off", or null when there's no higher tier to reach. */
export function nextTierHint(book: { bulkEnabled: boolean }, qty: number, t: BulkTiers) {
  if (!book.bulkEnabled) return null;
  const next = ([[t.min1, t.pct1], [t.min2, t.pct2], [t.min3, t.pct3]] as [number, number][]).find(([min, pct]) => pct > 0 && qty < min);
  return next ? `Order ${next[0] - qty} more for ${next[1]}% off` : null;
}
