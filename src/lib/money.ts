export const CURRENCY = "USD";

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: CURRENCY, maximumFractionDigits: 2 });

/** Format integer cents for display. */
export const money = (cents: number) => fmt.format(cents / 100).replace(/\.00$/, "");

/** Parse a user-entered amount ("18", "18.50") into integer cents. */
export const toCents = (v: FormDataEntryValue | null) => Math.round(Number(v ?? 0) * 100);

/** Author's share of an amount after the platform commission. */
export const net = (gross: number, commissionPct: number) => Math.round(gross * (1 - commissionPct / 100));
