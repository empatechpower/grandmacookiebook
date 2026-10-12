export const CURRENCY = "USD";

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: CURRENCY, maximumFractionDigits: 2 });

/** Format integer cents for display. */
export const money = (cents: number) => fmt.format(cents / 100).replace(/\.00$/, "");

/** Parse a user-entered amount ("18", "18.50") into integer cents. */
export const toCents = (v: FormDataEntryValue | null) => Math.round(Number(v ?? 0) * 100);

/** Author's share of an amount after the platform commission. */
export const net = (gross: number, commissionPct: number) => Math.round(gross * (1 - commissionPct / 100));

/** What the author receives: the sale minus our commission minus their part of Stripe's processing fee. */
export const authorShare = (gross: number, commissionPct: number, stripeFee: number | null = 0) => Math.max(0, net(gross, commissionPct) - (stripeFee ?? 0));

/** Splits one charge's fee across lines in proportion to their amounts (largest remainder, so it adds up exactly). */
export function allocateFee(fee: number, amounts: number[]) {
  const total = amounts.reduce((s, a) => s + a, 0);
  if (!total) return amounts.map(() => 0);
  const raw = amounts.map((a) => (fee * a) / total);
  const out = raw.map(Math.floor);
  let left = fee - out.reduce((s, a) => s + a, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) { if (left <= 0) break; out[i]++; left--; }
  return out;
}
