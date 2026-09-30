import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { money } from "@/lib/money";
import { cancelBooking, confirmVisit, payBooking } from "@/app/actions/shop";
import { todayKey, dayKey, isLateCancellation } from "@/lib/dates";
import { getSettings } from "@/lib/settings";
import { openConversation } from "@/app/actions/messages";
import { Badge, PageHead, Table, fmtDate } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { ContractCell } from "@/components/ContractCell";

export default async function BuyerBookings() {
  const user = await requireUser("BUYER");
  const { cancelNoticeDays } = await getSettings();
  const bookings = await db.booking.findMany({
    where: { buyerId: user.id },
    include: {
      package: true,
      author: { select: { id: true, name: true } },
      review: { select: { id: true } },
      issues: { where: { status: "OPEN" }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <PageHead
        title="My bookings"
        sub={`You pay only after the author accepts. Payment is held until you confirm the visit happened (or 14 days after the event). Cancel a paid booking at least ${cancelNoticeDays} days before the event for a full refund.`}
        action={<Link className="btn btn-ink" href="/visits">Book a visit</Link>}
      />
      <Table heads={["ID", "Visit", "Date", "Venue", "Fee", "Status", ""]} empty="No bookings yet.">
        {bookings.map((b) => (
          <tr key={b.id}>
            <td>B-{b.number}</td>
            <td>
              <b>{b.package.title}</b>
              <div className="muted" style={{ fontSize: ".8rem" }}>
                <Link href={`/authors/${b.author.id}`}>{b.author.name}</Link>
              </div>
              {b.authorNote && <div style={{ fontSize: ".8rem", marginTop: 4 }}>“{b.authorNote}”</div>}
              <ContractCell b={b} />
            </td>
            <td>{fmtDate(b.eventDate)}</td>
            <td>{b.organisation}<div className="muted" style={{ fontSize: ".8rem" }}>{b.venue}</div></td>
            <td>{money(b.fee)}</td>
            <td>
              <Badge status={b.status} />
              {b.issues.length > 0 && <div><span className="badge b-off">Problem reported</span></div>}
            </td>
            <td>
              <div className="row" style={{ flexWrap: "wrap" }}>
                {b.status === "ACCEPTED" && (
                  <form action={payBooking}>
                    <input type="hidden" name="id" value={b.id} />
                    <SubmitButton className="btn btn-terra btn-sm" pendingText="Paying…">Pay {money(b.fee)}</SubmitButton>
                  </form>
                )}
                {b.status === "CONFIRMED" && !b.issues.length && dayKey(b.eventDate) <= todayKey() && (
                  <form action={confirmVisit}>
                    <input type="hidden" name="id" value={b.id} />
                    <SubmitButton className="btn btn-sage btn-sm" confirm="Confirm the visit happened? This releases payment to the author.">
                      Confirm visit
                    </SubmitButton>
                  </form>
                )}
                {b.status === "COMPLETED" && !b.review && (
                  <Link className="btn btn-terra btn-sm" href={`/dashboard/buyer/review?booking=${b.id}`}>★ Review</Link>
                )}
                {["CONFIRMED", "COMPLETED"].includes(b.status) && !b.transferId && !b.issues.length && (
                  <Link className="btn btn-ghost btn-sm" href={`/dashboard/buyer/report?booking=${b.id}`}>Report a problem</Link>
                )}
                <form action={openConversation}>
                  <input type="hidden" name="with" value={b.author.id} />
                  <SubmitButton className="btn btn-ghost btn-sm">Message</SubmitButton>
                </form>
                {(["PENDING", "ACCEPTED"].includes(b.status) || (b.status === "CONFIRMED" && !b.transferId && !b.issues.length)) && (
                  <form action={cancelBooking}>
                    <input type="hidden" name="id" value={b.id} />
                    <SubmitButton
                      className="btn btn-danger btn-sm"
                      confirm={
                        b.status !== "CONFIRMED"
                          ? "Cancel this booking request?"
                          : isLateCancellation(b.eventDate, cancelNoticeDays)
                            ? `This is less than ${cancelNoticeDays} days before the event, so the ${money(b.fee)} fee won't be refunded and will be paid to the author. Cancel anyway?`
                            : `Cancel and get a full refund of ${money(b.fee)}?`
                      }
                    >
                      Cancel
                    </SubmitButton>
                  </form>
                )}
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
