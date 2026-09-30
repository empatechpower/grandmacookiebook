import Link from "next/link";
import { BookCard } from "@/components/Cards";
import { liveBooks, livePackages } from "@/lib/catalog";
import { formatLabel } from "@/lib/constants";
import { searchAuthors } from "@/lib/directory";
import { AuthorCard } from "@/components/AuthorCard";
import { money } from "@/lib/money";

export default async function Home() {
  const [books, visits, authors] = await Promise.all([liveBooks(undefined, 4), livePackages(undefined, 3), searchAuthors({})]);
  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="eyebrow">Three roles · one marketplace</div>
            <h1>
              Books to own.
              <br />
              Voices to <em>invite</em>.
            </h1>
            <p className="lede">
              Atelier connects readers with authors who sell their work and appear in person. Super admins keep the
              catalog trusted. Buyers book a talk or take a title home the same afternoon.
            </p>
            <div className="hero-cta">
              <Link className="btn btn-terra" href="/authors">
                Find an author
              </Link>
              <Link className="btn btn-ink" href="/signup?role=BUYER">
                I want to buy or book
              </Link>
              <Link className="btn btn-line" href="/signup?role=AUTHOR">
                I am an author
              </Link>
            </div>
            <div className="roles-preview">
              <div className="rp">
                <strong>Buyer</strong>
                <span>Purchase books. Book a visit or keynote.</span>
              </div>
              <div className="rp">
                <strong>Author</strong>
                <span>List titles. Offer school or stage visits.</span>
              </div>
            </div>
          </div>
          <aside className="poster">
            <div className="poster-kicker">This week on stage</div>
            <h3>Live visits you can book tonight</h3>
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

      <section className="pad" style={{ paddingBottom: 0 }}>
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

      <section className="pad">
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
    </>
  );
}
