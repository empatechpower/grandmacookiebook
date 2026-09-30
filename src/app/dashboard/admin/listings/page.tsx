import Link from "next/link";
import { db } from "@/lib/db";
import { categoryLabel, formatLabel } from "@/lib/constants";
import { money } from "@/lib/money";
import { reviewListing } from "@/app/actions/admin";
import { Badge, PageHead, Table, fmtDate } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export default async function Listings({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "PENDING" } = await searchParams;
  const where = status === "ALL" ? {} : { status };
  const include = { author: { select: { id: true, name: true, status: true } } };
  const [books, pkgs] = await Promise.all([
    db.book.findMany({ where, include, orderBy: { updatedAt: "desc" } }),
    db.visitPackage.findMany({ where, include, orderBy: { updatedAt: "desc" } }),
  ]);
  const rows = [
    ...books.map((b) => ({ kind: "book", id: b.id, title: b.title, detail: `Book · ${categoryLabel(b.category)} · ${b.stock} in stock`, desc: b.description, price: b.price, status: b.status, author: b.author, updatedAt: b.updatedAt, cover: b.coverUrl })),
    ...pkgs.map((p) => ({ kind: "package", id: p.id, title: p.title, detail: `Visit · ${formatLabel(p.format)} · ${p.durationMins} min${p.region ? ` · ${p.region}` : ""}`, desc: p.description, price: p.fee, status: p.status, author: p.author, updatedAt: p.updatedAt, cover: null })),
  ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  return (
    <>
      <PageHead title="Listings review" sub="Nothing goes public until this desk says so. Rejections need a note for the author." />
      <div className="filters">
        {["PENDING", "APPROVED", "REJECTED", "ARCHIVED", "ALL"].map((s) => (
          <Link key={s} className={`filter${status === s ? " active" : ""}`} href={`?status=${s}`}>
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </Link>
        ))}
      </div>
      <Table heads={["Listing", "Creator", "Price", "Updated", "Status", "Decision"]} empty="Queue is clear.">
        {rows.map((r) => (
          <tr key={r.kind + r.id}>
            <td style={{ maxWidth: 340 }}>
              <b>{r.title}</b>
              <div className="muted" style={{ fontSize: ".78rem" }}>{r.detail}</div>
              <div style={{ fontSize: ".8rem", marginTop: 4 }}>{r.desc}</div>
              {r.cover && <a href={r.cover} target="_blank" rel="noreferrer" style={{ fontSize: ".78rem", textDecoration: "underline" }}>View cover</a>}
            </td>
            <td>
              {r.author.name}
              {r.author.status !== "ACTIVE" && <div><Badge status={r.author.status} /></div>}
            </td>
            <td>{money(r.price)}</td>
            <td>{fmtDate(r.updatedAt)}</td>
            <td><Badge status={r.status} /></td>
            <td>
              {r.status !== "ARCHIVED" && (
                <form action={reviewListing} className="inline-form">
                  <input type="hidden" name="kind" value={r.kind} />
                  <input type="hidden" name="id" value={r.id} />
                  <input name="note" placeholder="Note to author" aria-label="Review note" />
                  {r.status !== "APPROVED" && <SubmitButton name="decision" value="approve" className="btn btn-sage btn-sm">Approve</SubmitButton>}
                  {r.status !== "REJECTED" && <SubmitButton name="decision" value="reject" className="btn btn-danger btn-sm">{r.status === "APPROVED" ? "Unpublish" : "Reject"}</SubmitButton>}
                </form>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
