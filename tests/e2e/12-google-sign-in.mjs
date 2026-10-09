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

import { SignJWT } from "jose";

// The real Google screen can't run in tests; everything around it can.
const anon = await ctx();
await anon.goto(B + "/login");
ok((await anon.locator(".google-btn", { hasText: "Continue with Google" }).count()) === 1, "login shows Continue with Google");
await anon.goto(B + "/signup?role=AUTHOR");
ok((await anon.locator(".google-btn").getAttribute("href")) === "/api/auth/google?role=AUTHOR", "author sign-up passes the Author choice to Google");

// Starting sends the browser to Google with PKCE, state and nonce, and the registered redirect address
const start = await fetch(B + "/api/auth/google?next=/cart", { redirect: "manual" });
const to = new URL(start.headers.get("location") ?? "http://x");
ok(start.status === 303 && to.origin === "https://accounts.google.com", "start redirects to Google");
ok(to.searchParams.get("client_id") === "e2e-google-client" && to.searchParams.get("redirect_uri") === `${B}/api/auth/google/callback`, "with our client id and callback address");
ok(to.searchParams.get("code_challenge_method") === "S256" && !!to.searchParams.get("state") && !!to.searchParams.get("nonce") && to.searchParams.get("scope") === "openid email profile", "with PKCE, state, nonce and basic scopes only");
ok(/g_flow=.*HttpOnly/i.test(start.headers.get("set-cookie") ?? ""), "the flow secrets stay in an HttpOnly cookie");

// A forged or stale return from "Google" is rejected
const bad = await fetch(B + "/api/auth/google/callback?code=abc&state=forged", { redirect: "manual" });
ok(bad.status === 303 && (bad.headers.get("location") ?? "").endsWith("/login"), "a callback without our state is rejected");

// New Google user finishes sign-up as an author (pending profile cookie, as the callback would set it)
const env = readFileSync(".env", "utf8");
const secret = process.env.SESSION_SECRET ?? (env.match(/^SESSION_SECRET="?([^"\n]+)"?/m) ?? [])[1];
const pending = await new SignJWT({ sub: "google-e2e-1", email: "rosa.google@example.com", name: "Rosa Google", role: "AUTHOR" })
  .setProtectedHeader({ alg: "HS256" }).setExpirationTime("20m").sign(new TextEncoder().encode(secret));
const fresh = await ctx();
await fresh.context().addCookies([{ name: "g_pending", value: pending, url: B }]);
await fresh.goto(B + "/signup/google");
ok((await text(fresh)).includes("rosa.google@example.com") && (await fresh.locator(".role-opt.on b").innerText()) === "Author", "finish page shows the Google email with Author pre-selected");
await fresh.getByRole("button", { name: "Create my account" }).click(); await fresh.waitForURL("**/dashboard/author**");
const rosa = await db.user.findUnique({ where: { email: "rosa.google@example.com" } });
ok(rosa?.googleId === "google-e2e-1" && rosa.role === "AUTHOR" && rosa.status === "PENDING" && rosa.slug === "rosa-google", "Google author account created (pending review, linked, with a storefront link)");
await fresh.goto(B + "/signup/google"); ok(fresh.url().includes("/dashboard"), "the finish page can't be reused once signed in");
const noPending = await ctx(); await noPending.goto(B + "/signup/google"); ok(noPending.url().endsWith("/signup"), "without a Google sign-in the finish page sends you to normal sign-up");

ok(errors.length === 0, "no page errors" + (errors.length ? ": " + errors.join(" | ") : ""));
await browser.close(); await db.$disconnect();
