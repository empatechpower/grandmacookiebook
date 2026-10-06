"use server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { done, fail, str } from "@/lib/actions";
import { getSettings } from "@/lib/settings";
import { linkReferredUser, payAllReferrers, payReferrer } from "@/lib/referrals";
import * as notify from "@/lib/notify";

const Schema = z.object({
  name: z.string().trim().min(2, "Enter the author's name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});

/** The referral form. First completed form for an email wins (enforced by a unique index). */
export async function submitReferral(fd: FormData) {
  const user = await requireUser("AUTHOR");
  const p = Schema.safeParse({ name: str(fd, "name"), email: str(fd, "email") });
  if (!p.success) return fail(p.error.issues[0].message);
  const { name, email } = p.data;
  if (email === user.email) return fail("You can't refer yourself");
  if (await db.user.findUnique({ where: { email } })) return fail("That person already has a South Texas Book & Author account");
  if (await db.referral.findUnique({ where: { referredEmail: email } })) return fail("Someone has already referred this person");
  const { referralPct, referralMonths } = await getSettings();
  const expiresAt = new Date();
  expiresAt.setUTCMonth(expiresAt.getUTCMonth() + referralMonths);
  const r = await db.referral.create({ data: { referrerId: user.id, referredEmail: email, referredName: name, pct: referralPct, expiresAt } });
  await notify.referralSubmitted(r.id);
  await done(`Referral sent — we've emailed ${name.split(" ")[0]} an invitation`);
}

export async function reviewReferral(fd: FormData) {
  await requireUser("ADMIN");
  const approve = str(fd, "decision") === "approve";
  const r = await db.referral.findUnique({ where: { id: str(fd, "id") } });
  if (!r || r.status !== "PENDING") return fail("Already reviewed");
  await db.referral.update({
    where: { id: r.id },
    data: { status: approve ? "APPROVED" : "REJECTED", adminNote: str(fd, "note") || null, reviewedAt: new Date() },
  });
  if (approve && !r.referredUserId) {
    const u = await db.user.findUnique({ where: { email: r.referredEmail } });
    if (u) await linkReferredUser(u);
  }
  await notify.referralReviewed(r.id);
  await done(approve ? "Referral verified" : "Referral rejected");
}

export async function payReferrerNow(fd: FormData) {
  await requireUser("ADMIN");
  try {
    const r = await payReferrer(str(fd, "referrerId"), str(fd, "manual") === "1");
    if (!r) return fail("Nothing owed");
    await done(r.method === "STRIPE" ? "Paid via Stripe" : "Recorded as a manual payout — send the money and keep a record");
  } catch (e) {
    return fail(`Stripe transfer failed: ${e instanceof Error ? e.message : e}`);
  }
}

export async function payAllReferralsNow() {
  await requireUser("ADMIN");
  const results = await payAllReferrers();
  const failed = results.filter((r) => !r.ok).length;
  await done(results.length ? `Paid ${results.length - failed} referrer(s)${failed ? `, ${failed} failed` : ""}` : "Nobody is owed anything");
}
