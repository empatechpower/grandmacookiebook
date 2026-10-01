import "server-only";
import { db } from "./db";

export const DEFAULT_SETTINGS = {
  bookCommissionPct: 5,
  visitCommissionPct: 15,
  referralPct: 2,
  referralMonths: 12,
  // Paid bookings canceled by the buyer less than this many days before the event are not
  // refunded and the author is paid ("guaranteed payment for last-minute cancellations").
  cancelNoticeDays: 7,
};
export type Settings = typeof DEFAULT_SETTINGS;

export async function getSettings(): Promise<Settings> {
  const rows = await db.setting.findMany();
  const out = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in out) out[r.key as keyof Settings] = Number(r.value);
  return out;
}

export async function saveSettings(s: Settings) {
  await db.$transaction(
    Object.entries(s).map(([key, value]) =>
      db.setting.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value) } }),
    ),
  );
}
