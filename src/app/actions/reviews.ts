"use server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { done, fail, str } from "@/lib/actions";
import { recalcRating, reviewableBooking, reviewableItem } from "@/lib/reviews";
import { reviewReceived } from "@/lib/notify";

const Schema = z.object({
  rating: z.number().int().min(1, "Choose a star rating").max(5),
  body: z.string().trim().min(10, "Add a sentence or two (10+ characters)").max(2000),
});

export async function submitReview(fd: FormData) {
  const user = await requireUser("BUYER");
  const p = Schema.safeParse({ rating: Number(fd.get("rating") ?? 0), body: str(fd, "body") });
  if (!p.success) return fail(p.error.issues[0].message);
  const kind = str(fd, "kind");
  const id = str(fd, "id");
  const target = kind === "booking" ? await reviewableBooking(user.id, id) : await reviewableItem(user.id, id);
  if (!target) return fail("This can't be reviewed (already reviewed, or not completed yet)");
  const review = await db.review.create({
    data: {
      authorId: target.authorId,
      buyerId: user.id,
      ...(kind === "booking" ? { bookingId: id } : { orderItemId: id }),
      ...p.data,
    },
  });
  await recalcRating(target.authorId);
  await reviewReceived(review.id);
  await done("Thanks for your review!", kind === "booking" ? "/dashboard/buyer/bookings" : "/dashboard/buyer/orders");
}

/** Authors get one public reply per review (editable). */
export async function replyToReview(fd: FormData) {
  const user = await requireUser("AUTHOR");
  const reply = str(fd, "reply").slice(0, 1000);
  const r = await db.review.updateMany({ where: { id: str(fd, "id"), authorId: user.id }, data: { authorReply: reply || null } });
  await done(r.count ? (reply ? "Reply posted" : "Reply removed") : "Review not found");
}

export async function toggleReviewHidden(fd: FormData) {
  await requireUser("ADMIN");
  const r = await db.review.findUnique({ where: { id: str(fd, "id") } });
  if (!r) return fail("Review not found");
  await db.review.update({ where: { id: r.id }, data: { hidden: !r.hidden } });
  await recalcRating(r.authorId);
  await done(r.hidden ? "Review restored" : "Review hidden from the public");
}
