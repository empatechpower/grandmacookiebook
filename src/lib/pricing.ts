/** Per-copy price for a quantity, applying the author's classroom-set price when it qualifies. */
export function unitPriceFor(book: { price: number; bulkMinQty: number | null; bulkPrice: number | null }, qty: number) {
  return book.bulkMinQty && book.bulkPrice && qty >= book.bulkMinQty ? book.bulkPrice : book.price;
}
export const hasBulkPrice = (b: { bulkMinQty: number | null; bulkPrice: number | null }) => !!(b.bulkMinQty && b.bulkPrice);
