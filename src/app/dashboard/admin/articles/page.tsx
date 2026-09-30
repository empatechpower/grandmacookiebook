import Link from "next/link";
import { db } from "@/lib/db";
import { ARTICLE_KINDS, articlePath } from "@/lib/content";
import { PageHead, Table, fmtDate } from "@/components/ui";
import { ArticleForm } from "@/components/ArticleForm";

export default async function Articles() {
  const as = await db.article.findMany({ orderBy: [{ updatedAt: "desc" }] });
  return (
    <>
      <PageHead title="News, resources & events" sub="Publish newsroom posts, resources for schools and authors (guides, templates, reports), and events like Literacy Week." />
      <Table heads={["Title", "Section", "Date", "Status"]} empty="Nothing published yet.">
        {as.map((a) => (
          <tr key={a.id}>
            <td><Link href={`/dashboard/admin/articles/${a.id}`}><b>{a.title}</b></Link><div className="muted" style={{ fontSize: ".78rem" }}>{articlePath(a)}</div></td>
            <td>{ARTICLE_KINDS.find((k) => k.value === a.kind)?.label}</td>
            <td>{a.kind === "EVENT" && a.eventStart ? fmtDate(a.eventStart) : a.publishedAt ? fmtDate(a.publishedAt) : "—"}</td>
            <td><span className={`badge ${a.published ? "b-ok" : "b-wait"}`}>{a.published ? "Published" : "Draft"}</span></td>
          </tr>
        ))}
      </Table>
      <h3 className="h2-sm">New article</h3>
      <ArticleForm />
    </>
  );
}
