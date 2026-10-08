export const CARRIERS = ["USPS", "UPS", "FedEx", "DHL", "Other"] as const;

/** Public tracking page for the common US carriers (null for "Other"). */
export function trackingUrl(carrier: string | null, number: string | null) {
  if (!carrier || !number) return null;
  const n = encodeURIComponent(number.trim());
  switch (carrier) {
    case "USPS": return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`;
    case "UPS": return `https://www.ups.com/track?tracknum=${n}`;
    case "FedEx": return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
    case "DHL": return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${n}`;
    default: return null;
  }
}

/** Where the author's share of an order line stands. */
type PoRef = { purchaseOrder?: { status: string } | null };
const poUnpaid = (x: PoRef | undefined) => !!x?.purchaseOrder && x.purchaseOrder.status !== "PAID";

export function lineMoneyStatus(i: { status: string; transferId: string | null; transferError?: string | null; order?: PoRef }) {
  if (i.status === "REFUNDED") return "Refunded";
  if (i.transferId) return "Paid out";
  if (poUnpaid(i.order) && i.status !== "PENDING") return "Awaiting PO payment";
  if (i.transferError) return "Payout failed";
  return "Held";
}

/** Where a booking's money stands, in plain words. */
export function bookingMoneyStatus(b: { status: string; paymentRef: string | null; transferId: string | null } & PoRef) {
  if (["PENDING"].includes(b.status)) return "Awaiting acceptance";
  if (b.status === "ACCEPTED") return b.purchaseOrder?.status === "PENDING" ? "Awaiting PO approval" : "Awaiting payment";
  if (poUnpaid(b) && ["CANCELLED", "DECLINED"].includes(b.status)) return "Not paid";
  if (b.transferId) return "Paid out";
  if (poUnpaid(b) && b.status !== "CANCELLED") return "Awaiting PO payment";
  if (b.status === "DECLINED" || (b.status === "CANCELLED" && !b.paymentRef)) return "Not paid";
  if (b.status === "CANCELLED") return "Refunded";
  if (b.transferId) return "Paid out";
  return "Paid — held";
}
export const moneyBadge = (s: string) =>
  s === "Paid out" ? "b-ok" : s === "Held" || s.startsWith("Paid") || s.startsWith("Awaiting") ? "b-wait" : "b-off";
