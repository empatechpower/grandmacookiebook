"use server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { done, fail, str } from "@/lib/actions";
import { CATEGORIES, FORMATS, GRADES, IDENTITIES, LANGUAGES, ORG_TYPES, TOPICS } from "@/lib/constants";
import { serializeTags } from "@/lib/tags";
import * as notify from "@/lib/notify";
import { hasFile, saveImage } from "@/lib/storage";
import { redirect } from "next/navigation";
import { createConnectedAccount, demoMode, fetchAccountReady, onboardingLink } from "@/lib/payments";
import { toCents } from "@/lib/money";

// Our own uploads are stored as relative /uploads/… paths.
const ownUpload = z.string().regex(/^\/uploads\/(avatars|covers)\/[0-9a-f-]{36}\.(jpg|png|webp)$/);
const url = z.union([z.literal(""), ownUpload, z.string().url("Cover must be a full URL (https://…)")]);

const BookSchema = z.object({
  title: z.string().trim().min(2, "Title is required"),
  description: z.string().trim().min(10, "Add a short description (10+ characters)"),
  category: z.enum(CATEGORIES.map((c) => c.value) as [string, ...string[]]),
  price: z.number().int().min(100, "Price must be at least 1.00"),
  stock: z.number().int().min(0),
  coverUrl: url,
  bulkMinQty: z.number().int().min(2, "Classroom-set minimum must be at least 2 copies").nullable(),
  bulkPrice: z.number().int().min(100).nullable(),
}).refine((d) => (d.bulkMinQty === null) === (d.bulkPrice === null), { message: "Set both the classroom-set quantity and price, or neither" })
  .refine((d) => d.bulkPrice === null || d.bulkPrice < d.price, { message: "Classroom-set price must be lower than the regular price" });

