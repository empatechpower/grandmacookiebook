import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { authorEarnings } from "@/lib/earnings";
import { getSettings } from "@/lib/settings";
import { money } from "@/lib/money";
import { demoMode, expressDashboardLink } from "@/lib/payments";
import { connectStripe, refreshStripeStatus } from "@/app/actions/author";
import { Kpis, PageHead, Table, fmtDate } from "@/components/ui";
import { HOLD_DAYS } from "@/lib/fulfillment";
import { SubmitButton } from "@/components/SubmitButton";

export default async function Payouts() {
  const user = await requireUser("AUTHOR");
  const [e, fees] = await Promise.all([authorEarnings(user.id), getSettings()]);

  return (
    <>
      <PageHead
        title="Payouts"
        sub={`You're paid automatically. After a buyer pays, your share is held until they confirm the book arrived or the visit happened — or ${HOLD_DAYS} days after (after the event, for visits) — then sent to your Stripe account.`}
      />

      <div className="panel" style={{ marginBottom: 24 }}>
        {user.payoutsReady ? (
          <div className="split">
            <div>
              <h3>Stripe connected{demoMode ? " (demo mode)" : ""}</h3>
              <p className="muted" style={{ fontSize: ".9rem" }}>
                Stripe pays out to your bank on its standard schedule. Manage your bank details and balance in Stripe.
              </p>
            </div>
            {!demoMode && user.stripeAccountId && (
              <form action={openStripeDashboard}>
                <SubmitButton className="btn btn-line">Open Stripe dashboard</SubmitButton>
              </form>
            )}
          </div>
        ) : (
          <div className="split">
            <div>
              <h3>{user.stripeAccountId ? "Finish setting up Stripe" : "Connect Stripe to get paid"}</h3>
              <p className="muted" style={{ fontSize: ".9rem" }}>
                Your listings stay hidden from buyers until this is done. It takes about 5 minutes: identity and bank details.
              </p>
            </div>
            <div className="row">
              <form action={connectStripe}>
                <SubmitButton className="btn btn-terra" pendingText="Opening Stripe…">
                  {user.stripeAccountId ? "Continue setup" : "Connect Stripe"}
                </SubmitButton>
              </form>
              {user.stripeAccountId && (
                <form action={refreshStripeStatus}>
                  <SubmitButton className="btn btn-ghost">Check status</SubmitButton>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      <Kpis
        items={[
          ["Paid to you", money(e.paidTotal)],
          ["Last 30 days", money(e.last30)],
          ["On hold", money(e.pending)],
          ["Commission", `${fees.bookCommissionPct}% / ${fees.visitCommissionPct}%`],
        ]}
      />
      <p className="muted" style={{ fontSize: ".85rem", marginBottom: 16 }}>
        Amounts are after commission (books {fees.bookCommissionPct}%, visits {fees.visitCommissionPct}%). If a sale is refunded, your share
        is reversed from your Stripe balance.
      </p>

      <h3 className="h2-sm">Transfers</h3>
      <Table heads={["Date", "Sale", "Price", "Your share", "Transfer"]} empty="No paid sales yet.">
        {e.rows.map((r) => (
          <tr key={r.id}>
            <td>{fmtDate(r.date)}</td>
            <td>{r.label}</td>
            <td>{money(r.gross)}</td>
            <td><b>{money(r.net)}</b></td>
            <td>
              {r.refunded ? (
                <span className="badge b-off">Refunded</span>
              ) : r.transferId ? (
                <span className="badge b-ok">Sent</span>
              ) : (
                <span className="badge b-wait" title={r.transferError ?? undefined}>
                  {r.transferError ? "Failed — admin will retry" : r.releaseAt ? `Held until ${fmtDate(r.releaseAt)}` : "Held"}
                </span>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}

async function openStripeDashboard() {
  "use server";
  const user = await requireUser("AUTHOR");
  const url = user.stripeAccountId ? await expressDashboardLink(user.stripeAccountId) : null;
  redirect(url ?? "/dashboard/author/payouts");
}
