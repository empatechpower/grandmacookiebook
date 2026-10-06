// Run via `npm run test:e2e` (scripts/e2e.sh), which builds, starts the app and reseeds before each suite.
import { chromium } from "playwright-core";
const B = process.env.BASE_URL ?? "http://localhost:3917", S = process.env.E2E_ARTIFACTS ?? "tests/e2e/.artifacts";
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const errors = [];
const ctx = async () => { const c = await browser.newContext({ viewport: { width: 1280, height: 860 } }); const p = await c.newPage();
  p.setDefaultNavigationTimeout(90000); p.on("pageerror", e => errors.push(e.message)); p.on("console", m => m.type()==="error" && errors.push(m.text())); return p; };
const ok = (cond, msg) => { console.log((cond ? "PASS " : "FAIL ") + msg); if (!cond) process.exitCode = 1; };
const text = p => p.locator("body").innerText();
const settle = p => p.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
const stamp = Date.now().toString().slice(-6);

// 1. Public home
const anon = await ctx();
await anon.goto(B); ok((await anon.locator(".grid-4 .card:not(.author-card)").count()) === 4, "home shows 4 books");
await anon.screenshot({ path: `${S}/01-home.png`, fullPage: true });
await anon.goto(B + "/dashboard/admin"); ok(anon.url().includes("/login"), "anon redirected to login from admin");

// 2. New author signs up and lists
const author = await ctx();
await author.goto(B + "/signup?role=AUTHOR");
await author.fill("#name", "Test Author " + stamp); await author.fill("#email", `ta${stamp}@x.test`); await author.fill("#password", "password123");
await author.click("button[type=submit]"); await author.waitForURL("**/dashboard/author"); await settle(author);
ok((await text(author)).includes("awaiting admin approval"), "new author sees pending banner");
await author.goto(B + "/dashboard/author/books/new");
await author.fill("#title", "Rainforest " + stamp); await author.fill("#description", "A long description of the rainforest."); await author.fill("#price", "25"); await author.fill("#stock", "5");
await author.click("text=Submit for review"); await author.waitForURL("**/dashboard/author/books"); await settle(author);
ok((await text(author)).includes("Rainforest " + stamp), "author book created");
await author.goto(B + "/dashboard/author/visits/new");
await author.fill("#title", "Rainforest talk " + stamp); await author.fill("#description", "Talk about trees and rivers."); await author.fill("#fee", "300");
await author.click("text=Submit for review"); await author.waitForURL("**/dashboard/author/visits"); await settle(author);
await anon.goto(B + "/books"); ok(!(await text(anon)).includes("Rainforest " + stamp), "pending book hidden from catalog");

// 3. Admin approves author + listings
const admin = await ctx();
await admin.goto(B + "/login"); await admin.fill("#email", "admin@atelier.test"); await admin.fill("#password", "atelier123");
await admin.click("button[type=submit]"); await admin.waitForURL("**/dashboard/admin"); await settle(admin);
await admin.screenshot({ path: `${S}/02-admin.png`, fullPage: true });
await admin.goto(B + "/dashboard/admin/users?filter=pending");
await admin.locator("tr", { hasText: "Test Author " + stamp }).getByRole("button", { name: "Approve" }).click(); await settle(admin);
await admin.goto(B + "/dashboard/admin/listings");
await admin.screenshot({ path: `${S}/03-listings.png`, fullPage: true });
// reject without note should fail
await admin.locator("tr", { hasText: "Rainforest talk " + stamp }).getByRole("button", { name: "Reject" }).click(); await settle(admin);
ok((await admin.locator("#toast, .toast").innerText()).includes("note"), "reject requires note");
for (const t of ["Rainforest " + stamp, "Rainforest talk " + stamp]) {
  await admin.goto(B + "/dashboard/admin/listings");
  await admin.locator("tr", { hasText: t }).first().getByRole("button", { name: "Approve" }).click(); await settle(admin);
}
await anon.goto(B + "/books"); ok(!(await text(anon)).includes("Rainforest " + stamp), "approved book still hidden until author connects Stripe");
await author.goto(B + "/dashboard/author"); ok((await text(author)).includes("Connect Stripe so you can be paid"), "author sees connect-Stripe banner");
await author.goto(B + "/dashboard/author/payouts"); await author.getByRole("button", { name: "Connect Stripe" }).click(); await author.getByText("Stripe connected").waitFor();
ok((await text(author)).includes("Stripe connected"), "author connected Stripe (demo)");
await anon.goto(B + "/books"); ok((await text(anon)).includes("Rainforest " + stamp), "book public after approval + Stripe");

// 4. Buyer signs up, buys, books
const buyer = await ctx();
await buyer.goto(B + "/signup");
await buyer.fill("#name", "Test Buyer " + stamp); await buyer.fill("#email", `tb${stamp}@x.test`); await buyer.fill("#password", "password123");
await buyer.click("button[type=submit]"); await buyer.waitForURL("**/dashboard/buyer");
await buyer.goto(B + "/books"); await buyer.locator(".card", { hasText: "Rainforest " + stamp }).getByRole("link").first().click();
await buyer.fill("input[name=qty]", "2"); await buyer.click("text=Add to cart"); await buyer.waitForURL("**/cart"); await settle(buyer);
ok((await text(buyer)).includes("$50"), "cart total $50");
await buyer.screenshot({ path: `${S}/04-cart.png`, fullPage: true });
await buyer.fill("#address", "5 Test Street, Lagos"); await buyer.click("text=Pay $50"); await buyer.waitForURL("**/dashboard/buyer/orders"); await settle(buyer);
ok((await text(buyer)).includes("Rainforest " + stamp), "order appears for buyer");
await buyer.goto(B + "/visits"); await buyer.locator(".card", { hasText: "Rainforest talk " + stamp }).getByRole("link", { name: "Request booking" }).click();
const d = new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10);
await buyer.fill("#organisation", "Test School"); await buyer.fill("#eventDate", d); await buyer.fill("#audienceSize", "80"); await buyer.fill("#venue", "Hall A");
await buyer.screenshot({ path: `${S}/05-visit.png`, fullPage: true });
await buyer.click("text=Send request"); await buyer.waitForURL("**/dashboard/buyer/bookings"); await settle(buyer);
ok((await text(buyer)).includes("Pending"), "booking pending");
await buyer.goto(B + "/dashboard/admin"); ok(buyer.url().includes("/dashboard/buyer"), "buyer blocked from admin desk");
await buyer.goto(B + "/dashboard/author/books"); ok(!buyer.url().includes("/dashboard/author"), "buyer blocked from author studio");

