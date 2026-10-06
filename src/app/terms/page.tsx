import Link from "next/link";
import { LEGAL } from "@/lib/legal";
import { getSettings } from "@/lib/settings";
import { HOLD_DAYS } from "@/lib/fulfillment";
import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Terms of Use" };

export default async function Terms() {
  const { bookCommissionPct, visitCommissionPct, cancelNoticeDays } = await getSettings();
  return (
    <LegalPage
      title="Terms of Use"
      sections={[
        ["About these terms", <p>These terms govern your use of South Texas Book & Author, a marketplace operated by {LEGAL.company} ({LEGAL.address}) that connects buyers — schools, businesses, organizations and readers — with authors who sell books and offer visits, readings and speeches. By creating an account or using the site you agree to these terms.</p>],
        ["Accounts", <><p>You must give accurate information and keep your password secure. You’re responsible for activity on your account. Buyer accounts are for purchasing and booking; author accounts are for selling books and offering appearances. Author accounts and every listing are reviewed before they appear publicly, and we may decline or remove any account or listing.</p></>],
        ["South Texas Book & Author’s role", <p>South Texas Book & Author provides the marketplace, messaging and payment processing. Books and appearances are supplied by independent authors, not by South Texas Book & Author. The contract for each book or appearance is between the buyer and the author; South Texas Book & Author is not a party to it except as payment collection agent for the author.</p>],
        ["Payments and fees", <><p>Payments are processed by Stripe. Buyers pay the listed price or the author’s accepted quote. South Texas Book & Author deducts a commission from the author’s proceeds — currently {bookCommissionPct}% on book sales and {visitCommissionPct}% on bookings — as shown on the <Link href="/pricing">Pricing</Link> page. Changes to commission apply only to new sales.</p><p>Payment is held by South Texas Book & Author and released to the author when the buyer confirms receipt of a book or that a visit took place, or automatically {HOLD_DAYS} days after payment (for books) or after the event date (for visits).</p></>],
        ["Bookings", <p>A booking request is not confirmed until the author accepts and the buyer pays. Authors may include travel and accommodation in their quote. Buyers may cancel before paying at no charge. A paid booking canceled by the buyer at least {cancelNoticeDays} days before the event is refunded in full; later cancellations are not refunded and the fee is paid to the author (guaranteed payment for last-minute cancellations).</p>],
        ["Refunds", <p>If a book doesn’t arrive or an author doesn’t deliver a paid appearance, contact us before the hold period ends and we’ll refund you in full from the held payment. After funds are released to the author, refunds are at our discretion.</p>],
        ["Author obligations", <p>Authors must have the right to sell the books they list, describe books and appearances accurately, ship orders promptly, attend confirmed bookings, and keep all payments for South Texas Book & Author bookings on the platform. Authors are responsible for their own taxes.</p>],
        ["Acceptable use", <p>Don’t use South Texas Book & Author to harass anyone, post unlawful or infringing content, send spam, attempt to take payments off-platform for bookings made here, or interfere with the service. We may suspend accounts that break these rules.</p>],
        ["Content", <p>You keep ownership of content you post (profiles, listings, messages) and grant South Texas Book & Author a license to display it to operate and promote the marketplace.</p>],
        ["Liability", <p>To the extent permitted by law, South Texas Book & Author is not liable for the conduct of buyers or authors, or for indirect or consequential losses. Our total liability for any claim is limited to the fees we earned from the transaction concerned. Nothing in these terms limits liability that cannot be limited by law.</p>],
        ["Changes and termination", <p>We may update these terms and will post the new version here. You may close your account at any time; we may suspend or close accounts that breach these terms.</p>],
        ["Governing law and contact", <p>These terms are governed by the laws of {LEGAL.jurisdiction}. Questions: <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> or our <Link href="/contact">contact form</Link>.</p>],
      ]}
    />
  );
}
