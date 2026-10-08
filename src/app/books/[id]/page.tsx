import Link from "next/link";
import { authorPath } from "@/lib/storefront";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { liveWhere } from "@/lib/catalog";
import { categoryLabel } from "@/lib/constants";
import { money } from "@/lib/money";
import { addToCart } from "@/app/actions/shop";
import { Initials } from "@/components/ui";
import { ProductGallery } from "@/components/ProductGallery";
import { getSettings } from "@/lib/settings";
import { tiersFrom, tiersLabel, unitPriceFor } from "@/lib/pricing";
import { SubmitButton } from "@/components/SubmitButton";

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = await db.book.findFirst({
    where: { id, ...liveWhere },
    include: {
      images: { orderBy: { position: "asc" } }, author: { select: { id: true, name: true, slug: true, bio: true, _count: { select: { packages: { where: liveWhere } } } } } },
  });
  if (!book) notFound();
  const tiers = tiersFrom(await getSettings());
  return (
    <section className="pad">
      <div className="wrap detail">
        <ProductGallery title={book.title} cover={book.coverUrl} images={book.images.map((i) => i.url)} />
        <div className="stack">
          <div className="eyebrow">{categoryLabel(book.category)}</div>
          <h1>{book.title}</h1>
          <Link href={authorPath(book.author)} className="author-line">
            <Initials name={book.author.name} />
            <div>
              <b>{book.author.name}</b>
              {book.author.bio && <div className="muted" style={{ fontSize: ".85rem" }}>{book.author.bio}</div>}
            </div>
          </Link>
          <p>{book.description}</p>
          <div className="panel stack">
            <div className="split">
              <div className="price-lg">{money(book.price)}</div>
              <span className="muted">{book.stock > 0 ? `${book.stock} in stock` : "Sold out"}</span>
            </div>
            <form action={addToCart} className="row">
              <input type="hidden" name="bookId" value={book.id} />
              <input className="qty" type="number" name="qty" min={1} max={book.stock} defaultValue={1} aria-label="Quantity" />
              <SubmitButton className="btn btn-terra" disabled={book.stock < 1} pendingText="Adding…">
                Add to cart
              </SubmitButton>
            </form>
            {book.bulkEnabled && tiersLabel(tiers) ? (
              <div className="alert alert-ok" style={{ margin: 0 }}>
                <b>Classroom-set discounts:</b> {tiersLabel(tiers)} — applied automatically at checkout
                {" "}({money(unitPriceFor(book, tiers.min1, tiers))} and {money(unitPriceFor(book, tiers.min2, tiers))} per copy).
              </div>
            ) : (
              <p className="muted" style={{ fontSize: ".85rem" }}>Ordering a classroom set? Set the quantity — the author ships directly.</p>
            )}
          </div>
          {book.author._count.packages > 0 && (
            <Link className="btn btn-line" href={authorPath(book.author)}>
              Book {book.author.name.split(" ")[0]} for a visit →
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
