import { db } from "@/lib/db";
import { money } from "@/lib/money";
import { adminCancelBooking } from "@/app/actions/admin";
import { Badge, PageHead, Table, fmtDate } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { TransferCell } from "@/components/TransferCell";

export default async function AdminBookings() {
  const bookings = await db.booking.findMany({
    include: { package: true, buyer: { select: { name: true } }, author: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <>
      <PageHead title="Bookings" sub="All visit and speech bookings. Cancelling a paid booking refunds the buyer; held fees never reach the author." />
      <Table heads={["ID", "Visit", "Author", "Buyer", "Date", "Fee", "Status", "To author", ""]} empty="No bookings yet.">
        {bookings.map((b) => (
          <tr key={b.id}>
            <td>B-{b.number}</td>
            <td>{b.package.title}<div className="muted" style={{ fontSize: ".8rem" }}>{b.organisation}</div></td>
            <td>{b.author.name}</td>
            <td>{b.buyer.name}</td>
            <td>{fmtDate(b.eventDate)}</td>
            <td>{money(b.fee)}</td>
            <td><Badge status={b.status} /></td>
            <td>
              <TransferCell kind="booking" id={b.id} transferId={b.transferId} transferError={b.transferError} releaseAt={b.releaseAt} paid={["CONFIRMED", "COMPLETED"].includes(b.status)} />
            </td>
            <td>
              {!["CANCELLED", "DECLINED", "COMPLETED"].includes(b.status) && (
                <form action={adminCancelBooking}>
                  <input type="hidden" name="id" value={b.id} />
                  <SubmitButton className="btn btn-danger btn-sm" confirm={`Cancel B-${b.number}?${b.paymentRef ? " The buyer will be refunded." : ""}`}>Cancel</SubmitButton>
                </form>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
