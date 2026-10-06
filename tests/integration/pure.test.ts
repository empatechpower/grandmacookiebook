import "./helpers";
import { test } from "node:test";
import assert from "node:assert/strict";
import { money, net, toCents } from "../../src/lib/money";
import { bulkDiscountPct, tiersLabel, unitPriceFor } from "../../src/lib/pricing";
import { isLateCancellation, fromDayKey, dayKey } from "../../src/lib/dates";
import { parseTags, serializeTags, hasTag } from "../../src/lib/tags";
import { TOPICS } from "../../src/lib/constants";
import { slugify } from "../../src/lib/content";

test("money formats cents and computes author share", () => {
  assert.equal(money(4750), "$47.50");
  assert.equal(money(30000), "$300");
  assert.equal(toCents("18.5"), 1850);
  assert.equal(net(5000, 5), 4750);
  assert.equal(net(30000, 15), 25500);
});

test("bulk tiers: 1–9 regular, 10–24 20% off, 25+ 30% off; products can opt out", () => {
  const tiers = { min1: 10, pct1: 20, min2: 25, pct2: 30 };
  const book = { price: 1600, bulkEnabled: true };
  assert.equal(unitPriceFor(book, 9, tiers), 1600);
  assert.equal(unitPriceFor(book, 10, tiers), 1280);
  assert.equal(unitPriceFor(book, 24, tiers), 1280);
  assert.equal(unitPriceFor(book, 25, tiers), 1120);
  assert.equal(bulkDiscountPct({ bulkEnabled: false }, 100, tiers), 0);
  assert.equal(unitPriceFor({ price: 1999, bulkEnabled: true }, 10, tiers), 1599, "rounds to the cent");
  assert.equal(tiersLabel(tiers), "10–24 copies: 20% off · 25+ copies: 30% off");
});

test("late cancellation is measured in whole days before the event", () => {
  const now = new Date("2026-10-01T15:00:00Z");
  assert.equal(isLateCancellation(fromDayKey("2026-10-08"), 7, now), false); // exactly 7 days: on time
  assert.equal(isLateCancellation(fromDayKey("2026-10-07"), 7, now), true);
  assert.equal(isLateCancellation(fromDayKey("2026-10-02"), 0, now), false);
  assert.equal(dayKey(fromDayKey("2026-02-28")), "2026-02-28");
});

test("tags only keep allowed values and match exactly", () => {
  const s = serializeTags(["sel", "stem", "sel", "hacker"], TOPICS);
  assert.equal(s, ",sel,stem,");
  assert.deepEqual(parseTags(s), ["sel", "stem"]);
  assert.deepEqual(hasTag("sel"), { contains: ",sel," });
  assert.equal(serializeTags([], TOPICS), "");
});

test("slugify makes safe web addresses", () => {
  assert.equal(slugify("  Educator's Favorites: Octóber 2026! "), "educator-s-favorites-october-2026");
});
