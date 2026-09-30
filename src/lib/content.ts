export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

export const COLLECTION_KINDS = [
  { value: "CATALOG", label: "Featured catalog" },
  { value: "FAVORITES", label: "Educator's monthly favorites" },
  { value: "THEME", label: "Themed collection" },
];

export const ARTICLE_KINDS = [
  { value: "NEWS", label: "News", path: "/news" },
  { value: "RESOURCE", label: "Resource", path: "/resources" },
  { value: "EVENT", label: "Event", path: "/events" },
] as const;
export type ArticleKind = (typeof ARTICLE_KINDS)[number]["value"];
export const articlePath = (a: { kind: string; slug: string }) => `${ARTICLE_KINDS.find((k) => k.value === a.kind)?.path ?? "/news"}/${a.slug}`;
