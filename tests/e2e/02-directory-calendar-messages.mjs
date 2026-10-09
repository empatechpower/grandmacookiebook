// Run via `npm run test:e2e` (scripts/e2e.sh), which builds, starts the app and reseeds before each suite.
import { chromium } from "playwright-core";
const B = process.env.BASE_URL ?? "http://localhost:3917", S = process.env.E2E_ARTIFACTS ?? "tests/e2e/.artifacts";
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const errors = [];
const ctx = async (w = 1280) => { const c = await browser.newContext({ viewport: { width: w, height: 900 } }); const p = await c.newPage();
  p.on("pageerror", e => errors.push(e.message)); p.on("console", m => m.type()==="error" && errors.push(m.text())); p.on("dialog", d => d.accept()); return p; };
const ok = (cond, msg) => { console.log((cond ? "PASS " : "FAIL ") + msg); if (!cond) process.exitCode = 1; };
const names = async p => (await p.locator(".author-card h3").allInnerTexts()).sort().join(", ");
const login = async (p, email) => { await p.goto(B + "/login"); await p.fill("#email", email); await p.fill("#password", "atelier123"); await p.click("button[type=submit]"); await p.waitForURL("**/dashboard/**"); };

// Directory + filters
const anon = await ctx();
await anon.goto(B); ok((await anon.locator(".author-card").count()) === 8, "home shows 8 featured authors");
await anon.goto(B + "/authors"); ok((await anon.locator(".author-card").count()) === 8, "directory lists 8 bookable authors (pending one hidden)");
await anon.screenshot({ path: `${S}/11-directory.png`, fullPage: true });
const cases = [
  ["topic=sel", "Jayme Branagh, Jeanette Gil"],
  ["grade=adult", "Jayme Branagh, Marcus Bell, Meena Julapalli"],
  ["format=VIRTUAL", "Allie Davis, Jayme Branagh, Jeanette Gil"],
  ["budget=500", "Jeanette Gil, Susan Friedland"],
  ["language=spanish", "Jeanette Gil, Miriam Bejerano"],
  ["identity=bilingual", "Jeanette Gil, Miriam Bejerano"],
  ["identity=women-authors", "Jeanette Gil, Meena Julapalli, Susan Friedland"],
  ["identity=men-authors", "Mike Crowder"],
  ["q=astronomy", "Allie Davis"],
  ["location=harlingen", "Meena Julapalli"],
  ["topic=sel&grade=prek", "Jeanette Gil"],
];
for (const [qs, want] of cases) { await anon.goto(`${B}/authors?${qs}`); const got = await names(anon); ok(got === want, `filter ${qs} -> ${got}`); }
await anon.goto(B + "/authors");
ok(JSON.stringify(await anon.locator("[aria-label='Quick topics'] .filter").allInnerTexts()) === JSON.stringify(["#SEL", "#STEM", "#BilingualAuthors", "#WomenAuthors", "#MenAuthors"]), "Find Authors shows the five tags");
await anon.goto(B + "/books"); ok((await anon.locator("body").innerText()).includes("Bulk book purchase") && !(await anon.locator("body").innerText()).includes("Gift sets"), "books filter renamed to Bulk book purchase");
ok((await anon.locator(".topbar").getByRole("link", { name: "Author Visit" }).count()) === 1, "top menu says Author Visit");
await anon.goto(B + "/authors?sort=price-asc"); ok((await anon.locator(".author-card h3").first().innerText()) === "Susan Friedland", "sort by price low→high");
await anon.goto(B + "/books?q=night"); ok((await anon.locator(".card").count()) === 1, "book keyword search");
await anon.goto(B + "/visits?format=VIRTUAL"); ok((await anon.locator(".card").count()) === 3, "virtual filter includes hybrid packages");

// Author profile edit shows publicly
const author = await ctx();
await login(author, "author@atelier.test");
await author.goto(B + "/dashboard/author/profile");
await author.fill("#headline", "Storyteller for every classroom");
await author.check("input[name=topics][value=sel]");
await author.getByRole("button", { name: "Save profile" }).click(); await author.waitForLoadState("networkidle");
await anon.goto(B + "/authors?topic=sel"); ok((await names(anon)).includes("Marcus Bell"), "author topic edit appears in directory filter");
const chikeUrl = await anon.locator(".author-card", { hasText: "Marcus" }).locator("h3 a").getAttribute("href");
await anon.goto(B + chikeUrl); ok((await anon.locator("body").innerText()).includes("Storyteller for every classroom"), "headline on public profile");

