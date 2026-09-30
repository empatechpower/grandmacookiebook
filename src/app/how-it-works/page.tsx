export const metadata = { title: "How it works" };

const roles = [
  {
    role: "Buyer",
    title: "Read and host",
    body: "Create a free account. Find authors by topic, grade, budget and date. Message them, request a visit, pay once they accept — your payment is held until the visit happens, so you're covered if anything goes wrong.",
  },
  {
    role: "Author",
    title: "Sell and appear",
    body: "Connect Stripe once. List books and visit packages, set your prices, and quote travel when you accept. Your share is paid out automatically after the buyer confirms delivery, or 14 days later.",
  },
  {
    role: "Super admin",
    title: "Trust layer",
    body: "Approve new authors and listings. Suspend abuse. View every order and booking, refund when needed. Set commission. Nothing goes public without this desk.",
  },
];

export default function How() {
  return (
    <section className="pad">
      <div className="wrap">
        <div className="eyebrow">Roles</div>
        <h2 style={{ marginBottom: 24 }}>How Grandma Cookie Book is structured</h2>
        <div className="grid-3">
          {roles.map((r) => (
            <article className="card" key={r.role}>
              <div className="body">
                <div className="meta">{r.role}</div>
                <h3>{r.title}</h3>
                <p>{r.body}</p>
              </div>
            </article>
          ))}
        </div>

        <h2 className="h2-sm" style={{ marginTop: 48 }}>A booking, step by step</h2>
        <div className="grid-4">
          {[
            ["1 · Request", "Buyer picks a package and sends date, venue and audience."],
            ["2 · Accept", "Author accepts or declines, with an optional note."],
            ["3 · Pay", "Buyer pays to confirm. Grandma Cookie Book holds the payment until after the visit."],
            ["4 · Deliver", "The buyer confirms the visit happened and the author is paid — or it releases automatically 14 days after the event."],
          ].map(([t, d]) => (
            <div className="rp" key={t}>
              <strong>{t}</strong>
              <span>{d}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
