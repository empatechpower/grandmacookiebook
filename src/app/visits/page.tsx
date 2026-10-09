import Link from "next/link";
import { VisitCard } from "@/components/Cards";
import { livePackages } from "@/lib/catalog";
import { FORMATS } from "@/lib/constants";

export const metadata = { title: "Author Visit" };

export default async function Visits({ searchParams }: { searchParams: Promise<{ format?: string; q?: string }> }) {
  const { format, q } = await searchParams;
  const active = FORMATS.some((f) => f.value === format && f.value !== "HYBRID") ? format : undefined;
  const visits = await livePackages(active, undefined, q?.trim().slice(0, 80));
  return (
    <section className="pad">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <div className="eyebrow">Appearances</div>
            <h2>Author Visit</h2>
          </div>
          <form className="inline-form" action="/visits">
            {active && <input type="hidden" name="format" value={active} />}
            <input name="q" defaultValue={q} placeholder="Search author visits or authors" aria-label="Search visits" style={{ padding: "9px 12px", minWidth: 220 }} />
            <button className="btn btn-ink btn-sm">Search</button>
          </form>
        </div>
        <div className="filters">
          <Link className={`filter${!active ? " active" : ""}`} href="/visits">
            All
          </Link>
          {FORMATS.filter((f) => f.value !== "HYBRID").map((f) => (
            <Link key={f.value} className={`filter${active === f.value ? " active" : ""}`} href={`/visits?format=${f.value}`}>
              {f.label}
            </Link>
          ))}
        </div>
        {visits.length ? (
          <div className="grid-3">
            {visits.map((v) => (
              <VisitCard key={v.id} v={v} />
            ))}
          </div>
        ) : (
          <div className="empty">{active || q ? <>No visits match. Try another search or format — or <a href="/authors" style={{ textDecoration: "underline" }}>browse authors</a>.</> : <>Author visits are being added now. You can <a href="/dashboard/buyer/requests/new" style={{ textDecoration: "underline" }}>post a request</a> and authors will send you proposals.</>}</div>
        )}
      </div>
    </section>
  );
}
