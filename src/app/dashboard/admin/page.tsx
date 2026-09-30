import Link from "next/link";
import { db } from "@/lib/db";
import { money } from "@/lib/money";
import { Kpis } from "@/components/ui";
import { releaseDueNow } from "@/app/actions/admin";
import { SubmitButton } from "@/components/SubmitButton";

export default async function AdminHome() {
  const [authors, buyers, pendingAuthors, pendingBooks, pendingPkgs, orderSum, bookingSum, pendingBookings, failedItems, failedBookings, notConnected] = await Promise.all([
    db.user.count({ where: { role: "AUTHOR", status: "ACTIVE" } }),
    db.user.count({ where: { role: "BUYER" } }),
    db.user.count({ where: { role: "AUTHOR", status: "PENDING" } }),
    db.book.count({ where: { status: "PENDING" } }),
    db.visitPackage.count({ where: { status: "PENDING" } }),
    db.order.aggregate({ where: { status: "PAID" }, _sum: { total: true } }),
    db.booking.aggregate({ where: { status: { in: ["CONFIRMED", "COMPLETED"] } }, _sum: { fee: true } }),
    db.booking.count({ where: { status: "PENDING" } }),
    db.orderItem.count({ where: { transferError: { not: null }, transferId: null } }),
    db.booking.count({ where: { transferError: { not: null }, transferId: null } }),
    db.user.count({ where: { role: "AUTHOR", status: "ACTIVE", payoutsReady: false } }),
  ]);
  const [heldItems, heldBookings] = await Promise.all([
    db.orderItem.findMany({ where: { transferId: null, status: { in: ["PAID", "SHIPPED", "DELIVERED"] } }, select: { unitPrice: true, qty: true } }),
    db.booking.findMany({ where: { transferId: null, status: { in: ["CONFIRMED", "COMPLETED"] } }, select: { fee: true } }),
  ]);
  const openIssues = await db.issue.count({ where: { status: "OPEN" } });
  const held = heldItems.reduce((s, i) => s + i.unitPrice * i.qty, 0) + heldBookings.reduce((s, b) => s + b.fee, 0);
  const gmv = (orderSum._sum.total ?? 0) + (bookingSum._sum.fee ?? 0);
  const todo: [number, string, string][] = [
    [openIssues, "problem report(s) — payouts paused", "/dashboard/admin/issues"],
    [pendingAuthors, "author account(s) to approve", "/dashboard/admin/users?filter=pending"],
    [pendingBooks + pendingPkgs, "listing(s) awaiting review", "/dashboard/admin/listings"],
    [failedItems + failedBookings, "failed author transfer(s) to retry", failedItems ? "/dashboard/admin/orders" : "/dashboard/admin/bookings"],
    [notConnected, "approved author(s) without Stripe (hidden)", "/dashboard/admin/users?filter=AUTHOR"],
  ];
  return (
    <>
      <h2>Super admin</h2>
      <p className="lede-sm">Govern who sells, what is listed, and which bookings clear.</p>
      <Kpis items={[["Active authors", authors], ["Buyers", buyers], ["GMV", money(gmv)], ["Pending bookings", pendingBookings]]} />
      <div className="panel split" style={{ marginBottom: 8 }}>
        <div>
          <b>{money(held)}</b> in buyer payments is on hold ({heldItems.length + heldBookings.length} sale{heldItems.length + heldBookings.length === 1 ? "" : "s"}).
          <div className="muted" style={{ fontSize: ".85rem" }}>
            Released when the buyer confirms, or automatically by the daily job 14 days later.
          </div>
        </div>
        <form action={releaseDueNow}>
          <SubmitButton className="btn btn-line btn-sm">Release due payouts now</SubmitButton>
        </form>
      </div>
      <h3 className="h2-sm">Needs attention</h3>
      <div className="grid-3">
        {todo.map(([n, label, href]) => (
          <Link key={href} href={href} className="kpi" style={{ display: "block" }}>
            <b style={{ color: n ? "var(--terracotta)" : undefined }}>{n}</b>
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
