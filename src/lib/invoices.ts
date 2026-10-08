import "server-only";
import { db } from "./db";

/** Creates the invoice for a paid order or booking (idempotent: one per sale). Purchase orders start DUE. */
export async function issueInvoice(sale: { orderId: string } | { bookingId: string }, terms?: { status: "DUE"; dueAt: Date }) {
  const where = "orderId" in sale ? { orderId: sale.orderId } : { bookingId: sale.bookingId };
  const existing = await db.invoice.findFirst({ where });
  if (existing) return existing;
  const total =
    "orderId" in sale
      ? (await db.order.findUniqueOrThrow({ where: { id: sale.orderId } })).total
      : (await db.booking.findUniqueOrThrow({ where: { id: sale.bookingId } })).fee;
  try {
    return await db.invoice.create({ data: { ...where, total, ...(terms ?? { paidAt: new Date() }) } });
  } catch {
    // Created concurrently (webhook + return page): return the one that won.
    return db.invoice.findFirstOrThrow({ where });
  }
}

export const invoiceNo = (n: number) => `INV-${n}`;

/** Loads an invoice with everything needed to render it, if the viewer may see it. */
export async function loadInvoice(id: string, viewer: { id: string; role: string }) {
  const inv = await db.invoice.findUnique({
    where: { id },
    include: {
      order: { include: { buyer: true, purchaseOrder: true, items: { include: { author: { select: { name: true } } } } } },
      booking: { include: { buyer: true, purchaseOrder: true, package: true, author: { select: { name: true } } } },
    },
  });
  if (!inv) return null;
  // The buyer and admins only (an order can include other authors' items).
  const buyerId = inv.order?.buyerId ?? inv.booking?.buyerId;
  return viewer.role === "ADMIN" || viewer.id === buyerId ? inv : null;
}
