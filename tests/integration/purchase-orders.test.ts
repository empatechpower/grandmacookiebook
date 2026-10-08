import { day, reseed } from "./helpers";
import { before, test } from "node:test";
import assert from "node:assert/strict";
import { db } from "../../src/lib/db";
import { releaseBooking, releaseDue, releaseItem } from "../../src/lib/fulfillment";
import { approvePo, canUsePo, markPoPaid, rejectPo } from "../../src/lib/purchaseOrders";
import { cancelBooking } from "../../src/lib/refunds";

before(reseed);

const billing = { billingName: "AP Dept", billingEmail: "ap@school.test", billingAddress: "2000 N 23rd St, McAllen, TX", termsDays: 30 };

async function poOrder(title: string, qty: number, poNumber: string) {
  const school = await db.user.findUniqueOrThrow({ where: { email: "school@atelier.test" } });
  const book = await db.book.findFirstOrThrow({ where: { title } });
  await db.book.update({ where: { id: book.id }, data: { stock: { decrement: qty } } });
  await db.cartItem.create({ data: { userId: school.id, bookId: book.id, qty } });
  return db.order.create({
    data: {
      buyerId: school.id, total: book.price * qty, shippingAddress: "School",
      items: { create: [{ bookId: book.id, authorId: book.authorId, title: book.title, unitPrice: book.price, qty, commissionPct: 5 }] },
      purchaseOrder: { create: { ...billing, buyerId: school.id, poNumber, amount: book.price * qty } },
    },
    include: { items: true, purchaseOrder: true },
  });
}

test("only organizations can pay by purchase order", () => {
  assert.equal(canUsePo({ orgType: "SCHOOL" }), true);
  assert.equal(canUsePo({ orgType: "INDIVIDUAL" }), false);
  assert.equal(canUsePo({ orgType: null }), false);
});

test("approving a PO confirms the order and issues an invoice due on Net 30; authors aren't paid yet", async () => {
  const o = await poOrder("Word Play Lab", 3, "PO-A");
  const r = await approvePo(o.purchaseOrder!.id);
  assert.equal(r.ok, true);
  assert.equal((await approvePo(o.purchaseOrder!.id)).ok, false, "can't approve twice");
  const after = await db.order.findUniqueOrThrow({ where: { id: o.id }, include: { items: true, invoice: true } });
  assert.equal(after.status, "PAID");
  assert.equal(after.items[0].status, "PAID");
  assert.equal(after.items[0].releaseAt, null);
  assert.equal(after.invoice?.status, "DUE");
  const days = (after.invoice!.dueAt!.getTime() - Date.now()) / 864e5;
  assert.ok(Math.abs(days - 30) < 0.01, "due in 30 days");
  assert.equal(await db.cartItem.count({ where: { userId: o.buyerId, bookId: o.items[0].bookId } }), 0, "cart cleared");

  // Buyer marks it received, the daily job runs: still no payout until the invoice is paid.
  await db.orderItem.update({ where: { id: o.items[0].id }, data: { status: "DELIVERED" } });
  await releaseItem(o.items[0].id);
  await releaseDue();
  assert.equal((await db.orderItem.findUniqueOrThrow({ where: { id: o.items[0].id } })).transferId, null);
});

test("marking the PO paid marks the invoice paid and pays authors whose books arrived", async () => {
  const po = await db.purchaseOrder.findFirstOrThrow({ where: { poNumber: "PO-A" }, include: { order: { include: { items: true, invoice: true } } } });
  assert.equal((await markPoPaid(po.id, "Check #1042")).ok, true);
  assert.equal((await markPoPaid(po.id, null)).ok, false, "can't mark paid twice");
  const inv = await db.invoice.findUniqueOrThrow({ where: { id: po.order!.invoice!.id } });
  assert.equal(inv.status, "PAID");
  assert.ok(inv.paidAt);
  const item = await db.orderItem.findUniqueOrThrow({ where: { id: po.order!.items[0].id } });
  assert.ok(item.transferId?.startsWith("tr_mock_"), "delivered line paid out from the platform balance");
});

test("rejecting a PO cancels the order, restocks, and keeps the cart", async () => {
  const book = await db.book.findFirstOrThrow({ where: { title: "Joyful Path" } });
  const o = await poOrder("Joyful Path", 2, "PO-B");
  assert.equal((await rejectPo(o.purchaseOrder!.id, "Wrong district")).ok, true);
  const after = await db.order.findUniqueOrThrow({ where: { id: o.id } });
  assert.equal(after.status, "CANCELLED");
  assert.equal((await db.book.findUniqueOrThrow({ where: { id: book.id } })).stock, book.stock);
  assert.equal(await db.cartItem.count({ where: { userId: o.buyerId, bookId: book.id } }), 1);
  assert.equal((await db.purchaseOrder.findUniqueOrThrow({ where: { id: o.purchaseOrder!.id } })).adminNote, "Wrong district");
});

test("a booking paid by PO is confirmed on approval, voided on cancel, and paid out only after payment", async () => {
  const school = await db.user.findUniqueOrThrow({ where: { email: "school@atelier.test" } });
  const pkg = await db.visitPackage.findFirstOrThrow({ where: { status: "APPROVED" } });
  const mk = (n: number) =>
    db.booking.create({
      data: {
        buyerId: school.id, authorId: pkg.authorId, packageId: pkg.id, fee: 50000, commissionPct: 15, status: "ACCEPTED",
        eventDate: day(n), organisation: "St. Cloud Elementary", venue: "Gym", audienceSize: 100,
        purchaseOrder: { create: { ...billing, buyerId: school.id, poNumber: `PO-V${n}`, amount: 50000 } },
      },
      include: { purchaseOrder: true },
    });

  const canceled = await mk(40);
  await approvePo(canceled.purchaseOrder!.id);
  assert.equal((await db.booking.findUniqueOrThrow({ where: { id: canceled.id } })).status, "CONFIRMED");
  const r = await cancelBooking(canceled.id);
  assert.equal(r.ok, true);
  assert.equal((await db.invoice.findFirstOrThrow({ where: { bookingId: canceled.id } })).status, "VOID");
  assert.equal((await db.purchaseOrder.findUniqueOrThrow({ where: { id: canceled.purchaseOrder!.id } })).status, "CANCELLED");

  const visit = await mk(-20); // the event already happened
  await approvePo(visit.purchaseOrder!.id);
  await db.booking.update({ where: { id: visit.id }, data: { status: "COMPLETED" } });
  await releaseBooking(visit.id);
  assert.equal((await db.booking.findUniqueOrThrow({ where: { id: visit.id } })).transferId, null, "not paid before the invoice");
  await markPoPaid(visit.purchaseOrder!.id, null);
  assert.ok((await db.booking.findUniqueOrThrow({ where: { id: visit.id } })).transferId?.startsWith("tr_mock_"));
});
