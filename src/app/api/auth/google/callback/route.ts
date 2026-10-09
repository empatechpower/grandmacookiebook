import { db } from "@/lib/db";
import { dashboardPath } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { flash } from "@/lib/flash";
import { appUrl } from "@/lib/url";
import { findUserForGoogle, finishGoogleSignIn, savePendingGoogleSignup } from "@/lib/google";

const go = async (path: string) => new Response(null, { status: 303, headers: { Location: `${await appUrl()}${path}`, "Cache-Control": "no-store" } });

/** Google sends the user back here after they pick their account. */
export async function GET(req: Request) {
  const result = await finishGoogleSignIn(new URL(req.url).searchParams);
  if (!result.ok) {
    await flash(result.error);
    return go("/login");
  }
  const { profile, flow } = result;
  const user = await findUserForGoogle(profile);
  if (user) {
    if (user.status === "SUSPENDED") {
      await flash("This account is suspended. Contact support.");
      return go("/login");
    }
    await createSession(user.id, user.sessionVersion);
    await flash(`Welcome back, ${user.name.split(" ")[0]}`);
    return go(flow.next ?? dashboardPath(user.role));
  }
  if (await db.user.findUnique({ where: { email: profile.email } })) {
    await flash("That email is linked to a different Google account. Log in with your password instead.");
    return go("/login");
  }
  // New here: pick Guest or Author (and organization) before the account is created.
  await savePendingGoogleSignup(profile, flow.role);
  return go("/signup/google");
}
