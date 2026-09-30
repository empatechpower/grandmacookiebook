import { getSettings } from "@/lib/settings";
import { HOLD_DAYS } from "@/lib/fulfillment";
import { CtaBand, Faq, FeatureGrid, Hero, Steps } from "@/components/Marketing";

export const metadata = { title: "For authors", description: "Sell your books and get booked for school visits, keynotes and workshops." };

export default async function ForAuthors() {
  const s = await getSettings();
  return (
    <>
      <Hero
        eyebrow="For authors & publishers"
        title={<>Sell your books. <em>Get booked</em>.</>}
        lede="Reach schools, libraries and businesses looking for authors like you. List your books and visit packages, set your own prices, and get paid automatically."
        ctas={[["Join free as an author", "/signup?role=AUTHOR"], ["See pricing", "/pricing"]]}
        aside={
          <aside className="poster">
            <div className="poster-kicker">You keep</div>
            <h3>{100 - s.bookCommissionPct}% of book sales · {100 - s.visitCommissionPct}% of bookings</h3>
            {[["No listing fees", "Free to join and list"], ["Paid through Stripe", "Straight to your bank"], ["Guaranteed for late cancellations", `Cancelled within ${s.cancelNoticeDays} days? You're still paid`], ["Referral rewards", `${s.referralPct}% of referred authors' sales`]].map(([b, t]) => (
              <div key={b} className="event-card"><b>{b}</b><small>{t}</small></div>
            ))}
          </aside>
        }
      />
      <FeatureGrid
        eyebrow="Why authors join"
        title="Your storefront and booking desk in one place"
        items={[
          ["Your own storefront", "A public profile with your books, visit packages, reviews, topics and intro video."],
          ["Get discovered", "Schools filter by topic, grade, format, language, location and budget — tag yourself so they find you."],
          ["Bid on requests", "Schools and businesses post what they need. Send proposals and win bookings."],
          ["Control your calendar", "Open the dates you're available; buyers can only request those days."],
          ["Paid on time", `Payment is collected up front and released to you after the event — at most ${HOLD_DAYS} days later.`],
          ["Paperwork handled", "Messaging, quotes with travel, optional contracts and reminders all in one place."],
        ]}
      />
      <Steps
        title="Get started in minutes"
        steps={[
          ["Create your account", "Tell us about yourself and what you write."],
          ["Connect Stripe", "So you can be paid automatically."],
          ["List books & visits", "Our team reviews each listing to keep the marketplace trusted."],
          ["Get booked", "Answer requests, bid on opportunities, and grow your audience."],
        ]}
      />
      <Faq
        items={[
          ["What does it cost?", `Joining and listing are free. We take ${s.bookCommissionPct}% of book sales and ${s.visitCommissionPct}% of bookings; you keep the rest.`],
          ["When do I get paid?", `After the buyer confirms delivery or the event — or automatically ${HOLD_DAYS} days later. Stripe then pays out to your bank.`],
          ["What if a school cancels last minute?", `If they cancel less than ${s.cancelNoticeDays} days before the event, you're still paid.`],
          ["Can I refer other authors?", `Yes — earn ${s.referralPct}% of every sale they make for ${s.referralMonths} months.`],
        ]}
      />
      <CtaBand title="Ready to reach new readers?" text="Join free — your listings go live once reviewed." ctas={[["Join as an author", "/signup?role=AUTHOR"], ["Referral program", "/referral"]]} />
    </>
  );
}
