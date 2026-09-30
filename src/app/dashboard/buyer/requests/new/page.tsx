import { requireUser } from "@/lib/auth";
import { GRADES, TOPICS } from "@/lib/constants";
import { addDays, dayKey, fromDayKey, todayKey } from "@/lib/dates";
import { RFP_FORMATS } from "@/lib/rfps";
import { createRfp } from "@/app/actions/rfps";
import { PageHead } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export default async function NewRequest() {
  await requireUser("BUYER");
  const tomorrow = dayKey(addDays(fromDayKey(todayKey()), 1));
  return (
    <>
      <PageHead title="Post a request" sub="Matching authors are emailed and can send you a proposal with their fee. You’re not committed until you accept a bid." />
      <form action={createRfp} className="panel" style={{ maxWidth: 760 }}>
        <div className="field">
          <label htmlFor="title">What are you looking for?</label>
          <input id="title" name="title" required maxLength={120} placeholder="Author assembly for Literacy Week" />
        </div>
        <div className="field">
          <label htmlFor="description">Details</label>
          <textarea id="description" name="description" required minLength={20} placeholder="Goals, theme, schedule, anything authors should know…" />
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="audience">Audience</label>
            <input id="audience" name="audience" required placeholder="Grades 3–5 assembly" />
          </div>
          <div className="field">
            <label htmlFor="audienceSize">Approx. number of people</label>
            <input id="audienceSize" name="audienceSize" type="number" min={1} required placeholder="200" />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="eventDate">Event date</label>
            <input id="eventDate" name="eventDate" type="date" min={tomorrow} required />
          </div>
          <div className="field">
            <label htmlFor="deadline">Bids close on</label>
            <input id="deadline" name="deadline" type="date" min={todayKey()} required />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="format">Format</label>
            <select id="format" name="format" defaultValue="ANY">
              {RFP_FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="location">Location (for in-person)</label>
            <input id="location" name="location" placeholder="City, venue" />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="topic">Topic (optional)</label>
            <select id="topic" name="topic" defaultValue="">
              <option value="">Any</option>
              {TOPICS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="grade">Grade level / audience type (optional)</label>
            <select id="grade" name="grade" defaultValue="">
              <option value="">Any</option>
              {GRADES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
        </div>
        <div className="field" style={{ maxWidth: 280 }}>
          <label htmlFor="budgetMax">Budget up to (USD, optional)</label>
          <input id="budgetMax" name="budgetMax" type="number" min={1} step="1" placeholder="800" />
        </div>
        <SubmitButton className="btn btn-terra" pendingText="Posting…">Post request</SubmitButton>
      </form>
    </>
  );
}
