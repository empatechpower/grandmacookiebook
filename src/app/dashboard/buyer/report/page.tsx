import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ISSUE_REASONS } from "@/lib/constants";
import { money } from "@/lib/money";
import { reportIssue } from "@/app/actions/issues";
import { PageHead, fmtDate } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export default async function Report({ searchParams }: { searchParams: Promise<{ booking?: string; item?: string }> }) {
  const user = await requireUser("BUYER");
  const { booking, item } = await searchParams;
  const kind = booking ? "booking" : "item";
  const target = booking
    ? await db.booking.findFirst({ where: { id: booking, buyerId: user.id, transferId: null, status: { in: ["CONFIRMED", "COMPLETED"] } }, include: { package: true, author: true } })
    : item
      ? await db.orderItem.findFirst({ where: { id: item, transferId: null, status: { in: ["PAID", "SHIPPED"] }, order: { buyerId: user.id } }, include: { author: true, order: true } })
      : null;
  if (!target)
    return (
      <>
        <PageHead title="Report a problem" />
        <div className="empty">
          Payment for this has already been released, so it can’t be reported here. <Link href="/contact" style={{ textDecoration: "underline" }}>Contact us</Link> and we’ll help.
        </div>
      </>
    );
  const summary =
    "package" in target
      ? `B-${target.number} · ${target.package.title} with ${target.author.name} · ${fmtDate(target.eventDate)} · ${money(target.fee)}`
      : `O-${target.order.number} · ${target.title} × ${target.qty} from ${target.author.name} · ${money(target.unitPrice * target.qty)}`;
  return (
    <>
      <PageHead title="Report a problem" sub={summary} />
      <div className="alert alert-info" style={{ maxWidth: 620 }}>
        Your payment is still held by South Texas Book & Author. Reporting pauses it — the author isn’t paid until our team reviews this. If we can’t resolve it, you’ll get a full refund.
      </div>
      <form action={reportIssue} className="panel" style={{ maxWidth: 620 }}>
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={target.id} />
        <fieldset className="field">
          <legend>What went wrong?</legend>
          <div className="stack" style={{ gap: 6 }}>
            {ISSUE_REASONS[kind].map((r) => (
              <label key={r.value} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: ".92rem", color: "var(--ink)" }}>
                <input type="radio" name="reason" value={r.value} required style={{ width: "auto" }} /> {r.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="field">
          <label htmlFor="details">Details</label>
          <textarea id="details" name="details" required minLength={10} maxLength={3000} placeholder="What happened, and what would put it right?" />
        </div>
        <SubmitButton className="btn btn-terra">Report problem</SubmitButton>
      </form>
    </>
  );
}
