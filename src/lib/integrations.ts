import "server-only";

/** Which outside services are configured (never exposes the values themselves). */
export function integrationStatus() {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  const stripeMode = key.startsWith("sk_live_") || key.startsWith("rk_live_") ? "live" : key ? "test" : null;
  return [
    { name: "Stripe payments", ok: !!key, detail: stripeMode ? `Connected (${stripeMode} mode)` : "Not set — payments are simulated (demo mode)", env: "STRIPE_SECRET_KEY" },
    { name: "Stripe payment webhook", ok: !!process.env.STRIPE_WEBHOOK_SECRET, detail: process.env.STRIPE_WEBHOOK_SECRET ? "Set" : "Not set", env: "STRIPE_WEBHOOK_SECRET" },
    { name: "Stripe author-account webhook", ok: !!process.env.STRIPE_CONNECT_WEBHOOK_SECRET, detail: process.env.STRIPE_CONNECT_WEBHOOK_SECRET ? "Set" : "Not set", env: "STRIPE_CONNECT_WEBHOOK_SECRET" },
    { name: "Email delivery", ok: !!process.env.RESEND_API_KEY, detail: process.env.RESEND_API_KEY ? `Sending as ${process.env.EMAIL_FROM ?? "default sender"}` : "Not set — emails only go to the server log", env: "RESEND_API_KEY" },
    { name: "Photo storage", ok: !!process.env.S3_BUCKET, detail: process.env.S3_BUCKET ? "Cloud storage" : "Local disk (uploads won't persist on Vercel)", env: "S3_BUCKET" },
    { name: "Scheduled jobs", ok: !!process.env.CRON_SECRET, detail: process.env.CRON_SECRET ? "Set" : "Not set — held payouts only release when buyers confirm", env: "CRON_SECRET" },
  ];
}
