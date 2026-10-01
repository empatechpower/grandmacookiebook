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
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const sees = async (p, text) => { try { await p.locator(".toast.on", { hasText: text }).waitFor({ timeout: 8000 }); return true; } catch { return false; } };
const stamp = Date.now().toString().slice(-6);
const refEmail = `newauthor${stamp}@x.test`;

// Public program page reflects settings
const anon = await ctx();
await anon.goto(B + "/referral");
ok((await anon.locator("h1").innerText()).includes("2% for 12 months"), "public referral page shows 2% for 12 months");
ok((await anon.locator("footer").innerText()).includes("Referral program"), "footer links to referral program");

// Chike refers a new author
const chike = await ctx(); await login(chike, "author@atelier.test");
await chike.goto(B + "/dashboard/author/referrals");
ok((await chike.locator("body").innerText()).includes("Tara Adams"), "seeded pending referral listed");
await chike.fill("#name", "Ngozi Writes"); await chike.fill("#email", "author@atelier.test"); await chike.getByRole("button", { name: "Send referral" }).click();
ok(await sees(chike, "yourself"), "can't refer yourself");
await chike.fill("#name", "Mike"); await chike.fill("#email", "mike@atelier.test"); await chike.getByRole("button", { name: "Send referral" }).click();
ok(await sees(chike, "already has a Grandma Cookie Book account"), "can't refer an existing member");
await chike.goto(B + "/dashboard/author/referrals");
await chike.fill("#name", "Ngozi Writes"); await chike.fill("#email", refEmail); await chike.getByRole("button", { name: "Send referral" }).click();
ok(await sees(chike, "Referral sent"), "referral submitted");
const jeanette = await ctx(); await login(jeanette, "jeanette@atelier.test");
await jeanette.goto(B + "/dashboard/author/referrals");
await jeanette.fill("#name", "Ngozi"); await jeanette.fill("#email", refEmail.toUpperCase()); await jeanette.getByRole("button", { name: "Send referral" }).click();
ok(await sees(jeanette, "already referred"), "first referral wins (case-insensitive)");
ok((await jeanette.locator("body").innerText()).includes("$15.60"), "Jeanette sees seeded reward owed ($15.60)");

// Invite email -> signup link with email prefilled -> linked
await sleep(600);
const log = () => readFileSync(process.env.SERVER_LOG ?? `${S}/server.log`, "utf8");
const invite = log().split("[email] ").find(b => b.startsWith(`to=${refEmail} subject="Marcus Bell invited you`));
ok(!!invite, "referred person emailed an invitation");
const link = invite.match(/(http:\/\/\S+signup\?role=AUTHOR&email=\S+)/)[1];
const nu = await ctx(); await nu.goto(link);
ok((await nu.locator("#email").inputValue()) === refEmail, "invite link prefills email");
await nu.fill("#name", "Ngozi Writes"); await nu.fill("#password", "password123"); await nu.click("button[type=submit]"); await nu.waitForURL("**/dashboard/author");
const newUser = await db.user.findUniqueOrThrow({ where: { email: refEmail } });
ok((await db.referral.findUnique({ where: { referredEmail: refEmail } })).referredUserId === newUser.id, "signup linked to the referral");

// Admin verifies referral + approves the author
const admin = await ctx(); await login(admin, "admin@atelier.test");
await admin.goto(B + "/dashboard/admin/referrals");
await admin.locator("tr", { hasText: refEmail }).getByRole("button", { name: "Verify" }).click();
await admin.locator("tr", { hasText: refEmail }).filter({ hasText: "Approved" }).waitFor();
ok(true, "admin verified the referral");
await admin.goto(B + "/dashboard/admin/users?filter=pending");
await admin.locator("tr", { hasText: "Ngozi Writes" }).getByRole("button", { name: "Approve" }).click(); await admin.waitForLoadState("networkidle");

// New author: connect Stripe (demo), list a book, admin approves
await nu.goto(B + "/dashboard/author/payouts"); await nu.getByRole("button", { name: "Connect Stripe" }).click(); await nu.getByText("Stripe connected").waitFor();
await nu.goto(B + "/dashboard/author/books/new");
await nu.fill("#title", "Referral Tales " + stamp); await nu.fill("#description", "A book to test referral rewards."); await nu.fill("#price", "40"); await nu.fill("#stock", "10");
await nu.click("text=Submit for review"); await nu.waitForURL("**/dashboard/author/books");
await admin.goto(B + "/dashboard/admin/listings");
await admin.locator("tr", { hasText: "Referral Tales " + stamp }).getByRole("button", { name: "Approve" }).click(); await admin.waitForLoadState("networkidle");

