import Link from "next/link";
import { searchAuthors } from "@/lib/directory";
import { getSettings } from "@/lib/settings";
import { HOLD_DAYS } from "@/lib/fulfillment";
import { AuthorCard } from "@/components/AuthorCard";
import { CtaBand, Faq, FeatureGrid, Hero, Steps } from "@/components/Marketing";

export const metadata = { title: "For schools & libraries", description: "Book vetted authors for in-person and virtual visits, buy classroom sets, host book fairs." };

export default async function ForSchools() {
  const [authors, { cancelNoticeDays }] = await Promise.all([searchAuthors({ sort: "rating" }), getSettings()]);
  const k12 = authors.filter((a) => a.formats.length).slice(0, 4);
  return (
    <>
      <Hero
        eyebrow="For schools & libraries"
        title={<>Bring stories to life <em>in your classroom</em>.</>}
        lede="Book vetted authors for assemblies, classroom visits and virtual sessions. Buy signed books and classroom sets straight from the author. One place to book, pay and manage it all."
        ctas={[["Find an author", "/authors"], ["Post a request", "/dashboard/buyer/requests/new"]]}
        aside={
          <aside className="poster">
            <div className="poster-kicker">What schools book</div>
            <h3>Visits that fit your calendar and budget</h3>
            {[["Assemblies & classroom visits", "In person or virtual"], ["Workshops", "Writing, SEL, STEM and more"], ["Book fairs", "With optional fundraising"], ["Classroom sets", "Bulk pricing from the author"]].map(([b, s]) => (
              <div key={b} className="event-card"><b>{b}</b><small>{s}</small></div>
            ))}
          </aside>
        }
      />
      <FeatureGrid
        eyebrow="Why schools choose us"
        title="Everything you need to plan an author visit"
        items={[
          ["Vetted authors, fast", "Every author and listing is reviewed. Filter by topic, grade level, budget, date, language and location."],
          ["Get proposals", "Post a request with your date and budget — matching authors send you proposals to compare."],
          ["Talk it through", "Message authors privately to agree timing, content and travel before you book."],
          ["Pay safely", `Payment is held until your visit happens. If something goes wrong, report it within ${HOLD_DAYS} days for a full refund.`],
          ["Classroom sets", "Buy signed books directly from authors, with bulk pricing for larger orders."],
          ["Book fairs", "Host a curated in-person or virtual book fair — and raise funds for your school."],
        ]}
      />
      <Steps
        title="How booking works"
        steps={[
          ["Find or post", "Browse authors by topic and grade, or post a request and receive proposals."],
          ["Agree details", "Message the author, pick an open date, and receive a final quote."],
          ["Pay to confirm", "Your payment is held securely until after the visit."],
          ["Enjoy & review", "Confirm the visit happened and leave a review for other schools."],
        ]}
      />
      {k12.length > 0 && (
        <section className="pad">
          <div className="wrap">
            <div className="sec-head">
              <h2>Top-rated authors</h2>
              <Link className="btn btn-ghost" href="/authors?sort=rating">Browse all →</Link>
            </div>
            <div className="grid-4">{k12.map((a) => <AuthorCard key={a.id} a={a} />)}</div>
          </div>
        </section>
      )}
      <Faq
        items={[
          ["How much does it cost to join?", "Nothing. School and library accounts are free — you only pay for the books and visits you book."],
          ["Do we need a contract?", "It's optional. Either side can attach one to a booking, and there's a sample agreement in our resources."],
          ["What if we need to cancel?", `Cancel at least ${cancelNoticeDays} days before the event for a full refund. Later cancellations aren't refunded, because the author has kept the date for you.`],
          ["Can authors visit virtually?", "Yes — many authors offer virtual assemblies and classroom sessions. Filter the directory by format."],
          ["Can we pay by invoice or purchase order?", "Card payment is supported today. Contact us if your school needs an invoice."],
        ]}
      />
      <CtaBand title="Plan your next author visit" text="Free to join. Pay only when you book." ctas={[["Create a free school account", "/signup?role=BUYER"], ["Host a book fair", "/book-fairs"]]} />
    </>
  );
}
