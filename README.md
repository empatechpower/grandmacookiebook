# South Texas Book & Author — buy books, book authors, host talks

A marketplace with three roles:

| Role | Can do |
|---|---|
| **Buyer** (normal user) | Browse and buy books (cart → checkout), request an author for a visit/speech, pay once the author accepts, track orders and bookings |
| **Author** | Connect Stripe once; list books (price, stock, cover) and visit packages (format, duration, fee, travel region); accept/decline booking requests; ship orders. Gets paid automatically on every sale |
| **Super admin** | Approve/suspend authors and users, approve/reject listings, see every order and booking, refund/cancel (reverses the author's share), retry failed transfers, set commission, add other admins |

The UI is built from `bookanauthor-atelier.html` (same palette, Fraunces/Outfit type, cards and dashboards).

## Run it

Needs Node 20+ and a Postgres database. Pick one:
- **`npm run db:local`**: runs Postgres 17 from `node_modules`, no Docker needed. Keep it running in its own terminal; data lives in `./.postgres`.
- **`npm run db:up`**: Postgres in Docker (`docker-compose.yml`).
- **Hosted** (Neon, Supabase, Railway): paste its URL into `DATABASE_URL`.

```bash
npm install
cp .env.example .env        # then set SESSION_SECRET (openssl rand -base64 32)
npm run db:local            # terminal 1: leave running (or db:up / hosted URL)
npm run setup               # terminal 2: applies migrations and loads demo data (first time only)
npm run dev                 # http://localhost:3000
```

Demo accounts (password `atelier123`): `buyer@atelier.test`, `author@atelier.test`, `admin@atelier.test`.
`npm run db:reset` wipes and reloads the demo data. After changing `prisma/schema.prisma`, run `npm run db:migrate` to create a migration; production applies them with `npm run db:deploy`.

## Deploy (Vercel)

1. Import the GitHub repo in Vercel (root `./`, preset Next.js). `vercel.json` sets the build command (`prisma migrate deploy && next build`) and the cron jobs.
2. Add a Postgres database: the **Neon** integration sets `DATABASE_URL` and `DATABASE_URL_UNPOOLED` automatically. With another host, set both (the unpooled/direct URL is used for migrations).
3. Add `SESSION_SECRET` and `CRON_SECRET` (long random strings), plus Stripe, Resend, `S3_*` and `LEGAL_*` variables when ready (see `.env.example`).
4. Deploy. For a client preview, load demo data once: `DATABASE_URL="<url>" DATABASE_URL_UNPOOLED="<url>" npm run setup`.

Vercel's Hobby plan is non-commercial only. The live marketplace needs Pro.

## Key flows

**Listing approval.** Author signs up → account `PENDING`. Their books/packages are `PENDING` too. Nothing is public until the admin approves the author **and** each listing **and** the author has finished Stripe onboarding (so there's always somewhere to send their money). Editing a live listing's content sends it back for review; price/stock edits go live immediately. Suspending an author hides all their listings and signs them out.

**Buying a book.** Buyer adds to cart → checkout with shipping address → order created `PENDING` with stock reserved → Stripe Checkout → `PAID`. If the checkout expires unpaid (30 min), the order is cancelled and stock released. Each line is fulfilled by its own author (`PAID → SHIPPED → DELIVERED`).

**Finding an author.** `/authors` is the directory: keyword search (name, headline, bio, book and talk titles) plus filters for topic, grade level/audience, format (hybrid counts as both), budget, available date, location, language and community tags (#BlackOwned, #Bilingual…). Authors fill these in under **Studio → Public profile**. Tag lists are stored as `,a,b,` strings so one tag can be matched exactly with a simple `contains`.

**Availability.** Authors open days under **Studio → Availability** (click a day, or "Open all weekdays"). If an author has open days, buyers must pick one of them and days already accepted/confirmed disappear. If they publish none, buyers can propose any date.

**Messages.** Buyers can message any bookable author from their profile. Authors can reply, and can start a thread only with buyers who already booked or ordered from them. Threads refresh every few seconds; the side nav shows an unread count. Admins can't read messages.

**Booking a visit.** `PENDING` (buyer requests date/venue/audience) → `ACCEPTED` (author, optionally with a final quote that adds travel costs) → `CONFIRMED` (buyer pays) → `COMPLETED` (author, after the event date). Can also end `DECLINED` or `CANCELLED`. Buyers can cancel before paying; paid bookings are cancelled by an admin.

**Money — Stripe Connect with a 14-day hold.** Uses "separate charges and transfers": the buyer pays the platform and the money is **held**. The author's share (price − commission) is transferred to their Stripe Express account when:
- **books:** the buyer clicks *Mark received*, or 14 days after payment;
- **visits:** the buyer clicks *Confirm visit* (on/after the event date), or 14 days after the event.

Held payments are released by a daily job, `GET /api/cron/release-payouts` with `Authorization: Bearer $CRON_SECRET` (`vercel.json` schedules it on Vercel; elsewhere use any cron). Admins can also *Release now* per sale, or *Release due payouts now* from the admin overview.
- Commission (default 5% on book sales / 15% on author bookings) is snapshotted onto each order line and booking, so changing rates never rewrites history. The platform pays Stripe's processing fees out of its commission.
- Refunds during the hold come straight out of the held payment. After release, a refund also reverses the author's transfer; if the author already withdrew it, the reversal can fail and the admin gets a warning (the platform has covered that refund).
- A transfer that fails (e.g. author's account restricted) is flagged in admin Orders/Bookings with **Retry**. Transfers use idempotency keys, so retries and duplicate webhooks never pay twice.

**Email.** Transactional emails (booking requests/acceptances/confirmations, order receipts, shipping, refunds, payouts, first unread message in a thread, listing reviews, author approval, admin alerts for new authors, listings and contact messages) are sent through [Resend](https://resend.com) after the response, so a failing provider never breaks an action. Without `RESEND_API_KEY` they're printed to the server log. All wording lives in `src/lib/notify.ts`.

**Author dashboard.** Menu: Dashboard (earnings, orders, bookings, book sales, payment status, booking activity, order tracking), Bookings (+ Availability, Opportunities, Messages), Orders, Listings (visit packages), Products (books & merchandise, ★ featured, extra photos), Storefront (+ Media, Reviews), Settings (+ Payouts, Referrals, password).

**Storefront.** Each author has a public page at `/authors/<slug>` (custom, editable link; the id link keeps working) with bio, website, Facebook, Instagram, TikTok, a media gallery (photos, videos — YouTube/Vimeo play inline — interviews, school visits, awards), featured products first, listings, reviews.

**Orders & shipping.** Authors see the customer's name, organization, email, phone and shipping address; add a carrier + tracking number when shipping (USPS/UPS/FedEx/DHL link automatically) and can update it later; the customer is emailed the tracking link. Authors and admins can export orders as CSV. Bookings have a start time.

**Admin notifications.** Admins are emailed for every booking request, booking payment, cancellation and order, plus new authors, listings, problem reports, referrals and contact messages.

**Reviews.** Buyers can review an author (1–5 stars + text) after a visit is completed or a book is marked received, once per sale; they're emailed a prompt. Ratings show on author cards and profiles, and the directory can sort by *Top rated*. Authors post one public reply per review (Studio → Reviews). Admins can hide abusive reviews (Admin → Reviews), which also removes them from the average (cached on the user as `ratingAvg`/`ratingCount`).

**Report a problem (money-back guarantee).** While payment is still held, buyers can report a problem on an order line or booking. That pauses the automatic release and alerts admins and the author. In Admin → Problem reports, the admin either **refunds the buyer** (from the held money) or **releases payment to the author**; both sides are emailed the outcome.

**Requests for proposals (RFPs).** Buyers post an event request (date, audience, format, topic/grade, budget, bid deadline) at Dashboard → Requests & bids. Matching authors are emailed and bid from Studio → Opportunities, attaching one of their visit packages and a fee (editable until decided). Accepting a bid creates an *accepted* booking at the bid price, declines the others and marks the request awarded; the buyer then pays as usual.

**Cancellations.** Buyers can cancel unpaid requests freely. Paid bookings cancelled at least `cancelNoticeDays` (default 7, in Admin → Fees) before the event are refunded in full; later cancellations aren't refunded and the author is paid straight away (status `LATE_CANCELLED`), matching the reference site's "guaranteed payment for last-minute cancellations".

**Classroom-set pricing.** Books can have a bulk price per copy from a minimum quantity; the cart and checkout apply it automatically. There's also a *Gift sets & merchandise* category.

**Content (admin-edited).** *Collections* (Admin → Collections) are curated lists of authors and books with curator notes — the Featured Author Catalog, Educator's Monthly Favorites, themed months; featured ones show on the home page (use them for sponsored placements too). *Articles* (Admin → News & events) power `/news`, `/resources` and `/events`, with simple formatting (blank-line paragraphs, `## ` headings, `- ` bullets).

**Marketing pages.** `/for-schools`, `/for-business`, `/for-authors`, `/book-fairs` (request form) and `/book-bank` (Disaster Relief Book Bank request/donate forms). Form submissions land in the admin Contact inbox.

**Referral program** (modelled on bookanauthor.com/referral). Authors submit a referral form (name + email) under Studio → Referrals; the referred person gets an invitation email with a sign-up link. The first form submitted for an email wins, and an admin verifies each referral (Admin → Referrals). The referrer then earns **2% of every sale** the referred author makes for **12 months** from the referral date (both adjustable in Admin → Fees). Only authors with an active account and a live listing earn. A reward accrues when a sale's payment is released (refunded sales don't count) and is paid quarterly, by Stripe transfer to the referrer's connected account or recorded as a manual payout. The reference site pays via Zelle; this uses Stripe. The quarterly job is `GET /api/cron/referral-payouts`.

**Organisations.** Buyers choose who they book for (school, library, business, nonprofit, individual) and an organisation name at sign-up or in their profile. It prefills booking forms and is shown to authors and on reviews.

**Contracts (optional).** Either side can attach a PDF contract to an active booking; it's stored privately and only the buyer, author and admins can download it (`/api/contracts/[bookingId]`). A printable sample agreement lives at `/resources/sample-contract`.

**Accounts & security.** Passwords are bcrypt-hashed; sessions are signed httpOnly cookies. *Forgot password* emails a single-use link valid for 60 minutes (only its SHA-256 hash is stored; max 3 per hour; the reply never reveals whether an email is registered). Resetting or changing a password bumps the user's `sessionVersion`, signing out every other device, and emails a "password changed" alert.

**Uploads.** Author photos and book covers (JPEG/PNG/WebP, max 5 MB, checked by file content — not name). Stored in `./uploads` locally, or any S3-compatible bucket when `S3_BUCKET` is set (required on serverless hosts like Vercel, whose disk isn't persistent). Pasting an image URL still works.

**Public pages.** `/pricing` (reads live commission from settings), `/contact` (stored in the admin **Contact inbox**, honeypot spam filter), `/privacy` and `/terms`.

### Stripe setup

Without `STRIPE_SECRET_KEY` the app runs in **demo mode**: payments succeed instantly and transfers are simulated (demo authors have `acct_mock_…` accounts).

To use real Stripe (test mode first):
1. In the Stripe dashboard, enable **Connect** (platform / marketplace, Express accounts).
2. Put the secret key in `.env` as `STRIPE_SECRET_KEY`.
3. Webhook: locally run `stripe listen --forward-to localhost:3000/api/stripe/webhook --forward-connect-to localhost:3000/api/stripe/webhook` and copy the `whsec_…` into `STRIPE_WEBHOOK_SECRET`. In production, add two endpoints at `https://<domain>/api/stripe/webhook`: one listening to *Your account* events (`checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`), whose signing secret goes in `STRIPE_WEBHOOK_SECRET`, and one listening to *Connected accounts* events (`account.updated`), whose secret goes in `STRIPE_CONNECT_WEBHOOK_SECRET`.
4. `APP_URL` is optional on Vercel: links default to the production domain (your custom domain once added). The `.vercel.app` address keeps working after a custom domain is added, so the Stripe webhook URL can stay on it — just don't redirect `.vercel.app` to the custom domain, because Stripe doesn't follow redirects.
5. Run `npm run db:reset` — the mock demo accounts can't receive real transfers, so connect a real test author through **Studio → Payouts → Connect Stripe**.

**Country note:** Stripe Connect needs the platform's Stripe account in a supported country. If authors live in a different country from the platform, Stripe requires cross-border payouts with the "recipient" service agreement — confirm the client's and authors' countries before launch.

## Code map

```
prisma/schema.prisma      data model (money in integer cents)
prisma/migrations/        SQL migrations (Postgres)
prisma/seed.ts            demo data
src/lib/                  auth/session, db, settings, earnings
src/lib/payments.ts       the only Stripe code (checkout, transfers, refunds, Connect)
src/lib/fulfillment.ts    idempotent "payment succeeded → mark paid → pay authors"
src/lib/notify.ts         every transactional email
src/lib/storage.ts        image upload validation + local/S3 storage
src/app/api/stripe/       webhook
src/app/api/cron/         daily payout release, quarterly referral payouts
src/lib/referrals.ts      referral accrual and payouts
src/app/actions/          server actions — every one re-checks role + ownership
src/app/(public pages)    /, /books, /visits, /authors/[id], /cart, /login, /signup
src/app/dashboard/        buyer/, author/, admin/ desks
```

## Before production

- **Stripe** — add live keys and webhook endpoints (see Stripe setup), and confirm supported countries.
- **Brand** — the name lives in `src/lib/brand.ts`; footer social links come from `SOCIAL_*` variables.
- **Legal pages** — set `LEGAL_COMPANY_NAME`, `LEGAL_ADDRESS`, `LEGAL_JURISDICTION`, `SUPPORT_EMAIL`, and have a lawyer review `/terms` and `/privacy`. They're templates written to match how this platform works, not legal advice.
- **Cron** — set `CRON_SECRET` and schedule `/api/cron/release-payouts` daily (or held payouts only release when buyers confirm) and `/api/cron/referral-payouts` quarterly. `vercel.json` already does both on Vercel.
- **Referral economics** — the 2% reward is paid from the platform's commission. On book sales (5% commission) that's 40% of the platform's cut, so confirm the rate with the client.
- **Email** — set `RESEND_API_KEY` and a verified sending domain in `EMAIL_FROM`.
- **Database** — point `DATABASE_URL` at a managed Postgres with backups, and run `npm run db:deploy` on each release (don't run the demo seed in production). Create the real admin with the seed's pattern or by inviting from an existing admin.
- **Uploads** — set the `S3_*` variables, e.g. a Cloudflare R2 bucket with a public domain. Block public access to the `contracts/` prefix; contracts are served only through the app. Images aren't resized yet; consider an image CDN if pages feel heavy.
- **Email verification** isn't built (anyone can sign up with any address). Worth adding before opening author signups widely.
