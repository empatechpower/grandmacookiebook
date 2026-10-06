"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { login, signup } from "@/app/actions/auth";
import { SubmitButton } from "./SubmitButton";
import { ORG_TYPES } from "@/lib/constants";

/**
 * Login with an Author / Guest choice (as the client requested). The choice only changes the
 * wording and sign-up link — the account itself decides where you land, so picking the
 * "wrong" tab can never lock anyone out.
 */
export function LoginForm({ next, initialAs = "GUEST" }: { next?: string; initialAs?: "GUEST" | "AUTHOR" }) {
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
      {state?.error && <div className="alert alert-err">{state.error}</div>}
      {next && <input type="hidden" name="next" value={next} />}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required defaultValue="buyer@atelier.test" />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
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

export function SignupForm({ initialRole, initialEmail }: { initialRole: string; initialEmail?: string }) {
  const [state, action] = useActionState(signup, undefined);
  const [role, setRole] = useState(initialRole === "AUTHOR" ? "AUTHOR" : "BUYER");
  return (
    <form action={action}>
      {state?.error && <div className="alert alert-err">{state.error}</div>}
      <div className="field">
        <label htmlFor="name">Full name</label>
        <input id="name" name="name" required placeholder="Jordan Taylor" autoComplete="name" />
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required placeholder="you@email.com" autoComplete="email" defaultValue={initialEmail} />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
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
            <input id="orgName" name="orgName" placeholder="St. Cloud Elementary" />
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
