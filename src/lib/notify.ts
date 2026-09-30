import "server-only";
import { db } from "./db";
import { sendEmail, type Email } from "./email";
import { money, net } from "./money";
import { appUrl } from "./url";
import { fmtDate } from "./dates";

/** Every transactional email the platform sends, in one place. */

const first = (name: string) => name.split(" ")[0];

async function toAdmins(make: (to: string) => Email) {
  const admins = await db.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { email: true } });
  sendEmail(admins.map((a) => make(a.email)));
}

// ---------- Accounts & listings ----------

export async function authorSignedUp(author: { name: string; email: string }) {
  const url = `${await appUrl()}/dashboard/admin/users?filter=pending`;
  await toAdmins((to) => ({
    to,
    subject: `New author awaiting approval: ${author.name}`,
    lines: [`${author.name} (${author.email}) just created an author account and is waiting for approval.`],
    cta: { label: "Review authors", url },
  }));
}

export async function authorApproved(author: { name: string; email: string; payoutsReady: boolean }) {
  const base = await appUrl();
  sendEmail({
    to: author.email,
    subject: "Your Atelier author account is approved",
    lines: [
      `Hi ${first(author.name)}, your author account has been approved.`,
      author.payoutsReady
        ? "Your approved listings are now visible to buyers."
        : "One more step: connect Stripe so you can be paid. Your listings stay hidden until you do.",
    ],
    cta: author.payoutsReady ? { label: "Open your studio", url: `${base}/dashboard/author` } : { label: "Set up payouts", url: `${base}/dashboard/author/payouts` },
  });
}

export async function listingSubmitted(kind: "book" | "package", title: string, authorName: string) {
  const url = `${await appUrl()}/dashboard/admin/listings`;
  await toAdmins((to) => ({
    to,
    subject: `New ${kind === "book" ? "book" : "visit package"} to review: ${title}`,
    lines: [`${authorName} submitted “${title}” for review.`],
    cta: { label: "Review listings", url },
  }));
}

export async function listingReviewed(opts: { kind: "book" | "package"; title: string; approved: boolean; note: string | null; author: { name: string; email: string } }) {
  const base = await appUrl();
  sendEmail({
    to: opts.author.email,
    subject: opts.approved ? `“${opts.title}” is approved` : `Changes needed on “${opts.title}”`,
    lines: [
      opts.approved
        ? `Good news, ${first(opts.author.name)}: “${opts.title}” has been approved.`
        : `Hi ${first(opts.author.name)}, “${opts.title}” wasn't approved yet.`,
      ...(opts.note ? [`Admin note: ${opts.note}`] : []),
    ],
    cta: { label: "View your listings", url: `${base}/dashboard/author/${opts.kind === "book" ? "books" : "visits"}` },
  });
}

// ---------- Bookings ----------

const bookingWithPeople = (id: string) =>
  db.booking.findUniqueOrThrow({
    where: { id },
    include: { package: true, buyer: { select: { name: true, email: true } }, author: { select: { name: true, email: true } } },
  });

export async function bookingRequested(bookingId: string) {
  const b = await bookingWithPeople(bookingId);
  const base = await appUrl();
  sendEmail({
    to: b.author.email,
    subject: `New booking request: ${b.package.title} on ${fmtDate(b.eventDate)}`,
    lines: [
      `${b.buyer.name} requested “${b.package.title}” for ${b.organisation} on ${fmtDate(b.eventDate)}.`,
      `Venue: ${b.venue} · Audience: ${b.audienceSize}`,
      ...(b.message ? [`Their note: “${b.message}”`] : []),
      "Accept (you can adjust the fee to include travel) or decline from your studio.",
    ],
    cta: { label: "Respond to request", url: `${base}/dashboard/author/requests` },
  });
}

