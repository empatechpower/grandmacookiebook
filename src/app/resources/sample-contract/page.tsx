import { PrintButton } from "@/components/PrintButton";

export const metadata = { title: "Sample author visit agreement — Atelier" };

const blank = <span style={{ borderBottom: "1px solid var(--ink)", display: "inline-block", minWidth: 180 }}>&nbsp;</span>;

/** A plain, printable starting point. Either party can adapt it and attach the signed PDF to a booking. */
export default function SampleContract() {
  return (
    <section className="pad">
      <div className="wrap legal" style={{ maxWidth: 780 }}>
        <div className="split no-print" style={{ marginBottom: 16 }}>
          <div className="eyebrow" style={{ margin: 0 }}>Resources</div>
          <PrintButton />
        </div>
        <h1 className="serif" style={{ fontSize: "2.2rem", letterSpacing: "-.03em" }}>Author Visit Agreement</h1>
        <p className="muted no-print" style={{ margin: "6px 0 20px" }}>
          Optional sample. Contracts aren’t required on Atelier — use this as a starting point, edit it to suit, save as PDF and attach it to your booking.
          It isn’t legal advice.
        </p>
        <p>This agreement is between {blank} (“Author”) and {blank} (“Host”) for the booking {blank} made on Atelier.</p>
        <h2>1. Event</h2>
        <p>Date: {blank} Start time: {blank} Duration: {blank}<br />Venue / platform: {blank}<br />Audience (ages, number): {blank}<br />Format and content: {blank}</p>
        <h2>2. Fee and payment</h2>
        <p>The fee is the amount confirmed on Atelier ({blank}), including any agreed travel and accommodation. The Host pays through Atelier, which holds payment until after the event as described in the Atelier Terms of Use. No separate payment is due.</p>
        <h2>3. Host responsibilities</h2>
        <p>Provide the venue or meeting link, a contact person on the day, and any agreed equipment (projector, microphone, table for signing): {blank}. Share any safeguarding or visitor requirements in advance.</p>
        <h2>4. Author responsibilities</h2>
        <p>Arrive (or join online) {blank} minutes before the start, deliver the agreed session, and follow the Host’s visitor and safeguarding policies.</p>
        <h2>5. Book sales and signing</h2>
        <p>Books {blank} may / {blank} may not be sold or signed at the event. Pre-orders are placed through Atelier.</p>
        <h2>6. Recording and photos</h2>
        <p>The session {blank} may / {blank} may not be recorded or photographed. Any recording is for the Host’s internal use only unless agreed in writing.</p>
        <h2>7. Cancellation and rescheduling</h2>
        <p>Either party should give as much notice as possible through Atelier. Cancellations and refunds are handled under the Atelier Terms of Use. Rescheduling to a mutually agreed date: {blank}.</p>
        <h2>8. Signatures</h2>
        <p>Author: {blank} Date: {blank}<br /><br />Host representative: {blank} Title: {blank} Date: {blank}</p>
      </div>
    </section>
  );
}
