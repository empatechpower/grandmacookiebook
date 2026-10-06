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

// Menu + dashboard
const au = await ctx(); await login(au, "author@atelier.test");
const menu = (await au.locator(".side-nav a:not(.sub)").allInnerTexts()).map((t) => t.replace(/\d+$/, "").trim());
ok(JSON.stringify(menu) === JSON.stringify(["Dashboard", "Bookings", "Orders", "Listings", "Products", "Storefront", "Settings"]), "author menu matches the requested list: " + menu.join(", "));
ok(await au.getByRole("button", { name: "Log out" }).isVisible(), "Log Out in the sidebar");
const dash = await text(au);
ok(["TOTAL EARNINGS", "TOTAL ORDERS", "NEW ORDERS", "NEW BOOKINGS", "BOOKS SOLD"].every((k) => dash.toUpperCase().includes(k)) && dash.includes("Booking activity") && dash.includes("Order tracking"), "dashboard overview shows earnings, orders, bookings and tracking");

// Storefront: slug + socials
await au.goto(B + "/dashboard/author/profile");
await au.fill("#slug", "jeanette-gil"); await au.getByRole("button", { name: "Save profile" }).click();
ok(await sees(au, "taken"), "someone else's storefront link is rejected");
await au.goto(B + "/dashboard/author/profile");
await au.fill("#slug", "admin"); await au.getByRole("button", { name: "Save profile" }).click();
ok(await sees(au, "reserved"), "reserved storefront link is rejected");
await au.goto(B + "/dashboard/author/profile");
await au.fill("#slug", "marcus-the-author"); await au.fill("#tiktokUrl", "https://tiktok.com/@marcus");
await au.getByRole("button", { name: "Save profile" }).click(); ok(await sees(au, "Profile saved"), "storefront saved");
const anon = await ctx();
let r = await anon.goto(B + "/authors/marcus-the-author");
ok(r.status() === 200 && (await anon.getByRole("link", { name: /TikTok/ }).count()) === 1 && (await anon.getByRole("link", { name: /Facebook/ }).count()) === 1, "custom storefront link works and shows social links");
const marcus = await db.user.findUniqueOrThrow({ where: { email: "author@atelier.test" } });
r = await anon.goto(B + "/authors/" + marcus.id); ok(r.status() === 200, "old storefront link still works");
await anon.goto(B + "/authors"); ok((await anon.locator('.author-card a[href="/authors/marcus-the-author"]').count()) > 0, "directory links to the custom storefront");

// Media
await au.goto(B + "/dashboard/author/media");
await au.locator("form", { hasText: "Add a video" }).locator("#v-url").fill("https://www.youtube.com/watch?v=abc123XYZ");
await au.fill("#v-title", "Interview on KSAT 12"); await au.getByRole("button", { name: "Add video" }).click(); ok(await sees(au, "Added"), "video added");
await au.setInputFiles("#p-file", `${S}/avatar.png`); await au.fill("#p-title", "Award night");
await au.selectOption("#p-cat", "AWARDS"); await au.getByRole("button", { name: "Add photo" }).click();
ok(await au.locator(".media-tile", { hasText: "Award night" }).waitFor({ timeout: 15000 }).then(() => true, () => false), "photo uploaded");
await anon.goto(B + "/authors/marcus-the-author");
ok((await anon.locator('iframe[src="https://www.youtube-nocookie.com/embed/abc123XYZ"]').count()) === 1, "YouTube video plays on the storefront");
ok((await anon.locator(".media-tile", { hasText: "Award night" }).locator("img").count()) === 1, "uploaded photo on the storefront");

// Products: feature + extra photos
await au.goto(B + "/dashboard/author/books");
await au.locator("tr", { hasText: "Nature Sketchbook" }).getByRole("button", { name: /Feature/ }).click(); ok(await sees(au, "Featured"), "product featured");
await anon.goto(B + "/authors/marcus-the-author");
ok((await anon.locator(".card .featured-badge").count()) === 2, "featured products carry a badge on the storefront");
await au.goto(B + "/dashboard/author/books"); await au.locator("tr", { hasText: "Nature Sketchbook" }).getByRole("link", { name: "Edit" }).click(); await au.waitForURL("**/books/c*");
await au.setInputFiles("#images", [`${S}/cover.png`, `${S}/avatar.png`]); await au.getByRole("button", { name: "Save changes" }).click(); await au.waitForURL("**/dashboard/author/books");
const nature = await db.book.findFirstOrThrow({ where: { title: "Nature Sketchbook" }, include: { images: true } });
ok(nature.images.length === 2, "two extra product photos saved");

