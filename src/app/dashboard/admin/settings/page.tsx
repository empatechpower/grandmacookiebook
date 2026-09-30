import { getSettings } from "@/lib/settings";
import { inviteAdmin, saveFees } from "@/app/actions/admin";
import { PageHead } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { ChangePasswordForm } from "@/components/PasswordForms";

export default async function Settings() {
  const s = await getSettings();
  return (
    <>
      <PageHead title="Fees & admins" />
      <div className="grid-2">
        <form action={saveFees} className="panel">
          <h3 style={{ marginBottom: 12 }}>Commission</h3>
          <div className="field">
            <label htmlFor="b">Book commission %</label>
            <input id="b" name="bookCommissionPct" type="number" min={0} max={50} defaultValue={s.bookCommissionPct} />
          </div>
          <div className="field">
            <label htmlFor="v">Visit commission %</label>
            <input id="v" name="visitCommissionPct" type="number" min={0} max={50} defaultValue={s.visitCommissionPct} />
            <div className="hint">New rates apply to new orders and bookings only; existing ones keep the rate they were made at.</div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="rp">Referral reward %</label>
              <input id="rp" name="referralPct" type="number" step="0.5" min={0} max={10} defaultValue={s.referralPct} />
            </div>
            <div className="field">
              <label htmlFor="rm">Referral window (months)</label>
              <input id="rm" name="referralMonths" type="number" min={1} max={60} defaultValue={s.referralMonths} />
            </div>
          </div>
          <div className="hint" style={{ marginBottom: 12 }}>Applies to new referrals; existing ones keep their rate and end date.</div>
          <SubmitButton>Save schedule</SubmitButton>
        </form>
        <form action={inviteAdmin} className="panel">
          <h3 style={{ marginBottom: 12 }}>Add a super admin</h3>
          <div className="field">
            <label htmlFor="n">Name</label>
            <input id="n" name="name" required />
          </div>
          <div className="field">
            <label htmlFor="e">Email</label>
            <input id="e" name="email" type="email" required />
          </div>
          <div className="field">
            <label htmlFor="p">Temporary password</label>
            <input id="p" name="password" type="text" minLength={8} required />
            <div className="hint">Share it securely.</div>
          </div>
          <SubmitButton className="btn btn-terra">Add admin</SubmitButton>
        </form>
      </div>
      <ChangePasswordForm />
    </>
  );
}
