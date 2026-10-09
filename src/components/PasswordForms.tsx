"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { PasswordInput } from "./PasswordInput";
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

/** New password + confirmation; the browser blocks submitting until they match. */
function NewPasswordFields() {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = confirm.length > 0 && pw !== confirm;
  return (
    <>
      <div className="field">
        <label htmlFor="password">New password</label>
        <PasswordInput id="password" name="password" required minLength={8} maxLength={200} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <div className="hint">At least 8 characters.</div>
      </div>
      <div className="field">
        <label htmlFor="confirm">Confirm new password</label>
        <PasswordInput
          id="confirm" name="confirm" required minLength={8} maxLength={200} autoComplete="new-password" value={confirm}
          onChange={(e) => { setConfirm(e.target.value); e.target.setCustomValidity(e.target.value && e.target.value !== pw ? "Passwords don't match" : ""); }}
          aria-invalid={mismatch || undefined} aria-describedby="confirm-hint"
        />
        {mismatch && <div id="confirm-hint" className="field-err">Passwords don’t match</div>}
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
        <PasswordInput id="current" name="current" required autoComplete="current-password" />
      </div>
      <NewPasswordFields />
      <SubmitButton className="btn btn-line" pendingText="Saving…">Change password</SubmitButton>
      <p className="hint" style={{ marginTop: 8 }}>Changing your password signs out your other devices.</p>
    </form>
  );
}
