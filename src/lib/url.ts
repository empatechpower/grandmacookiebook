import "server-only";
import { headers } from "next/headers";

/**
 * Public base URL for links in redirects and emails, in order of preference:
 * 1. APP_URL, if set explicitly;
 * 2. on Vercel production, the project's production domain (VERCEL_PROJECT_PRODUCTION_URL is the
 *    custom domain once one is added, otherwise the .vercel.app one), so nothing needs changing
 *    when the domain goes live;
 * 3. the host of the current request (local dev, previews).
 */
export async function appUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
