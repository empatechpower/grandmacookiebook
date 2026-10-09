"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { currentUser, requireUser } from "@/lib/auth";
import { done, fail, phoneOk, str, int } from "@/lib/actions";
import { getSettings } from "@/lib/settings";
import { createCheckoutSession, demoMode, demoPayment } from "@/lib/payments";
import { fulfillBooking, fulfillOrder, releaseBooking, releaseItem } from "@/lib/fulfillment";
import { cancelBooking as cancelPaidBooking } from "@/lib/refunds";
import { isLateCancellation } from "@/lib/dates";
import * as notify from "@/lib/notify";
import { liveWhere } from "@/lib/catalog";
import { tiersFrom, unitPriceFor } from "@/lib/pricing";
import { fromDayKey, isDayKey, isTime, todayKey } from "@/lib/dates";
import { canUsePo, cancelPoFor } from "@/lib/purchaseOrders";
import { hasFile, savePrivatePdf } from "@/lib/storage";

/** Reads and checks the purchase order form (shared by cart checkout and booking payment). */
async function readPoForm(fd: FormData, user: { orgType: string | null }, back: string) {
  if (!canUsePo(user)) return fail("Purchase orders are for schools and organizations — set your organization type in your profile, or pay by card", back);
  const po = {
    poNumber: str(fd, "poNumber").slice(0, 40),
    billingName: str(fd, "billingName").slice(0, 120),
    billingEmail: str(fd, "billingEmail").toLowerCase().slice(0, 160),
    billingPhone: str(fd, "billingPhone").slice(0, 30) || null,
    billingAddress: str(fd, "billingAddress").slice(0, 400),
  };
  if (!po.poNumber) return fail("Enter your PO number", back);
  if (!po.billingName) return fail("Enter the billing contact (accounts payable)", back);
  if (po.billingPhone && !phoneOk(po.billingPhone)) return fail("Enter a 10-digit US billing phone number", back);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(po.billingEmail)) return fail("Enter a valid billing email", back);
  if (po.billingAddress.length < 8) return fail("Enter the billing address", back);
  const file = fd.get("poFile");
  let doc: { fileKey: string; fileName: string } | null = null;
  if (hasFile(file)) {
    const saved = await savePrivatePdf(file);
    if ("error" in saved) return fail(saved.error, back);
    doc = { fileKey: saved.key, fileName: file.name.slice(0, 120) || "purchase-order.pdf" };
  }
  const { poTermsDays } = await getSettings();
  return { ...po, ...doc, termsDays: poTermsDays };
}

