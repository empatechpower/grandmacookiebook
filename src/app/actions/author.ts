"use server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { done, fail, phoneOk, str, requireVerified } from "@/lib/actions";
import { CATEGORIES, FORMATS, GRADES, IDENTITIES, LANGUAGES, ORG_TYPES, TOPICS } from "@/lib/constants";
import { serializeTags } from "@/lib/tags";
import * as notify from "@/lib/notify";
import { CARRIERS } from "@/lib/shipping";
import { slugError } from "@/lib/storefront";
import { hasFile, saveImage } from "@/lib/storage";
import { redirect } from "next/navigation";
import { createConnectedAccount, demoMode, fetchAccountReady, onboardingLink } from "@/lib/payments";
import { toCents } from "@/lib/money";
import { syncAuthorStripe } from "@/lib/stripeSync";
import { isbnOk, normalizeIsbn } from "@/lib/validation";
import { cancelBooking as cancelWithRefund } from "@/lib/refunds";
import { fromDayKey, todayKey } from "@/lib/dates";


const BookSchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(150, "Title is too long (150 characters max)"),
  description: z.string().trim().min(10, "Add a short description (10+ characters)").max(5000, "Description is too long (5,000 characters max)"),
  category: z.enum(CATEGORIES.map((c) => c.value) as [string, ...string[]]),
  price: z.number().int().min(100, "Price must be at least 1.00").max(1_000_000, "Price can be at most $10,000"),
  stock: z.number().int().min(0, "Stock can't be negative").max(100_000, "Stock can be at most 100,000"),
  isbn: z.string().refine(isbnOk, "That ISBN doesn't look right — check the 10 or 13 digits on the back cover"),
  bulkEnabled: z.boolean(),
});

