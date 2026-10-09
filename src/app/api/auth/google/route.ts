import { googleEnabled, startGoogleSignIn } from "@/lib/google";

/** Starts "Continue with Google". ?next=/path to return somewhere; ?role=AUTHOR from the author sign-up. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!googleEnabled()) return Response.redirect(new URL("/login", url), 303);
  const next = url.searchParams.get("next");
  const role = url.searchParams.get("role");
  const target = await startGoogleSignIn({
    next: next && next.startsWith("/") && !next.startsWith("//") ? next : null,
    role: role === "AUTHOR" || role === "BUYER" ? role : null,
  });
  return new Response(null, { status: 303, headers: { Location: target, "Cache-Control": "no-store" } });
}