// Booking time
const buyer = await ctx(); await login(buyer, "buyer@atelier.test");
const jeanette = await db.user.findUniqueOrThrow({ where: { email: "jeanette@atelier.test" } });
const pkg = await db.visitPackage.findFirstOrThrow({ where: { authorId: jeanette.id } });
await buyer.goto(B + "/visits/" + pkg.id);
await buyer.locator(".date-chip").first().click(); await buyer.fill("#organisation", "Palmhurst Elementary"); await buyer.fill("#eventTime", "14:30");
await buyer.fill("#audienceSize", "90"); await buyer.fill("#venue", "1903 Sundance St, Palmhurst, TX");
await buyer.click("text=Send request"); await buyer.waitForURL("**/dashboard/buyer/bookings");
ok((await buyer.locator("tr", { hasText: "Palmhurst Elementary" }).innerText()).includes("2:30 PM"), "booking shows the start time");
const j = await ctx(); await login(j, "jeanette@atelier.test"); await j.goto(B + "/dashboard/author/requests");
const row = await j.locator("tr", { hasText: "Palmhurst Elementary" }).innerText();
ok(row.includes("2:30 PM") && row.includes("Awaiting acceptance"), "author sees time and payment status");
await sleep(600);
ok(/to=admin@atelier\.test subject="\[Admin\] New booking request/.test(log()), "admin emailed about the new booking");

// Orders: tracking, buyer link, export, phone
await au.goto(B + "/dashboard/author/orders");
const o = au.locator("tr", { hasText: "Nature Sketchbook" });
await o.locator("select[name=carrier]").selectOption("UPS"); await o.locator("input[name=trackingNumber]").fill("1Z999AA10123456784");
await o.getByRole("button", { name: "Mark shipped" }).click(); ok(await sees(au, "shipped"), "author marked shipped with tracking");
const school = await ctx(); await login(school, "school@atelier.test"); await school.goto(B + "/dashboard/buyer/orders");
ok((await school.locator("tr", { hasText: "Nature Sketchbook" }).getByRole("link", { name: /Track UPS/ }).getAttribute("href")).includes("1Z999AA10123456784"), "customer sees a UPS tracking link");
await sleep(600);
ok(/subject="Shipped: Nature Sketchbook"[\s\S]{0,400}1Z999AA10123456784/.test(log()), "shipping email includes tracking");
const csv = await au.request.get(B + "/dashboard/author/orders/export");
const body = await csv.text();
ok(csv.status() === 200 && body.includes("1Z999AA10123456784") && body.includes("O-2204"), "CSV export includes orders and tracking");
ok((await fetch(B + "/dashboard/author/orders/export")).status === 404, "export hidden from logged-out visitors");
await buyer.goto(B + "/books?q=Night"); await buyer.locator(".card").first().getByRole("button", { name: "Buy" }).click(); await buyer.waitForURL("**/cart");
await buyer.fill("#phone", "(956) 555-0123"); await buyer.fill("#address", "1903 Sundance St, Palmhurst, TX 78573");
await buyer.getByRole("button", { name: /^Pay/ }).click(); await buyer.waitForURL("**/dashboard/buyer/orders");
const last = await db.order.findFirst({ orderBy: { number: "desc" } });
ok(last?.phone === "(956) 555-0123", "checkout phone saved on the order");

// Settings
await au.goto(B + "/dashboard/author/settings");
ok((await text(au)).includes("Change password") && (await text(au)).includes("Payouts"), "settings has account, payouts and password");

ok(errors.length === 0, "no page errors" + (errors.length ? ": " + errors[0] : ""));
await browser.close(); await db.$disconnect();
