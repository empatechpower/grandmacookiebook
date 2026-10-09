import Link from "next/link";
import { searchAuthors } from "@/lib/directory";
import { AuthorCard } from "@/components/AuthorCard";
import { CtaBand, Faq, FeatureGrid, Hero, Steps } from "@/components/Marketing";

export const metadata = { title: "For business", description: "Author keynotes, workshops, book clubs and ERG events for your workplace." };

export default async function ForBusiness() {
  const speakers = (await searchAuthors({ grade: "adult", sort: "rating" })).slice(0, 4);
  return (
    <>
      <Hero
        eyebrow="For business & organizations"
        title={<>Authors who <em>inspire</em> your people.</>}
        lede="Book authors for keynotes, professional development, book clubs and employee resource group events — in person or virtual. Gift signed books to your team."
        ctas={[["Find a speaker", "/authors?grade=adult"], ["Post a request", "/dashboard/buyer/requests/new"]]}
        aside={
          <aside className="poster">
            <div className="poster-kicker">Popular with teams</div>
            <h3>Programs that bring people together</h3>
            {[["Keynotes", "All-hands, offsites, conferences"], ["ERG & heritage months", "Author conversations and panels"], ["Book clubs", "Author Q&A for your reading group"], ["Corporate gifting", "Signed books in bulk"]].map(([b, s]) => (
              <div key={b} className="event-card"><b>{b}</b><small>{s}</small></div>
            ))}
          </aside>
        }
      />
      <FeatureGrid
        eyebrow="Why teams use us"
        title="Meaningful events, without the admin"
        items={[
          ["Curated speakers", "Authors on leadership, wellbeing, inclusion, creativity and more — every profile reviewed."],
          ["Proposals on request", "Share your date, audience and budget, and compare proposals from interested authors."],
          ["One invoice-free checkout", "Pay securely by card; payment is held until the event happens."],
          ["Heritage months & ERGs", "Find authors by tag — #BilingualAuthors, #WomenAuthors, #MenAuthors, #SEL, #STEM and more."],
          ["Books for everyone", "Order signed copies in bulk for attendees or as gifts."],
          ["Hybrid-friendly", "Virtual and in-person formats for distributed teams."],
        ]}
      />
      <Steps
        title="How it works"
        steps={[
          ["Tell us what you need", "Browse speakers or post a request with your date and budget."],
          ["Compare & chat", "Review proposals and message authors about your audience."],
          ["Book & pay", "Confirm with one payment, held until after your event."],
          ["Host & share", "Run your event and share feedback with a review."],
        ]}
      />
      {speakers.length > 0 && (
        <section className="pad">
          <div className="wrap">
            <div className="sec-head">
              <h2>Speakers for adult audiences</h2>
              <Link className="btn btn-ghost" href="/authors?grade=adult">See all →</Link>
            </div>
            <div className="grid-4">{speakers.map((a) => <AuthorCard key={a.id} a={a} />)}</div>
          </div>
        </section>
      )}
      <Faq
        items={[
          ["Can we book for a virtual all-hands?", "Yes — filter by virtual format, or post a request specifying a virtual event."],
          ["Do you handle travel?", "Authors include travel in their quote when they accept, so the price you pay is all-in."],
          ["Can we buy books for attendees?", "Yes. Many authors offer bulk pricing, and each author ships directly."],
        ]}
      />
      <CtaBand title="Find your next speaker" text="Free to browse and message authors." ctas={[["Create a free account", "/signup?role=BUYER"], ["Contact us", "/contact"]]} />
    </>
  );
}
