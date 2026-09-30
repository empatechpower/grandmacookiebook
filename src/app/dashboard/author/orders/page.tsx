import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { money, net } from "@/lib/money";
import { shipItem } from "@/app/actions/author";
import { Badge, PageHead, Table, fmtDate } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export default async function AuthorOrders() {
  const user = await requireUser("AUTHOR");
  const items = await db.orderItem.findMany({
    where: { authorId: user.id, status: { notIn: ["PENDING", "CANCELLED"] } },
    include: { order: { include: { buyer: { select: { name: true } } } }, issues: { where: { status: "OPEN" }, select: { id: true } } },
    orderBy: { order: { createdAt: "desc" } },
  });
  return (
    <>
      <PageHead title="Book orders" sub="You ship your own titles. Your share was sent to your Stripe account when the buyer paid." />
      <Table heads={["Order", "Date", "Book", "Qty", "Ship to", "You earn", "Status", ""]} empty="No orders yet.">
        {items.map((i) => (
          <tr key={i.id}>
            <td>O-{i.order.number}</td>
            <td>{fmtDate(i.order.createdAt)}</td>
            <td>{i.title}</td>
            <td>{i.qty}</td>
            <td>{i.order.buyer.name}<div className="muted" style={{ fontSize: ".8rem" }}>{i.order.shippingAddress}</div></td>
            <td>{money(net(i.unitPrice * i.qty, i.commissionPct))}</td>
            <td>
              <Badge status={i.status} />
              {i.issues.length > 0 && <div><span className="badge b-off" title="Payment paused while Atelier reviews it">Problem reported</span></div>}
            </td>
            <td>
              {i.status === "PAID" && (
                <form action={shipItem}>
                  <input type="hidden" name="id" value={i.id} />
                  <SubmitButton className="btn btn-sage btn-sm">Mark shipped</SubmitButton>
                </form>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
