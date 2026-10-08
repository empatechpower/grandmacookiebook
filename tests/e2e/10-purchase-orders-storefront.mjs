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


// School pays a cart by purchase order
const school = await ctx(); await login(school, "school@atelier.test");
await school.goto(B + "/books?q=Word"); await school.locator(".card").first().getByRole("link").first().click(); await school.waitForURL("**/books/**");
await school.fill("input[name=qty]", "2"); await school.click("text=Add to cart"); await school.waitForURL("**/cart");
await school.getByText("Purchase order", { exact: false }).first().click();
ok(await school.locator("#poNumber").isVisible(), "choosing purchase order shows the PO form");
await school.fill("#address", "St. Cloud Elementary, 2400 W Nolana Ave, McAllen, TX 78504");
await school.fill("#poNumber", "PO-E2E-77"); await school.fill("#billingEmail", "ap@stcloud.example.org"); await school.fill("#billingAddress", "McAllen ISD AP, 2000 N 23rd St, McAllen, TX 78501");
await school.setInputFiles("#poFile", `${S}/contract.pdf`);
await school.getByRole("button", { name: "Submit purchase order" }).click(); await school.waitForURL("**/dashboard/buyer/orders");
ok((await text(school)).includes("PO PO-E2E-77 · PO in review"), "order shows the PO in review");
const po = await db.purchaseOrder.findFirst({ where: { poNumber: "PO-E2E-77" }, include: { order: true } });
ok(po?.status === "PENDING" && po.order?.status === "PENDING", "order waits for PO approval");
await sleep(500);
ok(/subject="\[Admin\] Purchase order to review: PO-E2E-77/.test(log()), "admins emailed to review the PO");

// Individuals don't get the PO option
const guest = await ctx(); await login(guest, "buyer@atelier.test");
await db.user.update({ where: { email: "buyer@atelier.test" }, data: { orgType: "INDIVIDUAL" } });
await guest.goto(B + "/books?q=Word"); await guest.locator(".card").first().getByRole("link").first().click(); await guest.waitForURL("**/books/**");
await guest.click("text=Add to cart"); await guest.waitForURL("**/cart");
ok((await guest.getByText("Purchase order", { exact: true }).count()) === 0 && (await guest.locator("#poNumber").count()) === 0, "individuals pay by card only");

// Admin approves, invoice is due Net 30, then marks it paid
const admin = await ctx(); await login(admin, "admin@atelier.test");
await admin.goto(B + "/dashboard/admin/purchase-orders");
const row = admin.locator("tr", { hasText: "PO-E2E-77" });
ok((await row.getByRole("link", { name: "View PO (PDF)" }).count()) === 1, "admin can open the attached PO document");
await row.getByRole("button", { name: "Approve" }).click(); ok(await sees(admin, "PO approved"), "admin approved the PO");
const inv = await db.invoice.findFirst({ where: { orderId: po.orderId } });
ok(inv?.status === "DUE" && Math.round((inv.dueAt - inv.issuedAt) / 864e5) === 30, "invoice issued as due in 30 days");
await admin.goto(B + `/invoices/${inv.id}`);
const invText = await text(admin);
ok(invText.includes("PO PO-E2E-77") && invText.includes("Net 30") && /remit payment to/i.test(invText) && invText.includes("1903 Sundance St"), "invoice shows PO#, terms and remit-to address");
await admin.goto(B + "/dashboard/admin/purchase-orders?filter=APPROVED");
await admin.locator("tr", { hasText: "PO-E2E-77" }).locator("input[name=note]").fill("Check #1042");
await admin.locator("tr", { hasText: "PO-E2E-77" }).getByRole("button", { name: "Mark paid" }).click(); ok(await sees(admin, "Invoice marked paid"), "admin marked the invoice paid");
ok((await db.invoice.findUnique({ where: { id: inv.id } })).status === "PAID", "invoice is paid");

// Storefront links are automatic
const anon = await ctx();
await anon.goto(B + "/signup");
await anon.locator(".role-opt", { has: anon.locator("b", { hasText: /^Author$/ }) }).click();
const em = `newauthor${Date.now()}@example.com`;
await anon.fill("#name", "Rosa María Treviño"); await anon.fill("#email", em); await anon.fill("#password", "atelier123");
await anon.click("button[type=submit]"); await anon.waitForURL("**/dashboard/**");
const created = await db.user.findUnique({ where: { email: em } });
ok(created?.role === "AUTHOR" && created.slug === "rosa-maria-trevino", `new author gets a storefront link automatically (${created?.slug})`);
await anon.goto(B + "/books"); 
const href = await anon.locator(".card a[href^='/authors/']").first().getAttribute("href");
ok(!!href && !/\/authors\/c[a-z0-9]{20,}/.test(href), `author links use readable storefront slugs (${href})`);

ok(errors.length === 0, "no page errors" + (errors.length ? ": " + errors.join(" | ") : ""));
await browser.close(); await db.$disconnect();
