import Link from "next/link";
import { db } from "@/lib/db";
import { money } from "@/lib/money";
import { PO_STATUS_LABEL } from "@/lib/purchaseOrders";
import { markPurchaseOrderPaid, reviewPurchaseOrder } from "@/app/actions/admin";
import { PageHead, Table, fmtDate } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

const FILTERS = [
  ["open", "Needs action"],
  ["PENDING", "In review"],
  ["APPROVED", "Invoice due"],
  ["overdue", "Overdue"],
  ["PAID", "Paid"],
  ["all", "All"],
] as const;

export default async function PurchaseOrders({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter = "open" } = await searchParams;
  const now = new Date();
  const where =
    filter === "open" ? { status: { in: ["PENDING", "APPROVED"] } }
    : filter === "overdue" ? { status: "APPROVED", OR: [{ order: { invoice: { dueAt: { lt: now } } } }, { booking: { invoice: { dueAt: { lt: now } } } }] }
    : filter === "all" ? {}
    : { status: filter };
  const pos = await db.purchaseOrder.findMany({
    where,
    include: {
      buyer: { select: { name: true, orgName: true, email: true } },
      order: { select: { number: true, invoice: { select: { id: true, number: true, dueAt: true } } } },
      booking: { select: { number: true, eventDate: true, package: { select: { title: true } }, author: { select: { name: true } }, invoice: { select: { id: true, number: true, dueAt: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return (
    <>
      <PageHead
        title="Purchase orders"
        sub="Schools and organizations can pay by PO. Approve a PO to confirm the order or visit and email a Net-terms invoice; mark it paid when the payment arrives to release the authors' payouts."
      />
      <div className="filters">
        {FILTERS.map(([v, label]) => (
          <Link key={v} href={`?filter=${v}`} className={`filter${filter === v ? " active" : ""}`}>{label}</Link>
        ))}
      </div>
      <Table heads={["PO #", "Customer", "For", "Amount", "Billing", "Status", ""]} empty="No purchase orders here.">
        {pos.map((po) => {
          const inv = po.order?.invoice ?? po.booking?.invoice;
          const overdue = po.status === "APPROVED" && inv?.dueAt && inv.dueAt < now;
          return (
            <tr key={po.id}>
              <td>
                <b>{po.poNumber}</b>
                <div className="muted" style={{ fontSize: ".78rem" }}>{fmtDate(po.createdAt)}</div>
                {po.fileKey && <div><a href={`/api/purchase-orders/${po.id}`} target="_blank" style={{ fontSize: ".78rem", textDecoration: "underline" }}>View PO (PDF)</a></div>}
              </td>
              <td>{po.buyer.orgName || po.buyer.name}<div className="muted" style={{ fontSize: ".78rem" }}>{po.buyer.email}</div></td>
              <td>
                {po.order ? `Order O-${po.order.number}` : `B-${po.booking?.number} · ${po.booking?.package.title} (${po.booking?.author.name})`}
                {inv && <div><Link href={`/invoices/${inv.id}`} style={{ fontSize: ".78rem", textDecoration: "underline" }}>INV-{inv.number}</Link></div>}
              </td>
              <td>{money(po.amount)}<div className="muted" style={{ fontSize: ".78rem" }}>Net {po.termsDays}</div></td>
              <td style={{ fontSize: ".82rem" }}>
                {po.billingName}<div className="muted">{po.billingEmail}{po.billingPhone ? ` · ${po.billingPhone}` : ""}</div>
                <div className="muted" style={{ whiteSpace: "pre-wrap" }}>{po.billingAddress}</div>
              </td>
              <td>
                <span className={`badge ${po.status === "PAID" ? "b-ok" : overdue || ["REJECTED", "CANCELLED"].includes(po.status) ? "b-off" : "b-wait"}`}>
                  {overdue ? "Overdue" : PO_STATUS_LABEL[po.status]}
                </span>
                {po.status === "APPROVED" && inv?.dueAt && <div className="muted" style={{ fontSize: ".78rem" }}>Due {fmtDate(inv.dueAt)}</div>}
                {po.status === "PAID" && po.paidAt && <div className="muted" style={{ fontSize: ".78rem" }}>Paid {fmtDate(po.paidAt)}{po.paymentNote ? ` · ${po.paymentNote}` : ""}</div>}
                {po.adminNote && <div className="muted" style={{ fontSize: ".78rem" }}>“{po.adminNote}”</div>}
              </td>
              <td>
                {po.status === "PENDING" && (
                  <div style={{ display: "grid", gap: 6 }}>
                    <form action={reviewPurchaseOrder}>
                      <input type="hidden" name="id" value={po.id} />
                      <input type="hidden" name="decision" value="approve" />
                      <SubmitButton className="btn btn-sage btn-sm" confirm={`Approve PO ${po.poNumber}? The order is confirmed and an invoice due in ${po.termsDays} days is emailed.`}>Approve</SubmitButton>
                    </form>
                    <form action={reviewPurchaseOrder} className="inline-form">
                      <input type="hidden" name="id" value={po.id} />
                      <input type="hidden" name="decision" value="reject" />
                      <input name="note" placeholder="Reason (optional)" aria-label="Reason" style={{ maxWidth: 150 }} />
                      <SubmitButton className="btn btn-danger btn-sm" confirm={`Reject PO ${po.poNumber}?`}>Reject</SubmitButton>
                    </form>
                  </div>
                )}
                {po.status === "APPROVED" && (
                  <form action={markPurchaseOrderPaid} className="inline-form">
                    <input type="hidden" name="id" value={po.id} />
                    <input name="note" placeholder="e.g. Check #1042" aria-label="Payment reference" style={{ maxWidth: 140 }} />
                    <SubmitButton className="btn btn-terra btn-sm" confirm={`Mark ${money(po.amount)} received for PO ${po.poNumber}? Authors' payouts will be released.`}>Mark paid</SubmitButton>
                  </form>
                )}
              </td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
