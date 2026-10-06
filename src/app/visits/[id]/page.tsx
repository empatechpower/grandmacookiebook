import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { liveWhere } from "@/lib/catalog";
import { formatLabel } from "@/lib/constants";
import { money } from "@/lib/money";
import { requestBooking } from "@/app/actions/shop";
import { Initials, fmtDate } from "@/components/ui";
import { openDates } from "@/lib/availability";
import { addDays, dayKey, fromDayKey, todayKey } from "@/lib/dates";
import { SubmitButton } from "@/components/SubmitButton";

export default async function VisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [v, user] = await Promise.all([
    db.visitPackage.findFirst({ where: { id, ...liveWhere }, include: { author: { select: { id: true, name: true, bio: true } } } }),
    currentUser(),
  ]);
  if (!v) notFound();
  const dates = await openDates(v.authorId);
  const minDate = dayKey(addDays(fromDayKey(todayKey()), 1));

  return (
    <section className="pad">
      <div className="wrap detail">
        <div className="stack">
          <div className="eyebrow">
            {formatLabel(v.format)} · {v.durationMins} min
          </div>
          <h1>{v.title}</h1>
          <Link href={`/authors/${v.author.id}`} className="author-line">
            <Initials name={v.author.name} />
            <div>
              <b>{v.author.name}</b>
              {v.author.bio && <div className="muted" style={{ fontSize: ".85rem" }}>{v.author.bio}</div>}
            </div>
          </Link>
          <p>{v.description}</p>
          {v.region && (
            <p>
              <b>Travels to:</b> {v.region}
            </p>
          )}
          <div className="price-lg">{money(v.fee)}</div>
          <p className="muted" style={{ fontSize: ".9rem" }}>
            How it works: send a request → the author accepts → you pay to confirm → the visit happens.
            You’re not charged until the author accepts. Travel costs can be agreed in messages and
            included in the author’s final quote.
          </p>
        </div>

        <div className="panel">
          <h3 style={{ marginBottom: 14 }}>Request this booking</h3>
          {user && user.role !== "BUYER" ? (
            <div className="alert alert-info">Bookings are made from buyer accounts. You’re signed in as {user.role.toLowerCase()}.</div>
          ) : (
            <form action={requestBooking}>
              <input type="hidden" name="packageId" value={v.id} />
              <div className="field">
                <label htmlFor="organisation">School / organization</label>
                <input id="organisation" name="organisation" required placeholder="St. Cloud Elementary" defaultValue={user?.orgName ?? undefined} />
              </div>
              {dates.length > 0 ? (
                <fieldset className="field">
                  <legend>Pick one of {v.author.name.split(" ")[0]}’s open dates</legend>
                  <div className="date-chips">
                    {dates.slice(0, 40).map((d) => (
                      <label key={d} className="date-chip">
                        <input type="radio" name="eventDate" value={d} required />
                        <span>{fmtDate(fromDayKey(d))}</span>
                      </label>
                    ))}
                  </div>
                  <div className="hint">Need a different date? Message the author first.</div>
                </fieldset>
              ) : (
                <div className="field">
                  <label htmlFor="eventDate">Preferred date</label>
                  <input id="eventDate" name="eventDate" type="date" min={minDate} required />
                  <div className="hint">This author hasn’t published a calendar — propose a date and they’ll confirm.</div>
                </div>
              )}
              <div className="field-row">
              <div className="field">
                <label htmlFor="eventTime">Start time</label>
                <input id="eventTime" name="eventTime" type="time" required defaultValue="10:00" />
              </div>
              <div className="field">
                <label htmlFor="audienceSize">Audience size</label>
                <input id="audienceSize" name="audienceSize" type="number" min={1} required placeholder="120" />
              </div>
              </div>
              <div className="field">
                <label htmlFor="venue">{v.format === "VIRTUAL" ? "Platform / link" : "Venue address"}</label>
                <input id="venue" name="venue" required placeholder={v.format === "VIRTUAL" ? "Zoom" : "125 Maple Ave, Atlanta, GA"} />
              </div>
              <div className="field">
                <label htmlFor="message">Anything the author should know?</label>
                <textarea id="message" name="message" placeholder="Age group, theme, timing…" />
              </div>
              <SubmitButton className="btn btn-terra" pendingText="Sending…">
                {user ? "Send request" : "Log in to request"}
              </SubmitButton>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