export async function saveBook(fd: FormData) {
  const user = await requireUser("AUTHOR");
  const id = str(fd, "id");
  const parsed = BookSchema.safeParse({
    title: str(fd, "title"),
    description: str(fd, "description"),
    category: str(fd, "category"),
    price: toCents(fd.get("price")),
    stock: Math.trunc(Number(fd.get("stock") || 0)),
    coverUrl: str(fd, "coverUrl"),
    bulkMinQty: str(fd, "bulkMinQty") ? Math.trunc(Number(fd.get("bulkMinQty"))) : null,
    bulkPrice: str(fd, "bulkPrice") ? toCents(fd.get("bulkPrice")) : null,
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const data = { ...parsed.data, coverUrl: parsed.data.coverUrl || null };
  const upload = fd.get("coverFile");
  if (hasFile(upload)) {
    const saved = await saveImage(upload, "covers");
    if ("error" in saved) return fail(saved.error);
    data.coverUrl = saved.url;
  }

  if (!id) {
    await db.book.create({ data: { ...data, authorId: user.id } });
    await notify.listingSubmitted("book", data.title, user.name);
    return done("Book submitted for admin review", "/dashboard/author/books");
  }
  const existing = await db.book.findFirst({ where: { id, authorId: user.id } });
  if (!existing) return fail("Book not found");
  // Price and stock changes go live immediately; content changes need re-review.
  const contentChanged = (["title", "description", "category", "coverUrl"] as const).some((k) => existing[k] !== data[k]);
  const status = contentChanged || existing.status === "REJECTED" ? "PENDING" : existing.status;
  await db.book.update({ where: { id }, data: { ...data, status, reviewNote: status === "PENDING" ? null : existing.reviewNote } });
  if (status === "PENDING" && existing.status !== "PENDING") await notify.listingSubmitted("book", data.title, user.name);
  await done(status === "PENDING" && existing.status !== "PENDING" ? "Saved — resubmitted for review" : "Book saved", "/dashboard/author/books");
}

const PackageSchema = z.object({
  title: z.string().trim().min(2, "Name is required"),
  description: z.string().trim().min(10, "Describe what the audience gets (10+ characters)"),
  format: z.enum(FORMATS.map((f) => f.value) as [string, ...string[]]),
  durationMins: z.number().int().min(10, "Duration must be at least 10 minutes"),
  fee: z.number().int().min(100, "Fee must be at least 1.00"),
  region: z.string().trim(),
});

export async function savePackage(fd: FormData) {
  const user = await requireUser("AUTHOR");
  const id = str(fd, "id");
  const parsed = PackageSchema.safeParse({
    title: str(fd, "title"),
    description: str(fd, "description"),
    format: str(fd, "format"),
    durationMins: Math.trunc(Number(fd.get("durationMins") || 0)),
    fee: toCents(fd.get("fee")),
    region: str(fd, "region"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const data = { ...parsed.data, region: parsed.data.region || null };

  if (!id) {
    await db.visitPackage.create({ data: { ...data, authorId: user.id } });
    await notify.listingSubmitted("package", data.title, user.name);
    return done("Visit package submitted for admin review", "/dashboard/author/visits");
  }
  const existing = await db.visitPackage.findFirst({ where: { id, authorId: user.id } });
  if (!existing) return fail("Package not found");
  const contentChanged = (["title", "description", "format"] as const).some((k) => existing[k] !== data[k]);
  const status = contentChanged || existing.status === "REJECTED" ? "PENDING" : existing.status;
  await db.visitPackage.update({ where: { id }, data: { ...data, status, reviewNote: status === "PENDING" ? null : existing.reviewNote } });
  if (status === "PENDING" && existing.status !== "PENDING") await notify.listingSubmitted("package", data.title, user.name);
  await done("Package saved", "/dashboard/author/visits");
}

/** Archive hides a listing from the catalog without deleting sales history. Restoring goes back through review. */
export async function toggleArchive(fd: FormData) {
  const user = await requireUser("AUTHOR");
  const id = str(fd, "id");
  const where = { id, authorId: user.id };
  const item =
    str(fd, "kind") === "book"
      ? await db.book.findFirst({ where, select: { status: true, title: true } })
      : await db.visitPackage.findFirst({ where, select: { status: true, title: true } });
  if (!item) return fail("Not found");
  const status = item.status === "ARCHIVED" ? "PENDING" : "ARCHIVED";
  if (str(fd, "kind") === "book") await db.book.update({ where, data: { status } });
  else await db.visitPackage.update({ where, data: { status } });
  if (status === "PENDING") await notify.listingSubmitted(str(fd, "kind") === "book" ? "book" : "package", item.title, user.name);
  await done(status === "ARCHIVED" ? "Archived — hidden from the catalog" : "Restored and sent for review");
}

/**
 * Accept (optionally with a final quote, e.g. adding travel costs) or decline a request.
 * Accepting fails if the author already has a confirmed/accepted booking that day.
 */
export async function respondBooking(fd: FormData) {
  const user = await requireUser("AUTHOR");
  const accept = str(fd, "decision") === "accept";
  const b = await db.booking.findFirst({ where: { id: str(fd, "id"), authorId: user.id, status: "PENDING" } });
  if (!b) return fail("This request was already handled");
  let fee = b.fee;
  if (accept) {
    const clash = await db.booking.count({
      where: { authorId: user.id, eventDate: b.eventDate, status: { in: ["ACCEPTED", "CONFIRMED"] }, id: { not: b.id } },
    });
    if (clash) return fail("You already have a booking that day — decline or message the buyer to move it");
    if (str(fd, "fee")) fee = toCents(fd.get("fee"));
    if (fee < 100) return fail("Quote must be at least 1.00");
  }
  await db.booking.update({
    where: { id: b.id },
    data: { status: accept ? "ACCEPTED" : "DECLINED", fee, authorNote: str(fd, "note") || null },
  });
  await notify.bookingResponded(b.id);
  await done(accept ? "Accepted — the buyer can now pay to confirm" : "Request declined");
}

export async function shipItem(fd: FormData) {
  const user = await requireUser("AUTHOR");
  const id = str(fd, "id");
  const r = await db.orderItem.updateMany({ where: { id, authorId: user.id, status: "PAID" }, data: { status: "SHIPPED" } });
  if (r.count) await notify.itemShipped(id);
  await done(r.count ? "Marked as shipped" : "Already handled");
}

/** Starts (or resumes) Stripe Connect onboarding so the author can be paid automatically. */
export async function connectStripe() {
  const user = await requireUser("AUTHOR");
  let accountId = user.stripeAccountId;
  if (!accountId) {
    accountId = await createConnectedAccount({ email: user.email, userId: user.id });
    await db.user.update({ where: { id: user.id }, data: { stripeAccountId: accountId } });
  }
  if (demoMode) {
    await db.user.update({ where: { id: user.id }, data: { payoutsReady: true } });
    return done("Payouts connected (demo mode)");
  }
  redirect(await onboardingLink(accountId));
}

/** Re-checks onboarding status with Stripe (also kept in sync by the account.updated webhook). */
export async function refreshStripeStatus() {
  const user = await requireUser("AUTHOR");
  if (!user.stripeAccountId) return;
  const ready = await fetchAccountReady(user.stripeAccountId);
  await db.user.update({ where: { id: user.id }, data: { payoutsReady: ready } });
  await done(ready ? "Stripe connected — you'll be paid automatically" : "Stripe still needs a few details from you");
}

const optionalUrl = z.union([z.literal(""), ownUpload, z.string().url()]);

export async function updateProfile(fd: FormData) {
  const user = await requireUser("AUTHOR", "BUYER");
  const name = str(fd, "name");
  if (name.length < 2) return fail("Name is required");
  const base = { name, location: str(fd, "location") || null };
  if (user.role === "BUYER") {
    const orgType = ORG_TYPES.some((o) => o.value === str(fd, "orgType")) ? str(fd, "orgType") : null;
    await db.user.update({ where: { id: user.id }, data: { ...base, orgType, orgName: str(fd, "orgName").slice(0, 120) || null } });
    return done("Profile saved");
  }
  const urls = { avatarUrl: str(fd, "avatarUrl"), websiteUrl: str(fd, "websiteUrl"), videoUrl: str(fd, "videoUrl") };
  for (const [k, v] of Object.entries(urls)) {
    if (!optionalUrl.safeParse(v).success) return fail(`${k.replace("Url", "")} link must be a full URL (https://…)`);
  }
  const tags = (key: string, allowed: { value: string }[]) => serializeTags(fd.getAll(key).map(String), allowed);
  const photo = fd.get("avatarFile");
  if (hasFile(photo)) {
    const saved = await saveImage(photo, "avatars");
    if ("error" in saved) return fail(saved.error);
    urls.avatarUrl = saved.url;
  }
  await db.user.update({
    where: { id: user.id },
    data: {
      ...base,
      headline: str(fd, "headline").slice(0, 120) || null,
      bio: str(fd, "bio") || null,
      avatarUrl: urls.avatarUrl || null,
      websiteUrl: urls.websiteUrl || null,
      videoUrl: urls.videoUrl || null,
      topics: tags("topics", TOPICS),
      grades: tags("grades", GRADES),
      languages: tags("languages", LANGUAGES),
      identities: tags("identities", IDENTITIES),
    },
  });
  await done("Profile saved");
}
