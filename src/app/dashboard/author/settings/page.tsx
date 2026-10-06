import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { updateAccount } from "@/app/actions/author";
import { PageHead } from "@/components/ui";
import { ChangePasswordForm } from "@/components/PasswordForms";
import { SubmitButton } from "@/components/SubmitButton";

export default async function Settings() {
  const user = await requireUser("AUTHOR");
  return (
    <>
      <PageHead title="Settings" sub="Your account, payouts and password." />
      <div className="grid-2" style={{ alignItems: "start", maxWidth: 1000 }}>
        <form action={updateAccount} className="panel">
          <h3 style={{ marginBottom: 12 }}>Account</h3>
          <div className="field"><label>Email (sign-in)</label><input value={user.email} disabled /></div>
          <div className="field"><label htmlFor="phone">Phone</label><input id="phone" name="phone" type="tel" defaultValue={user.phone ?? ""} autoComplete="tel" /><div className="hint">Only shown to the platform team, never on your storefront.</div></div>
          <SubmitButton>Save</SubmitButton>
        </form>
        <div className="panel">
          <h3 style={{ marginBottom: 6 }}>Payouts</h3>
          <p className="muted" style={{ fontSize: ".92rem", marginBottom: 12 }}>
            {user.payoutsReady ? "Stripe is connected — you're paid automatically." : "Connect Stripe so you can be paid. Your storefront stays hidden until you do."}
          </p>
          <div className="row">
            <Link className="btn btn-ink btn-sm" href="/dashboard/author/payouts">{user.payoutsReady ? "View payouts" : "Set up payouts"}</Link>
            <Link className="btn btn-ghost btn-sm" href="/dashboard/author/referrals">Referral program</Link>
          </div>
        </div>
      </div>
      <ChangePasswordForm />
    </>
  );
}
