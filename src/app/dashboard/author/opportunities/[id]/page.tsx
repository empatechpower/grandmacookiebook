import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { GRADES, TOPICS, formatLabel, labelsFor, orgTypeLabel } from "@/lib/constants";
import { money } from "@/lib/money";
import { RFP_FORMATS, rfpIsOpen, rfpStatus } from "@/lib/rfps";
import { submitBid, withdrawBid } from "@/app/actions/rfps";
import { Badge, PageHead, fmtDate } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export default async function Opportunity({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("AUTHOR");
  const r = await db.rfp.findUnique({
    where: { id: (await params).id },
    include: { buyer: { select: { orgName: true, orgType: true, name: true } }, bids: { where: { authorId: user.id } }, _count: { select: { bids: true } } },
  });
  if (!r) notFound();
  const bid = r.bids[0];
  // Other authors' bids stay private; an author sees the request and their own bid only.
  if (r.status !== "OPEN" && !bid) notFound();
  const packages = await db.visitPackage.findMany({ where: { authorId: user.id, status: "APPROVED" }, orderBy: { fee: "asc" } });
  const open = rfpIsOpen(r);
  const canBid = open && user.status === "ACTIVE" && user.payoutsReady && packages.length > 0 && (!bid || ["PENDING", "WITHDRAWN"].includes(bid.status));
  return (
    <>
      <Link href="/dashboard/author/opportunities" className="muted" style={{ fontSize: ".85rem" }}>← All opportunities</Link>
      <PageHead title={r.title} sub={`${r.buyer.orgName || r.buyer.name}${orgTypeLabel(r.buyer.orgType) ? ` · ${orgTypeLabel(r.buyer.orgType)}` : ""}`} action={<Badge status={rfpStatus(r)} />} />
      <div className="detail" style={{ gridTemplateColumns: "1.1fr .9fr" }}>
        <div className="panel">
          <dl className="facts">
            <dt>Event date</dt><dd>{fmtDate(r.eventDate)}</dd>
            <dt>Format</dt><dd>{RFP_FORMATS.find((f) => f.value === r.format)?.label}</dd>
            {r.location && (<><dt>Location</dt><dd>{r.location}</dd></>)}
            <dt>Audience</dt><dd>{r.audience} (about {r.audienceSize})</dd>
            {r.topic && (<><dt>Topic</dt><dd>{labelsFor(TOPICS, [r.topic])}</dd></>)}
            {r.grade && (<><dt>Grade level</dt><dd>{labelsFor(GRADES, [r.grade])}</dd></>)}
            {bid && bid.status !== "WITHDRAWN" && (<><dt>Fee</dt><dd>{money(bid.fee)}</dd></>)}
            <dt>Proposals due</dt><dd>{fmtDate(r.deadline)} · {r._count.bids} proposal{r._count.bids === 1 ? "" : "s"} so far</dd>
          </dl>
          <p style={{ marginTop: 14, whiteSpace: "pre-wrap" }}>{r.description}</p>
        </div>
        <div className="panel">
          <div className="split" style={{ marginBottom: 12 }}>
            <h3>{bid && bid.status !== "WITHDRAWN" ? "Your proposal" : "Submit a proposal"}</h3>
            {bid && <Badge status={bid.status} />}
          </div>
          {bid?.status === "ACCEPTED" && <div className="alert alert-ok">Accepted! It’s now a booking — see <Link href="/dashboard/author/requests" style={{ textDecoration: "underline" }}>Booking requests</Link>.</div>}
          {bid?.status === "DECLINED" && <div className="alert alert-info">The organizer chose another proposal this time.</div>}
          {packages.length === 0 && <div className="alert alert-info">You need a live listing to submit a proposal. <Link href="/dashboard/author/visits/new" style={{ textDecoration: "underline" }}>Create one</Link>.</div>}
          {canBid ? (
            <form action={submitBid}>
              <input type="hidden" name="rfpId" value={r.id} />
              <div className="field">
                <label htmlFor="packageId">Package</label>
                <select id="packageId" name="packageId" defaultValue={bid?.packageId ?? packages[0]?.id}>
                  {packages.map((p) => <option key={p.id} value={p.id}>{p.title} — {formatLabel(p.format)}, {p.durationMins} min (list {money(p.fee)})</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="fee">Fee ($)</label>
                <input id="fee" name="fee" type="number" min={1} step="0.01" required defaultValue={bid ? bid.fee / 100 : packages[0] ? packages[0].fee / 100 : ""} />
                <div className="hint">The fee you’re charging, including any travel.</div>
              </div>
              <div className="field">
                <label htmlFor="message">Your pitch</label>
                <textarea id="message" name="message" required minLength={20} defaultValue={bid?.status === "PENDING" ? bid.message : ""} placeholder="What you'd do for this audience, and why you're a good fit." />
              </div>
              <SubmitButton className="btn btn-terra">{bid?.status === "PENDING" ? "Update Proposal" : "Submit Proposal"}</SubmitButton>
            </form>
          ) : (
            bid && (
              <>
                <div className="price-lg">{money(bid.fee)}</div>
                <p style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{bid.message}</p>
              </>
            )
          )}
          {bid?.status === "PENDING" && (
            <form action={withdrawBid} style={{ marginTop: 10 }}>
              <input type="hidden" name="id" value={bid.id} />
              <SubmitButton className="btn btn-ghost btn-sm" confirm="Withdraw your proposal?">Withdraw proposal</SubmitButton>
            </form>
          )}
          {!open && !bid && <p className="muted">Proposals are closed for this request.</p>}
        </div>
      </div>
    </>
  );
}
