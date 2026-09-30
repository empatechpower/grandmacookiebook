import { currentUser } from "@/lib/auth";
import { RequestForm } from "@/components/RequestForm";

export const metadata = { title: "Disaster Relief Book Bank", description: "Books for schools and libraries rebuilding after disasters, donated by authors and publishers." };

export default async function BookBank({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const [{ sent }, user] = await Promise.all([searchParams, currentUser()]);
  const defaults = { name: user?.name, email: user?.email };
  return (
    <section className="pad">
      <div className="wrap">
        <div className="eyebrow">Community</div>
        <h1 className="serif" style={{ fontSize: "clamp(2.2rem,4.5vw,3.2rem)", letterSpacing: "-.03em", lineHeight: 1.05, maxWidth: "20ch" }}>Disaster Relief Book Bank</h1>
        <p className="lede-sm" style={{ maxWidth: "64ch", fontSize: "1.05rem", marginTop: 10 }}>
          When floods, fires or storms destroy a school library, getting books back into children’s hands helps recovery. Authors and publishers donate books;
          we match them with schools and libraries that need them, free of charge.
        </p>
        {sent && <div className="alert alert-ok" style={{ maxWidth: 640 }}>Thank you — we’ve received your form and will be in touch by email.</div>}
        <div className="grid-2" style={{ marginTop: 20 }}>
          <div className="panel">
            <h3>Request books</h3>
            <p className="muted" style={{ fontSize: ".9rem", margin: "4px 0 14px" }}>For schools, libraries and community groups affected by a disaster.</p>
            <RequestForm
              form="bookbankRequest"
              submit="Request books"
              defaults={defaults}
              fields={[
                { name: "org", label: "School / library / organisation", required: true },
                { name: "location", label: "Location", required: true },
                { name: "disaster", label: "What happened?", type: "textarea", required: true },
                { name: "need", label: "What do you need? (ages, approx. quantities)", type: "textarea", required: true },
                { name: "address", label: "Delivery address" },
              ]}
            />
          </div>
          <div className="panel">
            <h3>Donate books</h3>
            <p className="muted" style={{ fontSize: ".9rem", margin: "4px 0 14px" }}>Authors and publishers: offer new books to schools rebuilding their shelves.</p>
            <RequestForm
              form="bookbankDonate"
              submit="Offer books"
              defaults={defaults}
              fields={[
                { name: "org", label: "Author / publisher / organisation", required: true },
                { name: "books", label: "Books you can donate (titles, quantities, ages)", type: "textarea", required: true },
                { name: "location", label: "Shipping from" },
              ]}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
