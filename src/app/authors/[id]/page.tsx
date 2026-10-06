import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { bookableAuthor } from "@/lib/directory";
import { openDates } from "@/lib/availability";
import { fromDayKey } from "@/lib/dates";
import { GRADES, IDENTITIES, LANGUAGES, TOPICS, labelsFor } from "@/lib/constants";
import { parseTags } from "@/lib/tags";
import { openConversation } from "@/app/actions/messages";
import { BookCard, VisitCard } from "@/components/Cards";
import { AuthorPhoto } from "@/components/AuthorCard";
import { SubmitButton } from "@/components/SubmitButton";
import { fmtDate } from "@/components/ui";
import { Stars } from "@/components/Stars";
import { orgTypeLabel } from "@/lib/constants";
import { searchAuthors } from "@/lib/directory";
import { AuthorCard } from "@/components/AuthorCard";
import { MediaGrid } from "@/components/MediaGrid";

export default async function AuthorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [author, user] = await Promise.all([
    db.user.findFirst({
      // The storefront link can be the author's custom slug or their id.
      where: { OR: [{ id }, { slug: id.toLowerCase() }], ...bookableAuthor },
      include: {
        books: { where: { status: "APPROVED" }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }] },
        media: { orderBy: { position: "asc" } },
        packages: { where: { status: "APPROVED" }, orderBy: { fee: "asc" } },
      },
    }),
    currentUser(),
  ]);
  if (!author) notFound();
  const socials = ([["Facebook", author.facebookUrl], ["Instagram", author.instagramUrl], ["TikTok", author.tiktokUrl]] as [string, string | null][]).filter(
    (x): x is [string, string] => !!x[1],
  );
  const [dates, reviews] = await Promise.all([
    openDates(author.id, 60),
    db.review.findMany({
      where: { authorId: author.id, hidden: false },
      include: { buyer: { select: { name: true, orgName: true, orgType: true } }, booking: { include: { package: true } }, orderItem: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  const firstTopic = parseTags(author.topics)[0];
  const similar = firstTopic ? (await searchAuthors({ topic: firstTopic, sort: "rating" })).filter((a) => a.id !== author.id).slice(0, 4) : [];
  const ref = { id: author.id, name: author.name };
  const first = author.name.split(" ")[0];
  const tagRow = (label: string, values: string[], cls = "chip") =>
    values.length > 0 && (
      <div style={{ marginTop: 10 }}>
        <div className="meta" style={{ marginBottom: 4 }}>{label}</div>
        <div className="row" style={{ gap: 6 }}>
          {values.map((v) => <span key={v} className={cls}>{v}</span>)}
        </div>
      </div>
    );

  return (
    <section className="pad">
      <div className="wrap">
        <div className="profile-head">
          <AuthorPhoto name={author.name} url={author.avatarUrl} size="lg" />
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Author{author.location ? ` · ${author.location}` : ""}</div>
            <h1 className="serif" style={{ fontSize: "clamp(2rem,4vw,3rem)", letterSpacing: "-.03em", lineHeight: 1.05 }}>{author.name}</h1>
            {author.headline && <p style={{ fontSize: "1.1rem", marginTop: 6 }}>{author.headline}</p>}
            {author.ratingCount > 0 && (
              <a href="#reviews" style={{ display: "inline-block", marginTop: 6 }}>
                <Stars avg={author.ratingAvg} count={author.ratingCount} />
              </a>
            )}
            {author.bio && <p className="muted" style={{ maxWidth: "62ch", marginTop: 10 }}>{author.bio}</p>}
            {tagRow("Topics", labelsFor(TOPICS, parseTags(author.topics)), "chip tag")}
            {tagRow("Audiences", labelsFor(GRADES, parseTags(author.grades)))}
            {tagRow("Languages", labelsFor(LANGUAGES, parseTags(author.languages)))}
            {tagRow("Community", labelsFor(IDENTITIES, parseTags(author.identities)))}
            <div className="row" style={{ marginTop: 18 }}>
              {user?.role !== "AUTHOR" && user?.role !== "ADMIN" && (
                <form action={openConversation}>
                  <input type="hidden" name="with" value={author.id} />
                  <SubmitButton className="btn btn-ink">Message {first}</SubmitButton>
                </form>
              )}
              {author.videoUrl && <a className="btn btn-line" href={author.videoUrl} target="_blank" rel="noreferrer">Watch intro video</a>}
              {author.websiteUrl && <a className="btn btn-ghost" href={author.websiteUrl} target="_blank" rel="noreferrer">Website ↗</a>}
              {socials.map(([label, url]) => (
                <a key={label} className="btn btn-ghost" href={url} target="_blank" rel="noreferrer">{label} ↗</a>
              ))}
            </div>
          </div>
        </div>

        <h2 className="h2-sm">Book a visit or speech</h2>
        {dates.length > 0 && (
          <p className="muted" style={{ fontSize: ".9rem", marginBottom: 12 }}>
            Next open dates: {dates.slice(0, 5).map((d) => fmtDate(fromDayKey(d))).join(" · ")}
            {dates.length > 5 ? ` and ${dates.length - 5} more` : ""}
          </p>
        )}
        {author.packages.length ? (
          <div className="grid-3">
            {author.packages.map((p) => <VisitCard key={p.id} v={{ ...p, author: ref }} />)}
          </div>
        ) : (
          <div className="empty">No visit packages listed yet.</div>
        )}

        {author.media.length > 0 && (
          <>
            <h2 className="h2-sm" id="media">Photos & videos</h2>
            <MediaGrid items={author.media} />
          </>
        )}

        <h2 className="h2-sm">Books & products</h2>
        {author.books.length ? (
          <div className="grid-4">
            {author.books.map((b) => <BookCard key={b.id} b={{ ...b, author: ref }} />)}
          </div>
        ) : (
          <div className="empty">No books listed yet.</div>
        )}
        <h2 className="h2-sm" id="reviews">Reviews</h2>
        {reviews.length ? (
          <div className="panel" style={{ maxWidth: 820 }}>
            <div style={{ marginBottom: 6 }}><Stars avg={author.ratingAvg} count={author.ratingCount} size="1.05rem" /></div>
            {reviews.map((r) => (
              <div key={r.id} className="review">
                <div className="split">
                  <Stars single avg={r.rating} />
                  <span className="muted" style={{ fontSize: ".8rem" }}>{fmtDate(r.createdAt)}</span>
                </div>
                <p style={{ margin: "6px 0" }}>{r.body}</p>
                <div className="muted" style={{ fontSize: ".8rem" }}>
                  {r.buyer.orgName || r.buyer.name.split(" ")[0]}
                  {orgTypeLabel(r.buyer.orgType) ? ` · ${orgTypeLabel(r.buyer.orgType)}` : ""} · {r.booking ? r.booking.package.title : r.orderItem?.title}
                </div>
                {r.authorReply && <div className="reply"><b>{first}’s reply:</b> {r.authorReply}</div>}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">No reviews yet.</div>
        )}

        {similar.length > 0 && (
          <>
            <h2 className="h2-sm">Similar authors</h2>
            <div className="grid-4">{similar.map((a) => <AuthorCard key={a.id} a={a} />)}</div>
          </>
        )}

        <p style={{ marginTop: 28 }}>
          <Link href="/authors" className="muted">← Browse all authors</Link>
        </p>
      </div>
    </section>
  );
}
