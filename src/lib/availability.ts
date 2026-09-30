import "server-only";
import { db } from "./db";
import { addDays, dayKey, fromDayKey, todayKey } from "./dates";

/** Open days from tomorrow up to `days` ahead, minus days already accepted/confirmed. */
export async function openDates(authorId: string, days = 120) {
  const from = addDays(fromDayKey(todayKey()), 1);
  const to = addDays(from, days);
  const [open, booked] = await Promise.all([
    db.availableDate.findMany({ where: { authorId, date: { gte: from, lte: to } }, orderBy: { date: "asc" } }),
    db.booking.findMany({
      where: { authorId, eventDate: { gte: from, lte: to }, status: { in: ["ACCEPTED", "CONFIRMED"] } },
      select: { eventDate: true },
    }),
  ]);
  const taken = new Set(booked.map((b) => dayKey(b.eventDate)));
  return open.map((a) => dayKey(a.date)).filter((k) => !taken.has(k));
}

/** Whether the author uses the calendar at all (if not, buyers may propose any date). */
export const publishesAvailability = async (authorId: string) =>
  (await db.availableDate.count({ where: { authorId, date: { gte: fromDayKey(todayKey()) } } })) > 0;
