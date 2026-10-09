import Link from "next/link";
import { fmtWhen } from "@/lib/dates";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { money } from "@/lib/money";
import { Badge, Kpis, Table, fmtDate } from "@/components/ui";

export default async function BuyerHome() {
  const user = await requireUser("BUYER");
  const [orders, bookings, cart, needsPayment] = await Promise.all([
    db.order.count({ where: { buyerId: user.id } }),
    db.booking.findMany({
      where: { buyerId: user.id, status: { in: ["PENDING", "ACCEPTED", "CONFIRMED"] } },
      include: { package: true, author: { select: { name: true } } },
      orderBy: { eventDate: "asc" },
    }),
    db.cartItem.aggregate({ where: { userId: user.id }, _sum: { qty: true } }),
    db.booking.count({ where: { buyerId: user.id, status: "ACCEPTED" } }),
  ]);
  return (
    <>
      <h2>Hello, {user.name}</h2>
      <p className="lede-sm">Buy a title or invite an author to your school, office, or hall.</p>
      {needsPayment > 0 && (
        <div className="alert alert-info">
          {needsPayment} booking{needsPayment > 1 ? "s were" : " was"} accepted and {needsPayment > 1 ? "are" : "is"} waiting for payment.{" "}
          <Link href="/dashboard/buyer/bookings" style={{ textDecoration: "underline" }}>Pay now</Link>
        </div>
      )}
      <Kpis items={[["Orders", orders], ["Active bookings", bookings.length], ["In cart", cart._sum.qty ?? 0], ["Account", "Guest"]]} />
      <div className="row-btns" style={{ marginBottom: 28 }}>
        <Link className="btn btn-terra" href="/books">Shop books</Link>
        <Link className="btn btn-ink" href="/visits">Book a visit</Link>
      </div>
      <h3 className="h2-sm">Upcoming visits</h3>
      <Table heads={["Date", "Visit", "Author", "Fee", "Status"]} empty="No upcoming visits. Browse author visits to invite an author.">
        {bookings.map((b) => (
          <tr key={b.id}>
            <td>{fmtWhen(b)}</td>
            <td>{b.package.title}</td>
            <td>{b.author.name}</td>
            <td>{money(b.fee)}</td>
            <td><Badge status={b.status} /></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
