"use client";
import { useState } from "react";
import { PHONE_PATTERN } from "@/lib/validation";
import { SubmitButton } from "./SubmitButton";

type Billing = { name: string; email: string; phone: string; address: string };

/** The purchase order fields: PO number, accounts-payable contact, billing address and the signed PO. */
export function PoFields({ billing, termsDays }: { billing: Billing; termsDays: number }) {
  return (
    <div className="po-fields">
      <div className="field">
        <label htmlFor="poNumber">PO number</label>
        <input id="poNumber" name="poNumber" required maxLength={40} placeholder="e.g. 4500012345" />
      </div>
      <div className="field">
        <label htmlFor="billingName">Billing contact (accounts payable)</label>
        <input id="billingName" name="billingName" required defaultValue={billing.name} autoComplete="name" maxLength={120} />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="billingEmail">Billing email</label>
          <input id="billingEmail" name="billingEmail" type="email" required defaultValue={billing.email} maxLength={160} />
        </div>
        <div className="field">
          <label htmlFor="billingPhone">Billing phone</label>
          <input id="billingPhone" name="billingPhone" type="tel" defaultValue={billing.phone} pattern={PHONE_PATTERN} title="10-digit US phone number, e.g. (956) 555-0142" maxLength={30} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="billingAddress">Billing address</label>
        <textarea id="billingAddress" name="billingAddress" required defaultValue={billing.address} placeholder="District / organization, street, city, state, ZIP" minLength={8} maxLength={400} />
      </div>
      <div className="field">
        <label htmlFor="poFile">Signed purchase order (PDF, optional)</label>
        <input id="poFile" name="poFile" type="file" accept="application/pdf" />
      </div>
      <p className="hint">
        We review POs within one business day. Once approved, your order is confirmed and we email an invoice due in {termsDays} days (Net {termsDays}).
      </p>
    </div>
  );
}

/** Card or purchase order choice for checkout. Organizations see both; individuals pay by card. */
export function PayMethod({ total, allowPo, billing, termsDays }: { total: string; allowPo: boolean; billing: Billing; termsDays: number }) {
  const [method, setMethod] = useState<"card" | "po">("card");
  return (
    <>
      {allowPo && (
        <fieldset className="field pay-method">
          <legend>How would you like to pay?</legend>
          <label className={`pay-opt ${method === "card" ? "on" : ""}`}>
            <input type="radio" name="payment" value="card" checked={method === "card"} onChange={() => setMethod("card")} />
            <span><b>Card</b> <small>Pay now with Stripe</small></span>
          </label>
          <label className={`pay-opt ${method === "po" ? "on" : ""}`}>
            <input type="radio" name="payment" value="po" checked={method === "po"} onChange={() => setMethod("po")} />
            <span><b>Purchase order</b> <small>For schools & organizations · Net {termsDays}</small></span>
          </label>
        </fieldset>
      )}
      {method === "po" && <PoFields billing={billing} termsDays={termsDays} />}
      <SubmitButton className="btn btn-terra" pendingText={method === "po" ? "Sending…" : "Paying…"} style={{ width: "100%" }}>
        {method === "po" ? "Submit purchase order" : `Pay ${total}`}
      </SubmitButton>
    </>
  );
}
