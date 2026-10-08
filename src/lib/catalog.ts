import "server-only";
import { db } from "./db";

/**
 * Public = approved listing + approved, unsuspended author who has finished Stripe
 * onboarding (otherwise we could take a buyer's money with nowhere to send the author's share).
 */
export const liveWhere = { status: "APPROVED", author: { status: "ACTIVE", payoutsReady: true } } as const;
export const authorSelect = { select: { id: true, name: true, slug: true } } as const;

const text = (v: string) => ({ contains: v, mode: "insensitive" as const });
const titleOrAuthor = (q?: string) =>
  q ? { OR: [{ title: text(q) }, { description: text(q) }, { author: { name: text(q) } }] } : {};

export const liveBooks = (category?: string, take?: number, q?: string) =>
  db.book.findMany({
    where: { ...liveWhere, ...(category ? { category } : {}), ...titleOrAuthor(q) },
    include: { author: authorSelect },
    orderBy: { createdAt: "desc" },
    take,
  });

export const livePackages = (format?: string, take?: number, q?: string) =>
  db.visitPackage.findMany({
    where: { ...liveWhere, ...(format ? { format: { in: [format, "HYBRID"] } } : {}), ...titleOrAuthor(q) },
    include: { author: authorSelect },
    orderBy: { createdAt: "desc" },
    take,
  });
