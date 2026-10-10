"use server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { done, fail, str, int } from "@/lib/actions";
import { saveSettings } from "@/lib/settings";
import { releaseBooking, releaseDue, releaseItem } from "@/lib/fulfillment";
import { cancelBooking, refundItem } from "@/lib/refunds";
import * as notify from "@/lib/notify";
import { ensureAuthorSlug } from "@/lib/slugs";
import { approvePo, markPoPaid, rejectPo } from "@/lib/purchaseOrders";

export async function setUserStatus(fd: FormData) {
  const admin = await requireUser("ADMIN");
  const id = str(fd, "id");
  const status = str(fd, "status");
  if (!["ACTIVE", "SUSPENDED"].includes(status)) return fail("Invalid status");
  if (id === admin.id) return fail("You can't change your own status");
  const before = await db.user.findUnique({ where: { id }, select: { status: true } });
  const u = await db.user.update({ where: { id }, data: { status } });
  if (u.role === "AUTHOR") await ensureAuthorSlug(u);
  if (u.role === "AUTHOR" && before?.status === "PENDING" && status === "ACTIVE") await notify.authorApproved(u);
  await done(status === "SUSPENDED" ? `${u.name} suspended` : `${u.name} is active`);
}

export async function reviewListing(fd: FormData) {
  await requireUser("ADMIN");
  const kind = str(fd, "kind");
  const id = str(fd, "id");
  const approve = str(fd, "decision") === "approve";
  const note = str(fd, "note") || null;
  if (!approve && !note) return fail("Add a note so the author knows what to fix");
  const data = { status: approve ? "APPROVED" : "REJECTED", reviewNote: note };
  const include = { author: { select: { name: true, email: true } } };
  const listing =
    kind === "book" ? await db.book.update({ where: { id }, data, include }) : await db.visitPackage.update({ where: { id }, data, include });
  await notify.listingReviewed({ kind: kind === "book" ? "book" : "package", title: listing.title, approved: approve, note, author: listing.author });
  await done(approve ? "Listing approved — now live" : "Listing sent back to the author");
}

export async function adminCancelBooking(fd: FormData) {
  await requireUser("ADMIN");
  const r = await cancelBooking(str(fd, "id"));
  if (!r.ok) return fail(r.error);
  await done(r.warning ?? (r.refunded ? "Booking canceled and refunded" : "Booking canceled"));
}

export async function refundOrderItem(fd: FormData) {
  await requireUser("ADMIN");
  const r = await refundItem(str(fd, "id"));
  if (!r.ok) return fail(r.error);
  await done(r.warning ?? "Line refunded");
}

/** Releases a held payment early, or re-attempts a failed transfer. */
export async function retryTransfer(fd: FormData) {
  await requireUser("ADMIN");
  const id = str(fd, "id");
  const isBooking = str(fd, "kind") === "booking";
  if (isBooking) await releaseBooking(id);
  else await releaseItem(id);
  const row = isBooking
    ? await db.booking.findUnique({ where: { id }, select: { transferId: true, transferError: true } })
    : await db.orderItem.findUnique({ where: { id }, select: { transferId: true, transferError: true } });
  await done(row?.transferId ? "Released — transfer sent to author" : `Transfer failed again: ${row?.transferError ?? "unknown error"}`);
}

/** Runs the daily release job on demand (same as the cron). */
export async function releaseDueNow() {
  await requireUser("ADMIN");
  const r = await releaseDue();
  await done(r.items + r.bookings ? `Released ${r.items} order line(s) and ${r.bookings} booking(s)` : "Nothing due for release");
}

export async function saveFees(fd: FormData) {
  await requireUser("ADMIN");
  const book = int(fd, "bookCommissionPct");
  const visit = int(fd, "visitCommissionPct");
  const referralPct = Number(fd.get("referralPct") ?? 0);
  const referralMonths = int(fd, "referralMonths");
  if ([book, visit].some((n) => n < 0 || n > 50)) return fail("Commission must be between 0 and 50%");
  if (!(referralPct >= 0 && referralPct <= 10)) return fail("Referral reward must be between 0 and 10%");
  if (referralMonths < 1 || referralMonths > 60) return fail("Referral window must be 1–60 months");
  const cancelNoticeDays = int(fd, "cancelNoticeDays");
  if (cancelNoticeDays < 0 || cancelNoticeDays > 60) return fail("Cancellation notice must be 0–60 days");
  const tiers = { bulkTier1Min: int(fd, "bulkTier1Min"), bulkTier1Pct: int(fd, "bulkTier1Pct"), bulkTier2Min: int(fd, "bulkTier2Min"), bulkTier2Pct: int(fd, "bulkTier2Pct") };
  if (tiers.bulkTier1Min < 2 || tiers.bulkTier2Min <= tiers.bulkTier1Min) return fail("Tier 2 must start at more copies than tier 1 (and tier 1 at 2 or more)");
  if ([tiers.bulkTier1Pct, tiers.bulkTier2Pct].some((p) => p < 0 || p > 90)) return fail("Discounts must be between 0 and 90%");
  const poTermsDays = int(fd, "poTermsDays");
  if (poTermsDays < 0 || poTermsDays > 120) return fail("Purchase order terms must be 0–120 days");
  await saveSettings({ bookCommissionPct: book, visitCommissionPct: visit, referralPct, referralMonths, cancelNoticeDays, ...tiers, poTermsDays });
  await done("Fee schedule saved — applies to new orders and bookings");
}

const InviteSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Temporary password must be at least 8 characters"),
});

export async function inviteAdmin(fd: FormData) {
  await requireUser("ADMIN");
  const p = InviteSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return fail(p.error.issues[0].message);
  if (await db.user.findUnique({ where: { email: p.data.email } })) return fail("That email is already registered");
  await db.user.create({
    data: { name: p.data.name, email: p.data.email, role: "ADMIN", emailVerifiedAt: new Date(), passwordHash: await bcrypt.hash(p.data.password, 10) },
  });
  await done(`${p.data.name} added as super admin`);
}

// ---------- Purchase orders ----------

export async function reviewPurchaseOrder(fd: FormData) {
  await requireUser("ADMIN");
  const id = str(fd, "id");
  const approve = str(fd, "decision") === "approve";
  const r = approve ? await approvePo(id) : await rejectPo(id, str(fd, "note").slice(0, 300) || null);
  if (!r.ok) return fail(r.error);
  await done(approve ? "PO approved — the order is confirmed and the invoice was emailed" : "PO rejected — the customer has been told");
}

export async function markPurchaseOrderPaid(fd: FormData) {
  await requireUser("ADMIN");
  const r = await markPoPaid(str(fd, "id"), str(fd, "note").slice(0, 200) || null);
  if (!r.ok) return fail(r.error);
  await done("Invoice marked paid — author payouts are on their way");
}
