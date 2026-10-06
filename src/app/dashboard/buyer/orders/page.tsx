import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { money } from "@/lib/money";
import { trackingUrl } from "@/lib/shipping";
import { markReceived } from "@/app/actions/shop";
import { Badge, PageHead, Table, fmtDate } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export default async function BuyerOrders() {
  const user = await requireUser("BUYER");
  const orders = await db.order.findMany({
    where: { buyerId: user.id },
    include: {
      items: {
        include: {
          author: { select: { name: true } },
          review: { select: { id: true } },
          issues: { where: { status: "OPEN" }, select: { id: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <PageHead
        title="Orders"
        sub="Each author ships their own titles. Your payment is held until you mark a book received (or 14 days pass). Something wrong? Report it before then for a full refund."
      />
      <Table heads={["Order", "Date", "Book", "Author", "Qty", "Amount", "Status", ""]} empty="No orders yet.">
        {orders.flatMap((o) =>
          o.items.map((i, idx) => (
            <tr key={i.id}>
              <td>{idx === 0 ? `O-${o.number}` : ""}</td>
              <td>{idx === 0 ? fmtDate(o.createdAt) : ""}</td>
              <td>{i.title}</td>
              <td>{i.author.name}</td>
              <td>{i.qty}</td>
              <td>{money(i.unitPrice * i.qty)}</td>
              <td>
                <Badge status={i.status} />
                {i.trackingNumber && (
                  <div style={{ fontSize: ".78rem", marginTop: 4 }}>
                    {trackingUrl(i.carrier, i.trackingNumber) ? (
                      <a href={trackingUrl(i.carrier, i.trackingNumber)!} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>Track {i.carrier} ↗</a>
                    ) : (
                      <>{i.carrier} {i.trackingNumber}</>
                    )}
                  </div>
                )}
                {i.issues.length > 0 && <div><span className="badge b-off">Problem reported</span></div>}
              </td>
              <td>
                <div className="row" style={{ flexWrap: "wrap" }}>
                  {["PAID", "SHIPPED"].includes(i.status) && !i.issues.length && (
                    <form action={markReceived}>
                      <input type="hidden" name="id" value={i.id} />
                      <SubmitButton className="btn btn-sage btn-sm" confirm="Confirm this book arrived? This releases payment to the author.">
                        Mark received
                      </SubmitButton>
                    </form>
                  )}
                  {["PAID", "SHIPPED"].includes(i.status) && !i.transferId && !i.issues.length && (
                    <Link className="btn btn-ghost btn-sm" href={`/dashboard/buyer/report?item=${i.id}`}>Report a problem</Link>
                  )}
                  {i.status === "DELIVERED" && !i.review && (
                    <Link className="btn btn-terra btn-sm" href={`/dashboard/buyer/review?item=${i.id}`}>★ Review</Link>
                  )}
                </div>
              </td>
            </tr>
          )),
        )}
      </Table>
    </>
  );
}
