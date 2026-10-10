import Link from "next/link";
import { VerifyBanner } from "@/components/VerifyBanner";
import { PHONE_PATTERN } from "@/lib/validation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { money } from "@/lib/money";
import { bulkDiscountPct, tiersFrom, unitPriceFor } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";
import { checkout, updateCartItem } from "@/app/actions/shop";
import { SubmitButton } from "@/components/SubmitButton";
import { PayMethod } from "@/components/PoForm";
import { canUsePo } from "@/lib/purchaseOrders";
import { Table } from "@/components/ui";

export const metadata = { title: "Cart" };

export default async function Cart() {
  const user = await requireUser("BUYER");
  const settings = await getSettings();
  const tiers = tiersFrom(settings);
  const items = await db.cartItem.findMany({
    where: { userId: user.id },
    include: { book: { include: { author: { select: { name: true } } } } },
  });
  const total = items.reduce((s, i) => s + unitPriceFor(i.book, i.qty, tiers) * i.qty, 0);

  return (
    <section className="pad">
      <div className="wrap">
        <VerifyBanner user={user} />
        <div className="sec-head">
          <div>
            <div className="eyebrow">Checkout</div>
            <h2>Your cart</h2>
          </div>
          <Link className="btn btn-ghost" href="/books">Keep shopping →</Link>
        </div>
        {items.length === 0 ? (
          <div className="empty">
            Your cart is empty. <Link href="/books" style={{ color: "var(--terracotta)" }}>Browse books</Link>
          </div>
        ) : (
          <div className="detail" style={{ gridTemplateColumns: "1.3fr .7fr" }}>
            <Table heads={["Book", "Price", "Qty", "Subtotal"]}>
              {items.map((i) => (
                <tr key={i.id}>
                  <td>
                    <Link href={`/books/${i.bookId}`}><b>{i.book.title}</b></Link>
                    <div className="muted" style={{ fontSize: ".8rem" }}>{i.book.author.name}</div>
                    {i.book.status !== "APPROVED" && <div className="badge b-off">No longer available</div>}
                  </td>
                  <td>
                    {bulkDiscountPct(i.book, i.qty, tiers) > 0 && <div className="muted" style={{ textDecoration: "line-through", fontSize: ".8rem" }}>{money(i.book.price)}</div>}
                    {money(unitPriceFor(i.book, i.qty, tiers))}
                    {bulkDiscountPct(i.book, i.qty, tiers) > 0 && <div><span className="badge b-ok">Bulk {bulkDiscountPct(i.book, i.qty, tiers)}% off</span></div>}
                    {i.book.bulkEnabled && i.qty < tiers.min2 && (
                      <div className="muted" style={{ fontSize: ".75rem" }}>
                        {i.qty < tiers.min1 ? `Order ${tiers.min1 - i.qty} more for ${tiers.pct1}% off` : `Order ${tiers.min2 - i.qty} more for ${tiers.pct2}% off`}
                      </div>
                    )}
                  </td>
                  <td>
                    <form action={updateCartItem} className="inline-form">
                      <input type="hidden" name="id" value={i.id} />
                      <input className="qty" type="number" name="qty" min={0} max={i.book.stock} defaultValue={i.qty} aria-label="Quantity" />
                      <SubmitButton className="btn btn-ghost btn-sm" pendingText="…">Update</SubmitButton>
                    </form>
                  </td>
                  <td>{money(unitPriceFor(i.book, i.qty, tiers) * i.qty)}</td>
                </tr>
              ))}
            </Table>
            <form action={checkout} className="panel">
              <div className="split" style={{ marginBottom: 16 }}>
                <span className="muted">Total</span>
                <span className="price-lg">{money(total)}</span>
              </div>
              <div className="field">
                <label htmlFor="phone">Phone (for delivery questions, optional)</label>
                <input id="phone" name="phone" type="tel" defaultValue={user.phone ?? ""} autoComplete="tel" pattern={PHONE_PATTERN} title="10-digit US phone number, e.g. (956) 555-0142" maxLength={30} />
              </div>
              <div className="field">
                <label htmlFor="address">Shipping address</label>
                <textarea id="address" name="address" required defaultValue={user.location ?? ""} placeholder="Street, city, state" minLength={8} maxLength={400} />
              </div>
              <PayMethod
                total={money(total)}
                allowPo={canUsePo(user)}
                termsDays={settings.poTermsDays}
                billing={{ name: user.name, email: user.email, phone: user.phone ?? "", address: [user.orgName, user.location].filter(Boolean).join("\n") }}
              />
              <p className="muted" style={{ fontSize: ".78rem", marginTop: 10 }}>
                Each author ships their own titles. Set quantity to 0 to remove an item.
                {!canUsePo(user) && <> Schools and organizations can pay by purchase order — set your organization type in <Link href="/dashboard/buyer/profile" style={{ textDecoration: "underline" }}>Settings</Link>.</>}
              </p>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
