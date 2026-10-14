"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { tierRows, type BulkTiers } from "@/lib/pricing";

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/**
 * The classroom-set price table for one book. With `priceInputId`/`toggleInputId` it follows the
 * book form's price field and Bulk discounts checkbox as the author types (live preview).
 */
export function BulkTierTable({ tiers, price, priceInputId, toggleInputId, compact = false }: {
  tiers: BulkTiers;
  price: number; // cents
  priceInputId?: string;
  toggleInputId?: string;
  compact?: boolean;
}) {
  const [cents, setCents] = useState(price);
  const [on, setOn] = useState(true);
  useEffect(() => {
    const priceEl = priceInputId ? (document.getElementById(priceInputId) as HTMLInputElement | null) : null;
    const toggleEl = toggleInputId ? (document.getElementById(toggleInputId) as HTMLInputElement | null) : null;
    const sync = () => {
      if (priceEl) setCents(Math.round(Number(priceEl.value || 0) * 100));
      if (toggleEl) setOn(toggleEl.checked);
    };
    sync();
    priceEl?.addEventListener("input", sync);
    toggleEl?.addEventListener("change", sync);
    return () => { priceEl?.removeEventListener("input", sync); toggleEl?.removeEventListener("change", sync); };
  }, [priceInputId, toggleInputId]);

  if (!on) return <p className="hint">Bulk discounts are off for this book — every copy is sold at the full price.</p>;
  return (
    <table className={`tier-table${compact ? " compact" : ""}`}>
      <tbody>
        {tierRows(tiers).map((r) => (
          <tr key={r.label}>
            <td>{r.label}</td>
            {r.pct === "quote" ? (
              <td colSpan={2}><Link href="/contact" style={{ textDecoration: "underline" }}>Contact for custom quote</Link></td>
            ) : (
              <>
                <td>{r.pct ? `${r.pct}% off` : "Full price"}</td>
                <td><b>{cents > 0 ? `${usd(Math.round(cents * (1 - r.pct / 100)))} each` : "—"}</b></td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
