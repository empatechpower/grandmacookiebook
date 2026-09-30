import "server-only";
import { db } from "./db";
import { net } from "./money";
import { refundPayment, reverseTransfer, transferToAuthor, type PaidPayment } from "./payments";
import { addDays } from "./dates";
import * as notify from "./notify";
import { accrueReferral } from "./referrals";

/**
 * Payment lifecycle. The buyer's money is held by the platform and the author's
 * share is transferred when the buyer confirms (book received / visit happened)
 * or automatically HOLD_DAYS later (see releaseDue, run by the daily cron).
 *
 * Everything here is idempotent: the Stripe webhook and the browser's return
 * from Checkout can both deliver the same payment, possibly more than once.
 */
export const HOLD_DAYS = 14;

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 300);

export async function fulfillOrder(orderId: string, payment: PaidPayment, sessionId?: string) {
  // Only the first caller flips PENDING -> PAID; everyone else stops here.
  const claimed = await db.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: { status: "PAID", paymentRef: payment.paymentIntentId, chargeId: payment.chargeId, ...(sessionId ? { stripeSessionId: sessionId } : {}) },
  });
  if (!claimed.count) return;
  const order = await db.order.update({
    where: { id: orderId },
    data: { items: { updateMany: { where: { status: "PENDING" }, data: { status: "PAID", releaseAt: addDays(new Date(), HOLD_DAYS) } } } },
    include: { items: true },
  });
  await db.cartItem.deleteMany({ where: { userId: order.buyerId, bookId: { in: order.items.map((i) => i.bookId) } } });
  await notify.orderPaid(order.id);
}

export async function fulfillBooking(bookingId: string, payment: PaidPayment, sessionId?: string) {
  const claimed = await db.booking.updateMany({
    where: { id: bookingId, status: "ACCEPTED", paymentRef: null },
    data: { status: "CONFIRMED", paymentRef: payment.paymentIntentId, chargeId: payment.chargeId, ...(sessionId ? { stripeSessionId: sessionId } : {}) },
  });
  if (claimed.count) {
    const b = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
    await db.booking.update({ where: { id: bookingId }, data: { releaseAt: addDays(b.eventDate, HOLD_DAYS) } });
    return notify.bookingPaid(bookingId);
  }

  // Paid, but the booking was cancelled while the buyer was on the Stripe page, or was
  // already paid in another tab: give this payment back. (A redelivery of the same payment is a no-op.)
  const b = await db.booking.findUnique({ where: { id: bookingId } });
  if (b && b.paymentRef !== payment.paymentIntentId) {
    await refundPayment(payment.paymentIntentId, b.fee, `refund_stale_booking_${b.id}_${payment.paymentIntentId}`);
  }
}

/** Transfers an order line's net amount to its author now (release or retry). Idempotent. */
export async function releaseItem(itemId: string) {
  const item = await db.orderItem.findUnique({ where: { id: itemId }, include: { order: { include: { buyer: { select: { name: true } } } }, author: true } });
  if (!item || item.transferId || !["PAID", "SHIPPED", "DELIVERED"].includes(item.status) || !item.order.chargeId) return;
  try {
    if (!item.author.stripeAccountId) throw new Error("Author has no connected Stripe account");
    const transferId = await transferToAuthor({
      amount: net(item.unitPrice * item.qty, item.commissionPct),
      destination: item.author.stripeAccountId,
      chargeId: item.order.chargeId,
      transferGroup: `order_${item.orderId}`,
      idempotencyKey: `transfer_item_${item.id}`,
    });
    await db.orderItem.update({ where: { id: itemId }, data: { transferId, transferError: null } });
    await accrueReferral("item", itemId);
    await notify.payoutReleased(item.author, net(item.unitPrice * item.qty, item.commissionPct), `${item.title} × ${item.qty} (O-${item.order.number})`);
  } catch (e) {
    await db.orderItem.update({ where: { id: itemId }, data: { transferError: errMsg(e) } });
  }
}

export async function releaseBooking(bookingId: string) {
  const b = await db.booking.findUnique({ where: { id: bookingId }, include: { author: true } });
  if (!b || b.transferId || !["CONFIRMED", "COMPLETED", "LATE_CANCELLED"].includes(b.status) || !b.chargeId) return;
  try {
    if (!b.author.stripeAccountId) throw new Error("Author has no connected Stripe account");
    const transferId = await transferToAuthor({
      amount: net(b.fee, b.commissionPct),
      destination: b.author.stripeAccountId,
      chargeId: b.chargeId,
      transferGroup: `booking_${b.id}`,
      idempotencyKey: `transfer_booking_${b.id}`,
    });
    await db.booking.update({ where: { id: bookingId }, data: { transferId, transferError: null } });
    await accrueReferral("booking", bookingId);
    await notify.payoutReleased(b.author, net(b.fee, b.commissionPct), `booking B-${b.number} (${b.organisation})`);
  } catch (e) {
    await db.booking.update({ where: { id: bookingId }, data: { transferError: errMsg(e) } });
  }
}

/**
 * Releases every held payment whose hold has ended. Run daily by /api/cron/release-payouts.
 * Visits past their hold are marked completed (the buyer didn't dispute them).
 */
export async function releaseDue(now = new Date()) {
  const [items, bookings] = await Promise.all([
    // An open "report a problem" pauses release until an admin resolves it.
    db.orderItem.findMany({
      where: { transferId: null, releaseAt: { lte: now }, status: { in: ["PAID", "SHIPPED", "DELIVERED"] }, issues: { none: { status: "OPEN" } } },
      select: { id: true },
    }),
    db.booking.findMany({
      where: { transferId: null, releaseAt: { lte: now }, status: { in: ["CONFIRMED", "COMPLETED"] }, issues: { none: { status: "OPEN" } } },
      select: { id: true },
    }),
  ]);
  for (const { id } of items) await releaseItem(id);
  for (const { id } of bookings) {
    const r = await db.booking.updateMany({ where: { id, status: "CONFIRMED" }, data: { status: "COMPLETED" } });
    await releaseBooking(id);
    if (r.count) await notify.reviewPrompt({ kind: "booking", id });
  }
  return { items: items.length, bookings: bookings.length };
}

/** Checkout expired unpaid: cancel the order and release the reserved stock. */
export async function expireOrder(orderId: string) {
  const claimed = await db.order.updateMany({ where: { id: orderId, status: "PENDING" }, data: { status: "CANCELLED" } });
  if (!claimed.count) return;
  const items = await db.orderItem.findMany({ where: { orderId } });
  await db.$transaction([
    db.orderItem.updateMany({ where: { orderId }, data: { status: "CANCELLED" } }),
    ...items.map((i) => db.book.update({ where: { id: i.bookId }, data: { stock: { increment: i.qty } } })),
  ]);
}

/**
 * Refunds the buyer, then claws back the author's share if it was already sent.
 * Returns a warning if the clawback failed (e.g. the author already withdrew it),
 * in which case the platform has covered the refund and should follow up with the author.
 */
export async function refundWithClawback(opts: {
  paymentIntentId: string | null;
  gross: number;
  transferId: string | null;
  authorShare: number;
  key: string;
}): Promise<string | null> {
  if (opts.paymentIntentId) await refundPayment(opts.paymentIntentId, opts.gross, `refund_${opts.key}`);
  if (!opts.transferId) return null;
  try {
    await reverseTransfer(opts.transferId, opts.authorShare, `reversal_${opts.key}`);
    return null;
  } catch (e) {
    return `Buyer refunded, but the author's share couldn't be reversed: ${errMsg(e)}`;
  }
}
