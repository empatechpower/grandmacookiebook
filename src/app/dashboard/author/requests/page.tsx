import { db } from "@/lib/db";
import { dayKey, fmtWhen, todayKey } from "@/lib/dates";
import { requireUser } from "@/lib/auth";
import { money, net } from "@/lib/money";
import { authorCancelBooking, respondBooking } from "@/app/actions/author";
import { openConversation } from "@/app/actions/messages";
import { Badge, PageHead, Table, fmtDate } from "@/components/ui";
import { bookingMoneyStatus, moneyBadge } from "@/lib/shipping";
import { SubmitButton } from "@/components/SubmitButton";
import { ContractCell } from "@/components/ContractCell";
import { orgTypeLabel } from "@/lib/constants";

export default async function Requests() {
  const user = await requireUser("AUTHOR");
  const bookings = await db.booking.findMany({
    where: { authorId: user.id },
    include: {
      package: true,
      buyer: { select: { id: true, name: true, email: true, orgType: true } },
      issues: { where: { status: "OPEN" }, select: { id: true } },
      purchaseOrder: { select: { status: true } },
    },
    orderBy: [{ status: "desc" }, { eventDate: "asc" }],
  });
  return (
    <>
      <PageHead title="Bookings" sub="Accept or decline requests, see who booked and when, and track payment. Your fee is released after the visit — when the organizer confirms, or 14 days after the event." />
      <Table heads={["ID", "Event", "Date & time", "Organization", "You earn", "Status", "Payment", ""]} empty="No bookings yet.">
        {bookings.map((b) => (
          <tr key={b.id}>
            <td>B-{b.number}</td>
            <td>
              <b>{b.package.title}</b>
              <div className="muted" style={{ fontSize: ".8rem" }}>{b.organisation} · {b.venue} · {b.audienceSize} people</div>
              {b.message && <div style={{ fontSize: ".8rem", marginTop: 4 }}>“{b.message}”</div>}
              <ContractCell b={b} />
            </td>
            <td>{fmtWhen(b)}</td>
            <td>
              {b.buyer.name}
              {orgTypeLabel(b.buyer.orgType) && <div><span className="chip">{orgTypeLabel(b.buyer.orgType)}</span></div>}
              <div className="muted" style={{ fontSize: ".8rem" }}>{b.buyer.email}</div>
              <form action={openConversation}>
                <input type="hidden" name="with" value={b.buyer.id} />
                <SubmitButton className="btn btn-ghost btn-sm" style={{ paddingLeft: 0 }}>Message →</SubmitButton>
              </form>
            </td>
            <td>{money(net(b.fee, b.commissionPct))}<div className="muted" style={{ fontSize: ".75rem" }}>of {money(b.fee)}</div></td>
            <td>
              <Badge status={b.status} />
              {b.issues.length > 0 && <div><span className="badge b-off" title="Payment paused while South Texas Book & Author reviews it">Problem reported</span></div>}
            </td>
            <td><span className={`badge ${moneyBadge(bookingMoneyStatus(b))}`}>{bookingMoneyStatus(b)}</span></td>
            <td>
              {b.status === "PENDING" && (
                <form action={respondBooking} className="inline-form" style={{ flexWrap: "wrap", maxWidth: 300 }}>
                  <input type="hidden" name="id" value={b.id} />
                  <input name="fee" type="number" step="0.01" min="1" defaultValue={(b.fee / 100).toString()} aria-label="Final quote (USD)" title="Final quote in USD — add travel costs here" style={{ width: 90 }} />
                  <input name="note" placeholder="Note, e.g. incl. travel" aria-label="Note to buyer" style={{ flex: 1 }} />
                  <SubmitButton name="decision" value="accept" className="btn btn-sage btn-sm">Accept</SubmitButton>
                  <SubmitButton name="decision" value="decline" className="btn btn-danger btn-sm">Decline</SubmitButton>
                </form>
              )}
              {b.status === "ACCEPTED" && <span className="muted" style={{ fontSize: ".8rem" }}>Awaiting buyer payment</span>}
              {b.status === "CONFIRMED" && (
                <span className="muted" style={{ fontSize: ".8rem" }}>
                  Paid · {b.transferId ? "released to you" : `releases when the buyer confirms, or ${fmtDate(b.releaseAt ?? b.eventDate)}`}
                </span>
              )}
              {b.status === "COMPLETED" && <span className="muted" style={{ fontSize: ".8rem" }}>{b.transferId ? "Paid to you" : "Releasing…"}</span>}
              {["ACCEPTED", "CONFIRMED"].includes(b.status) && !b.transferId && dayKey(b.eventDate) >= todayKey() && (
                <details className="cancel-box">
                  <summary>Cancel booking</summary>
                  <form action={authorCancelBooking} className="stack" style={{ marginTop: 8 }}>
                    <input type="hidden" name="id" value={b.id} />
                    <input name="reason" required minLength={3} maxLength={300} placeholder="Reason (sent to the customer)" aria-label="Reason for canceling" />
                    <SubmitButton className="btn btn-danger btn-sm" confirm={`Cancel B-${b.number}? ${b.status === "CONFIRMED" ? `${b.buyer.name} will be refunded the full ${money(b.fee)}.` : "The customer will be told."}`}>
                      Cancel and refund in full
                    </SubmitButton>
                  </form>
                </details>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
