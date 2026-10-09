import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { HOLD_DAYS } from "@/lib/fulfillment";
import { PageHead } from "@/components/ui";

export const metadata = { title: "Pricing" };

/** Fees for authors. Private: only signed-in authors see it (client request). */
export default async function AuthorPricing() {
  await requireUser("AUTHOR", "ADMIN");
  const { bookCommissionPct, visitCommissionPct, cancelNoticeDays, poTermsDays } = await getSettings();
  const keep = (amount: number, pct: number) => `$${((amount * (100 - pct)) / 100).toFixed(2).replace(/\.00$/, "")}`;
  const faqs: [string, string][] = [
    ["Are there listing or membership fees?", "No. Joining and listing are free. The only charge is the commission on completed sales, taken out of the sale price."],
    ["When do I get paid?", `The customer's payment is held until they confirm the book arrived or the visit happened, or automatically ${HOLD_DAYS} days later (${HOLD_DAYS} days after the event, for visits). Your share is then sent to your Stripe account, and Stripe pays it out to your bank.`],
    ["What if a school pays by purchase order?", `Schools can pay by purchase order on Net ${poTermsDays} terms. Once the PO is approved, you ship the books or do the visit as usual, and your share is released after the school pays the invoice.`],
    ["What if a booking is canceled?", `If the customer cancels at least ${cancelNoticeDays} days before the event, they're refunded. Later cancellations aren't refunded, and you're paid because you kept the date for them. If you cancel, the customer is always refunded in full, so please cancel only when you must.`],
    ["Can I charge for travel?", "Yes. Add travel and accommodation to your fee when you accept a request or submit a proposal. Agree it with the customer in messages first."],
    ["Do bulk discounts come out of my share?", "Bulk discounts lower the sale price, and commission is charged on the discounted price. You can turn bulk discounts off for any product under Products."],
  ];
  return (
    <>
      <PageHead title="Pricing" sub="Free to join and list. South Texas Book & Author only earns a commission when you make a sale." />
      <div className="grid-3">
        <article className="card"><div className="body stack">
          <div className="meta">Book sales</div>
          <div className="price-lg">{bookCommissionPct}%</div>
          <p>Commission on each book sold. You set your price and ship directly; you keep {100 - bookCommissionPct}% of every sale.</p>
          <Link className="btn btn-line" href="/dashboard/author/books">Your products</Link>
        </div></article>
        <article className="card"><div className="body stack">
          <div className="meta">Author visits & speeches</div>
          <div className="price-lg">{visitCommissionPct}%</div>
          <p>Commission on each booking. You set your fee (travel can be included); you keep {100 - visitCommissionPct}%.</p>
          <Link className="btn btn-line" href="/dashboard/author/visits">Your listings</Link>
        </div></article>
        <article className="card"><div className="body stack">
          <div className="meta">Joining & listing</div>
          <div className="price-lg">Free</div>
          <p>No membership or listing fees. Customers pay the price you set, with no booking fee added on top.</p>
          <Link className="btn btn-line" href="/dashboard/author/profile">Your storefront</Link>
        </div></article>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h3>Example</h3>
        <p className="muted" style={{ marginTop: 6 }}>
          A school books your $500 visit: you receive {keep(500, visitCommissionPct)}. A reader buys your $20 book: you receive {keep(20, bookCommissionPct)}.
        </p>
      </div>

      <h3 style={{ margin: "28px 0 10px" }}>Questions</h3>
      <div className="stack" style={{ maxWidth: 760 }}>
        {faqs.map(([q, a]) => (
          <details key={q} className="panel">
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>{q}</summary>
            <p className="muted" style={{ marginTop: 8 }}>{a}</p>
          </details>
        ))}
      </div>
      <p style={{ marginTop: 20 }}>Still have a question? <Link href="/contact" style={{ color: "var(--terracotta)" }}>Contact us</Link>.</p>
    </>
  );
}
