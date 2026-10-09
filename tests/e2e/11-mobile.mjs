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


// Every main page fits a phone screen (390px): nothing runs off the right edge.
const pages = {
  anon: ["/", "/authors", "/authors/marcus-bell", "/books", "/visits", "/collections", "/for-schools", "/for-business", "/for-authors", "/book-fairs", "/contact", "/login", "/signup", "/news", "/events", "/resources", "/privacy", "/terms"],
  "school@atelier.test": ["/dashboard/buyer", "/dashboard/buyer/orders", "/dashboard/buyer/bookings", "/dashboard/buyer/requests", "/dashboard/buyer/requests/new", "/cart", "/dashboard/messages", "/dashboard/buyer/profile"],
  "author@atelier.test": ["/dashboard/author", "/dashboard/author/requests", "/dashboard/author/orders", "/dashboard/author/visits", "/dashboard/author/books", "/dashboard/author/profile", "/dashboard/author/opportunities", "/dashboard/author/pricing", "/dashboard/author/availability", "/dashboard/author/settings", "/dashboard/author/media"],
  "admin@atelier.test": ["/dashboard/admin", "/dashboard/admin/users", "/dashboard/admin/orders", "/dashboard/admin/bookings", "/dashboard/admin/purchase-orders", "/dashboard/admin/invoices", "/dashboard/admin/settings", "/dashboard/admin/listings"],
};
for (const [who, list] of Object.entries(pages)) {
  const p = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  p.setDefaultNavigationTimeout(90000); p.on("pageerror", (e) => errors.push(e.message));
  if (who !== "anon") await login(p, who);
  for (const path of list) {
    await p.goto(B + path);
    const w = await p.evaluate(() => document.documentElement.scrollWidth);
    ok(w <= 390, `${who === "anon" ? "guest" : who.split("@")[0]} ${path} fits the phone screen (${w}px)`);
  }
}

// Dashboard menu on a phone: opens the full list and closes after picking a page
const a = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
await login(a, "author@atelier.test");
ok(!(await a.locator(".side-nav a", { hasText: "Availability" }).isVisible()), "dashboard menu starts closed on phones");
await a.locator(".side").getByRole("button", { name: /Menu/ }).click();
await a.locator(".side-nav a", { hasText: "Availability" }).click(); await a.waitForURL("**/availability");
ok(!(await a.locator(".side-nav a", { hasText: "Availability" }).isVisible()), "dashboard menu closes after navigating");
const hdr = await a.evaluate(() => document.querySelector(".side").getBoundingClientRect().height);
ok(hdr < 110, `dashboard header stays compact on short pages (${Math.round(hdr)}px)`);

ok(errors.length === 0, "no page errors" + (errors.length ? ": " + errors.join(" | ") : ""));
await browser.close(); await db.$disconnect();
