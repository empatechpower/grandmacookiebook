import { day, reseed } from "./helpers";
import { before, test } from "node:test";
import assert from "node:assert/strict";
import { db } from "../../src/lib/db";
import { searchAuthors } from "../../src/lib/directory";
import { dayKey } from "../../src/lib/dates";

before(reseed);
const names = async (f: Parameters<typeof searchAuthors>[0]) => (await searchAuthors(f)).map((a) => a.name).sort();

test("only approved, Stripe-ready authors are listed", async () => {
  const all = await names({});
  assert.equal(all.length, 8);
  assert.ok(!all.includes("New Voice Press"));
});

test("filters combine and hybrid counts as both formats", async () => {
  assert.deepEqual(await names({ topic: "sel" }), ["Jayme Branagh", "Jeanette Gil"]);
  assert.deepEqual(await names({ format: "VIRTUAL" }), ["Allie Davis", "Jayme Branagh", "Jeanette Gil"]);
  assert.deepEqual(await names({ topic: "sel", grade: "prek" }), ["Jeanette Gil"]);
  assert.deepEqual(await names({ budget: "500" }), ["Jeanette Gil", "Susan Friedland"]);
  assert.deepEqual(await names({ q: "ASTRONOMY" }), ["Allie Davis"], "search ignores case");
  assert.deepEqual(await names({ topic: "not-a-topic" }), (await names({})), "unknown filter values are ignored");
});

test("date filter needs an open day that isn't already booked", async () => {
  const jeanette = await db.user.findUniqueOrThrow({ where: { email: "jeanette@atelier.test" } });
  const open = await db.availableDate.findFirstOrThrow({ where: { authorId: jeanette.id, date: { gt: day(1) } }, orderBy: { date: "asc" } });
  assert.ok((await names({ date: dayKey(open.date) })).includes("Jeanette Gil"));
  const pkg = await db.visitPackage.findFirstOrThrow({ where: { authorId: jeanette.id } });
  const buyer = await db.user.findUniqueOrThrow({ where: { email: "buyer@atelier.test" } });
  await db.booking.create({
    data: { buyerId: buyer.id, authorId: jeanette.id, packageId: pkg.id, fee: 1, commissionPct: 15, status: "CONFIRMED", eventDate: open.date, organisation: "x", venue: "x", audienceSize: 1 },
  });
  assert.ok(!(await names({ date: dayKey(open.date) })).includes("Jeanette Gil"));
});

test("sorting by price and rating", async () => {
  const byPrice = await searchAuthors({ sort: "price-asc" });
  assert.equal(byPrice[0].name, "Susan Friedland");
  const byRating = await searchAuthors({ sort: "rating" });
  assert.equal(byRating[0].name, "Jeanette Gil");
});
