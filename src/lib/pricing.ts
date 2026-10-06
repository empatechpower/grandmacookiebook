/**
 * Bulk book discounts: platform-wide tiers set by the admin (default 10–24 copies 20% off,
 * 25+ copies 30% off). Each product can switch them off (Book.bulkEnabled).
 */
export type BulkTiers = { min1: number; pct1: number; min2: number; pct2: number };

export const tiersFrom = (s: { bulkTier1Min: number; bulkTier1Pct: number; bulkTier2Min: number; bulkTier2Pct: number }): BulkTiers => ({
  min1: s.bulkTier1Min,
  pct1: s.bulkTier1Pct,
  min2: s.bulkTier2Min,
  pct2: s.bulkTier2Pct,
});

/** Discount percentage that applies to this quantity (0 when none). */
export function bulkDiscountPct(book: { bulkEnabled: boolean }, qty: number, t: BulkTiers) {
  if (!book.bulkEnabled) return 0;
  if (t.pct2 > 0 && qty >= t.min2) return t.pct2;
  if (t.pct1 > 0 && qty >= t.min1) return t.pct1;
  return 0;
}

/** Per-copy price after any bulk discount, rounded to the cent. */
export function unitPriceFor(book: { price: number; bulkEnabled: boolean }, qty: number, t: BulkTiers) {
  return Math.round(book.price * (1 - bulkDiscountPct(book, qty, t) / 100));
}

/** "10–24 copies: 20% off · 25+ copies: 30% off" */
export const tiersLabel = (t: BulkTiers) =>
  [t.pct1 > 0 && `${t.min1}–${t.min2 - 1} copies: ${t.pct1}% off`, t.pct2 > 0 && `${t.min2}+ copies: ${t.pct2}% off`].filter(Boolean).join(" · ");
