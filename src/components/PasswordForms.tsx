"use client";
import Link from "next/link";
import { useActionState } from "react";
import { changePassword, requestPasswordReset, resetPassword } from "@/app/actions/auth";
import { SubmitButton } from "./SubmitButton";

export function ForgotForm() {
  const [state, action] = useActionState(requestPasswordReset, undefined);
  if (state?.sent)
    return (
      <div className="alert alert-ok">
        If an account exists for that email, we’ve sent a reset link. It expires in 60 minutes — check your spam folder too.
      </div>
    );
  return (
    <form action={action}>
      {state?.error && <div className="alert alert-err">{state.error}</div>}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <SubmitButton pendingText="Sending…">Send reset link</SubmitButton>
      <p style={{ marginTop: 16, fontSize: ".9rem" }}>
        Remembered it? <Link href="/login" style={{ color: "var(--terracotta)" }}>Log in</Link>
      </p>
    </form>
  );
}

function NewPasswordFields() {
  return (
    <>
      <div className="field">
        <label htmlFor="password">New password</label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        <div className="hint">At least 8 characters.</div>
      </div>
      <div className="field">
        <label htmlFor="confirm">Confirm new password</label>
        <input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
      </div>
    </>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPassword, undefined);
  return (
    <form action={action}>
      {state?.error && (
        <div className="alert alert-err">
          {state.error} {state.error.includes("expired") && <Link href="/forgot-password" style={{ textDecoration: "underline" }}>Get a new link</Link>}
        </div>
      )}
      <input type="hidden" name="token" value={token} />
      <NewPasswordFields />
      <SubmitButton pendingText="Saving…">Set new password</SubmitButton>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="panel" style={{ maxWidth: 560, marginTop: 20 }}>
      <h3 style={{ marginBottom: 12 }}>Change password</h3>
      {state?.error && <div className="alert alert-err">{state.error}</div>}
      <div className="field">
        <label htmlFor="current">Current password</label>
        <input id="current" name="current" type="password" required autoComplete="current-password" />
      </div>
      <NewPasswordFields />
      <SubmitButton className="btn btn-line" pendingText="Saving…">Change password</SubmitButton>
      <p className="hint" style={{ marginTop: 8 }}>Changing your password signs out your other devices.</p>
    </form>
  );
}
