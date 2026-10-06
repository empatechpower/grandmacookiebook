import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";
import { dayKey } from "@/lib/dates";

/** All invoices as CSV (admins only). */
export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") return new Response("Not found", { status: 404 });
  const invoices = await db.invoice.findMany({
    include: {
      order: { select: { number: true, buyer: { select: { name: true, orgName: true, email: true } } } },
      booking: { select: { number: true, buyer: { select: { name: true, orgName: true, email: true } } } },
    },
    orderBy: { number: "asc" },
  });
  return csvResponse(`invoices-${dayKey(new Date())}.csv`, [
    ["Invoice", "Issued", "Customer", "Organization", "Email", "For", "Total", "Status"],
    ...invoices.map((i) => {
      const b = i.order?.buyer ?? i.booking?.buyer;
      return [`INV-${i.number}`, dayKey(i.issuedAt), b?.name, b?.orgName, b?.email, i.order ? `O-${i.order.number}` : `B-${i.booking?.number}`, (i.total / 100).toFixed(2), i.status];
    }),
  ]);
}
