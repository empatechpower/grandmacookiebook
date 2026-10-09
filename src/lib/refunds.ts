import "server-only";
import { db } from "./db";
import { net } from "./money";
import { refundWithClawback } from "./fulfillment";
import * as notify from "./notify";
import { voidReferralEarning } from "./referrals";
import { cancelPoFor } from "./purchaseOrders";

/**
 * Refunds one order line (restocking it if it hadn't shipped). Returns a warning
 * if the author's share had already been released and couldn't be reversed.
 */
export async function refundItem(itemId: string): Promise<{ ok: false; error: string } | { ok: true; warning: string | null }> {
  const item = await db.orderItem.findUnique({ where: { id: itemId }, include: { order: true } });
  if (!item || !["PAID", "SHIPPED", "DELIVERED"].includes(item.status)) return { ok: false, error: "This line can't be refunded" };
  const gross = item.unitPrice * item.qty;
  let warning = await refundWithClawback({
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
  const po = await db.purchaseOrder.findUnique({ where: { orderId: item.orderId } });
  if (po) warning = `Paid by purchase order ${po.poNumber}: ${po.status === "PAID" ? "refund the buyer directly" : "reduce the amount on the invoice they owe"} (${(gross / 100).toFixed(2)} USD).`;
  await voidReferralEarning("item", item.id);
  await notify.itemRefunded(item.id);
  return { ok: true, warning };
}

/** Cancels a booking, refunding the buyer in full if they had paid (also when the author cancels). */
export async function cancelBooking(bookingId: string, byAuthor: { reason: string } | null = null): Promise<{ ok: false; error: string } | { ok: true; warning: string | null; refunded: boolean }> {
  const b = await db.booking.findUnique({ where: { id: bookingId } });
  if (!b || ["CANCELLED", "DECLINED"].includes(b.status) || (b.status === "COMPLETED" && b.transferId))
    return { ok: false, error: "This booking can't be canceled" };
  let warning = b.paymentRef
    ? await refundWithClawback({
        paymentIntentId: b.paymentRef,
        gross: b.fee,
        transferId: b.transferId,
        authorShare: net(b.fee, b.commissionPct),
        key: `booking_${b.id}`,
      })
    : null;
  await db.booking.update({ where: { id: b.id }, data: { status: "CANCELLED" } });
  const po = await cancelPoFor({ bookingId: b.id });
  if (po?.status === "PAID") warning = `Paid by purchase order ${po.poNumber}: mail ${b.organisation} a refund check.`;
  await voidReferralEarning("booking", b.id);
  // For an author's cancellation, an approved or paid PO counts as paid (its invoice is voided or refunded).
  const paid = !!b.paymentRef || (!!byAuthor && (po?.status === "PAID" || po?.status === "APPROVED"));
  await notify.bookingCancelled(b.id, paid ? "refunded" : "unpaid", byAuthor ? { author: true, reason: byAuthor.reason } : null);
  return { ok: true, warning, refunded: !!b.paymentRef };
}
