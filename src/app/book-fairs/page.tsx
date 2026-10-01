import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { RequestForm } from "@/components/RequestForm";

export const metadata = { title: "Host a book fair", description: "Bring a curated book fair — in person or virtual — to your school, with authors and an optional fundraiser." };

export default async function BookFairs({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const [{ sent }, user] = await Promise.all([searchParams, currentUser()]);
  const steps: [string, string][] = [
    ["Tell us about your school", "Dates, grades, number of students, and whether you’d like it to double as a fundraiser."],
    ["We curate the fair", "A selection of titles from authors on the platform, matched to your grades and themes — plus optional author visits during the fair."],
    ["Families shop", "In person on the day, or through a virtual fair link you share with parents."],
    ["Your school benefits", "Books go straight to readers, and fundraiser fairs return a share of sales to your school."],
  ];
  return (
    <section className="pad">
      <div className="wrap">
        <div className="detail" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="stack">
            <div className="eyebrow">For schools</div>
            <h1 className="serif" style={{ fontSize: "clamp(2.2rem,4.5vw,3.4rem)", letterSpacing: "-.03em", lineHeight: 1.03 }}>Host a book fair your readers will remember.</h1>
            <p className="lede-sm" style={{ fontSize: "1.08rem" }}>
              A curated fair of books from independent and diverse authors — in person or virtual — with the option to meet the authors and raise funds for your school.
            </p>
            <div className="steps">
              {steps.map(([h, b], i) => (
                <div key={h} className="step">
                  <span className="step-n">{i + 1}</span>
                  <div><b>{h}</b><p className="muted" style={{ fontSize: ".9rem" }}>{b}</p></div>
                </div>
              ))}
            </div>
            <p className="muted" style={{ fontSize: ".9rem" }}>
              Want an author to visit during the fair? <Link href="/authors" style={{ textDecoration: "underline" }}>Browse authors</Link> or{" "}
              <Link href="/dashboard/buyer/requests/new" style={{ textDecoration: "underline" }}>post a request</Link>.
            </p>
          </div>
          <div className="panel">
            <h3 style={{ marginBottom: 12 }}>Request a book fair</h3>
            {sent ? (
              <div className="alert alert-ok">Thanks! Our team will email you within 2 business days to plan your fair.</div>
            ) : (
              <RequestForm
                form="bookfair"
                submit="Request a book fair"
                defaults={{ name: user?.name, email: user?.email }}
                fields={[
                  { name: "org", label: "School / organization", required: true },
                  { name: "dates", label: "Preferred dates", placeholder: "e.g. week of Nov 12", required: true },
                  { name: "format", label: "Format", type: "select", options: ["In person", "Virtual", "Both"] },
                  { name: "grades", label: "Grades", placeholder: "e.g. K–5" },
                  { name: "students", label: "Number of students", type: "number" },
                  { name: "fundraiser", label: "Run it as a fundraiser for your school?", type: "select", options: ["Yes", "No", "Not sure"] },
                  { name: "notes", label: "Anything else?", type: "textarea" },
                ]}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
