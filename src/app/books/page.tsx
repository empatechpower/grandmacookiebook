import Link from "next/link";
import { BookCard } from "@/components/Cards";
import { liveBooks } from "@/lib/catalog";
import { CATEGORIES } from "@/lib/constants";

export const metadata = { title: "Buy the book — Atelier" };

export default async function Books({ searchParams }: { searchParams: Promise<{ cat?: string; q?: string }> }) {
  const { cat, q } = await searchParams;
  const active = CATEGORIES.some((c) => c.value === cat) ? cat : undefined;
  const books = await liveBooks(active, undefined, q?.trim().slice(0, 80));
  return (
    <section className="pad">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <div className="eyebrow">Catalog</div>
            <h2>Buy the book</h2>
          </div>
          <form className="inline-form" action="/books">
            {active && <input type="hidden" name="cat" value={active} />}
            <input name="q" defaultValue={q} placeholder="Search title or author" aria-label="Search books" style={{ padding: "9px 12px", minWidth: 220 }} />
            <button className="btn btn-ink btn-sm">Search</button>
          </form>
        </div>
        <div className="filters">
          <Link className={`filter${!active ? " active" : ""}`} href="/books">
            All
          </Link>
          {CATEGORIES.map((c) => (
            <Link key={c.value} className={`filter${active === c.value ? " active" : ""}`} href={`/books?cat=${c.value}`}>
              {c.label}
            </Link>
          ))}
        </div>
        {books.length ? (
          <div className="grid-4">
            {books.map((b) => (
              <BookCard key={b.id} b={b} />
            ))}
          </div>
        ) : (
          <div className="empty">No books match. Try another search or category.</div>
        )}
      </div>
    </section>
  );
}
