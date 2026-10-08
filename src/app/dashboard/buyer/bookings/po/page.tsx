import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { money } from "@/lib/money";
import { fmtWhen } from "@/lib/dates";
import { getSettings } from "@/lib/settings";
import { canUsePo } from "@/lib/purchaseOrders";
import { payBookingByPo } from "@/app/actions/shop";
import { PageHead } from "@/components/ui";
import { PoFields } from "@/components/PoForm";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata = { title: "Pay by purchase order" };

export default async function BookingPo({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const user = await requireUser("BUYER");
  const b = await db.booking.findFirst({
    where: { id: (await searchParams).id ?? "", buyerId: user.id, status: "ACCEPTED" },
    include: { package: { select: { title: true } }, author: { select: { name: true } } },
  });
  if (!b) notFound();
  const { poTermsDays } = await getSettings();
  return (
    <>
      <PageHead title="Pay by purchase order" sub={`B-${b.number} · ${b.package.title} with ${b.author.name} · ${fmtWhen(b)} · ${money(b.fee)}`} />
      {canUsePo(user) ? (
        <form action={payBookingByPo} className="panel" style={{ maxWidth: 640 }}>
          <input type="hidden" name="id" value={b.id} />
          <PoFields
            termsDays={poTermsDays}
            billing={{ name: user.name, email: user.email, phone: user.phone ?? "", address: [b.organisation, user.location].filter(Boolean).join("\n") }}
          />
          <div className="row">
            <SubmitButton className="btn btn-terra" pendingText="Sending…">Submit purchase order</SubmitButton>
            <Link className="btn btn-ghost" href="/dashboard/buyer/bookings">Back</Link>
          </div>
        </form>
      ) : (
        <div className="empty">
          Purchase orders are for schools and organizations. Set your organization type in your <Link href="/dashboard/buyer/profile" style={{ textDecoration: "underline" }}>profile</Link>, or pay by card.
        </div>
      )}
    </>
  );
}
