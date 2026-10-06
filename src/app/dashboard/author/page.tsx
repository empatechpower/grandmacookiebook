import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { authorEarnings } from "@/lib/earnings";
import { money, net } from "@/lib/money";
import { fmtDate, fmtWhen } from "@/lib/dates";
import { bookingMoneyStatus, lineMoneyStatus, moneyBadge, trackingUrl } from "@/lib/shipping";
import { Badge, Kpis, Table } from "@/components/ui";

export default async function AuthorDashboard() {
  const user = await requireUser("AUTHOR");
  const sold = { authorId: user.id, status: { in: ["PAID", "SHIPPED", "DELIVERED"] } };
  const [earnings, totalOrders, newOrders, newBookings, units, bookings, orders] = await Promise.all([
    authorEarnings(user.id),
    db.orderItem.count({ where: sold }),
    db.orderItem.count({ where: { authorId: user.id, status: "PAID" } }),
    db.booking.count({ where: { authorId: user.id, status: "PENDING" } }),
    db.orderItem.aggregate({ where: sold, _sum: { qty: true } }),
    db.booking.findMany({
      where: { authorId: user.id },
      include: { package: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.orderItem.findMany({
      where: { authorId: user.id, status: { notIn: ["PENDING", "CANCELLED"] } },
      include: { order: { select: { number: true, createdAt: true } } },
      orderBy: { order: { createdAt: "desc" } },
      take: 5,
    }),
  ]);
  const bookSales = earnings.rows.filter((r) => r.label.startsWith("O-") && !r.refunded).reduce((s, r) => s + r.net, 0);

  return (
    <>
      <h2>Welcome back, {user.name.split(" ")[0]}</h2>
      <p className="lede-sm">Your account at a glance.</p>

      {(newBookings > 0 || newOrders > 0) && (
        <div className="alert alert-info">
          {newBookings > 0 && <><Link href="/dashboard/author/requests" style={{ textDecoration: "underline" }}>{newBookings} new booking request{newBookings > 1 ? "s" : ""}</Link> to answer. </>}
          {newOrders > 0 && <><Link href="/dashboard/author/orders" style={{ textDecoration: "underline" }}>{newOrders} new order{newOrders > 1 ? "s" : ""}</Link> to ship.</>}
        </div>
      )}

      <Kpis items={[["Total earnings", money(earnings.paidTotal)], ["On hold", money(earnings.pending)], ["Total orders", totalOrders], ["New orders", newOrders]]} />
      <Kpis items={[["New bookings", newBookings], ["Books sold", units._sum.qty ?? 0], ["Book sales (your share)", money(bookSales)], ["Last 30 days", money(earnings.last30)]]} />

      <div className="split" style={{ margin: "8px 0 10px" }}>
        <h3>Booking activity</h3>
        <Link className="btn btn-ghost btn-sm" href="/dashboard/author/requests">All bookings →</Link>
      </div>
      <Table heads={["Booking", "Date & time", "Organization", "Fee", "Status", "Payment"]} empty="No bookings yet.">
        {bookings.map((b) => (
          <tr key={b.id}>
            <td>B-{b.number} · {b.package.title}</td>
            <td>{fmtWhen(b)}</td>
            <td>{b.organisation}</td>
            <td>{money(net(b.fee, b.commissionPct))}</td>
            <td><Badge status={b.status} /></td>
            <td><span className={`badge ${moneyBadge(bookingMoneyStatus(b))}`}>{bookingMoneyStatus(b)}</span></td>
          </tr>
        ))}
      </Table>

      <div className="split" style={{ margin: "8px 0 10px" }}>
        <h3>Order tracking</h3>
        <Link className="btn btn-ghost btn-sm" href="/dashboard/author/orders">All orders →</Link>
      </div>
      <Table heads={["Order", "Product", "Date", "Status", "Payment", "Tracking"]} empty="No orders yet.">
        {orders.map((i) => {
          const url = trackingUrl(i.carrier, i.trackingNumber);
          return (
            <tr key={i.id}>
              <td>O-{i.order.number}</td>
              <td>{i.title} × {i.qty}</td>
              <td>{fmtDate(i.order.createdAt)}</td>
              <td><Badge status={i.status} /></td>
              <td><span className={`badge ${moneyBadge(lineMoneyStatus(i))}`}>{lineMoneyStatus(i)}</span></td>
              <td>
                {i.trackingNumber ? (url ? <a href={url} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>{i.carrier} {i.trackingNumber}</a> : `${i.carrier ?? ""} ${i.trackingNumber}`) : i.status === "PAID" ? <Link href="/dashboard/author/orders" style={{ textDecoration: "underline" }}>Add tracking</Link> : "—"}
              </td>
            </tr>
          );
        })}
      </Table>

      <div className="row" style={{ marginTop: 8 }}>
        <Link className="btn btn-terra" href="/dashboard/author/books/new">+ Add product</Link>
        <Link className="btn btn-ink" href="/dashboard/author/visits/new">+ Create New Listing</Link>
        <Link className="btn btn-line" href="/dashboard/author/profile">Edit storefront</Link>
      </div>
    </>
  );
}
