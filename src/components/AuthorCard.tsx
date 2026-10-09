import Link from "next/link";
import { TOPICS, formatLabel, labelsFor } from "@/lib/constants";
import { money } from "@/lib/money";
import { parseTags } from "@/lib/tags";
import type { DirectoryAuthor } from "@/lib/directory";
import { Stars } from "./Stars";
import { authorPath } from "@/lib/storefront";

// Warm, on-brand backgrounds for authors without a photo, picked by name so each keeps its color.
// Bright, kid-friendly placeholder colors (background gradient + matching initials color).
const PH = [
  ["#bfe3fb,#8ccaf3", "#0f4c84"],
  ["#ffe39a,#ffc94d", "#7a4b00"],
  ["#bfe8cf,#86d3a6", "#155a33"],
  ["#ffd0c9,#ff9f91", "#8c2214"],
  ["#e0d2f7,#c0a6ee", "#4b2a85"],
  ["#ffd6e8,#ffa8cb", "#8a1f4f"],
];
const pick = (seed: string) => {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PH[h % PH.length];
};
export const placeholderBg = (seed: string) => `linear-gradient(135deg, ${pick(seed)[0]})`;
export const placeholderInk = (seed: string) => pick(seed)[1];

export function AuthorPhoto({ name, url, size = "card" }: { name: string; url: string | null; size?: "card" | "lg" }) {
  const cls = size === "lg" ? "author-photo lg" : "author-photo";
  // eslint-disable-next-line @next/next/no-img-element
  if (url) return <img className={cls} src={url} alt={name} />;
  return (
    <div className={`${cls} ph`} style={{ background: placeholderBg(name), color: placeholderInk(name) }} role="img" aria-label={name}>
      {name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
    </div>
  );
}

export function AuthorCard({ a }: { a: DirectoryAuthor }) {
  const topics = labelsFor(TOPICS, parseTags(a.topics)).slice(0, 3);
  const first = a.name.split(" ")[0];
  return (
    <article className="card author-card">
      <Link href={authorPath(a)}>
        <AuthorPhoto name={a.name} url={a.avatarUrl} />
      </Link>
      <div className="body">
        {topics.length > 0 && <div className="meta">{topics.join(", ")}</div>}
        <h3>
          <Link href={authorPath(a)}>{a.name}</Link>
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
          <Link href={authorPath(a)} style={{ color: "var(--terracotta)", fontWeight: 600, fontSize: ".9rem" }}>
            Book {first} &gt;
          </Link>
        </div>
      </div>
    </article>
  );
}
