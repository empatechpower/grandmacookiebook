"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Phone-only menu toggle. Wraps a menu panel and shows it when "Menu" is tapped;
 * closes again whenever the page changes. On wider screens the panel is always shown (CSS).
 */
export function MobileMenu({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  return (
    <>
      <button type="button" className="menu-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span aria-hidden>{open ? "✕" : "☰"}</span> Menu
      </button>
      <div className={`menu-panel ${className} ${open ? "open" : ""}`}>{children}</div>
    </>
  );
}
