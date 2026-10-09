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
const ctx = async () => { const p = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); p.setDefaultNavigationTimeout(90000); p.on("pageerror", e => errors.push(e.message)); p.on("dialog", d => d.accept()); return p; };
const login = async (p, email) => { await p.goto(B + "/login"); await p.fill("#email", email); await p.fill("#password", "atelier123"); await p.click("button[type=submit]"); await p.waitForURL("**/dashboard/**"); };
const sees = async (p, t) => { try { await p.locator(".toast.on", { hasText: t }).waitFor({ timeout: 10000 }); return true; } catch { return false; } };
const text = (p) => p.locator("body").innerText();
const log = () => readFileSync(process.env.SERVER_LOG ?? `${S}/server.log`, "utf8");
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Guest wording + login tabs
const anon = await ctx();
await anon.goto(B + "/signup");
ok(JSON.stringify(await anon.locator(".role-opt b").allInnerTexts()) === JSON.stringify(["Guest", "Author"]), "sign-up offers Guest or Author");
await anon.goto(B + "/login");
await anon.getByRole("tab", { name: /author/i }).click();
ok((await anon.getByRole("link", { name: "Join as an author" }).count()) === 1, "login has Author/Guest tabs (author tab links to author sign-up)");
await anon.fill("#email", "buyer@atelier.test"); await anon.fill("#password", "atelier123"); await anon.click("button[type=submit]"); await anon.waitForURL("**/dashboard/buyer");
ok(true, "a guest who picks the author tab still lands in their own dashboard");

// Bulk tiers at checkout + invoice
const buyer = anon;
await buyer.goto(B + "/books?q=Night"); await buyer.locator(".card").first().getByRole("link").first().click(); await buyer.waitForURL("**/books/**");
ok((await text(buyer)).includes("10–24 copies: 20% off · 25+ copies: 30% off"), "product page shows the tiers");
await buyer.fill("input[name=qty]", "9"); await buyer.click("text=Add to cart"); await buyer.waitForURL("**/cart");
ok((await text(buyer)).includes("$189") && (await text(buyer)).includes("Order 1 more for 20% off"), "9 copies: regular price, with a nudge to the next tier");
await buyer.locator("input[name=qty]").fill("10"); await buyer.getByRole("button", { name: "Update" }).click(); await sees(buyer, "Cart updated");
ok((await text(buyer)).includes("$168") && (await text(buyer)).includes("Bulk 20% off"), "10 copies: 20% off ($16.80 × 10 = $168)");
await buyer.fill("#address", "1200 N 10th St, McAllen, TX 78501"); await buyer.getByRole("button", { name: /Pay \$168/ }).click(); await buyer.waitForURL("**/dashboard/buyer/orders");
const order = await db.order.findFirst({ orderBy: { number: "desc" }, include: { invoice: true } });
ok(!!order?.invoice && order.invoice.total === 16800, "an invoice was issued for the paid order");
const invNo = `INV-${order.invoice.number}`;
await buyer.getByRole("link", { name: `Invoice ${invNo}` }).click(); await buyer.waitForURL("**/invoices/**");
const inv = await text(buyer);
ok(inv.includes(invNo) && inv.includes("1903 Sundance St") && inv.includes("Palmhurst, TX 78574") && inv.includes("PAID"), "invoice shows number, business address and PAID");
ok(inv.includes("Bulk discount 20% off $21") && inv.includes("$168"), "invoice shows the bulk discount and total");
const invUrl = buyer.url();
await sleep(600);
ok(new RegExp(`subject="Order O-${order.number} confirmed — invoice ${invNo}"`).test(log()), "receipt email carries the invoice number and link");
const school = await ctx(); await login(school, "school@atelier.test");
const r = await school.goto(invUrl); ok((await text(school)).includes("isn’t on the shelf"), "another customer can't open the invoice");
const admin = await ctx(); await login(admin, "admin@atelier.test");
await admin.goto(B + "/dashboard/admin/invoices");
ok((await text(admin)).includes(invNo), "admin invoices list includes it");
const csv = await admin.request.get(B + "/dashboard/admin/invoices/export");
ok(csv.status() === 200 && (await csv.text()).includes(invNo), "invoice CSV export");
ok((await fetch(B + "/dashboard/admin/invoices/export")).status === 404, "invoice export hidden from the public");

// Booking invoice
const bk = await db.booking.findFirstOrThrow({ where: { status: "PENDING" } });
await db.booking.update({ where: { id: bk.id }, data: { status: "ACCEPTED" } });
await buyer.goto(B + "/dashboard/buyer/bookings");
await buyer.locator("tr", { hasText: `B-${bk.number}` }).getByRole("button", { name: /^Pay/ }).click();
await buyer.locator("tr", { hasText: `B-${bk.number}` }).getByText("Confirmed").waitFor();
const bInv = await db.invoice.findFirst({ where: { bookingId: bk.id } });
ok(!!bInv && (await buyer.locator("tr", { hasText: `B-${bk.number}` }).getByRole("link", { name: `Invoice INV-${bInv.number}` }).count()) === 1, "paid booking gets an invoice linked from My bookings");

// Author switches bulk off for a product
const au = await ctx(); await login(au, "author@atelier.test");
await au.goto(B + "/dashboard/author/books");
await au.locator("tr", { hasText: "Letters from the Delta" }).getByRole("button", { name: "On" }).click(); await sees(au, "turned off");
const letters = await db.book.findFirstOrThrow({ where: { title: "Letters from the Delta" } });
ok(letters.bulkEnabled === false, "author turned bulk discounts off for one product");
await buyer.goto(B + "/books/" + letters.id);
ok(!(await text(buyer)).includes("Classroom-set discounts"), "product page no longer advertises the tiers");

// Admin changes the tiers
await admin.goto(B + "/dashboard/admin/settings");
await admin.fill("#t1p", "25"); await admin.getByRole("button", { name: "Save schedule" }).click(); await sees(admin, "Fee schedule saved");
await buyer.goto(B + "/books?q=Night"); await buyer.locator(".card").first().getByRole("link").first().click(); await buyer.waitForURL("**/books/**");
ok((await text(buyer)).includes("10–24 copies: 25% off"), "tier change applies immediately");

ok(errors.length === 0, "no page errors" + (errors.length ? ": " + errors[0] : ""));
await browser.close(); await db.$disconnect();
