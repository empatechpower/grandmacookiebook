// Run via `npm run test:e2e` (scripts/e2e.sh), which builds, starts the app and reseeds before each suite.
import { chromium } from "playwright-core";
import { createRequire } from "module";
import { readFileSync } from "fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
const B = process.env.BASE_URL ?? "http://localhost:3917", S = process.env.E2E_ARTIFACTS ?? "tests/e2e/.artifacts";
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const errors = [];
const ctx = async () => { const p = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); p.on("pageerror", e => errors.push(e.message)); p.on("dialog", d => d.accept()); return p; };
const login = async (p, email) => { await p.goto(B + "/login"); await p.fill("#email", email); await p.fill("#password", "atelier123"); await p.click("button[type=submit]"); await p.waitForURL("**/dashboard/**"); };
const text = (p) => p.locator("body").innerText();
const sees = async (p, t) => { try { await p.locator(".toast.on", { hasText: t }).waitFor({ timeout: 8000 }); return true; } catch { return false; } };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

// Brand + public pages
const anon = await ctx();
await anon.goto(B);
ok((await anon.title()).includes("Grandma Cookie Book") && (await anon.locator(".mark b").innerText()) === "Grandma Cookie Book", "brand renamed in title and header");
ok(!(await text(anon)).includes("Atelier"), "no leftover 'Atelier' on home");
ok((await anon.locator(".stats b").count()) === 4 && (await anon.locator(".quote").count()) > 0 && (await anon.locator(".collection-card").count()) === 2, "home shows stats, testimonials, featured collections");
for (const path of ["/for-schools", "/for-business", "/for-authors", "/book-fairs", "/book-bank", "/collections", "/news", "/resources", "/events", "/events/literacy-week", "/resources/author-visit-checklist", "/collections/featured-author-catalog"]) {
  const r = await anon.goto(B + path); ok(r.status() === 200, `${path} loads`);
}
await anon.goto(B + "/collections/featured-author-catalog");
ok((await anon.locator(".author-card").count()) === 4 && (await text(anon)).includes("Perfect for K–2"), "collection shows curated authors with notes");
await anon.goto(B + "/resources/author-visit-checklist");
ok((await anon.locator(".article-body h2").count()) >= 2 && (await anon.locator(".article-body li").count()) >= 5, "article body renders headings and bullets");
await anon.goto(B + "/collections/does-not-exist"); ok((await text(anon)).includes("isn’t on the shelf"), "unknown collection 404s");

// Book fair form -> admin inbox
await anon.goto(B + "/book-fairs");
await anon.fill("#bookfair-name", "Grace Eze"); await anon.fill("#bookfair-email", "grace@school.test"); await anon.fill("#bookfair-org", "Sunrise Primary");
await anon.fill("#bookfair-dates", "12–16 Nov"); await anon.getByRole("button", { name: "Request a book fair" }).click(); await anon.waitForURL("**/book-fairs?sent=1");
ok((await db.contactMessage.count({ where: { topic: "Book fair request", body: { contains: "Sunrise Primary" } } })) === 1, "book fair request lands in admin inbox");

// Bulk pricing
const buyer = await ctx(); await login(buyer, "buyer@atelier.test");
await buyer.goto(B + "/books?q=Empathy"); await buyer.locator(".card").first().getByRole("link").first().click(); await buyer.waitForURL("**/books/**");
ok((await text(buyer)).includes("$13 per copy when you order 25"), "book page shows classroom-set price");
await buyer.fill("input[name=qty]", "30"); await buyer.click("text=Add to cart"); await buyer.waitForURL("**/cart");
ok((await text(buyer)).includes("$390"), "cart applies $13 × 30 = $390");
await buyer.fill("#address", "1 Test Road"); await buyer.getByRole("button", { name: /Pay \$390/ }).click(); await buyer.waitForURL("**/dashboard/buyer/orders");
ok((await db.orderItem.findFirst({ where: { title: "The Empathy Effect", qty: 30 } }))?.unitPrice === 1300, "order line snapshots the bulk price");

