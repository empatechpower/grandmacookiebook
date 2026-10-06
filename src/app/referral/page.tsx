import Link from "next/link";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Referral program" };

export default async function ReferralProgram() {
  const { referralPct, referralMonths } = await getSettings();
  const terms: [string, string][] = [
    ["Who can earn", "Active South Texas Book & Author authors with at least one live book or visit listing."],
    ["Who you can refer", "Authors, illustrators and publishers who aren't on South Texas Book & Author yet."],
    ["What you earn", `${referralPct}% of every sale your referred author makes on South Texas Book & Author — book orders and paid visits — for ${referralMonths} months from the day you submit the referral.`],
    ["When it counts", "A sale counts once its payment is released to the author. Refunded sales don't earn rewards."],
    ["How you're paid", "Quarterly, straight to your connected Stripe account."],
    ["Who gets credit", `The first referral form submitted for a person wins. Every referral is verified by the South Texas Book & Author team.`],
  ];
  return (
    <section className="pad">
      <div className="wrap" style={{ maxWidth: 820 }}>
        <div className="eyebrow">Referral program</div>
        <h1 className="serif" style={{ fontSize: "clamp(2rem,4vw,3rem)", letterSpacing: "-.03em", lineHeight: 1.05 }}>
          Bring an author. Earn {referralPct}% for {referralMonths} months.
        </h1>
        <p className="lede-sm" style={{ fontSize: "1.05rem", marginTop: 10 }}>
          Know an author or publisher who should be selling books and booking visits on South Texas Book & Author? Refer them and earn cash back on their sales.
        </p>
        <div className="row" style={{ margin: "18px 0 30px" }}>
          <Link className="btn btn-terra" href="/dashboard/author/referrals">Refer an author</Link>
          <Link className="btn btn-line" href="/signup?role=AUTHOR">Not an author yet? Join free</Link>
        </div>
        <div className="grid-2">
          {terms.map(([h, b]) => (
            <div key={h} className="panel">
              <b>{h}</b>
              <p className="muted" style={{ marginTop: 6 }}>{b}</p>
            </div>
          ))}
        </div>
        <p className="muted" style={{ fontSize: ".85rem", marginTop: 24 }}>
          South Texas Book & Author may change or end the program; rewards already earned will still be paid. See our <Link href="/terms" style={{ textDecoration: "underline" }}>Terms of Use</Link>.
        </p>
      </div>
    </section>
  );
}
