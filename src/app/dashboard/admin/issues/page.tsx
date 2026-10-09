import Link from "next/link";
import { fmtWhen } from "@/lib/dates";
import { db } from "@/lib/db";
import { issueReasonLabel, orgTypeLabel } from "@/lib/constants";
import { money } from "@/lib/money";
import { resolveIssue } from "@/app/actions/issues";
import { Badge, PageHead, Table, fmtDate, fmtDateTime } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export default async function Issues({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const all = !!(await searchParams).all;
  const issues = await db.issue.findMany({
    where: all ? {} : { status: "OPEN" },
    include: {
      buyer: { select: { name: true, email: true, orgType: true, orgName: true } },
      booking: { include: { package: true, author: { select: { name: true, email: true } } } },
      orderItem: { include: { author: { select: { name: true, email: true } }, order: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <>
      <PageHead
        title="Problem reports"
        sub="Buyers report problems while payment is held. An open report pauses the author's payout until you refund the buyer or release it."
        action={<Link className="btn btn-ghost btn-sm" href={all ? "?" : "?all=1"}>{all ? "Show open only" : "Show all"}</Link>}
      />
      <Table heads={["Reported", "Sale", "Customer", "Author", "Problem", "Decision"]} empty={all ? "No reports yet." : "No open reports."}>
        {issues.map((i) => {
          const b = i.booking, it = i.orderItem;
          const amount = b ? b.fee : it!.unitPrice * it!.qty;
          const author = b ? b.author : it!.author;
          return (
            <tr key={i.id}>
              <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(i.createdAt)}</td>
              <td>
                <b>{b ? `B-${b.number}` : `O-${it!.order.number}`}</b> · {money(amount)}
                <div className="muted" style={{ fontSize: ".8rem" }}>
                  {b ? `${b.package.title} · event ${fmtWhen(b)}` : `${it!.title} × ${it!.qty} · ${it!.status.toLowerCase()}`}
                </div>
              </td>
              <td>
                {i.buyer.name}
                {(i.buyer.orgName || orgTypeLabel(i.buyer.orgType)) && (
                  <div className="muted" style={{ fontSize: ".8rem" }}>{[i.buyer.orgName, orgTypeLabel(i.buyer.orgType)].filter(Boolean).join(" · ")}</div>
                )}
                <div><a className="muted" style={{ fontSize: ".8rem", textDecoration: "underline" }} href={`mailto:${i.buyer.email}`}>{i.buyer.email}</a></div>
              </td>
              <td>
                {author.name}
                <div><a className="muted" style={{ fontSize: ".8rem", textDecoration: "underline" }} href={`mailto:${author.email}`}>{author.email}</a></div>
              </td>
              <td style={{ maxWidth: 320 }}>
                <b>{issueReasonLabel(i.reason)}</b>
                <div style={{ fontSize: ".85rem", whiteSpace: "pre-wrap" }}>{i.details}</div>
              </td>
              <td>
                {i.status === "OPEN" ? (
                  <form action={resolveIssue} className="inline-form" style={{ flexWrap: "wrap", maxWidth: 280 }}>
                    <input type="hidden" name="id" value={i.id} />
                    <input name="note" placeholder="Note to both sides (optional)" aria-label="Resolution note" style={{ flex: "1 1 100%" }} maxLength={300} />
                    <SubmitButton name="decision" value="refund" className="btn btn-danger btn-sm" confirm={`Refund ${money(amount)} to the buyer?`}>Refund buyer</SubmitButton>
                    <SubmitButton name="decision" value="release" className="btn btn-sage btn-sm" confirm="Reject the claim and release payment to the author?">Release to author</SubmitButton>
                  </form>
                ) : (
                  <>
                    <Badge status={i.status === "REFUNDED" ? "REFUNDED" : "COMPLETED"} />
                    <div className="muted" style={{ fontSize: ".78rem" }}>{i.status === "REFUNDED" ? "Buyer refunded" : "Payment released"}{i.resolvedAt ? ` · ${fmtDate(i.resolvedAt)}` : ""}</div>
                    {i.resolutionNote && <div style={{ fontSize: ".78rem" }}>“{i.resolutionNote}”</div>}
                  </>
                )}
              </td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
