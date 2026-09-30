import Link from "next/link";
import { LEGAL } from "@/lib/legal";
import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Privacy Policy" };

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      sections={[
        ["Who we are", <p>{LEGAL.company} ({LEGAL.address}) operates Grandma Cookie Book and is responsible for your personal data. Contact: <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.</p>],
        ["What we collect", <ul><li><b>Account details:</b> name, email, password (stored only as a secure hash), role.</li><li><b>Profile details</b> authors choose to publish: bio, photo, location, topics, languages and community tags.</li><li><b>Transactions:</b> orders, bookings, shipping addresses, event details and payment references. Card details are handled by Stripe and never reach our servers.</li><li><b>Messages</b> between buyers and authors, and messages sent through our contact form.</li><li><b>Technical data:</b> a session cookie to keep you signed in, and standard server logs.</li></ul>],
        ["How we use it", <p>To run the marketplace: create accounts, show listings, process payments and payouts, deliver messages, send transactional emails (such as booking requests, confirmations and receipts), prevent fraud, and provide support. We don’t sell your personal data, and we don’t send marketing email without your consent.</p>],
        ["Who we share it with", <><p>Only as needed to provide the service:</p><ul><li>the buyer or author on the other side of an order, booking or conversation;</li><li><b>Stripe</b> (payments and author payouts);</li><li>our email provider (<b>Resend</b>) and hosting and database providers;</li><li>authorities where required by law.</li></ul></>],
        ["Community tags", <p>Tags such as #BlackOwned or #WomenOwned are entirely optional and chosen by authors to appear publicly on their profile and in search. Authors can remove them at any time from their profile.</p>],
        ["Cookies", <p>We use one essential cookie to keep you signed in and a short-lived cookie to show confirmation messages. We don’t use advertising or tracking cookies.</p>],
        ["How long we keep it", <p>Account data is kept while your account is open. Transaction records are kept as long as required for tax and accounting. Messages are kept while either participant’s account is open.</p>],
        ["Your rights", <p>You can view and update your profile at any time. You can ask us for a copy of your data, to correct it, or to delete your account by contacting <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. Depending on where you live (for example under the NDPA in Nigeria, GDPR in the EU/UK, or CCPA in California) you may have additional rights, including to complain to your data protection authority.</p>],
        ["Children", <p>Grandma Cookie Book accounts are for adults and organisations. Schools book visits on behalf of students; we don’t knowingly collect personal data from children.</p>],
        ["Changes", <p>We’ll post updates here and change the date above. Questions? Use our <Link href="/contact">contact form</Link>.</p>],
      ]}
    />
  );
}
