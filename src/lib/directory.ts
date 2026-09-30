import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { BUDGETS, FORMATS, GRADES, IDENTITIES, LANGUAGES, TOPICS } from "./constants";
import { hasTag } from "./tags";
import { fromDayKey, isDayKey } from "./dates";

export type DirectoryFilters = {
  q?: string;
  topic?: string;
  grade?: string;
  format?: string;
  language?: string;
  identity?: string;
  location?: string;
  budget?: string;
  date?: string;
  sort?: string;
};

const text = (v: string) => ({ contains: v, mode: "insensitive" as const });
const oneOf = (v: string | undefined, opts: readonly { value: string }[]) => (v && opts.some((o) => o.value === v) ? v : undefined);

/** Authors buyers can book: approved, not suspended, Stripe-ready. */
export const bookableAuthor = { role: "AUTHOR", status: "ACTIVE", payoutsReady: true } as const;

export async function searchAuthors(f: DirectoryFilters) {
  const q = f.q?.trim().slice(0, 80);
  const topic = oneOf(f.topic, TOPICS);
  const grade = oneOf(f.grade, GRADES);
  const format = oneOf(f.format, FORMATS);
  const language = oneOf(f.language, LANGUAGES);
  const identity = oneOf(f.identity, IDENTITIES);
  const location = f.location?.trim().slice(0, 60);
  const budget = BUDGETS.includes(Number(f.budget)) ? Number(f.budget) * 100 : undefined;
  const date = f.date && isDayKey(f.date) ? fromDayKey(f.date) : undefined;

  // A hybrid package satisfies both "in person" and "virtual".
  const livePackage = (extra: Prisma.VisitPackageWhereInput = {}) => ({
    packages: { some: { status: "APPROVED", ...(format ? { format: { in: [format, "HYBRID"] } } : {}), ...extra } },
  });

  const and: Prisma.UserWhereInput[] = [];
  if (q)
    and.push({
      OR: [
        { name: text(q) },
        { headline: text(q) },
        { bio: text(q) },
        { topics: text(q.toLowerCase()) },
        { books: { some: { status: "APPROVED", title: text(q) } } },
        { packages: { some: { status: "APPROVED", title: text(q) } } },
      ],
    });
  if (topic) and.push({ topics: hasTag(topic) });
  if (grade) and.push({ grades: hasTag(grade) });
  if (language) and.push({ languages: hasTag(language) });
  if (identity) and.push({ identities: hasTag(identity) });
  if (location) and.push({ OR: [{ location: text(location) }, { packages: { some: { status: "APPROVED", region: text(location) } } }] });
  if (format || budget) and.push(livePackage(budget ? { fee: { lte: budget } } : {}));
  if (date) {
    and.push({ availability: { some: { date } } });
    // ...and not already booked that day.
    and.push({ bookingsHosted: { none: { eventDate: date, status: { in: ["ACCEPTED", "CONFIRMED"] } } } });
  }

  const authors = await db.user.findMany({
    where: { ...bookableAuthor, AND: and },
    select: {
      id: true,
      name: true,
      headline: true,
      avatarUrl: true,
      location: true,
      topics: true,
      identities: true,
      ratingAvg: true,
      ratingCount: true,
      createdAt: true,
      packages: { where: { status: "APPROVED" }, select: { fee: true, format: true } },
      _count: { select: { books: { where: { status: "APPROVED" } } } },
    },
    take: 120,
  });

  const withPrice = authors.map((a) => ({
    ...a,
    fromFee: a.packages.length ? Math.min(...a.packages.map((p) => p.fee)) : null,
    formats: [...new Set(a.packages.map((p) => p.format))],
  }));
  const byFee = (x: number | null) => x ?? Number.MAX_SAFE_INTEGER;
  if (f.sort === "price-asc") withPrice.sort((a, b) => byFee(a.fromFee) - byFee(b.fromFee));
  else if (f.sort === "price-desc") withPrice.sort((a, b) => (b.fromFee ?? -1) - (a.fromFee ?? -1));
  else if (f.sort === "name") withPrice.sort((a, b) => a.name.localeCompare(b.name));
  else if (f.sort === "rating") withPrice.sort((a, b) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount);
  else withPrice.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return withPrice;
}

export type DirectoryAuthor = Awaited<ReturnType<typeof searchAuthors>>[number];
