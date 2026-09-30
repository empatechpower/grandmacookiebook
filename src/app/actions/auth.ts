"use server";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/session";
import { dashboardPath } from "@/lib/auth";
import { flash } from "@/lib/flash";
import { authorSignedUp, passwordChanged, passwordResetLink } from "@/lib/notify";
import { requireUser } from "@/lib/auth";
import { appUrl } from "@/lib/url";
import { linkReferredUser } from "@/lib/referrals";

export type FormState = { error?: string } | undefined;

const safeNext = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "");
  return s.startsWith("/") && !s.startsWith("//") ? s : null;
};

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return { error: "Email or password is incorrect." };
  if (user.status === "SUSPENDED") return { error: "This account is suspended. Contact support." };
  await createSession(user.id, user.sessionVersion);
  await flash(`Welcome back, ${user.name.split(" ")[0]}`);
  redirect(safeNext(fd.get("next")) ?? dashboardPath(user.role));
}

const SignupSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  // Super admins are never self-registered; they are seeded or invited by another admin.
  role: z.enum(["BUYER", "AUTHOR"]),
  orgType: z.union([z.literal(""), z.enum(["SCHOOL", "LIBRARY", "BUSINESS", "NONPROFIT", "INDIVIDUAL"])]).optional(),
  orgName: z.string().trim().max(120).optional(),
});

export async function signup(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = SignupSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password, role, orgType, orgName } = parsed.data;
  if (await db.user.findUnique({ where: { email } })) return { error: "An account with this email already exists." };
  const user = await db.user.create({
    data: {
      name,
      email,
      role,
      passwordHash: await bcrypt.hash(password, 10),
      status: role === "AUTHOR" ? "PENDING" : "ACTIVE",
      ...(role === "BUYER" ? { orgType: orgType || null, orgName: orgName || null } : {}),
    },
  });
  await createSession(user.id, user.sessionVersion);
  if (role === "AUTHOR") {
    await linkReferredUser(user);
    await authorSignedUp(user);
  }
  await flash(role === "AUTHOR" ? "Studio created — an admin will review your account" : "Welcome to Grandma Cookie Book");
  redirect(dashboardPath(role));
}

export async function logout() {
  await destroySession();
  redirect("/");
}

// ---------- Password reset & change ----------

const RESET_TTL_MIN = 60;
const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
const PasswordSchema = z.string().min(8, "Password must be at least 8 characters").max(200);

export type ResetState = { error?: string; sent?: boolean } | undefined;

/** Always answers the same way, so the form can't be used to discover which emails have accounts. */
export async function requestPasswordReset(_: ResetState, fd: FormData): Promise<ResetState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!z.string().email().safeParse(email).success) return { error: "Enter a valid email" };
  const user = await db.user.findUnique({ where: { email } });
  if (user && user.status !== "SUSPENDED") {
    // At most 3 links per hour per account.
    const recent = await db.passwordResetToken.count({ where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 3600_000) } } });
    if (recent < 3) {
      const token = randomBytes(32).toString("base64url");
      await db.passwordResetToken.create({
        data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TTL_MIN * 60_000) },
      });
      await passwordResetLink(user, `${await appUrl()}/reset-password?token=${token}`, RESET_TTL_MIN);
    }
  }
  return { sent: true };
}

export async function resetPassword(_: FormState, fd: FormData): Promise<FormState> {
  const token = String(fd.get("token") ?? "");
  const password = PasswordSchema.safeParse(String(fd.get("password") ?? ""));
  if (!password.success) return { error: password.error.issues[0].message };
  if (fd.get("password") !== fd.get("confirm")) return { error: "Passwords don't match" };
  const row = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!row || row.usedAt || row.expiresAt < new Date() || row.user.status === "SUSPENDED")
    return { error: "This reset link is invalid or has expired. Request a new one." };

  const [, , user] = await db.$transaction([
    // Burn this and every other outstanding link for the account.
    db.passwordResetToken.updateMany({ where: { userId: row.userId, usedAt: null }, data: { usedAt: new Date() } }),
    db.passwordResetToken.deleteMany({ where: { userId: row.userId, expiresAt: { lt: new Date(Date.now() - 7 * 86400_000) } } }),
    db.user.update({
      where: { id: row.userId },
      data: { passwordHash: await bcrypt.hash(password.data, 10), sessionVersion: { increment: 1 } },
    }),
  ]);
  await passwordChanged(user);
  await createSession(user.id, user.sessionVersion);
  await flash("Password updated — you're signed in");
  redirect(dashboardPath(user.role));
}

export async function changePassword(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!(await bcrypt.compare(String(fd.get("current") ?? ""), user.passwordHash))) return { error: "Current password is incorrect" };
  const password = PasswordSchema.safeParse(String(fd.get("password") ?? ""));
  if (!password.success) return { error: password.error.issues[0].message };
  if (fd.get("password") !== fd.get("confirm")) return { error: "New passwords don't match" };
  const updated = await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(password.data, 10), sessionVersion: { increment: 1 } },
  });
  // Other devices are signed out by the version bump; keep this one signed in.
  await createSession(updated.id, updated.sessionVersion);
  await passwordChanged(updated);
  await flash("Password changed — other devices have been signed out");
  redirect(dashboardPath(updated.role));
}
