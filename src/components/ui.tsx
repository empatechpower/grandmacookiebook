import Link from "next/link";
import { authorPath } from "@/lib/storefront";
import { statusBadge, statusLabel } from "@/lib/constants";

export function Badge({ status }: { status: string }) {
  return <span className={`badge ${statusBadge(status)}`}>{statusLabel(status)}</span>;
}

export function Table({ heads, children, empty }: { heads: string[]; children: React.ReactNode; empty?: string }) {
  const hasRows = Array.isArray(children) ? children.length > 0 : !!children;
  if (!hasRows) return <div className="empty">{empty ?? "Nothing here yet."}</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {heads.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Kpis({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <div className="kpis">
      {items.map(([label, value]) => (
        <div className="kpi" key={label}>
          <span>{label}</span>
          <b>{value}</b>
        </div>
      ))}
    </div>
  );
}

export function PageHead({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="split" style={{ marginBottom: 20 }}>
      <div>
        <h2>{title}</h2>
        {sub && <p className="muted" style={{ marginTop: 6 }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Cover({ url, title, className = "cover" }: { url?: string | null; title: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img className={className} src={url} alt={title} /> : <div className={`${className} ph`}>{title}</div>;
}

export const Initials = ({ name }: { name: string }) => (
  <div className="avatar">{name.split(" ").map((p) => p[0]).slice(0, 2).join("")}</div>
);

export const AuthorLink = ({ id, name, slug }: { id: string; name: string; slug?: string | null }) => (
  <Link href={authorPath({ id, slug })} style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
    {name}
  </Link>
);

export { fmtDate } from "@/lib/dates";
export const fmtDateTime = (d: Date) =>
  d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
