import "server-only";
import { randomUUID } from "crypto";
import Stripe from "stripe";
import { CURRENCY } from "./money";
import { appUrl } from "./url";

/**
 * The only module that talks to Stripe.
 *
 * Model: "separate charges and transfers". The buyer pays the platform through
 * Stripe Checkout; once paid, each author's share is transferred to their
 * Connect account (tied to the charge via source_transaction). A cart can hold
 * books from several authors, which destination charges can't express.
 *
 * Without STRIPE_SECRET_KEY the app runs in demo mode: payments succeed
 * instantly and transfers get fake ids, so it's usable without a Stripe account.
 */
const key = process.env.STRIPE_SECRET_KEY;
export const stripe = key ? new Stripe(key) : null;
export const demoMode = !stripe;

const currency = CURRENCY.toLowerCase();
const mockId = (prefix: string) => `${prefix}_mock_${randomUUID().slice(0, 12)}`;

export type PaymentKind = "order" | "booking";
export type PaidPayment = { paymentIntentId: string; chargeId: string };

/** Starts a hosted Stripe Checkout and returns its URL. Not called in demo mode. */
export async function createCheckoutSession(opts: {
  kind: PaymentKind;
  id: string;
  email: string;
  lines: { name: string; unitAmount: number; qty: number }[];
  cancelPath: string;
}) {
  if (!stripe) throw new Error("Stripe is not configured");
  const base = await appUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: opts.email,
    line_items: opts.lines.map((l) => ({
      quantity: l.qty,
      price_data: { currency, unit_amount: l.unitAmount, product_data: { name: l.name } },
    })),
    payment_intent_data: { transfer_group: `${opts.kind}_${opts.id}`, metadata: { kind: opts.kind, id: opts.id } },
    metadata: { kind: opts.kind, id: opts.id },
    // 30 minutes is Stripe's minimum; unpaid orders release their stock when it expires.
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    success_url: `${base}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}${opts.cancelPath}`,
  });
  return { sessionId: session.id, url: session.url! };
}

/** Resolves a completed Checkout Session to what fulfilment needs, or null if unpaid. */
export async function readPaidSession(session: Stripe.Checkout.Session | string) {
  if (!stripe) return null;
  const s = typeof session === "string" ? await stripe.checkout.sessions.retrieve(session) : session;
  if (s.payment_status !== "paid" || !s.payment_intent || !s.metadata?.kind || !s.metadata.id) return null;
  const pi = await stripe.paymentIntents.retrieve(
    typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent.id,
  );
  const chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id;
  if (!chargeId) return null;
  return {
    kind: s.metadata.kind as PaymentKind,
    id: s.metadata.id,
    sessionId: s.id,
    payment: { paymentIntentId: pi.id, chargeId } satisfies PaidPayment,
  };
}

export const demoPayment = (): PaidPayment => ({ paymentIntentId: mockId("pi"), chargeId: mockId("ch") });

/**
 * Sends an author their share. The idempotency key makes webhook retries and
 * admin "retry" clicks safe: Stripe returns the original transfer instead of paying twice.
 */
export async function transferToAuthor(opts: {
  amount: number;
  destination: string;
  chargeId?: string; // omit for transfers funded from the platform balance (referral rewards)
  transferGroup: string;
  idempotencyKey: string;
}) {
  if (!stripe || opts.destination.startsWith("acct_mock")) return mockId("tr");
  const t = await stripe.transfers.create(
    {
      amount: opts.amount,
      currency,
      destination: opts.destination,
      // Ties the transfer to the charge, so it succeeds even before the charge's funds settle.
      ...(opts.chargeId ? { source_transaction: opts.chargeId } : {}),
      transfer_group: opts.transferGroup,
    },
    { idempotencyKey: opts.idempotencyKey },
  );
  return t.id;
}

export async function refundPayment(paymentIntentId: string, amount: number, idempotencyKey: string) {
  if (!stripe || paymentIntentId.includes("_mock_")) return;
  await stripe.refunds.create({ payment_intent: paymentIntentId, amount }, { idempotencyKey });
}

/** Pulls an author's share back after a refund. */
export async function reverseTransfer(transferId: string, amount: number, idempotencyKey: string) {
  if (!stripe || transferId.includes("_mock_")) return;
  await stripe.transfers.createReversal(transferId, { amount }, { idempotencyKey });
}

// ---------- Connect onboarding ----------

export async function createConnectedAccount(opts: { email: string; userId: string }) {
  if (!stripe) return mockId("acct");
  const account = await stripe.accounts.create({
    type: "express",
    email: opts.email,
    capabilities: { transfers: { requested: true } },
    metadata: { userId: opts.userId },
  });
  return account.id;
}

export async function onboardingLink(accountId: string) {
  if (!stripe) throw new Error("Stripe is not configured");
  const base = await appUrl();
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${base}/dashboard/author/payouts/connect`,
    return_url: `${base}/dashboard/author/payouts`,
  });
  return link.url;
}

/** Can this account receive transfers? */
export function accountIsReady(a: Stripe.Account) {
  return !!a.details_submitted && a.capabilities?.transfers === "active";
}

export async function fetchAccountReady(accountId: string) {
  if (!stripe || accountId.startsWith("acct_mock")) return true;
  return accountIsReady(await stripe.accounts.retrieve(accountId));
}

/** One-time link into the author's Stripe Express dashboard (balances, bank payouts). */
export async function expressDashboardLink(accountId: string) {
  if (!stripe || accountId.startsWith("acct_mock")) return null;
  return (await stripe.accounts.createLoginLink(accountId)).url;
}
