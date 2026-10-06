import Link from "next/link";
import { db } from "@/lib/db";
import { money } from "@/lib/money";
import { PageHead, Table, fmtDate } from "@/components/ui";

export default async function Invoices() {
  const invoices = await db.invoice.findMany({
    include: {
      order: { select: { number: true, buyer: { select: { name: true, orgName: true } } } },
      booking: { select: { number: true, buyer: { select: { name: true, orgName: true } } } },
    },
    orderBy: { number: "desc" },
    take: 500,
  });
  return (
    <>
      <PageHead
        title="Invoices"
        sub="An invoice is issued automatically for every paid order and booking, and emailed to the customer."
        action={<a className="btn btn-line btn-sm" href="/dashboard/admin/invoices/export">Export CSV</a>}
      />
      <Table heads={["Invoice", "Issued", "Customer", "For", "Total", "Status"]} empty="No invoices yet — they're created when a sale is paid.">
        {invoices.map((inv) => {
          const buyer = inv.order?.buyer ?? inv.booking?.buyer;
          return (
            <tr key={inv.id}>
              <td><Link href={`/invoices/${inv.id}`} style={{ textDecoration: "underline" }}><b>INV-{inv.number}</b></Link></td>
              <td>{fmtDate(inv.issuedAt)}</td>
              <td>{buyer?.orgName || buyer?.name}</td>
              <td>{inv.order ? `Order O-${inv.order.number}` : `Booking B-${inv.booking?.number}`}</td>
              <td>{money(inv.total)}</td>
              <td><span className={`badge ${inv.status === "PAID" ? "b-ok" : inv.status === "DUE" ? "b-wait" : "b-off"}`}>{inv.status === "PAID" ? "Paid" : inv.status === "DUE" ? "Due" : "Void"}</span></td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
