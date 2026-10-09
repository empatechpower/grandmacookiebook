import { reseed } from "./helpers";
import { before, test } from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";

// Stripe mode for this file only (each test file runs in its own process).
process.env.STRIPE_SECRET_KEY = "sk_test_integration";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_account";
process.env.STRIPE_CONNECT_WEBHOOK_SECRET = "whsec_connect";
process.env.CRON_SECRET = "cron_test_secret";

// Imported after the env above is set, because payments.ts reads the Stripe key at load time.
let db: typeof import("../../src/lib/db").db;
let webhook: typeof import("../../src/app/api/stripe/webhook/route");
let releaseCron: typeof import("../../src/app/api/cron/release-payouts/route");
let referralCron: typeof import("../../src/app/api/cron/referral-payouts/route");
const stripe = new Stripe("sk_test_integration");

before(async () => {
  reseed();
  ({ db } = await import("../../src/lib/db"));
  webhook = await import("../../src/app/api/stripe/webhook/route");
  releaseCron = await import("../../src/app/api/cron/release-payouts/route");
  referralCron = await import("../../src/app/api/cron/referral-payouts/route");
});

const signed = (obj: object, secret: string | null) => {
  const payload = JSON.stringify(obj);
  const sig = secret ? stripe.webhooks.generateTestHeaderString({ payload, secret }) : "t=1,v1=forged";
  return webhook.POST(new Request("http://x/api/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": sig } }));
};
const event = (type: string, object: object) => ({ id: "evt_" + Math.random(), object: "event", type, data: { object } });

test("webhook rejects forged signatures", async () => {
  assert.equal((await signed(event("account.updated", { id: "acct_x" }), null)).status, 400);
});

test("account.updated (connect secret) toggles whether an author can be paid", async () => {
  const mike = await db.user.update({ where: { email: "mike@atelier.test" }, data: { stripeAccountId: "acct_it", payoutsReady: false } });
  assert.equal((await signed(event("account.updated", { id: "acct_it", object: "account", details_submitted: true, capabilities: { transfers: "active" } }), "whsec_connect")).status, 200);
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: mike.id } })).payoutsReady, true);
  await signed(event("account.updated", { id: "acct_it", object: "account", details_submitted: true, capabilities: { transfers: "inactive" } }), "whsec_account");
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: mike.id } })).payoutsReady, false);
});

test("checkout.session.expired cancels the unpaid order and restocks, even when replayed", async () => {
  const buyer = await db.user.findUniqueOrThrow({ where: { email: "buyer@atelier.test" } });
  const book = await db.book.findFirstOrThrow({ where: { title: "Word Play Lab" } });
  const stock = book.stock;
  await db.book.update({ where: { id: book.id }, data: { stock: { decrement: 2 } } });
  const order = await db.order.create({
    data: { buyerId: buyer.id, total: book.price * 2, shippingAddress: "x", items: { create: [{ bookId: book.id, authorId: book.authorId, title: book.title, unitPrice: book.price, qty: 2, commissionPct: 5 }] } },
  });
  const ev = event("checkout.session.expired", { id: "cs_it", object: "checkout.session", metadata: { kind: "order", id: order.id } });
  await signed(ev, "whsec_account");
  await signed(ev, "whsec_account");
  assert.equal((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status, "CANCELLED");
  assert.equal((await db.book.findUniqueOrThrow({ where: { id: book.id } })).stock, stock);
});

test("scheduled jobs require the cron secret", async () => {
  for (const route of [releaseCron, referralCron]) {
    assert.equal((await route.GET(new Request("http://x"))).status, 401);
    const ok = await route.GET(new Request("http://x", { headers: { authorization: "Bearer cron_test_secret" } }));
    assert.equal(ok.status, 200);
  }
});

test("Continue with Google signs in to the linked account, or links a matching verified email", async () => {
  const { findUserForGoogle } = await import("../../src/lib/google");
  const jeanette = await db.user.findUniqueOrThrow({ where: { email: "jeanette@atelier.test" } });
  const first = await findUserForGoogle({ sub: "google-123", email: "jeanette@atelier.test", name: "Jeanette Gil" });
  assert.equal(first?.id, jeanette.id, "same email → same account");
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: jeanette.id } })).googleId, "google-123", "and it's now linked");
  const again = await findUserForGoogle({ sub: "google-123", email: "renamed@example.com", name: "Jeanette" });
  assert.equal(again?.id, jeanette.id, "the link holds even if the Google email changes");
  assert.equal(await findUserForGoogle({ sub: "google-999", email: "jeanette@atelier.test", name: "x" }), null, "a different Google account can't take over a linked email");
  assert.equal(await findUserForGoogle({ sub: "google-new", email: "brand-new@example.com", name: "New" }), null, "unknown email → new sign-up");
});
