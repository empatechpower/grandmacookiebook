import "server-only";
import { db } from "./db";
import { slugError, slugFromName } from "./storefront";

/** Gives an author an automatic storefront link (/authors/jane-smith, then -2, -3… if taken). */
export async function ensureAuthorSlug(user: { id: string; name: string; slug: string | null; role: string }) {
  if (user.role !== "AUTHOR" || user.slug) return user.slug;
  let base = slugFromName(user.name);
  if (slugError(base)) base = `author-${base}`.slice(0, 36);
  for (let n = 1; n < 1000; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    if (slugError(candidate)) continue;
    const taken = await db.user.findFirst({ where: { slug: candidate }, select: { id: true } });
    if (taken) continue;
    try {
      await db.user.update({ where: { id: user.id }, data: { slug: candidate } });
      return candidate;
    } catch {
      // Lost a race for this slug; try the next one.
    }
  }
  return null;
}

/** Gives every author who doesn't have one yet a storefront link (accounts made before links were automatic). */
export async function backfillAuthorSlugs() {
  const authors = await db.user.findMany({ where: { role: "AUTHOR", slug: null }, select: { id: true, name: true, slug: true, role: true } });
  for (const a of authors) await ensureAuthorSlug(a);
  return authors.length;
}
