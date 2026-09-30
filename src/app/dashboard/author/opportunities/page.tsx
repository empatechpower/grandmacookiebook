import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { GRADES, TOPICS, labelsFor, orgTypeLabel } from "@/lib/constants";
import { fromDayKey, todayKey } from "@/lib/dates";
import { money } from "@/lib/money";
import { parseTags } from "@/lib/tags";
import { RFP_FORMATS } from "@/lib/rfps";
import { Badge, PageHead, Table, fmtDate } from "@/components/ui";

export default async function Opportunities() {
  const user = await requireUser("AUTHOR");
  const [open, mine] = await Promise.all([
    db.rfp.findMany({
      where: { status: "OPEN", deadline: { gte: fromDayKey(todayKey()) } },
      include: { buyer: { select: { orgName: true, orgType: true, name: true } }, bids: { where: { authorId: user.id }, select: { status: true } }, _count: { select: { bids: true } } },
      orderBy: { deadline: "asc" },
    }),
    db.bid.findMany({ where: { authorId: user.id }, include: { rfp: true }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  const myTopics = parseTags(user.topics), myGrades = parseTags(user.grades);
  const matches = (r: { topic: string | null; grade: string | null }) => (!r.topic || myTopics.includes(r.topic)) && (!r.grade || myGrades.includes(r.grade));
  const sorted = [...open].sort((a, b) => Number(matches(b)) - Number(matches(a)));
  return (
    <>
      <PageHead title="Opportunities" sub="Schools and organisations post what they need. Send a proposal with your fee — if they accept, it becomes a booking." />
      {(user.status !== "ACTIVE" || !user.payoutsReady) && (
        <div className="alert alert-info">You can browse requests now; bidding opens once your account is approved and Stripe is connected.</div>
      )}
      <Table heads={["Request", "From", "Event", "Budget", "Bids close", ""]} empty="No open requests right now. You'll be emailed when a matching one is posted.">
        {sorted.map((r) => (
          <tr key={r.id}>
            <td>
              <Link href={`/dashboard/author/opportunities/${r.id}`}><b>{r.title}</b></Link>
              {matches(r) && (r.topic || r.grade) && <span className="chip tag" style={{ marginLeft: 6 }}>Good match</span>}
              <div className="muted" style={{ fontSize: ".8rem" }}>
                {[RFP_FORMATS.find((f) => f.value === r.format)?.label, r.audience, ...labelsFor(TOPICS, r.topic ? [r.topic] : []), ...labelsFor(GRADES, r.grade ? [r.grade] : [])].filter(Boolean).join(" · ")}
              </div>
            </td>
            <td>{r.buyer.orgName || r.buyer.name}<div className="muted" style={{ fontSize: ".78rem" }}>{orgTypeLabel(r.buyer.orgType)}</div></td>
            <td>{fmtDate(r.eventDate)}{r.location && <div className="muted" style={{ fontSize: ".78rem" }}>{r.location}</div>}</td>
            <td>{r.budgetMax ? `Up to ${money(r.budgetMax)}` : "Open"}</td>
            <td>{fmtDate(r.deadline)}<div className="muted" style={{ fontSize: ".78rem" }}>{r._count.bids} bid{r._count.bids === 1 ? "" : "s"}</div></td>
            <td>
              {r.bids[0] ? <Badge status={r.bids[0].status} /> : <Link className="btn btn-terra btn-sm" href={`/dashboard/author/opportunities/${r.id}`}>Bid</Link>}
            </td>
          </tr>
        ))}
      </Table>
      {mine.length > 0 && (
        <>
          <h3 className="h2-sm">Your bids</h3>
          <Table heads={["Request", "Event", "Your fee", "Status"]}>
            {mine.map((b) => (
              <tr key={b.id}>
                <td><Link href={`/dashboard/author/opportunities/${b.rfpId}`}>{b.rfp.title}</Link></td>
                <td>{fmtDate(b.rfp.eventDate)}</td>
                <td>{money(b.fee)}</td>
                <td><Badge status={b.status} /></td>
              </tr>
            ))}
          </Table>
        </>
      )}
    </>
  );
}
