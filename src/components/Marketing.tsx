import Link from "next/link";

export function Hero({ eyebrow, title, lede, ctas, aside }: {
  eyebrow: string;
  title: React.ReactNode;
  lede: string;
  ctas: [string, string, string?][];
  aside?: React.ReactNode;
}) {
  return (
    <section className="hero">
      <div className="wrap hero-grid">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p className="lede">{lede}</p>
          <div className="hero-cta">
            {ctas.map(([label, href, cls], i) => (
              <Link key={href} className={`btn ${cls ?? (i === 0 ? "btn-terra" : "btn-line")}`} href={href}>{label}</Link>
            ))}
          </div>
        </div>
        {aside}
      </div>
    </section>
  );
}

export function FeatureGrid({ title, items, eyebrow }: { title: string; eyebrow?: string; items: [string, string][] }) {
  return (
    <section className="pad">
      <div className="wrap">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2 style={{ marginBottom: 20 }}>{title}</h2>
        <div className="grid-3 features">
          {items.map(([h, b], i) => (
            <div key={h} className="feature">
              <span className="feature-n">{String(i + 1).padStart(2, "0")}</span>
              <h3>{h}</h3>
              <p className="muted">{b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Steps({ title, steps }: { title: string; steps: [string, string][] }) {
  return (
    <section className="pad band">
      <div className="wrap">
        <h2 style={{ marginBottom: 20 }}>{title}</h2>
        <div className="grid-4">
          {steps.map(([h, b], i) => (
            <div key={h} className="step" style={{ flexDirection: "column" }}>
              <span className="step-n">{i + 1}</span>
              <b>{h}</b>
              <p className="muted" style={{ fontSize: ".9rem" }}>{b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Faq({ items }: { items: [string, string][] }) {
  return (
    <section className="pad">
      <div className="wrap" style={{ maxWidth: 820 }}>
        <h2 style={{ marginBottom: 16 }}>Questions</h2>
        <div className="stack">
          {items.map(([q, a]) => (
            <details key={q} className="panel">
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>{q}</summary>
              <p className="muted" style={{ marginTop: 8 }}>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CtaBand({ title, text, ctas }: { title: string; text: string; ctas: [string, string][] }) {
  return (
    <section className="pad">
      <div className="wrap">
        <div className="cta-band">
          <div>
            <h2>{title}</h2>
            <p>{text}</p>
          </div>
          <div className="row">
            {ctas.map(([label, href], i) => (
              <Link key={href} className={`btn ${i === 0 ? "btn-terra" : "btn-line light"}`} href={href}>{label}</Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