export async function saveBook(fd: FormData) {
  const user = await requireUser("AUTHOR");
  await requireVerified(user);
  const id = str(fd, "id");
  const parsed = BookSchema.safeParse({
    title: str(fd, "title"),
    description: str(fd, "description"),
    category: str(fd, "category"),
    price: toCents(fd.get("price")),
    stock: Math.trunc(Number(fd.get("stock") || 0)),
    isbn: str(fd, "isbn"),
    bulkEnabled: fd.get("bulkEnabled") === "on",
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const existingCover = id ? (await db.book.findFirst({ where: { id, authorId: user.id }, select: { coverUrl: true } }))?.coverUrl ?? null : null;
  // The cover only changes when a new file is uploaded.
  const data = { ...parsed.data, isbn: normalizeIsbn(parsed.data.isbn) || null, coverUrl: existingCover };
  const upload = fd.get("coverFile");
  if (hasFile(upload)) {
    const saved = await saveImage(upload, "covers");
    if ("error" in saved) return fail(saved.error);
    data.coverUrl = saved.url;
  }
  // Extra product photos (up to 8 per product).
  const extra: string[] = [];
  for (const f of fd.getAll("images")) {
    if (!hasFile(f)) continue;
    const saved = await saveImage(f, "covers");
    if ("error" in saved) return fail(saved.error);
    extra.push(saved.url);
  }
  const addImages = async (bookId: string) => {
    if (!extra.length) return;
    const count = await db.bookImage.count({ where: { bookId } });
    if (count + extra.length > 8) return;
    await db.bookImage.createMany({ data: extra.map((url, i) => ({ bookId, url, position: count + i + 1 })) });
  };

  // Books go live as soon as they're saved — no admin approval (client request). They show in the
  // catalog once the author's account is approved and Stripe is connected (see catalog.liveWhere).
  const visible = user.status === "ACTIVE" && user.payoutsReady;
  const liveMsg = visible ? "it's now live in the catalog" : "it will appear in the catalog once your account is approved and Stripe is connected";
  if (!id) {
    const created = await db.book.create({ data: { ...data, status: "APPROVED", authorId: user.id } });
    await addImages(created.id);
    await notify.bookPublished(created.id);
    return done(`Book published — ${liveMsg}`, "/dashboard/author/books");
  }
  const existing = await db.book.findFirst({ where: { id, authorId: user.id } });
  if (!existing) return fail("Book not found");
  // Every change goes live immediately. Archived books stay archived until restored.
  const status = existing.status === "ARCHIVED" ? "ARCHIVED" : "APPROVED";
  if (extra.length && (await db.bookImage.count({ where: { bookId: id } })) + extra.length > 8) return fail("Up to 8 extra photos per product");
  await db.book.update({ where: { id }, data: { ...data, status, reviewNote: null } });
  await addImages(id);
  await done(status === "ARCHIVED" ? "Book saved (still archived — restore it to show it again)" : "Book saved — changes are live", "/dashboard/author/books");
}

const PackageSchema = z.object({
  title: z.string().trim().min(2, "Name is required").max(150, "Name is too long (150 characters max)"),
  description: z.string().trim().min(10, "Describe what the audience gets (10+ characters)").max(5000, "Description is too long (5,000 characters max)"),
  format: z.enum(FORMATS.map((f) => f.value) as [string, ...string[]]),
  durationMins: z.number().int().min(10, "Duration must be at least 10 minutes").max(600, "Duration can be at most 10 hours"),
  fee: z.number().int().min(100, "Fee must be at least 1.00").max(10_000_000, "Fee can be at most $100,000"),
  region: z.string().trim().max(120, "Region is too long"),
});

export async function savePackage(fd: FormData) {
  const user = await requireUser("AUTHOR");
  await requireVerified(user);
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
  const isBook = str(fd, "kind") === "book";
  // Restored books go straight back live; visit packages are re-reviewed.
  const status = item.status !== "ARCHIVED" ? "ARCHIVED" : isBook ? "APPROVED" : "PENDING";
  if (isBook) await db.book.update({ where, data: { status } });
  else await db.visitPackage.update({ where, data: { status } });
  if (status === "PENDING") await notify.listingSubmitted("package", item.title, user.name);
  await done(status === "ARCHIVED" ? "Archived — hidden from the catalog" : isBook ? "Restored — the book is live again" : "Restored and sent for review");
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

/**
 * The author cancels an accepted or paid booking before the event. The customer always gets a
 * full refund when the author cancels (the late-cancellation rule only applies to customers).
 */
export async function authorCancelBooking(fd: FormData) {
  const user = await requireUser("AUTHOR");
  const reason = str(fd, "reason").slice(0, 300);
  if (reason.length < 3) return fail("Tell the customer why you're canceling");
  const b = await db.booking.findFirst({
    where: { id: str(fd, "id"), authorId: user.id, status: { in: ["ACCEPTED", "CONFIRMED"] }, transferId: null, eventDate: { gte: fromDayKey(todayKey()) } },
  });
  if (!b) return fail("This booking can't be canceled here — please contact us");
  await db.booking.update({ where: { id: b.id }, data: { authorNote: `Canceled by the author: ${reason}` } });
  const r = await cancelWithRefund(b.id, { reason });
  if (!r.ok) return fail(r.error);
  await done(r.refunded ? "Booking canceled — the customer has been refunded in full" : "Booking canceled — the customer has been told");
}

/** Marks a line shipped (with optional tracking), or updates the tracking on a shipped line. */
export async function shipItem(fd: FormData) {
  const user = await requireUser("AUTHOR");
  const id = str(fd, "id");
  const item = await db.orderItem.findFirst({ where: { id, authorId: user.id } });
  if (!item || !["PAID", "SHIPPED", "DELIVERED"].includes(item.status)) return fail("This order line can't be updated");
  const carrier = (CARRIERS as readonly string[]).includes(str(fd, "carrier")) ? str(fd, "carrier") : null;
  const trackingNumber = str(fd, "trackingNumber").slice(0, 60) || null;
  const firstShip = item.status === "PAID";
  await db.orderItem.update({
    where: { id },
    data: { carrier, trackingNumber, ...(firstShip ? { status: "SHIPPED", shippedAt: new Date() } : {}) },
  });
  if (firstShip || (trackingNumber && trackingNumber !== item.trackingNumber)) await notify.itemShipped(id);
  await done(firstShip ? "Marked as shipped — the buyer has been emailed" : "Tracking updated");
}

/** Starts (or resumes) Stripe Connect onboarding so the author can be paid automatically. */
export async function connectStripe() {
  const user = await requireUser("AUTHOR");
  const start = async (existing: string | null) => {
    let accountId = existing;
    if (!accountId) {
      accountId = await createConnectedAccount({ email: user.email, userId: user.id });
      await db.user.update({ where: { id: user.id }, data: { stripeAccountId: accountId, payoutsReady: false } });
    }
    return { accountId, url: demoMode ? null : await onboardingLink(accountId) };
  };
  let result: { accountId: string; url: string | null };
  try {
    try {
      result = await start(user.stripeAccountId);
    } catch (e) {
      // A saved account that no longer exists (e.g. made in test mode before going live): start a fresh one.
      if (!user.stripeAccountId || (e as { code?: string }).code !== "resource_missing") throw e;
      await db.user.update({ where: { id: user.id }, data: { stripeAccountId: null, payoutsReady: false } });
      result = await start(null);
    }
  } catch (e) {
    console.error("[stripe] connect failed for", user.email, e);
    const msg = e instanceof Error ? e.message : String(e);
    return fail(`Stripe couldn't start your setup: ${msg.slice(0, 220)} — please try again in a few minutes, or contact us if it keeps happening.`, "/dashboard/author/payouts");
  }
  if (!result.url) {
    await db.user.update({ where: { id: user.id }, data: { payoutsReady: true } });
    return done("Payouts connected (demo mode)");
  }
  redirect(result.url);
}

/** Re-checks onboarding status with Stripe (also kept in sync by the account.updated webhook). */
export async function refreshStripeStatus() {
  const user = await requireUser("AUTHOR");
  const status = await syncAuthorStripe(user);
  if (!status) return;
  await done(status === "ready" ? "Stripe connected — you'll be paid automatically" : status === "missing" ? "Please connect Stripe again — your earlier connection is no longer valid" : "Stripe still needs a few details from you — click Continue setup");
}

const optionalUrl = z.union([z.literal(""), z.string().url()]);

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
  const urls = {
    avatarUrl: user.avatarUrl ?? "", websiteUrl: str(fd, "websiteUrl"), videoUrl: str(fd, "videoUrl"),
    facebookUrl: str(fd, "facebookUrl"), instagramUrl: str(fd, "instagramUrl"), tiktokUrl: str(fd, "tiktokUrl"),
  };
  const slug = str(fd, "slug").toLowerCase();
  if (slug) {
    const err = slugError(slug);
    if (err) return fail(err);
    if (await db.user.findFirst({ where: { slug, id: { not: user.id } } })) return fail("That storefront link is taken — try another");
  }
  for (const [k, v] of Object.entries(urls)) {
    if (k === "avatarUrl") continue; // set only by uploading a photo
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
      facebookUrl: urls.facebookUrl || null,
      instagramUrl: urls.instagramUrl || null,
      tiktokUrl: urls.tiktokUrl || null,
      slug: slug || null,
      topics: tags("topics", TOPICS),
      grades: tags("grades", GRADES),
      languages: tags("languages", LANGUAGES),
      identities: tags("identities", IDENTITIES),
    },
  });
  await done("Profile saved");
}