export async function bookingResponded(bookingId: string) {
  const b = await bookingWithPeople(bookingId);
  const base = await appUrl();
  const accepted = b.status === "ACCEPTED";
  sendEmail({
    to: b.buyer.email,
    subject: accepted ? `${b.author.name} accepted your booking — pay to confirm` : `${b.author.name} can't make ${fmtDate(b.eventDate)}`,
    lines: accepted
      ? [
          `${b.author.name} accepted “${b.package.title}” on ${fmtDate(b.eventDate)}.`,
          `Final fee: ${money(b.fee)}.${b.authorNote ? ` Note from the author: “${b.authorNote}”` : ""}`,
          "Pay to confirm the date. Your payment is held by Atelier and only released to the author after the visit.",
        ]
      : [
          `${b.author.name} declined “${b.package.title}” on ${fmtDate(b.eventDate)}.${b.authorNote ? ` Their note: “${b.authorNote}”` : ""}`,
          "You haven't been charged. You can message them about another date or browse other authors.",
        ],
    cta: accepted ? { label: `Pay ${money(b.fee)}`, url: `${base}/dashboard/buyer/bookings` } : { label: "Find an author", url: `${base}/authors` },
  });
}

export async function bookingPaid(bookingId: string) {
  const b = await bookingWithPeople(bookingId);
  const base = await appUrl();
  sendEmail([
    {
      to: b.buyer.email,
      subject: `Booking confirmed: ${b.package.title} on ${fmtDate(b.eventDate)}`,
      lines: [
        `Payment of ${money(b.fee)} received — B-${b.number} is confirmed.`,
        `After the visit, mark it complete so ${first(b.author.name)} gets paid. If you don't, payment releases automatically 14 days after the event.`,
      ],
      cta: { label: "View booking", url: `${base}/dashboard/buyer/bookings` },
    },
    {
      to: b.author.email,
      subject: `Confirmed and paid: ${b.organisation} on ${fmtDate(b.eventDate)}`,
      lines: [
        `${b.buyer.name} paid for “${b.package.title}” on ${fmtDate(b.eventDate)}.`,
        `Your share, ${money(net(b.fee, b.commissionPct))}, is released when they confirm the visit happened, or automatically 14 days after the event.`,
      ],
      cta: { label: "View bookings", url: `${base}/dashboard/author/requests` },
    },
  ]);
}

export async function bookingCancelled(bookingId: string, refunded: boolean) {
  const b = await bookingWithPeople(bookingId);
  const base = await appUrl();
  sendEmail([
    {
      to: b.author.email,
      subject: `Booking cancelled: ${b.organisation} on ${fmtDate(b.eventDate)}`,
      lines: [`B-${b.number} (“${b.package.title}”) has been cancelled. The date is open again on your calendar.`],
      cta: { label: "View bookings", url: `${base}/dashboard/author/requests` },
    },
    {
      to: b.buyer.email,
      subject: `Booking cancelled: ${b.package.title}`,
      lines: [`B-${b.number} with ${b.author.name} has been cancelled.${refunded ? ` A refund of ${money(b.fee)} is on its way to your card.` : ""}`],
      cta: { label: "View bookings", url: `${base}/dashboard/buyer/bookings` },
    },
  ]);
}

// ---------- Orders ----------

