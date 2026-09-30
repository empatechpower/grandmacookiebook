import "server-only";
import { db } from "./db";

/** Recomputes an author's cached rating from their visible reviews. */
export async function recalcRating(authorId: string) {
  const agg = await db.review.aggregate({ where: { authorId, hidden: false }, _avg: { rating: true }, _count: true });
  await db.user.update({
    where: { id: authorId },
    data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count },
  });
}

/** What a buyer can review: completed visits and received books they haven't reviewed yet. */
export const reviewableBooking = (buyerId: string, id: string) =>
  db.booking.findFirst({ where: { id, buyerId, status: "COMPLETED", review: null }, include: { package: true, author: true } });

export const reviewableItem = (buyerId: string, id: string) =>
  db.orderItem.findFirst({ where: { id, status: "DELIVERED", review: null, order: { buyerId } }, include: { author: true } });

/** Star glyphs; rounds down unless within a quarter star, so a 4.5 average shows four stars next to "4.5". */
export function stars(n: number) {
  const full = Math.min(5, Math.max(0, Math.floor(n + 0.25)));
  return "★".repeat(full) + "☆".repeat(5 - full);
}
