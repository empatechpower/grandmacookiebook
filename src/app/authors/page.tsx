import Link from "next/link";
import { searchAuthors, type DirectoryFilters } from "@/lib/directory";
import { BUDGETS, FORMATS, GRADES, IDENTITIES, LANGUAGES, TOPICS } from "@/lib/constants";
import { money } from "@/lib/money";
import { todayKey } from "@/lib/dates";
import { AuthorCard } from "@/components/AuthorCard";
import { FiltersDisclosure } from "@/components/FiltersDisclosure";

export const metadata = { title: "Find an author" };

function Select({ name, label, value, opts, any = "Any" }: { name: string; label: string; value?: string; opts: { value: string; label: string }[]; any?: string }) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <select id={name} name={name} defaultValue={value ?? ""}>
        <option value="">{any}</option>
        {opts.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export default async function Authors({ searchParams }: { searchParams: Promise<DirectoryFilters> }) {
  const f = await searchParams;
  const authors = await searchAuthors(f);
  const active = Object.entries(f).some(([k, v]) => v && k !== "sort");

  return (
    <section className="pad">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <div className="eyebrow">Directory</div>
            <h2>Find an author</h2>
            <p className="muted" style={{ marginTop: 6 }}>Vetted authors and speakers for schools, libraries, businesses and communities.</p>
          </div>
        </div>

        <div className="directory">
          <FiltersDisclosure active={active}>
          <form className="panel filters-panel" action="/authors">
            <div className="field">
              <label htmlFor="q">Search</label>
              <input id="q" name="q" defaultValue={f.q} placeholder="Name, topic or book title" />
            </div>
            <Select name="topic" label="Topic" value={f.topic} opts={TOPICS} />
            <Select name="grade" label="Grade level / audience" value={f.grade} opts={GRADES} />
            <Select name="format" label="Format" value={f.format} opts={FORMATS.filter((x) => x.value !== "HYBRID")} />
            <Select name="budget" label="Budget (visit fee up to)" value={f.budget} opts={BUDGETS.map((b) => ({ value: String(b), label: money(b * 100) }))} />
            <div className="field">
              <label htmlFor="date">Available on</label>
              <input id="date" name="date" type="date" min={todayKey()} defaultValue={f.date} />
            </div>
            <div className="field">
              <label htmlFor="location">Location</label>
              <input id="location" name="location" defaultValue={f.location} placeholder="City or state" />
            </div>
            <Select name="language" label="Language" value={f.language} opts={LANGUAGES} />
            <Select name="identity" label="Author tags" value={f.identity} opts={IDENTITIES} />
            <Select
              name="sort"
              label="Sort by"
              any="Newest"
              value={f.sort}
              opts={[
                { value: "rating", label: "Top rated" },
                { value: "price-asc", label: "Price: low to high" },
                { value: "price-desc", label: "Price: high to low" },
                { value: "name", label: "Name A–Z" },
              ]}
            />
            <div className="row">
              <button className="btn btn-terra">Search</button>
              {active && <Link className="btn btn-ghost" href="/authors">Clear</Link>}
            </div>
          </form>
          </FiltersDisclosure>

          <div>
            <div className="filters" aria-label="Quick topics">
              {TOPICS.slice(0, 2).map((t) => ({ ...t, label: `#${t.label}` })).concat(IDENTITIES).map((t) => {
                const key = IDENTITIES.includes(t) ? "identity" : "topic";
                const on = f[key as "identity" | "topic"] === t.value;
                return (
                  <Link key={t.value} className={`filter${on ? " active" : ""}`} href={on ? "/authors" : `/authors?${key}=${t.value}`}>
                    {t.label}
                  </Link>
                );
              })}
            </div>
            <p className="muted" style={{ fontSize: ".85rem", marginBottom: 12 }}>
              {authors.length} author{authors.length === 1 ? "" : "s"}
            </p>
            {authors.length ? (
              <div className="grid-3">
                {authors.map((a) => (
                  <AuthorCard key={a.id} a={a} />
                ))}
              </div>
            ) : (
              <div className="empty">{active ? "No authors match these filters. Try removing one." : <>Our first authors are joining now — check back soon. Are you an author? <a href="/signup?role=AUTHOR" style={{ textDecoration: "underline" }}>Join free</a>.</>}</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
