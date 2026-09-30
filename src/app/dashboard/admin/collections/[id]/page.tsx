import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { addCollectionItem, deleteCollection, moveCollectionItem, removeCollectionItem } from "@/app/actions/content";
import { PageHead, Table } from "@/components/ui";
import { CollectionForm } from "@/components/CollectionForm";
import { SubmitButton } from "@/components/SubmitButton";

export default async function EditCollection({ params }: { params: Promise<{ id: string }> }) {
  const c = await db.collection.findUnique({ where: { id: (await params).id }, include: { items: { orderBy: { position: "asc" } } } });
  if (!c) notFound();
  const [authors, books] = await Promise.all([
    db.user.findMany({ where: { role: "AUTHOR", status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.book.findMany({ where: { status: "APPROVED" }, select: { id: true, title: true, author: { select: { name: true } } }, orderBy: { title: "asc" } }),
  ]);
  const name = (i: (typeof c.items)[number]) =>
    i.authorId ? `Author · ${authors.find((a) => a.id === i.authorId)?.name ?? "(unavailable)"}` : `Book · ${books.find((b) => b.id === i.bookId)?.title ?? "(unavailable)"}`;
  return (
    <>
      <Link href="/dashboard/admin/collections" className="muted" style={{ fontSize: ".85rem" }}>← All collections</Link>
      <PageHead
        title={c.title}
        action={
          <div className="row">
            {c.published && <Link className="btn btn-line btn-sm" href={`/collections/${c.slug}`} target="_blank">View live</Link>}
            <form action={deleteCollection}>
              <input type="hidden" name="id" value={c.id} />
              <SubmitButton className="btn btn-danger btn-sm" confirm="Delete this collection?">Delete</SubmitButton>
            </form>
          </div>
        }
      />
      <CollectionForm c={c} />
      <h3 className="h2-sm">Items ({c.items.length})</h3>
      <form action={addCollectionItem} className="panel inline-form" style={{ marginBottom: 14, flexWrap: "wrap" }}>
        <input type="hidden" name="collectionId" value={c.id} />
        <select name="item" required defaultValue="" aria-label="Author or book" style={{ minWidth: 260 }}>
          <option value="" disabled>Choose an author or book…</option>
          <optgroup label="Authors">{authors.map((a) => <option key={a.id} value={`author:${a.id}`}>{a.name}</option>)}</optgroup>
          <optgroup label="Books">{books.map((b) => <option key={b.id} value={`book:${b.id}`}>{b.title} — {b.author.name}</option>)}</optgroup>
        </select>
        <input name="note" placeholder="Curator's note (optional)" style={{ flex: 1, minWidth: 200 }} />
        <SubmitButton className="btn btn-sage btn-sm">Add</SubmitButton>
      </form>
      <Table heads={["#", "Item", "Note", ""]} empty="Nothing in this collection yet.">
        {c.items.map((i, idx) => (
          <tr key={i.id}>
            <td>{idx + 1}</td>
            <td>{name(i)}</td>
            <td style={{ fontSize: ".85rem" }}>{i.note}</td>
            <td>
              <div className="row">
                {(["up", "down"] as const).map((dir) => (
                  <form key={dir} action={moveCollectionItem}>
                    <input type="hidden" name="id" value={i.id} />
                    <input type="hidden" name="dir" value={dir} />
                    <SubmitButton className="btn btn-ghost btn-sm" aria-label={`Move ${dir}`}>{dir === "up" ? "↑" : "↓"}</SubmitButton>
                  </form>
                ))}
                <form action={removeCollectionItem}>
                  <input type="hidden" name="id" value={i.id} />
                  <SubmitButton className="btn btn-danger btn-sm">Remove</SubmitButton>
                </form>
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