export async function orderPaid(orderId: string) {
  const o = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { buyer: { select: { name: true, email: true } }, items: { include: { author: { select: { id: true, name: true, email: true } } } } },
  });
  const base = await appUrl();
  const emails: Email[] = [
    {
      to: o.buyer.email,
      subject: `Order O-${o.number} confirmed`,
      lines: [
        `Thanks, ${first(o.buyer.name)}! We received ${money(o.total)}.`,
        ...o.items.map((i) => `• ${i.title} × ${i.qty} — ${money(i.unitPrice * i.qty)} (ships from ${i.author.name})`),
        "Each author ships their own titles. Mark each one received when it arrives.",
      ],
      cta: { label: "Track your order", url: `${base}/dashboard/buyer/orders` },
    },
  ];
  const byAuthor = new Map<string, typeof o.items>();
  for (const i of o.items) byAuthor.set(i.author.id, [...(byAuthor.get(i.author.id) ?? []), i]);
  for (const items of byAuthor.values()) {
    emails.push({
      to: items[0].author.email,
      subject: `New order to ship: O-${o.number}`,
      lines: [
        `${o.buyer.name} ordered:`,
        ...items.map((i) => `• ${i.title} × ${i.qty}`),
        `Ship to: ${o.shippingAddress}`,
        "Mark each line shipped in your studio. Your share is released when the buyer confirms receipt, or automatically after 14 days.",
      ],
      cta: { label: "View orders", url: `${base}/dashboard/author/orders` },
    });
  }
  sendEmail(emails);
}

export async function itemShipped(itemId: string) {
  const i = await db.orderItem.findUniqueOrThrow({
    where: { id: itemId },
    include: { author: { select: { name: true } }, order: { include: { buyer: { select: { name: true, email: true } } } } },
  });
  sendEmail({
    to: i.order.buyer.email,
    subject: `Shipped: ${i.title}`,
    lines: [`${i.author.name} has shipped ${i.title} × ${i.qty} from order O-${i.order.number}.`, "Please mark it received when it arrives."],
    cta: { label: "View order", url: `${await appUrl()}/dashboard/buyer/orders` },
  });
}

// ---------- Money & messages ----------

export async function payoutReleased(author: { name: string; email: string }, amount: number, label: string) {
  sendEmail({
    to: author.email,
    subject: `You've been paid ${money(amount)}`,
    lines: [`${money(amount)} for ${label} has been sent to your Stripe account. Stripe pays it out to your bank on your payout schedule.`],
    cta: { label: "View payouts", url: `${await appUrl()}/dashboard/author/payouts` },
  });
}

export async function newMessage(opts: { to: { name: string; email: string }; from: string; body: string; conversationId: string }) {
  const preview = opts.body.length > 280 ? `${opts.body.slice(0, 280)}…` : opts.body;
  sendEmail({
    to: opts.to.email,
    subject: `New message from ${opts.from}`,
    lines: [`${opts.from} wrote:`, `“${preview}”`],
    cta: { label: "Reply", url: `${await appUrl()}/dashboard/messages/${opts.conversationId}` },
  });
}

export async function contactReceived(msg: { name: string; email: string; topic: string; body: string }) {
  const url = `${await appUrl()}/dashboard/admin/inbox`;
  await toAdmins((to) => ({
    to,
    subject: `Contact form: ${msg.topic} — ${msg.name}`,
    lines: [`From ${msg.name} <${msg.email}>`, msg.body],
    cta: { label: "Open inbox", url },
  }));
}

export async function itemRefunded(itemId: string) {
  const i = await db.orderItem.findUniqueOrThrow({
    where: { id: itemId },
    include: { author: { select: { name: true, email: true } }, order: { include: { buyer: { select: { name: true, email: true } } } } },
  });
  const base = await appUrl();
  const amount = money(i.unitPrice * i.qty);
  sendEmail([
    {
      to: i.order.buyer.email,
      subject: `Refund issued: ${i.title}`,
      lines: [`We've refunded ${amount} for ${i.title} × ${i.qty} (order O-${i.order.number}) to your original payment method. It can take 5–10 days to appear.`],
      cta: { label: "View orders", url: `${base}/dashboard/buyer/orders` },
    },
    {
      to: i.author.email,
      subject: `Order line refunded: ${i.title} (O-${i.order.number})`,
      lines: [`Atelier refunded the buyer for ${i.title} × ${i.qty}.${i.transferId ? " Your share has been reversed from your Stripe balance." : " No payout had been released for it yet."} Contact us if you have questions.`],
      cta: { label: "View orders", url: `${base}/dashboard/author/orders` },
    },
  ]);
}

