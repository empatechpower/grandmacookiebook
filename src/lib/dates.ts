/** Calendar days (event dates, availability) are stored as UTC midnight and keyed "YYYY-MM-DD". */
export const dayKey = (d: Date) => d.toISOString().slice(0, 10);
export const fromDayKey = (k: string) => new Date(`${k}T00:00:00.000Z`);
export const isDayKey = (k: string) => /^\d{4}-\d{2}-\d{2}$/.test(k) && !isNaN(fromDayKey(k).getTime());

export const todayKey = () => dayKey(new Date());
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

/** "2026-10" for the month containing d. */
/** Cancelling less than `noticeDays` whole days before the event counts as late. */
export const isLateCancellation = (eventDate: Date, noticeDays: number, now = new Date()) =>
  eventDate.getTime() - fromDayKey(dayKey(now)).getTime() < noticeDays * 86400000;

export const monthKey = (d: Date) => d.toISOString().slice(0, 7);

// US format ("Sep 30, 2026"). UTC because event and availability dates are stored as UTC midnight.
export const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** "14:30" → "2:30 PM" (event start times are stored as local "HH:MM"). */
export const fmtTime = (t: string | null | undefined) => {
  if (!t || !/^\d{2}:\d{2}$/.test(t)) return "";
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
export const isTime = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

/** Event date with its start time when known: "Oct 21, 2026 · 2:30 PM". */
export const fmtWhen = (b: { eventDate: Date; eventTime?: string | null }) =>
  b.eventTime ? `${fmtDate(b.eventDate)} · ${fmtTime(b.eventTime)}` : fmtDate(b.eventDate);
