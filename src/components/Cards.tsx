import Link from "next/link";
import { authorPath } from "@/lib/storefront";
import { categoryLabel, formatLabel } from "@/lib/constants";
import { money } from "@/lib/money";
import { addToCart } from "@/app/actions/shop";
import { Cover } from "./ui";
import { SubmitButton } from "./SubmitButton";

type BookCardData = {
  id: string;
  title: string;
  price: number;
  category: string;
  coverUrl: string | null;
  stock: number;
  author: { id: string; name: string; slug?: string | null };
  bulkEnabled?: boolean;
  featured?: boolean;
};

export function BookCard({ b }: { b: BookCardData }) {
  return (
    <article className="card">
      <Link href={`/books/${b.id}`}>
        <Cover url={b.coverUrl} title={b.title} />
      </Link>
      <div className="body">
        <div className="meta">
          {b.featured && <span className="featured-badge">★ Featured</span>}
          {categoryLabel(b.category)} · {b.author.name}
        </div>
        <h3>
          <Link href={`/books/${b.id}`}>{b.title}</Link>
        </h3>
        <div className="price">
          {money(b.price)}
          {b.bulkEnabled ? <span className="chip" style={{ marginLeft: 8, fontWeight: 500 }}>Bulk discounts</span> : null}
        </div>
        <div className="row-btns">
          <form action={addToCart}>
            <input type="hidden" name="bookId" value={b.id} />
            <SubmitButton className="btn btn-terra" disabled={b.stock < 1} pendingText="Adding…">
              {b.stock < 1 ? "Sold out" : "Buy"}
            </SubmitButton>
          </form>
          <Link className="btn btn-ghost" href={authorPath(b.author)}>
            Book author
          </Link>
        </div>
      </div>
    </article>
  );
}

type VisitCardData = {
  id: string;
  title: string;
  format: string;
  durationMins: number;
  fee: number;
  region: string | null;
  author: { id: string; name: string; slug?: string | null };
};

export function VisitCard({ v }: { v: VisitCardData }) {
  return (
    <article className="card">
      <div className="body">
        <div className="meta">
          {formatLabel(v.format)} · {v.durationMins} min
        </div>
        <h3>
          <Link href={`/visits/${v.id}`}>{v.title}</Link>
        </h3>
        <p>
          <Link href={authorPath(v.author)}>{v.author.name}</Link>
        </p>
        {v.region && <p className="muted" style={{ fontSize: ".85rem" }}>{v.region}</p>}
        <div className="price" style={{ marginTop: 8 }}>
          {money(v.fee)}
        </div>
        <div className="row-btns">
          <Link className="btn btn-ink" href={`/visits/${v.id}`}>
            Request booking
          </Link>
        </div>
      </div>
    </article>
  );
}
