import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";
import { net } from "@/lib/money";
import { lineMoneyStatus } from "@/lib/shipping";
import { dayKey } from "@/lib/dates";

/** Every order line on the platform as CSV (admins only). */
export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") return new Response("Not found", { status: 404 });
  const items = await db.orderItem.findMany({
    where: { status: { notIn: ["PENDING", "CANCELLED"] } },
    include: { author: { select: { name: true } }, order: { include: { buyer: { select: { name: true, email: true, phone: true, orgName: true } }, purchaseOrder: { select: { status: true } } } } },
    orderBy: { order: { createdAt: "desc" } },
  });
  const $ = (cents: number) => (cents / 100).toFixed(2);
  return csvResponse(`all-orders-${dayKey(new Date())}.csv`, [
    ["Order", "Date", "Author", "Product", "Unit price", "Qty", "Total", "Commission %", "Platform fee", "Author share", "Status", "Payment", "Customer", "Organization", "Email", "Phone", "Ship to", "Carrier", "Tracking #"],
    ...items.map((i) => {
      const gross = i.unitPrice * i.qty, share = net(gross, i.commissionPct);
      return [
        `O-${i.order.number}`, dayKey(i.order.createdAt), i.author.name, i.title, $(i.unitPrice), i.qty, $(gross), i.commissionPct, $(gross - share), $(share),
        i.status, lineMoneyStatus(i), i.order.buyer.name, i.order.buyer.orgName, i.order.buyer.email, i.order.phone || i.order.buyer.phone, i.order.shippingAddress, i.carrier, i.trackingNumber,
      ];
    }),
  ]);
}