// ---------- Security ----------

export async function passwordResetLink(user: { name: string; email: string }, url: string, ttlMinutes: number) {
  sendEmail({
    to: user.email,
    subject: "Reset your Atelier password",
    lines: [
      `Hi ${first(user.name)}, we received a request to reset your password.`,
      `This link works once and expires in ${ttlMinutes} minutes. If you didn't ask for it, you can ignore this email — your password won't change.`,
    ],
    cta: { label: "Choose a new password", url },
  });
}

export async function passwordChanged(user: { name: string; email: string }) {
  sendEmail({
    to: user.email,
    subject: "Your Atelier password was changed",
    lines: [
      `Hi ${first(user.name)}, the password for your account was just changed and other devices were signed out.`,
      "If this wasn't you, reset your password straight away and contact us.",
    ],
    cta: { label: "Reset password", url: `${await appUrl()}/forgot-password` },
  });
}

// ---------- Reviews, problems & contracts ----------

export async function reviewPrompt(target: { kind: "booking" | "item"; id: string }) {
  const base = await appUrl();
  const t =
    target.kind === "booking"
      ? await db.booking.findUnique({ where: { id: target.id }, include: { buyer: true, author: true, package: true } })
      : await db.orderItem.findUnique({ where: { id: target.id }, include: { author: true, order: { include: { buyer: true } } } });
  if (!t) return;
  const buyer = "buyer" in t ? t.buyer : t.order.buyer;
  const what = "package" in t ? t.package.title : t.title;
  sendEmail({
    to: buyer.email,
    subject: `How was ${what}?`,
    lines: [`Hi ${first(buyer.name)}, a quick review of ${t.author.name} helps other schools and readers choose. It takes 30 seconds.`],
    cta: { label: "Leave a review", url: `${base}/dashboard/buyer/review?${target.kind}=${target.id}` },
  });
}

export async function reviewReceived(reviewId: string) {
  const r = await db.review.findUniqueOrThrow({ where: { id: reviewId }, include: { author: true, buyer: true } });
  sendEmail({
    to: r.author.email,
    subject: `New ${r.rating}★ review from ${r.buyer.orgName || r.buyer.name}`,
    lines: [`“${r.body}”`, "You can post one public reply from your studio."],
    cta: { label: "View reviews", url: `${await appUrl()}/dashboard/author/reviews` },
  });
}

export async function issueReported(issueId: string) {
  const i = await db.issue.findUniqueOrThrow({
    where: { id: issueId },
    include: { buyer: true, booking: { include: { author: true, package: true } }, orderItem: { include: { author: true, order: true } } },
  });
  const base = await appUrl();
  const author = i.booking?.author ?? i.orderItem!.author;
  const what = i.booking ? `booking B-${i.booking.number} (${i.booking.package.title})` : `${i.orderItem!.title} in order O-${i.orderItem!.order.number}`;
  await toAdmins((to) => ({
    to,
    subject: `Problem reported: ${what}`,
    lines: [`${i.buyer.name} reported a problem with ${what}.`, `“${i.details}”`, "Payment to the author is paused until you resolve it."],
    cta: { label: "Review issue", url: `${base}/dashboard/admin/issues` },
  }));
  sendEmail({
    to: author.email,
    subject: `A buyer reported a problem with ${what}`,
    lines: [
      `${i.buyer.name} reported: “${i.details}”`,
      "Payment for this sale is paused while our team looks into it. Reply to the buyer in Messages if you can help resolve it.",
    ],
    cta: { label: "Open messages", url: `${base}/dashboard/messages` },
  });
}

