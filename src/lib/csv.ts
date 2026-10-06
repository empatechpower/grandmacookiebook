/** Builds a CSV download (Excel-friendly: BOM + quoted cells). */
export function csvResponse(filename: string, rows: (string | number | null | undefined)[][]) {
  const cell = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    // Quote everything; neutralise formula injection (cells starting with = + - @).
    return `"${(/^[=+\-@]/.test(s) ? "'" + s : s).replace(/"/g, '""')}"`;
  };
  const body = "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
  return new Response(body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" },
  });
}
