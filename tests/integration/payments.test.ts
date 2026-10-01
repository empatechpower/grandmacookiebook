import { reseed } from "./helpers";
import { before, test } from "node:test";
import assert from "node:assert/strict";
import { db } from "../../src/lib/db";
import { demoPayment } from "../../src/lib/payments";
import { HOLD_DAYS, expireOrder, fulfillBooking, fulfillOrder, releaseBooking, releaseDue, releaseItem } from "../../src/lib/fulfillment";
import { cancelBooking, refundItem } from "../../src/lib/refunds";
import { authorEarnings } from "../../src/lib/earnings";

before(reseed);

async function pendingOrder(title: string, qty: number) {
  const buyer = await db.user.findUniqueOrThrow({ where: { email: "buyer@atelier.test" } });
  const book = await db.book.findFirstOrThrow({ where: { title } });
  await db.book.update({ where: { id: book.id }, data: { stock: { decrement: qty } } });
  await db.cartItem.create({ data: { userId: buyer.id, bookId: book.id, qty } });
  return db.order.create({
    data: {
      buyerId: buyer.id, total: book.price * qty, shippingAddress: "1 Test St",
      items: { create: [{ bookId: book.id, authorId: book.authorId, title: book.title, unitPrice: book.price, qty, commissionPct: 5 }] },
    },
    include: { items: true },
  });
}

test("paying an order holds the author's share and clears the cart; replays are no-ops", async () => {
  const order = await pendingOrder("Word Play Lab", 2);
  const payment = demoPayment();
  await fulfillOrder(order.id, payment);
  await fulfillOrder(order.id, payment); // webhook + return page both deliver
  const o = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });
  assert.equal(o.status, "PAID");
  assert.equal(o.items[0].status, "PAID");
  assert.equal(o.items[0].transferId, null, "held, not transferred");
  const days = (o.items[0].releaseAt!.getTime() - Date.now()) / 864e5;
  assert.ok(Math.abs(days - HOLD_DAYS) < 0.01, "released after the hold");
  assert.equal(await db.cartItem.count({ where: { userId: o.buyerId } }), 0);
});

test("releasing pays the author once, and earnings reflect it", async () => {
  const item = await db.orderItem.findFirstOrThrow({ where: { title: "Word Play Lab", status: "PAID" } });
  await releaseItem(item.id);
  await releaseItem(item.id);
  const after = await db.orderItem.findUniqueOrThrow({ where: { id: item.id } });
  assert.ok(after.transferId?.startsWith("tr_mock_"));
  const e = await authorEarnings(item.authorId);
  const row = e.rows.find((r) => r.id === item.id)!;
  assert.equal(row.net, Math.round(item.unitPrice * item.qty * 0.95));
});

test("the daily job releases due holds but skips sales with an open problem report", async () => {
  const a = await pendingOrder("Joyful Path", 1);
  const b = await pendingOrder("Horse Country Tales", 1);
  await fulfillOrder(a.id, demoPayment());
  await fulfillOrder(b.id, demoPayment());
  const past = new Date(Date.now() - 864e5);
  await db.orderItem.updateMany({ where: { orderId: { in: [a.id, b.id] } }, data: { releaseAt: past } });
  const disputed = await db.orderItem.findFirstOrThrow({ where: { orderId: b.id } });
  await db.issue.create({ data: { buyerId: b.buyerId, orderItemId: disputed.id, reason: "NOT_RECEIVED", details: "Never arrived" } });
  await releaseDue();
  assert.ok((await db.orderItem.findFirstOrThrow({ where: { orderId: a.id } })).transferId);
  assert.equal((await db.orderItem.findUniqueOrThrow({ where: { id: disputed.id } })).transferId, null);
});

test("refunding an unshipped line restocks it", async () => {
  const order = await pendingOrder("Night Sky Notes", 3);
  await fulfillOrder(order.id, demoPayment());
  const stockBefore = (await db.book.findFirstOrThrow({ where: { title: "Night Sky Notes" } })).stock;
  const r = await refundItem(order.items[0].id);
  assert.equal(r.ok, true);
  assert.equal((await db.orderItem.findUniqueOrThrow({ where: { id: order.items[0].id } })).status, "REFUNDED");
  assert.equal((await db.book.findFirstOrThrow({ where: { title: "Night Sky Notes" } })).stock, stockBefore + 3);
  assert.equal((await refundItem(order.items[0].id)).ok, false, "can't refund twice");
});

test("an expired checkout cancels the order and returns the stock", async () => {
  const before = (await db.book.findFirstOrThrow({ where: { title: "Balu the Paw Traveler" } })).stock;
  const order = await pendingOrder("Balu the Paw Traveler", 4);
  await expireOrder(order.id);
  await expireOrder(order.id);
  assert.equal((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status, "CANCELLED");
  assert.equal((await db.book.findFirstOrThrow({ where: { title: "Balu the Paw Traveler" } })).stock, before);
});

test("a paid booking is held until 14 days after the event; a second payment doesn't double-confirm", async () => {
  const b = await db.booking.findFirstOrThrow({ where: { status: "PENDING" } });
  await db.booking.update({ where: { id: b.id }, data: { status: "ACCEPTED" } });
  const p1 = demoPayment();
  await fulfillBooking(b.id, p1);
  await fulfillBooking(b.id, demoPayment()); // paid again in another tab -> refunded, not re-confirmed
  const after = await db.booking.findUniqueOrThrow({ where: { id: b.id } });
  assert.equal(after.status, "CONFIRMED");
  assert.equal(after.paymentRef, p1.paymentIntentId);
  assert.equal(after.releaseAt!.getTime(), b.eventDate.getTime() + 14 * 864e5);
  await releaseBooking(b.id);
  assert.ok((await db.booking.findUniqueOrThrow({ where: { id: b.id } })).transferId);
});

test("cancelling a paid booking refunds it; a declined one can't be cancelled", async () => {
  const b = await db.booking.findFirstOrThrow({ where: { status: "CONFIRMED", transferId: null } });
  const r = await cancelBooking(b.id);
  assert.deepEqual(r, { ok: true, warning: null, refunded: true });
  assert.equal((await db.booking.findUniqueOrThrow({ where: { id: b.id } })).status, "CANCELLED");
  assert.equal((await cancelBooking(b.id)).ok, false);
});
