import { stars } from "@/lib/reviews";

/** Average with count (e.g. ★★★★☆ 4.5 (12)), or a single review's rating with `single`. */
export function Stars({ avg, count = 1, size = ".9rem", single = false }: { avg: number; count?: number; size?: string; single?: boolean }) {
  if (!count) return <span className="muted" style={{ fontSize: size }}>No reviews yet</span>;
  return (
    <span style={{ fontSize: size }} aria-label={single ? `${avg} out of 5 stars` : `Rated ${avg} out of 5 from ${count} reviews`}>
      <span style={{ color: "var(--gold)", letterSpacing: 1 }}>{stars(avg)}</span>
      {!single && (
        <>
          {" "}<b>{avg.toFixed(1)}</b> <span className="muted">({count})</span>
        </>
      )}
    </span>
  );
}
