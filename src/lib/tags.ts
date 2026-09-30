/**
 * Tag lists live in a single string column as ",a,b," (portable, simple to filter).
 * The surrounding commas let one tag be matched exactly with contains ",a,".
 */
export const parseTags = (s: string | null | undefined) => (s ?? "").split(",").filter(Boolean);

/** Keeps only values from the allowed list, so arbitrary input can't be stored. */
export const serializeTags = (values: string[], allowed: { value: string }[]) => {
  const ok = values.filter((v) => allowed.some((a) => a.value === v));
  return ok.length ? `,${[...new Set(ok)].join(",")},` : "";
};

export const hasTag = (tag: string) => ({ contains: `,${tag},` });
