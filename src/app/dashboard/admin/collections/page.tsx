import Link from "next/link";
import { db } from "@/lib/db";
import { COLLECTION_KINDS } from "@/lib/content";
import { PageHead, Table } from "@/components/ui";
import { CollectionForm } from "@/components/CollectionForm";

export default async function Collections() {
  const cs = await db.collection.findMany({ include: { _count: { select: { items: true } } }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }] });
  return (
    <>
      <PageHead title="Collections" sub="Curated lists of authors and books — featured catalogs, educators' monthly favorites, themed months. Use them for sponsored placements too." />
      <Table heads={["Collection", "Type", "Items", "Status"]} empty="No collections yet.">
        {cs.map((c) => (
          <tr key={c.id}>
            <td><Link href={`/dashboard/admin/collections/${c.id}`}><b>{c.title}</b></Link><div className="muted" style={{ fontSize: ".78rem" }}>/collections/{c.slug}</div></td>
            <td>{COLLECTION_KINDS.find((k) => k.value === c.kind)?.label}</td>
            <td>{c._count.items}</td>
            <td>
              <span className={`badge ${c.published ? "b-ok" : "b-wait"}`}>{c.published ? "Published" : "Draft"}</span>
              {c.featured && <span className="chip tag" style={{ marginLeft: 6 }}>On home page</span>}
            </td>
          </tr>
        ))}
      </Table>
      <h3 className="h2-sm">New collection</h3>
      <CollectionForm />
    </>
  );
}
