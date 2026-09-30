import Link from "next/link";
import { TOPICS, formatLabel, labelsFor } from "@/lib/constants";
import { money } from "@/lib/money";
import { parseTags } from "@/lib/tags";
import type { DirectoryAuthor } from "@/lib/directory";
import { Stars } from "./Stars";

export function AuthorPhoto({ name, url, size = "card" }: { name: string; url: string | null; size?: "card" | "lg" }) {
  const cls = size === "lg" ? "author-photo lg" : "author-photo";
  // eslint-disable-next-line @next/next/no-img-element
  if (url) return <img className={cls} src={url} alt={name} />;
  return <div className={`${cls} ph`}>{name.split(" ").map((p) => p[0]).slice(0, 2).join("")}</div>;
}

export function AuthorCard({ a }: { a: DirectoryAuthor }) {
  const topics = labelsFor(TOPICS, parseTags(a.topics)).slice(0, 3);
  const first = a.name.split(" ")[0];
  return (
    <article className="card author-card">
      <Link href={`/authors/${a.id}`}>
        <AuthorPhoto name={a.name} url={a.avatarUrl} />
      </Link>
      <div className="body">
        {topics.length > 0 && <div className="meta">{topics.join(", ")}</div>}
        <h3>
          <Link href={`/authors/${a.id}`}>{a.name}</Link>
        </h3>
        {a.headline && <p className="muted" style={{ fontSize: ".85rem" }}>{a.headline}</p>}
        {a.ratingCount > 0 && <div style={{ marginTop: 4 }}><Stars avg={a.ratingAvg} count={a.ratingCount} size=".82rem" /></div>}
        <div className="row" style={{ gap: 6, marginTop: 8 }}>
          {a.formats.map((f) => (
            <span key={f} className="chip">{formatLabel(f)}</span>
          ))}
          {a._count.books > 0 && <span className="chip">{a._count.books} book{a._count.books > 1 ? "s" : ""}</span>}
        </div>
        <div className="split" style={{ marginTop: 12 }}>
          <span className="price">{a.fromFee != null ? `From ${money(a.fromFee)}` : "Books only"}</span>
          <Link href={`/authors/${a.id}`} style={{ color: "var(--terracotta)", fontWeight: 600, fontSize: ".9rem" }}>
            Book {first} &gt;
          </Link>
        </div>
      </div>
    </article>
  );
}
