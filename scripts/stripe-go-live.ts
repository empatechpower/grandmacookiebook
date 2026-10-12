/**
 * Run once right after switching Stripe to live keys. Author accounts connected in test mode don't
 * exist in live mode, so their connection is cleared: their listings hide until they click
 * "Connect Stripe" again and add their real bank. Live accounts are left alone. Safe to re-run.
 *
 *   DATABASE_URL="<live db url>" STRIPE_SECRET_KEY="sk_live_…" npm run stripe-go-live
 */
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL to the live database URL");
  if (!/^(sk|rk)_live_/.test(key)) throw new Error("Set STRIPE_SECRET_KEY to the LIVE secret key (sk_live_…)");
  const stripe = new Stripe(key);
  const authors = await db.user.findMany({ where: { stripeAccountId: { not: null } }, select: { id: true, name: true, email: true, stripeAccountId: true } });
  let cleared = 0, kept = 0;
  for (const a of authors) {
    try {
      await stripe.accounts.retrieve(a.stripeAccountId!);
      kept++;
    } catch (e) {
      const err = e as { code?: string; statusCode?: number; type?: string };
      if (err.code === "resource_missing" || err.statusCode === 404 || err.type === "StripePermissionError") {
        await db.user.update({ where: { id: a.id }, data: { stripeAccountId: null, payoutsReady: false } });
        console.log(`Cleared test-mode connection: ${a.name} <${a.email}>`);
        cleared++;
      } else throw e;
    }
  }
  console.log(`\nDone — ${cleared} author(s) must reconnect Stripe; ${kept} already live.`);
}

main()
  .catch((e) => { console.error(`\n${e instanceof Error ? e.message : e}\n`); process.exitCode = 1; })
  .finally(() => db.$disconnect());
