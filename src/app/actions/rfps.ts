"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { done, fail, str } from "@/lib/actions";
import { GRADES, TOPICS } from "@/lib/constants";
import { fromDayKey, isDayKey, todayKey } from "@/lib/dates";
import { toCents } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import * as notify from "@/lib/notify";

const oneOf = (v: string, opts: { value: string }[]) => (opts.some((o) => o.value === v) ? v : null);

const RfpSchema = z.object({
  title: z.string().trim().min(5, "Give your request a short title").max(120),
  description: z.string().trim().min(20, "Describe the event (20+ characters)").max(4000),
  format: z.enum(["IN_PERSON", "VIRTUAL", "ANY"]),
  audience: z.string().trim().min(3, "Describe the audience").max(200),
  audienceSize: z.number().int().min(1, "Estimated audience size is required"),
  location: z.string().trim().max(200),
});

export async function createRfp(fd: FormData) {
  const user = await requireUser("BUYER");
  const p = RfpSchema.safeParse({
    title: str(fd, "title"),
    description: str(fd, "description"),
    format: str(fd, "format"),
    audience: str(fd, "audience"),
    audienceSize: Math.trunc(Number(fd.get("audienceSize") || 0)),
    location: str(fd, "location"),
  });
  if (!p.success) return fail(p.error.issues[0].message);
  const eventKey = str(fd, "eventDate");
  const deadlineKey = str(fd, "deadline");
  if (!isDayKey(eventKey) || eventKey <= todayKey()) return fail("Pick an event date in the future");
  if (!isDayKey(deadlineKey) || deadlineKey < todayKey() || deadlineKey >= eventKey) return fail("Bids must close before the event date");
  if (p.data.format === "IN_PERSON" && !p.data.location) return fail("Add a location for in-person events");
  const rfp = await db.rfp.create({
    data: {
      ...p.data,
      location: p.data.location || null,
      buyerId: user.id,
      eventDate: fromDayKey(eventKey),
      deadline: fromDayKey(deadlineKey),
      grade: oneOf(str(fd, "grade"), GRADES),
      topic: oneOf(str(fd, "topic"), TOPICS),
      budgetMax: str(fd, "budgetMax") ? toCents(fd.get("budgetMax")) : null,
    },
  });
  const invited = await notify.rfpPosted(rfp.id);
  await done(`Request posted — ${invited} matching author${invited === 1 ? "" : "s"} invited to bid`, `/dashboard/buyer/requests/${rfp.id}`);
}

export async function closeRfp(fd: FormData) {
  const user = await requireUser("BUYER");
  const r = await db.rfp.updateMany({ where: { id: str(fd, "id"), buyerId: user.id, status: "OPEN" }, data: { status: "CLOSED" } });
  await done(r.count ? "Request closed" : "Already closed");
}

/** Authors bid with one of their live packages; one bid per request, editable until decided. */
export async function submitBid(fd: FormData) {
  const user = await requireUser("AUTHOR");
  if (user.status !== "ACTIVE" || !user.payoutsReady) return fail("Your account must be approved and connected to Stripe before bidding");
  const rfp = await db.rfp.findFirst({ where: { id: str(fd, "rfpId"), status: "OPEN", deadline: { gte: fromDayKey(todayKey()) } } });
  if (!rfp) return fail("This request is no longer accepting bids");
  const pkg = await db.visitPackage.findFirst({ where: { id: str(fd, "packageId"), authorId: user.id, status: "APPROVED" } });
  if (!pkg) return fail("Choose one of your live visit packages");
  const fee = toCents(fd.get("fee"));
  const message = str(fd, "message").slice(0, 3000);
  if (fee < 100) return fail("Enter your fee");
  if (message.length < 20) return fail("Tell the organiser what you'd do (20+ characters)");
  const existing = await db.bid.findUnique({ where: { rfpId_authorId: { rfpId: rfp.id, authorId: user.id } } });
  if (existing && existing.status !== "PENDING" && existing.status !== "WITHDRAWN") return fail("This bid has already been decided");
  const bid = await db.bid.upsert({
    where: { rfpId_authorId: { rfpId: rfp.id, authorId: user.id } },
    update: { packageId: pkg.id, fee, message, status: "PENDING" },
    create: { rfpId: rfp.id, authorId: user.id, packageId: pkg.id, fee, message },
  });
  if (!existing || existing.status === "WITHDRAWN") await notify.bidReceived(bid.id);
  await done(existing && existing.status === "PENDING" ? "Bid updated" : "Bid sent — the organiser has been notified");
}

export async function withdrawBid(fd: FormData) {
  const user = await requireUser("AUTHOR");
  const r = await db.bid.updateMany({ where: { id: str(fd, "id"), authorId: user.id, status: "PENDING" }, data: { status: "WITHDRAWN" } });
  await done(r.count ? "Bid withdrawn" : "This bid can't be withdrawn");
}

/** Accepting a bid turns it into an accepted booking at the bid price; other bids are declined. */
export async function acceptBid(fd: FormData) {
  const user = await requireUser("BUYER");
  const bid = await db.bid.findFirst({
    where: { id: str(fd, "id"), status: "PENDING", rfp: { buyerId: user.id, status: "OPEN" } },
    include: { rfp: true, package: true },
  });
  if (!bid) return fail("This bid is no longer available");
  const clash = await db.booking.count({ where: { authorId: bid.authorId, eventDate: bid.rfp.eventDate, status: { in: ["ACCEPTED", "CONFIRMED"] } } });
  if (clash) return fail("This author has since been booked on that date — message them or choose another bid");
  const { visitCommissionPct } = await getSettings();
  const others = await db.bid.findMany({ where: { rfpId: bid.rfpId, status: "PENDING", id: { not: bid.id } }, select: { id: true } });
  const booking = await db.$transaction(async (tx) => {
    const b = await tx.booking.create({
      data: {
        buyerId: user.id,
        authorId: bid.authorId,
        packageId: bid.packageId,
        eventDate: bid.rfp.eventDate,
        organisation: user.orgName || user.name,
        venue: bid.rfp.location || (bid.package.format === "VIRTUAL" ? "Online" : "To be confirmed"),
        audienceSize: bid.rfp.audienceSize,
        message: `From request “${bid.rfp.title}”: ${bid.rfp.description}`.slice(0, 2000),
        fee: bid.fee,
        commissionPct: visitCommissionPct,
        status: "ACCEPTED", // the author already agreed by bidding
        authorNote: bid.message.slice(0, 500),
      },
    });
    await tx.bid.update({ where: { id: bid.id }, data: { status: "ACCEPTED", bookingId: b.id } });
    await tx.bid.updateMany({ where: { id: { in: others.map((o) => o.id) } }, data: { status: "DECLINED" } });
    await tx.rfp.update({ where: { id: bid.rfpId }, data: { status: "AWARDED" } });
    return b;
  });
  await notify.bidDecided(bid.id);
  for (const o of others) await notify.bidDecided(o.id);
  await done(`Bid accepted — booking B-${booking.number} created. Pay to confirm the date.`);
  redirect("/dashboard/buyer/bookings");
}

export async function declineBid(fd: FormData) {
  const user = await requireUser("BUYER");
  const bid = await db.bid.findFirst({ where: { id: str(fd, "id"), status: "PENDING", rfp: { buyerId: user.id } } });
  if (!bid) return fail("Already decided");
  await db.bid.update({ where: { id: bid.id }, data: { status: "DECLINED" } });
  await notify.bidDecided(bid.id);
  await done("Bid declined");
}
