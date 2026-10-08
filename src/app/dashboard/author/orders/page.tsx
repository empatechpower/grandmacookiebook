import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { money, net } from "@/lib/money";
import { CARRIERS, lineMoneyStatus, moneyBadge, trackingUrl } from "@/lib/shipping";
import { shipItem } from "@/app/actions/author";
import { Badge, PageHead, Table, fmtDate } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export default async function AuthorOrders() {
  const user = await requireUser("AUTHOR");
  const items = await db.orderItem.findMany({
    where: { authorId: user.id, status: { notIn: ["PENDING", "CANCELLED"] } },
    include: {
      order: { include: { buyer: { select: { name: true, email: true, phone: true, orgName: true } }, purchaseOrder: { select: { status: true } } } },
      issues: { where: { status: "OPEN" }, select: { id: true } },
    },
    orderBy: { order: { createdAt: "desc" } },
  });
  return (
    <>
      <PageHead
        title="Orders"
        sub="You ship your own titles. Add tracking when you ship — the customer is emailed the link. Your share is released when they confirm delivery, or 14 days after payment."
        action={items.length > 0 && <Link className="btn btn-line btn-sm" href="/dashboard/author/orders/export">Export CSV</Link>}
      />
      <Table heads={["Order", "Product", "Price × qty", "Customer & shipping", "Status", "Payment", "Tracking"]} empty="No orders yet.">
        {items.map((i) => {
          const url = trackingUrl(i.carrier, i.trackingNumber);
          return (
            <tr key={i.id}>
              <td>
                <b>O-{i.order.number}</b>
                <div className="muted" style={{ fontSize: ".8rem" }}>{fmtDate(i.order.createdAt)}</div>
              </td>
              <td>{i.title}</td>
              <td style={{ whiteSpace: "nowrap" }}>
                {money(i.unitPrice)} × {i.qty}
                <div className="muted" style={{ fontSize: ".78rem" }}>You earn {money(net(i.unitPrice * i.qty, i.commissionPct))}</div>
              </td>
              <td style={{ fontSize: ".85rem", maxWidth: 240 }}>
                <b>{i.order.buyer.orgName || i.order.buyer.name}</b>
                {i.order.buyer.orgName && <div>{i.order.buyer.name}</div>}
                <div><a href={`mailto:${i.order.buyer.email}`} style={{ textDecoration: "underline" }}>{i.order.buyer.email}</a></div>
                {(i.order.phone || i.order.buyer.phone) && <div><a href={`tel:${i.order.phone || i.order.buyer.phone}`}>{i.order.phone || i.order.buyer.phone}</a></div>}
                <div className="muted">{i.order.shippingAddress}</div>
              </td>
              <td>
                <Badge status={i.status} />
                {i.issues.length > 0 && <div><span className="badge b-off" title="Payment paused while we review it">Problem reported</span></div>}
              </td>
              <td><span className={`badge ${moneyBadge(lineMoneyStatus(i))}`}>{lineMoneyStatus(i)}</span></td>
              <td>
                {["PAID", "SHIPPED", "DELIVERED"].includes(i.status) ? (
                  <form action={shipItem} className="inline-form" style={{ flexWrap: "wrap", maxWidth: 260 }}>
                    <input type="hidden" name="id" value={i.id} />
                    <select name="carrier" defaultValue={i.carrier ?? "USPS"} aria-label="Carrier">
                      {CARRIERS.map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <input name="trackingNumber" defaultValue={i.trackingNumber ?? ""} placeholder="Tracking #" aria-label="Tracking number" style={{ width: 130 }} />
                    <SubmitButton className={`btn btn-sm ${i.status === "PAID" ? "btn-sage" : "btn-line"}`}>{i.status === "PAID" ? "Mark shipped" : "Update"}</SubmitButton>
                    {url && <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: ".78rem", textDecoration: "underline" }}>Track ↗</a>}
                  </form>
                ) : (
                  <span className="muted">—</span>
                )}
              </td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
