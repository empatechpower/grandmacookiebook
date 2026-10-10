import "server-only";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { flash } from "./flash";

/** Finish a mutation: show a toast (if any), refresh server data, optionally navigate. */
export async function done(message: string | null, to?: string): Promise<never | void> {
  if (message) await flash(message);
  revalidatePath("/", "layout");
  if (to) redirect(to);
}

/** Stop with a toast and send the user back where they came from. */
export async function fail(message: string, fallback = "/"): Promise<never> {
  await flash(message);
  const ref = (await headers()).get("referer");
  let to = fallback;
  if (ref) {
    const u = new URL(ref);
    to = u.pathname + u.search;
  }
  redirect(to);
}

export const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
export const int = (fd: FormData, k: string) => Math.trunc(Number(fd.get(k) ?? 0));

export { phoneOk, PHONE_PATTERN } from "./validation";

/** Stops unverified accounts from actions that send money, requests or messages to others. */
export async function requireVerified(user: { emailVerifiedAt: Date | null }, fallback = "/dashboard") {
  if (!user.emailVerifiedAt) await fail("Please confirm your email first — check your inbox for our link, or resend it from your dashboard.", fallback);
}
