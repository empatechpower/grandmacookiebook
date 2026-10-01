// Run via `npm run test:e2e` (scripts/e2e.sh), which builds, starts the app and reseeds before each suite.
import { chromium } from "playwright-core";
import { createRequire } from "module";
import { readFileSync } from "fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
const B = process.env.BASE_URL ?? "http://localhost:3917", S = process.env.E2E_ARTIFACTS ?? "tests/e2e/.artifacts";
const CRON = process.env.CRON_SECRET;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const errors = [];
const ctx = async () => { const p = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); p.on("pageerror", e => errors.push(e.message)); p.on("dialog", d => d.accept()); return p; };
const login = async (p, email) => { await p.goto(B + "/login"); await p.fill("#email", email); await p.fill("#password", "atelier123"); await p.click("button[type=submit]"); await p.waitForURL("**/dashboard/**"); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const text = (p) => p.locator("body").innerText();

// --- Organisation profiles
const nb = await ctx();
await nb.goto(B + "/signup");
await nb.fill("#name", "Lib Rarian"); await nb.fill("#email", `lib${Date.now()}@x.test`); await nb.fill("#password", "password123");
await nb.selectOption("#orgType", "LIBRARY"); await nb.fill("#orgName", "Rivers State Library");
await nb.click("button[type=submit]"); await nb.waitForURL("**/dashboard/buyer");
await nb.goto(B + "/dashboard/buyer/profile");
ok((await nb.locator("#orgType").inputValue()) === "LIBRARY" && (await nb.locator("#orgName").inputValue()) === "Rivers State Library", "buyer signs up with organisation type and name");
await nb.goto(B + "/authors"); await nb.locator(".author-card", { hasText: "Mike" }).locator("h3 a").click(); await nb.waitForURL("**/authors/**");
await nb.getByRole("link", { name: "Request booking" }).first().click(); await nb.waitForURL("**/visits/**");
ok((await nb.locator("#organisation").inputValue()) === "Rivers State Library", "booking form prefilled with organisation");

// --- Ratings in public
const anon = await ctx();
await anon.goto(B + "/authors?sort=rating");
ok((await anon.locator(".author-card h3").first().innerText()) === "Jeanette Gil", "Top rated sort puts Jeanette (5.0 × 2) first");
ok((await anon.locator(".author-card", { hasText: "Marcus Bell" }).innerText()).includes("4.5"), "Chike's card shows 4.5 rating");
const chikeUrl = await anon.locator(".author-card", { hasText: "Marcus" }).locator("h3 a").getAttribute("href");
await anon.goto(B + chikeUrl); const prof = await text(anon);
ok(prof.includes("spellbound") && prof.includes("Marcus’s reply") && prof.includes("St. Cloud Elementary · School"), "profile shows reviews, org and author reply");
await anon.screenshot({ path: `${S}/17-reviews.png`, fullPage: true });

// --- Review flow (fixture: completed visit with Mike, not yet reviewed)
const buyerU = await db.user.findUniqueOrThrow({ where: { email: "buyer@atelier.test" } });
const mike = await db.user.findUniqueOrThrow({ where: { email: "mike@atelier.test" } });
const mpkg = await db.visitPackage.findFirstOrThrow({ where: { authorId: mike.id } });
const past = await db.booking.create({ data: { buyerId: buyerU.id, authorId: mike.id, packageId: mpkg.id, fee: 78000, commissionPct: 15, status: "COMPLETED",
  eventDate: new Date(Date.now() - 5 * 864e5), organisation: "Oxbridge Preschool", venue: "Hall", audienceSize: 40, paymentRef: "pi_mock_rv", chargeId: "ch_mock_rv", transferId: "tr_mock_rv" } });
const buyer = await ctx(); await login(buyer, "buyer@atelier.test");
await buyer.goto(B + "/dashboard/buyer/bookings");
const prow = buyer.locator("tr", { hasText: `B-${past.number}` });
await prow.getByRole("link", { name: "★ Review" }).click(); await buyer.waitForURL("**/review?booking=**");
await buyer.locator(".star-input label", { hasText: "3 stars" }).click();
await buyer.fill("#body", "Fun night, but started 20 minutes late.");
await buyer.getByRole("button", { name: "Post review" }).click(); await buyer.waitForURL("**/dashboard/buyer/bookings");
ok((await buyer.locator("tr", { hasText: `B-${past.number}` }).getByRole("link", { name: "★ Review" }).count()) === 0, "review button disappears after reviewing");
const mikeRow = await db.user.findUnique({ where: { id: mike.id } });
ok(mikeRow.ratingAvg === 4 && mikeRow.ratingCount === 2, `Mike's rating recalculated to 4.0 (2): got ${mikeRow.ratingAvg} (${mikeRow.ratingCount})`);
await buyer.goto(B + `/dashboard/buyer/review?booking=${past.id}`);
ok((await text(buyer)).includes("already been reviewed"), "can't review the same visit twice");

// Author replies
const m = await ctx(); await login(m, "mike@atelier.test");
await m.goto(B + "/dashboard/author/reviews");
const rv = m.locator(".review", { hasText: "20 minutes late" });
await rv.locator("input[name=reply]").fill("Sorry about the delay — traffic on Aba Road!"); await rv.getByRole("button", { name: "Reply" }).click();
await m.getByText("Reply posted").waitFor();
await anon.goto(B + "/authors/" + mike.id);
ok((await text(anon)).includes("traffic on Aba Road"), "author reply visible publicly");

// Admin hides it -> rating recalculated, hidden publicly
const admin = await ctx(); await login(admin, "admin@atelier.test");
await admin.goto(B + "/dashboard/admin/reviews");
await admin.locator("tr", { hasText: "20 minutes late" }).getByRole("button", { name: "Hide" }).click();
await admin.locator("tr", { hasText: "20 minutes late" }).getByRole("button", { name: "Restore" }).waitFor();
await anon.goto(B + "/authors/" + mike.id);
ok(!(await text(anon)).includes("20 minutes late"), "hidden review removed from profile");
ok((await db.user.findUnique({ where: { id: mike.id } })).ratingAvg === 5, "hidden review excluded from rating");

// --- Report a problem (book line) pauses release, admin refunds
await buyer.goto(B + "/dashboard/buyer/orders");
const line = buyer.locator("tr", { hasText: "Night Sky Notes" });
await line.getByRole("link", { name: "Report a problem" }).click(); await buyer.waitForURL("**/report?item=**");
await buyer.locator("label", { hasText: "arrived damaged" }).click();
await buyer.fill("#details", "Half the copies have water damage on the covers.");
await buyer.getByRole("button", { name: "Report problem" }).click(); await buyer.waitForURL("**/dashboard/buyer/orders");
const line2 = buyer.locator("tr", { hasText: "Night Sky Notes" });
ok((await line2.innerText()).includes("Problem reported") && (await line2.getByRole("button", { name: "Mark received" }).count()) === 0, "problem badge shown; confirm button hidden");
const nsItem = await db.orderItem.findFirstOrThrow({ where: { title: "Night Sky Notes" } });
await db.orderItem.update({ where: { id: nsItem.id }, data: { releaseAt: new Date(Date.now() - 864e5) } });
await fetch(B + "/api/cron/release-payouts", { headers: { authorization: `Bearer ${CRON}` } });
ok(!(await db.orderItem.findUnique({ where: { id: nsItem.id } })).transferId, "open report blocks automatic release");
await admin.goto(B + "/dashboard/admin");
ok((await text(admin)).toLowerCase().includes("problem report(s)"), "admin overview flags open reports");
await admin.goto(B + "/dashboard/admin/issues");
await admin.screenshot({ path: `${S}/18-issues.png`, fullPage: true });
const irow = admin.locator("tr", { hasText: "water damage" });
await irow.locator("input[name=note]").fill("Refunded — sorry about the damaged copies.");
await irow.getByRole("button", { name: "Refund buyer" }).click();
await admin.locator("tr", { hasText: "water damage" }).waitFor({ state: "detached" });
ok((await db.orderItem.findUnique({ where: { id: nsItem.id } })).status === "REFUNDED", "admin refund resolves report and refunds line");

// Seeded report on O-2204 -> release to author
await admin.goto(B + "/dashboard/admin/issues");
await admin.locator("tr", { hasText: "No tracking number" }).getByRole("button", { name: "Release to author" }).click();
await admin.locator("tr", { hasText: "No tracking number" }).waitFor({ state: "detached" });
const i2204 = await db.orderItem.findFirstOrThrow({ where: { order: { number: 2204 } } });
ok(!!i2204.transferId, "rejecting a report releases payment to the author");

// Booking report
const sch = await ctx(); await login(sch, "school@atelier.test");
await sch.goto(B + "/dashboard/buyer/bookings");
await sch.locator("tr", { hasText: "B-1041" }).getByRole("link", { name: "Report a problem" }).click(); await sch.waitForURL("**/report?booking=**");
await sch.locator("label", { hasText: "wasn't as agreed" }).click(); await sch.fill("#details", "The author asked to change the date twice.");
await sch.getByRole("button", { name: "Report problem" }).click(); await sch.waitForURL("**/dashboard/buyer/bookings");
ok((await sch.locator("tr", { hasText: "B-1041" }).innerText()).includes("Problem reported"), "booking report filed");
const jeanette = await ctx(); await login(jeanette, "jeanette@atelier.test");
await jeanette.goto(B + "/dashboard/author/requests");
ok((await jeanette.locator("tr", { hasText: "B-1041" }).innerText()).includes("Problem reported"), "author sees payment paused on the booking");

// --- Contracts
await buyer.goto(B + "/dashboard/buyer/bookings");
const b42 = buyer.locator("tr", { hasText: "B-1042" });
await b42.locator("summary", { hasText: "Attach contract" }).click();
await b42.locator("input[name=contract]").setInputFiles(`${S}/fake.png`); await b42.getByRole("button", { name: "Attach" }).click();
await buyer.locator(".toast.on").waitFor(); ok((await buyer.locator(".toast").innerText()).includes("PDF"), "non-PDF contract rejected");
await buyer.goto(B + "/dashboard/buyer/bookings");
const b42b = buyer.locator("tr", { hasText: "B-1042" });
await b42b.locator("summary", { hasText: "Attach contract" }).click();
await b42b.locator("input[name=contract]").setInputFiles(`${S}/contract.pdf`); await b42b.getByRole("button", { name: "Attach" }).click();
await buyer.locator("tr", { hasText: "B-1042" }).getByText("contract.pdf").waitFor();
ok(true, "buyer attached PDF contract");
const bk = await db.booking.findFirstOrThrow({ where: { number: 1042 } });
const au = await ctx(); await login(au, "author@atelier.test");
await au.goto(B + "/dashboard/author/requests");
ok((await au.locator("tr", { hasText: "B-1042" }).innerText()).includes("contract.pdf"), "author sees the contract");
const dl = await au.request.get(B + `/api/contracts/${bk.id}`);
ok(dl.status() === 200 && dl.headers()["content-type"] === "application/pdf" && (await dl.body()).toString().startsWith("%PDF"), "author can download contract");
ok((await fetch(B + `/api/contracts/${bk.id}`)).status === 401, "anonymous download blocked");
ok((await sch.request.get(B + `/api/contracts/${bk.id}`)).status() === 404, "other buyers can't download it");
const sc = await anon.goto(B + "/resources/sample-contract");
ok(sc.status() === 200 && (await text(anon)).includes("Author Visit Agreement"), "sample contract page loads");

await sleep(800);
const log = readFileSync(process.env.SERVER_LOG ?? `${S}/server.log`, "utf8");
ok(/to=mike@atelier\.test subject="New 3★ review/.test(log), "email: author notified of review");
ok(/to=admin@atelier\.test subject="Problem reported: /.test(log), "email: admins notified of problem");
ok(/subject="Your problem report: refund issued"/.test(log), "email: buyer told about refund");
ok(/to=author@atelier\.test subject="Contract attached to booking B-1042"/.test(log), "email: other side notified of contract");
ok(errors.length === 0, "no page errors" + (errors.length ? ": " + errors[0] : ""));
await browser.close(); await db.$disconnect();
