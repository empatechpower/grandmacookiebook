import { releaseDue } from "@/lib/fulfillment";
import { backfillAuthorSlugs } from "@/lib/slugs";

/**
 * Releases held author payouts whose 14-day hold has ended. Call daily with
 * `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends this header automatically;
 * elsewhere use any scheduler, e.g. `curl -H "Authorization: Bearer …" https://…/api/cron/release-payouts`).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const released = await releaseDue();
  const storefrontLinks = await backfillAuthorSlugs();
  return Response.json({ ok: true, released, storefrontLinks });
}
