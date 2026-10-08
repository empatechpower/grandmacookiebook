import { db } from "@/lib/db";
import { money } from "@/lib/money";
import { refundOrderItem } from "@/app/actions/admin";
import { Badge, PageHead, Table, fmtDate } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { TransferCell } from "@/components/TransferCell";

export default async function AdminOrders() {
  const orders = await db.order.findMany({
    include: { buyer: { select: { name: true } }, purchaseOrder: { select: { status: true, poNumber: true } }, items: { include: { author: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <>
      <PageHead title="Orders" sub="Every book order, line by line. Each line's author share is held until the buyer confirms receipt or 14 days pass." action={<a className="btn btn-line btn-sm" href="/dashboard/admin/orders/export">Export CSV</a>} />
      <Table heads={["Order", "Date", "Customer", "Book", "Author", "Amount", "Fee", "Status", "To author", ""]} empty="No orders yet.">
        {orders.flatMap((o) =>
          o.items.map((i, idx) => (
            <tr key={i.id}>
              <td>{idx === 0 ? `O-${o.number}` : ""}</td>
              <td>{idx === 0 ? fmtDate(o.createdAt) : ""}</td>
              <td>{idx === 0 ? o.buyer.name : ""}</td>
              <td>{i.title} × {i.qty}</td>
              <td>{i.author.name}</td>
              <td>{money(i.unitPrice * i.qty)}</td>
              <td>{i.commissionPct}%</td>
              <td><Badge status={i.status} /></td>
              <td>
                <TransferCell kind="item" id={i.id} transferId={i.transferId} transferError={i.transferError} releaseAt={i.releaseAt} paid={["PAID", "SHIPPED", "DELIVERED"].includes(i.status)} awaitingPo={!!o.purchaseOrder && o.purchaseOrder.status !== "PAID"} />
              </td>
              <td>
                {["PAID", "SHIPPED", "DELIVERED"].includes(i.status) && (
                  <form action={refundOrderItem}>
                    <input type="hidden" name="id" value={i.id} />
                    <SubmitButton className="btn btn-danger btn-sm" confirm="Refund this line to the buyer and reverse the author's share?">Refund</SubmitButton>
                  </form>
                )}
              </td>
            </tr>
          )),
        )}
      </Table>
    </>
  );
}
