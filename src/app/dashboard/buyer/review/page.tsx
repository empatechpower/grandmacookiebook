import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { reviewableBooking, reviewableItem } from "@/lib/reviews";
import { submitReview } from "@/app/actions/reviews";
import { PageHead } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export default async function Review({ searchParams }: { searchParams: Promise<{ booking?: string; item?: string }> }) {
  const user = await requireUser("BUYER");
  const { booking, item } = await searchParams;
  const target = booking ? await reviewableBooking(user.id, booking) : item ? await reviewableItem(user.id, item) : null;
  if (!target)
    return (
      <>
        <PageHead title="Leave a review" />
        <div className="empty">This has already been reviewed or isn’t complete yet. <Link href="/dashboard/buyer" style={{ textDecoration: "underline" }}>Back to your library</Link></div>
      </>
    );
  const what = "package" in target ? target.package.title : target.title;
  return (
    <>
      <PageHead title={`Review ${target.author.name}`} sub={what} />
      <form action={submitReview} className="panel" style={{ maxWidth: 620 }}>
        <input type="hidden" name="kind" value={booking ? "booking" : "item"} />
        <input type="hidden" name="id" value={booking ?? item} />
        <fieldset className="field">
          <legend>Your rating</legend>
          <div className="star-input">
            {[5, 4, 3, 2, 1].map((n) => (
              <label key={n} title={`${n} star${n > 1 ? "s" : ""}`}>
                <input type="radio" name="rating" value={n} required />
                <span aria-hidden>★</span>
                <span className="sr-only">{n} stars</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="field">
          <label htmlFor="body">What should other {booking ? "schools and organizers" : "readers"} know?</label>
          <textarea id="body" name="body" required minLength={10} maxLength={2000} placeholder={booking ? "How did the students respond? Was the author easy to work with?" : "How was the book and the delivery?"} />
          <div className="hint">Shown publicly on the author’s profile with your {user.orgName ? "organization" : "first"} name.</div>
        </div>
        <SubmitButton className="btn btn-terra">Post review</SubmitButton>
      </form>
    </>
  );
}
