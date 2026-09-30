import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ARTICLE_KINDS, articlePath, type ArticleKind } from "@/lib/content";
import { fmtDate, todayKey, fromDayKey } from "@/lib/dates";
import { Cover } from "./ui";
import { ArticleBody } from "./ArticleBody";

const eventWhen = (a: { eventStart: Date | null; eventEnd: Date | null }) =>
  a.eventStart ? `${fmtDate(a.eventStart)}${a.eventEnd && a.eventEnd > a.eventStart ? ` – ${fmtDate(a.eventEnd)}` : ""}` : "";

export async function ArticleList({ kind, title, intro }: { kind: ArticleKind; title: string; intro: string }) {
  const today = fromDayKey(todayKey());
  const all = await db.article.findMany({
    where: { kind, published: true },
    orderBy: kind === "EVENT" ? { eventStart: "asc" } : { publishedAt: "desc" },
  });
  const upcoming = kind === "EVENT" ? all.filter((a) => (a.eventEnd ?? a.eventStart ?? today) >= today) : all;
  const past = kind === "EVENT" ? all.filter((a) => !upcoming.includes(a)).reverse() : [];
  const Grid = ({ items }: { items: typeof all }) => (
    <div className="grid-3">
      {items.map((a) => (
        <article key={a.id} className="card">
          <Link href={articlePath(a)}><Cover url={a.coverUrl} title={a.title} /></Link>
          <div className="body">
            <div className="meta">{kind === "EVENT" ? eventWhen(a) : a.publishedAt ? fmtDate(a.publishedAt) : ""}</div>
            <h3><Link href={articlePath(a)}>{a.title}</Link></h3>
            <p className="muted" style={{ fontSize: ".9rem" }}>{a.summary}</p>
          </div>
        </article>
      ))}
    </div>
  );
  return (
    <section className="pad">
      <div className="wrap">
        <div className="eyebrow">{ARTICLE_KINDS.find((k) => k.value === kind)?.label}</div>
        <h2>{title}</h2>
        <p className="lede-sm" style={{ maxWidth: "62ch" }}>{intro}</p>
        {upcoming.length ? <Grid items={upcoming} /> : <div className="empty">Nothing here yet — check back soon.</div>}
        {past.length > 0 && (
          <>
            <h3 className="h2-sm" style={{ marginTop: 40 }}>Past events</h3>
            <Grid items={past} />
          </>
        )}
      </div>
    </section>
  );
}

export async function ArticleView({ kind, slug }: { kind: ArticleKind; slug: string }) {
  const a = await db.article.findFirst({ where: { kind, slug, published: true } });
  if (!a) notFound();
  const section = ARTICLE_KINDS.find((k) => k.value === kind)!;
  return (
    <section className="pad">
      <div className="wrap" style={{ maxWidth: 780 }}>
        <Link href={section.path} className="muted" style={{ fontSize: ".85rem" }}>← {section.label === "News" ? "Newsroom" : `All ${section.label.toLowerCase()}s`}</Link>
        <h1 className="serif" style={{ fontSize: "clamp(2rem,4vw,2.8rem)", letterSpacing: "-.03em", lineHeight: 1.08, margin: "10px 0" }}>{a.title}</h1>
        <p className="muted" style={{ marginBottom: 18 }}>
          {kind === "EVENT" ? eventWhen(a) : a.publishedAt ? fmtDate(a.publishedAt) : ""}
        </p>
        {a.coverUrl && <Cover url={a.coverUrl} title={a.title} className="cover-lg" />}
        {kind === "EVENT" && a.eventUrl && (
          <a className="btn btn-terra" href={a.eventUrl} target="_blank" rel="noreferrer" style={{ margin: "18px 0" }}>Register / join →</a>
        )}
        <p style={{ fontSize: "1.1rem", margin: "18px 0" }}>{a.summary}</p>
        <ArticleBody body={a.body} />
      </div>
    </section>
  );
}

export async function articleMeta(kind: ArticleKind, slug: string) {
  const a = await db.article.findFirst({ where: { kind, slug, published: true }, select: { title: true, summary: true } });
  return a ? { title: a.title, description: a.summary } : {};
}
