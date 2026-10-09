import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { invoiceNo, loadInvoice } from "@/lib/invoices";
import { BRAND } from "@/lib/brand";
import { LEGAL } from "@/lib/legal";
import { money } from "@/lib/money";
import { fmtDate, fmtWhen } from "@/lib/dates";
import { orgTypeLabel } from "@/lib/constants";
import { PrintButton } from "@/components/PrintButton";

export const metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const inv = await loadInvoice((await params).id, user);
  if (!inv) notFound();
  const buyer = inv.order?.buyer ?? inv.booking!.buyer;

  type Line = { desc: string; sub?: string; qty: number; unit: number; list?: number | null; refunded: boolean };
  const lines: Line[] = inv.order
    ? inv.order.items.map((i) => ({
        desc: i.title,
        sub: `Sold and shipped by ${i.author.name}`,
        qty: i.qty,
        unit: i.unitPrice,
        list: i.listPrice,
        refunded: i.status === "REFUNDED",
      }))
    : [
        {
          desc: `${inv.booking!.package.title} — ${inv.booking!.author.name}`,
          sub: `${fmtWhen(inv.booking!)} · ${inv.booking!.organisation} · ${inv.booking!.venue} · booking B-${inv.booking!.number}`,
          qty: 1,
          unit: inv.booking!.fee,
          refunded: inv.booking!.status === "CANCELLED",
        },
      ];
  const subtotal = lines.reduce((s, l) => s + (l.list ?? l.unit) * l.qty, 0);
  const discount = lines.reduce((s, l) => s + ((l.list ?? l.unit) - l.unit) * l.qty, 0);
  const total = lines.reduce((s, l) => s + l.unit * l.qty, 0);
  const refunded = lines.filter((l) => l.refunded).reduce((s, l) => s + l.unit * l.qty, 0);
  const ref = inv.order ? `Order O-${inv.order.number}` : `Booking B-${inv.booking!.number}`;
  const paymentRef = inv.order?.paymentRef ?? inv.booking?.paymentRef;
  const po = inv.order?.purchaseOrder ?? inv.booking?.purchaseOrder ?? null;
  const overdue = inv.status === "DUE" && inv.dueAt && inv.dueAt < new Date();
  const stamp = refunded >= total ? "REFUNDED" : overdue ? "OVERDUE" : inv.status;

  return (
    <section className="pad">
      <div className="wrap" style={{ maxWidth: 860 }}>
        <div className="row no-print" style={{ justifyContent: "flex-end", marginBottom: 12 }}>
          <PrintButton />
        </div>
        <article className="invoice">
          <header className="invoice-head">
            <div className="row" style={{ gap: 14, alignItems: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={BRAND.logo} alt="" width={72} height={72} className="invoice-logo" />
              <div>
                <b className="serif" style={{ fontSize: "1.25rem" }}>{BRAND.name}</b>
                {BRAND.address.map((l) => <div key={l} className="muted">{l}</div>)}
                <div className="muted">{LEGAL.email}</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="invoice-title">INVOICE</div>
              <b>{invoiceNo(inv.number)}</b>
              <div className="muted">Issued {fmtDate(inv.issuedAt)}</div>
              <div className="muted">{ref}</div>
              {po && <div className="muted">PO {po.poNumber}</div>}
              {inv.dueAt && inv.status === "DUE" && <div><b>Due {fmtDate(inv.dueAt)}</b> <span className="muted">(Net {po?.termsDays ?? 30})</span></div>}
            </div>
          </header>

          <div className="invoice-meta">
            <div>
              <div className="meta">Bill to</div>
              <b>{buyer.orgName || buyer.name}</b>
              {po && (
                <>
                  <div>Attn: {po.billingName}</div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{po.billingAddress}</div>
                  <div>{po.billingEmail}{po.billingPhone ? ` · ${po.billingPhone}` : ""}</div>
                </>
              )}
              {!po && <>
              {buyer.orgName && <div>{buyer.name}{orgTypeLabel(buyer.orgType) ? ` · ${orgTypeLabel(buyer.orgType)}` : ""}</div>}
              <div>{buyer.email}</div>
              {(inv.order?.phone || buyer.phone) && <div>{inv.order?.phone || buyer.phone}</div>}
              </>}
            </div>
            {inv.order && (
              <div>
                <div className="meta">Ship to</div>
                <div style={{ whiteSpace: "pre-wrap" }}>{inv.order.shippingAddress}</div>
              </div>
            )}
            <div>
              <div className="meta">Status</div>
              <span className={`invoice-stamp ${refunded >= total || inv.status === "VOID" || overdue ? "void" : inv.status === "DUE" ? "due" : ""}`}>{stamp}</span>
              {paymentRef && <div className="muted" style={{ fontSize: ".8rem", marginTop: 6 }}>Paid by card (Stripe)</div>}
              {po && <div className="muted" style={{ fontSize: ".8rem", marginTop: 6 }}>Purchase order {po.poNumber}{inv.paidAt && inv.status === "PAID" ? ` · paid ${fmtDate(inv.paidAt)}` : ""}</div>}
            </div>
          </div>

          <table className="invoice-lines">
            <thead>
              <tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td>
                    <b>{l.desc}</b>
                    {l.sub && <div className="muted" style={{ fontSize: ".82rem" }}>{l.sub}</div>}
                    {l.list && l.list > l.unit && <div style={{ fontSize: ".8rem", color: "var(--ok)" }}>Bulk discount {Math.round((1 - l.unit / l.list) * 100)}% off {money(l.list)}</div>}
                    {l.refunded && <div className="badge b-off">Refunded</div>}
                  </td>
                  <td>{l.qty}</td>
                  <td>{money(l.unit)}</td>
                  <td>{money(l.unit * l.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="invoice-totals">
            {discount > 0 && (<><span>Subtotal</span><span>{money(subtotal)}</span><span>Bulk discounts</span><span>−{money(discount)}</span></>)}
            <span><b>Total</b></span><span><b>{money(total)}</b></span>
            <span>Paid</span><span>{money(inv.status === "PAID" ? total : 0)}</span>
            {refunded > 0 && (<><span>Refunded</span><span>−{money(refunded)}</span></>)}
            <span><b>Balance due</b></span><span><b>{money(inv.status === "PAID" ? 0 : total)}</b></span>
          </div>

          {inv.status === "DUE" && (
            <div className="invoice-remit">
              <div className="meta">Pay by check</div>
              <div>Make checks payable to <b>{BRAND.checksPayableTo}</b> and mail to:</div>
              {BRAND.address.map((l) => <div key={l}>{l}</div>)}
              <div className="muted">Please write {invoiceNo(inv.number)}{po ? ` and PO ${po.poNumber}` : ""} on the check. Questions: {LEGAL.email}.</div>
            </div>
          )}

          <footer className="invoice-foot muted">
            Thank you for supporting South Texas authors. Questions about this invoice? Contact {LEGAL.email} and quote {invoiceNo(inv.number)}.
          </footer>
        </article>
      </div>
    </section>
  );
}