// Availability: Chike opens a day next month
await author.goto(B + "/dashboard/author/availability");
const nextMonth = await author.getByRole("link", { name: "Next →" }).getAttribute("href");
await author.goto(B + "/dashboard/author/availability" + nextMonth);
const day = author.locator(".cal button:not([disabled])").nth(9);
const dayKey = await day.getAttribute("value");
await day.click(); await author.locator(`.cal button[value="${dayKey}"].open`).waitFor();
ok(true, `author opened ${dayKey}`);
await author.screenshot({ path: `${S}/12-availability.png`, fullPage: true });

// Buyer: messages author, books the open date
const buyer = await ctx();
await login(buyer, "buyer@atelier.test");
ok((await buyer.locator(".side").innerText()).includes("Messages"), "buyer has Messages in nav");
await buyer.goto(B + chikeUrl);
await buyer.getByRole("button", { name: "Message Marcus" }).click(); await buyer.waitForURL("**/dashboard/messages/**");
ok((await buyer.locator(".bubble").count()) === 3, "existing seeded thread opens");
await buyer.fill("textarea[name=body]", "Can you also bring signed copies?"); await buyer.getByRole("button", { name: "Send" }).click();
await buyer.locator(".bubble.mine", { hasText: "signed copies" }).waitFor();
ok(await buyer.locator("textarea[name=body]").inputValue() === "", "composer cleared after send");
await buyer.goto(B + chikeUrl); await buyer.getByRole("link", { name: "Request booking" }).first().click(); await buyer.waitForURL("**/visits/**");
const chips = buyer.locator(".date-chip");
ok((await chips.count()) === 1, "booking form offers only the author's open date");
await buyer.screenshot({ path: `${S}/13-date-picker.png`, fullPage: true });
await chips.first().click();
await buyer.fill("#organisation", "Calendar School"); await buyer.fill("#audienceSize", "60"); await buyer.fill("#venue", "Hall B");
await buyer.click("text=Send request"); await buyer.waitForURL("**/dashboard/buyer/bookings");

// Author: unread badge, reply, accept with quote
await author.goto(B + "/dashboard/author");
ok((await author.locator(".side .nav-count").innerText()) === "1", "author sees unread message count");
await author.goto(B + "/dashboard/messages"); await author.locator(".inbox a").first().click();
await author.fill("textarea[name=body]", "Yes, I'll bring 40 signed copies!"); await author.keyboard.press("Enter");
await author.locator(".bubble.mine", { hasText: "40 signed copies" }).waitFor();
ok(true, "author replied with Enter key");
await author.goto(B + "/dashboard/author/requests");
const row = author.locator("tr", { hasText: "Calendar School" });
await row.locator("input[name=fee]").fill("720"); await row.locator("input[name=note]").fill("Includes travel to Oxbridge");
await row.getByRole("button", { name: "Accept" }).click(); await row.getByText("Awaiting buyer payment").waitFor();
ok(true, "author accepted with quote");
await author.goto(B + "/dashboard/author/availability" + nextMonth);
ok((await author.locator(`.cal button[value="${dayKey}"]`).innerText()).toLowerCase().includes("booked"), "accepted day shows as Booked");

// Buyer sees quote and the date is no longer offered
await buyer.goto(B + "/dashboard/messages"); await buyer.locator(".inbox a").first().click(); await buyer.waitForURL("**/messages/c*");
ok((await buyer.locator(".bubble", { hasText: "40 signed copies" }).count()) === 1, "buyer sees author reply");
ok((await buyer.locator(".alert").innerText()).includes("$720"), "thread shows booking context with quote");
await buyer.goto(B + "/dashboard/buyer/bookings");
const brow = buyer.locator("tr", { hasText: "Calendar School" });
ok((await brow.innerText()).includes("$720") && (await brow.innerText()).includes("Includes travel"), "buyer sees final quote + note");
await brow.getByRole("button", { name: /Pay \$720/ }).click(); await brow.getByText("Confirmed").waitFor();
ok(true, "buyer paid quoted fee");
await buyer.goto(B + chikeUrl); await buyer.getByRole("link", { name: "Request booking" }).first().click(); await buyer.waitForURL("**/visits/**");
ok((await buyer.locator(".date-chip").count()) === 0, "booked date no longer offered");

// Admin has no messages; mobile directory
const admin = await ctx(); await login(admin, "admin@atelier.test");
await admin.goto(B + "/dashboard/messages"); ok(!admin.url().includes("/messages"), "admin cannot open messages");
const m = await ctx(390); await m.goto(B + "/authors");
ok(await m.evaluate(() => document.documentElement.scrollWidth <= 390), "no horizontal scroll on mobile directory");
await m.screenshot({ path: `${S}/14-mobile-directory.png` });

ok(errors.length === 0, "no browser console errors" + (errors.length ? ": " + errors.slice(0, 3).join(" | ") : ""));
await browser.close();
