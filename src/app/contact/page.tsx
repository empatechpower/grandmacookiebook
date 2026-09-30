import { currentUser } from "@/lib/auth";
import { LEGAL } from "@/lib/legal";
import { submitContact } from "@/app/actions/contact";
import { CONTACT_TOPICS } from "@/lib/constants";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata = { title: "Contact us" };

export default async function Contact({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const [{ sent }, user] = await Promise.all([searchParams, currentUser()]);
  return (
    <section className="pad">
      <div className="wrap detail" style={{ gridTemplateColumns: ".8fr 1.2fr" }}>
        <div className="stack">
          <div className="eyebrow">Contact</div>
          <h1>We’re here to help.</h1>
          <p className="muted">Questions about a booking, an order, becoming an author, or partnering with us — send a message and we’ll reply by email within 2 business days.</p>
          <p>
            Email: <a href={`mailto:${LEGAL.email}`} style={{ color: "var(--terracotta)" }}>{LEGAL.email}</a>
          </p>
          <p className="muted" style={{ fontSize: ".9rem" }}>Already booked an author? The fastest way to reach them is Messages in your dashboard.</p>
        </div>
        <div className="panel">
          {sent ? (
            <div className="alert alert-ok">Message sent — thank you. We’ll reply to your email soon.</div>
          ) : null}
          <form action={submitContact}>
            <div className="field-row">
              <div className="field">
                <label htmlFor="name">Name</label>
                <input id="name" name="name" required defaultValue={user?.name} autoComplete="name" />
              </div>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" required defaultValue={user?.email} autoComplete="email" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="topic">Topic</label>
              <select id="topic" name="topic">
                {CONTACT_TOPICS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="body">Message</label>
              <textarea id="body" name="body" required minLength={10} maxLength={5000} placeholder="Include order or booking numbers if you have them (e.g. O-2201, B-1041)." />
            </div>
            <div aria-hidden="true" style={{ position: "absolute", left: "-9999px" }}>
              <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
            </div>
            <SubmitButton className="btn btn-terra" pendingText="Sending…">Send message</SubmitButton>
          </form>
        </div>
      </div>
    </section>
  );
}
