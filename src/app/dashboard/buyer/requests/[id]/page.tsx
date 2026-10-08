import Link from "next/link";
import { authorPath } from "@/lib/storefront";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatLabel, labelsFor, GRADES, TOPICS } from "@/lib/constants";
import { money } from "@/lib/money";
import { RFP_FORMATS, rfpIsOpen, rfpStatus } from "@/lib/rfps";
import { acceptBid, closeRfp, declineBid } from "@/app/actions/rfps";
import { openConversation } from "@/app/actions/messages";
import { Badge, PageHead, fmtDate } from "@/components/ui";
import { Stars } from "@/components/Stars";
import { AuthorPhoto } from "@/components/AuthorCard";
import { SubmitButton } from "@/components/SubmitButton";

export default async function RequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("BUYER");
  const r = await db.rfp.findFirst({
    where: { id: (await params).id, buyerId: user.id },
    include: {
      bids: {
        where: { status: { not: "WITHDRAWN" } },
        include: { author: { select: { id: true, name: true, slug: true, headline: true, avatarUrl: true, ratingAvg: true, ratingCount: true } }, package: true },
        orderBy: { fee: "asc" },
      },
    },
  });
  if (!r) notFound();
  const open = rfpIsOpen(r);
  return (
    <>
      <Link href="/dashboard/buyer/requests" className="muted" style={{ fontSize: ".85rem" }}>← All requests</Link>
      <PageHead
        title={r.title}
        sub={`${fmtDate(r.eventDate)} · ${RFP_FORMATS.find((f) => f.value === r.format)?.label} · ${r.audience} (${r.audienceSize})${r.budgetMax ? ` · budget up to ${money(r.budgetMax)}` : ""}`}
        action={
          <div className="row">
            <Badge status={rfpStatus(r)} />
            {r.status === "OPEN" && (
              <form action={closeRfp}>
                <input type="hidden" name="id" value={r.id} />
                <SubmitButton className="btn btn-line btn-sm" confirm="Close this request? Authors won't be able to send proposals.">Close request</SubmitButton>
              </form>
            )}
          </div>
        }
      />
      <div className="panel" style={{ marginBottom: 20, whiteSpace: "pre-wrap" }}>
        {r.description}
        <div className="muted" style={{ fontSize: ".85rem", marginTop: 10 }}>
          {[r.location, ...labelsFor(TOPICS, r.topic ? [r.topic] : []), ...labelsFor(GRADES, r.grade ? [r.grade] : [])].filter(Boolean).join(" · ")}
          {` · proposals due ${fmtDate(r.deadline)}`}
        </div>
      </div>
      <h3 className="h2-sm">{r.bids.length} bid{r.bids.length === 1 ? "" : "s"}</h3>
      {r.bids.length === 0 ? (
        <div className="empty">No proposals yet. Matching authors have been emailed — proposals usually arrive within a few days.</div>
      ) : (
        <div className="stack">
          {r.bids.map((b) => (
            <div key={b.id} className="panel bid">
              <div style={{ width: 72 }}><AuthorPhoto name={b.author.name} url={b.author.avatarUrl} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="split">
                  <div>
                    <Link href={authorPath(b.author)} target="_blank"><b>{b.author.name}</b></Link>
                    {b.author.ratingCount > 0 && <span style={{ marginLeft: 8 }}><Stars avg={b.author.ratingAvg} count={b.author.ratingCount} size=".8rem" /></span>}
                    <div className="muted" style={{ fontSize: ".82rem" }}>{b.package.title} · {formatLabel(b.package.format)} · {b.package.durationMins} min</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="price-lg" style={{ fontSize: "1.5rem" }}>{money(b.fee)}</div>
                    <Badge status={b.status} />
                  </div>
                </div>
                <p style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{b.message}</p>
                {b.status === "PENDING" && open && (
                  <div className="row" style={{ marginTop: 10 }}>
                    <form action={acceptBid}>
                      <input type="hidden" name="id" value={b.id} />
                      <SubmitButton className="btn btn-terra btn-sm" confirm={`Accept ${b.author.name}'s proposal of ${money(b.fee)}? Other proposals will be declined.`}>Accept proposal</SubmitButton>
                    </form>
                    <form action={openConversation}>
                      <input type="hidden" name="with" value={b.author.id} />
                      <input type="hidden" name="draft" value={`About your proposal for “${r.title}”: `} />
                      <SubmitButton className="btn btn-ghost btn-sm">Message</SubmitButton>
                    </form>
                    <form action={declineBid}>
                      <input type="hidden" name="id" value={b.id} />
                      <SubmitButton className="btn btn-danger btn-sm">Decline</SubmitButton>
                    </form>
                  </div>
                )}
                {b.status === "ACCEPTED" && <Link className="btn btn-line btn-sm" style={{ marginTop: 10 }} href="/dashboard/buyer/bookings">Go to booking →</Link>}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
