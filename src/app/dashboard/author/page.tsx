import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { authorEarnings } from "@/lib/earnings";
import { money } from "@/lib/money";
import { Kpis } from "@/components/ui";

export default async function AuthorHome() {
  const user = await requireUser("AUTHOR");
  const [books, packages, pendingReq, toShip, earnings] = await Promise.all([
    db.book.count({ where: { authorId: user.id, status: "APPROVED" } }),
    db.visitPackage.count({ where: { authorId: user.id, status: "APPROVED" } }),
    db.booking.count({ where: { authorId: user.id, status: "PENDING" } }),
    db.orderItem.count({ where: { authorId: user.id, status: "PAID" } }),
    authorEarnings(user.id),
  ]);
  return (
    <>
      <h2>Studio</h2>
      <p className="lede-sm">You sell books and you take the work on the road.</p>
      <Kpis items={[["Titles live", books], ["Visit packages", packages], ["Pending requests", pendingReq], ["Paid to you (30 days)", money(earnings.last30)]]} />
      {(pendingReq > 0 || toShip > 0) && (
        <div className="alert alert-info">
          {pendingReq > 0 && <><Link href="/dashboard/author/requests" style={{ textDecoration: "underline" }}>{pendingReq} booking request{pendingReq > 1 ? "s" : ""}</Link> awaiting your answer. </>}
          {toShip > 0 && <><Link href="/dashboard/author/orders" style={{ textDecoration: "underline" }}>{toShip} order line{toShip > 1 ? "s" : ""}</Link> to ship.</>}
        </div>
      )}
      <div className="grid-2">
        <div className="card"><div className="body">
          <h3>New book</h3>
          <p className="muted" style={{ margin: "6px 0 12px" }}>List a title with price and stock. An admin reviews it before it goes live.</p>
          <Link className="btn btn-terra" href="/dashboard/author/books/new">Add a book</Link>
        </div></div>
        <div className="card"><div className="body">
          <h3>New visit package</h3>
          <p className="muted" style={{ margin: "6px 0 12px" }}>Offer a school visit, keynote or workshop with a set fee and format.</p>
          <Link className="btn btn-ink" href="/dashboard/author/visits/new">Add a package</Link>
        </div></div>
      </div>
    </>
  );
}
