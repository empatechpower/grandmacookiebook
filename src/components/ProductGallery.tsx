"use client";
import { useState } from "react";

/** Main product image with clickable thumbnails for extra photos. */
export function ProductGallery({ title, cover, images }: { title: string; cover: string | null; images: string[] }) {
  const all = [cover, ...images].filter(Boolean) as string[];
  const [active, setActive] = useState(0);
  if (!all.length) return <div className="cover-lg ph">{title}</div>;
  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="cover-lg" src={all[active]} alt={title} />
      {all.length > 1 && (
        <div className="thumbs" style={{ marginTop: 10 }}>
          {all.map((src, i) => (
            <button key={src} type="button" className={`thumb${i === active ? " on" : ""}`} onClick={() => setActive(i)} aria-label={`Photo ${i + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
