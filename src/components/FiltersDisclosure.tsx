"use client";
import { useEffect, useRef } from "react";

/** Filters are always open on desktop; on phones they collapse unless a filter is active. */
export function FiltersDisclosure({ active, children }: { active: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (ref.current && (active || window.matchMedia("(min-width: 961px)").matches)) ref.current.open = true;
  }, [active]);
  return (
    <details ref={ref} className="filters-toggle">
      <summary className="btn btn-line">Filters{active ? " (on)" : ""}</summary>
      {children}
    </details>
  );
}
