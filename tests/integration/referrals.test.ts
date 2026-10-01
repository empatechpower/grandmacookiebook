import { reseed } from "./helpers";
import { before, test } from "node:test";
import assert from "node:assert/strict";
import { db } from "../../src/lib/db";
import { accrueReferral, isEligibleReferrer, payReferrer, unpaidBalance, voidReferralEarning } from "../../src/lib/referrals";

before(reseed);

async function referredSale() {
  // Seed: Jeanette referred Mike (approved). Make a released booking for Mike.
  const mike = await db.user.findUniqueOrThrow({ where: { email: "mike@atelier.test" } });
  const buyer = await db.user.findUniqueOrThrow({ where: { email: "buyer@atelier.test" } });
  const pkg = await db.visitPackage.findFirstOrThrow({ where: { authorId: mike.id } });
  return db.booking.create({
    data: {
      buyerId: buyer.id, authorId: mike.id, packageId: pkg.id, fee: 100000, commissionPct: 15, status: "COMPLETED",
      eventDate: new Date(), organisation: "Test", venue: "Hall", audienceSize: 10, paymentRef: "pi_mock_t", chargeId: "ch_mock_t", transferId: "tr_mock_t",
    },
  });
}

test("only active authors with a live listing earn rewards", async () => {
  const jeanette = await db.user.findUniqueOrThrow({ where: { email: "jeanette@atelier.test" } });
  const buyer = await db.user.findUniqueOrThrow({ where: { email: "buyer@atelier.test" } });
  const pending = await db.user.findUniqueOrThrow({ where: { email: "newvoice@atelier.test" } });
  assert.equal(await isEligibleReferrer(jeanette.id), true);
  assert.equal(await isEligibleReferrer(buyer.id), false);
  assert.equal(await isEligibleReferrer(pending.id), false);
});

test("a referred author's released sale earns the referrer 2%, once", async () => {
  const sale = await referredSale();
  await accrueReferral("booking", sale.id);
  await accrueReferral("booking", sale.id);
  const earnings = await db.referralEarning.findMany({ where: { sourceId: sale.id } });
  assert.equal(earnings.length, 1);
  assert.equal(earnings[0].amount, 2000);
});

test("expired referrals stop earning", async () => {
  await db.referral.updateMany({ where: { referredEmail: "mike@atelier.test" }, data: { expiresAt: new Date(Date.now() - 1000) } });
  const sale = await referredSale();
  await accrueReferral("booking", sale.id);
  assert.equal(await db.referralEarning.count({ where: { sourceId: sale.id } }), 0);
  await db.referral.updateMany({ where: { referredEmail: "mike@atelier.test" }, data: { expiresAt: new Date(Date.now() + 864e5) } });
});

test("refunds void unpaid rewards; payouts collect everything owed", async () => {
  const jeanette = await db.user.findUniqueOrThrow({ where: { email: "jeanette@atelier.test" } });
  const sale = await referredSale();
  await accrueReferral("booking", sale.id);
  const owedBefore = await unpaidBalance(jeanette.id);
  await voidReferralEarning("booking", sale.id);
  assert.equal(await unpaidBalance(jeanette.id), owedBefore - 2000);
  const r = await payReferrer(jeanette.id);
  assert.equal(r?.amount, owedBefore - 2000);
  assert.equal(r?.method, "STRIPE"); // seeded authors have (mock) connected accounts
  assert.equal(await unpaidBalance(jeanette.id), 0);
  assert.equal(await payReferrer(jeanette.id), null, "nothing left to pay");
});
