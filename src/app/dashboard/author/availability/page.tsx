import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { dayKey, fromDayKey, monthKey, todayKey } from "@/lib/dates";
import { fillMonth, toggleDay } from "@/app/actions/availability";
import { PageHead } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function Availability({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await requireUser("AUTHOR");
  const { month: m } = await searchParams;
  const thisMonth = monthKey(new Date());
  const month = m && /^\d{4}-\d{2}$/.test(m) && m >= thisMonth ? m : thisMonth;
  const start = fromDayKey(`${month}-01`);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  const prev = monthKey(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 1, 1)));
  const next = monthKey(end);

  const [open, bookings] = await Promise.all([
    db.availableDate.findMany({ where: { authorId: user.id, date: { gte: start, lt: end } } }),
    db.booking.findMany({
      where: { authorId: user.id, eventDate: { gte: start, lt: end }, status: { in: ["PENDING", "ACCEPTED", "CONFIRMED"] } },
      select: { eventDate: true, status: true },
    }),
  ]);
  const openSet = new Set(open.map((o) => dayKey(o.date)));
  const bookedSet = new Set(bookings.filter((b) => b.status !== "PENDING").map((b) => dayKey(b.eventDate)));
  const requestedSet = new Set(bookings.filter((b) => b.status === "PENDING").map((b) => dayKey(b.eventDate)));
  const today = todayKey();

  const days: Date[] = [];
  for (let d = new Date(start); d < end; d = new Date(d.getTime() + 86400000)) days.push(d);
  const lead = (start.getUTCDay() + 6) % 7; // Monday-first grid
  const title = start.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <>
      <PageHead title="Availability" sub="Click a day to open or close it. Buyers can only request your open days." />
      <div className="panel" style={{ maxWidth: 640 }}>
        <div className="split" style={{ marginBottom: 14 }}>
          {month > thisMonth ? <Link className="btn btn-ghost btn-sm" href={`?month=${prev}`}>← Prev</Link> : <span />}
          <h3>{title}</h3>
          <Link className="btn btn-ghost btn-sm" href={`?month=${next}`}>Next →</Link>
        </div>
        <form action={toggleDay} className="cal">
          {DOW.map((d) => <div key={d} className="dow">{d}</div>)}
          {Array.from({ length: lead }, (_, i) => <div key={`e${i}`} className="cell empty" />)}
          {days.map((d) => {
            const k = dayKey(d);
            const past = k < today;
            const booked = bookedSet.has(k);
            const cls = past ? "past" : booked ? "booked" : openSet.has(k) ? "open" : "";
            return (
              <button key={k} name="day" value={k} className={cls} disabled={past || booked} aria-pressed={openSet.has(k)}
                title={booked ? "Booked" : openSet.has(k) ? "Open — click to close" : "Closed — click to open"}>
                {d.getUTCDate()}
                {booked ? <small>Booked</small> : requestedSet.has(k) ? <small>Request</small> : openSet.has(k) ? <small>Open</small> : null}
              </button>
            );
          })}
        </form>
        <div className="row" style={{ marginTop: 16 }}>
          <form action={fillMonth}>
            <input type="hidden" name="month" value={month} />
            <SubmitButton name="mode" value="weekdays" className="btn btn-sage btn-sm">Open all weekdays</SubmitButton>
          </form>
          <form action={fillMonth}>
            <input type="hidden" name="month" value={month} />
            <SubmitButton name="mode" value="clear" className="btn btn-line btn-sm" confirm="Close every day this month?">Clear month</SubmitButton>
          </form>
        </div>
        <p className="muted" style={{ fontSize: ".8rem", marginTop: 12 }}>
          If you don’t open any dates, buyers can propose any date and you confirm when accepting.
        </p>
      </div>
    </>
  );
}
