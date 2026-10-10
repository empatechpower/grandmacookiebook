import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";
import { appUrl } from "./url";
import { sendEmail } from "./email";

/**
 * Email verification. The link carries a signed token (24 hours) naming the user and the
 * email it was sent to, so it stops working if the address changes. Unverified users can
 * browse and set up their account, but not check out, book, send POs, message or list.
 */
const TTL_HOURS = 24;
const RESEND_AFTER_MS = 60_000;

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) throw new Error("SESSION_SECRET is missing or too short");
  return new TextEncoder().encode(secret);
}

export async function sendVerificationEmail(user: { id: string; name: string; email: string }) {
  const token = await new SignJWT({ purpose: "verify-email", email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setExpirationTime(`${TTL_HOURS}h`)
    .sign(key());
  await db.user.update({ where: { id: user.id }, data: { verifyEmailSentAt: new Date() } });
  sendEmail({
    to: user.email,
    subject: "Confirm your email for South Texas Book & Author",
    lines: [
      `Hi ${user.name.split(" ")[0]}, welcome to South Texas Book & Author!`,
      `Please confirm this is your email so we can send you order confirmations, invoices and booking updates. The link works for ${TTL_HOURS} hours.`,
      "If you didn't create an account, you can ignore this email.",
    ],
    cta: { label: "Confirm my email", url: `${await appUrl()}/verify-email?token=${token}` },
  });
}

/** Sends a fresh link unless one went out in the last minute. */
export async function resendVerificationEmail(user: { id: string; name: string; email: string; emailVerifiedAt: Date | null; verifyEmailSentAt: Date | null }) {
  if (user.emailVerifiedAt) return "already";
  if (user.verifyEmailSentAt && Date.now() - user.verifyEmailSentAt.getTime() < RESEND_AFTER_MS) return "wait";
  await sendVerificationEmail(user);
  return "sent";
}

/** Checks a link's token and marks the email verified. */
export async function confirmEmail(token: string) {
  try {
    const { payload } = await jwtVerify(token, key());
    if (payload.purpose !== "verify-email" || !payload.sub) return null;
    const user = await db.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.email !== payload.email || user.status === "SUSPENDED") return null;
    if (!user.emailVerifiedAt) return db.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
    return user;
  } catch {
    return null;
  }
}