// 5. Author accepts + ships; stock decreased
await author.goto(B + "/dashboard/author/requests"); await settle(author);
await author.locator("tr", { hasText: "Test School" }).locator("input[name=note]").fill("See you there!");
await author.locator("tr", { hasText: "Test School" }).getByRole("button", { name: "Accept" }).click(); await author.locator("tr", { hasText: "Test School" }).getByText("Awaiting buyer payment").waitFor();
ok((await author.locator("tr", { hasText: "Test School" }).innerText()).includes("Accepted"), "author accepted booking");
await author.screenshot({ path: `${S}/06-requests.png`, fullPage: true });
await author.goto(B + "/dashboard/author/orders");
await author.locator("tr", { hasText: "Rainforest " + stamp }).getByRole("button", { name: "Mark shipped" }).click(); await settle(author);
await author.goto(B + "/dashboard/author/books"); ok((await author.locator("tr", { hasText: "Rainforest " + stamp }).innerText()).includes("\t3\t"), "stock decremented to 3");
await author.goto(B + "/dashboard/author/payouts"); await settle(author);
const payRow = await author.locator("tr", { hasText: "Rainforest " + stamp }).innerText();
ok(payRow.includes("$47.50") && payRow.includes("Held until"), "author's $47.50 share ($50 - 5%) held after payment");

// 6. Buyer pays booking
await buyer.goto(B + "/dashboard/buyer/bookings");
await buyer.locator("tr", { hasText: "Test School" }).getByRole("button", { name: /Pay/ }).click(); await buyer.locator("tr", { hasText: "Test School" }).getByText("Confirmed").waitFor({ timeout: 10000 }).catch(() => {});
ok((await buyer.locator("tr", { hasText: "Test School" }).innerText()).includes("Confirmed"), "booking confirmed after payment");
await author.goto(B + "/dashboard/author/payouts"); await settle(author);
ok((await text(author)).includes("books 5%, visits 15%"), "payouts page states 5% books / 15% visits");
const bRow = await author.locator("tr", { hasText: "Rainforest talk " + stamp }).innerText();
ok(bRow.includes("$255") && bRow.includes("Held until"), "booking share $255 (300 - 15%) held until after the event");
buyer.on("dialog", d => d.accept());
await buyer.goto(B + "/dashboard/buyer/orders");
await buyer.locator("tr", { hasText: "Rainforest " + stamp }).getByRole("button", { name: "Mark received" }).click();
await buyer.locator("tr", { hasText: "Rainforest " + stamp }).getByText("Delivered").waitFor();
await author.goto(B + "/dashboard/author/payouts");
ok((await author.locator("tr", { hasText: "O-" }).filter({ hasText: "Rainforest " + stamp }).innerText()).includes("Sent"), "buyer marking received releases the author's share");
await author.screenshot({ path: `${S}/07-payouts.png`, fullPage: true });

// 7. Admin pays out, suspends author -> listings hidden
admin.on("dialog", d => d.accept());
await admin.goto(B + "/dashboard/admin/orders");
const oRow = admin.locator("tr", { hasText: "Rainforest " + stamp });
ok((await oRow.innerText()).includes("Sent"), "admin sees transfer sent");
await oRow.getByRole("button", { name: "Refund" }).click();
ok(await admin.locator("tr", { hasText: "Rainforest " + stamp }).getByText("Refunded").first().waitFor({ timeout: 15000 }).then(() => true, () => false), "admin refunded line");
await admin.screenshot({ path: `${S}/10-admin-orders.png`, fullPage: true });
await author.goto(B + "/dashboard/author/payouts");
ok((await author.locator("tr", { hasText: "Rainforest " + stamp }).innerText()).includes("Refunded"), "author sees share reversed");
await admin.goto(B + "/dashboard/admin/users?filter=AUTHOR");
await admin.locator("tr", { hasText: "Test Author " + stamp }).getByRole("button", { name: "Suspend" }).click(); await settle(admin);
await anon.goto(B + "/books"); ok(!(await text(anon)).includes("Rainforest " + stamp), "suspended author's books hidden");
await author.goto(B + "/dashboard/author"); ok(author.url().includes("/login"), "suspended author logged out");

// mobile
const m = await browser.newContext({ viewport: { width: 390, height: 844 } }); const mp = await m.newPage();
await mp.goto(B); ok(await mp.evaluate(() => document.documentElement.scrollWidth <= 390), "no horizontal scroll on mobile home");
await mp.screenshot({ path: `${S}/08-mobile.png`, fullPage: false });

ok(errors.length === 0, "no browser console errors" + (errors.length ? ": " + errors.slice(0, 3).join(" | ") : ""));
await browser.close();
