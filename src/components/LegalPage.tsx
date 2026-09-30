import { LEGAL, legalIsPlaceholder } from "@/lib/legal";

export function LegalPage({ title, sections }: { title: string; sections: [string, React.ReactNode][] }) {
  return (
    <section className="pad">
      <div className="wrap" style={{ maxWidth: 780 }}>
        <div className="eyebrow">Legal</div>
        <h1 className="serif" style={{ fontSize: "clamp(2rem,4vw,2.8rem)", letterSpacing: "-.03em" }}>{title}</h1>
        <p className="muted" style={{ margin: "6px 0 24px" }}>Last updated {LEGAL.updated}</p>
        {legalIsPlaceholder && (
          <div className="alert alert-info">
            Template — fill in the company details (LEGAL_* environment variables) and have a lawyer review this page before launch.
          </div>
        )}
        <div className="legal">
          {sections.map(([h, body], i) => (
            <section key={h}>
              <h2>{i + 1}. {h}</h2>
              {body}
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
