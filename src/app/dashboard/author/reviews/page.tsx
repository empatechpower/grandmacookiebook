import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { orgTypeLabel } from "@/lib/constants";
import { replyToReview } from "@/app/actions/reviews";
import { PageHead, fmtDate } from "@/components/ui";
import { Stars } from "@/components/Stars";
import { SubmitButton } from "@/components/SubmitButton";

export default async function AuthorReviews() {
  const user = await requireUser("AUTHOR");
  const reviews = await db.review.findMany({
    where: { authorId: user.id },
    include: { buyer: { select: { name: true, orgName: true, orgType: true } }, booking: { include: { package: true } }, orderItem: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <PageHead title="Reviews" sub="Buyers can review you after a completed visit or a delivered book. You can post one public reply to each." />
      <div className="panel" style={{ marginBottom: 20 }}>
        <Stars avg={user.ratingAvg} count={user.ratingCount} size="1.1rem" />
      </div>
      {reviews.length === 0 ? (
        <div className="empty">No reviews yet. They’ll appear here after your first completed visit or delivered order.</div>
      ) : (
        <div className="panel">
          {reviews.map((r) => (
            <div key={r.id} className="review">
              <div className="split">
                <Stars single avg={r.rating} />
                <span className="muted" style={{ fontSize: ".8rem" }}>{fmtDate(r.createdAt)}{r.hidden ? " · hidden by South Texas Book & Author" : ""}</span>
              </div>
              <p style={{ margin: "6px 0" }}>{r.body}</p>
              <div className="muted" style={{ fontSize: ".8rem" }}>
                {r.buyer.orgName || r.buyer.name}
                {orgTypeLabel(r.buyer.orgType) ? ` · ${orgTypeLabel(r.buyer.orgType)}` : ""} · {r.booking ? r.booking.package.title : r.orderItem?.title}
              </div>
              <form action={replyToReview} className="inline-form" style={{ marginTop: 10 }}>
                <input type="hidden" name="id" value={r.id} />
                <input name="reply" defaultValue={r.authorReply ?? ""} placeholder="Write a public reply…" maxLength={1000} style={{ flex: 1 }} aria-label="Public reply" />
                <SubmitButton className="btn btn-line btn-sm">{r.authorReply ? "Update reply" : "Reply"}</SubmitButton>
              </form>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
