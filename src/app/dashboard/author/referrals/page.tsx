import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { money } from "@/lib/money";
import { isEligibleReferrer } from "@/lib/referrals";
import { submitReferral } from "@/app/actions/referrals";
import { Badge, Kpis, PageHead, Table, fmtDate } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export default async function Referrals() {
  const user = await requireUser("AUTHOR");
  const [s, eligible, referrals, payouts] = await Promise.all([
    getSettings(),
    isEligibleReferrer(user.id),
    db.referral.findMany({
      where: { referrerId: user.id },
      include: { referredUser: { select: { id: true, status: true } }, earnings: { select: { amount: true, payoutId: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.referralPayout.findMany({ where: { referrerId: user.id }, orderBy: { createdAt: "desc" } }),
  ]);
  const earned = referrals.flatMap((r) => r.earnings).reduce((t, e) => t + e.amount, 0);
  const owed = referrals.flatMap((r) => r.earnings).filter((e) => !e.payoutId).reduce((t, e) => t + e.amount, 0);
  return (
    <>
      <PageHead
        title="Referral program"
        sub={`Refer an author or publisher. Once we verify it, you earn ${s.referralPct}% of every sale they make on South Texas Book & Author for ${s.referralMonths} months — paid quarterly.`}
        action={<Link className="btn btn-ghost btn-sm" href="/referral" target="_blank">Program terms</Link>}
      />
      {!eligible && (
        <div className="alert alert-info">
          Rewards are paid to authors with an active account and at least one live listing. You can refer now — rewards start once you have a live book or visit package.
        </div>
      )}
      <Kpis items={[["Referrals", referrals.length], ["Verified", referrals.filter((r) => r.status === "APPROVED").length], ["Earned", money(earned)], ["Next payout", money(owed)]]} />

      <form action={submitReferral} className="panel" style={{ maxWidth: 620, marginBottom: 24 }}>
        <h3 style={{ marginBottom: 12 }}>Refer an author</h3>
        <div className="field-row">
          <div className="field">
            <label htmlFor="name">Their name</label>
            <input id="name" name="name" required />
          </div>
          <div className="field">
            <label htmlFor="email">Their email</label>
            <input id="email" name="email" type="email" required />
          </div>
        </div>
        <p className="hint" style={{ marginBottom: 12 }}>We’ll email them an invitation. The first referral submitted for a person counts.</p>
        <SubmitButton className="btn btn-terra">Send referral</SubmitButton>
      </form>

      <h3 className="h2-sm">Your referrals</h3>
      <Table heads={["Referred", "Submitted", "Status", "Joined", "Rewards until", "Earned"]} empty="No referrals yet.">
        {referrals.map((r) => (
          <tr key={r.id}>
            <td>{r.referredName}<div className="muted" style={{ fontSize: ".8rem" }}>{r.referredEmail}</div></td>
            <td>{fmtDate(r.createdAt)}</td>
            <td>
              <Badge status={r.status} />
              {r.adminNote && <div className="muted" style={{ fontSize: ".78rem" }}>{r.adminNote}</div>}
            </td>
            <td>{r.referredUser ? (r.referredUser.status === "ACTIVE" ? "Yes" : "Pending approval") : "Not yet"}</td>
            <td>{r.status === "APPROVED" ? fmtDate(r.expiresAt) : "—"}</td>
            <td>{money(r.earnings.reduce((t, e) => t + e.amount, 0))}</td>
          </tr>
        ))}
      </Table>
      {payouts.length > 0 && (
        <>
          <h3 className="h2-sm">Payouts</h3>
          <Table heads={["Date", "Amount", "Method"]}>
            {payouts.map((p) => (
              <tr key={p.id}>
                <td>{fmtDate(p.createdAt)}</td>
                <td>{money(p.amount)}</td>
                <td>{p.method === "STRIPE" ? "Stripe" : "Manual"}</td>
              </tr>
            ))}
          </Table>
        </>
      )}
    </>
  );
}
