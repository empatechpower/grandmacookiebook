import "./helpers";
import { test } from "node:test";
import assert from "node:assert/strict";
import { money, net, toCents } from "../../src/lib/money";
import { unitPriceFor } from "../../src/lib/pricing";
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

test("classroom-set price applies only at the minimum quantity", () => {
  const book = { price: 1600, bulkMinQty: 25, bulkPrice: 1300 };
  assert.equal(unitPriceFor(book, 24), 1600);
  assert.equal(unitPriceFor(book, 25), 1300);
  assert.equal(unitPriceFor({ price: 1600, bulkMinQty: null, bulkPrice: null }, 100), 1600);
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
