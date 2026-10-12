import "server-only";
import { db } from "./db";
import { demoMode, fetchAccountStatus } from "./payments";

/**
 * Re-reads an author's Stripe account and updates "Stripe ready". If the account doesn't exist under
 * the current Stripe key (e.g. connected in test mode before the switch to live), the old connection is
 * cleared so the author is asked to connect again. Returns the status, or null if they never connected.
 */
export async function syncAuthorStripe(user: { id: string; stripeAccountId: string | null; payoutsReady: boolean }) {
  if (!user.stripeAccountId || demoMode) return null;
  const status = await fetchAccountStatus(user.stripeAccountId);
  if (status === "missing") {
    await db.user.update({ where: { id: user.id }, data: { stripeAccountId: null, payoutsReady: false } });
  } else if ((status === "ready") !== user.payoutsReady) {
    await db.user.update({ where: { id: user.id }, data: { payoutsReady: status === "ready" } });
  }
  return status;
}
