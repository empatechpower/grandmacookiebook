import "server-only";
import { db } from "./db";
import { net } from "./money";
import { refundWithClawback } from "./fulfillment";
import * as notify from "./notify";
import { voidReferralEarning } from "./referrals";

/**
 * Refunds one order line (restocking it if it hadn't shipped). Returns a warning
 * if the author's share had already been released and couldn't be reversed.
 */
export async function refundItem(itemId: string): Promise<{ ok: false; error: string } | { ok: true; warning: string | null }> {
  const item = await db.orderItem.findUnique({ where: { id: itemId }, include: { order: true } });
  if (!item || !["PAID", "SHIPPED", "DELIVERED"].includes(item.status)) return { ok: false, error: "This line can't be refunded" };
  const gross = item.unitPrice * item.qty;
  const warning = await refundWithClawback({
    paymentIntentId: item.order.paymentRef,
    gross,
    transferId: item.transferId,
    authorShare: net(gross, item.commissionPct),
    key: `item_${item.id}`,
  });
  await db.$transaction([
    db.orderItem.update({ where: { id: item.id }, data: { status: "REFUNDED" } }),
    ...(item.status === "PAID" ? [db.book.update({ where: { id: item.bookId }, data: { stock: { increment: item.qty } } })] : []),
  ]);
  await voidReferralEarning("item", item.id);
  await notify.itemRefunded(item.id);
  return { ok: true, warning };
}

/** Cancels a booking, refunding the buyer if they had paid. */
export async function cancelBooking(bookingId: string): Promise<{ ok: false; error: string } | { ok: true; warning: string | null; refunded: boolean }> {
  const b = await db.booking.findUnique({ where: { id: bookingId } });
  if (!b || ["CANCELLED", "DECLINED"].includes(b.status) || (b.status === "COMPLETED" && b.transferId))
    return { ok: false, error: "This booking can't be cancelled" };
  const warning = b.paymentRef
    ? await refundWithClawback({
        paymentIntentId: b.paymentRef,
        gross: b.fee,
        transferId: b.transferId,
        authorShare: net(b.fee, b.commissionPct),
        key: `booking_${b.id}`,
      })
    : null;
  await db.booking.update({ where: { id: b.id }, data: { status: "CANCELLED" } });
  await voidReferralEarning("booking", b.id);
  await notify.bookingCancelled(b.id, b.paymentRef ? "refunded" : "unpaid");
  return { ok: true, warning, refunded: !!b.paymentRef };
}