// RFP: buyer posts, author bids, buyer accepts -> booking
await buyer.goto(B + "/dashboard/buyer/requests/new");
await buyer.fill("#title", "Keynote for staff wellbeing day"); await buyer.fill("#description", "A 45 minute keynote on joy and resilience for 80 teachers, followed by Q&A.");
await buyer.fill("#audience", "Teaching staff"); await buyer.fill("#audienceSize", "80"); await buyer.fill("#eventDate", day(50)); await buyer.fill("#deadline", day(10));
await buyer.selectOption("#grade", "adult"); await buyer.fill("#budgetMax", "2000");
await buyer.getByRole("button", { name: "Post request" }).click(); await buyer.waitForURL("**/dashboard/buyer/requests/c*");
ok(await sees(buyer, "matching author"), "request posted and matching authors invited");
await sleep(600);
const log = () => readFileSync(process.env.SERVER_LOG ?? `${S}/server.log`, "utf8");
ok(/to=meena@atelier\.test subject="New request: Keynote for staff wellbeing day"/.test(log()), "adult-audience author emailed");
ok(!/to=susan@atelier\.test subject="New request: Keynote for staff wellbeing day"/.test(log()), "non-matching author not emailed");
const rfpUrl = buyer.url();
const meena = await ctx(); await login(meena, "meena@atelier.test");
await meena.goto(B + "/dashboard/author/opportunities");
await meena.getByRole("link", { name: "Keynote for staff wellbeing day" }).click(); await meena.waitForURL("**/opportunities/**");
await meena.fill("#fee", "1650"); await meena.fill("#message", "I'll tailor my joy-at-work keynote to the realities of teaching, with practical tools for the term.");
await meena.getByRole("button", { name: "Send bid" }).click(); ok(await sees(meena, "Bid sent"), "author sent a bid");
await meena.fill("#fee", "1600"); await meena.getByRole("button", { name: "Update bid" }).click(); ok(await sees(meena, "Bid updated"), "author updated bid");
await buyer.goto(rfpUrl);
ok((await text(buyer)).includes("$1,600") && (await text(buyer)).includes("Meena Julapalli"), "buyer sees the bid");
await buyer.getByRole("button", { name: "Accept bid" }).click(); await buyer.waitForURL("**/dashboard/buyer/bookings");
const bk = await db.booking.findFirst({ where: { fee: 160000, status: "ACCEPTED" }, include: { author: true } });
ok(bk?.author.email === "meena@atelier.test", "accepted bid became an accepted booking at the bid price");
ok((await db.rfp.findFirst({ where: { title: "Keynote for staff wellbeing day" } })).status === "AWARDED", "request marked awarded");

// Late-cancellation guarantee: confirmed booking 3 days out -> no refund, author paid
const jeanette = await db.user.findUniqueOrThrow({ where: { email: "jeanette@atelier.test" } });
const pkg = await db.visitPackage.findFirstOrThrow({ where: { authorId: jeanette.id } });
const buyerU = await db.user.findUniqueOrThrow({ where: { email: "buyer@atelier.test" } });
const mk = (days, org) => db.booking.create({ data: { buyerId: buyerU.id, authorId: jeanette.id, packageId: pkg.id, fee: 42000, commissionPct: 15, status: "CONFIRMED",
  eventDate: new Date(day(days) + "T00:00:00.000Z"), organisation: org, venue: "Hall", audienceSize: 30, paymentRef: `pi_mock_${org}`, chargeId: `ch_mock_${org}`, releaseAt: new Date(Date.now() + 30 * 864e5) } });
const late = await mk(3, "LateSchool"), early = await mk(30, "EarlySchool");
await buyer.goto(B + "/dashboard/buyer/bookings");
await buyer.locator("tr", { hasText: "LateSchool" }).getByRole("button", { name: "Cancel" }).click(); ok(await sees(buyer, "isn't refunded"), "late cancel warns no refund");
const lateRow = await db.booking.findUnique({ where: { id: late.id } });
ok(lateRow.status === "LATE_CANCELLED" && !!lateRow.transferId, "late cancel pays the author");
await buyer.goto(B + "/dashboard/buyer/bookings");
await buyer.locator("tr", { hasText: "EarlySchool" }).getByRole("button", { name: "Cancel" }).click(); ok(await sees(buyer, "refunded in full"), "early cancel refunds");
ok((await db.booking.findUnique({ where: { id: early.id } })).status === "CANCELLED", "early cancel status cancelled");

// Admin CMS: create collection + article, publish, view
const admin = await ctx(); await login(admin, "admin@atelier.test");
ok((await admin.locator(".side .side-group").count()) >= 3, "admin sidebar grouped");
await admin.goto(B + "/dashboard/admin/collections");
await admin.fill("#title", "Summer reading picks"); await admin.fill("#description", "Books to keep kids reading all summer long."); await admin.check("input[name=published]");
await admin.getByRole("button", { name: "Create collection" }).click(); await admin.waitForURL("**/admin/collections/c*");
await admin.selectOption("select[name=item]", { label: "Night Sky Notes — Allie Davis" }); await admin.getByRole("button", { name: "Add" }).click(); ok(await sees(admin, "Added"), "item added");
await admin.selectOption("select[name=item]", { label: "Night Sky Notes — Allie Davis" }); await admin.getByRole("button", { name: "Add" }).click(); ok(await sees(admin, "already in this collection"), "duplicate item blocked");
await anon.goto(B + "/collections/summer-reading-picks"); ok((await text(anon)).includes("Night Sky Notes"), "new collection live");
await admin.goto(B + "/dashboard/admin/articles");
await admin.fill("#title", "Author Q&A night"); await admin.selectOption("#kind", "EVENT"); await admin.fill("#summary", "An evening of author Q&A for families.");
await admin.fill("#body", "Join us.\n\n- Readings\n- Signing"); await admin.fill("#eventStart", day(20)); await admin.check("input[name=published]");
await admin.getByRole("button", { name: "Create" }).click(); await admin.waitForURL("**/admin/articles/c*");
await anon.goto(B + "/events"); ok((await text(anon)).includes("Author Q&A night"), "new event listed");

// Mobile: dropdown links flatten into the nav row
const m = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await m.goto(B); ok(await m.evaluate(() => document.documentElement.scrollWidth <= 390), "no horizontal scroll on mobile home");
ok(await m.locator(".nav a", { hasText: "For business" }).isVisible(), "mobile nav exposes Solutions links");
ok(errors.length === 0, "no page errors" + (errors.length ? ": " + errors[0] : ""));
await browser.close(); await db.$disconnect();
