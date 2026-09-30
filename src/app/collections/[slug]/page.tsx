import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { COLLECTION_KINDS } from "@/lib/content";
import { searchAuthors } from "@/lib/directory";
import { liveWhere } from "@/lib/catalog";
import { AuthorCard } from "@/components/AuthorCard";
import { BookCard } from "@/components/Cards";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P) {
  const c = await db.collection.findFirst({ where: { slug: (await params).slug, published: true }, select: { title: true, description: true } });
  return c ? { title: c.title, description: c.description.slice(0, 160) } : {};
}

export default async function CollectionPage({ params }: P) {
  const c = await db.collection.findFirst({ where: { slug: (await params).slug, published: true }, include: { items: { orderBy: { position: "asc" } } } });
  if (!c) notFound();
  const authorIds = c.items.flatMap((i) => (i.authorId ? [i.authorId] : []));
  const bookIds = c.items.flatMap((i) => (i.bookId ? [i.bookId] : []));
  // Only bookable authors and live books appear; order follows the curator's.
  const [authors, books] = await Promise.all([
    authorIds.length ? searchAuthors({}).then((all) => all.filter((a) => authorIds.includes(a.id))) : [],
    bookIds.length ? db.book.findMany({ where: { id: { in: bookIds }, ...liveWhere }, include: { author: { select: { id: true, name: true } } } }) : [],
  ]);
  const note = (key: string, id: string) => c.items.find((i) => (key === "a" ? i.authorId : i.bookId) === id)?.note;
  const byOrder = <T extends { id: string }>(list: T[], ids: string[]) => ids.map((id) => list.find((x) => x.id === id)).filter(Boolean) as T[];
  return (
    <section className="pad">
      <div className="wrap">
        <Link href="/collections" className="muted" style={{ fontSize: ".85rem" }}>← All collections</Link>
        <div className="eyebrow" style={{ marginTop: 10 }}>{COLLECTION_KINDS.find((k) => k.value === c.kind)?.label}</div>
        <h1 className="serif" style={{ fontSize: "clamp(2rem,4vw,3rem)", letterSpacing: "-.03em", lineHeight: 1.05 }}>{c.title}</h1>
        {c.subtitle && <p className="muted" style={{ marginTop: 6 }}>{c.subtitle}</p>}
        <p className="lede-sm" style={{ maxWidth: "70ch", fontSize: "1.05rem", marginTop: 12 }}>{c.description}</p>
        {authors.length > 0 && (
          <>
            <h2 className="h2-sm">Authors</h2>
            <div className="grid-4">
              {byOrder(authors, authorIds).map((a) => (
                <div key={a.id}>
                  <AuthorCard a={a} />
                  {note("a", a.id) && <p className="curator-note">“{note("a", a.id)}”</p>}
                </div>
              ))}
            </div>
          </>
        )}
        {books.length > 0 && (
          <>
            <h2 className="h2-sm">Books</h2>
            <div className="grid-4">
              {byOrder(books, bookIds).map((b) => (
                <div key={b.id}>
                  <BookCard b={b} />
                  {note("b", b.id) && <p className="curator-note">“{note("b", b.id)}”</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
