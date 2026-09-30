import { redirect } from "next/navigation";
import { flash } from "@/lib/flash";
import { readPaidSession } from "@/lib/payments";
import { fulfillBooking, fulfillOrder } from "@/lib/fulfillment";

/**
 * Where Stripe Checkout sends the buyer after paying. Fulfils right away so the
 * buyer sees their order as paid even if the webhook hasn't landed yet (idempotent).
 */
export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("session_id");
  const paid = sessionId ? await readPaidSession(sessionId).catch(() => null) : null;
  if (!paid) {
    await flash("Payment is processing — we'll update your order shortly");
    redirect("/dashboard/buyer");
  }
  if (paid.kind === "order") {
    await fulfillOrder(paid.id, paid.payment, paid.sessionId);
    await flash("Payment received — thank you!");
    redirect("/dashboard/buyer/orders");
  }
  await fulfillBooking(paid.id, paid.payment, paid.sessionId);
  await flash("Booking paid and confirmed");
  redirect("/dashboard/buyer/bookings");
}
