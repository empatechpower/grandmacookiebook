"use server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { done, fail, str } from "@/lib/actions";
import { ISSUE_REASONS } from "@/lib/constants";
import { releaseBooking, releaseItem } from "@/lib/fulfillment";
import { cancelBooking, refundItem } from "@/lib/refunds";
import { issueReported, issueResolved } from "@/lib/notify";

/**
 * Buyer reports a problem while payment is still held. This pauses the automatic
 * release until an admin refunds the buyer or releases payment to the author.
 */
export async function reportIssue(fd: FormData) {
  const user = await requireUser("BUYER");
  const kind = str(fd, "kind") === "booking" ? "booking" : "item";
  const id = str(fd, "id");
  const reason = str(fd, "reason");
  const details = str(fd, "details").slice(0, 3000);
  if (!ISSUE_REASONS[kind].some((r) => r.value === reason)) return fail("Choose what went wrong");
  if (details.length < 10) return fail("Please describe the problem (10+ characters)");

  const target =
    kind === "booking"
      ? await db.booking.findFirst({ where: { id, buyerId: user.id, transferId: null, status: { in: ["CONFIRMED", "COMPLETED"] } } })
      : await db.orderItem.findFirst({ where: { id, transferId: null, status: { in: ["PAID", "SHIPPED"] }, order: { buyerId: user.id } } });
  if (!target) return fail("This can no longer be reported here — payment was already released. Please contact us.");
  const open = await db.issue.count({ where: { status: "OPEN", ...(kind === "booking" ? { bookingId: id } : { orderItemId: id }) } });
  if (open) return fail("You already have an open report for this");

  const issue = await db.issue.create({
    data: { buyerId: user.id, reason, details, ...(kind === "booking" ? { bookingId: id } : { orderItemId: id }) },
  });
  await issueReported(issue.id);
  await done("Problem reported — payment is paused and our team will be in touch", kind === "booking" ? "/dashboard/buyer/bookings" : "/dashboard/buyer/orders");
}

export async function resolveIssue(fd: FormData) {
  await requireUser("ADMIN");
  const issue = await db.issue.findUnique({ where: { id: str(fd, "id") } });
  if (!issue || issue.status !== "OPEN") return fail("Already resolved");
  const refund = str(fd, "decision") === "refund";
  const note = str(fd, "note").slice(0, 1000) || null;
  let warning: string | null = null;
  if (refund) {
    const r = issue.bookingId ? await cancelBooking(issue.bookingId) : await refundItem(issue.orderItemId!);
    if (!r.ok) return fail(r.error);
    warning = r.warning;
  }
  await db.issue.update({ where: { id: issue.id }, data: { status: refund ? "REFUNDED" : "REJECTED", resolutionNote: note, resolvedAt: new Date() } });
  if (!refund) {
    // Buyer's claim rejected: release payment now rather than waiting for the hold.
    if (issue.bookingId) {
      await db.booking.updateMany({ where: { id: issue.bookingId, status: "CONFIRMED" }, data: { status: "COMPLETED" } });
      await releaseBooking(issue.bookingId);
    } else await releaseItem(issue.orderItemId!);
  }
  await issueResolved(issue.id);
  await done(warning ?? (refund ? "Buyer refunded and issue closed" : "Issue closed — payment released to the author"));
}
