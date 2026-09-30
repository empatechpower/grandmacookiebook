import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { categoryLabel } from "@/lib/constants";
import { money } from "@/lib/money";
import { toggleArchive } from "@/app/actions/author";
import { Badge, PageHead, Table } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export default async function AuthorBooks() {
  const user = await requireUser("AUTHOR");
  const books = await db.book.findMany({ where: { authorId: user.id }, orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageHead title="My books" sub="Approved titles sell directly to buyers." action={<Link className="btn btn-terra" href="/dashboard/author/books/new">Add a book</Link>} />
      <Table heads={["Title", "Category", "Price", "Stock", "Status", ""]} empty="No books yet — add your first title.">
        {books.map((b) => (
          <tr key={b.id}>
            <td>
              <b>{b.title}</b>
              {b.status === "REJECTED" && b.reviewNote && <div style={{ fontSize: ".8rem", color: "var(--danger)" }}>{b.reviewNote}</div>}
            </td>
            <td>{categoryLabel(b.category)}</td>
            <td>{money(b.price)}</td>
            <td>{b.stock}</td>
            <td><Badge status={b.status} /></td>
            <td>
              <div className="row">
                <Link className="btn btn-line btn-sm" href={`/dashboard/author/books/${b.id}`}>Edit</Link>
                <form action={toggleArchive}>
                  <input type="hidden" name="kind" value="book" />
                  <input type="hidden" name="id" value={b.id} />
                  <SubmitButton className="btn btn-ghost btn-sm">{b.status === "ARCHIVED" ? "Restore" : "Archive"}</SubmitButton>
                </form>
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
