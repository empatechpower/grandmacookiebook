import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { money } from "@/lib/money";
import { rfpStatus } from "@/lib/rfps";
import { Badge, PageHead, Table, fmtDate } from "@/components/ui";

export default async function Requests() {
  const user = await requireUser("BUYER");
  const rfps = await db.rfp.findMany({
    where: { buyerId: user.id },
    include: { bids: { where: { status: { in: ["PENDING", "ACCEPTED"] } }, select: { fee: true, status: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <PageHead
        title="Requests & proposals"
        sub="Describe your event once and let matching authors send you proposals. Compare proposals, then accept the one you like."
        action={<Link className="btn btn-terra" href="/dashboard/buyer/requests/new">Post a request</Link>}
      />
      <Table heads={["Request", "Event date", "Proposals due", "Proposals", "Status"]} empty="No requests yet. Post one and authors will come to you.">
        {rfps.map((r) => (
          <tr key={r.id}>
            <td><Link href={`/dashboard/buyer/requests/${r.id}`}><b>{r.title}</b></Link><div className="muted" style={{ fontSize: ".8rem" }}>{r.audience}</div></td>
            <td>{fmtDate(r.eventDate)}</td>
            <td>{fmtDate(r.deadline)}</td>
            <td>
              {r.bids.length}
              {r.bids.length > 0 && <div className="muted" style={{ fontSize: ".78rem" }}>from {money(Math.min(...r.bids.map((b) => b.fee)))}</div>}
            </td>
            <td><Badge status={rfpStatus(r)} /></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
