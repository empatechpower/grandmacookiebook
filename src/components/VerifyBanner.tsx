import { resendVerification } from "@/app/actions/auth";
import { SubmitButton } from "./SubmitButton";

/** Shown to signed-in users who haven't confirmed their email yet. */
export function VerifyBanner({ user }: { user: { email: string; emailVerifiedAt: Date | null } | null }) {
  if (!user || user.emailVerifiedAt) return null;
  return (
    <div className="verify-banner" role="status">
      <span aria-hidden>✉️</span>
      <div>
        <b>Please confirm your email.</b> We sent a link to <b>{user.email}</b>. Until you confirm, you can look around but can’t check out, book, send purchase orders, message or list.
      </div>
      <form action={resendVerification}>
        <SubmitButton className="btn btn-line btn-sm" pendingText="Sending…">Resend email</SubmitButton>
      </form>
    </div>
  );
}
