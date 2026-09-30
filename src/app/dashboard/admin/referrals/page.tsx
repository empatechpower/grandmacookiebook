import { db } from "@/lib/db";
import { money } from "@/lib/money";
import { payAllReferralsNow, payReferrerNow, reviewReferral } from "@/app/actions/referrals";
import { Badge, PageHead, Table, fmtDate } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export default async function AdminReferrals() {
  const [pending, all, owed] = await Promise.all([
    db.referral.findMany({ where: { status: "PENDING" }, include: { referrer: { select: { name: true, email: true } }, referredUser: { select: { name: true } } }, orderBy: { createdAt: "asc" } }),
    db.referral.findMany({ where: { status: { not: "PENDING" } }, include: { referrer: { select: { name: true } }, earnings: { select: { amount: true } } }, orderBy: { createdAt: "desc" }, take: 200 }),
    db.referralEarning.findMany({ where: { payoutId: null }, include: { referral: { include: { referrer: { select: { id: true, name: true, email: true, payoutsReady: true } } } } } }),
  ]);
  const balances = new Map<string, { name: string; email: string; stripe: boolean; amount: number; count: number }>();
  for (const e of owed) {
    const r = e.referral.referrer;
    const b = balances.get(r.id) ?? { name: r.name, email: r.email, stripe: r.payoutsReady, amount: 0, count: 0 };
    b.amount += e.amount;
    b.count += 1;
    balances.set(r.id, b);
  }
  return (
    <>
      <PageHead title="Referrals" sub="Verify referrals, then pay rewards quarterly (the quarterly job does this automatically if scheduled)." />

      <h3 className="h2-sm">To verify</h3>
      <Table heads={["Submitted", "Referrer", "Referred", "Joined?", "Decision"]} empty="No referrals waiting.">
        {pending.map((r) => (
          <tr key={r.id}>
            <td>{fmtDate(r.createdAt)}</td>
            <td>{r.referrer.name}<div className="muted" style={{ fontSize: ".8rem" }}>{r.referrer.email}</div></td>
            <td>{r.referredName}<div className="muted" style={{ fontSize: ".8rem" }}>{r.referredEmail}</div></td>
            <td>{r.referredUser ? `Yes (${r.referredUser.name})` : "Not yet"}</td>
            <td>
              <form action={reviewReferral} className="inline-form">
                <input type="hidden" name="id" value={r.id} />
                <input name="note" placeholder="Note (optional)" aria-label="Note" />
                <SubmitButton name="decision" value="approve" className="btn btn-sage btn-sm">Verify</SubmitButton>
                <SubmitButton name="decision" value="reject" className="btn btn-danger btn-sm">Reject</SubmitButton>
              </form>
            </td>
          </tr>
        ))}
      </Table>

      <div className="split" style={{ margin: "28px 0 12px" }}>
        <h3>Rewards owed</h3>
        {balances.size > 0 && (
          <form action={payAllReferralsNow}>
            <SubmitButton className="btn btn-terra btn-sm" confirm="Pay every referrer their balance now?">Pay all now</SubmitButton>
          </form>
        )}
      </div>
      <Table heads={["Referrer", "Sales", "Owed", ""]} empty="Nothing owed.">
        {[...balances.entries()].map(([id, b]) => (
          <tr key={id}>
            <td>{b.name}<div className="muted" style={{ fontSize: ".8rem" }}>{b.email}</div></td>
            <td>{b.count}</td>
            <td><b>{money(b.amount)}</b></td>
            <td>
              <form action={payReferrerNow} className="row">
                <input type="hidden" name="referrerId" value={id} />
                {b.stripe && <SubmitButton className="btn btn-sage btn-sm">Pay via Stripe</SubmitButton>}
                <SubmitButton name="manual" value="1" className="btn btn-line btn-sm" confirm="Record as paid outside Stripe (bank transfer, Zelle…)?">Mark paid manually</SubmitButton>
              </form>
            </td>
          </tr>
        ))}
      </Table>

      <h3 className="h2-sm">All referrals</h3>
      <Table heads={["Submitted", "Referrer", "Referred", "Status", "Until", "Earned"]} empty="None yet.">
        {all.map((r) => (
          <tr key={r.id}>
            <td>{fmtDate(r.createdAt)}</td>
            <td>{r.referrer.name}</td>
            <td>{r.referredName}<div className="muted" style={{ fontSize: ".8rem" }}>{r.referredEmail}</div></td>
            <td><Badge status={r.status} /></td>
            <td>{r.status === "APPROVED" ? fmtDate(r.expiresAt) : "—"}</td>
            <td>{money(r.earnings.reduce((t, e) => t + e.amount, 0))}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
