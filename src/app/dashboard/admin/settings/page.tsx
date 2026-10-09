import { getSettings } from "@/lib/settings";
import { PasswordInput } from "@/components/PasswordInput";
import { inviteAdmin, saveFees } from "@/app/actions/admin";
import { PageHead } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { ChangePasswordForm } from "@/components/PasswordForms";
import { integrationStatus } from "@/lib/integrations";

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
          <fieldset className="field">
            <legend>Bulk book discounts (authors can switch these off per product)</legend>
            <div className="field-row">
              <div className="field"><label htmlFor="t1m">Tier 1 from (copies)</label><input id="t1m" name="bulkTier1Min" type="number" min={2} defaultValue={s.bulkTier1Min} max={1000} /></div>
              <div className="field"><label htmlFor="t1p">Tier 1 discount %</label><input id="t1p" name="bulkTier1Pct" type="number" min={0} max={90} defaultValue={s.bulkTier1Pct} /></div>
            </div>
            <div className="field-row">
              <div className="field"><label htmlFor="t2m">Tier 2 from (copies)</label><input id="t2m" name="bulkTier2Min" type="number" min={3} defaultValue={s.bulkTier2Min} max={1000} /></div>
              <div className="field"><label htmlFor="t2p">Tier 2 discount %</label><input id="t2p" name="bulkTier2Pct" type="number" min={0} max={90} defaultValue={s.bulkTier2Pct} /></div>
            </div>
          </fieldset>
          <div className="field">
            <label htmlFor="cn">Late cancellation window (days)</label>
            <input id="cn" name="cancelNoticeDays" type="number" min={0} max={60} defaultValue={s.cancelNoticeDays} />
            <div className="hint">Buyers who cancel a paid booking with less notice than this aren’t refunded; the author is paid.</div>
          </div>
          <div className="field">
            <label htmlFor="po">Purchase order payment terms (days)</label>
            <input id="po" name="poTermsDays" type="number" min={0} max={120} defaultValue={s.poTermsDays} />
            <div className="hint">Invoices for approved purchase orders are due this many days later (30 = Net 30).</div>
          </div>
          <SubmitButton>Save schedule</SubmitButton>
        </form>
        <form action={inviteAdmin} className="panel">
          <h3 style={{ marginBottom: 12 }}>Add a super admin</h3>
          <div className="field">
            <label htmlFor="n">Name</label>
            <input id="n" name="name" required minLength={2} maxLength={80} />
          </div>
          <div className="field">
            <label htmlFor="e">Email</label>
            <input id="e" name="email" type="email" required maxLength={160} />
          </div>
          <div className="field">
            <label htmlFor="p">Temporary password</label>
            <PasswordInput id="p" name="password" minLength={8} maxLength={200} required autoComplete="new-password" />
            <div className="hint">Share it securely.</div>
          </div>
          <SubmitButton className="btn btn-terra">Add admin</SubmitButton>
        </form>
      </div>
      <h3 className="h2-sm">Integrations</h3>
      <div className="table-wrap" style={{ maxWidth: 820 }}>
        <table>
          <tbody>
            {integrationStatus().map((i) => (
              <tr key={i.name}>
                <td><b>{i.name}</b><div className="muted" style={{ fontSize: ".75rem" }}><code>{i.env}</code></div></td>
                <td><span className={`badge ${i.ok ? "b-ok" : "b-wait"}`}>{i.ok ? "Set up" : "Not set"}</span></td>
                <td className="muted" style={{ fontSize: ".88rem" }}>{i.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ChangePasswordForm />
    </>
  );
}
