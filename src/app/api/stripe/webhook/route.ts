import type Stripe from "stripe";
import { db } from "@/lib/db";
import { accountIsReady, readPaidSession, stripe } from "@/lib/payments";
import { expireOrder, fulfillBooking, fulfillOrder } from "@/lib/fulfillment";

/**
 * Stripe webhook — the source of truth for payments.
 * Subscribe to: checkout.session.completed, checkout.session.async_payment_succeeded,
 * checkout.session.expired, account.updated (the last one on "Connected accounts").
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return new Response("Stripe not configured", { status: 503 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const paid = await readPaidSession(event.data.object);
      if (paid?.kind === "order") await fulfillOrder(paid.id, paid.payment, paid.sessionId);
      if (paid?.kind === "booking") await fulfillBooking(paid.id, paid.payment, paid.sessionId);
      break;
    }
    case "checkout.session.expired": {
      const s = event.data.object;
      if (s.metadata?.kind === "order" && s.metadata.id) await expireOrder(s.metadata.id);
      break;
    }
    case "account.updated": {
      const a = event.data.object;
      await db.user.updateMany({ where: { stripeAccountId: a.id }, data: { payoutsReady: accountIsReady(a) } });
      break;
    }
  }
  return new Response("ok");
}