// Buyer buys 2 copies ($80) and marks received -> released -> Chike earns 2% = $1.60
const buyer = await ctx(); await login(buyer, "buyer@atelier.test");
await buyer.goto(B + "/books?q=" + encodeURIComponent("Referral Tales " + stamp));
await buyer.locator(".card").first().getByRole("link").first().click(); await buyer.waitForURL("**/books/**");
await buyer.fill("input[name=qty]", "2"); await buyer.click("text=Add to cart"); await buyer.waitForURL("**/cart");
await buyer.fill("#address", "1 Test Road, Lagos"); await buyer.getByRole("button", { name: /Pay \$80/ }).click(); await buyer.waitForURL("**/dashboard/buyer/orders");
const row = buyer.locator("tr", { hasText: "Referral Tales " + stamp });
ok((await db.referralEarning.count({ where: { referral: { referredEmail: refEmail } } })) === 0, "no reward while payment is held");
await row.getByRole("button", { name: "Mark received" }).click(); await buyer.locator("tr", { hasText: "Referral Tales " + stamp }).getByText("Delivered").waitFor();
const earning = await db.referralEarning.findFirst({ where: { referral: { referredEmail: refEmail } } });
ok(earning?.amount === 160, `2% of $80 sale accrued on release: ${earning?.amount}`);
await chike.goto(B + "/dashboard/author/referrals");
ok((await chike.locator("tr", { hasText: "Ngozi Writes" }).innerText()).includes("$1.60"), "referrer sees earned reward");

// Pay out Chike (Stripe demo) -> earning attached, email sent
await admin.goto(B + "/dashboard/admin/referrals");
await admin.locator("tr", { hasText: "author@atelier.test" }).getByRole("button", { name: "Pay via Stripe" }).click();
await admin.getByText("Paid via Stripe").waitFor();
ok(!!(await db.referralEarning.findUnique({ where: { id: earning.id } })).payoutId, "payout recorded and earning marked paid");
await sleep(500);
ok(/to=author@atelier\.test subject="Referral rewards paid: \$1\.60"/.test(log()), "referrer emailed about payout");
await chike.goto(B + "/dashboard/author/referrals");
ok((await chike.locator("body").innerText()).includes("Stripe"), "referrer sees payout history");

// Refund rule: a second released sale refunded before payout voids the reward
await buyer.goto(B + "/books?q=" + encodeURIComponent("Referral Tales " + stamp));
await buyer.locator(".card").first().getByRole("button", { name: "Buy" }).click(); await buyer.waitForURL("**/cart");
await buyer.fill("#address", "1 Test Road, Lagos"); await buyer.getByRole("button", { name: /Pay \$40/ }).click(); await buyer.waitForURL("**/dashboard/buyer/orders");
const second = await db.orderItem.findFirstOrThrow({ where: { title: "Referral Tales " + stamp, status: "PAID" } });
await buyer.locator("tr", { hasText: "Referral Tales " + stamp }).filter({ has: buyer.getByRole("button", { name: "Mark received" }) }).getByRole("button", { name: "Mark received" }).click();
await sleep(1200);
ok((await db.referralEarning.count({ where: { sourceId: second.id } })) === 1, "second sale accrues a reward");
await admin.goto(B + "/dashboard/admin/orders");
await admin.locator("tr", { has: admin.locator(`text=O-${(await db.order.findUnique({ where: { id: second.orderId } })).number}`) }).getByRole("button", { name: "Refund" }).click();
await sleep(1200);
ok((await db.referralEarning.count({ where: { sourceId: second.id } })) === 0, "refund voids the unpaid reward");

// Admin can change reward settings; cron is protected
await admin.goto(B + "/dashboard/admin/settings");
await admin.fill("#rp", "3"); await admin.getByRole("button", { name: "Save schedule" }).click(); await admin.getByText("Fee schedule saved").waitFor();
await anon.goto(B + "/referral"); ok((await anon.locator("h1").innerText()).includes("3%"), "reward % editable in settings");
ok((await fetch(B + "/api/cron/referral-payouts")).status === 401, "quarterly payout job requires the secret");
ok(errors.length === 0, "no page errors" + (errors.length ? ": " + errors[0] : ""));
await browser.close(); await db.$disconnect();
