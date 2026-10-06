import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { money } from "@/lib/money";
import { hasBulkPrice, unitPriceFor } from "@/lib/pricing";
import { checkout, updateCartItem } from "@/app/actions/shop";
import { SubmitButton } from "@/components/SubmitButton";
import { Table } from "@/components/ui";

export const metadata = { title: "Cart" };

export default async function Cart() {
  const user = await requireUser("BUYER");
  const items = await db.cartItem.findMany({
    where: { userId: user.id },
    include: { book: { include: { author: { select: { name: true } } } } },
  });
  const total = items.reduce((s, i) => s + unitPriceFor(i.book, i.qty) * i.qty, 0);

  return (
    <section className="pad">
      <div className="wrap">
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
                    {money(unitPriceFor(i.book, i.qty))}
                    {unitPriceFor(i.book, i.qty) < i.book.price && <div className="badge b-ok">Classroom price</div>}
                    {hasBulkPrice(i.book) && unitPriceFor(i.book, i.qty) === i.book.price && (
                      <div className="muted" style={{ fontSize: ".75rem" }}>{money(i.book.bulkPrice!)} each for {i.book.bulkMinQty}+</div>
                    )}
                  </td>
                  <td>
                    <form action={updateCartItem} className="inline-form">
                      <input type="hidden" name="id" value={i.id} />
                      <input className="qty" type="number" name="qty" min={0} max={i.book.stock} defaultValue={i.qty} aria-label="Quantity" />
                      <SubmitButton className="btn btn-ghost btn-sm" pendingText="…">Update</SubmitButton>
                    </form>
                  </td>
                  <td>{money(unitPriceFor(i.book, i.qty) * i.qty)}</td>
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
                <input id="phone" name="phone" type="tel" defaultValue={user.phone ?? ""} autoComplete="tel" />
              </div>
              <div className="field">
                <label htmlFor="address">Shipping address</label>
                <textarea id="address" name="address" required defaultValue={user.location ?? ""} placeholder="Street, city, state" />
              </div>
              <SubmitButton className="btn btn-terra" pendingText="Paying…" style={{ width: "100%" }}>
                Pay {money(total)}
              </SubmitButton>
              <p className="muted" style={{ fontSize: ".78rem", marginTop: 10 }}>
                Each author ships their own titles. Set quantity to 0 to remove an item.
              </p>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
