import { db } from "@/lib/db";
import { toggleReviewHidden } from "@/app/actions/reviews";
import { PageHead, Table, fmtDate } from "@/components/ui";
import { Stars } from "@/components/Stars";
import { SubmitButton } from "@/components/SubmitButton";

export default async function AdminReviews() {
  const reviews = await db.review.findMany({
    include: { author: { select: { name: true } }, buyer: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <>
      <PageHead title="Reviews" sub="Hide reviews that break the rules (abuse, personal data, spam). Hidden reviews don't count toward ratings." />
      <Table heads={["Date", "Author", "Rating", "Review", "By", ""]} empty="No reviews yet.">
        {reviews.map((r) => (
          <tr key={r.id} style={r.hidden ? { opacity: 0.55 } : undefined}>
            <td style={{ whiteSpace: "nowrap" }}>{fmtDate(r.createdAt)}</td>
            <td>{r.author.name}</td>
            <td style={{ whiteSpace: "nowrap" }}><Stars single avg={r.rating} size=".8rem" /></td>
            <td style={{ maxWidth: 380 }}>
              {r.body}
              {r.authorReply && <div className="muted" style={{ fontSize: ".8rem", marginTop: 4 }}>Reply: {r.authorReply}</div>}
            </td>
            <td>{r.buyer.name}<div className="muted" style={{ fontSize: ".78rem" }}>{r.buyer.email}</div></td>
            <td>
              <form action={toggleReviewHidden}>
                <input type="hidden" name="id" value={r.id} />
                <SubmitButton className={r.hidden ? "btn btn-line btn-sm" : "btn btn-danger btn-sm"}>{r.hidden ? "Restore" : "Hide"}</SubmitButton>
              </form>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
