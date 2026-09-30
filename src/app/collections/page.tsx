import Link from "next/link";
import { db } from "@/lib/db";
import { COLLECTION_KINDS } from "@/lib/content";

export const metadata = { title: "Collections" };

export default async function Collections() {
  const cs = await db.collection.findMany({ where: { published: true }, include: { _count: { select: { items: true } } }, orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }] });
  return (
    <section className="pad">
      <div className="wrap">
        <div className="eyebrow">Curated</div>
        <h2>Collections</h2>
        <p className="lede-sm" style={{ maxWidth: "62ch" }}>Featured author catalogs, our educator panel’s monthly favorites, and themed picks for the school year.</p>
        {cs.length ? (
          <div className="grid-3">
            {cs.map((c) => (
              <Link key={c.id} href={`/collections/${c.slug}`} className="card collection-card">
                <div className="body">
                  <div className="meta">{COLLECTION_KINDS.find((k) => k.value === c.kind)?.label}</div>
                  <h3>{c.title}</h3>
                  {c.subtitle && <p className="muted" style={{ fontSize: ".88rem" }}>{c.subtitle}</p>}
                  <p style={{ fontSize: ".9rem", marginTop: 8 }}>{c.description.slice(0, 160)}{c.description.length > 160 ? "…" : ""}</p>
                  <div className="meta" style={{ marginTop: 12 }}>{c._count.items} picks →</div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty">No collections published yet.</div>
        )}
      </div>
    </section>
  );
}
