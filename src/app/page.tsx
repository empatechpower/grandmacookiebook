import Link from "next/link";
import { db } from "@/lib/db";
import { BookCard } from "@/components/Cards";
import { AuthorCard } from "@/components/AuthorCard";
import { Stars } from "@/components/Stars";
import { CtaBand } from "@/components/Marketing";
import { liveBooks, livePackages } from "@/lib/catalog";
import { searchAuthors } from "@/lib/directory";
import { COLLECTION_KINDS } from "@/lib/content";
import { formatLabel, orgTypeLabel } from "@/lib/constants";
import { money } from "@/lib/money";

const QUICK: [string, string][] = [
  ["#SEL", "/authors?topic=sel"],
  ["#STEM", "/authors?topic=stem"],
  ["Virtual visits", "/authors?format=VIRTUAL"],
  ["Under $500", "/authors?budget=500"],
  ["Keynote speakers", "/authors?grade=adult"],
];

export default async function Home() {
  const [books, visits, authors, collections, reviews, stats] = await Promise.all([
    liveBooks(undefined, 4),
    livePackages(undefined, 3),
    searchAuthors({ sort: "rating" }),
    db.collection.findMany({ where: { published: true, featured: true }, include: { _count: { select: { items: true } } }, orderBy: { sortOrder: "asc" }, take: 3 }),
    db.review.findMany({
      where: { hidden: false, rating: { gte: 4 } },
      include: { author: { select: { id: true, name: true } }, buyer: { select: { name: true, orgName: true, orgType: true } } },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    Promise.all([
      db.user.count({ where: { role: "AUTHOR", status: "ACTIVE", payoutsReady: true } }),
      db.book.count({ where: { status: "APPROVED" } }),
      db.booking.count({ where: { status: { in: ["CONFIRMED", "COMPLETED"] } } }),
      db.user.count({ where: { role: "BUYER", orgType: { in: ["SCHOOL", "LIBRARY", "BUSINESS", "NONPROFIT"] } } }),
    ]),
  ]);
  const [authorCount, bookCount, visitCount, orgCount] = stats;

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="eyebrow">Books · author visits · book fairs</div>
            <h1>
              Books to own.
              <br />
              Voices to <em>invite</em>.
            </h1>
            <p className="lede">
              Find vetted authors for school visits, keynotes and workshops — and buy their books directly. Built for schools, libraries,
              businesses and the authors who inspire them.
            </p>
            <form action="/authors" className="hero-search" role="search">
              <input name="q" placeholder="Search authors, topics or books…" aria-label="Search authors, topics or books" />
              <button className="btn btn-terra">Find an author</button>
            </form>
            <div className="filters" style={{ marginTop: 12 }}>
              {QUICK.map(([label, href]) => (
                <Link key={href} className="filter" href={href}>{label}</Link>
              ))}
            </div>
            <p className="muted" style={{ fontSize: ".9rem", marginTop: 10 }}>
              Know what you need? <Link href="/dashboard/buyer/requests/new" style={{ textDecoration: "underline" }}>Post a request</Link> and let authors send you proposals.
            </p>
          </div>
          <aside className="poster">
            <div className="poster-kicker">Book this term</div>
            <h3>Visits schools are booking now</h3>
            {visits.map((v) => (
              <Link key={v.id} href={`/visits/${v.id}`} className="event-card" style={{ display: "block" }}>
                <b>
                  {v.title} — {v.author.name}
                </b>
                <small>
                  {formatLabel(v.format)} · {v.durationMins} min · {money(v.fee)}
                </small>
              </Link>
            ))}
            <Link className="btn btn-terra" style={{ marginTop: 12, position: "relative", zIndex: 1 }} href="/visits">
              See all visits
            </Link>
          </aside>
        </div>
      </section>

      <section className="wrap">
        <div className="stats">
          {([
            [authorCount, "Vetted authors"],
            [bookCount, "Books in the catalog"],
            [visitCount, "Visits booked"],
            [orgCount, "Schools & organizations"],
          ] as [number, string][]).map(([n, label]) => (
            <div key={label}>
              <b>{n}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="pad">
        <div className="wrap grid-3">
          {[
            ["For schools & libraries", "Assemblies, classroom visits, book fairs and classroom sets — with payment held until your visit happens.", "/for-schools"],
            ["For business", "Keynotes, ERG and heritage-month events, book clubs and signed books for your team.", "/for-business"],
            ["For authors", "Sell your books, get booked for visits, and get paid automatically. Free to join.", "/for-authors"],
          ].map(([h, b, href]) => (
            <Link key={href} href={href} className="card audience-card">
              <div className="body">
                <h3>{h}</h3>
                <p className="muted">{b}</p>
                <span className="more">Learn more →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {collections.length > 0 && (
        <section className="pad" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="sec-head">
              <h2>Curated for you</h2>
              <Link className="btn btn-ghost" href="/collections">All collections →</Link>
            </div>
            <div className="grid-3">
              {collections.map((c) => (
                <Link key={c.id} href={`/collections/${c.slug}`} className="card collection-card">
                  <div className="body">
                    <div className="meta">{COLLECTION_KINDS.find((k) => k.value === c.kind)?.label}</div>
                    <h3>{c.title}</h3>
                    {c.subtitle && <p className="muted" style={{ fontSize: ".88rem" }}>{c.subtitle}</p>}
                    <div className="meta" style={{ marginTop: 10 }}>{c._count.items} picks →</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="pad" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-head">
            <h2>Featured authors</h2>
            <Link className="btn btn-ghost" href="/authors">
              Browse all authors →
            </Link>
          </div>
          <div className="grid-4">
            {authors.slice(0, 8).map((a) => (
              <AuthorCard key={a.id} a={a} />
            ))}
          </div>
        </div>
      </section>

      <section className="pad band">
        <div className="wrap">
          <h2 style={{ marginBottom: 20 }}>How it works</h2>
          <div className="grid-4">
            {[
              ["Discover", "Search by topic, grade, budget and date — or post a request and receive proposals."],
              ["Connect", "Message authors, pick an open date and get a final quote including travel."],
              ["Book & pay", "Pay securely; your payment is held until the visit happens."],
              ["Celebrate", "Confirm the visit, leave a review, and order signed books for your readers."],
            ].map(([h, b], i) => (
              <div key={h} className="step" style={{ flexDirection: "column" }}>
                <span className="step-n">{i + 1}</span>
                <b>{h}</b>
                <p className="muted" style={{ fontSize: ".9rem" }}>{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {reviews.length > 0 && (
        <section className="pad">
          <div className="wrap">
            <h2 style={{ marginBottom: 20 }}>What schools and readers say</h2>
            <div className="grid-3">
              {reviews.map((r) => (
                <figure key={r.id} className="quote">
                  <Stars single avg={r.rating} />
                  <blockquote>“{r.body}”</blockquote>
                  <figcaption>
                    <b>{r.buyer.orgName || r.buyer.name.split(" ")[0]}</b>
                    {orgTypeLabel(r.buyer.orgType) ? ` · ${orgTypeLabel(r.buyer.orgType)}` : ""}
                    <br />
                    <span className="muted">
                      on <Link href={`/authors/${r.author.id}`} style={{ textDecoration: "underline" }}>{r.author.name}</Link>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="pad" style={{ paddingTop: reviews.length ? 0 : undefined }}>
        <div className="wrap">
          <div className="sec-head">
            <h2>Books from the authors themselves</h2>
            <Link className="btn btn-ghost" href="/books">
              Shop catalog →
            </Link>
          </div>
          <div className="grid-4">
            {books.map((b) => (
              <BookCard key={b.id} b={b} />
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        title="Planning a literacy week or book fair?"
        text="Tell us what you need — we'll help you find the right authors and books."
        ctas={[["Host a book fair", "/book-fairs"], ["Join as an author", "/for-authors"]]}
      />
    </>
  );
}