async function requireBuyer(action: string) {
  const user = await currentUser();
  if (!user) {
    const ref = (await headers()).get("referer");
    const next = ref ? new URL(ref).pathname : "/";
    await done("Log in with a buyer account first");
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  if (user.role !== "BUYER") await fail(`Only buyer accounts can ${action}. Use a buyer account.`);
  return user;
}

export async function addToCart(fd: FormData) {
  const user = await requireBuyer("purchase books");
  const bookId = str(fd, "bookId");
  const qty = Math.max(1, int(fd, "qty") || 1);
  const book = await db.book.findFirst({ where: { id: bookId, ...liveWhere } });
  if (!book) return fail("That book is no longer available");
  const existing = await db.cartItem.findUnique({ where: { userId_bookId: { userId: user.id, bookId } } });
  const newQty = Math.min(book.stock, (existing?.qty ?? 0) + qty);
  if (newQty < 1) return fail("Sold out");
  await db.cartItem.upsert({
    where: { userId_bookId: { userId: user.id, bookId } },
    update: { qty: newQty },
    create: { userId: user.id, bookId, qty: newQty },
  });
  await done(`Added “${book.title}” to your cart`, "/cart");
}

export async function updateCartItem(fd: FormData) {
  const user = await requireUser("BUYER");
  const id = str(fd, "id");
  const qty = int(fd, "qty");
  const item = await db.cartItem.findFirst({ where: { id, userId: user.id }, include: { book: true } });
  if (!item) return;
  if (qty < 1) await db.cartItem.delete({ where: { id } });
  else await db.cartItem.update({ where: { id }, data: { qty: Math.min(qty, item.book.stock) } });
  await done(qty < 1 ? "Removed from cart" : "Cart updated");
}

export async function checkout(fd: FormData) {
  const user = await requireUser("BUYER");
  const address = str(fd, "address");
  if (address.length < 8) return fail("Enter a full shipping address", "/cart");
  if (address.length > 400) return fail("Shipping address is too long", "/cart");
  if (!phoneOk(str(fd, "phone"))) return fail("Enter a 10-digit US phone number, e.g. (956) 555-0142", "/cart");
  const byPo = str(fd, "payment") === "po";
  const po = byPo ? await readPoForm(fd, user, "/cart") : null;

  const cart = await db.cartItem.findMany({ where: { userId: user.id }, include: { book: true } });
  if (!cart.length) return fail("Your cart is empty", "/cart");
  for (const c of cart) {
    if (c.book.status !== "APPROVED") return fail(`“${c.book.title}” is no longer available — remove it to continue`, "/cart");
    if (c.book.stock < c.qty) return fail(`Only ${c.book.stock} left of “${c.book.title}”`, "/cart");
  }
  const settings = await getSettings();
  const { bookCommissionPct } = settings;
  const tiers = tiersFrom(settings);
  const total = cart.reduce((s, c) => s + unitPriceFor(c.book, c.qty, tiers) * c.qty, 0);

  // Create the order unpaid and reserve stock. Payment (webhook or return page) marks it PAID and
  // pays the authors; an expired checkout cancels it and releases the stock.
  const order = await db
    .$transaction(async (tx) => {
    for (const c of cart) {
      // Conditional decrement guards against overselling under concurrent checkouts.
      const r = await tx.book.updateMany({ where: { id: c.bookId, stock: { gte: c.qty } }, data: { stock: { decrement: c.qty } } });
      if (r.count === 0) throw new Error(`Out of stock: ${c.book.title}`);
    }
    return tx.order.create({
      data: {
        buyerId: user.id,
        total,
        shippingAddress: address,
        phone: str(fd, "phone").slice(0, 30) || null,
        items: {
          create: cart.map((c) => ({
            bookId: c.bookId,
            authorId: c.book.authorId,
            title: c.book.title,
            unitPrice: unitPriceFor(c.book, c.qty, tiers),
            listPrice: unitPriceFor(c.book, c.qty, tiers) < c.book.price ? c.book.price : null,
            qty: c.qty,
            commissionPct: bookCommissionPct,
          })),
        },
      },
    });
  })
    .catch(() => null);
  if (!order) return fail("Some items just sold out — please check your cart", "/cart");
  // Remember the phone for next time.
  const phone = str(fd, "phone").slice(0, 30);
  if (phone && !user.phone) await db.user.update({ where: { id: user.id }, data: { phone } });

  if (po) {
    await db.purchaseOrder.create({ data: { ...po, buyerId: user.id, orderId: order.id, amount: order.total } });
    await notify.poSubmitted(order.id, "order");
    return done(`Purchase order sent for O-${order.number}. We'll email you once it's approved — usually within one business day.`, "/dashboard/buyer/orders");
  }
  if (demoMode) {
    await fulfillOrder(order.id, demoPayment());
    return done(`Order O-${order.number} paid (demo mode)`, "/dashboard/buyer/orders");
  }
  const session = await createCheckoutSession({
    kind: "order",
    id: order.id,
    email: user.email,
    lines: cart.map((c) => ({ name: c.book.title, unitAmount: unitPriceFor(c.book, c.qty, tiers), qty: c.qty })),
    cancelPath: "/cart",
  });
  await db.order.update({ where: { id: order.id }, data: { stripeSessionId: session.sessionId } });
  redirect(session.url);
}

/** Buyer confirms a book arrived, which releases the author's share straight away. */
export async function markReceived(fd: FormData) {
  const user = await requireUser("BUYER");
  const id = str(fd, "id");
  const r = await db.orderItem.updateMany({
    where: { id, status: { in: ["PAID", "SHIPPED"] }, order: { buyerId: user.id } },
    data: { status: "DELIVERED" },
  });
  if (r.count) {
    await releaseItem(id);
    await notify.reviewPrompt({ kind: "item", id });
  }
  await done(r.count ? "Thanks! Marked as received and the author has been paid" : "Already confirmed");
}

/** Buyer confirms the visit happened, which releases the author's fee straight away. */
export async function confirmVisit(fd: FormData) {
  const user = await requireUser("BUYER");
  const id = str(fd, "id");
  const r = await db.booking.updateMany({
    where: { id, buyerId: user.id, status: "CONFIRMED", eventDate: { lte: fromDayKey(todayKey()) } },
    data: { status: "COMPLETED" },
  });
  if (r.count) {
    await releaseBooking(id);
    await notify.reviewPrompt({ kind: "booking", id });
  }
  await done(r.count ? "Thanks! Visit confirmed and the author has been paid" : "You can confirm on or after the event date");
}

export async function requestBooking(fd: FormData) {
  const user = await requireBuyer("book authors");
  const pkg = await db.visitPackage.findFirst({ where: { id: str(fd, "packageId"), ...liveWhere } });
  if (!pkg) return fail("This visit package is no longer available");

  const key = str(fd, "eventDate");
  const eventDate = isDayKey(key) ? fromDayKey(key) : new Date(NaN);
  const organisation = str(fd, "organisation");
  const venue = str(fd, "venue");
  const audienceSize = int(fd, "audienceSize");
  if (isNaN(eventDate.getTime()) || key <= todayKey()) return fail("Pick an event date from tomorrow onwards");
  if (!organisation || !venue) return fail("Organization and venue are required");
  if (organisation.length > 150 || venue.length > 200) return fail("Organization or venue is too long");
  if (str(fd, "message").length > 2000) return fail("Message is too long (2,000 characters max)");
  const eventTime = str(fd, "eventTime");
  if (!isTime(eventTime)) return fail("Choose a start time");
  // If the author publishes availability, the date must be one of their open days and not already taken.
  const openDays = await db.availableDate.count({ where: { authorId: pkg.authorId, date: { gte: fromDayKey(todayKey()) } } });
  if (openDays) {
    const open = await db.availableDate.findUnique({ where: { authorId_date: { authorId: pkg.authorId, date: eventDate } } });
    const taken = await db.booking.count({ where: { authorId: pkg.authorId, eventDate, status: { in: ["ACCEPTED", "CONFIRMED"] } } });
    if (!open || taken) return fail("That date isn't available — pick one of the author's open dates");
  }
  if (audienceSize < 1 || audienceSize > 100_000) return fail("Enter an estimated audience size (1–100,000)");

  const { visitCommissionPct } = await getSettings();
  const booking = await db.booking.create({
    data: {
      buyerId: user.id,
      authorId: pkg.authorId,
      packageId: pkg.id,
      eventDate,
      eventTime,
      organisation,
      venue,
      audienceSize,
      message: str(fd, "message") || null,
      fee: pkg.fee,
      commissionPct: visitCommissionPct,
    },
  });
  await notify.bookingRequested(booking.id);
  await done(`Request B-${booking.number} sent. The author will respond soon.`, "/dashboard/buyer/bookings");
}

export async function payBooking(fd: FormData) {
  const user = await requireUser("BUYER");
  const b = await db.booking.findFirst({ where: { id: str(fd, "id"), buyerId: user.id, status: "ACCEPTED" }, include: { package: true, purchaseOrder: true } });
  if (!b) return fail("This booking can't be paid right now");
  if (b.purchaseOrder?.status === "PENDING") return fail("Your purchase order for this booking is being reviewed");
  if (demoMode) {
    await fulfillBooking(b.id, demoPayment());
    return done(`Booking B-${b.number} paid and confirmed (demo mode)`);
  }
  const session = await createCheckoutSession({
    kind: "booking",
    id: b.id,
    email: user.email,
    lines: [{ name: `${b.package.title} — ${b.organisation}`, unitAmount: b.fee, qty: 1 }],
    cancelPath: "/dashboard/buyer/bookings",
  });
  redirect(session.url);
}

/** Pay for an accepted booking with a purchase order instead of a card. */
export async function payBookingByPo(fd: FormData) {
  const user = await requireUser("BUYER");
  const back = `/dashboard/buyer/bookings/po?id=${encodeURIComponent(str(fd, "id"))}`;
  const b = await db.booking.findFirst({ where: { id: str(fd, "id"), buyerId: user.id, status: "ACCEPTED", paymentRef: null }, include: { purchaseOrder: true } });
  if (!b) return fail("This booking can't be paid right now", "/dashboard/buyer/bookings");
  if (b.purchaseOrder && ["PENDING", "APPROVED", "PAID"].includes(b.purchaseOrder.status)) return fail("A purchase order has already been sent for this booking", "/dashboard/buyer/bookings");
  const po = await readPoForm(fd, user, back);
  // A rejected or canceled PO can be replaced with a corrected one.
  const data = { ...po, buyerId: user.id, amount: b.fee, status: "PENDING", adminNote: null, approvedAt: null, paidAt: null, paymentNote: null };
  await db.purchaseOrder.upsert({ where: { bookingId: b.id }, update: data, create: { ...data, bookingId: b.id } });
  await notify.poSubmitted(b.id, "booking");
  await done(`Purchase order sent for B-${b.number}. We'll email you once it's approved.`, "/dashboard/buyer/bookings");
}

/**
 * Buyer cancellation. Unpaid requests just close. Paid bookings follow the cancellation
 * policy: with enough notice the buyer is refunded in full; inside the notice window the
 * author is paid anyway (guaranteed payment for last-minute cancellations).
 */
export async function cancelBooking(fd: FormData) {
  const user = await requireUser("BUYER");
  const id = str(fd, "id");
  const b = await db.booking.findFirst({ where: { id, buyerId: user.id }, include: { issues: { where: { status: "OPEN" } } } });
  if (!b) return fail("Booking not found");

  if (["PENDING", "ACCEPTED"].includes(b.status)) {
    await db.booking.update({ where: { id }, data: { status: "CANCELLED" } });
    await cancelPoFor({ bookingId: id });
    await notify.bookingCancelled(id, "unpaid");
    return done("Booking canceled");
  }
  if (b.status !== "CONFIRMED" || b.transferId) return fail("This booking can no longer be canceled here — please contact us");
  if (b.issues.length) return fail("You have an open problem report on this booking — our team will resolve it");

  if (isLateCancellation(b.eventDate, (await getSettings()).cancelNoticeDays)) {
    await db.booking.update({ where: { id }, data: { status: "LATE_CANCELLED" } });
    await releaseBooking(id);
    await notify.bookingCancelled(id, "late");
    return done("Booking canceled. As it was within the late-cancellation window, the fee isn't refunded.");
  }
  const r = await cancelPaidBooking(id);
  if (!r.ok) return fail(r.error);
  await done("Booking canceled — you'll be refunded in full");
}
