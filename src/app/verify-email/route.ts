import { readSession } from "@/lib/session";
import { flash } from "@/lib/flash";
import { appUrl } from "@/lib/url";
import { dashboardPath } from "@/lib/auth";
import { confirmEmail } from "@/lib/verify";

/** The link in the "Confirm your email" message. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const user = await confirmEmail(token);
  const base = await appUrl();
  const go = (path: string) => new Response(null, { status: 303, headers: { Location: `${base}${path}`, "Cache-Control": "no-store" } });
  if (!user) {
    await flash("That confirmation link is invalid or has expired — log in to send a new one.");
    return go("/login");
  }
  await flash("Thanks — your email is confirmed");
  const session = await readSession();
  return go(session?.id === user.id ? dashboardPath(user.role) : "/login");
}
