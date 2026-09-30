import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { HOLD_DAYS } from "@/lib/fulfillment";

export const metadata = { title: "Pricing" };

export default async function Pricing() {
  const { bookCommissionPct, visitCommissionPct, cancelNoticeDays } = await getSettings();
  const faqs: [string, string][] = [
    ["When do authors get paid?", `After the buyer pays, the money is held by Grandma Cookie Book. It's released to the author's Stripe account when the buyer confirms the book arrived or the visit happened — or automatically ${HOLD_DAYS} days later (${HOLD_DAYS} days after the event, for visits). Stripe then pays out to the author's bank.`],
    ["What if something goes wrong?", `Because payment is held, we can refund you in full if a book never arrives or an author doesn't show up. Contact us before the hold ends.`],
    ["Are there listing or membership fees?", "No. Joining and listing are free for everyone. The only charge is the commission on completed sales, paid by the author out of the sale price."],
    ["What if we need to cancel?", `Cancel a paid booking at least ${cancelNoticeDays} days before the event for a full refund. Later cancellations aren't refunded — the author is paid, because they kept the date for you.`],
    ["Who pays for travel?", "Authors can include travel and accommodation in their final quote when they accept your request. Agree it in messages first."],
    ["Can I pay by invoice or purchase order?", "Not yet — payment is by card through Stripe. Contact us if your school needs an invoice."],
  ];
  return (
    <section className="pad">
      <div className="wrap">
        <div className="eyebrow">Pricing</div>
        <h2 style={{ marginBottom: 8 }}>Simple, sale-based pricing</h2>
        <p className="lede-sm" style={{ maxWidth: "60ch" }}>Free to join for schools, businesses and authors. Grandma Cookie Book only earns when a sale completes.</p>

        <div className="grid-3" style={{ marginTop: 20 }}>
          <article className="card"><div className="body stack">
            <div className="meta">Buyers — schools, businesses, readers</div>
            <div className="price-lg">Free</div>
            <p>Browse, message authors and book. You pay the listed price or the author’s quote — no booking fee on top.</p>
            <Link className="btn btn-terra" href="/signup?role=BUYER">Create a free account</Link>
          </div></article>
          <article className="card"><div className="body stack">
            <div className="meta">Authors — book sales</div>
            <div className="price-lg">{bookCommissionPct}%</div>
            <p>Commission on each book sold. You set your price and ship directly; you keep {100 - bookCommissionPct}% of every sale.</p>
            <Link className="btn btn-line" href="/signup?role=AUTHOR">List your books</Link>
          </div></article>
          <article className="card"><div className="body stack">
            <div className="meta">Authors — visits & speeches</div>
            <div className="price-lg">{visitCommissionPct}%</div>
            <p>Commission on each booking. You set your fee (and can add travel to your quote); you keep {100 - visitCommissionPct}%.</p>
            <Link className="btn btn-line" href="/signup?role=AUTHOR">Offer visits</Link>
          </div></article>
        </div>

        <div className="panel" style={{ marginTop: 24 }}>
          <h3>Example</h3>
          <p className="muted" style={{ marginTop: 6 }}>
            A school books a $500 visit: the school pays $500, the author receives ${(500 * (100 - visitCommissionPct) / 100).toFixed(2).replace(/\.00$/, "")},
            Grandma Cookie Book keeps ${(500 * visitCommissionPct / 100).toFixed(2).replace(/\.00$/, "")}. A reader buys a $20 book: the author receives $
            {(20 * (100 - bookCommissionPct) / 100).toFixed(2).replace(/\.00$/, "")}.
          </p>
        </div>

        <h2 className="h2-sm" style={{ marginTop: 40 }}>Questions</h2>
        <div className="stack" style={{ maxWidth: 760 }}>
          {faqs.map(([q, a]) => (
            <details key={q} className="panel">
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>{q}</summary>
              <p className="muted" style={{ marginTop: 8 }}>{a}</p>
            </details>
          ))}
        </div>
        <p style={{ marginTop: 24 }}>Still have a question? <Link href="/contact" style={{ color: "var(--terracotta)" }}>Contact us</Link>.</p>
      </div>
    </section>
  );
}
