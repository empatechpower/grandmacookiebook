import { mediaCategoryLabel, videoEmbedUrl } from "@/lib/storefront";

type Item = { id: string; kind: string; category: string; url: string; title: string; caption: string | null };

/** Public media display: photos open full-size, YouTube/Vimeo videos play inline, other links open in a new tab. */
export function MediaTile({ m }: { m: Item }) {
  const embed = m.kind === "VIDEO" ? videoEmbedUrl(m.url) : null;
  return (
    <figure className="media-tile">
      {m.kind === "PHOTO" ? (
        <a href={m.url} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.url} alt={m.title} loading="lazy" />
        </a>
      ) : embed ? (
        <iframe src={embed} title={m.title} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen />
      ) : (
        <a className="media-link" href={m.url} target="_blank" rel="noreferrer">▶ Watch video ↗</a>
      )}
      <figcaption>
        <span className="meta">{mediaCategoryLabel(m.category)}</span>
        <b>{m.title}</b>
        {m.caption && <span className="muted">{m.caption}</span>}
      </figcaption>
    </figure>
  );
}

export function MediaGrid({ items }: { items: Item[] }) {
  return <div className="media-grid">{items.map((m) => <MediaTile key={m.id} m={m} />)}</div>;
}
