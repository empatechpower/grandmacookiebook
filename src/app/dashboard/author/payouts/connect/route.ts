import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { onboardingLink } from "@/lib/payments";

/** Stripe's refresh_url: account links are single-use, so mint a fresh one and bounce back. */
export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== "AUTHOR" || !user.stripeAccountId) redirect("/dashboard/author/payouts");
  redirect(await onboardingLink(user.stripeAccountId));
}