export async function issueResolved(issueId: string) {
  const i = await db.issue.findUniqueOrThrow({
    where: { id: issueId },
    include: { buyer: true, booking: { include: { author: true } }, orderItem: { include: { author: true } } },
  });
  const author = i.booking?.author ?? i.orderItem!.author;
  const refunded = i.status === "REFUNDED";
  const note = i.resolutionNote ? [`Note from Atelier: ${i.resolutionNote}`] : [];
  sendEmail([
    {
      to: i.buyer.email,
      subject: refunded ? "Your problem report: refund issued" : "Your problem report has been reviewed",
      lines: [refunded ? "We've refunded you in full. It can take 5–10 days to appear." : "After reviewing it, we've released payment to the author.", ...note],
    },
    {
      to: author.email,
      subject: refunded ? "Problem report resolved: buyer refunded" : "Problem report resolved: payment released",
      lines: [refunded ? "After review, the buyer was refunded for this sale." : "After review, payment for this sale has been released to you.", ...note],
    },
  ]);
}

export async function contractAttached(bookingId: string, byUserId: string) {
  const b = await db.booking.findUniqueOrThrow({ where: { id: bookingId }, include: { buyer: true, author: true } });
  const [by, to, path] = byUserId === b.authorId ? [b.author, b.buyer, "buyer/bookings"] : [b.buyer, b.author, "author/requests"];
  sendEmail({
    to: to.email,
    subject: `Contract attached to booking B-${b.number}`,
    lines: [`${by.name} attached a contract (“${b.contractName}”) to B-${b.number}. Review it before the event.`],
    cta: { label: "View booking", url: `${await appUrl()}/dashboard/${path}` },
  });
}

// ---------- Referrals ----------

export async function referralSubmitted(referralId: string) {
  const r = await db.referral.findUniqueOrThrow({ where: { id: referralId }, include: { referrer: true } });
  const base = await appUrl();
  await toAdmins((to) => ({
    to,
    subject: `Referral to verify: ${r.referredName}`,
    lines: [`${r.referrer.name} referred ${r.referredName} <${r.referredEmail}>.`],
    cta: { label: "Verify referrals", url: `${base}/dashboard/admin/referrals` },
  }));
  sendEmail({
    to: r.referredEmail,
    subject: `${r.referrer.name} invited you to sell and speak on Atelier`,
    lines: [
      `Hi ${first(r.referredName)}, ${r.referrer.name} thinks your books and talks would be a great fit for Atelier — a marketplace where schools, libraries and businesses buy books and book author visits.`,
      "Joining is free. You set your own prices and get paid through Stripe.",
    ],
    cta: { label: "Create your author account", url: `${base}/signup?role=AUTHOR&email=${encodeURIComponent(r.referredEmail)}` },
  });
}

export async function referralReviewed(referralId: string) {
  const r = await db.referral.findUniqueOrThrow({ where: { id: referralId }, include: { referrer: true } });
  const ok = r.status === "APPROVED";
  sendEmail({
    to: r.referrer.email,
    subject: ok ? `Referral verified: ${r.referredName}` : `Referral not accepted: ${r.referredName}`,
    lines: ok
      ? [`Your referral of ${r.referredName} is verified. You'll earn ${r.pct}% of their sales until ${fmtDate(r.expiresAt)}, paid quarterly.`]
      : [`We couldn't verify your referral of ${r.referredName}.${r.adminNote ? ` Note: ${r.adminNote}` : ""}`],
    cta: { label: "View referrals", url: `${await appUrl()}/dashboard/author/referrals` },
  });
}

export async function referralPaid(referrerId: string, amount: number, method: string) {
  const u = await db.user.findUniqueOrThrow({ where: { id: referrerId } });
  sendEmail({
    to: u.email,
    subject: `Referral rewards paid: ${money(amount)}`,
    lines: [
      method === "STRIPE"
        ? `${money(amount)} in referral rewards has been sent to your Stripe account.`
        : `${money(amount)} in referral rewards is being sent to you. We'll be in touch if we need payment details.`,
    ],
    cta: { label: "View referrals", url: `${await appUrl()}/dashboard/author/referrals` },
  });
}
