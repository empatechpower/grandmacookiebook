import Link from "next/link";
import { LEGAL } from "@/lib/legal";
import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Privacy Policy" };

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      sections={[
        ["Who we are", <p>{LEGAL.company} ({LEGAL.address}) operates South Texas Book & Author and is responsible for your personal data. Contact: <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.</p>],
        ["What we collect", <ul><li><b>Account details:</b> name, email, password (stored only as a secure hash), role.</li><li><b>Profile details</b> authors choose to publish: bio, photo, location, topics, languages and community tags.</li><li><b>Transactions:</b> orders, bookings, shipping addresses, event details and payment references. Card details are handled by Stripe and never reach our servers.</li><li><b>Messages</b> between buyers and authors, and messages sent through our contact form.</li><li><b>Technical data:</b> a session cookie to keep you signed in, and standard server logs.</li></ul>],
        ["How we use it", <p>To run the marketplace: create accounts, show listings, process payments and payouts, deliver messages, send transactional emails (such as booking requests, confirmations and receipts), prevent fraud, and provide support. We don’t sell your personal data, and we don’t send marketing email without your consent.</p>],
        ["Who we share it with", <><p>Only as needed to provide the service:</p><ul><li>the buyer or author on the other side of an order, booking or conversation;</li><li><b>Stripe</b> (payments and author payouts);</li><li>our email provider (<b>Resend</b>) and hosting and database providers;</li><li>authorities where required by law.</li></ul></>],
        ["Community tags", <p>Tags such as #BlackOwned or #WomenOwned are entirely optional and chosen by authors to appear publicly on their profile and in search. Authors can remove them at any time from their profile.</p>],
        ["Cookies", <p>We use one essential cookie to keep you signed in and a short-lived cookie to show confirmation messages. We don’t use advertising or tracking cookies.</p>],
        ["How long we keep it", <p>Account data is kept while your account is open. Transaction records are kept as long as required for tax and accounting. Messages are kept while either participant’s account is open.</p>],
        ["Your rights", <p>You can view and update your profile at any time. You can ask us for a copy of your data, to correct it, or to delete your account by contacting <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. We’ll respond within 45 days.</p>],
        ["California residents", <p>Under the California Consumer Privacy Act (as amended by the CPRA), California residents may request to know what personal information we collect, use and disclose; request deletion or correction; and opt out of the sale or sharing of personal information. We do not sell or share personal information for cross-context behavioral advertising. We won’t discriminate against you for exercising these rights. To make a request, email <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. Residents of other US states with consumer privacy laws may make the same requests.</p>],
        ["Children", <p>South Texas Book & Author accounts are for adults and organizations. Schools book visits on behalf of students, and we don’t knowingly collect personal information from children under 13, consistent with the Children’s Online Privacy Protection Act (COPPA). If you believe a child has given us personal information, contact us and we’ll delete it.</p>],
        ["Changes", <p>We’ll post updates here and change the date above. Questions? Use our <Link href="/contact">contact form</Link>.</p>],
      ]}
    />
  );
}
