import "server-only";
import { db } from "./db";
import { addDays } from "./dates";
import { getSettings } from "./settings";
import { expireOrder, HOLD_DAYS, releaseBooking, releaseItem } from "./fulfillment";
import { issueInvoice } from "./invoices";
import * as notify from "./notify";

/**
 * Pay by purchase order (schools, libraries, businesses, nonprofits):
 *
 *   submitted (PENDING) ─ admin approves ─> APPROVED: order confirmed so authors ship / visit is on,
 *                                           invoice issued as DUE on the PO's terms (Net 30 by default)
 *                       └ admin rejects ─> REJECTED: order canceled (stock released); a booking goes
 *                                           back to awaiting payment
 *   APPROVED ─ admin marks the invoice paid ─> PAID: authors' shares are released (see releaseAfterPoPaid)
 *
 * The school pays the platform directly (check, ACH…), so author transfers come from the
 * platform's Stripe balance rather than a card charge.
 */

/** Individuals pay by card; organizations can also pay by purchase order. */
export const canUsePo = (u: { orgType: string | null }) => !!u.orgType && u.orgType !== "INDIVIDUAL";

export const PO_STATUS_LABEL: Record<string, string> = {
  PENDING: "PO in review",
  APPROVED: "Invoice due",
  PAID: "Paid",
  REJECTED: "PO rejected",
  CANCELLED: "Canceled",
};

export async function approvePo(poId: string) {
  const claimed = await db.purchaseOrder.updateMany({ where: { id: poId, status: "PENDING" }, data: { status: "APPROVED", approvedAt: new Date() } });
  if (!claimed.count) return { ok: false as const, error: "This purchase order has already been reviewed" };
  const po = await db.purchaseOrder.findUniqueOrThrow({ where: { id: poId } });
  const { poTermsDays } = await getSettings();
  const dueAt = addDays(new Date(), po.termsDays ?? poTermsDays);

  if (po.orderId) {
    const r = await db.order.updateMany({ where: { id: po.orderId, status: "PENDING" }, data: { status: "PAID" } });
    if (!r.count) return revert(poId, "This order was canceled");
    // Authors ship now; their share waits for the invoice to be paid (releaseAt is set then).
    const order = await db.order.update({
      where: { id: po.orderId },
      data: { items: { updateMany: { where: { status: "PENDING" }, data: { status: "PAID", releaseAt: null } } } },
      include: { items: true },
    });
    await db.cartItem.deleteMany({ where: { userId: order.buyerId, bookId: { in: order.items.map((i) => i.bookId) } } });
    await issueInvoice({ orderId: order.id }, { status: "DUE", dueAt });
    await notify.orderPaid(order.id);
  } else if (po.bookingId) {
    const r = await db.booking.updateMany({ where: { id: po.bookingId, status: "ACCEPTED", paymentRef: null }, data: { status: "CONFIRMED", releaseAt: null } });
    if (!r.count) return revert(poId, "This booking is no longer awaiting payment");
    await issueInvoice({ bookingId: po.bookingId }, { status: "DUE", dueAt });
    await notify.bookingPaid(po.bookingId);
  }
  await notify.poReviewed(poId);
  return { ok: true as const };
}

async function revert(poId: string, error: string) {
  await db.purchaseOrder.update({ where: { id: poId }, data: { status: "CANCELLED", approvedAt: null } });
  return { ok: false as const, error };
}

export async function rejectPo(poId: string, note: string | null) {
  const claimed = await db.purchaseOrder.updateMany({ where: { id: poId, status: "PENDING" }, data: { status: "REJECTED", adminNote: note } });
  if (!claimed.count) return { ok: false as const, error: "This purchase order has already been reviewed" };
  const po = await db.purchaseOrder.findUniqueOrThrow({ where: { id: poId } });
  // The cart is kept, so the buyer can check out again (by card or with a corrected PO).
  if (po.orderId) await expireOrder(po.orderId);
  await notify.poReviewed(poId);
  return { ok: true as const };
}

/** The school paid the invoice: mark it paid and release the authors' shares. */
export async function markPoPaid(poId: string, paymentNote: string | null) {
  const claimed = await db.purchaseOrder.updateMany({ where: { id: poId, status: "APPROVED" }, data: { status: "PAID", paidAt: new Date(), paymentNote } });
  if (!claimed.count) return { ok: false as const, error: "Only approved purchase orders can be marked paid" };
  const po = await db.purchaseOrder.findUniqueOrThrow({ where: { id: poId } });
  await db.invoice.updateMany({ where: po.orderId ? { orderId: po.orderId } : { bookingId: po.bookingId! }, data: { status: "PAID", paidAt: new Date() } });
  await releaseAfterPoPaid(po);
  await notify.poPaid(poId);
  return { ok: true as const };
}

/**
 * Same hold as card payments, counted from when the PO was approved (books) or the event
 * (visits). Anything the buyer already confirmed, or whose hold has already passed, is paid now.
 */
async function releaseAfterPoPaid(po: { orderId: string | null; bookingId: string | null; approvedAt: Date | null }) {
  const now = new Date();
  const later = (d: Date) => (d > now ? d : now);
  if (po.orderId) {
    const items = await db.orderItem.findMany({ where: { orderId: po.orderId, transferId: null, status: { in: ["PAID", "SHIPPED", "DELIVERED"] } } });
    for (const i of items) {
      const releaseAt = later(addDays(po.approvedAt ?? now, HOLD_DAYS));
      await db.orderItem.update({ where: { id: i.id }, data: { releaseAt } });
      if (i.status === "DELIVERED" || releaseAt <= now) await releaseItem(i.id);
    }
  } else if (po.bookingId) {
    const b = await db.booking.findUniqueOrThrow({ where: { id: po.bookingId } });
    const releaseAt = later(addDays(b.eventDate, HOLD_DAYS));
    await db.booking.update({ where: { id: b.id }, data: { releaseAt } });
    if (["COMPLETED", "LATE_CANCELLED"].includes(b.status) || releaseAt <= now) await releaseBooking(b.id);
  }
}

/** A booking or order paid by PO was canceled: void anything still owed. */
export async function cancelPoFor(sale: { orderId: string } | { bookingId: string }) {
  const where = "orderId" in sale ? { orderId: sale.orderId } : { bookingId: sale.bookingId };
  const po = await db.purchaseOrder.findFirst({ where });
  if (!po) return null;
  if (["PENDING", "APPROVED"].includes(po.status)) {
    await db.purchaseOrder.update({ where: { id: po.id }, data: { status: "CANCELLED" } });
    await db.invoice.updateMany({ where: { ...where, status: "DUE" }, data: { status: "VOID" } });
  }
  return po;
}
