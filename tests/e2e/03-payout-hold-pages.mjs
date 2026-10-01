// Run via `npm run test:e2e` (scripts/e2e.sh), which builds, starts the app and reseeds before each suite.
import { chromium } from "playwright-core";
import { createRequire } from "module";
import { readFileSync } from "fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const { PrismaClient } = require("@prisma/client");
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const db = new PrismaClient();
const B = process.env.BASE_URL ?? "http://localhost:3917", S = process.env.E2E_ARTIFACTS ?? "tests/e2e/.artifacts";
const CRON = process.env.CRON_SECRET;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const errors = [];
const ctx = async () => { const p = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); p.on("dialog", d => d.accept()); p.on("pageerror", e => errors.push(e.message)); return p; };
const login = async (p, email) => { await p.goto(B + "/login"); await p.fill("#email", email); await p.fill("#password", "atelier123"); await p.click("button[type=submit]"); await p.waitForURL("**/dashboard/**"); };

// Fixtures: one visit that already happened (buyer can confirm) and one whose hold already ended.
const buyerU = await db.user.findUniqueOrThrow({ where: { email: "buyer@atelier.test" } });
const jeanette = await db.user.findUniqueOrThrow({ where: { email: "jeanette@atelier.test" } });
const pkg = await db.visitPackage.findFirstOrThrow({ where: { authorId: jeanette.id } });
const day = (n) => new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z").getTime() + n * 86400000;
const mk = (number, org, eventDaysAgo, releaseDaysAgo) => db.booking.create({ data: {
  number, buyerId: buyerU.id, authorId: jeanette.id, packageId: pkg.id, fee: 42000, commissionPct: 15, status: "CONFIRMED",
  eventDate: new Date(day(-eventDaysAgo)), organisation: org, venue: "Hall", audienceSize: 50,
  paymentRef: `pi_mock_fx${number}`, chargeId: `ch_mock_fx${number}`, releaseAt: new Date(day(14 - eventDaysAgo) - releaseDaysAgo * 0) } });
const past = await mk(9001, "Yesterday School", 1, 0);
const due = await mk(9002, "Overdue School", 20, 0);

// Buyer confirms yesterday's visit -> released
const buyer = await ctx(); await login(buyer, "buyer@atelier.test");
await buyer.goto(B + "/dashboard/buyer/bookings");
const row = buyer.locator("tr", { hasText: "Yesterday School" });
await row.getByRole("button", { name: "Confirm visit" }).click(); await row.getByText("Completed").waitFor();
ok(!!(await db.booking.findUnique({ where: { id: past.id } })).transferId, "buyer confirming visit releases payment");
ok((await buyer.locator("tr", { hasText: "B-1041" }).getByRole("button", { name: "Confirm visit" }).count()) === 0, "future visit can't be confirmed yet");

// Cron auth + admin early release of the overdue hold
ok((await fetch(B + "/api/cron/release-payouts")).status === 401, "cron rejects missing secret");
const admin = await ctx(); await login(admin, "admin@atelier.test");
await admin.getByRole("button", { name: "Release due payouts now" }).click(); await admin.waitForLoadState("networkidle");
await admin.waitForTimeout(500);
const d = await db.booking.findUnique({ where: { id: due.id } });
ok(!!d.transferId && d.status === "COMPLETED", "overdue hold released and visit marked completed");
const cron = await fetch(B + "/api/cron/release-payouts", { headers: { authorization: `Bearer ${CRON}` } });
ok(cron.status === 200 && (await cron.json()).released.bookings === 0, "cron runs with secret (nothing left due)");
await admin.goto(B + "/dashboard/admin/orders");
ok((await admin.locator("tr", { hasText: "Night Sky Notes" }).innerText()).includes("Held"), "admin sees held line with release date");
await admin.locator("tr", { hasText: "Night Sky Notes" }).getByRole("button", { name: "Release now" }).click();
await admin.locator("tr", { hasText: "Night Sky Notes" }).getByText("Sent").waitFor();
ok(true, "admin can release a held line early");

// Public pages + contact form
const anon = await ctx();
for (const path of ["/pricing", "/privacy", "/terms", "/contact"]) { const r = await anon.goto(B + path); ok(r.status() === 200, `${path} loads`); }
await anon.goto(B + "/pricing"); const pricing = await anon.locator("body").innerText();
ok(pricing.includes("5%") && pricing.includes("15%"), "pricing shows 5% books / 15% visits from settings");
await anon.screenshot({ path: `${S}/16-pricing.png`, fullPage: true });
await anon.goto(B + "/terms"); ok((await anon.locator("body").innerText()).includes("have a lawyer review"), "legal pages flag template status");
ok((await anon.locator("footer").innerText()).includes("Privacy"), "footer has legal links");
await anon.goto(B + "/contact");
await anon.fill("#name", "Test Parent"); await anon.fill("#email", "parent@example.com"); await anon.fill("#body", "Do you have Yoruba-speaking authors?");
await anon.getByRole("button", { name: "Send message" }).click(); await anon.waitForURL("**/contact?sent=1");
ok(true, "contact form submits");
await admin.goto(B + "/dashboard/admin/inbox");
ok((await admin.locator("body").innerText()).includes("Yoruba-speaking"), "admin inbox shows contact message");
await admin.locator("tr", { hasText: "Yoruba-speaking" }).getByRole("button", { name: "Handled" }).click();
await admin.waitForLoadState("networkidle");
ok((await admin.locator("tr", { hasText: "Yoruba-speaking" }).count()) === 0, "handled message leaves open inbox");
await anon.goto(B + "/contact");
await anon.fill("#name", "Bot"); await anon.fill("#email", "bot@example.com"); await anon.fill("#body", "spam spam spam spam");
await anon.evaluate(() => { document.querySelector("input[name=website]").value = "http://spam"; });
await anon.getByRole("button", { name: "Send message" }).click(); await anon.waitForURL("**/contact?sent=1");
ok((await db.contactMessage.count({ where: { name: "Bot" } })) === 0, "honeypot silently drops bot submissions");

await new Promise(r => setTimeout(r, 800));
const log = readFileSync(process.env.SERVER_LOG ?? `${S}/server.log`, "utf8");
const has = (re, m) => ok(re.test(log), m);
has(/\[email\] to=jeanette@atelier\.test subject="You've been paid/, "email: author told they've been paid");
has(/\[email\] to=admin@atelier\.test subject="Contact form: /, "email: admins get contact form messages");
ok(errors.length === 0, "no page errors" + (errors.length ? ": " + errors[0] : ""));
await browser.close(); await db.$disconnect();
