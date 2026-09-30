import type Stripe from "stripe";
import { db } from "@/lib/db";
import { accountIsReady, readPaidSession, stripe } from "@/lib/payments";
import { expireOrder, fulfillBooking, fulfillOrder } from "@/lib/fulfillment";

/**
 * Stripe webhook — the source of truth for payments. Stripe needs two endpoints at this URL:
 *  - "Your account" events (STRIPE_WEBHOOK_SECRET): checkout.session.completed,
 *    checkout.session.async_payment_succeeded, checkout.session.expired
 *  - "Connected accounts" events (STRIPE_CONNECT_WEBHOOK_SECRET): account.updated
 * Each endpoint has its own signing secret, so a request is accepted if either verifies.
 */
export async function POST(req: Request) {
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter(Boolean) as string[];
  if (!stripe || !secrets.length) return new Response("Stripe not configured", { status: 503 });

  const body = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";
  let event: Stripe.Event | null = null;
  for (const secret of secrets) {
    try {
      event = stripe.webhooks.constructEvent(body, signature, secret);
      break;
    } catch {
      // try the next endpoint's secret
    }
  }
  if (!event) return new Response("Invalid signature", { status: 400 });

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
