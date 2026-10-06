import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { categoryLabel } from "@/lib/constants";
import { money } from "@/lib/money";
import { toggleArchive, toggleBulk, toggleFeatured } from "@/app/actions/author";
import { Badge, PageHead, Table } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export default async function AuthorBooks() {
  const user = await requireUser("AUTHOR");
  const books = await db.book.findMany({ where: { authorId: user.id }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }] });
  return (
    <>
      <PageHead title="Products" sub="Books and merchandise you sell. Approved products appear on your storefront — featured ones first." action={<Link className="btn btn-terra" href="/dashboard/author/books/new">+ Add product</Link>} />
      <Table heads={["Product", "Category", "Price", "Inventory", "Bulk discounts", "Status", ""]} empty="No products yet — add your first book or item.">
        {books.map((b) => (
          <tr key={b.id}>
            <td>
              <b>{b.title}</b>
              {b.featured && <span className="featured-badge" style={{ marginLeft: 8 }}>★ Featured</span>}
              {b.status === "REJECTED" && b.reviewNote && <div style={{ fontSize: ".8rem", color: "var(--danger)" }}>{b.reviewNote}</div>}
            </td>
            <td>{categoryLabel(b.category)}</td>
            <td>{money(b.price)}</td>
            <td>{b.stock}</td>
            <td>
              <form action={toggleBulk}>
                <input type="hidden" name="id" value={b.id} />
                <SubmitButton className={`btn btn-sm ${b.bulkEnabled ? "btn-sage" : "btn-line"}`} title="Turn the platform's bulk discounts on or off for this product">
                  {b.bulkEnabled ? "On" : "Off"}
                </SubmitButton>
              </form>
            </td>
            <td><Badge status={b.status} /></td>
            <td>
              <div className="row">
                <Link className="btn btn-line btn-sm" href={`/dashboard/author/books/${b.id}`}>Edit</Link>
                <form action={toggleFeatured}>
                  <input type="hidden" name="id" value={b.id} />
                  <SubmitButton className="btn btn-ghost btn-sm" title={b.featured ? "Remove from featured" : "Show first on your storefront"}>
                    {b.featured ? "★ Unfeature" : "☆ Feature"}
                  </SubmitButton>
                </form>
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
