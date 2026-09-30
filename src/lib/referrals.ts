import "server-only";
import { db } from "./db";
import { transferToAuthor } from "./payments";
import { referralPaid } from "./notify";

/**
 * Referral program, modelled on bookanauthor.com/referral: a referrer earns a percentage
 * (default 2%) of every sale made by an author they referred, for a window (default 12 months)
 * from the referral date. Earnings accrue when a sale's payment is released to the author,
 * so refunded sales never earn; rewards are paid out in batches (quarterly by default).
 */

/** Only active authors with at least one live listing earn rewards (as on the reference site). */
export async function isEligibleReferrer(userId: string) {
  const u = await db.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      status: true,
      _count: { select: { books: { where: { status: "APPROVED" } }, packages: { where: { status: "APPROVED" } } } },
    },
  });
  return !!u && u.role === "AUTHOR" && u.status === "ACTIVE" && u._count.books + u._count.packages > 0;
}

/** Connects a new author account to a referral submitted for their email. */
export async function linkReferredUser(user: { id: string; email: string }) {
  await db.referral.updateMany({ where: { referredEmail: user.email.toLowerCase(), referredUserId: null }, data: { referredUserId: user.id } });
}

/** Records the referrer's reward for a released sale. Idempotent per sale. */
export async function accrueReferral(kind: "item" | "booking", sourceId: string) {
  const sale =
    kind === "item"
      ? await db.orderItem.findUnique({ where: { id: sourceId }, select: { authorId: true, unitPrice: true, qty: true } })
      : await db.booking.findUnique({ where: { id: sourceId }, select: { authorId: true, fee: true } });
  if (!sale) return;
  const referral = await db.referral.findFirst({
    where: { referredUserId: sale.authorId, status: "APPROVED", expiresAt: { gt: new Date() } },
  });
  if (!referral || !(await isEligibleReferrer(referral.referrerId))) return;
  const saleAmount = "fee" in sale ? sale.fee : sale.unitPrice * sale.qty;
  const amount = Math.round((saleAmount * referral.pct) / 100);
  if (amount < 1) return;
  await db.referralEarning.createMany({
    data: [{ referralId: referral.id, sourceKind: kind, sourceId, saleAmount, amount }],
    skipDuplicates: true,
  });
}

/** A sale refunded after release no longer earns a reward (if it hasn't been paid out yet). */
export async function voidReferralEarning(kind: "item" | "booking", sourceId: string) {
  await db.referralEarning.deleteMany({ where: { sourceKind: kind, sourceId, payoutId: null } });
}

export async function unpaidBalance(referrerId: string) {
  const agg = await db.referralEarning.aggregate({ where: { payoutId: null, referral: { referrerId } }, _sum: { amount: true } });
  return agg._sum.amount ?? 0;
}

/**
 * Pays a referrer everything they're owed: a Stripe transfer from the platform balance if they
 * have a connected account, otherwise it's recorded as a manual payout for the admin to send.
 */
export async function payReferrer(referrerId: string, forceManual = false) {
  const earnings = await db.referralEarning.findMany({ where: { payoutId: null, referral: { referrerId } } });
  const amount = earnings.reduce((s, e) => s + e.amount, 0);
  if (amount < 1) return null;
  const user = await db.user.findUniqueOrThrow({ where: { id: referrerId } });
  const payout = await db.referralPayout.create({ data: { referrerId, amount, method: "MANUAL" } });
  let transferId: string | null = null;
  if (!forceManual && user.stripeAccountId && user.payoutsReady) {
    try {
      transferId = await transferToAuthor({
        amount,
        destination: user.stripeAccountId,
        transferGroup: `referral_${payout.id}`,
        idempotencyKey: `referral_payout_${payout.id}`,
      });
    } catch (e) {
      await db.referralPayout.delete({ where: { id: payout.id } });
      throw e;
    }
  }
  await db.$transaction([
    db.referralPayout.update({ where: { id: payout.id }, data: { method: transferId ? "STRIPE" : "MANUAL", transferId } }),
    db.referralEarning.updateMany({ where: { id: { in: earnings.map((e) => e.id) } }, data: { payoutId: payout.id } }),
  ]);
  const method = transferId ? "STRIPE" : "MANUAL";
  await referralPaid(referrerId, amount, method);
  return { payoutId: payout.id, amount, method };
}

/** Pays every referrer with a balance. Run quarterly (cron) or from the admin page. */
export async function payAllReferrers() {
  const owed = await db.referralEarning.groupBy({ by: ["referralId"], where: { payoutId: null } });
  const referrerIds = new Set(
    (await db.referral.findMany({ where: { id: { in: owed.map((o) => o.referralId) } }, select: { referrerId: true } })).map((r) => r.referrerId),
  );
  const results: { referrerId: string; ok: boolean; amount?: number; error?: string }[] = [];
  for (const id of referrerIds) {
    try {
      const r = await payReferrer(id);
      if (r) results.push({ referrerId: id, ok: true, amount: r.amount });
    } catch (e) {
      results.push({ referrerId: id, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return results;
}
