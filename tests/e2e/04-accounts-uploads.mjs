// Run via `npm run test:e2e` (scripts/e2e.sh), which builds, starts the app and reseeds before each suite.
import { chromium } from "playwright-core";
import { readFileSync } from "fs";
const B = process.env.BASE_URL ?? "http://localhost:3917", S = process.env.E2E_ARTIFACTS ?? "tests/e2e/.artifacts";
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const errors = [];
const ctx = async () => { const p = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); p.on("pageerror", e => errors.push(e.message)); p.on("dialog", d => d.accept()); return p; };
const login = async (p, email, pw = "atelier123") => { await p.goto(B + "/login"); await p.fill("#email", email); await p.fill("#password", pw); await p.click("button[type=submit]"); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const lastResetLink = (email) => {
  const log = readFileSync(process.env.SERVER_LOG ?? `${S}/server.log`, "utf8");
  const blocks = log.split("[email] ").filter(b => b.startsWith(`to=${email} subject="Reset your Grandma Cookie Book password"`));
  return blocks.length ? blocks.at(-1).match(/(http:\/\/\S+reset-password\?token=\S+)/)?.[1] : null;
};

// --- Password reset
const anon = await ctx();
await anon.goto(B + "/login"); await anon.getByRole("link", { name: "Forgot password?" }).click(); await anon.waitForURL("**/forgot-password");
await anon.fill("#email", "nobody@nowhere.test"); await anon.getByRole("button", { name: "Send reset link" }).click();
await anon.getByText("If an account exists").waitFor();
ok(true, "unknown email gets the same neutral reply");
const other = await ctx(); await login(other, "jeanette@atelier.test"); await other.waitForURL("**/dashboard/**");
await anon.goto(B + "/forgot-password"); await anon.fill("#email", "jeanette@atelier.test"); await anon.getByRole("button", { name: "Send reset link" }).click();
await anon.getByText("If an account exists").waitFor(); await sleep(600);
const link = lastResetLink("jeanette@atelier.test");
ok(!!link, "reset email sent with a link");
await anon.goto(link); await anon.fill("#password", "newpass123"); await anon.fill("#confirm", "different1");
await anon.getByRole("button", { name: "Set new password" }).click(); await anon.getByText("don't match").waitFor();
ok(true, "mismatched passwords rejected");
await anon.fill("#password", "newpass123"); await anon.fill("#confirm", "newpass123");
await anon.getByRole("button", { name: "Set new password" }).click(); await anon.waitForURL("**/dashboard/author");
ok(true, "reset signs the user in");
await other.goto(B + "/dashboard/author"); ok(other.url().includes("/login"), "reset signs out other sessions");
const again = await ctx(); await again.goto(link); await again.fill("#password", "another123"); await again.fill("#confirm", "another123");
await again.getByRole("button", { name: "Set new password" }).click(); await again.getByText("invalid or has expired").waitFor();
ok(true, "reset link works only once");
const fresh = await ctx(); await login(fresh, "jeanette@atelier.test", "atelier123"); await fresh.getByText("incorrect").waitFor();
ok(true, "old password no longer works");
await login(fresh, "jeanette@atelier.test", "newpass123"); await fresh.waitForURL("**/dashboard/**");
ok(true, "new password works");
await sleep(400);
ok(/to=jeanette@atelier\.test subject="Your Grandma Cookie Book password was changed"/.test(readFileSync(process.env.SERVER_LOG ?? `${S}/server.log`, "utf8")), "password-changed alert emailed");

// --- Change password (signed in) signs out other devices
const a1 = await ctx(); await login(a1, "buyer@atelier.test"); await a1.waitForURL("**/dashboard/**");
const a2 = await ctx(); await login(a2, "buyer@atelier.test"); await a2.waitForURL("**/dashboard/**");
await a1.goto(B + "/dashboard/buyer/profile");
await a1.fill("#current", "wrong-one"); await a1.fill("#password", "buyerpass9"); await a1.fill("#confirm", "buyerpass9");
await a1.getByRole("button", { name: "Change password" }).click(); await a1.getByText("Current password is incorrect").waitFor();
ok(true, "change password requires the current password");
await a1.fill("#current", "atelier123"); await a1.fill("#password", "buyerpass9"); await a1.fill("#confirm", "buyerpass9");
await a1.getByRole("button", { name: "Change password" }).click(); await a1.waitForURL("**/dashboard/buyer");
await a1.goto(B + "/dashboard/buyer/orders"); ok(a1.url().includes("/dashboard/buyer/orders"), "this device stays signed in");
await a2.goto(B + "/dashboard/buyer/orders"); ok(a2.url().includes("/login"), "other device signed out");

// --- Uploads
const au = await ctx(); await login(au, "author@atelier.test"); await au.waitForURL("**/dashboard/**");
await au.goto(B + "/dashboard/author/profile");
await au.setInputFiles("#avatarFile", `${S}/fake.png`); await au.getByRole("button", { name: "Save profile" }).click();
await au.locator(".toast.on").waitFor(); ok((await au.locator(".toast").innerText()).includes("JPEG, PNG or WebP"), "non-image disguised as .png rejected");
await au.goto(B + "/dashboard/author/profile");
await au.setInputFiles("#avatarFile", `${S}/huge.png`); await au.getByRole("button", { name: "Save profile" }).click();
await sleep(1500); const hugeToast = await au.locator(".toast").innerText().catch(() => "");
ok(/5 MB/.test(hugeToast) || !(await au.locator("#avatarUrl").inputValue()).startsWith("/uploads/"), "oversized image rejected");
await au.goto(B + "/dashboard/author/profile");
await au.setInputFiles("#avatarFile", `${S}/avatar.png`); await au.getByRole("button", { name: "Save profile" }).click();
await au.getByText("Profile saved").waitFor();
const avatar = await au.locator("#avatarUrl").inputValue();
ok(/^\/uploads\/avatars\/[0-9a-f-]{36}\.png$/.test(avatar), "avatar uploaded: " + avatar);
const img = await fetch(B + avatar);
ok(img.status === 200 && img.headers.get("content-type") === "image/png" && img.headers.get("x-content-type-options") === "nosniff", "upload served as image/png with nosniff");
await au.getByRole("button", { name: "Save profile" }).click(); await au.getByText("Profile saved").waitFor();
ok((await au.locator("#avatarUrl").inputValue()) === avatar, "re-saving profile keeps uploaded photo");
await anon.goto(B + "/authors"); ok((await anon.locator(`.author-card img[src="${avatar}"]`).count()) === 1, "photo shows in directory");
await au.goto(B + "/dashboard/author/books");
await au.locator("tr", { hasText: "Nature Sketchbook" }).getByRole("link", { name: "Edit" }).click(); await au.waitForURL("**/books/**");
await au.setInputFiles("#coverFile", `${S}/cover.png`); await au.getByRole("button", { name: "Save changes" }).click();
await au.waitForURL("**/dashboard/author/books");
ok((await au.locator("tr", { hasText: "Nature Sketchbook" }).innerText()).includes("Pending"), "new cover sends book back to review");
for (const bad of ["/uploads/..%2F..%2F.env", "/uploads/avatars/..%2F..%2Fpackage.json", "/uploads/other/x.png", "/uploads/avatars/not-a-uuid.png"]) {
  ok((await fetch(B + bad)).status === 404, `blocked ${bad}`);
}
ok(errors.length === 0, "no page errors" + (errors.length ? ": " + errors[0] : ""));
await browser.close();
