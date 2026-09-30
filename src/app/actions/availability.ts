"use server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { done, fail, str } from "@/lib/actions";
import { dayKey, fromDayKey, isDayKey, todayKey } from "@/lib/dates";

/** Toggles one day open/closed on the author's calendar. */
export async function toggleDay(fd: FormData) {
  const user = await requireUser("AUTHOR");
  const key = str(fd, "day");
  if (!isDayKey(key) || key < todayKey()) return fail("Pick a date from today onwards");
  const date = fromDayKey(key);
  const where = { authorId_date: { authorId: user.id, date } };
  const existing = await db.availableDate.findUnique({ where });
  if (existing) await db.availableDate.delete({ where });
  else await db.availableDate.create({ data: { authorId: user.id, date } });
  await done(null);
}

/** Opens every weekday, or clears every day, in a month (from today onwards). */
export async function fillMonth(fd: FormData) {
  const user = await requireUser("AUTHOR");
  const month = str(fd, "month");
  if (!/^\d{4}-\d{2}$/.test(month)) return fail("Invalid month");
  const start = fromDayKey(`${month}-01`);
  const today = todayKey();
  const days: Date[] = [];
  for (let d = new Date(start); d.getUTCMonth() === start.getUTCMonth(); d.setUTCDate(d.getUTCDate() + 1)) {
    if (dayKey(d) >= today) days.push(new Date(d));
  }
  if (str(fd, "mode") === "clear") {
    await db.availableDate.deleteMany({ where: { authorId: user.id, date: { in: days } } });
    return done("Month cleared");
  }
  const weekdays = days.filter((d) => d.getUTCDay() !== 0 && d.getUTCDay() !== 6);
  const existing = new Set(
    (await db.availableDate.findMany({ where: { authorId: user.id, date: { in: weekdays } } })).map((a) => dayKey(a.date)),
  );
  await db.availableDate.createMany({
    data: weekdays.filter((d) => !existing.has(dayKey(d))).map((date) => ({ authorId: user.id, date })),
  });
  await done("Weekdays opened");
}
