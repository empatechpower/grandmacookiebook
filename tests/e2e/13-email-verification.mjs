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


// --- Email verification for new sign-ups
const newbie = await ctx();
const nEmail = `verify${Date.now()}@example.com`;
await newbie.goto(B + "/signup"); await newbie.fill("#name", "Vera Fied"); await newbie.fill("#email", nEmail); await newbie.fill("#password", "atelier123");
await newbie.click("button[type=submit]"); await newbie.waitForURL("**/dashboard/buyer");
ok(await newbie.locator(".verify-banner", { hasText: nEmail }).isVisible(), "new account sees the confirm-your-email banner");
await sleep(600);
const verifyLink = () => {
  const log = readFileSync(process.env.SERVER_LOG ?? `${S}/server.log`, "utf8");
  const blocks = log.split("[email] ").filter(b => b.startsWith(`to=${nEmail} subject="Confirm your email`));
  return blocks.length ? blocks.at(-1).match(/(http:\/\/\S+verify-email\?token=\S+)/)?.[1] : null;
};
const vlink = verifyLink();
ok(!!vlink, "a confirmation email with a link was sent");
await newbie.goto(B + "/authors/marcus-bell");
await newbie.getByRole("button", { name: /Message Marcus/ }).click();
ok(await sees(newbie, "confirm your email first"), "unverified accounts can't message authors");
ok((await db.conversation.count({ where: { buyer: { email: nEmail } } })) === 0, "no conversation was started");
await newbie.goto(B + "/dashboard/buyer");
await newbie.getByRole("button", { name: "Resend email" }).first().click();
ok(await sees(newbie, "wait a minute"), "resending is rate-limited");
await newbie.goto(vlink); await newbie.waitForURL("**/dashboard/**");
ok(await sees(newbie, "email is confirmed"), "clicking the link confirms the email");
ok(!!(await db.user.findUnique({ where: { email: nEmail } })).emailVerifiedAt && (await newbie.locator(".verify-banner").count()) === 0, "account is verified and the banner is gone");
const stranger = await ctx(); await stranger.goto(B + "/verify-email?token=forged.token.value"); await stranger.waitForURL("**/login");
ok(await sees(stranger, "invalid or has expired"), "a forged link is rejected");

// Google sign-ups and admins are verified from the start; existing accounts were marked verified
ok((await db.user.count({ where: { email: { endsWith: "@atelier.test" }, emailVerifiedAt: null } })) === 0, "existing (seeded) accounts count as verified");
const admin = await ctx(); await login(admin, "admin@atelier.test"); await admin.goto(B + `/dashboard/admin/users?q=${encodeURIComponent(nEmail)}`);
ok((await admin.locator("tr", { hasText: nEmail }).innerText()).includes("Email verified"), "admin users list shows the verified badge");

ok(errors.length === 0, "no page errors" + (errors.length ? ": " + errors.join(" | ") : ""));
await browser.close(); await db.$disconnect();
