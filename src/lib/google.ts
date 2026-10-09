import "server-only";
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { SignJWT, createRemoteJWKSet, jwtVerify } from "jose";
import { db } from "./db";
import { appUrl } from "./url";

/**
 * "Continue with Google" (OpenID Connect, authorization code flow with PKCE).
 *
 *   /api/auth/google           → stores state, nonce and the PKCE verifier in a short-lived cookie, sends the user to Google
 *   /api/auth/google/callback  → checks state, swaps the code for an ID token, verifies it (signature, issuer,
 *                                audience, nonce, verified email), then signs the user in — or, for a new email,
 *                                sends them to /signup/google to pick Guest or Author.
 *
 * Needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET; without them the Google buttons are hidden.
 */
export const googleEnabled = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const FLOW_COOKIE = "g_flow";
const PENDING_COOKIE = "g_pending";
const jwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const b64url = (b: Buffer) => b.toString("base64url");
const secure = process.env.NODE_ENV === "production";

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) throw new Error("SESSION_SECRET is missing or too short");
  return new TextEncoder().encode(secret);
}

export const redirectUri = async () => `${await appUrl()}/api/auth/google/callback`;

/** Where to send the browser to start Google sign-in. */
export async function startGoogleSignIn(opts: { next: string | null; role: "BUYER" | "AUTHOR" | null }) {
  const state = b64url(randomBytes(24));
  const nonce = b64url(randomBytes(24));
  const verifier = b64url(randomBytes(48));
  const flow = await new SignJWT({ state, nonce, verifier, next: opts.next, role: opts.role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("10m")
    .sign(key());
  (await cookies()).set(FLOW_COOKIE, flow, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 600 });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: await redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: b64url(createHash("sha256").update(verifier).digest()),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return url.toString();
}

export type GoogleProfile = { sub: string; email: string; name: string };
type Flow = { state: string; nonce: string; verifier: string; next: string | null; role: "BUYER" | "AUTHOR" | null };

/** Finishes the Google round trip: returns the verified profile plus what the user started with. */
export async function finishGoogleSignIn(params: URLSearchParams): Promise<{ ok: true; profile: GoogleProfile; flow: Flow } | { ok: false; error: string }> {
  const jar = await cookies();
  const raw = jar.get(FLOW_COOKIE)?.value;
  jar.delete(FLOW_COOKIE);
  if (params.get("error")) return { ok: false, error: "Google sign-in was canceled." };
  if (!raw) return { ok: false, error: "Your Google sign-in took too long — please try again." };
  let flow: Flow;
  try {
    flow = (await jwtVerify(raw, key())).payload as unknown as Flow;
  } catch {
    return { ok: false, error: "Your Google sign-in took too long — please try again." };
  }
  const code = params.get("code");
  if (!code || params.get("state") !== flow.state) return { ok: false, error: "Google sign-in couldn't be verified — please try again." };

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: await redirectUri(),
      grant_type: "authorization_code",
      code_verifier: flow.verifier,
    }),
  });
  if (!res.ok) return { ok: false, error: "Google sign-in failed — please try again." };
  const { id_token } = (await res.json()) as { id_token?: string };
  if (!id_token) return { ok: false, error: "Google sign-in failed — please try again." };

  try {
    const { payload } = await jwtVerify(id_token, jwks, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: process.env.GOOGLE_CLIENT_ID!,
    });
    if (payload.nonce !== flow.nonce) return { ok: false, error: "Google sign-in couldn't be verified — please try again." };
    const email = String(payload.email ?? "").trim().toLowerCase();
    // Only a Google-verified email may sign in to (or create) an account with that address.
    if (!email || payload.email_verified !== true) return { ok: false, error: "Your Google account's email isn't verified, so we can't use it to sign in." };
    const name = String(payload.name ?? "").trim() || email.split("@")[0];
    return { ok: true, profile: { sub: String(payload.sub), email, name: name.slice(0, 80) }, flow };
  } catch {
    return { ok: false, error: "Google sign-in couldn't be verified — please try again." };
  }
}

/**
 * The account a verified Google profile signs in to: the one already linked to this Google
 * account, else the one with the same (Google-verified) email, which is then linked. Null if new.
 */
export async function findUserForGoogle(p: GoogleProfile) {
  const linked = await db.user.findUnique({ where: { googleId: p.sub } });
  if (linked) return linked;
  const byEmail = await db.user.findUnique({ where: { email: p.email } });
  if (!byEmail) return null;
  if (byEmail.googleId && byEmail.googleId !== p.sub) return null; // linked to a different Google account
  return db.user.update({ where: { id: byEmail.id }, data: { googleId: p.sub } });
}

// ---------- New users: hold the verified profile while they pick Guest or Author ----------

export async function savePendingGoogleSignup(p: GoogleProfile, role: "BUYER" | "AUTHOR" | null) {
  const token = await new SignJWT({ ...p, role }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("20m").sign(key());
  (await cookies()).set(PENDING_COOKIE, token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 1200 });
}

export async function readPendingGoogleSignup(): Promise<(GoogleProfile & { role: "BUYER" | "AUTHOR" | null }) | null> {
  const token = (await cookies()).get(PENDING_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return { sub: String(payload.sub), email: String(payload.email), name: String(payload.name), role: (payload.role as "BUYER" | "AUTHOR" | null) ?? null };
  } catch {
    return null;
  }
}

export async function clearPendingGoogleSignup() {
  (await cookies()).delete(PENDING_COOKIE);
}
