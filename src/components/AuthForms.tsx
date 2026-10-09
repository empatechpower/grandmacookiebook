"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { completeGoogleSignup, login, signup } from "@/app/actions/auth";
import { PasswordInput } from "./PasswordInput";
import { SubmitButton } from "./SubmitButton";
import { ORG_TYPES } from "@/lib/constants";

/**
 * Login with an Author / Guest choice (as the client requested). The choice only changes the
 * wording and sign-up link — the account itself decides where you land, so picking the
 * "wrong" tab can never lock anyone out.
 */
/** Google's standard "Continue with Google" button (white, with the multicolor G). */
export function GoogleButton({ href }: { href: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <>
      <a className={`google-btn${busy ? " busy" : ""}`} href={href} onClick={() => setBusy(true)} aria-busy={busy || undefined}>
        {busy ? <span className="spin" aria-hidden /> : (
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
        )}
        <span>{busy ? "Opening Google…" : "Continue with Google"}</span>
      </a>
      <div className="or-divider"><span>or use your email</span></div>
    </>
  );
}

export function LoginForm({ next, initialAs = "GUEST", google = false }: { next?: string; initialAs?: "GUEST" | "AUTHOR"; google?: boolean }) {
  const [state, action] = useActionState(login, undefined);
  const [as, setAs] = useState<"GUEST" | "AUTHOR">(initialAs);
  return (
    <form action={action}>
      <div className="role-pick" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 18 }} role="tablist" aria-label="I am logging in as">
        {([["GUEST", "I'm a guest", "Schools, organizations & readers"], ["AUTHOR", "I'm an author", "Manage your storefront"]] as const).map(([v, l, sub]) => (
          <button key={v} type="button" role="tab" aria-selected={as === v} className={`role-opt${as === v ? " on" : ""}`} onClick={() => setAs(v)}>
            <b>{l}</b>
            <span>{sub}</span>
          </button>
        ))}
      </div>
      {google && <GoogleButton href={`/api/auth/google${next ? `?next=${encodeURIComponent(next)}` : ""}`} />}
      {state?.error && <div className="alert alert-err">{state.error}</div>}
      {next && <input type="hidden" name="next" value={next} />}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required defaultValue={process.env.NODE_ENV === "production" ? undefined : "buyer@atelier.test"} maxLength={160} />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <PasswordInput id="password" name="password" autoComplete="current-password" required />
        <div className="hint">
          <Link href="/forgot-password" style={{ textDecoration: "underline" }}>Forgot password?</Link>
        </div>
      </div>
      <SubmitButton pendingText="Signing in…">Enter South Texas Book & Author</SubmitButton>
      <p style={{ marginTop: 16, fontSize: ".9rem" }}>
        No account?{" "}
        <Link href={as === "AUTHOR" ? "/signup?role=AUTHOR" : "/signup"} style={{ color: "var(--terracotta)" }}>
          {as === "AUTHOR" ? "Join as an author" : "Create a free guest account"}
        </Link>
      </p>
    </form>
  );
}

const ROLE_OPTS = [
  { value: "BUYER", label: "Guest", sub: "Buy books & book authors" },
  { value: "AUTHOR", label: "Author", sub: "Sell & speak" },
];

export function SignupForm({ initialRole, initialEmail, google = false }: { initialRole: string; initialEmail?: string; google?: boolean }) {
  const [state, action] = useActionState(signup, undefined);
  const [role, setRole] = useState(initialRole === "AUTHOR" ? "AUTHOR" : "BUYER");
  return (
    <form action={action}>
      {google && <GoogleButton href={`/api/auth/google?role=${role}`} />}
      {state?.error && <div className="alert alert-err">{state.error}</div>}
      <div className="field">
        <label htmlFor="name">Full name</label>
        <input id="name" name="name" required placeholder="Jordan Taylor" autoComplete="name" minLength={2} maxLength={80} />
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required placeholder="you@email.com" autoComplete="email" defaultValue={initialEmail} maxLength={160} />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <PasswordInput id="password" name="password" required minLength={8} maxLength={200} autoComplete="new-password" />
        <div className="hint">At least 8 characters.</div>
      </div>
      <div className="field">
        <label>I am joining as</label>
        <input type="hidden" name="role" value={role} />
        <div className="role-pick" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {ROLE_OPTS.map((o) => (
            <button type="button" key={o.value} className={`role-opt${role === o.value ? " on" : ""}`} onClick={() => setRole(o.value)}>
              <b>{o.label}</b>
              <span>{o.sub}</span>
            </button>
          ))}
        </div>
        {role === "AUTHOR" && (
          <div className="hint">Author accounts are reviewed by an admin before your listings go public.</div>
        )}
      </div>
      {role === "BUYER" && (
        <div className="field-row">
          <div className="field">
            <label htmlFor="orgType">Booking for</label>
            <select id="orgType" name="orgType" defaultValue="SCHOOL">
              {ORG_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="orgName">Organization name <span className="muted">(optional)</span></label>
            <input id="orgName" name="orgName" placeholder="St. Cloud Elementary" maxLength={120} />
          </div>
        </div>
      )}
      <SubmitButton className="btn btn-terra" pendingText="Creating…">
        Create workspace
      </SubmitButton>
      <p style={{ marginTop: 16, fontSize: ".9rem" }}>
        Already a member?{" "}
        <Link href="/login" style={{ color: "var(--terracotta)" }}>
          Log in
        </Link>
      </p>
    </form>
  );
}

/** After "Continue with Google" with a new email: choose Guest or Author, then the account is created. */
export function GoogleSignupForm({ name, email, initialRole }: { name: string; email: string; initialRole: "BUYER" | "AUTHOR" | null }) {
  const [state, action] = useActionState(completeGoogleSignup, undefined);
  const [role, setRole] = useState(initialRole ?? "BUYER");
  return (
    <form action={action}>
      {state?.error && <div className="alert alert-err">{state.error}</div>}
      <div className="google-who">
        <b>{name}</b>
        <span>{email}</span>
      </div>
      <div className="field">
        <label>I am joining as</label>
        <input type="hidden" name="role" value={role} />
        <div className="role-pick" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {ROLE_OPTS.map((o) => (
            <button type="button" key={o.value} className={`role-opt${role === o.value ? " on" : ""}`} onClick={() => setRole(o.value as "BUYER" | "AUTHOR")}>
              <b>{o.label}</b>
              <span>{o.sub}</span>
            </button>
          ))}
        </div>
        {role === "AUTHOR" && <div className="hint">Author accounts are reviewed by an admin before your listings go public.</div>}
      </div>
      {role === "BUYER" && (
        <div className="field-row">
          <div className="field">
            <label htmlFor="orgType">Booking for</label>
            <select id="orgType" name="orgType" defaultValue="SCHOOL">
              {ORG_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="orgName">Organization name <span className="muted">(optional)</span></label>
            <input id="orgName" name="orgName" placeholder="St. Cloud Elementary" maxLength={120} />
          </div>
        </div>
      )}
      <SubmitButton className="btn btn-terra" pendingText="Creating…">Create my account</SubmitButton>
    </form>
  );
}
