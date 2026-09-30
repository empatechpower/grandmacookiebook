import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { articlePath } from "@/lib/content";
import { deleteArticle } from "@/app/actions/content";
import { PageHead } from "@/components/ui";
import { ArticleForm } from "@/components/ArticleForm";
import { SubmitButton } from "@/components/SubmitButton";

export default async function EditArticle({ params }: { params: Promise<{ id: string }> }) {
  const a = await db.article.findUnique({ where: { id: (await params).id } });
  if (!a) notFound();
  return (
    <>
      <Link href="/dashboard/admin/articles" className="muted" style={{ fontSize: ".85rem" }}>← All articles</Link>
      <PageHead
        title={a.title}
        action={
          <div className="row">
            {a.published && <Link className="btn btn-line btn-sm" href={articlePath(a)} target="_blank">View live</Link>}
            <form action={deleteArticle}>
              <input type="hidden" name="id" value={a.id} />
              <SubmitButton className="btn btn-danger btn-sm" confirm="Delete this article?">Delete</SubmitButton>
            </form>
          </div>
        }
      />
      <ArticleForm a={a} />
    </>
  );
}
