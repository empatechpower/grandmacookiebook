/** Author storefront helpers: public URL, slug rules, media categories, video embeds. */

export const authorPath = (a: { id: string; slug?: string | null }) => `/authors/${a.slug || a.id}`;

const RESERVED = new Set(["new", "edit", "admin", "dashboard", "api", "settings", "search", "all"]);
export function slugError(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return "Use lowercase letters, numbers and single dashes (e.g. jane-smith)";
  if (slug.length < 3 || slug.length > 40) return "Your link must be 3–40 characters";
  if (RESERVED.has(slug)) return "That link is reserved — try another";
  return null;
}

export const MEDIA_CATEGORIES = [
  { value: "PHOTOS", label: "Photos" },
  { value: "VIDEOS", label: "Videos" },
  { value: "INTERVIEWS", label: "Interviews" },
  { value: "SCHOOL_VISITS", label: "School visits" },
  { value: "AWARDS", label: "Awards" },
  { value: "OTHER", label: "Other work" },
];
export const mediaCategoryLabel = (v: string) => MEDIA_CATEGORIES.find((c) => c.value === v)?.label ?? v;

/** YouTube / Vimeo links → privacy-friendly embed URL; anything else returns null (shown as a link). */
export function videoEmbedUrl(url: string) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
    if (host.endsWith("youtube.com")) {
      const id = u.searchParams.get("v") ?? u.pathname.match(/\/(?:embed|shorts)\/([\w-]+)/)?.[1];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (host === "vimeo.com") {
      const id = u.pathname.match(/\/(\d+)/)?.[1];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {}
  return null;
}
