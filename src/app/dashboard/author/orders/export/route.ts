import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";
import { net } from "@/lib/money";
import { lineMoneyStatus } from "@/lib/shipping";
import { dayKey } from "@/lib/dates";

/** The signed-in author's order lines as CSV. */
export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== "AUTHOR") return new Response("Not found", { status: 404 });
  const items = await db.orderItem.findMany({
    where: { authorId: user.id, status: { notIn: ["PENDING", "CANCELLED"] } },
    include: { order: { include: { buyer: { select: { name: true, email: true, phone: true, orgName: true } } } } },
    orderBy: { order: { createdAt: "desc" } },
  });
  const $ = (cents: number) => (cents / 100).toFixed(2);
  return csvResponse(`orders-${dayKey(new Date())}.csv`, [
    ["Order", "Date", "Product", "Unit price", "Qty", "Total", "Your share", "Status", "Payment", "Customer", "Organization", "Email", "Phone", "Ship to", "Carrier", "Tracking #", "Shipped"],
    ...items.map((i) => [
      `O-${i.order.number}`, dayKey(i.order.createdAt), i.title, $(i.unitPrice), i.qty, $(i.unitPrice * i.qty), $(net(i.unitPrice * i.qty, i.commissionPct)),
      i.status, lineMoneyStatus(i), i.order.buyer.name, i.order.buyer.orgName, i.order.buyer.email, i.order.phone || i.order.buyer.phone,
      i.order.shippingAddress, i.carrier, i.trackingNumber, i.shippedAt ? dayKey(i.shippedAt) : "",
    ]),
  ]);
}
