import "server-only";
import { db } from "./db";
import { net } from "./money";

export type EarningRow = {
  id: string;
  date: Date;
  label: string;
  gross: number;
  net: number;
  transferId: string | null;
  transferError: string | null;
  releaseAt: Date | null;
  refunded: boolean;
};

/**
 * An author's paid sales and bookings, net of commission. Each is held after payment
 * and transferred when the buyer confirms, or automatically when releaseAt passes.
 */
export async function authorEarnings(authorId: string) {
  const [items, bookings] = await Promise.all([
    db.orderItem.findMany({
      where: { authorId, status: { in: ["PAID", "SHIPPED", "DELIVERED", "REFUNDED"] } },
      include: { order: { select: { number: true, createdAt: true } } },
    }),
    db.booking.findMany({
      where: { authorId, paymentRef: { not: null } },
      include: { package: { select: { title: true } } },
    }),
  ]);
  const rows: EarningRow[] = [
    ...items.map((i) => ({
      id: i.id,
      date: i.order.createdAt,
      label: `O-${i.order.number} · ${i.title} × ${i.qty}`,
      gross: i.unitPrice * i.qty,
      net: net(i.unitPrice * i.qty, i.commissionPct),
      transferId: i.transferId,
      transferError: i.transferError,
      releaseAt: i.releaseAt,
      refunded: i.status === "REFUNDED",
    })),
    ...bookings.map((b) => ({
      id: b.id,
      date: b.createdAt,
      label: `B-${b.number} · ${b.package.title}`,
      gross: b.fee,
      net: net(b.fee, b.commissionPct),
      transferId: b.transferId,
      transferError: b.transferError,
      releaseAt: b.releaseAt,
      refunded: b.status === "CANCELLED",
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const monthAgo = Date.now() - 30 * 86400000;
  const sent = rows.filter((r) => r.transferId && !r.refunded);
  const sum = (rs: EarningRow[]) => rs.reduce((s, r) => s + r.net, 0);
  return {
    rows,
    paidTotal: sum(sent),
    last30: sum(sent.filter((r) => r.date.getTime() >= monthAgo)),
    pending: sum(rows.filter((r) => !r.transferId && !r.refunded)),
    refunded: sum(rows.filter((r) => r.refunded)),
  };
}
