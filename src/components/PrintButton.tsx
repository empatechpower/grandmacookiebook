"use client";

export function PrintButton() {
  return (
    <button className="btn btn-line btn-sm" onClick={() => window.print()}>
      Print / save as PDF
    </button>
  );
}
