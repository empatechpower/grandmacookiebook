"use client";
import { useEffect, useState } from "react";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * File picker that shows the chosen picture(s) right away, before saving — and the current
 * image when there is one. Flags files that are too big or not JPEG/PNG/WebP immediately.
 */
export function ImageInput({
  id,
  name,
  multiple = false,
  current,
  max = 8,
  shape = "cover",
}: {
  id: string;
  name: string;
  multiple?: boolean;
  current?: string | null;
  max?: number;
  shape?: "cover" | "square";
}) {
  const [previews, setPreviews] = useState<{ url: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);
  // After a save the page shows the newly stored image, so drop the temporary preview.
  useEffect(() => setPreviews([]), [current]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const bad = files.find((f) => !TYPES.includes(f.type));
    const big = files.find((f) => f.size > MAX_BYTES);
    const tooMany = multiple && files.length > max;
    const msg = bad ? `“${bad.name}” isn't a JPEG, PNG or WebP image` : big ? `“${big.name}” is larger than 5 MB` : tooMany ? `Choose up to ${max} photos` : null;
    setError(msg);
    e.target.setCustomValidity(msg ?? "");
    setPreviews(msg ? [] : files.map((f) => ({ url: URL.createObjectURL(f), name: f.name })));
  };

  const shown = previews.length ? previews : current ? [{ url: current, name: "Current image" }] : [];
  return (
    <div className="image-input">
      {shown.length > 0 && (
        <div className={`image-previews ${shape}`}>
          {shown.map((p) => (
            <figure key={p.url}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.name} />
              <figcaption>{previews.length ? (multiple ? p.name : "New (not saved yet)") : "Current"}</figcaption>
            </figure>
          ))}
        </div>
      )}
      <input id={id} name={name} type="file" accept={TYPES.join(",")} multiple={multiple} onChange={onChange} />
      {error && <div className="field-err">{error}</div>}
    </div>
  );
}