export async function updateAccount(fd: FormData) {
  const user = await requireUser("AUTHOR", "BUYER");
  const phone = str(fd, "phone");
  if (!phoneOk(phone)) return fail("Enter a 10-digit US phone number, e.g. (956) 555-0142");
  await db.user.update({ where: { id: user.id }, data: { phone: phone.slice(0, 30) || null } });
  await done("Settings saved");
}

export async function toggleFeatured(fd: FormData) {
  const user = await requireUser("AUTHOR");
  const book = await db.book.findFirst({ where: { id: str(fd, "id"), authorId: user.id } });
  if (!book) return fail("Product not found");
  await db.book.update({ where: { id: book.id }, data: { featured: !book.featured } });
  await done(book.featured ? "No longer featured" : "Featured — shown first on your storefront");
}

/** Removes one extra photo. Bound to the photo's id: removeBookImage.bind(null, imageId). */
export async function removeBookImage(imageId: string) {
  const user = await requireUser("AUTHOR");
  await db.bookImage.deleteMany({ where: { id: String(imageId), book: { authorId: user.id } } });
  await done("Photo removed");
}

export async function toggleBulk(fd: FormData) {
  const user = await requireUser("AUTHOR");
  const book = await db.book.findFirst({ where: { id: str(fd, "id"), authorId: user.id } });
  if (!book) return fail("Product not found");
  await db.book.update({ where: { id: book.id }, data: { bulkEnabled: !book.bulkEnabled } });
  await done(book.bulkEnabled ? "Bulk discounts turned off for this product" : "Bulk discounts turned on for this product");
}
